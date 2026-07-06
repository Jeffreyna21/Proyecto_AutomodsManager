const { createBus } = require('./bus');
const AutoRepository = require('./repositories/AutoRepository');
const ModificacionRepository = require('./repositories/ModificacionRepository');
const UsuarioRepository = require('./repositories/UsuarioRepository');
const CatalogoRepository = require('./repositories/CatalogoRepository');
const AnalisisRepository = require('./repositories/AnalisisRepository');
const AutoPolicy = require('./policies/AutoPolicy');
const ModificacionPolicy = require('./policies/ModificacionPolicy');
const AnalisisRecalcObserver = require('./domain/observers/AnalisisRecalcObserver');
const { AnalisisService } = require('./services/analisisService');

/**
 * Resolve the Database handle for the container.
 *
 * If a handle is passed in (tests), it is returned as-is. Otherwise the
 * production `initDB()` is awaited and the module-level handle returned.
 * This is the only call site for `initDB()` / `getDB()` in `src/` — the
 * repositories receive the handle via constructor injection, and the
 * rest of the app never imports `models/db.js` directly.
 */
async function resolveDbHandle(injected) {
  if (injected) return injected;
  const { initDB, getDB } = require('./models/db');
  await initDB();
  return getDB();
}

/**
 * Build a fresh container.
 *
 * @param {object} [opts]
 * @param {*} [opts.db] optional pre-built sql.js Database handle (tests)
 * @param {boolean} [opts.withRecalcObserver=true] wire AnalisisRecalcObserver
 * @returns {Promise<object>} the container
 */
async function buildContainer(opts = {}) {
  const { withRecalcObserver = true } = opts;
  const db = await resolveDbHandle(opts.db);
  const bus = createBus();

  // Repositories — the ModificacionRepository receives the bus so it
  // can emit MODIFICACION_* events on every successful write.
  const repositories = {
    auto: new AutoRepository(db),
    modificacion: new ModificacionRepository(db, { bus }),
    usuario: new UsuarioRepository(db),
    catalogo: new CatalogoRepository(db),
    analisis: new AnalisisRepository(db)
  };

  const policies = {
    auto: new AutoPolicy(),
    modificacion: new ModificacionPolicy()
  };

  // Services — a container-built AnalisisService with its repos
  // injected, so the recalculation path is dependency-inverted.
  const analisisService = new AnalisisService({
    modificacionRepository: repositories.modificacion,
    analisisRepository: repositories.analisis
  });

  // Observers — AnalisisRecalcObserver subscribes to all three
  // MODIFICACION_* events. Test harnesses can opt out via
  // `buildContainer({ withRecalcObserver: false })` (see the spec
  // scenario "Test harness can build a container without the observer").
  const analisisRecalc = new AnalisisRecalcObserver({
    analisisService,
    logger: console
  });
  if (withRecalcObserver) {
    analisisRecalc.attach(bus);
  }

  const container = {
    db,
    bus,
    repositories,
    policies,
    services: {
      analisis: analisisService
    },
    observers: {
      analisisRecalc
    },
    /**
     * Use cases are wired in PR 3 (api-v1-json). Kept as an empty object
     * here so callers can rely on the shape of the container today.
     */
    useCases: {},
    /**
     * API controllers are wired in PR 3. EJS controllers stay under
     * `src/controllers/` and are not exposed by the container.
     */
    controllers: {},
    /**
     * Placeholder Express app builder. PR 3 replaces this with the real
     * builder that mounts `/api/v1`, the session middleware, the static
     * SPA, and the error envelope. The current placeholder returns an
     * empty Express app so the container is exercisable today.
     */
    buildApp() {
      const express = require('express');
      return express();
    }
  };

  cached = container;
  return container;
}

let cached = null;

/**
 * Returns the process-wide container singleton. The first call must be
 * preceded by a `buildContainer()` so the singleton is initialized;
 * otherwise an error is raised.
 */
function getContainer() {
  if (cached === null) {
    throw new Error(
      'Container has not been built. Call `await buildContainer()` at startup before `getContainer()`.'
    );
  }
  return cached;
}

/**
 * Reset the cached container. Intended for tests only.
 */
function _resetContainer() {
  cached = null;
}

module.exports = { getContainer, buildContainer, _resetContainer };
