const express = require('express');
const session = require('express-session');
const { errorHandler } = require('../../src/middlewares/errorEnvelope');
const authRoutes = require('../../src/api/v1/auth.routes');

/**
 * Construye una app de Express con la pila estándar de /api/v1
 * (json + sesión + un router `routes` por feature) lista para tests
 * con supertest. El caller monta su propio `routes` debajo de
 * `mountPath`.
 *
 * El container se inyecta en `req.container` para que las rutas lean
 * repos/policies de ahí.
 *
 * @param {object} opts
 * @param {object} opts.container
 * @param {string} opts.mountPath  p.ej. '/api/v1/autos'
 * @param {import('express').Router} opts.routes
 * @param {object} [opts.sessionOpts]
 * @returns {import('express').Express}
 */
function buildApiApp({ container, mountPath, routes, sessionOpts }) {
  const app = express();
  app.use(express.json());
  app.use(session(sessionOpts || {
    secret: 'test-secret', resave: false, saveUninitialized: false
  }));
  app.use((req, _res, next) => { req.container = container; next(); });
  // /api/v1/auth va SIEMPRE montado (los tests lo necesitan para login)
  app.use('/api/v1/auth', authRoutes);
  app.use(mountPath, routes);
  app.use(errorHandler);
  return app;
}

module.exports = { buildApiApp };
