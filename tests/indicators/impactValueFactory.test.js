const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const ImpactValueFactory = require('../../src/domain/factories/ImpactValueFactory');

describe('ImpactValueFactory — single source of truth for VALOR_IMPACTO', () => {
  describe('fromLabel()', () => {
    it('returns 1 for "bajo"', () => {
      assert.equal(ImpactValueFactory.fromLabel('bajo'), 1);
    });

    it('returns 2 for "medio"', () => {
      assert.equal(ImpactValueFactory.fromLabel('medio'), 2);
    });

    it('returns 3 for "alto"', () => {
      assert.equal(ImpactValueFactory.fromLabel('alto'), 3);
    });

    it('is case-insensitive: "Bajo" → 1', () => {
      assert.equal(ImpactValueFactory.fromLabel('Bajo'), 1);
    });

    it('is case-insensitive: "ALTO" → 3', () => {
      assert.equal(ImpactValueFactory.fromLabel('ALTO'), 3);
    });
  });

  describe('toLabel()', () => {
    it('returns "Bajo" for 1 (canonical capitalized form)', () => {
      assert.equal(ImpactValueFactory.toLabel(1), 'Bajo');
    });

    it('returns "Medio" for 2', () => {
      assert.equal(ImpactValueFactory.toLabel(2), 'Medio');
    });

    it('returns "Alto" for 3', () => {
      assert.equal(ImpactValueFactory.toLabel(3), 'Alto');
    });
  });

  describe('isValidLabel()', () => {
    it('returns true for "bajo"', () => {
      assert.equal(ImpactValueFactory.isValidLabel('bajo'), true);
    });

    it('returns true for "Bajo" (case-insensitive)', () => {
      assert.equal(ImpactValueFactory.isValidLabel('Bajo'), true);
    });

    it('returns false for unknown level', () => {
      assert.equal(ImpactValueFactory.isValidLabel('critico'), false);
    });

    it('returns false for empty string', () => {
      assert.equal(ImpactValueFactory.isValidLabel(''), false);
    });

    it('returns false for null/undefined', () => {
      assert.equal(ImpactValueFactory.isValidLabel(null), false);
      assert.equal(ImpactValueFactory.isValidLabel(undefined), false);
    });
  });

  describe('isValidNumber()', () => {
    it('returns true for 1, 2, 3', () => {
      assert.equal(ImpactValueFactory.isValidNumber(1), true);
      assert.equal(ImpactValueFactory.isValidNumber(2), true);
      assert.equal(ImpactValueFactory.isValidNumber(3), true);
    });

    it('returns false for numbers outside {1,2,3}', () => {
      assert.equal(ImpactValueFactory.isValidNumber(0), false);
      assert.equal(ImpactValueFactory.isValidNumber(4), false);
      assert.equal(ImpactValueFactory.isValidNumber(-1), false);
    });

    it('returns false for non-integer numbers', () => {
      assert.equal(ImpactValueFactory.isValidNumber(1.5), false);
      assert.equal(ImpactValueFactory.isValidNumber(NaN), false);
    });
  });

  describe('error handling', () => {
    it('throws on unknown level in fromLabel()', () => {
      assert.throws(
        () => ImpactValueFactory.fromLabel('critico'),
        (err) => err.message.includes('critico')
      );
    });

    it('throws on empty string in fromLabel()', () => {
      assert.throws(() => ImpactValueFactory.fromLabel(''));
    });

    it('throws on null/undefined in fromLabel()', () => {
      assert.throws(() => ImpactValueFactory.fromLabel(null));
      assert.throws(() => ImpactValueFactory.fromLabel(undefined));
    });

    it('throws on unknown number in toLabel()', () => {
      assert.throws(
        () => ImpactValueFactory.toLabel(99),
        (err) => err.message.includes('99')
      );
    });
  });

  describe('output is type-stable and JSON-serializable', () => {
    it('returns a finite integer in the closed set {1, 2, 3}', () => {
      for (const label of ['bajo', 'medio', 'alto']) {
        const v = ImpactValueFactory.fromLabel(label);
        assert.ok(Number.isInteger(v), `${label} should be integer`);
        assert.ok(v >= 1 && v <= 3, `${label} should be in [1, 3]`);
      }
    });

    it('toLabel() output serializes identically via JSON', () => {
      assert.equal(JSON.stringify(ImpactValueFactory.toLabel(2)), JSON.stringify('Medio'));
    });
  });
});
