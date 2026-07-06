# Tasks: refactor-api-frontend

> Linked artifacts: [proposal.md](./proposal.md), [design.md](./design.md),
> [explore.md](./explore.md), [specs/](./specs/) (7 delta specs).
>
> Strict TDD: every task writes tests FIRST (RED), makes them pass (GREEN),
> then refactors (REFACTOR). Per `openspec/config.yaml` `rules.apply.tdd: true`.
>
> Delivery strategy: **chained PRs** (5 groups). Per preflight C1
> (`ask-always`), the orchestrator MUST surface the chain plan to the user
> before launching `sdd-apply`.

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines (total) | ~3,000 LOC across 5 PRs (code + tests) |
| 400-line budget risk | **High** (per PR; see breakdown below) |
| Chained PRs recommended | **Yes** |
| Suggested split | PR 1 Foundation → PR 2 Patterns → PR 3 API → PR 4 Frontend → PR 5 Verify+Archive |
| Delivery strategy | ask-on-risk |
| Chain strategy | **stacked-to-main** (proposed) |

### Per-PR forecast (realistic, includes test code)

| PR | Group | Specs satisfied | LOC delta | Budget risk | Branch base |
|----|-------|-----------------|-----------|-------------|-------------|
| 1 | Foundation | `architecture-layered` (all 5 reqs); `deploy-render` (partial — fail-fast) | ~720 | **Yes** (over) | `main` |
| 2 | Patterns | `pattern-strategy` (all 4), `pattern-factory` (all 4), `pattern-observer` (all 4); `architecture-layered` (Use cases req) | ~305 | **No** (at limit) | `main` |
| 3 | API + DTOs | `api-v1-json` (all 7 reqs); `architecture-layered` (controllers thinned) | ~915 | **Yes** (over) | `main` |
| 4 | Frontend | `frontend-react-spa` (all 6 reqs) | ~825 | **Yes** (over) | `main` |
| 5 | Verify + Archive | `deploy-render` (all 5 reqs); verification of all prior specs | ~325 (mostly docs) | **No** | `main` |

### Forecast reasoning

The `design.md` appendix estimated ~1,350 LOC total. That estimate
undercounts because:

1. **5 repos × 3 artifacts each** (interface + implementation + test) ≈
   75–90 LOC per repo → ~400 LOC of repo code+tests alone.
2. **15 API endpoints × (handler + use case + happy-test + error-test)** ≈
   50–70 LOC per endpoint → ~900 LOC of API code+tests.
3. **5 React pages × (page + components + tests)** ≈ 130–180 LOC per page
   → ~750 LOC of frontend code+tests.
4. **Strict TDD** (`rules.apply.tdd: true`) requires every layer to ship
   with `node:test` or `vitest` coverage. Tests are 40–60% of the LOC.

This confirms the proposal's "CHAINED PRs REQUIRED" decision. Several
PRs are individually over the 400-line budget. The orchestrator has two
paths:

1. **Accept the chained PR plan as-is (recommended).** Each PR diff
   ranges 300–915 LOC; reviewers plan for one extended review session
   per PR instead of the standard 400-LOC review.
2. **Override with `size:exception` and merge as a single PR.** Rejected
   for risk reasons (see `proposal.md` §Risks); would also break
   `proposal.md` §Rollback Plan which depends on per-PR revertibility.

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Chain strategy: stacked-to-main (proposed)

Each PR lands directly on `main` in order (PR 1 → PR 2 → PR 3 → PR 4 → PR 5).

**Why `stacked-to-main` over `feature-branch-chain`:**
- The `tests/helpers/inMemoryDb.js` helper from PR 1 isolates DB state
  per test, so each PR's test suite is independently runnable.
- The slices are independently revertible (per `proposal.md` §Rollback
  Plan); `git revert` of any single PR restores the prior state.
- No long-lived feature branch accumulates integration drift.
- For a single-student academic deliverable (per `explore.md` §1), this
  minimizes context switching and branch bookkeeping.
- The change touches one repo with no parallel review streams.

If the team later needs tighter review control (e.g., grading rubric
requires per-PR feature branches), the orchestrator can switch to
`feature-branch-chain`: PR 2 base = PR 1 branch, PR 3 base = PR 2
branch, etc. Only the final tracker branch merges to `main`.

---

## PR 1 — Foundation: container, repos, policies, fail-fast secret, in-memory DB helper

**PR title (conventional commit):** `refactor(architecture): introduce container, repositories, and policies`
**LOC budget target:** ~720 LOC delta (over the 400 default; this is the
largest PR because it establishes every architectural seam)
**Acceptance (specs satisfied):**
- `architecture-layered` — all 5 requirements
  (Layered dependency direction, Controllers depend on use cases via DI,
  Repositories are interface-driven, Composition root is the only module
  that wires layers, Use cases encapsulate application rules)
