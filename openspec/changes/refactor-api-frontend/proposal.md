# Proposal: refactor-api-frontend

> Bundled refactor + new feature. The original EJS app stays; we add a
> layered architecture under `src/`, a full JSON API at `/api/v1`, and a
> React SPA shell at `apps/web/`. Strict TDD on (`openspec/config.yaml`
> `rules.apply.tdd: true`).

## 1. Why

The codebase works but ships as a single-process CRUD with a near-empty
JSON API (one endpoint at `src/routes/apiRoutes.js:14`). The explore
report (`explore.md` §§4–5) surfaces **20 code smells** and concrete
**SOLID violations in every layer** — most notably SRP in
`analisisService.recalcular` (`src/services/analisisService.js:71-117`)
and DIP across the board (no abstractions over the module-level DB
handle at `src/models/db.js:7`). A real JS frontend cannot exist
without a JSON API, and the JSON API cannot exist cleanly without
repositories and use cases. We fix both at once.

<!-- change: refactor -->
<!-- change: feat -->

## 2. What Changes

- **Refactor (no behavior change for end users)**: split `models/*` into
  `repositories/*` (DIP); extract `use-cases/*` (SRP); introduce
  `policies/autoPolicy.js` and `policies/modificacionPolicy.js`;
  build a `src/container.js` composition root; add
  `tests/helpers/inMemoryDb.js`; fail-fast on missing `SESSION_SECRET`
  in production (fixes C2 in `src/config/session.js:4`).
- **Domain patterns (no behavior change)**: **Strategy** for
  `IndicadorClassifier` (`src/services/indicators/`), **Factory** for
  `VALOR_IMPACTO` (`src/services/indicators/impactoValues.js`),
  **Observer** via in-process `EventEmitter` so `ModificacionChanged`
  triggers `AnalisisService.recalcular`.
- **New API**: `src/routes/apiV1Routes.js` mounting auth, catalog,
  autos, modificaciones, analisis endpoints (see explore.md §7). DTOs
  in `src/dtos/`. Validation via **Zod** (see §4.5). `analisis.ejs`
  consumes pre-aggregated chart data (removes C6 + C10).
- **Frontend**: Vite + React 18 + TanStack Query v5 SPA at `apps/web/`
  consuming `/api/v1`. EJS views untouched.
- **Tests**: 15 → 60+ across repos, policies, indicators, use cases,
  API endpoints, frontend integration (RED-GREEN-REFACTOR).

## 3. Impact

| Area | Impact | Notes |
|---|---|---|
| `src/models/*.js` | Replaced | Becomes `src/repositories/*`; old files removed after port |
| `src/services/analisisService.js` | Replaced | Pure part → indicator strategies; persistence → `AnalisisRepository` |
| `src/controllers/*.js` | Thinned | Delegate to use cases; ~10 lines per handler |
| `src/middlewares/validationMiddleware.js` | Coexists | Still used by EJS routes; not on API |
| `src/routes/apiRoutes.js` | Replaced | Becomes `src/routes/apiV1Routes.js` (versioned) |
| `src/views/**` | Untouched | EJS continues to render; only `analisis.ejs` reads pre-aggregated data |
| `public/js/dropdownMarcaModelo.js` | Untouched | Reuses new `/api/v1/marcas/:id/modelos` |
| `tests/*.test.js` | Expanded | Per RED-GREEN-REFACTOR; 15 → 60+ |
| `apps/web/**` | **New** | Vite + React + TanStack Query SPA |
| `package.json` | Modified | + zod, + vite/react/tanstack/supertest dev deps, + scripts |
| `pnpm-workspace.yaml` | Modified | Adds `apps/web` workspace |
| `database/automods.db` | Untouched | Schema unchanged |
| **Breaking changes** | **None for end users** | Same session cookie, same URLs, same HTML output |
| **Breaking changes (deploy)** | Minor | New env vars (`VITE_API_URL`, `SESSION_SECRET` required in prod) |

## 4. Architecture Decisions

