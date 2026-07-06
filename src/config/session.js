const session = require('express-session');
const crypto = require('node:crypto');

function assertSessionSecret(env) {
  if (env.NODE_ENV === 'production' && !env.SESSION_SECRET) {
    throw new Error(
      'SESSION_SECRET is required when NODE_ENV=production. ' +
      'Set SESSION_SECRET to a long random string in your environment.'
    );
  }
}

assertSessionSecret(process.env);

// In non-production environments, fall back to a per-process random secret
// so dev sessions are not silently signed with a guessable string.
const sessionSecret =
  process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');

module.exports = session({
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: false,
    maxAge: 1000 * 60 * 60 * 24
  }
});
