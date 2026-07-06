const express = require('express');
const router = express.Router();
const modificacionesController = require('../controllers/modificacionesController');
const { requireAuth } = require('../middlewares/authMiddleware');
const { validateModificacion, handleValidationErrors } = require('../middlewares/validationMiddleware');

/**
 * PR 3 (api-v1-json): el router EJS de modificaciones estaba montado
 * en `/` con `router.use(requireAuth)`. Eso interceptaba cualquier
 * request que empezara con `/`, incluyendo las nuevas rutas
 * `/api/v1/*` (que en realidad son publicas o usan su propio
 * `apiAuth`). Lo dividimos en dos routers para que se puedan montar
 * en prefijos especificos (`/autos` y `/modificaciones`) y no
 * capturen las llamadas a la API v1.
 */

const autosMods = express.Router();
autosMods.use(requireAuth);
autosMods.get('/:autoId/modificaciones/new', modificacionesController.showCreate);
autosMods.post('/:autoId/modificaciones', validateModificacion, handleValidationErrors, modificacionesController.create);

const topLevelMods = express.Router();
topLevelMods.use(requireAuth);
topLevelMods.get('/:id/edit', modificacionesController.showEdit);
topLevelMods.put('/:id', validateModificacion, handleValidationErrors, modificacionesController.update);
topLevelMods.delete('/:id', modificacionesController.delete);

// Backward-compat: un router deprecado que sigue funcionando para
// quien lo monte en `/`. NO se usa desde src/app.js porque rompe
// el wiring de la API v1. Se exporta por compatibilidad historica.
router.use(requireAuth);
router.get('/autos/:autoId/modificaciones/new', modificacionesController.showCreate);
router.post('/autos/:autoId/modificaciones', validateModificacion, handleValidationErrors, modificacionesController.create);
router.get('/modificaciones/:id/edit', modificacionesController.showEdit);
router.put('/modificaciones/:id', validateModificacion, handleValidationErrors, modificacionesController.update);
router.delete('/modificaciones/:id', modificacionesController.delete);

module.exports = router;
module.exports.autosMods = autosMods;
module.exports.topLevelMods = topLevelMods;
