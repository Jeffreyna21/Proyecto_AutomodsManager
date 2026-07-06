'use strict';

const events = require('../events/events');

/**
 * AnalisisRecalcObserver — listens for any `modificacion.*` event on
 * the bus and triggers a cascada recalculation of the affected auto's
 * analysis row.
 *
 * Construction is dependency-injected so the observer can be unit
 * tested with a fake `analisisService` and a fake logger (see
 * `tests/domain/observers/analisisRecalcObserver.test.js`). The
 * composition root (`src/container.js`) is the only place that
 * constructs the production version.
 *
 * Error policy: errors thrown by the service are logged via the
 * injected `logger.error(...)` and rethrown so the bus / request flow
 * can surface them. Silently swallowing recalc failures would re-create
 * the C4 / C9 partial-failure risk this observer was introduced to fix.
 */
class AnalisisRecalcObserver {
  /**
   * @param {object} deps
   * @param {{ recalcularForAuto: (autoId: number) => any }} deps.analisisService
   * @param {{ info: Function, error: Function }} [deps.logger]  default: console
   */
  constructor({ analisisService, logger = console }) {
    if (!analisisService || typeof analisisService.recalcularForAuto !== 'function') {
      throw new Error('AnalisisRecalcObserver requires an analisisService with recalcularForAuto()');
    }
    this.analisisService = analisisService;
    this.logger = logger;
    this._handler = this._handler.bind(this);
  }

  /**
   * @param {{ on: Function }} bus the in-process bus
   */
  attach(bus) {
    bus.on(events.MODIFICACION_CREATED, this._handler);
    bus.on(events.MODIFICACION_UPDATED, this._handler);
    bus.on(events.MODIFICACION_DELETED, this._handler);
  }

  /**
   * @param {{ off: Function }} bus
   */
  detach(bus) {
    bus.off(events.MODIFICACION_CREATED, this._handler);
    bus.off(events.MODIFICACION_UPDATED, this._handler);
    bus.off(events.MODIFICACION_DELETED, this._handler);
  }

  /**
   * @param {{ autoId: number, modificacionId?: number, type?: string, at?: string }} payload
   */
  _handler(payload) {
    const autoId = payload && payload.autoId;
    if (autoId === undefined || autoId === null) {
      this.logger.error('AnalisisRecalcObserver received payload without autoId', payload);
      throw new Error('AnalisisRecalcObserver: payload.autoId is required');
    }
    try {
      this.analisisService.recalcularForAuto(autoId);
    } catch (err) {
      this.logger.error(err, {
        context: 'AnalisisRecalcObserver',
        autoId,
        type: payload.type
      });
      throw err;
    }
  }
}

module.exports = AnalisisRecalcObserver;
