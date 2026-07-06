'use strict';

const DeficientStrategy = require('./DeficientStrategy');
const RegularStrategy = require('./RegularStrategy');
const ExcellentStrategy = require('./ExcellentStrategy');
const NoDataStrategy = require('./NoDataStrategy');

/**
 * IndicatorClassifier — orchestrator that holds an ordered list of
 * strategies and returns the first one whose `matches()` returns true.
 * The list is passed in (no internal mutation), so registering a new
 * tier requires no edit to this file or to the existing strategies.
 *
 * Construction:
 *   new IndicatorClassifier({
 *     strategies: [Deficient, Regular, Excellent, ...],  // priority order
 *     fallback:   NoDataStrategy                          // default when no match
 *   })
 */
class IndicatorClassifier {
  /**
   * @param {object} opts
   * @param {Array<{matches: Function, name: string, color: string, message: string}>} opts.strategies
   * @param {{name: string, color: string, message: string}} opts.fallback
   */
  constructor({ strategies, fallback }) {
    if (!Array.isArray(strategies) || strategies.length === 0) {
      throw new Error('IndicatorClassifier requires a non-empty strategies array');
    }
    if (!fallback) {
      throw new Error('IndicatorClassifier requires a fallback strategy');
    }
    this.strategies = strategies;
    this.fallback = fallback;
  }

  /**
   * @param {object} analysis  the metricas object produced by analisisService
   * @returns {{ name: string, color: string, message: string }}
   */
  classify(analysis) {
    for (const strat of this.strategies) {
      if (strat.matches(analysis)) {
        return strat.classify(analysis);
      }
    }
    return this.fallback.classify(analysis);
  }

  /**
   * Factory: build the default priority stack used by the composition
   * root. The order is the same as the inline if/else chain it replaces:
   * Deficiente → Regular → Excelente. Tests can call this to construct
   * a baseline classifier without re-listing the default classes.
   * @param {object} config the threshold config module
   * @returns {Array}
   */
  static defaultStrategies(config) {
    return [
      new DeficientStrategy(config),
      new RegularStrategy(config),
      new ExcellentStrategy(config)
    ];
  }
}

module.exports = IndicatorClassifier;
module.exports.NoDataStrategy = NoDataStrategy;
