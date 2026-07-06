'use strict';

const IndicatorStrategy = require('./IndicatorStrategy');

/**
 * NoDataStrategy — the default fallback used by IndicatorClassifier
 * when none of the upper strategies match. Triggered when:
 *   - `numero_modificaciones === 0` (no modifications on the auto), or
 *   - `promedio_mejora === null` (no usable average can be computed).
 *
 * The strategy exists so the rest of the codebase never has to
 * special-case "no data" — the classifier always returns an indicator
 * tuple with a stable shape.
 */
class NoDataStrategy extends IndicatorStrategy {
  constructor(config) {
    super(config, 'Sin datos', '#6c757d',
      'No hay datos suficientes para evaluar el rendimiento del vehículo.');
  }

  matches(analysis) {
    if (analysis == null) return true;
    const n = analysis.numero_modificaciones;
    if (n === 0) return true;
    const p = analysis.promedio_mejora;
    return p === null || p === undefined;
  }
}

module.exports = NoDataStrategy;
