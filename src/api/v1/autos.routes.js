const express = require('express');
const { createAutoSchema, updateAutoSchema } = require('../schemas');
const apiAuth = require('../../middlewares/apiAuth');
const { ValidationError } = require('../../errors/DomainError');
const {
  buildListarAutos, buildObtenerAuto, buildCrearAuto,
  buildActualizarAuto, buildEliminarAuto
} = require('../../usecases/autos');

const router = express.Router();

/**
 * Convierte un ZodError en ValidationError con details formateados.
 */
function fromZodError(zodErr) {
  const details = (zodErr.issues || []).map((iss) => ({
    path: Array.isArray(iss.path) ? iss.path.join('.') : String(iss.path || ''),
    message: iss.message
  }));
  return new ValidationError('Datos inválidos', details);
}

function buildDeps(container) {
  return {
    listarAutos: buildListarAutos({
      autoRepository: container.repositories.auto,
      autoPolicy: container.policies.auto
    }),
    obtenerAuto: buildObtenerAuto({
      autoRepository: container.repositories.auto,
      autoPolicy: container.policies.auto
    }),
    crearAuto: buildCrearAuto({
      autoRepository: container.repositories.auto
    }),
    actualizarAuto: buildActualizarAuto({
      autoRepository: container.repositories.auto,
      autoPolicy: container.policies.auto
    }),
    eliminarAuto: buildEliminarAuto({
      autoRepository: container.repositories.auto,
      autoPolicy: container.policies.auto
    })
  };
}

// GET /api/v1/autos?page=N
router.get('/', apiAuth, (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const { listarAutos } = buildDeps(req.container);
    const result = listarAutos(req.user, page, 10);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/autos/:id
router.get('/:id', apiAuth, (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { obtenerAuto } = buildDeps(req.container);
    const auto = obtenerAuto(req.user, id);
    res.status(200).json({ auto });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/autos
router.post('/', apiAuth, (req, res, next) => {
  try {
    const parsed = createAutoSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(fromZodError(parsed.error));
    }
    const { crearAuto } = buildDeps(req.container);
    const auto = crearAuto(req.user, parsed.data);
    res.status(201).json({ auto });
  } catch (err) {
    next(err);
  }
});

// PUT /api/v1/autos/:id
router.put('/:id', apiAuth, (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const parsed = updateAutoSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(fromZodError(parsed.error));
    }
    const { actualizarAuto } = buildDeps(req.container);
    const auto = actualizarAuto(req.user, id, parsed.data);
    res.status(200).json({ auto });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/v1/autos/:id
router.delete('/:id', apiAuth, (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { eliminarAuto } = buildDeps(req.container);
    eliminarAuto(req.user, id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
