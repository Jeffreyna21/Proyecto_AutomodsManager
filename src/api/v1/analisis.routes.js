const express = require('express');
const apiAuth = require('../../middlewares/apiAuth');
const { buildObtenerAnalisis } = require('../../usecases/analisis');

const router = express.Router();

function buildDeps(container) {
  return {
    obtenerAnalisis: buildObtenerAnalisis({
      autoRepository: container.repositories.auto,
      autoPolicy: container.policies.auto,
      analisisRepository: container.repositories.analisis,
      modificacionRepository: container.repositories.modificacion
    })
  };
}

/**
 * GET /api/v1/autos/:id/analisis
 *
 * Devuelve el analisis (metricas + series + distribucion) del auto.
 * Requiere sesion; verifica ownership (404 existence-leak safe).
 */
router.get('/autos/:id/analisis', apiAuth, (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { obtenerAnalisis } = buildDeps(req.container);
    const analisis = obtenerAnalisis(req.user, id);
    res.status(200).json({ analisis });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
