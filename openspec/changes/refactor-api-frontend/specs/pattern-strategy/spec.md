# pattern-strategy Specification

## Purpose

Replaces the hard-coded `if/else` chain in
`src/services/analisisService.js` (lines 47-54) that classifies the
modification indicator into `Deficiente`, `Regular`, or `Excelente` based on
a numeric average. A `IndicadorClassifier` orchestrator MUST dispatch to
one of at least three strategy classes, where each strategy owns its own
threshold and label. Thresholds MUST come from a configuration object so a
teacher can adjust them without code edits, and adding a fourth tier MUST
require only registering a new strategy class.

> **TDD note**: every strategy boundary (1.4999, 1.5, 2.4999, 2.5, etc.) MUST
> be covered by a `node:test` unit test against
> `src/services/indicators/IndicadorClassifier.js`. The orchestrator is
> testable without a database.

## Requirements

### Requirement: At least three classification strategies exist

The system MUST export at least the strategies `DeficienteStrategy`,
`RegularStrategy`, and `ExcelenteStrategy` from
`src/services/indicators/`. Each strategy MUST expose a method that returns
the indicator label for a given `promedioMejora` number and a
`cumple(metricas)` predicate.

#### Scenario: DeficienteStrategy returns "Deficiente" below the lower threshold

- GIVEN a `promedioMejora` of `1.2` and the default thresholds
- WHEN `DeficienteStrategy.cumple(metricas)` is called
- THEN it returns `true` and the strategy's `nombre` is `"Deficiente"`

#### Scenario: RegularStrategy covers the middle band

- GIVEN a `promedioMejora` of `2.0`
- WHEN `IndicadorClassifier.classify(metricas)` is invoked
- THEN the returned label is `"Regular"` and the chosen strategy is
  `RegularStrategy`

#### Scenario: ExcelenteStrategy matches the upper band

- GIVEN a `promedioMejora` of `2.8`
- WHEN the classifier is invoked
- THEN the returned label is `"Excelente"`

### Requirement: A single orchestrator selects the right strategy

The system MUST expose a `IndicadorClassifier` (or equivalent) that holds a
list of strategies in priority order, iterates them, and returns the label
of the first strategy whose `cumple()` returns `true`. If no strategy
matches, the classifier MUST return a `SinDatos` indicator.

#### Scenario: First matching strategy wins

- GIVEN the default strategies registered in priority order
  (Deficiente → Regular → Excelente)
- WHEN `IndicadorClassifier.classify({ promedioMejora: 1.2 })` is called
- THEN the orchestrator returns `"Deficiente"` without consulting
  `RegularStrategy` or `ExcelenteStrategy`

#### Scenario: Empty data falls through to SinDatos

- GIVEN `metricas` with `totalModificaciones === 0`
- WHEN the classifier is invoked
- THEN it returns the `SinDatos` label and the result has a stable shape

#### Scenario: Orchestrator is iterable and extensible

- GIVEN a new `PremiumStrategy` registered after the existing three
- WHEN the test re-registers the strategy list
- THEN the classifier returns `"Premium"` for values in its band without
  any edits to the existing strategies

### Requirement: Thresholds come from configuration, not magic numbers

The system MUST load thresholds from a config module (e.g.
`src/services/indicators/config.js`) and the strategies MUST consume that
config. Strategy source files MUST NOT contain literal threshold numbers
such as `1.5` or `2.5`.

#### Scenario: Changing the config changes the boundary

- GIVEN a config with `regular.min = 1.0` and `excelente.min = 3.0`
- WHEN the test calls the classifier with `promedioMejora = 1.2`
- THEN the result is `"Regular"` (proving the threshold came from config)

#### Scenario: No magic numbers in strategy source

- GIVEN the source of `DeficienteStrategy`, `RegularStrategy`, and
  `ExcelenteStrategy`
- WHEN the test greps for the literal numbers `1.5` and `2.5`
- THEN the matches, if any, are only in JSDoc comments and not in
  executable code

### Requirement: Adding a fourth tier requires no edits to existing strategies

The system MUST allow registering a new strategy class without modifying
any existing strategy file. Registration happens in the composition root or
in a dedicated `strategies/index.js` module.

#### Scenario: Registering a new strategy at runtime

- GIVEN a test that imports the strategy registry
- WHEN it calls `registry.register(new PremiumStrategy())` and re-runs
  classification
- THEN the new strategy is selected for its band and the existing
  strategies are untouched
