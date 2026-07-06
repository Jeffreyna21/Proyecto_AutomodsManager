# frontend-react-spa Specification

## Purpose

Defines the new client-side Single Page Application at `apps/web/`,
built with Vite 5 and React 18, that consumes the JSON API at
`/api/v1`. The SPA MUST provide pages for login, autos list, auto detail
(with metricas), modificaciones CRUD, and an analisis dashboard. Data
fetching MUST use TanStack Query v5. HTTP requests MUST send session
cookies (`credentials: "include"`). The production build MUST output to
`apps/web/dist` and MUST be served by the Express app under `/app/`. The
Vite dev server MUST proxy `/api/v1` to the Express backend on
`http://localhost:3000` to keep cookies working in development.

> **TDD note**: frontend tests run with `vitest` + `@testing-library/react`
> + `jsdom`. Each page is exercised through a render test that asserts the
> expected TanStack Query call and the rendered output. Network calls are
> stubbed at the `fetch`/`axios` boundary so tests do not require a running
> backend.

## Requirements

### Requirement: Vite + React project structure under apps/web

The system MUST contain an `apps/web/` workspace with `package.json`,
`vite.config.js`, `index.html`, and a `src/` directory that boots React 18
into the root element. The workspace MUST be registered in
`pnpm-workspace.yaml`. The build output MUST land in `apps/web/dist`.

#### Scenario: apps/web exists and is a pnpm workspace

- GIVEN the repository root
- WHEN the test reads `pnpm-workspace.yaml`
- THEN `apps/web` is listed under `packages`

#### Scenario: Vite build produces a dist directory

- GIVEN `apps/web/` is installed
- WHEN `pnpm --filter web build` is executed
- THEN `apps/web/dist/index.html` exists and the directory contains the
  hashed asset bundle

#### Scenario: Vite dev server proxies /api/v1 to the backend

- GIVEN `apps/web/vite.config.js`
- WHEN the test inspects the config's `server.proxy` entry
- THEN `/api/v1` is proxied to `http://localhost:3000` and cookies are
  forwarded (no `changeOrigin: true` rewrite that strips the path)

### Requirement: TanStack Query drives data fetching

The system MUST wrap the React app in a `QueryClientProvider` from
`@tanstack/react-query` v5 and use `useQuery` / `useMutation` hooks for
every network call. The client MUST be configured with
`credentials: "include"` (for fetch) or `withCredentials: true` (for
axios) so the session cookie is sent on every request.

#### Scenario: QueryClient sends credentials on every request

- GIVEN a `useQuery` hook that calls `GET /api/v1/autos`
- WHEN the test renders a component using that hook with a stubbed
  `fetch`
- THEN the stubbed call is invoked with `credentials: "include"`

#### Scenario: useMutation invalidates the relevant query on success

- GIVEN a `useMutation` for `POST /api/v1/autos` and a list page that
  uses `useQuery(['autos'])`
- WHEN the mutation's `onSuccess` fires (asserted via the test)
- THEN `queryClient.invalidateQueries({ queryKey: ['autos'] })` is
  called

### Requirement: Login page posts to /api/v1/auth/login

The system MUST render a login form that POSTs to
`/api/v1/auth/login`, stores nothing in `localStorage` (the session cookie
is `httpOnly`), and redirects to `/autos` on success. On `401`, the page
MUST display the error message from the error envelope.

#### Scenario: Successful login redirects to /autos

- GIVEN the login page is mounted and the API returns `200` with a user
  DTO
- WHEN the user submits valid credentials
- THEN the test asserts `window.location.pathname` is `/autos` after the
  redirect

#### Scenario: Failed login shows the error message

- GIVEN the API returns `401` with
  `{ error: { code: "UNAUTHORIZED", message: "Credenciales inválidas" } }`
- WHEN the user submits invalid credentials
- THEN the rendered DOM contains the text "Credenciales inválidas"

### Requirement: Autos list page renders paginated items

The system MUST render a `/autos` page that uses `useQuery` against
`/api/v1/autos?page=N` and displays a table with the user's autos plus
pagination controls. An empty list MUST render an empty-state message.

#### Scenario: Page renders one row per item

- GIVEN the API returns `{ items: [...3 items], page: 1, totalPages: 1 }`
- WHEN the autos page is rendered
- THEN the rendered DOM contains 3 table rows under the autos table

#### Scenario: Empty list renders an empty-state message

- GIVEN the API returns `{ items: [], page: 1, totalPages: 0 }`
- WHEN the autos page is rendered
- THEN the rendered DOM contains a localized "No hay autos" message

### Requirement: Auto detail page shows metricas and modifications

The system MUST render an auto detail page that fetches
`/api/v1/autos/:id`, `/api/v1/autos/:id/modificaciones`, and
`/api/v1/autos/:id/analisis` in parallel, and displays header info, the
metricas cards (totals, average, indicator), the modifications table, and
a placeholder for charts.

#### Scenario: Detail page makes three parallel fetches on mount

- GIVEN the route is `/autos/7`
- WHEN the detail page mounts
- THEN the stubbed `fetch` is called three times in parallel for
  `autos/7`, `autos/7/modificaciones`, and `autos/7/analisis`

#### Scenario: Detail page renders the indicator label

- GIVEN the analisis API returns
  `metricas.indicador: "Excelente"`
- WHEN the detail page is rendered
- THEN the rendered DOM contains the text "Excelente"

### Requirement: Modificaciones CRUD forms use the API

The system MUST provide create and edit forms for modifications that POST
or PUT to `/api/v1/autos/:autoId/modificaciones` and
`/api/v1/modificaciones/:id` respectively, and a delete action that
calls `DELETE /api/v1/modificaciones/:id`. The forms MUST invalidate the
queries for the parent auto so metricas refresh automatically.

#### Scenario: Submitting the create form POSTs and invalidates the parent

- GIVEN the create-modification form is filled in
- WHEN the user submits
- THEN the stubbed `fetch` records a `POST` to
  `/api/v1/autos/7/modificaciones` and
  `queryClient.invalidateQueries({ queryKey: ['autos', 7, 'analisis'] })`
  is called

#### Scenario: Delete confirmation triggers DELETE

- GIVEN the user clicks the delete button on a modification row and
  confirms
- WHEN the action runs
- THEN a `DELETE` to `/api/v1/modificaciones/99` is recorded and the
  auto's modifications and analisis queries are invalidated

### Requirement: Analisis dashboard page renders pre-aggregated charts

The system MUST render an analisis dashboard at
`/autos/:id/analisis` that fetches `/api/v1/autos/:id/analisis` and
displays three chart components: indicator card, evolution over time, and
distribution by modification type. Charts MUST use Chart.js 4 (pinned in
`apps/web/package.json`, not loaded from a CDN).

#### Scenario: Dashboard renders three chart containers

- GIVEN the analisis API returns the full pre-aggregated payload
- WHEN the dashboard is rendered
- THEN the rendered DOM contains three elements with
  `data-testid="chart-indicator"`, `data-testid="chart-evolucion"`, and
  `data-testid="chart-distribucion"`

#### Scenario: Chart.js is loaded from npm, not a CDN

- GIVEN `apps/web/package.json`
- WHEN the test reads the dependencies
- THEN `chart.js` is listed with a `^4.x` version and no `<script>`
  tag with a `cdn.jsdelivr.net` or `cdnjs.cloudflare.com` URL exists in
  `apps/web/index.html`
