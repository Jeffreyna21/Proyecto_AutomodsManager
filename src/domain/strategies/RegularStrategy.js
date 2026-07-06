'use strict';

const IndicatorStrategy = require('./IndicatorStrategy');

/**
 * RegularStrategy — matches metricas whose `promedio_mejora` is in the
 * middle band (`regular.min <= p < excellent.min`). The boundary is
 * owned by the config module; this file contains no literal thresholds.
 */
class RegularStrategy extends IndicatorStrategy {
  constructor(config) {
    super(config, 'Regular', '#ffc107',
      'Mejora consistente. Considera modificaciones de mayor impacto para alcanzar nivel Excelente.');
  }

  matches(analysis) {
    if (analysis == null) return false;
    const p = analysis.promedio_mejora;
    if (p === null || p === undefined) return false;
    return p >= this.config.regular.min && p < this.config.excellent.min;
  }
}

module.exports = RegularStrategy;
