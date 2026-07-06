'use strict';

/**
 * Typed error thrown by ImpactValueFactory for any input the factory does
 * not recognize. Inherits from Error so existing `try/catch (err)` code
 * keeps working; the `name` is set to `DomainError` so structured logging
 * and error envelopes can branch on the type without depending on
 * `instanceof` across module boundaries.
 */
class DomainError extends Error {
  constructor(message) {
    super(message);
    this.name = 'DomainError';
  }
}

/**
 * ImpactValueFactory — single source of truth for the `VALOR_IMPACTO`
 * business constant. Replaces the duplicated maps that previously lived
 * in `src/services/analisisService.js` (lines 6–10) and the inline
 * `valorImpacto` map in `src/views/autos/analisis.ejs` (around line 137).
 *
 * The factory is a pure module: no I/O, no state, no DB. Every public
 * method is a pure function of its input, which is what makes the
 * TDD-style unit tests in `tests/indicators/impactValueFactory.test.js`
 * trivially fast.
 *
 * ## Canonical labels
 *
 * The canonical string form is the **capitalized** Spanish label —
 * `"Bajo"`, `"Medio"`, `"Alto"` — because that is the form stored in
 * the `modificaciones.nivel_impacto` column and the form emitted by
 * the existing EJS radio inputs (`src/views/modificaciones/create.ejs`).
 * `fromLabel()` is case-insensitive on the way in so callers that pass
 * `"bajo"`, `"Bajo"`, or `"BAJO"` all succeed; `toLabel()` always
 * returns the canonical capitalized form so JSON output is stable.
 *
 * ## Numbers
 *
 * `1 | 2 | 3` map to the three levels. The factory never returns 0, NaN,
 * or `undefined`: unknown values throw `DomainError`.
 */
const ImpactValueFactory = {
  /**
   * Convert a string label to its numeric impact value.
   * @param {string} label one of `bajo|medio|alto` (case-insensitive)
   * @returns {1|2|3} the numeric impact
   * @throws {DomainError} if `label` is not a known level
   */
  fromLabel(label) {
    if (typeof label !== 'string' || label.length === 0) {
      throw new DomainError(
        `ImpactValueFactory.fromLabel() requires a non-empty string; received: ${JSON.stringify(label)}`
      );
    }
    const key = label.toLowerCase();
    switch (key) {
      case 'bajo':  return 1;
      case 'medio': return 2;
      case 'alto':  return 3;
      default:
        throw new DomainError(
          `ImpactValueFactory.fromLabel() unknown level: "${label}" (expected "bajo", "medio", or "alto")`
        );
    }
  },

  /**
   * Convert a numeric impact value to its canonical capitalized label.
   * @param {number} n one of `1|2|3`
   * @returns {"Bajo"|"Medio"|"Alto"} the canonical label
   * @throws {DomainError} if `n` is not in the closed set {1, 2, 3}
   */
  toLabel(n) {
    if (!Number.isInteger(n)) {
      throw new DomainError(
        `ImpactValueFactory.toLabel() requires an integer; received: ${JSON.stringify(n)}`
      );
    }
    switch (n) {
      case 1: return 'Bajo';
      case 2: return 'Medio';
      case 3: return 'Alto';
      default:
        throw new DomainError(
          `ImpactValueFactory.toLabel() unknown value: ${n} (expected 1, 2, or 3)`
        );
    }
  },

  /**
   * Predicate — does this label map to a known level?
   * @param {*} label
   * @returns {boolean}
   */
  isValidLabel(label) {
    if (typeof label !== 'string' || label.length === 0) return false;
    const key = label.toLowerCase();
    return key === 'bajo' || key === 'medio' || key === 'alto';
  },

  /**
   * Predicate — is this number a member of the closed set {1, 2, 3}?
   * @param {*} n
   * @returns {boolean}
   */
  isValidNumber(n) {
    return Number.isInteger(n) && n >= 1 && n <= 3;
  }
};

// Attach the typed error class to the factory and freeze the bundle so
// callers cannot mutate it at runtime.
ImpactValueFactory.DomainError = DomainError;

module.exports = Object.freeze(ImpactValueFactory);
