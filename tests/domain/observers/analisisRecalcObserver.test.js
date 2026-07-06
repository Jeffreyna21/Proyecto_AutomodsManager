const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const AnalisisRecalcObserver = require('../../../src/domain/observers/AnalisisRecalcObserver');
const events = require('../../../src/domain/events/events');
const { createBus } = require('../../../src/bus');

/** Build a fake analisisService with a recorded `recalcularForAuto` spy. */
function makeFakeAnalisisService() {
  const calls = [];
  let shouldThrow = null;
  return {
    calls,
    setError(err) { shouldThrow = err; },
    recalcularForAuto(autoId) {
      calls.push(autoId);
      if (shouldThrow) throw shouldThrow;
      return { ok: true, autoId };
    }
  };
}

/** Build a no-op logger that records every call. */
function makeFakeLogger() {
  return { infos: [], errors: [], info(...args) { this.infos.push(args); }, error(...args) { this.errors.push(args); } };
}

describe('AnalisisRecalcObserver — observer on the in-process bus', () => {
  it('is constructed with an analisisService and a logger (no side effects yet)', () => {
    const svc = makeFakeAnalisisService();
    const log = makeFakeLogger();
    const obs = new AnalisisRecalcObserver({ analisisService: svc, logger: log });
    assert.equal(typeof obs, 'object');
    assert.equal(svc.calls.length, 0, 'constructor must not call the service');
  });

  it('attach(bus) subscribes to all three MODIFICACION_* events', () => {
    const bus = createBus();
    const obs = new AnalisisRecalcObserver({
      analisisService: makeFakeAnalisisService(),
      logger: makeFakeLogger()
    });
    obs.attach(bus);

    bus.emit(events.MODIFICACION_CREATED, { autoId: 1, modificacionId: 10, at: 'x', type: events.MODIFICACION_CREATED });
    bus.emit(events.MODIFICACION_UPDATED, { autoId: 1, modificacionId: 10, at: 'x', type: events.MODIFICACION_UPDATED });
    bus.emit(events.MODIFICACION_DELETED, { autoId: 1, modificacionId: 10, at: 'x', type: events.MODIFICACION_DELETED });
  });

  it('calls analisisService.recalcularForAuto(autoId) on a CREATED event', () => {
    const bus = createBus();
    const svc = makeFakeAnalisisService();
    const obs = new AnalisisRecalcObserver({ analisisService: svc, logger: makeFakeLogger() });
    obs.attach(bus);

    bus.emit(events.MODIFICACION_CREATED, { autoId: 7, modificacionId: 99 });
    assert.deepEqual(svc.calls, [7]);
  });

  it('calls analisisService.recalcularForAuto(autoId) on UPDATED', () => {
    const bus = createBus();
    const svc = makeFakeAnalisisService();
    const obs = new AnalisisRecalcObserver({ analisisService: svc, logger: makeFakeLogger() });
    obs.attach(bus);

    bus.emit(events.MODIFICACION_UPDATED, { autoId: 3, modificacionId: 12 });
    assert.deepEqual(svc.calls, [3]);
  });

  it('calls analisisService.recalcularForAuto(autoId) on DELETED', () => {
    const bus = createBus();
    const svc = makeFakeAnalisisService();
    const obs = new AnalisisRecalcObserver({ analisisService: svc, logger: makeFakeLogger() });
    obs.attach(bus);

    bus.emit(events.MODIFICACION_DELETED, { autoId: 5, modificacionId: 13 });
    assert.deepEqual(svc.calls, [5]);
  });

  it('fires exactly once per emit (no accidental double-subscribe)', () => {
    const bus = createBus();
    const svc = makeFakeAnalisisService();
    const obs = new AnalisisRecalcObserver({ analisisService: svc, logger: makeFakeLogger() });
    obs.attach(bus);
    bus.emit(events.MODIFICACION_CREATED, { autoId: 1, modificacionId: 1 });
    bus.emit(events.MODIFICACION_CREATED, { autoId: 1, modificacionId: 1 });
    bus.emit(events.MODIFICACION_CREATED, { autoId: 1, modificacionId: 1 });
    assert.equal(svc.calls.length, 3);
  });

  it('rethrows errors from analisisService so the bus / caller can log them', () => {
    const bus = createBus();
    const svc = makeFakeAnalisisService();
    svc.setError(new Error('DB boom'));
    const log = makeFakeLogger();
    const obs = new AnalisisRecalcObserver({ analisisService: svc, logger: log });
    obs.attach(bus);

    assert.throws(
      () => bus.emit(events.MODIFICACION_CREATED, { autoId: 9, modificacionId: 1 }),
      /DB boom/
    );
  });

  it('logs the error via the injected logger before rethrowing', () => {
    const bus = createBus();
    const svc = makeFakeAnalisisService();
    svc.setError(new Error('recalc failed'));
    const log = makeFakeLogger();
    const obs = new AnalisisRecalcObserver({ analisisService: svc, logger: log });
    obs.attach(bus);

    try { bus.emit(events.MODIFICACION_UPDATED, { autoId: 9, modificacionId: 1 }); }
    catch (_) { /* swallow — we only care that the logger was called */ }
    assert.equal(log.errors.length, 1, 'logger.error must be called once');
    assert.ok(log.errors[0][0] instanceof Error, 'first arg should be the Error');
  });

  it('no-op on a bus that has no listener (observer never attached)', () => {
    const bus = createBus();
    const svc = makeFakeAnalisisService();
    // intentionally do NOT attach
    bus.emit(events.MODIFICACION_CREATED, { autoId: 1, modificacionId: 1 });
    assert.equal(svc.calls.length, 0);
  });

  it('detach(bus) removes the listener (no more recalc calls after detach)', () => {
    const bus = createBus();
    const svc = makeFakeAnalisisService();
    const obs = new AnalisisRecalcObserver({ analisisService: svc, logger: makeFakeLogger() });
    obs.attach(bus);
    bus.emit(events.MODIFICACION_CREATED, { autoId: 1, modificacionId: 1 });
    obs.detach(bus);
    bus.emit(events.MODIFICACION_CREATED, { autoId: 1, modificacionId: 1 });
    assert.equal(svc.calls.length, 1);
  });
});
