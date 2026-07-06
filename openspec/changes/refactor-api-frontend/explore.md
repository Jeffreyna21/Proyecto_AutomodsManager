# Exploration: refactor-api-frontend

> Codebase investigation for the academic deliverable: code-smell audit, SOLID
> analysis, refactor opportunities, current API state, and a recommended
> change scope that combines refactor + JSON API + JS frontend + deploy.

## 1. Executive Summary

AutoMods Manager is a working Node.js 18 + Express 5 + EJS + sql.js CRUD app
with auth, two aggregated entities (autos / modificaciones) and a recalculated
analysis service. The architecture is honest MVC and most concerns are in the
right layer, but a thorough audit surfaces **~20 code smells**, **concrete
SOLID violations in every layer** (especially SRP in services and DIP across
the board), and a near-empty JSON API that prevents a real frontend from
existing. The recommended change combines (a) introducing Repository +
Strategy + Factory + Observer patterns, (b) extracting a use-case layer and
an authorization policy, (c) implementing a full JSON API under `/api/v1`,
and (d) keeping the existing EJS views intact while adding a thin JS client
shell (or a standalone `apps/web` SPA) that consumes the new API. Strict TDD
is enforced — every change ships with a `node --test` suite.

## 2. Stack & Conventions (confirmed)

From `package.json` and `openspec/config.yaml`:

- **Runtime**: Node.js 18+ (recommended v22 LTS per `deploy.md`).
- **Framework**: Express 5.2.1 (router-level `use(requireAuth)`, method-override for PUT/DELETE).
- **View engine**: EJS 5.0.1.
- **Database**: SQLite via `sql.js` 1.14.1 (WebAssembly, in-memory + `fs.writeFileSync` to `database/automods.db`).
- **Auth**: `bcryptjs` 3.0.3, `express-session` 1.19.0, `connect-flash` 0.1.1.
- **Validation**: `express-validator` 7.3.2 + custom domain validator (`placaValidator`).
- **Client**: Chart.js 4 via CDN (loaded in `analisis.ejs` only — not in `package.json`).
- **Tests**: `node:test` + `node:assert/strict`, 2 files / 15 tests, strict TDD.
- **Package manager**: pnpm 10.18.1, `pnpm-workspace.yaml` present (monorepo *intent* — no packages yet).

Conventions:

- CommonJS only (`require` / `module.exports`). No ESM, no TypeScript.
- Controllers return rendered EJS or redirect; JSON only via `apiRoutes.js`.
- Per-user data isolation enforced in every controller, not in middleware.
- `deploy.md` carries a 25-commit Conventional Commits list (Spanish).

## 3. Current Architecture Map

```
HTTP request
   ↓
src/app.js                     global middleware (json, urlencoded, static,
                               methodOverride, session, flash, locals)
   ↓
src/routes/{auth,autos,modificaciones,api}Routes.js
   ↓
src/middlewares/{auth,validation}Middleware.js
   ↓
src/controllers/*.js           per-request orchestration: read body,
                               check ownership, call model + service,
                               render EJS or redirect
   ↓
src/services/{placaValidator,analisisService}.js
                               pure-ish domain logic
   ↓
src/models/*.js                thin CRUD layer over sql.js
   ↓
src/models/db.js               module-level `let db` + schema + seed +
                               saveDB() to filesystem
   ↓
sql.js (WASM)  ↔  database/automods.db
```

Key data flows:

- **Create auto**: `autosRoutes.POST /` → `validateAuto` → `autosController.create`
  → `placaValidator.validar` (which calls `autoModel.existePlacaParaUsuario` as the
  existence callback) → `autoModel.create` → `saveDB()` → redirect.
- **Create modificación**: `modificacionesRoutes.POST /autos/:autoId/modificaciones`
  → `validateModificacion` → `modificacionesController.create` → checks auto
  ownership → `modificacionModel.create` → `modificacionModel.getByAutoId`
  → `analisisService.recalcular(autoId, mods)` (which upserts `analisis` row).
- **Dropdown**: `public/js/dropdownMarcaModelo.js` → `GET /api/marcas/:id/modelos`
  → `apiRoutes.js` → `marcaModel.getById` + `modeloModel.getByMarcaId` → JSON.
- **Login**: HTML form → `authController.login` → `usuarioModel.getByUsername`
  → `bcrypt.compare` → `req.session.user` + flash.

## 4. Code Smells Found

Each entry has severity (H/M/L) and file:line references.

### High severity

