# api-v1-json Specification

## Purpose

Defines the versioned JSON API mounted at `/api/v1` that powers both the
new React SPA at `apps/web/` and the existing EJS views' AJAX calls
(currently the single endpoint at `src/routes/apiRoutes.js:14`). The API
MUST expose auth, catalogs, autos, modificaciones, and analisis endpoints;
MUST validate request bodies with Zod; MUST return a consistent error
envelope `{ error: { code, message, details? } }`; MUST use the existing
`express-session` cookie for per-user authorization (no JWT in this
change); and MUST emit the documented HTTP status codes.

> **TDD note**: API tests run against an `express` app instance returned by
> the composition root, using `supertest`. Each endpoint has a happy-path
> test and at least one error-path test. Validation is exercised with both
> valid and invalid payloads.

## Requirements

### Requirement: Auth endpoints under /api/v1/auth

The system MUST expose `POST /api/v1/auth/login`, `POST /api/v1/auth/logout`,
and `GET /api/v1/auth/me`. The login endpoint MUST accept a JSON body
validated by Zod and MUST return `200` with a `user` DTO on success or
`401` with the standard error envelope on failure. The session cookie is
the same `express-session` cookie used by the EJS app.

#### Scenario: Successful login returns 200 with user DTO

- GIVEN a registered user `{ username: "ana", password: "secret123" }`
- WHEN a POST to `/api/v1/auth/login` with that body is made
- THEN the response is `200`, sets the session cookie, and the body is
  `{ user: { id, username } }`

#### Scenario: Wrong password returns 401 with envelope

- GIVEN the same registered user
- WHEN a POST with the correct username and a wrong password is made
- THEN the response is `401` and the body matches
  `{ error: { code: "UNAUTHORIZED", message: <string> } }`

#### Scenario: me without session returns 401

- GIVEN no active session
- WHEN `GET /api/v1/auth/me` is called
- THEN the response is `401` and the body matches the error envelope

#### Scenario: me with session returns 200

- GIVEN an authenticated session
- WHEN `GET /api/v1/auth/me` is called
- THEN the response is `200` with the user DTO

### Requirement: Catalog endpoints are read-only and unauthenticated

The system MUST expose `GET /api/v1/marcas`, `GET /api/v1/marcas/:id/modelos`,
and `GET /api/v1/tipos-modificacion`. These endpoints MUST NOT require a
session and MUST return JSON arrays of `{ id, nombre }` DTOs (and
`{ id, nombre, id_marca }` for modelos). A missing `marca` MUST return
`404` with the error envelope.

#### Scenario: GET marcas returns all brands

- GIVEN the seeded catalog with 7 brands
- WHEN `GET /api/v1/marcas` is called
- THEN the response is `200` and the body is an array of length 7 with
  `{ id, nombre }` shape

#### Scenario: GET modelos by marca filters correctly

- GIVEN brand id 1 has 5 models in the seed
- WHEN `GET /api/v1/marcas/1/modelos` is called
- THEN the response is `200` and the body has 5 items each carrying
  `id_marca: 1`

#### Scenario: Unknown marca id returns 404

- GIVEN no brand with id 9999
- WHEN `GET /api/v1/marcas/9999/modelos` is called
- THEN the response is `404` with
  `{ error: { code: "NOT_FOUND", message: <string> } }`

### Requirement: Autos CRUD under /api/v1/autos

The system MUST expose `GET /api/v1/autos` (paginated, user-scoped),
`GET /api/v1/autos/:id`, `POST /api/v1/autos`, `PUT /api/v1/autos/:id`, and
`DELETE /api/v1/autos/:id`. The list endpoint MUST be paginated and
MUST only return autos owned by the calling user. All endpoints MUST
require an authenticated session; unauthenticated requests return `401`.

#### Scenario: List returns paginated user-scoped items

- GIVEN a user that owns 3 autos and another user that owns 1 auto
- WHEN `GET /api/v1/autos?page=1` is made as the first user
- THEN the response is `200` with `{ items: <3 items>, page: 1, totalPages: 1 }`
  and none of the items belong to the other user

#### Scenario: Create returns 201 with the new auto DTO

- GIVEN a valid body `{ placa, idMarca, idModelo, anio, color }` and an
  authenticated user
- WHEN `POST /api/v1/autos` is called
- THEN the response is `201` with the created auto including its
  server-assigned `id`

#### Scenario: Duplicate placa returns 409

