'use strict';

const IndicatorStrategy = require('./IndicatorStrategy');

/**
 * DeficientStrategy — matches metricas whose `promedio_mejora` is below
 * the lower band (`< 1.5` by default). The lower bound is the regular
 * tier's `min` so the boundary is owned by the config module — no magic
 * numbers in this file.
 */
class DeficientStrategy extends IndicatorStrategy {
  constructor(config) {
    super(config, 'Deficiente', '#dc3545',
      'El rendimiento acumulado es bajo. Considera modificaciones de mayor impacto.');
  }

  matches(analysis) {
    if (analysis == null) return false;
    const p = analysis.promedio_mejora;
    if (p === null || p === undefined) return false;
    return p < this.config.regular.min;
  }
}

module.exports = DeficientStrategy;