- **C1 · Module-level mutable DB handle** — `src/models/db.js:7` `let db = null`
  shared by every import. Any test or concurrent request that touches models
  reads/writes the same in-memory buffer. Couples the entire app to a single
  sql.js instance and prevents DI.
- **C2 · Hard-coded session secret fallback** — `src/config/session.js:4`
  silently uses `'dev-secret-change-in-production'` when `SESSION_SECRET` is
  missing. This is a real risk if `.env` is forgotten in production.
- **C3 · Domain service writes to the database directly** —
  `src/services/analisisService.js:71-117` `recalcular()` mixes pure metric
  calculation with `db.run()` and `saveDB()`. The pure part (`calcularMetricas`)
  is unit-tested, the impure part is not testable in isolation.
- **C4 · No transaction for cascada recalc** — `modificacionesController.create`
  (lines 39-51), `update` (lines 106-118), `delete` (lines 147-151) all perform
  `modificacionModel.create/update/delete` followed by a `getByAutoId` +
  `analisisService.recalcular` without a transaction. A crash between the two
  leaves `analisis` out of sync.

### Medium severity

- **C5 · Row-to-object mapping duplicated 8+ times** — same
  `result[0].values.map(row => ({ id: row[0], ... }))` pattern in
  `autoModel.js:16-26, 46-58`, `modificacionModel.js:15-26, 39-53`,
  `usuarioModel.js:7-15, 22-30`, `catalogoModel.js:7-10, 18, 28-32, 38-42, 50-53, 60`.
  Brittle, error-prone, impossible to test without a real DB.
- **C6 · `VALOR_IMPACTO` magic map duplicated** — `analisisService.js:6-10`
  defines `{Bajo:1, Medio:2, Alto:3}`; the same map is **redefined inline**
  in the EJS view at `src/views/autos/analisis.ejs:131`. Two sources of truth
  for the same business constant.
- **C7 · Magic thresholds in if/else chain** — `analisisService.js:48-54`:
  `if (promedio_mejora < 1.5) ... else if (promedio_mejora < 2.5) ... else`.
  Hard to extend (OCP violation) and hard to test edge cases like `1.4999`.
- **C8 · Authorization check repeated in every controller method** —
  `autosController.js:75, 96, 117, 147, 168` and
  `modificacionesController.js:13, 34, 74, 101, 141` all have the identical
  `if (!auto || auto.id_usuario !== idUsuario)` pattern. Easy to forget.
- **C9 · Cascada recalc logic repeated** — `modificacionesController.js:50-51,
  117-118, 150-151` repeat the same `getByAutoId + recalcular` sequence.
  Should be a single observer or use-case call.
- **C10 · EJS view contains business logic** — `analisis.ejs:130-186` builds
  chart data (`impactoAcumulado`, `conteoTipos`, color arrays) inline using
  the duplicated `valorImpacto` map. Untouched by tests.
- **C11 · Controllers return HTML on errors regardless of caller** —
  `autosController.js:27-36, 84-87, 104-107, 134-137, 156-158, 177-180` all
  use `res.render` or `res.redirect` in the `catch`. An `Accept: application/json`
  caller gets HTML back.
- **C12 · No DI / composition root** — every layer imports concrete modules
  (`require('./db')`, `require('../models/autoModel')`). Impossible to inject
  mocks in tests without `require.cache` hacks.
- **C13 · `validationMiddleware.handleValidationErrors` floods flash** —
  `validationMiddleware.js:52-54` pushes every validation error to
  `req.flash('error', ...)`. A user with three bad fields sees three separate
  red banners. UX + SRP smell.
- **C14 · Auto list query is not user-filtered at model level** —
  `autoModel.getAllByUsuario` is the *only* model method that filters by user
  (`autoModel.js:5-15`). `getById` returns any auto (line 35-45) and the
  controller must add the ownership check. Inversion of responsibility.

### Low severity

- **C15 · Hard-coded `ITEMS_PER_PAGE = 10`** — `autosController.js:7`. Should
  be a config constant or query param.
- **C16 · Hard-coded catalog seed inside `db.js`** — `db.js:140-148` hard-codes
  7 brands × 5 models + 3 modification types. Should live in a dedicated seed
  module or `config/seed.js`.
- **C17 · Magic number `bcrypt.hashSync(..., 10)`** — `db.js:126-127`. Salt
  rounds should be a named constant.
- **C18 · `console.log` in `server.js:11` ships credentials hint** — prints
  default credentials to stdout. Acceptable in dev, surprising in prod.
- **C19 · API error contract is inconsistent** — `apiRoutes.js:14` returns
  `{error: 'Marca no encontrada'}` but the controllers' catch blocks return
  HTML. Two error contracts in the same app.
