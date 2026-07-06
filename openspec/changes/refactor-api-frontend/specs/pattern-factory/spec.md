# pattern-factory Specification

## Purpose

Centralizes the `VALOR_IMPACTO` business constant (currently duplicated
between `src/services/analisisService.js:6-10` and the inline map at
`src/views/autos/analisis.ejs:131`) behind a single Factory module with
named methods. The factory MUST return the numeric value associated with
each impact level (`bajo` → 1, `medio` → 2, `alto` → 3) and MUST throw a
descriptive error for any unknown level so callers cannot silently fall
back to a wrong number.

> **TDD note**: the factory is a pure module; every branch (valid levels,
> case sensitivity, unknown level) is covered by `node:test` unit tests in
> `tests/indicators/impactoValues.test.js`.

## Requirements

### Requirement: ImpactValueFactory exposes named methods

The system MUST export `valorImpacto(nivel)` from
`src/services/indicators/impactoValues.js` (or an equivalent factory
module). The function MUST accept the string names `"bajo"`, `"medio"`, and
`"alto"` and return the integer values `1`, `2`, and `3` respectively.

#### Scenario: bajo maps to 1

- GIVEN a call to `valorImpacto("bajo")`
- WHEN the function returns
- THEN the value is the integer `1`

#### Scenario: medio maps to 2

- GIVEN a call to `valorImpacto("medio")`
- WHEN the function returns
- THEN the value is the integer `2`

#### Scenario: alto maps to 3

- GIVEN a call to `valorImpacto("alto")`
- WHEN the function returns
- THEN the value is the integer `3`

### Requirement: The factory throws on unknown values

The system MUST throw a `Error` (or a typed subclass) with a message that
includes the rejected input when the level is not one of the three known
values. The factory MUST NOT return `undefined`, `null`, or `0` silently.

#### Scenario: Unknown level throws

- GIVEN a call to `valorImpacto("critico")`
- WHEN the function executes
- THEN it throws and the error message includes the string `"critico"`

#### Scenario: Empty string throws

- GIVEN a call to `valorImpacto("")`
- WHEN the function executes
- THEN it throws and does not coerce the input to a known level

#### Scenario: Null and undefined throw

- GIVEN calls to `valorImpacto(null)` and `valorImpacto(undefined)`
- WHEN the functions execute
- THEN both throw

### Requirement: The factory is the single source of truth

The system MUST remove the inline `VALOR_IMPACTO` map from
`src/services/analisisService.js` and the duplicate map from
`src/views/autos/analisis.ejs`. Every consumer (services, EJS view, DTOs)
MUST import from the factory module. A grep test MUST confirm there is
exactly one definition of the impact map in the repository.

#### Scenario: Service imports from the factory

- GIVEN `src/services/analisisService.js`
- WHEN the test greps for the literal object `{ Bajo: 1, ... }` or
  similar inline maps
- THEN no match is found in the service file

#### Scenario: EJS view delegates to the factory at render time

- GIVEN `src/views/autos/analisis.ejs`
- WHEN the test greps for the inline `valorImpacto` map
- THEN no match is found; the view consumes a pre-aggregated value
  produced by the analysis service

#### Scenario: Single definition in the codebase

- GIVEN the test runs `rg "VALOR_IMPACTO|impactoValues"` across `src/`
- WHEN the matches are collected
- THEN the canonical definition appears exactly once and all other matches
  are imports

### Requirement: Factory output is type-stable and JSON-serializable

The system MUST guarantee that the value returned by `valorImpacto` is a
finite integer in the closed set `{1, 2, 3}`. This enables direct inclusion
in JSON responses and chart datasets without coercion.

#### Scenario: Returned value is a finite integer

- GIVEN any of the three known levels
- WHEN the factory returns
- THEN `Number.isInteger(result) === true` and `result >= 1 && result <= 3`

#### Scenario: Returned value serializes identically via JSON

- GIVEN `valorImpacto("medio")`
- WHEN `JSON.stringify(2)` is compared to `JSON.stringify(result)`
- THEN both strings are equal to `"2"`
