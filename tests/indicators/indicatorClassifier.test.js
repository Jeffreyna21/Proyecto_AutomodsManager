const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const config = require('../../src/domain/strategies/config');
const DeficientStrategy = require('../../src/domain/strategies/DeficientStrategy');
const RegularStrategy = require('../../src/domain/strategies/RegularStrategy');
const ExcellentStrategy = require('../../src/domain/strategies/ExcellentStrategy');
const NoDataStrategy = require('../../src/domain/strategies/NoDataStrategy');
const IndicatorClassifier = require('../../src/domain/strategies/IndicatorClassifier');

describe('strategies/config — thresholds come from config', () => {
  it('exposes a regular.min numeric threshold', () => {
    assert.equal(typeof config.regular.min, 'number');
  });

  it('exposes an excellent.min numeric threshold', () => {
    assert.equal(typeof config.excellent.min, 'number');
  });

  it('regular.min < excellent.min (sanity)', () => {
    assert.ok(config.regular.min < config.excellent.min, 'regular.min must be strictly less than excellent.min');
  });
});

describe('DeficientStrategy', () => {
  const strat = new DeficientStrategy(config);

  it('has a Spanish name "Deficiente" (backward compat with EJS view)', () => {
    assert.equal(strat.name, 'Deficiente');
  });

  it('exposes a UI color and message', () => {
    assert.equal(typeof strat.color, 'string');
    assert.ok(strat.color.length > 0);
    assert.equal(typeof strat.message, 'string');
    assert.ok(strat.message.length > 0);
  });

  it('matches when promedio_mejora < 1.5', () => {
    assert.equal(strat.matches({ promedio_mejora: 1.2, numero_modificaciones: 1 }), true);
    assert.equal(strat.matches({ promedio_mejora: 1.4999, numero_modificaciones: 1 }), true);
    assert.equal(strat.matches({ promedio_mejora: 0, numero_modificaciones: 1 }), true);
  });

  it('does NOT match when promedio_mejora >= 1.5', () => {
    assert.equal(strat.matches({ promedio_mejora: 1.5, numero_modificaciones: 1 }), false);
    assert.equal(strat.matches({ promedio_mejora: 2.0, numero_modificaciones: 1 }), false);
  });

  it('does NOT match when promedio_mejora is null (Sin datos case)', () => {
    assert.equal(strat.matches({ promedio_mejora: null, numero_modificaciones: 0 }), false);
  });

  it('classify() returns the indicator tuple { name, color, message }', () => {
    const result = strat.classify({ promedio_mejora: 1.0, numero_modificaciones: 1 });
    assert.equal(result.name, 'Deficiente');
    assert.equal(result.color, strat.color);
    assert.equal(result.message, strat.message);
  });
});

describe('RegularStrategy', () => {
  const strat = new RegularStrategy(config);

  it('has a Spanish name "Regular"', () => {
    assert.equal(strat.name, 'Regular');
  });

  it('matches when 1.5 <= promedio_mejora < 2.5', () => {
    assert.equal(strat.matches({ promedio_mejora: 1.5, numero_modificaciones: 1 }), true);
    assert.equal(strat.matches({ promedio_mejora: 2.0, numero_modificaciones: 2 }), true);
    assert.equal(strat.matches({ promedio_mejora: 2.4999, numero_modificaciones: 3 }), true);
  });

  it('does NOT match below 1.5', () => {
    assert.equal(strat.matches({ promedio_mejora: 1.4999, numero_modificaciones: 1 }), false);
  });

  it('does NOT match at or above 2.5', () => {
    assert.equal(strat.matches({ promedio_mejora: 2.5, numero_modificaciones: 1 }), false);
    assert.equal(strat.matches({ promedio_mejora: 3.0, numero_modificaciones: 1 }), false);
  });
});

describe('ExcellentStrategy', () => {
  const strat = new ExcellentStrategy(config);

  it('has a Spanish name "Excelente"', () => {
    assert.equal(strat.name, 'Excelente');
  });

  it('matches when promedio_mejora >= 2.5', () => {
    assert.equal(strat.matches({ promedio_mejora: 2.5, numero_modificaciones: 1 }), true);
    assert.equal(strat.matches({ promedio_mejora: 2.8, numero_modificaciones: 3 }), true);
    assert.equal(strat.matches({ promedio_mejora: 3.0, numero_modificaciones: 1 }), true);
  });

  it('does NOT match when promedio_mejora < 2.5', () => {
    assert.equal(strat.matches({ promedio_mejora: 2.4999, numero_modificaciones: 1 }), false);
  });
});

describe('NoDataStrategy (default fallback)', () => {
  const strat = new NoDataStrategy(config);

  it('has a Spanish name "Sin datos"', () => {
    assert.equal(strat.name, 'Sin datos');
  });

  it('matches when numero_modificaciones === 0', () => {
    assert.equal(strat.matches({ promedio_mejora: null, numero_modificaciones: 0 }), true);
  });

  it('matches when promedio_mejora is null', () => {
    assert.equal(strat.matches({ promedio_mejora: null, numero_modificaciones: 5 }), true);
  });

  it('does NOT match when there is data', () => {
    assert.equal(strat.matches({ promedio_mejora: 1.0, numero_modificaciones: 1 }), false);
  });
});

