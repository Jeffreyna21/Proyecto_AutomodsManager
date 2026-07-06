const express = require('express');
const path = require('path');
const methodOverride = require('method-override');
const flash = require('connect-flash');
const sessionConfig = require('./config/session');

// Rutas EJS (se siguen montando como antes; usan getDB() a traves de
// los modelos en src/models/).
const ejsAuthRoutes = require('./routes/authRoutes');
const ejsAutosRoutes = require('./routes/autosRoutes');
const ejsModificacionesRouter = require('./routes/modificacionesRoutes');
const { autosMods: ejsAutosMods, topLevelMods: ejsTopLevelMods } = ejsModificacionesRouter;
const ejsApiRoutes = require('./routes/apiRoutes');

// Rutas API v1 (nuevas en PR 3; usan el container inyectado en
// `req.container` para resolver repos/policies/use cases).
const apiAuthRoutes = require('./api/v1/auth.routes');
const apiAutosRoutes = require('./api/v1/autos.routes');
const apiModificacionesRoutes = require('./api/v1/modificaciones.routes');
const apiAnalisisRoutes = require('./api/v1/analisis.routes');
const apiCatalogosRoutes = require('./api/v1/catalogos.routes');
const { errorHandler: apiErrorHandler } = require('./middlewares/errorEnvelope');

/**
 * Construye la app de Express con todas las rutas (EJS + API v1).
 *
 * @param {object} [opts]
 * @param {object} [opts.container] - container pre-construido
 *   (inyectado por los tests). Si no se pasa, se llama a
 *   `buildContainer()` (que internamente hace `initDB()`).
 * @returns {Promise<import('express').Express>}
 */
async function buildApp(opts = {}) {
  const { buildContainer } = require('./container');
  const container = opts.container || await buildContainer();

  const app = express();

  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, 'views'));

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(express.static(path.join(__dirname, '../public')));
  app.use(methodOverride('_method'));
  app.use(sessionConfig);
  app.use(flash());

  app.use((req, res, next) => {
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');
    res.locals.user = req.session.user || null;
    next();
  });

  // --- Rutas EJS (sin cambios de comportamiento) ---
  app.use('/', ejsAuthRoutes);
  app.use('/autos', ejsAutosRoutes);
  // PR 3: modificaciones EJS se montan en prefijos especificos
  // (antes estaban en `/`, lo que interceptaba /api/v1/*). Las views
  // existentes siguen apuntando a /autos/:autoId/modificaciones y
  // /modificaciones/:id (mismas URLs que antes).
  app.use('/autos', ejsAutosMods);
  app.use('/modificaciones', ejsTopLevelMods);
  // PR 3: el alias legacy para el dropdown EJS va en /api/marcas
  // (antes estaba en /api con `router.use(requireAuth)`, lo que
  // interceptaba /api/v1/* con un redirect 302 a /login).
  app.use('/api/marcas', ejsApiRoutes); // legacy /api/marcas/:id/modelos

  // --- API v1 ---
  // Middleware de inyeccion de container (solo para /api/v1/*).
  // Los routers de la API leen repos/policies de `req.container`.
  app.use('/api/v1', (req, _res, next) => {
    req.container = container;
    next();
  });
  // Rutas: el orden importa porque el router de autos expone `POST /`
  // y debe montarse en /api/v1/autos (no en /api/v1, donde su `/`
  // se solaparia con las rutas absolutas del router de modificaciones).
  app.use('/api/v1/auth', apiAuthRoutes);
  app.use('/api/v1/autos', apiAutosRoutes);
  app.use('/api/v1', apiModificacionesRoutes);
  app.use('/api/v1', apiAnalisisRoutes);
  app.use('/api/v1', apiCatalogosRoutes);
  // 404 JSON para rutas no encontradas bajo /api/v1 (antes del
  // errorHandler para que el envelope 404 sea consistente).
  app.use('/api/v1', (req, res) => {
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: 'Ruta no encontrada en /api/v1'
      }
    });
  });
  // Error handler: SIEMPRE el ultimo middleware para /api/v1.
  // Captura errores thrown/next(err) en cualquier router de la API.
  app.use('/api/v1', apiErrorHandler);

  // --- Handlers EJS para todo lo demas (404, 500) ---
  app.use((req, res) => {
    res.status(404).render('partials/error', {
      message: 'Página no encontrada',
      code: 404
    });
  });

  app.use((err, req, res, _next) => {
    console.error(err.stack);
    res.status(500).render('partials/error', {
      message: 'Error interno del servidor',
      code: 500
    });
  });

  return app;
}

module.exports = buildApp;
