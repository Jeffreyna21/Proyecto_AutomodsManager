const express = require('express');
const session = require('express-session');
const { errorHandler } = require('../../src/middlewares/errorEnvelope');
const authRoutes = require('../../src/api/v1/auth.routes');

/**
 * Construye una app de Express con la pila estándar de /api/v1
 * (json + sesión + routers por feature) lista para tests con
 * supertest.
 *
 * El container se inyecta en `req.container` para que las rutas lean
 * repos/policies de ahí.
 *
 * `mounts` es un array de `{ mountPath, routes }` para montar cada
 * feature en su propio prefijo. /api/v1/auth se monta SIEMPRE por
 * defecto (los tests lo necesitan para hacer login); si una test
 * pasa `mountAuth: false` puede omitirlo.
 *
 * @param {object} opts
 * @param {object} opts.container
 * @param {Array<{ mountPath: string, routes: import('express').Router|Array }>} [opts.mounts=[]]
 * @param {boolean} [opts.mountAuth=true] montar /api/v1/auth automáticamente
 * @param {object} [opts.sessionOpts]
 * @returns {import('express').Express}
 */
function buildApiApp({ container, mounts = [], mountAuth = true, sessionOpts }) {
  const app = express();
  app.use(express.json());
  app.use(session(sessionOpts || {
    secret: 'test-secret', resave: false, saveUninitialized: false
  }));
  app.use((req, _res, next) => { req.container = container; next(); });
  // /api/v1/auth va SIEMPRE montado (los tests lo necesitan para login)
  if (mountAuth) {
    app.use('/api/v1/auth', authRoutes);
  }
  for (const { mountPath, routes } of mounts) {
    // Permitimos un array de routers (Express acepta un solo middleware
    // o un array de middlewares)
    app.use(mountPath, routes);
  }
  // 404 JSON para rutas no encontradas bajo los mounts configurados
  app.use((req, res) => {
    res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Ruta no encontrada en /api/v1' }
    });
  });
  app.use(errorHandler);
  return app;
}

module.exports = { buildApiApp };
