const { EventEmitter } = require('node:events');

/**
 * Create a fresh in-process event bus.
 * Wraps Node's EventEmitter to keep the test surface stable and to
 * prevent accidental coupling to Node internals across the codebase.
 * @returns {{ on: Function, off: Function, emit: Function, removeAllListeners: Function }}
 */
function createBus() {
  const emitter = new EventEmitter();
  return {
    on(event, handler) { emitter.on(event, handler); },
    off(event, handler) { emitter.off(event, handler); },
    emit(event, payload) { emitter.emit(event, payload); },
    removeAllListeners(event) { emitter.removeAllListeners(event); }
  };
}

module.exports = { createBus };
