'use strict';

/**
 * Base class for indicator strategies. Concrete strategies extend this
 * and provide their own `matches()` predicate. The base class wires up
 * the public surface (`name`, `color`, `message`, `classify()`) so each
 * subclass stays focused on the predicate only.
 */
class IndicatorStrategy {
  /**
   * @param {object} _config  the threshold config (subclasses read it)
   * @param {string} name     Spanish label emitted to the UI / EJS view
   * @param {string} color    hex color used in badges and chart strokes
   * @param {string} message  human-readable description
   */
  constructor(_config, name, color, message) {
    this.config = _config;
    this.name = name;
    this.color = color;
    this.message = message;
  }

  /**
   * Predicate — does this strategy apply to the given metricas?
   * @param {object} _analysis  the metricas object
   * @returns {boolean}
   */
  matches(_analysis) { // eslint-disable-line no-unused-vars
    throw new Error('IndicatorStrategy.matches() must be implemented by subclass');
  }

  /**
   * Build the indicator tuple the UI consumes. Default implementation
   * returns the strategy's own name/color/message; subclasses inherit
   * this without overriding.
   * @param {object} _analysis
   * @returns {{ name: string, color: string, message: string }}
   */
  classify(_analysis) {
    return { name: this.name, color: this.color, message: this.message };
  }
}

module.exports = IndicatorStrategy;