1. **EJS stays.** `src/views/**` is the source of truth for HTML.
   The SPA coexists; the original MVC is preserved.
2. **Layered `src/`**: `routes → middlewares → controllers (thin) →
   use-cases (SRP) → repositories (DIP) → models/db.js`. Composition
   root at `src/container.js` injects repos.
3. **SOLID, principle-by-principle**:
   - **SRP** — controllers do HTTP only; ownership moves to
     `policies/`; metric calc moves to `services/indicators/`.
   - **DIP** — controllers depend on repository *interfaces*
     (`IAutoRepository.js`, etc.); the container binds the sql.js
     implementation.
   - **OCP** (bonus) — adding an indicator tier becomes a new
     strategy class, not an `if/else` edit.
4. **Patterns applied (≥2 required, 5 delivered)**:
   - **Repository** — `AutoRepository`, `ModificacionRepository`,
     `UsuarioRepository`, `CatalogRepository`, `AnalisisRepository`.
   - **Strategy** — `IndicadorClassifier` with
     `Deficiente/Regular/Excelente/SinDatos` strategies.
   - **Factory** — `impactoValues.js` (single source of
     `VALOR_IMPACTO`).
   - **Observer** — `EventEmitter` + `AnalisisListener` for cascada
     recalc (removes C4 partial-failure risk).
   - **Policy** — `autoPolicy.js`, `modificacionPolicy.js`.
5. **Validation: Zod for the new JSON API; keep `express-validator` for
   EJS.** Justification: Zod schemas double as DTO definitions shared
   with the React client, produce a clean `{ ok, errors }` shape, and
   the API has no `req.flash` to flood (fixes C13 by construction).
   EJS routes keep `express-validator` to avoid rewriting the
   existing validation chain in `src/middlewares/validationMiddleware.js`.
6. **Error envelope**: `{ error: { code, message, details? } }` with
   codes `VALIDATION_ERROR`, `NOT_FOUND`, `CONFLICT`, `UNAUTHORIZED`,
   `INTERNAL`. Status codes 200/201/204/400/401/404/409/500.
7. **Auth**: same `express-session` cookie. No JWT in this round.
8. **Frontend stack**:
   - **Vite 5** (dev server + build) — fast HMR, single static output.
   - **React 18** + **TanStack Query v5** for data fetching and cache.
   - **Plain CSS** (no Tailwind) to match `public/css/styles.css`.
   - In prod the static build is served by Express under `/app/`; in
     dev, Vite proxies `/api/v1` to Express on `:3000`.

## 5. Out of Scope

- No JWT / OAuth / API tokens.
- No docker image push to a registry.
- No CI pipeline (GitHub Actions etc.).
- No production load balancing / multi-process sql.js.
- No payments, email, file uploads, or migration framework.
- No TypeScript (CommonJS only per `rules.apply`).
- No removal of EJS views or the existing `public/js/*` assets.
- No i18n.

## 6. Acceptance Criteria

- [ ] `node --test tests/**/*.test.js` green; 60+ tests.
- [ ] `src/container.js` wires repositories; controllers do not
      `require('./models/...')` directly.
- [ ] `IndicadorClassifier` is a Strategy map; thresholds come from a
      config object, not magic numbers.
- [ ] `ModificacionChanged` event triggers `AnalisisService.recalcular`
      via listener — controllers do not call recalc manually.
- [ ] `/api/v1/*` returns the documented status codes and error
      envelope (see explore.md §7).
- [ ] All 9 EJS views still render the same HTML; no visual regression.
- [ ] `apps/web` builds (`pnpm --filter web build`); SPA loads at
      `/app/` in prod, dev at `http://localhost:5173`.
- [ ] `NODE_ENV=production` without `SESSION_SECRET` exits with a
      clear error.
- [ ] `deploy.md` updated with new env vars, new endpoints, and the
      SPA build step.
- [ ] No DTO breaks the EJS view contract (integration test asserts
      shape of `autoModel.getAllByUsuario` output).