- `deploy-render` — partial: "Production fail-fast check is honored"
  (the `NODE_ENV=production` throw lands here; the full `render.yaml`
  is in PR 5)

### Tasks

- [ ] **1.1** Fail-fast SESSION_SECRET in production
  - **What:** Modify `src/config/session.js` to throw if `NODE_ENV === 'production' && !process.env.SESSION_SECRET`.
  - **Files:** `src/config/session.js` (modify, +5 lines); `tests/config/session.test.js` (new, +25 lines).
  - **Tests:** RED: `process.env.NODE_ENV='production'; delete process.env.SESSION_SECRET; require('./session')` → throws. GREEN: set secret and re-require → returns middleware. REFACTOR: extract `assertSessionSecret(env)` helper.
  - **Depends on:** —
  - **Estimate (LOC delta):** ~30

- [ ] **1.2** Composition root `src/container.js` + `src/bus.js`
  - **What:** `container.js` exposes `buildContainer({ db })` returning `{ db, bus, repositories, useCases, controllers, buildApp }`; `bus.js` wraps `EventEmitter` with `on/off/emit`.
  - **Files:** `src/container.js` (new, ~70 lines); `src/bus.js` (new, ~15 lines); `tests/container.test.js` (new, ~30 lines).
  - **Tests:** RED: assert `container.repositories.auto` is defined and is the same object across reads. GREEN: implement `buildContainer({ db })` returning the documented shape. REFACTOR: split `buildContainer` from `buildApp`.
  - **Depends on:** 1.1
  - **Estimate (LOC delta):** ~115

- [ ] **1.3** Repository interfaces (no sql.js imports)
  - **What:** Define `IAutoRepository`, `IModificacionRepository`, `IUsuarioRepository`, `ICatalogoRepository`, `IAnalisisRepository` exporting method symbols only.
  - **Files:** `src/repositories/IAutoRepository.js` (~15 lines); `IModificacionRepository.js` (~15); `IUsuarioRepository.js` (~12); `ICatalogoRepository.js` (~12); `IAnalisisRepository.js` (~12) — 5 new files.
  - **Tests:** `tests/repositories/interfaces.test.js` (new, ~25 lines) — assert each interface exports the documented method names as no-op stubs and contains zero `db`/`sql.js` imports.
  - **Depends on:** —
  - **Estimate (LOC delta):** ~90

- [ ] **1.4** SqlJsRepository implementations
  - **What:** Implement the 5 concrete repos against `sql.js`, constructor-injected with a `Database` handle; each method returns DTOs preserving the `autoModel.getAllByUsuario` shape (regression contract for EJS views).
  - **Files:** `src/repositories/AutoRepository.js` (~55); `ModificacionRepository.js` (~50); `UsuarioRepository.js` (~30); `CatalogoRepository.js` (~40); `AnalisisRepository.js` (~35) — 5 new files, ~210 lines total.
  - **Tests:** `tests/repositories/AutoRepository.test.js` (~30); `ModificacionRepository.test.js` (~30); `UsuarioRepository.test.js` (~20); `CatalogoRepository.test.js` (~25); `AnalisisRepository.test.js` (~20) — 5 new files, ~125 lines total. Cover happy CRUD, ownership filter, and DTO shape parity with `autoModel.getAllByUsuario`.
  - **Depends on:** 1.3, 1.6
  - **Estimate (LOC delta):** ~335

- [ ] **1.5** Policies (AutoPolicy, ModificacionPolicy)
  - **What:** Pure ownership predicates taking `(user, entity)` and returning boolean; no DB access.
  - **Files:** `src/policies/AutoPolicy.js` (new, ~25 lines); `src/policies/ModificacionPolicy.js` (new, ~25 lines).
  - **Tests:** `tests/policies/AutoPolicy.test.js` (~20); `tests/policies/ModificacionPolicy.test.js` (~20) — assert `canView(null, auto) === false`, `canView(otherUser, auto) === false`, `canView(owner, auto) === true`, same for `canEdit` and `canDelete`.
  - **Depends on:** —
  - **Estimate (LOC delta):** ~90

- [ ] **1.6** In-memory DB test helper
  - **What:** `tests/helpers/inMemoryDb.js` exposes `createInMemoryDb()` returning a fresh `new SQL.Database()` with the seeded schema applied.
  - **Files:** `tests/helpers/inMemoryDb.js` (new, ~30 lines); `tests/helpers/inMemoryDb.test.js` (new, ~20 lines).
  - **Tests:** RED: call twice and assert different buffer identity. GREEN: implement factory. REFACTOR: extract seed SQL into `tests/helpers/schema.sql.js`.
  - **Depends on:** —
  - **Estimate (LOC delta):** ~50

