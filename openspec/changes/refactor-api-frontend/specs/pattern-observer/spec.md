# pattern-observer Specification

## Purpose

Decouples the cascada recalculation of `analisis` rows from the request
flow. Today, every controller method on `modificacionesController` that
mutates a modification manually calls `getByAutoId` followed by
`analisisService.recalcular` (smell C9 and partial-failure risk C4). After
this change, `ModificacionRepository` MUST emit a domain event whenever a
modification is created, updated, or deleted, and an
`AnalisisRecalcObserver` MUST subscribe to that event and trigger the
recalculation. Controllers MUST remain unaware of the recalculation.

> **TDD note**: the event bus is a thin in-process `EventEmitter`. Tests
> cover (a) the repository emits the right event with the right payload,
> (b) the observer subscribes and calls the recalc service exactly once
> per event, and (c) controllers do not import the recalc service.

## Requirements

### Requirement: ModificacionRepository emits domain events on mutation

The system MUST emit the event `ModificacionChanged` from
`ModificacionRepository` on every successful `create`, `update`, and
`delete` call. The event payload MUST include `autoId` and the operation
name (`"create" | "update" | "delete"`).

#### Scenario: create emits ModificacionChanged with autoId

- GIVEN a `ModificacionRepository` instance and an event listener
  registered for `ModificacionChanged`
- WHEN `repository.create({ autoId: 7, ... })` is called and succeeds
- THEN the listener is called once with a payload `{ autoId: 7,
  operation: "create" }`

#### Scenario: update emits with operation "update"

- GIVEN the same setup
- WHEN `repository.update(99, { ...changes })` succeeds
- THEN the listener is called once with `operation: "update"` and the
  payload's `autoId` matches the affected row

#### Scenario: delete emits with operation "delete"

- GIVEN the same setup
- WHEN `repository.delete(99)` succeeds
- THEN the listener is called once with `operation: "delete"` and the
  payload's `autoId` matches the parent auto of the deleted modification

#### Scenario: failed mutation does not emit

- GIVEN a `ModificacionRepository` instance and a listener
- WHEN `repository.create(...)` throws (e.g. unique constraint violation)
- THEN the listener is not called

### Requirement: AnalisisRecalcObserver subscribes and triggers recalculation

The system MUST export an `AnalisisRecalcObserver` that, when attached to
the event bus, calls `AnalisisService.recalcular(autoId)` exactly once per
`ModificacionChanged` event. The observer MUST NOT swallow errors silently
and MUST rethrow to allow logging.

#### Scenario: Observer calls recalcular with the event's autoId

- GIVEN an observer wired to the bus and a stub `AnalisisService` whose
  `recalcular` records its calls
- WHEN the bus emits `ModificacionChanged` with `{ autoId: 7 }`
- THEN the stub is called once with `7` and no other arguments

#### Scenario: Observer handles an event with operation delete

- GIVEN the same setup
- WHEN the bus emits `ModificacionChanged` with `{ autoId: 3, operation:
  "delete" }`
- THEN `AnalisisService.recalcular(3)` is invoked

#### Scenario: Observer rethrows errors from the service

- GIVEN a stub `AnalisisService` that throws on `recalcular`
- WHEN the bus emits the event
- THEN the error propagates to the emitter and is not caught inside the
  observer

### Requirement: Controllers do not call AnalisisService.recalcular directly

The system MUST guarantee that no file under `src/controllers/` imports
`AnalisisService` or any equivalent recalc entry point. After the refactor,
the controller handler is the only place that calls a use case, and the
use case emits the event through the repository.

#### Scenario: Grep across controllers finds no recalc import

- GIVEN the test runs `rg "recalcular|AnalisisService" src/controllers`
- WHEN the matches are collected
- THEN the result set is empty

#### Scenario: Modificaciones controller handler stays thin

- GIVEN `src/controllers/modificacionesController.js`
- WHEN the test counts non-comment, non-blank lines of each handler
- THEN each handler is at most 15 lines and contains exactly one call to
  a use case (besides the response)

### Requirement: Observer wiring is the composition root's responsibility

The system MUST register the `AnalisisRecalcObserver` in
`src/container.js` so that test harnesses can opt out by constructing the
container with a no-op bus or by skipping the listener registration. The
container MUST expose the event bus as `container.bus` for inspection in
tests.

#### Scenario: Container exposes the event bus

- GIVEN `src/container.js` is required
- WHEN the test reads `container.bus`
- THEN it is an object with `on`, `off`, and `emit` methods compatible
  with Node's `EventEmitter`

#### Scenario: Container registers the observer by default

- GIVEN a fresh container instance
- WHEN the test emits a synthetic `ModificacionChanged` event on
  `container.bus`
- THEN a spy on `AnalisisService.recalcular` is called within the same
  tick (microtask boundary at the latest)

#### Scenario: Test harness can build a container without the observer

- GIVEN `buildContainer({ withRecalcObserver: false })` exported by the
  container module
- WHEN the test emits the same synthetic event
- THEN the spy on `recalcular` is NOT called
