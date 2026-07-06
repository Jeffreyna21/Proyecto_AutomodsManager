'use strict';

const events = require('./events');

/**
 * ModificacionEvent — factory for the payload shape emitted on every
 * `modificacion.*` event.
 *
 * Shape:
 *   {
 *     autoId:         number,   // parent auto (always present)
 *     modificacionId: number,   // affected row id (always present)
 *     type:           string,   // one of events.MODIFICACION_*
 *     at:             string    // ISO 8601 timestamp (always present)
 *   }
 *
 * The factory never mutates the caller's payload — the `type` and `at`
 * fields are added to a shallow copy. This keeps repositories free of
 * "did I overwrite an existing field?" worries and keeps the
 * `ModificacionChanged` payload immutable in the eyes of the caller.
 */
const ModificacionEvent = Object.freeze({
  /**
   * @param {object} payload the partial event payload (autoId, modificacionId, etc.)
   * @param {string} type    one of events.MODIFICACION_*
   * @returns {object} a new payload with `type` and `at` added
   */
  create(payload, type) {
    if (payload == null || typeof payload !== 'object') {
      throw new Error('ModificacionEvent.create() requires a payload object');
    }
    if (type !== events.MODIFICACION_CREATED &&
        type !== events.MODIFICACION_UPDATED &&
        type !== events.MODIFICACION_DELETED) {
      throw new Error(`ModificacionEvent.create() invalid type: ${type}`);
    }
    return {
      ...payload,
      type,
      at: new Date().toISOString()
    };
  }
});

module.exports = ModificacionEvent;