- [ ] **1.7** Repository test suite
  - **What:** Grouped review of the 5 repo test files created under 1.4.
  - **Files:** (See 1.4 test list — 5 files, ~125 lines total.)
  - **Tests:** Happy CRUD + ownership isolation + DTO shape parity for each repo.
  - **Depends on:** 1.4
  - **Estimate (LOC delta):** included in 1.4

- [ ] **1.8** Policy test suite
  - **What:** Grouped review of the 2 policy test files created under 1.5.
  - **Files:** (See 1.5 test list — 2 files, ~40 lines total.)
  - **Tests:** canView/canEdit/canDelete matrix per policy.
  - **Depends on:** 1.5
  - **Estimate (LOC delta):** included in 1.5

**PR 1 acceptance gate:**
- `node --test tests/**/*.test.js` green; minimum 25 new tests added.
- `src/container.js` is the only module under `src/` that requires `src/models/db.js`.
- No file under `src/controllers/` or `src/repositories/*Repository.js` (concrete) requires a `use-cases/` file.
- `grep "dev-secret" src/config/session.js` returns no matches.

---

## PR 2 — Patterns: Strategy, Factory, Observer

**PR title (conventional commit):** `refactor(patterns): add Strategy, Factory, and Observer for analisis`
**LOC budget target:** ~305 LOC delta (at the limit, but under 400)
**Acceptance (specs satisfied):**
- `pattern-strategy` — all 4 requirements (≥3 strategies, single orchestrator,
  thresholds from config, extensible without edits to existing strategies)
- `pattern-factory` — all 4 requirements (named methods, throws on unknown,
  single source of truth, type-stable JSON output)