- GIVEN a user that already has an auto with placa `ABC-123`
- WHEN `POST /api/v1/autos` is called with the same `placa`
- THEN the response is `409` and the body matches
  `{ error: { code: "CONFLICT", message: <string> } }`

#### Scenario: Update returns 200 with updated DTO

- GIVEN an auto owned by the calling user
- WHEN `PUT /api/v1/autos/:id` is called with a valid body
- THEN the response is `200` and the body reflects the new field values

#### Scenario: Delete returns 204

- GIVEN an auto owned by the calling user
- WHEN `DELETE /api/v1/autos/:id` is called
- THEN the response is `204` with an empty body

### Requirement: Modificaciones CRUD under /api/v1

The system MUST expose nested read/create
(`GET/POST /api/v1/autos/:autoId/modificaciones`) and top-level update/delete
(`PUT/DELETE /api/v1/modificaciones/:id`) endpoints. All endpoints MUST
require the calling user to own the parent auto (enforced by
`autoPolicy`); unauthorized access returns `404` (existence-leak safe).

#### Scenario: Create modification emits cascada event

- GIVEN an owned auto
- WHEN `POST /api/v1/autos/:autoId/modificaciones` is called with a
  valid body
- THEN the response is `201` and the `analisis` row for the auto is
  recalculated (verified via `GET /api/v1/autos/:autoId/analisis`)

#### Scenario: Updating another user's modification returns 404

- GIVEN a modification owned by user A
- WHEN user B calls `PUT /api/v1/modificaciones/:id`
- THEN the response is `404` (not `403`) and the error envelope has
  `code: "NOT_FOUND"`

#### Scenario: Delete returns 204

- GIVEN a modification owned by the calling user
- WHEN `DELETE /api/v1/modificaciones/:id` is called
- THEN the response is `204` and the parent `analisis` row is
  recalculated

### Requirement: Analisis read-only endpoint

The system MUST expose `GET /api/v1/autos/:id/analisis` that returns the
analysis DTO plus pre-aggregated chart data: `metricas` (totals, average,
indicator), `seriesEvolucion` (impact over time), and
`distribucionPorTipo` (counts per modification type). The endpoint MUST
require the calling user to own the auto.

#### Scenario: Analisis endpoint returns pre-aggregated payload

- GIVEN an owned auto with 4 modifications
- WHEN `GET /api/v1/autos/:id/analisis` is called
- THEN the response is `200` and the body contains `metricas`,
  `seriesEvolucion`, and `distribucionPorTipo` keys with the documented
  shape; no client-side aggregation is required

#### Scenario: Analisis for another user's auto returns 404

- GIVEN an auto owned by user A
- WHEN user B calls `GET /api/v1/autos/:id/analisis`
- THEN the response is `404` with the error envelope

### Requirement: Zod validation on every mutating endpoint

The system MUST validate request bodies and query params on every
`/api/v1` endpoint that accepts input (POST/PUT bodies, query params on
GET) using a Zod schema. A validation failure MUST return `400` with the
error envelope, `code: "VALIDATION_ERROR"`, and a `details` array that
lists each failing path and message.

#### Scenario: Invalid body returns 400 with details

- GIVEN a POST to `/api/v1/autos` with `anio: "not-a-number"`
- WHEN the request is made
- THEN the response is `400` and the body matches
  `{ error: { code: "VALIDATION_ERROR", message: <string>,
  details: [{ path: "anio", message: <string> }] } }`

#### Scenario: Valid body passes validation

- GIVEN a POST to `/api/v1/autos` with a fully valid body
- WHEN the request is made
- THEN no validation error is produced and the handler proceeds

### Requirement: Consistent error envelope across all endpoints

The system MUST return every error response in the shape
`{ error: { code, message, details? } }`. The `code` MUST be one of
`VALIDATION_ERROR`, `NOT_FOUND`, `CONFLICT`, `UNAUTHORIZED`, or
`INTERNAL`. The HTTP status MUST match the code: 400, 404, 409, 401,
500 respectively. A central error middleware MUST format unhandled
exceptions as `INTERNAL` with status 500 and MUST NOT leak stack traces
to the response body.

#### Scenario: Unhandled exception returns 500 envelope

- GIVEN a route handler that throws
- WHEN a supertest request reaches that route
- THEN the response is `500` and the body matches
  `{ error: { code: "INTERNAL", message: <safe string> } }` with no
  `stack` field

#### Scenario: Error middleware never returns HTML

- GIVEN any failure path (validation, not found, conflict, unauth,
  internal)
- WHEN the response is inspected
- THEN the `Content-Type` is `application/json` and the body parses as
  JSON without errors
