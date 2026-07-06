# Specs Index — `refactor-api-frontend`

Delta specs for the `refactor-api-frontend` change. All seven specs are
written as **new capability specs** (no prior `openspec/specs/{capability}/spec.md`
exists in the repository) and follow the `## Purpose` + `## Requirements`
format with `### Requirement:` blocks and `#### Scenario:` sub-blocks in
Given/When/Then. They will be promoted to `openspec/specs/<capability>/spec.md`
during the `sdd-archive` step.

Each spec carries a closing **TDD note** explaining how every requirement
is exercised by `node:test` (backend) or `vitest` + `@testing-library/react`
(frontend), per the strict TDD rule in `openspec/config.yaml`
(`rules.apply.tdd: true`).

## Specs

| # | Capability | File | Summary |
|---|------------|------|---------|
| 1 | `architecture-layered` | [spec.md](./architecture-layered/spec.md) | Layered `src/` (controllers → use-cases → repositories → DB) with constructor-injected repos and a single composition root at `src/container.js`. |
| 2 | `pattern-strategy` | [spec.md](./pattern-strategy/spec.md) | `IndicadorClassifier` strategy registry with `Deficiente`, `Regular`, `Excelente` (and `SinDatos`); thresholds loaded from config, not magic numbers. |
| 3 | `pattern-factory` | [spec.md](./pattern-factory/spec.md) | `ImpactValueFactory` is the single source of truth for `VALOR_IMPACTO` (`bajo`→1, `medio`→2, `alto`→3) and throws on unknown values. |
| 4 | `pattern-observer` | [spec.md](./pattern-observer/spec.md) | `ModificacionRepository` emits `ModificacionChanged`; `AnalisisRecalcObserver` subscribes; controllers stay thin. |
| 5 | `api-v1-json` | [spec.md](./api-v1-json/spec.md) | Full JSON API at `/api/v1` (auth, catalogos, autos, modificaciones, analisis) with Zod validation and the `{ error: { code, message, details? } }` envelope. |
| 6 | `frontend-react-spa` | [spec.md](./frontend-react-spa/spec.md) | Vite + React 18 + TanStack Query v5 SPA at `apps/web/`, build output to `apps/web/dist`, dev proxy to the Express backend. |
| 7 | `deploy-render` | [spec.md](./deploy-render/spec.md) | `render.yaml` blueprint with two services (web + static), `pnpm --filter web build`, env vars `SESSION_SECRET` and `PORT`, `startCommand: node server.js`. |

## Conventions Applied

- **Given/When/Then** for every scenario (no exceptions).
- **RFC 2119** keywords (MUST, SHALL, SHOULD, MAY) on every requirement.
- **No implementation details** in requirements — specs describe WHAT
  (testable behavior), not HOW (concrete module paths are mentioned only
  as test anchors).
- **Out of scope** per the proposal: no JWT, no removal of EJS views, no
  new business rules beyond what `explore.md` and `proposal.md` already
  authorize.
- **TDD note** at the top or bottom of every spec explains how each
  requirement maps to `node:test` (backend) or `vitest` (frontend).

## Cross-References

- Proposal: `../proposal.md`
- Exploration: `../explore.md`
- Source capabilities described in `explore.md` §6 (Repository, Strategy,
  Factory, Observer, Policy) and §7 (API endpoint list).

## Next Step

Ready for `sdd-design`. The design phase will turn these requirements
into a concrete technical design (sequence diagrams, file layout, DTO
shapes, event payload contracts) without re-litigating the WHAT defined
here.