- `pattern-observer` — all 4 requirements (repo emits events, observer
  subscribes, controllers do not call AnalisisService, wiring is the
  composition root's responsibility)
- `architecture-layered` — partial: "Use cases encapsulate application rules"
  (use cases become thin once `analisisService` is reduced to pure calc)

### Tasks

- [x] **2.1** `ImpactValueFactory` (single source of `VALOR_IMPACTO`)
  - **What:** Pure module exporting `valorImpacto(nivel)` returning `1|2|3` for `bajo|medio|alto`; throws on unknown.
  - **Files:** `src/services/indicators/impactoValues.js` (new, ~20 lines); `tests/indicators/impactoValues.test.js` (new, ~30 lines).
  - **Tests:** RED: assert `valorImpacto("medio") === 2`, throws on `"critico"`, throws on `null/undefined/""`. GREEN: implement with frozen `MAP` constant. REFACTOR: extract `KNOWN_LEVELS` Set.
  - **Depends on:** —
  - **Estimate (LOC delta):** ~50

- [x] **2.2** Indicator strategies + `IndicadorClassifier` orchestrator
  - **What:** 4 strategy classes with `cumple(metricas)` predicate; `IndicadorClassifier` iterates them in priority order; thresholds loaded from `config.js`.
  - **Files:** `src/services/indicators/config.js` (~12); `DeficienteStrategy.js` (~10); `RegularStrategy.js` (~10); `ExcelenteStrategy.js` (~10); `SinDatosStrategy.js` (~8); `IndicadorClassifier.js` (~20) — 6 new files, ~70 lines total.
  - **Tests:** `tests/indicators/IndicadorClassifier.test.js` (new, ~50 lines) — boundary cases at 1.4999, 1.5, 2.4999, 2.5; empty data → SinDatos; register new strategy at runtime.
  - **Depends on:** 2.1
  - **Estimate (LOC delta):** ~120

- [x] **2.3** Event-name constants (`src/domain/events/events.js`)
  - **What:** Frozen object exporting `MODIFICACION_CREATED | UPDATED | DELETED` strings.
  - **Files:** `src/domain/events/events.js` (new, ~10 lines); `tests/domain/events.test.js` (new, ~15 lines).
  - **Tests:** RED: assert `events.MODIFICACION_CREATED === 'modificacion.created'`. GREEN: export frozen object. REFACTOR: add JSDoc.
  - **Depends on:** 1.2
  - **Estimate (LOC delta):** ~25

- [x] **2.4** `AnalisisRecalcObserver`
  - **What:** Subscribes to all 3 Modificacion events; calls `analisisService.recalcular(autoId)`; rethrows on error.
  - **Files:** `src/domain/observers/AnalisisRecalcObserver.js` (new, ~25 lines); `tests/domain/observers/AnalisisRecalcObserver.test.js` (new, ~35 lines).
  - **Tests:** RED: emit `ModificacionChanged { autoId: 7 }` and assert spy called once with `7`; rethrow test; no-op on bus without listener. GREEN: implement. REFACTOR: extract payload destructuring.
  - **Depends on:** 2.3
  - **Estimate (LOC delta):** ~60

- [x] **2.5** Refactor `analisisService.js` to pure calc + Observer wiring
  - **What:** Remove the inline `VALOR_IMPACTO` map and the `db.run()` writes; replace with `calcularMetricas` (pure) + use of `IndicadorClassifier`; wire observer in container.
  - **Files:** `src/services/analisisService.js` (modify, -40/+20 = ~20 net); `src/container.js` (modify, +15 lines for observer registration); `tests/analisisService.test.js` (modify, +15 lines).
  - **Tests:** Existing `analisisService.test.js` keeps passing; new assertion that `calcularMetricas` no longer touches DB (mocked `analisisRepository`).
  - **Depends on:** 2.2, 2.4
  - **Estimate (LOC delta):** ~10 (net, after deletions)

- [x] **2.6** ImpactValueFactory test suite
  - **What:** Grouped review of the test file created under 2.1.
  - **Depends on:** 2.1
  - **Estimate (LOC delta):** included in 2.1

- [x] **2.7** Strategy test suite
  - **What:** Grouped review of the test file created under 2.2.
  - **Depends on:** 2.2
  - **Estimate (LOC delta):** included in 2.2

- [x] **2.8** Observer + cascada end-to-end test
  - **What:** Integration test wiring the real bus, real `ModificacionRepository`, and a stub `AnalisisService`; asserts recalc fires exactly once after `ModificacionRepository.create()`.
  - **Files:** `tests/integration/cascada.test.js` (new, ~40 lines).
  - **Tests:** RED: emit + assert no listener (fresh bus). GREEN: register observer. REFACTOR: parametrize over create/update/delete.
  - **Depends on:** 2.4, 2.5
  - **Estimate (LOC delta):** ~40

**PR 2 acceptance gate:**
- `node --test tests/**/*.test.js` green; minimum 15 new tests added (10 strategies + 3 observer + 1 factory + 1 cascada).
- `grep "VALOR_IMPACTO\|{ Bajo:" src/` finds exactly one definition in `impactoValues.js`.
- `grep "recalcular\|AnalisisService" src/controllers/` returns no matches.
- `container.bus.on('modificacion.created', spy)` then `repository.create(...)` calls `spy` synchronously (or within microtask).

---

## PR 3 — API: /api/v1 with Zod validation, error envelope, full endpoints

**PR title (conventional commit):** `feat(api): add /api/v1 with Zod validation and error envelope`
**LOC budget target:** ~915 LOC delta (over the 400 default; 15 endpoints
× ~30–60 LOC of route + use case + tests each)
**Acceptance (specs satisfied):**
- `api-v1-json` — all 7 requirements (Auth endpoints, catalog endpoints,
  autos CRUD, modificaciones CRUD, analisis read, Zod validation,
  consistent error envelope)
- `architecture-layered` — partial: thinned controllers now route to use cases

### Tasks

- [ ] **3.1** Error envelope middleware + helper
  - **What:** `src/middlewares/errorEnvelope.js` exports `apiError(code, message, details?)`; `errorHandler` formats unhandled exceptions as 500 INTERNAL with no stack leak.
  - **Files:** `src/middlewares/errorEnvelope.js` (new, ~25 lines); `src/middlewares/errorHandler.js` (new, ~20 lines); `tests/middlewares/errorEnvelope.test.js` (new, ~25 lines).
  - **Tests:** RED: assert `apiError('NOT_FOUND', 'x')` returns `{ error: { code, message } }`. GREEN: implement. REFACTOR: ensure details only on VALIDATION_ERROR.
  - **Depends on:** 1.2
  - **Estimate (LOC delta):** ~70

- [ ] **3.2** Zod schemas (auth, auto, modificacion)
  - **What:** `src/validators/authSchema.js`, `autoSchema.js`, `modificacionSchema.js` exporting `loginSchema`, `createAutoSchema`, `updateAutoSchema`, `createModificacionSchema`, `updateModificacionSchema`.
  - **Files:** 3 new files, ~50 lines total.
  - **Tests:** `tests/validators/schemas.test.js` (new, ~40 lines) — assert each schema accepts a valid payload and rejects invalid `anio`, missing fields, empty strings, oversized strings.
  - **Depends on:** —
  - **Estimate (LOC delta):** ~90

- [ ] **3.3** apiV1Routes: auth (login, logout, me) + `apiAuth` middleware
  - **What:** 3 endpoints under `/auth`. `apiAuth` middleware returns 401 envelope on missing session.
  - **Files:** `src/routes/apiV1Routes.js` (new, ~50 lines, auth section); `src/middlewares/apiAuth.js` (new, ~15 lines); `src/usecases/auth/{loginUser,logoutUser,getMe}.js` (3 files, ~45 lines total).
  - **Tests:** `tests/api/auth.test.js` (new, ~60 lines) — 6 supertest cases: success login, wrong password, me without session, me with session, logout, logout without session.
  - **Depends on:** 1.2, 1.4, 3.1, 3.2
  - **Estimate (LOC delta):** ~170

- [ ] **3.4** apiV1Routes: autos CRUD (list, get, create, update, delete)
  - **What:** 5 endpoints under `/autos`; list is paginated and user-scoped.
  - **Files:** `src/usecases/autos/{listarAutos,obtenerAuto,crearAuto,actualizarAuto,eliminarAuto}.js` (5 files, ~25 lines each = ~125 lines); `src/routes/apiV1Routes.js` (modify, +40 lines for autos section).
  - **Tests:** `tests/api/autos.test.js` (new, ~80 lines) — supertest: list paginated, list empty, get owned, get other user → 404, create 201, create duplicate placa → 409, update, delete 204.
  - **Depends on:** 1.5, 3.2, 3.3
  - **Estimate (LOC delta):** ~245

- [ ] **3.5** apiV1Routes: modificaciones CRUD + Observer already wired in PR 2
  - **What:** 4 endpoints (nested GET/POST, top-level PUT/DELETE). The repository emits the event (already wired in PR 2.5).
  - **Files:** `src/usecases/modificaciones/{crearModificacion,actualizarModificacion,eliminarModificacion,listarModificaciones}.js` (4 files, ~25 lines each = ~100 lines); `src/routes/apiV1Routes.js` (modify, +30 lines for mods section).
  - **Tests:** `tests/api/modificaciones.test.js` (new, ~70 lines) — supertest: create emits cascada, update other user → 404, delete 204 + cascada fires.
  - **Depends on:** 2.4, 3.3, 3.4
  - **Estimate (LOC delta):** ~200

- [ ] **3.6** apiV1Routes: analisis + catalogos
  - **What:** Read-only analisis (pre-aggregated chart data) + 3 catalog endpoints (marcas, modelos, tipos-modificacion).
  - **Files:** `src/usecases/analisis/obtenerAnalisis.js` (~30 lines); `src/usecases/catalogos/{listarMarcas,listarModelosPorMarca,listarTiposModificacion}.js` (3 files, ~10 lines each = ~30 lines); `src/routes/apiV1Routes.js` (modify, +25 lines).
  - **Tests:** `tests/api/analisis.test.js` (~50); `tests/api/catalogos.test.js` (~30) — new files, ~80 lines total. supertest: analisis 200 with all 3 keys, analisis other user → 404, marcas returns 7 items, modelos filters by marca, unknown marca → 404.
  - **Depends on:** 3.3
  - **Estimate (LOC delta):** ~165

- [ ] **3.7** Mount `/api/v1` in `src/app.js` (replace old `apiRoutes`)
  - **What:** `app.use('/api/v1', apiV1Routes)` + mount `errorHandler` last; delete the old 1-endpoint `apiRoutes.js`.
  - **Files:** `src/app.js` (modify, +5 lines); `src/routes/apiRoutes.js` (delete, -26 lines); `tests/api/mount.test.js` (new, ~20 lines).
  - **Tests:** supertest: `GET /api/v1/marcas` returns 200; old `/api/marcas/:id/modelos` kept as alias for the EJS dropdown (design decision documented in code).
  - **Depends on:** 3.3, 3.4, 3.5, 3.6
  - **Estimate (LOC delta):** ~-1 (with -26 deletion)

- [ ] **3.8** Auth API tests
  - **What:** Grouped review of `tests/api/auth.test.js` from 3.3.
  - **Depends on:** 3.3
  - **Estimate (LOC delta):** included in 3.3

- [ ] **3.9** Autos API tests
  - **What:** Grouped review of `tests/api/autos.test.js` from 3.4.
  - **Depends on:** 3.4
  - **Estimate (LOC delta):** included in 3.4

- [ ] **3.10** Modificaciones API tests
  - **What:** Grouped review of `tests/api/modificaciones.test.js` from 3.5.
  - **Depends on:** 3.5
  - **Estimate (LOC delta):** included in 3.5

- [ ] **3.11** Analisis + catalogos API tests
  - **What:** Grouped review of `tests/api/analisis.test.js` and `tests/api/catalogos.test.js` from 3.6.
  - **Depends on:** 3.6
  - **Estimate (LOC delta):** included in 3.6

- [ ] **3.12** Error envelope integration test
  - **What:** One supertest test exercising every error code (400, 401, 404, 409, 500) to assert the envelope shape is identical.
  - **Files:** `tests/integration/envelope.test.js` (new, ~50 lines).
  - **Tests:** supertest: 5 requests, each triggering one error code; assert `Content-Type: application/json` and the documented shape.
  - **Depends on:** 3.1, 3.7
  - **Estimate (LOC delta):** ~50

**PR 3 acceptance gate:**
- `node --test tests/**/*.test.js` green; minimum 30 new tests added.
- Every `/api/v1/*` route returns JSON, never HTML.
- EJS controllers (in `src/controllers/`) still render HTML; new API use cases are in `src/usecases/`.
- `grep "express-validator" src/middlewares/apiAuth.js src/middlewares/errorEnvelope.js` returns no matches (API uses Zod only).

---

## PR 4 — Frontend: apps/web Vite + React + TanStack Query

**PR title (conventional commit):** `feat(web): add React SPA at apps/web consuming /api/v1`
**LOC budget target:** ~825 LOC delta (over the 400 default; 5 pages
× ~130–180 LOC of page + components + tests each)
**Acceptance (specs satisfied):**
- `frontend-react-spa` — all 6 requirements (Vite + React structure,
  TanStack Query, LoginPage, AutosListPage, AutoDetailPage with metricas,
  Modificaciones CRUD, Analisis dashboard with 3 charts)

### Tasks

- [ ] **4.1** Workspace setup (`apps/web/`)
  - **What:** Create `apps/web/package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `vitest.config.ts`; register workspace; add `web` script to root `package.json`.
  - **Files:** 5 new files in `apps/web/`, ~80 lines total; `pnpm-workspace.yaml` (modify, +2 lines); root `package.json` (modify, +3 lines).
  - **Tests:** `apps/web/tests/setup.test.ts` (new, ~15 lines) — assert `pnpm --filter web build` produces `apps/web/dist/index.html` (this test runs in CI, not in unit runner).
  - **Depends on:** —
  - **Estimate (LOC delta):** ~100

- [ ] **4.2** API client + AuthProvider + Router + main entry
  - **What:** `api/client.ts` (fetch wrapper with `credentials: 'include'`), `api/hooks.ts` (TanStack Query keys + useXxx hooks), `auth/AuthProvider.tsx`, `router.tsx`, `main.tsx`, `App.tsx`.
  - **Files:** 6 new files in `apps/web/src/`, ~150 lines total.
  - **Tests:** `apps/web/tests/api/client.test.ts` (~30); `apps/web/tests/auth/AuthProvider.test.tsx` (~35) — assert `fetch` called with `credentials: 'include'`; assert context exposes `{ user, isAuthenticated }`; routes redirect on 401.
  - **Depends on:** 4.1
  - **Estimate (LOC delta):** ~215

- [ ] **4.3** LoginPage
  - **What:** Form posting to `/api/v1/auth/login`; redirects to `/autos` on 200; displays envelope `message` on 401.
  - **Files:** `apps/web/src/pages/LoginPage.tsx` (new, ~60 lines).
  - **Tests:** `apps/web/tests/pages/LoginPage.test.tsx` (new, ~40 lines) — render with stubbed fetch: POST + redirect on 200; DOM contains error text on 401.
  - **Depends on:** 4.2
  - **Estimate (LOC delta):** ~100

- [ ] **4.4** AutosListPage
  - **What:** Table page with pagination controls; empty-state message when no items.
  - **Files:** `apps/web/src/pages/AutosListPage.tsx` (~70); `apps/web/src/components/AutoTable.tsx` (~30) — 2 new files.
  - **Tests:** `apps/web/tests/pages/AutosListPage.test.tsx` (new, ~40 lines) — assert table renders N rows for N items; empty state text for 0 items.
  - **Depends on:** 4.2
  - **Estimate (LOC delta):** ~140

- [ ] **4.5** AutoDetailPage with metricas
  - **What:** 3 parallel queries (`autos/:id`, `modificaciones`, `analisis`); render header + metricas cards + modifications table.
  - **Files:** `apps/web/src/pages/AutoDetailPage.tsx` (~90); `apps/web/src/components/MetricasCards.tsx` (~40) — 2 new files.
  - **Tests:** `apps/web/tests/pages/AutoDetailPage.test.tsx` (new, ~50 lines) — assert 3 parallel fetches; indicator label rendered.
  - **Depends on:** 4.2, 4.4
  - **Estimate (LOC delta):** ~180

- [ ] **4.6** ModificacionesPage (CRUD)
  - **What:** Create/edit form; delete with confirmation; mutation invalidations on the parent auto queries.
  - **Files:** `apps/web/src/pages/ModificacionesPage.tsx` (new, ~110 lines).
  - **Tests:** `apps/web/tests/pages/ModificacionesPage.test.tsx` (new, ~50 lines) — assert POST + invalidation on create; DELETE + invalidation on delete.
  - **Depends on:** 4.2, 4.5
  - **Estimate (LOC delta):** ~160

- [ ] **4.7** AnalisisPage (3 Chart.js charts)
  - **What:** Dashboard with indicator card, evolution chart, distribution chart using Chart.js 4 (pinned in `package.json`, not loaded from CDN).
  - **Files:** `apps/web/src/pages/AnalisisPage.tsx` (~90); `apps/web/src/components/charts/{IndicatorChart,EvolutionChart,DistributionChart}.tsx` (3 files, ~30 lines each = ~90) — 4 new files.
  - **Tests:** `apps/web/tests/pages/AnalisisPage.test.tsx` (new, ~45 lines) — assert 3 `data-testid` chart containers; assert `chart.js` is in `apps/web/package.json` deps with `^4.x`.
  - **Depends on:** 4.2, 4.5
  - **Estimate (LOC delta):** ~225

- [ ] **4.8** `pnpm-workspace.yaml` + Express mount at `/app/*`
  - **What:** Add `apps/web` to workspaces (already done in 4.1, verified here). Add Express static handler for `apps/web/dist` at `/app/*`.
  - **Files:** `src/app.js` (modify, +5 lines); `tests/api/spaMount.test.js` (new, ~20 lines).
  - **Tests:** supertest: `GET /app/` returns the SPA's `index.html`.
  - **Depends on:** 4.1
  - **Estimate (LOC delta):** ~25

- [ ] **4.9** vitest setup
  - **What:** `apps/web/vitest.config.ts` (jsdom + setup file); `apps/web/tests/setup.ts` (@testing-library/jest-dom matchers); npm script `test`.
  - **Files:** 2 new files, ~25 lines.
  - **Tests:** smoke test asserting `expect(true).toBe(true)` works under jsdom.
  - **Depends on:** 4.1
  - **Estimate (LOC delta):** ~30 (subsumed in 4.1)

- [ ] **4.10** Page test suite
  - **What:** Grouped review of the 5 page test files created under 4.3–4.7.
  - **Depends on:** 4.3, 4.4, 4.5, 4.6, 4.7
  - **Estimate (LOC delta):** included in those tasks

- [ ] **4.11** AuthProvider test
  - **What:** Grouped review of the test file created under 4.2.
  - **Depends on:** 4.2
  - **Estimate (LOC delta):** included in 4.2

**PR 4 acceptance gate:**
- `pnpm --filter web test` green; minimum 10 new vitest tests.
- `pnpm --filter web build` produces `apps/web/dist/index.html` + `dist/assets/*`.
- `GET /app/` (via supertest) returns 200 with `Content-Type: text/html`.
- `grep -r "cdn.jsdelivr.net\|cdnjs.cloudflare.com" apps/web/index.html apps/web/src/` returns no matches.

---

## PR 5 — Verify + deploy + archive

**PR title (conventional commit):** `chore(deploy): add render.yaml, deploy docs, and archive change`
**LOC budget target:** ~325 LOC delta (mostly docs; well under 400 for code)
**Acceptance (specs satisfied):**
- `deploy-render` — all 5 requirements (render.yaml exists, buildCommand
  runs pnpm + frontend build, env vars declared, free tier constraints
  respected, deploy documentation updated)
- All prior specs — verification of every requirement (no new code, only
  proofs that the system meets the contracts)

### Tasks

- [ ] **5.1** `render.yaml` (web + static)
  - **What:** Blueprint with 2 services. Web: `startCommand: node server.js`, `buildCommand: pnpm install --frozen-lockfile && pnpm --filter web build`. Static: `staticPublishPath: apps/web/dist`.
  - **Files:** `render.yaml` (new, ~40 lines).
  - **Tests:** `tests/deploy/render.test.js` (new, ~30 lines) — parses YAML, asserts 2 services, `buildCommand` includes `pnpm install --frozen-lockfile`, `SESSION_SECRET` declared as `sync: false`, `numInstances: 1`.
  - **Depends on:** 4.1
  - **Estimate (LOC delta):** ~70

- [ ] **5.2** Update `deploy.md` (or `README.md`)
  - **What:** Add `SESSION_SECRET`, `PORT`, `VITE_API_URL` env vars; document the SPA at `/app/`.
  - **Files:** `deploy.md` (modify, +25 lines) or `README.md` (modify, +25 lines).
  - **Tests:** `tests/deploy/docs.test.js` (new, ~20 lines) — grep `deploy.md` for `SESSION_SECRET` and `/app/`.
  - **Depends on:** 5.1
  - **Estimate (LOC delta):** ~45

- [ ] **5.3** Update `openspec/config.yaml` + run `sdd-verify`
  - **What:** Bump `existing_tests.total_tests` to 60+; add `apps/web` to `client_libraries`; run sdd-verify to produce `verify-report.md`.
  - **Files:** `openspec/config.yaml` (modify, +5 lines); `openspec/changes/refactor-api-frontend/verify-report.md` (new, generated by sdd-verify, ~150 lines).
  - **Tests:** sdd-verify runs the full `node --test` and `pnpm --filter web test` suites and writes the report.
  - **Depends on:** 1.1, 2.1, 3.1, 4.1, 5.1
  - **Estimate (LOC delta):** ~155 (5 config + 150 generated)

- [ ] **5.4** Write `Informe.md` (academic deliverable)
  - **What:** Final report describing the refactor, patterns applied, API, frontend, and deploy. ~2,000–3,000 words.
  - **Files:** `Informe.md` (new, ~200 lines).
  - **Tests:** n/a (documentation).
  - **Depends on:** 5.3
  - **Estimate (LOC delta):** ~200 (doc only, not code)

- [ ] **5.5** `sdd-archive`
  - **What:** Move the change folder to `openspec/changes/archive/2026-07-06-refactor-api-frontend/`; merge the 7 delta specs into `openspec/specs/{capability}/spec.md`.
  - **Files:** 7 spec files merged; 1 change folder moved (structural, not a code diff).
  - **Tests:** sdd-archive validates the merge succeeded.
  - **Depends on:** 5.3
  - **Estimate (LOC delta):** ~0 (structural move)

**PR 5 acceptance gate:**
- `sdd-verify` produces a passing `verify-report.md`.
- `node --test tests/**/*.test.js` green; total tests ≥ 60.
- `pnpm --filter web test` green; total frontend tests ≥ 10.
- Manual smoke test of every EJS page (existing) + every `/api/v1` endpoint (15 endpoints).
- `openspec/changes/archive/2026-07-06-refactor-api-frontend/` exists with all 5 PR commits reachable from `main`.

---

## Implementation Order

1. **PR 1 first** — every other PR depends on the container, repos, and policies.
2. **PR 2 second** — the Observer needs the repos from PR 1; the API in PR 3 reads the indicator classifier.
3. **PR 3 third** — the frontend in PR 4 calls the API.
4. **PR 4 fourth** — depends on the API from PR 3.
5. **PR 5 last** — verification and archive require all prior PRs to be merged.

## Risk Notes (per PR)

- **PR 1 budget overrun (720 LOC vs 400):** `design.md` estimated 300 LOC
  by undercounting test code. Each repository ships interface +
  implementation + test (~75–90 LOC × 5 = ~400 LOC alone). Plan for one
  extended review session.
- **PR 3 budget overrun (915 LOC vs 400):** 15 endpoints × ~30–60 LOC of
  route handler + use case + happy-test + error-test = ~900 LOC minimum.
  This is the largest PR by far. Consider splitting into PR 3a (auth +
  catalog + error envelope, ~330 LOC) and PR 3b (autos + mods + analisis,
  ~585 LOC) if the review tool blocks it — but the user-specified
  5-group structure takes precedence.
- **PR 4 budget overrun (825 LOC vs 400):** 5 React pages with
  components, AuthProvider, router, hooks, and tests is ~130–180 LOC
  per page. Same option to split if needed.
- **Test suite growth:** from 15 tests to ~60–80 backend tests + ~10–15
  frontend tests. This is the main driver of the LOC deltas.
- **Strict TDD discipline:** every task writes tests FIRST. Skipping
  this step breaks `rules.apply.tdd: true` and the `sdd-verify`
  acceptance gate.

## Cross-References

- [proposal.md](./proposal.md) §6 Acceptance Criteria and §Delivery Strategy
- [design.md](./design.md) §2 File Layout, §4 Sequence Diagrams, §11 Deploy Plan
- [explore.md](./explore.md) §4–5 Code Smells and SOLID Violations
- [specs/architecture-layered/spec.md](./specs/architecture-layered/spec.md)
- [specs/pattern-strategy/spec.md](./specs/pattern-strategy/spec.md)
- [specs/pattern-factory/spec.md](./specs/pattern-factory/spec.md)
- [specs/pattern-observer/spec.md](./specs/pattern-observer/spec.md)
- [specs/api-v1-json/spec.md](./specs/api-v1-json/spec.md)
- [specs/frontend-react-spa/spec.md](./specs/frontend-react-spa/spec.md)
- [specs/deploy-render/spec.md](./specs/deploy-render/spec.md)
