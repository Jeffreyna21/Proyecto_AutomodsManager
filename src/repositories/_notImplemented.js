/**
 * Shared helper for repository interfaces. Calling any method on a
 * concrete repository before it is fully implemented throws this error
 * so the missing implementation cannot silently mask a wiring bug.
 */
function createNotImplementedError(methodName) {
  return new Error(`Not implemented: ${methodName}`);
}

module.exports = { createNotImplementedError };
