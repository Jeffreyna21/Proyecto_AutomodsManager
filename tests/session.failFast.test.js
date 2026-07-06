const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const SESSION_PATH = path.join(__dirname, '..', 'src', 'config', 'session.js');

function reloadSession() {
  delete require.cache[require.resolve(SESSION_PATH)];
  return require(SESSION_PATH);
}

describe('config/session — fail-fast SESSION_SECRET', () => {
  let originalNodeEnv;
  let originalSecret;

  before(() => {
    originalNodeEnv = process.env.NODE_ENV;
    originalSecret = process.env.SESSION_SECRET;
  });

  after(() => {
    if (originalNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = originalNodeEnv;
    }
    if (originalSecret === undefined) {
      delete process.env.SESSION_SECRET;
    } else {
      process.env.SESSION_SECRET = originalSecret;
    }
    delete require.cache[require.resolve(SESSION_PATH)];
  });

  it('throws when NODE_ENV=production and SESSION_SECRET is missing', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.SESSION_SECRET;
    assert.throws(
      () => reloadSession(),
      /SESSION_SECRET/
    );
  });

  it('throws when NODE_ENV=production and SESSION_SECRET is empty string', () => {
    process.env.NODE_ENV = 'production';
    process.env.SESSION_SECRET = '';
    assert.throws(
      () => reloadSession(),
      /SESSION_SECRET/
    );
  });

  it('does NOT throw in development without SESSION_SECRET', () => {
    delete process.env.NODE_ENV;
    delete process.env.SESSION_SECRET;
    assert.doesNotThrow(() => reloadSession());
  });

  it('returns a session middleware (function) when secret is present', () => {
    delete process.env.NODE_ENV;
    process.env.SESSION_SECRET = 'a-test-secret-with-enough-entropy';
    const middleware = reloadSession();
    assert.equal(typeof middleware, 'function');
  });
});