describe('IndicatorClassifier — orchestrator', () => {
  // Build the default stack exactly as the composition root would
  const defaults = [
    new DeficientStrategy(config),
    new RegularStrategy(config),
    new ExcellentStrategy(config)
  ];

  it('returns "Deficiente" for promedio 1.2 (first match wins)', () => {
    const c = new IndicatorClassifier({ strategies: defaults, fallback: new NoDataStrategy(config) });
    const result = c.classify({ promedio_mejora: 1.2, numero_modificaciones: 1 });
    assert.equal(result.name, 'Deficiente');
  });

  it('returns "Regular" for promedio 2.0', () => {
    const c = new IndicatorClassifier({ strategies: defaults, fallback: new NoDataStrategy(config) });
    const result = c.classify({ promedio_mejora: 2.0, numero_modificaciones: 2 });
    assert.equal(result.name, 'Regular');
  });

  it('returns "Excelente" for promedio 2.8', () => {
    const c = new IndicatorClassifier({ strategies: defaults, fallback: new NoDataStrategy(config) });
    const result = c.classify({ promedio_mejora: 2.8, numero_modificaciones: 3 });
    assert.equal(result.name, 'Excelente');
  });

  it('boundary: 1.4999 → Deficiente, 1.5 → Regular', () => {
    const c = new IndicatorClassifier({ strategies: defaults, fallback: new NoDataStrategy(config) });
    assert.equal(c.classify({ promedio_mejora: 1.4999, numero_modificaciones: 1 }).name, 'Deficiente');
    assert.equal(c.classify({ promedio_mejora: 1.5, numero_modificaciones: 1 }).name, 'Regular');
  });

  it('boundary: 2.4999 → Regular, 2.5 → Excelente', () => {
    const c = new IndicatorClassifier({ strategies: defaults, fallback: new NoDataStrategy(config) });
    assert.equal(c.classify({ promedio_mejora: 2.4999, numero_modificaciones: 3 }).name, 'Regular');
    assert.equal(c.classify({ promedio_mejora: 2.5, numero_modificaciones: 1 }).name, 'Excelente');
  });

  it('empty data (N=0) falls through to Sin datos', () => {
    const c = new IndicatorClassifier({ strategies: defaults, fallback: new NoDataStrategy(config) });
    const result = c.classify({ promedio_mejora: null, numero_modificaciones: 0 });
    assert.equal(result.name, 'Sin datos');
  });

  it('null promedio_mejora falls through to Sin datos', () => {
    const c = new IndicatorClassifier({ strategies: defaults, fallback: new NoDataStrategy(config) });
    const result = c.classify({ promedio_mejora: null, numero_modificaciones: 5 });
    assert.equal(result.name, 'Sin datos');
  });

  it('exposes a defaultStrategies() factory used by the composition root', () => {
    const stack = IndicatorClassifier.defaultStrategies(config);
    const c = new IndicatorClassifier({ strategies: stack, fallback: new NoDataStrategy(config) });
    assert.equal(c.classify({ promedio_mejora: 1.0, numero_modificaciones: 1 }).name, 'Deficiente');
    assert.equal(c.classify({ promedio_mejora: 2.0, numero_modificaciones: 1 }).name, 'Regular');
    assert.equal(c.classify({ promedio_mejora: 2.8, numero_modificaciones: 1 }).name, 'Excelente');
  });

  it('extensible: registering a new strategy without editing existing ones works', () => {
    class PremiumStrategy {
      constructor(c) { this.c = c; this.name = 'Premium'; this.color = '#gold'; this.message = 'Premium tier'; }
      matches(analysis) { return analysis.promedio_mejora !== null && analysis.promedio_mejora >= 3.5; }
      classify(analysis) { return { name: this.name, color: this.color, message: this.message }; }
    }
    // Premium is registered first in the priority stack so it can win
    // over Excellent for very high averages; the existing strategies
    // are completely untouched.
    const stack = [
      new PremiumStrategy(config),
      new DeficientStrategy(config),
      new RegularStrategy(config),
      new ExcellentStrategy(config)
    ];
    const c = new IndicatorClassifier({ strategies: stack, fallback: new NoDataStrategy(config) });
    assert.equal(c.classify({ promedio_mejora: 3.6, numero_modificaciones: 1 }).name, 'Premium');
    // existing bands still work
    assert.equal(c.classify({ promedio_mejora: 1.0, numero_modificaciones: 1 }).name, 'Deficiente');
    assert.equal(c.classify({ promedio_mejora: 2.0, numero_modificaciones: 1 }).name, 'Regular');
    assert.equal(c.classify({ promedio_mejora: 2.8, numero_modificaciones: 1 }).name, 'Excelente');
  });

  it('classify() returns the full indicator tuple (name + color + message)', () => {
    const c = new IndicatorClassifier({ strategies: defaults, fallback: new NoDataStrategy(config) });
    const result = c.classify({ promedio_mejora: 2.0, numero_modificaciones: 1 });
    assert.equal(typeof result.name, 'string');
    assert.equal(typeof result.color, 'string');
    assert.equal(typeof result.message, 'string');
    assert.ok(result.name.length > 0);
    assert.ok(result.color.length > 0);
    assert.ok(result.message.length > 0);
  });
});
