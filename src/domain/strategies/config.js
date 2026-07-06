'use strict';

/**
 * Indicator thresholds, loaded from a single config module so a teacher
 * can adjust the bands without editing strategy source files.
 *
 * The structure is intentionally flat: a new tier only needs a new
 * numeric `min` in this object plus a new strategy class — no edits to
 * any existing strategy file.
 */
module.exports = Object.freeze({
  regular: { min: 1.5 },
  excellent: { min: 2.5 }
});