- **C20 · `dropdownMarcaModelo.js` hard-codes option strings** —
  `public/js/dropdownMarcaModelo.js:17, 21, 34, 49` embed Spanish option
  text. Should be a small i18n object or a `data-loading` attribute on the
  select.

## 5. SOLID Violations

| Principle | Where it breaks | Notes |
|---|---|---|
| **SRP** | `analisisService.recalcular` (`analisisService.js:71-117`) | One class does metric calculation AND persistence AND filesystem write. Split into `calcularMetricas` (pure) + `AnalisisRepository.upsert` (impure). |
| **SRP** | `db.js` (175 lines) | Schema, seeds, connection, persistence, file I/O. Could split into `connection.js`, `schema.js`, `seeds/*.js`, `persistence.js`. |
| **SRP** | `autosController`, `modificacionesController` | Each handler does: parse body, validate, **check ownership**, persist, recalc, render. The ownership check belongs in a Policy; the recalc belongs in a Use Case. |
| **OCP** | `analisisService.calcularMetricas` (`analisisService.js:47-54`) | Adding a new classification tier (e.g. "Premium") means editing the function. Replace with a Strategy map. |
| **OCP** | Controllers in general | A new role (e.g. "admin can edit any auto") forces editing every check site. Replace with a Policy. |
| **LSP** | (n/a procedurally) | No inheritance hierarchies exist, so LSP has no surface to violate — but introducing Strategy/Repository without preserving current behavior is a risk to manage. |
| **ISP** | `autoModel` | Exposes all CRUD (incl. `getAllByUsuario`, `getCountByUsuario`, `getById`, `existePlacaParaUsuario`, etc.) to every caller. Controllers only need a subset. After Repository refactor, define narrow interfaces per use case. |
| **ISP** | `apiRoutes.js` | Knows about `marcaModel` and `modeloModel` directly. Should depend on a Catalog use case. |
| **DIP** | Every layer | Controllers depend on concrete models; models depend on concrete `db.js`; services depend on concrete `getDB/saveDB`. There is no abstraction. Add a `Container` and constructor-inject repositories. |
| **DIP** | Views | EJS templates depend on the exact object shape produced by `autoModel.getAllByUsuario` (which adds `marca`, `modelo`, `id_marca`, `id_modelo`). Shape changes ripple to the view. DTOs would decouple. |

## 6. Refactor Opportunities

### Repository Pattern (replaces `models/*.js`)

- New `src/repositories/AutoRepository.js`, `ModificacionRepository.js`,
  `UsuarioRepository.js`, `CatalogRepository.js`, `AnalisisRepository.js`.
- Constructor-injected DB handle. Each method returns DTOs (not raw rows).
- Side benefits: removes C5 duplication (single row mapper per repo), enables
  test mocking (DI), fixes C1 module-level DB, fixes C14 (repos accept
  `idUsuario` as a filter parameter, not as a controller concern).

### Strategy Pattern (replaces if/else in `analisisService.js:47-54`)

- New `src/services/indicators/IndicadorClassifier.js` with three strategies:
  `DeficienteIndicator`, `RegularIndicator`, `ExcelenteIndicator` (and a
  `SinDatosIndicator` for N=0).
- Thresholds come from a config table so a teacher can change them without
  touching code.
- Justification: the metric is a small but real decision boundary; the
  strategy makes the boundary explicit and unit-testable per tier.

### Factory + single source of truth for `VALOR_IMPACTO`

- `src/services/indicators/impactoValues.js` exports `valorImpacto(nivel)`.
- Service, EJS view, and any future JSON DTO import from the same place.
- Removes C6 duplication.

### Observer / Domain Event for cascada recalc

- `modificacionModel.create/update/delete` emit a `ModificacionChanged` event
  with `{ autoId }`.
- `AnalisisListener` subscribes and triggers `AnalisisService.recalcular`.
- Controllers stop calling `recalcular` manually → removes C9 and C4 risk.
- Implementation: a tiny in-process emitter (`EventEmitter`) — no message
  broker needed at this scale.

### Use Case / Application Service layer

- `src/use-cases/crearModificacion.js`, `actualizarModificacion.js`,
  `eliminarModificacion.js`, `crearAuto.js`, etc.
- Each use case: validate → check policy → persist → emit event → return DTO.
- Controllers shrink to ~10 lines: parse HTTP, call use case, render/respond.

### Authorization Policy

- `src/policies/autoPolicy.js` (`canView`, `canEdit`, `canDelete` taking
  `user` and `auto`).
