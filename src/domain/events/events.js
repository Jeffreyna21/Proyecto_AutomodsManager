'use strict';

/**
 * Typed event-name constants for the `modificacion.*` event family.
 *
 * These strings are the contract between the publisher (the repository
 * that mutates a modification) and the subscriber (the
 * AnalisisRecalcObserver). Keep them frozen so callers cannot drift the
 * contract at runtime by typo'd string literals.
 *
 * The full payload shape produced by `ModificacionEvent.create()` is
 * documented in `src/domain/events/ModificacionEvent.js`.
 */
const events = Object.freeze({
  MODIFICACION_CREATED: 'modificacion.created',
  MODIFICACION_UPDATED: 'modificacion.updated',
  MODIFICACION_DELETED: 'modificacion.deleted'
});

module.exports = events;
