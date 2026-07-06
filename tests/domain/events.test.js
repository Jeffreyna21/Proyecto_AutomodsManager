const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const events = require('../../src/domain/events/events');
const ModificacionEvent = require('../../src/domain/events/ModificacionEvent');

describe('events — typed event-name constants', () => {
  it('MODIFICACION_CREATED is "modificacion.created"', () => {
    assert.equal(events.MODIFICACION_CREATED, 'modificacion.created');
  });

  it('MODIFICACION_UPDATED is "modificacion.updated"', () => {
    assert.equal(events.MODIFICACION_UPDATED, 'modificacion.updated');
  });

  it('MODIFICACION_DELETED is "modificacion.deleted"', () => {
    assert.equal(events.MODIFICACION_DELETED, 'modificacion.deleted');
  });

  it('the export is frozen so consumers cannot mutate it at runtime', () => {
    assert.ok(Object.isFrozen(events), 'events module export must be frozen');
  });

  it('all three event names are unique strings', () => {
    const names = [events.MODIFICACION_CREATED, events.MODIFICACION_UPDATED, events.MODIFICACION_DELETED];
    assert.equal(new Set(names).size, 3, 'event names must be unique');
  });
});

describe('ModificacionEvent — payload factory', () => {
  it('create(payload, type) returns the payload with an ISO timestamp', () => {
    const before = Date.now();
    const ev = ModificacionEvent.create({ autoId: 7, modificacionId: 99 }, events.MODIFICACION_CREATED);
    const after = Date.now();

    assert.equal(ev.autoId, 7);
    assert.equal(ev.modificacionId, 99);
    assert.equal(ev.type, events.MODIFICACION_CREATED);
    assert.equal(typeof ev.at, 'string');
    // ISO 8601 sanity: parseable as Date and inside the surrounding window
    const ts = Date.parse(ev.at);
    assert.ok(!Number.isNaN(ts), 'at must be a parseable ISO timestamp');
    assert.ok(ts >= before && ts <= after, 'at must be the current time');
  });

  it('create() preserves arbitrary extra fields from the payload', () => {
    const ev = ModificacionEvent.create(
      { autoId: 3, modificacionId: 5, operation: 'delete' },
      events.MODIFICACION_DELETED
    );
    assert.equal(ev.autoId, 3);
    assert.equal(ev.modificacionId, 5);
    assert.equal(ev.operation, 'delete');
  });

  it('create() result is JSON-serializable (cascada test will JSON.stringify it)', () => {
    const ev = ModificacionEvent.create({ autoId: 1, modificacionId: 2 }, events.MODIFICACION_CREATED);
    const round = JSON.parse(JSON.stringify(ev));
    assert.equal(round.autoId, 1);
    assert.equal(round.type, events.MODIFICACION_CREATED);
    assert.equal(typeof round.at, 'string');
  });

  it('create() returns a fresh object (does not mutate the input payload)', () => {
    const payload = { autoId: 7, modificacionId: 99 };
    const ev = ModificacionEvent.create(payload, events.MODIFICACION_CREATED);
    assert.notStrictEqual(ev, payload);
    assert.equal(typeof payload.at, 'undefined', 'input payload must not be mutated');
    assert.equal(typeof payload.type, 'undefined', 'input payload must not be mutated');
  });
});