- Used by both controllers (today) and the new API handlers (tomorrow).
- Removes C8 repetition and centralizes per-user logic.

### Composition root

- `src/container.js` instantiates the DB, builds repositories, registers
  listeners, exports the use cases.
- `src/app.js` and the test harness pull the container instead of
  `require('./models/autoModel')` everywhere.
- Foundation for test isolation (each test gets a fresh in-memory DB).

## 7. API State

`src/routes/apiRoutes.js` is 26 lines and exposes exactly one endpoint:

- `GET /api/marcas/:id/modelos` → `marcaModel.getById` + `modeloModel.getByMarcaId`
  → JSON array. Already used by `public/js/dropdownMarcaModelo.js`.

No auth-me endpoint, no JSON login, no JSON CRUD for autos/modificaciones, no
JSON analisis. The two pieces of public JS (`dropdownMarcaModelo.js` and
the inline `<script>` in `analisis.ejs`) are the only JSON consumers.

### Endpoints the new API needs

```
POST   /api/v1/auth/login           JSON { username, password } → 200 {user} | 401
POST   /api/v1/auth/logout          204
GET    /api/v1/auth/me              200 {user} | 401

GET    /api/v1/marcas               200 [{id, nombre}]
GET    /api/v1/marcas/:id/modelos   200 [{id, nombre, id_marca}] | 404
GET    /api/v1/tipos-modificacion   200 [{id, nombre}]

GET    /api/v1/autos                200 { items, page, totalPages }  (paginated, user-scoped)
GET    /api/v1/autos/:id            200 AutoDTO (with marca/modelo joined)
POST   /api/v1/autos                201 | 400 (validation) | 409 (duplicate placa)
PUT    /api/v1/autos/:id            200 | 400 | 404
DELETE /api/v1/autos/:id            204

GET    /api/v1/autos/:id/modificaciones     200 ModificacionDTO[]
POST   /api/v1/autos/:id/modificaciones     201 | 400
PUT    /api/v1/modificaciones/:id           200 | 400 | 404
DELETE /api/v1/modificaciones/:id           204

GET    /api/v1/autos/:id/analisis           200 AnalisisDTO + chart series
```

Auth uses the existing session cookie (`express-session`). The API does not
need a token yet — same browser session, same `req.session.user.id`. A
future "API token for SPA" task can be added without breaking this contract.

## 8. Frontend Needs

A real JSON-driven frontend needs every page to fetch JSON and render with
JS. The data each page needs:

- **Login** → `POST /api/v1/auth/login`. Store session cookie. Redirect to
  `/autos`.
- **Autos list** → `GET /api/v1/autos?page=N` (returns paginated items).
  Render table + pagination controls.
- **Auto detail** → `GET /api/v1/autos/:id` + `GET /api/v1/autos/:id/modificaciones`
  + `GET /api/v1/autos/:id/analisis`. Render details, modifications table,
  metric cards, charts.
- **Create/Edit auto** → `GET /api/v1/marcas` + `GET /api/v1/marcas/:id/modelos`
  (re-use the existing dropdown JS, or convert to a SPA component).
- **Create/Edit mod** → `GET /api/v1/tipos-modificacion` + the same auto detail.
- **Analisis page** → `GET /api/v1/autos/:id/analisis` (returns
  `metricas` + `seriesEvolucion` + `distribucionPorTipo` pre-aggregated, so
  the view stops re-computing them — fixes C10).
- **Session check** → `GET /api/v1/auth/me` on every page load.

Per the user request, EJS views stay (they still work). The new JS app can
live in a separate folder (e.g. `apps/web/` or `public/app/`) and be served
as static assets that hit the JSON API. `pnpm-workspace.yaml` already
hints at this layout, so a minimal monorepo split is feasible.

## 9. Testability Gaps

- **C1 + C12** make any test that imports a model touch the real
  `database/automods.db`. Even after wiping the file, side effects leak
  across test files.
- **C3** `analisisService.recalcular` cannot be unit-tested because it
  writes to the DB. After the split, the pure function stays testable
  (already is) and a new `AnalisisRepository.upsert` test exercises the
  persistence separately.
- **No supertest**. Controllers and routes are not exercised. After the
  composition root lands, `tests/integration/*.test.js` can spin up an
  Express app with an in-memory DB per test.
- **Validation middleware** (`validationMiddleware.js`) has no tests.
- **Authorization policy** (after refactor) needs tests that assert
  `canView(null, auto) === false`, `canView(otherUser, auto) === false`,
  `canView(owner, auto) === true`.
