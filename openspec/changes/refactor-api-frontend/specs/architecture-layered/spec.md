# architecture-layered Specification

## Purpose

Defines the strict layered architecture of `src/` after the refactor: HTTP
request flows in one direction only, from `routes` through `middlewares` and
`controllers` (thin HTTP adapters) into `use-cases` (SRP, application logic),
which depend on `repositories` (DIP, abstract interfaces) bound to concrete
sql.js implementations by a single composition root at `src/container.js`.
The goal is to break the current DIP violation where every layer imports the
module-level `db.js` handle and concrete models directly, and to make each
layer independently testable.

> **TDD note**: every requirement here is enforced by `node:test` unit tests
> that import the layer under test with a hand-rolled fake repository/use
> case. Use `tests/helpers/inMemoryDb.js` for repository tests and
> constructor-injected fakes for use-case / controller tests.

## Requirements

### Requirement: Layered dependency direction is enforced

The system MUST prevent inward-pointing imports: `routes` may import
`controllers` and `middlewares`; `controllers` may import `use-cases`; and
`use-cases` may import `repositories`. `repositories` MUST NOT import
`use-cases`, `controllers`, or `routes`. `models/db.js` MUST only be imported
by `repositories` and by `src/container.js`.

#### Scenario: Use case imports a repository interface

- GIVEN a use case module under `src/use-cases/`
- WHEN the test inspects its `require()` graph
- THEN every import under `src/repositories/` resolves to the interface
  module (e.g. `IAutoRepository.js`) and not to the concrete sql.js class

#### Scenario: Controller does not require a model directly

- GIVEN a controller module under `src/controllers/`
- WHEN the test runs `grep -RE "require\\('\\.\\./models" src/controllers`
- THEN the command exits with no matches

#### Scenario: Repository never requires a use case

- GIVEN a repository module under `src/repositories/`
- WHEN the test walks the dependency graph
- THEN the repository has zero edges into `src/use-cases/` or
  `src/controllers/`

### Requirement: Controllers depend on use cases via dependency injection

The system MUST construct controllers in `src/container.js` by passing use
case instances as constructor parameters. Controllers MUST NOT
`require('./use-cases/...')` directly nor call `new` on a use case inside a
request handler.

#### Scenario: Controller is instantiated with a use case

- GIVEN `src/container.js` wires `autosController` with `crearAuto` use case
- WHEN a test resolves `container.controllers.autosController`
- THEN `autosController.crearAuto` is a function and the controller does
  not call `require('../use-cases/crearAuto')` at module load time

#### Scenario: Swapping the use case for a stub works in tests

- GIVEN a test passes a stub use case into the controller constructor
- WHEN the test invokes the controller's `create` handler
- THEN the stub is called with the parsed body and the controller does
  not touch the real database

### Requirement: Repositories are interface-driven

The system MUST define each repository as a pair of files: an
`IXxxRepository.js` interface that exports the method names and signatures,
and an `XxxRepository.js` concrete class that implements the interface and
accepts a `Database` handle in its constructor. The container MUST bind
the interface to the concrete class.

#### Scenario: Interface module exports only method names

- GIVEN `src/repositories/IAutoRepository.js`
- WHEN the test imports it
- THEN it exports the names `findById`, `findAllByUsuario`, `create`,
  `update`, `delete`, and `existsPlacaForUsuario` as no-op stubs or
  symbols, and contains no sql.js or `db` import

#### Scenario: Concrete class implements every interface method

- GIVEN `src/repositories/AutoRepository.js`
- WHEN the test asserts `instanceof` against the interface contract
- THEN every method declared on the interface is defined on the concrete
  class with the same signature

#### Scenario: Concrete class is constructed with a Database handle

- GIVEN a fresh `new SQL.Database()` from `tests/helpers/inMemoryDb.js`
- WHEN the test calls `new AutoRepository(db)`
- THEN the instance exposes the same DTO shape returned today by
  `autoModel.getAllByUsuario` (regression test for EJS view contract)

### Requirement: Composition root is the only module that wires layers

The system MUST expose a single `src/container.js` module that builds the
sql.js `Database`, instantiates every repository, registers domain-event
listeners, and returns the wired controllers and use cases. `src/app.js`
and test harnesses MUST import only the container, not repositories
directly.

#### Scenario: Container exposes typed factories

- GIVEN `src/container.js` is required
- WHEN the test reads `container.repositories.auto`,
  `container.useCases.crearAuto`, and `container.controllers.autosController`
- THEN each value is a function or class instance and is shared across the
  three handles (same object identity)

#### Scenario: App boots through the container

- GIVEN a test calls `buildApp()` exported by `src/container.js`
- WHEN the test makes a `supertest` request to `GET /autos` without a
  session
- THEN the response is a 302 redirect to `/login` (existing behavior
  preserved)

### Requirement: Use cases encapsulate application rules

The system MUST place authorization checks, ownership verification, and
domain orchestration inside `src/use-cases/`. Controllers MUST delegate
the full request to a use case and MUST NOT perform DB queries, policy
checks, or cross-entity orchestration directly.

#### Scenario: Use case calls a policy and a repository

- GIVEN `src/use-cases/eliminarAuto.js` accepts a user and an auto id
- WHEN the test invokes it with the owner user
- THEN the use case calls `autoPolicy.canDelete(user, auto)` and
  `autoRepository.delete(id)` and returns a result DTO

#### Scenario: Controller contains no policy or DB code

- GIVEN a controller handler
- WHEN the test parses its source with `node:test` and an AST inspection
- THEN the handler body contains no `require` of `src/policies/`,
  `src/repositories/`, or `src/models/db` calls
