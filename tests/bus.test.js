const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');

describe('bus — in-process event bus', () => {
  it('exposes on/off/emit', () => {
    const { createBus } = require('../src/bus');
    const bus = createBus();
    assert.equal(typeof bus.on, 'function');
    assert.equal(typeof bus.off, 'function');
    assert.equal(typeof bus.emit, 'function');
  });

  it('emit triggers a registered listener', () => {
    const { createBus } = require('../src/bus');
    const bus = createBus();
    let received = null;
    bus.on('modificacion.created', (payload) => { received = payload; });
    bus.emit('modificacion.created', { autoId: 7 });
    assert.deepEqual(received, { autoId: 7 });
  });

  it('off removes a previously registered listener', () => {
    const { createBus } = require('../src/bus');
    const bus = createBus();
    let calls = 0;
    const handler = () => { calls += 1; };
    bus.on('test.event', handler);
    bus.emit('test.event');
    bus.off('test.event', handler);
    bus.emit('test.event');
    assert.equal(calls, 1);
  });

  it('emit with no listeners does not throw', () => {
    const { createBus } = require('../src/bus');
    const bus = createBus();
    assert.doesNotThrow(() => bus.emit('no.listeners', { ok: true }));
  });
});