## 7. Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Forecast diff > 400 lines (D1 review budget) | **High** | Split into 5 chained PRs (Foundation → Patterns → API → Frontend → Verify). See Delivery Strategy below. |
| Per-C1 ask-always, chained-PR strategy needs user approval before `sdd-apply` | **High** | The orchestrator MUST surface the chained-PR recommendation to the user explicitly. This is non-negotiable per `sdd-phase-common.md` §E. |
| sql.js in-memory + `fs.writeFileSync` (single-process) | Med | Documented in `deploy.md:9`; out of scope to fix. |
| C2 session secret leak | Med | Fail-fast in `src/config/session.js` when `NODE_ENV=production && !process.env.SESSION_SECRET`. |
| EJS coupling (DTOs must match view shape) | Med | DTOs shaped to current `autoModel.getAllByUsuario` output; integration test asserts shape. |
| New deps (`zod`, `vite`, `react`, `supertest`) bloat `pnpm-lock.yaml` | Low | Documented in `design.md`; just-in-time install. |
| Chart.js CDN pin | Low | Pin Chart.js to `^4.4.0` in `package.json` (remove CDN). |
| Strict TDD churn (every task needs tests) | Med | Tests written in the same commit as the change (RED-GREEN-REFACTOR). |
| EJS coexisting with SPA may confuse users about "which is the frontend" | Low | `README.md` and `deploy.md` will state EJS is the default; SPA is opt-in at `/app/`. |

## Rollback Plan

Each chained PR is independently revertible. The Foundation PR (Group 1)
keeps the old `models/*` as re-export shims so `git revert` of that
single PR restores the old imports. Subsequent PRs add patterns, API,
and frontend — each removable in reverse order. The SPA under
`apps/web/` is fully isolated; deleting that workspace restores the
pre-change state with no impact on the EJS app. `database/automods.db`
is never modified, so a rollback also preserves all user data.

## Dependencies

- **New runtime**: `zod@3` (API validation).
- **New dev**: `react@18`, `react-dom@18`, `@tanstack/react-query@5`,
  `vite@5`, `supertest@7`, `@testing-library/react@16`,
  `jsdom@25` (Vitest if we swap test runner — otherwise stick with
  `node:test` per `rules.apply`).
- `pnpm-workspace.yaml` already present; we add `apps/web` as the
  only workspace package.
- `database/automods.db` schema: **unchanged**.

## Delivery Strategy — CHAINED PRs REQUIRED

This change **MUST be split into chained PRs**. The aggregate diff
estimate (refactor + patterns + API + frontend + tests) exceeds the
400-line review budget (D1) for any single PR, and even the 5-group
split pushes some groups near the limit on the test side. The
`delivery_strategy` is `ask-always` (C1) per preflight.

The orchestrator will launch `sdd-tasks` next, which **MUST** return:

- `Decision needed before apply: Yes`
- `Chained PRs recommended: Yes`
- `400-line budget risk: High`

The orchestrator **MUST** then surface this to the user for explicit
approval of the chained-PR plan before launching `sdd-apply`. The 5
groups are the natural slice boundaries (see explore.md §11):

1. **Foundation** — container, repositories, policies, in-memory DB
   helper, fail-fast session secret, repo + policy tests.
2. **Patterns** — Strategy + Factory + Observer, strategy + listener
   tests.
3. **API + DTOs** — `apiV1Routes.js`, Zod schemas, DTOs, supertest-style
   API tests, `analisis.ejs` consumes pre-aggregated data.
4. **Frontend** — `apps/web` SPA, Vite config, deploy update, `.env.example`.
5. **Verify + archive** — `node --test` green, smoke test every EJS
   page + every JSON endpoint, `sdd-archive`.

If the user rejects the chained-PR plan, the only acceptable fallback
is `size:exception` with explicit acknowledgement of the review risk.

## Success Criteria

- The change is **accepted** if all Acceptance Criteria (§6) are met
  AND the chained-PR flow was approved before apply.
- The change is **failed** if any EJS view breaks, the API returns
  HTML/JSON inconsistently, or `node --test` regresses below 60 tests.
