# deploy-render Specification

## Purpose

Defines the deployment configuration that allows the application to be
deployed to Render's free tier via a single `render.yaml` Infrastructure
as Code blueprint. The blueprint MUST declare two services: a long-running
web service that runs the Express backend (`node server.js`) and a static
site that serves the React SPA build from `apps/web/dist`. The build
command MUST install dependencies and build the frontend workspace
before starting the web service. Environment variables `SESSION_SECRET`
and `PORT` MUST be configured so the new fail-fast session secret check
succeeds in production.

> **TDD note**: this spec is verified by static analysis of
> `render.yaml`, the repository's `package.json` scripts, and a deploy
> smoke test that boots the production build locally. A unit test parses
> `render.yaml` (with `js-yaml` or similar) and asserts the structural
> requirements below.

## Requirements

### Requirement: render.yaml exists at the repository root

The system MUST include a `render.yaml` at the repository root that
declares the deploy topology. The file MUST be valid YAML and MUST list
exactly two services: a `web` service for the Express backend and a
`static` static site for the React SPA build output.

#### Scenario: render.yaml is valid YAML with two services

- GIVEN the test loads `render.yaml` with a YAML parser
- WHEN the parsed object is inspected
- THEN `services` is an array of length 2 and the entries are
  `{ type: "web", name: "automods-web" }` and
  `{ type: "static", name: "automods-web-static" }` (or equivalent names
  chosen by the change)

#### Scenario: web service runs the Express backend

- GIVEN the `web` service entry
- WHEN the test reads its `startCommand`
- THEN it equals `node server.js`

#### Scenario: static service serves the SPA build

- GIVEN the `static` service entry
- WHEN the test reads its `staticPublishPath`
- THEN it equals `apps/web/dist`

### Requirement: buildCommand runs pnpm install and the frontend build

The system MUST define a `buildCommand` on the web service (or as a
pre-deploy step) that runs `pnpm install` (with frozen lockfile) and
`pnpm --filter web build`. The static site MUST declare the same
`buildCommand` and `publishPath` so it is rebuilt from the same source.

#### Scenario: buildCommand includes pnpm install with the frozen lockfile

- GIVEN the `web` service entry
- WHEN the test reads `buildCommand`
- THEN it matches the regex `pnpm install.*--frozen-lockfile` (or
  contains both `pnpm install` and `pnpm --filter web build`)

#### Scenario: Frontend build runs as part of the deploy

- GIVEN the `buildCommand`
- WHEN the test asserts the presence of `pnpm --filter web build`
- THEN the assertion passes for both services

### Requirement: Environment variables SESSION_SECRET and PORT are declared

The system MUST declare `SESSION_SECRET` as a `sync: false` (secret) env
var on the web service and `PORT` as a Render-provided env var. The web
service MUST start with `node server.js` and bind to the `PORT` env var
(the existing `server.js` already does so).

#### Scenario: SESSION_SECRET is declared as a secret env var

- GIVEN the `web` service entry
- WHEN the test reads its `envVars`
- THEN it contains an entry with `key: "SESSION_SECRET"` and
  `sync: false` (or `generateValue: true`)

#### Scenario: PORT is not hard-coded in startCommand

- GIVEN the `web` service entry
- WHEN the test reads `startCommand`
- THEN it does not contain a literal `--port=` flag; the start command
  is exactly `node server.js`

#### Scenario: Production fail-fast check is honored

- GIVEN the `src/config/session.js` module
- WHEN the test sets `NODE_ENV=production` and unsets `SESSION_SECRET`
  and requires the module
- THEN the module throws and the test process exits with a non-zero code

### Requirement: Render free tier constraints are respected

The system MUST use only resources available on Render's free tier: a
single web service instance (`numInstances: 1` or default), no persistent
disk for the web service, and a static site for the SPA. The blueprint
MUST NOT declare paid-tier features (e.g. persistent disks larger than 1GB,
multiple web instances, dedicated CPU).

#### Scenario: web service has exactly one instance

- GIVEN the `web` service entry
- WHEN the test reads `numInstances`
- THEN it equals `1` (or the key is absent, in which case Render defaults
  to 1 on the free tier)

#### Scenario: No persistent disk is declared on the web service

- GIVEN the `web` service entry
- WHEN the test reads `disk`
- THEN the field is absent or its `sizeGB` is `0` or `1` at most

### Requirement: Deploy documentation is updated

The system MUST update `deploy.md` (or `README.md` if `deploy.md` is
absent) with the new env vars (`SESSION_SECRET`, `PORT`, `VITE_API_URL`),
the SPA build step, and the URL where the SPA will be served in
production.

#### Scenario: deploy.md mentions the new env vars

- GIVEN the test greps `deploy.md` for env var names
- WHEN the matches are collected
- THEN `SESSION_SECRET` and `VITE_API_URL` (or the equivalent SPA build
  arg) appear at least once each

#### Scenario: deploy.md explains the SPA URL

- GIVEN the test greps `deploy.md` for the SPA URL
- WHEN the matches are collected
- THEN the text contains `/app/` and a sentence explaining that the
  static site serves the React SPA at that path
