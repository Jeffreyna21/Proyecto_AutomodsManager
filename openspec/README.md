# OpenSpec — proyecto_automodsmanager

SDD (Spec-Driven Development) artifacts for the **AutoMods Manager** project.

This directory is the source of truth for spec-driven changes. It is generated and
maintained by the `sdd-*` skills; do not hand-edit files inside `changes/` except
through the corresponding phase.

## Layout

```
openspec/
├── config.yaml              # Project SDD config, stack, testing, phase rules
├── README.md                # This file
├── specs/                   # Source of truth (main specs by domain) — empty at init
└── changes/                 # Active change folders — empty at init
    └── archive/             # Completed changes (YYYY-MM-DD-{change-name}/)
```

Each active change folder follows the layout defined in
`openspec-convention.md` (see `_shared` skills):

```
openspec/changes/{change-name}/
├── state.yaml               # DAG state (survives compaction)
├── exploration.md           # (optional) from sdd-explore
├── proposal.md              # from sdd-propose
├── specs/{domain}/spec.md   # from sdd-spec (delta spec)
├── design.md                # from sdd-design
├── tasks.md                 # from sdd-tasks (updated by sdd-apply)
└── verify-report.md         # from sdd-verify
```

## Workflow

1. `/sdd-explore {change-name}` — explore an idea before committing to a change.
2. `/sdd-new {change-name}` — start a new change (proposal → spec → design → tasks).
3. `/sdd-apply {change-name}` — implement tasks from the plan (RED-GREEN-REFACTOR).
4. `/sdd-verify {change-name}` — run verification against the spec and design.
5. `/sdd-archive {change-name}` — archive a completed change into `changes/archive/`.

## Project Snapshot

- **Stack**: Node.js 18+, Express 5, EJS, SQLite via sql.js, bcryptjs sessions, Chart.js (CDN).
- **Architecture**: MVC — `src/{controllers,models,services,middlewares,routes,views,config}`.
- **Tests**: `node:test` runner, `node --test tests/*.test.js`, strict TDD.
- **Package manager**: pnpm@10.18.1 (monorepo intent via `pnpm-workspace.yaml`).

See `config.yaml` for the full stack, testing capabilities, and per-phase rules.
