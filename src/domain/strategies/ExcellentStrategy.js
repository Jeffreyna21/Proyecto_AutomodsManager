'use strict';

const IndicatorStrategy = require('./IndicatorStrategy');

/**
 * ExcellentStrategy — matches metricas whose `promedio_mejora` reaches
 * or exceeds the upper band (`>= excellent.min`).
 */
class ExcellentStrategy extends IndicatorStrategy {
  constructor(config) {
    super(config, 'Excelente', '#28a745',
      'Rendimiento acumulado excelente. Tu vehículo está bien optimizado.');
  }

  matches(analysis) {
    if (analysis == null) return false;
    const p = analysis.promedio_mejora;
    if (p === null || p === undefined) return false;
    return p >= this.config.excellent.min;
  }
}

module.exports = ExcellentStrategy;