- **API responses** need tests that assert status codes and JSON shape
  for happy + error paths.
- **sql.js requires buffer-based init** (`openspec/config.yaml` already
  flags this). A `tests/helpers/inMemoryDb.js` would create a fresh
  `new SQL.Database()` per suite — trivial to add once the container
  lands.

## 10. Risks & Constraints

- **sql.js in-memory + file persistence is single-process**. `saveDB()`
  uses `fs.writeFileSync` and is called on every write. Under load, writes
  serialize. The `database/automods.db` file can be lost on unclean
  shutdown. Acceptable for academic scale; documented in `deploy.md:9`.
- **Session secret fallback** (C2) must be fixed in this change — fail
  fast if `SESSION_SECRET` is missing in `NODE_ENV=production`.
- **EJS views stay in the original project** per the user request. Do not
  delete `src/views/*` or `public/css/*`. The new JS frontend either
  replaces specific pages (login, autos list, detail) or co-exists as a
  static asset under `/app/*`. The cleaner answer is **coexistence** — the
  new API powers both the EJS dropdown and the new JS pages.
- **`pnpm-workspace.yaml` exists but no packages**. The change can leave
  it alone and add a single `apps/web` workspace later, or remove the
  workspace file if the team prefers a single package. Recommend
  **leave it** to preserve the intent.
- **Express 5 semantics** for async errors: route handlers that throw
  propagate to the error middleware automatically, but the existing
  `try/catch` pattern still works. The refactor should keep the same
  pattern to avoid surprises.
- **Strict TDD is on** (`openspec/config.yaml` `rules.apply.tdd: true`).
  Every change ships RED → GREEN → REFACTOR. `tests/*.test.js` count must
  grow with each task.
- **Chart.js is loaded from CDN** in `analisis.ejs:8`. If a new JS app
  also needs charts, the team should pin Chart.js in `package.json`
  instead of relying on a CDN version that can drift.
- **EJS coupling**. EJS templates read `auto.marca`, `auto.modelo`,
  `analisis.indicador` directly. The refactor must preserve the view
  contract — DTOs should match the existing shape, not change it.

## 11. Recommended Next Step

Propose a single change named **`refactor-api-frontend`** that bundles the
refactor and the new functionality. The change should be split into
reviewable task groups, each under the 400-line PR budget:

1. **Group 1 — Foundation (no behavior change)**
   - Add `src/container.js` composition root.
   - Introduce `src/repositories/*` (one per entity) and a `tests/helpers/inMemoryDb.js`.
   - Convert controllers to call repositories (not models).
   - Add `src/policies/autoPolicy.js` and `politicaModificacion.js`.
   - Fix C2 (fail-fast session secret).
   - Tests: in-memory repo tests + policy tests.

2. **Group 2 — Domain patterns (no behavior change)**
   - Strategy for indicator classification (`Deficiente`/`Regular`/`Excelente`).
   - Factory for `VALOR_IMPACTO` (`src/services/indicators/impactoValues.js`).
   - Observer for cascada recalc (in-process `EventEmitter` + listener).
   - Tests: per-strategy boundary cases + listener wiring test.

3. **Group 3 — JSON API + DTOs (new endpoints)**
   - `src/dtos/*.js` (`AutoDTO`, `ModificacionDTO`, `AnalisisDTO`).
   - `src/routes/apiRoutes.js` extended to `src/routes/apiV1Routes.js`.
   - Each new endpoint gets a supertest-style test.
   - EJS view updated to consume pre-aggregated chart data (fixes C10, C6).

4. **Group 4 — JS frontend shell + deploy**
   - New static SPA shell at `public/app/` (or `apps/web/`).
   - Consumes the JSON API for login, autos list, auto detail, analisis.
   - `deploy.md` updated with the new endpoints and the new deploy steps.
   - `.env.example` updated with `NODE_ENV`.

5. **Group 5 — Verify + archive**
   - `node --test` green.
   - Smoke test of every EJS page + every JSON endpoint.
   - `sdd-archive` after `sdd-verify` passes.

This grouping keeps each PR well under 400 changed lines and matches the
strict TDD rule that every task adds or modifies tests. The
`openspec/config.yaml` `rules.tasks` "Keep individual tasks completable
in one session (< 400 lines of diff per task)" is satisfied.

## Ready for Proposal

**Yes.** The orchestrator can launch `sdd-propose refactor-api-frontend`
with the scope above. The change is large enough to warrant chained PRs
(see `sdd-phase-common.md` Section E — review workload guard), and the
groups above are the natural slice boundaries.
