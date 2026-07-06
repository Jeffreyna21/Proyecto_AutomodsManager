const express = require('express');
const { createModificacionSchema, updateModificacionSchema } = require('../schemas');
const apiAuth = require('../../middlewares/apiAuth');
const { ValidationError } = require('../../errors/DomainError');
const {
  buildListarModificaciones, buildCrearModificacion,
  buildActualizarModificacion, buildEliminarModificacion
} = require('../../usecases/modificaciones');

const router = express.Router();

function fromZodError(zodErr) {
  const details = (zodErr.issues || []).map((iss) => ({
    path: Array.isArray(iss.path) ? iss.path.join('.') : String(iss.path || ''),
    message: iss.message
  }));
  return new ValidationError('Datos inválidos', details);
}

function buildDeps(container) {
  const repos = container.repositories;
  return {
    listarModificaciones: buildListarModificaciones({
      autoRepository: repos.auto,
      modificacionRepository: repos.modificacion,
      autoPolicy: container.policies.auto
    }),
    crearModificacion: buildCrearModificacion({
      autoRepository: repos.auto,
      modificacionRepository: repos.modificacion,
      autoPolicy: container.policies.auto
    }),
    actualizarModificacion: buildActualizarModificacion({
      autoRepository: repos.auto,
      modificacionRepository: repos.modificacion,
      autoPolicy: container.policies.auto
    }),
    eliminarModificacion: buildEliminarModificacion({
      autoRepository: repos.auto,
      modificacionRepository: repos.modificacion,
      autoPolicy: container.policies.auto
    })
  };
}

// GET /api/v1/autos/:id/modificaciones
router.get('/autos/:id/modificaciones', apiAuth, (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { listarModificaciones } = buildDeps(req.container);
    const items = listarModificaciones(req.user, id);
    res.status(200).json({ items });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/autos/:id/modificaciones
router.post('/autos/:id/modificaciones', apiAuth, (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const parsed = createModificacionSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(fromZodError(parsed.error));
    }
    const { crearModificacion } = buildDeps(req.container);
    const modificacion = crearModificacion(req.user, id, parsed.data);
    res.status(201).json({ modificacion });
  } catch (err) {
    next(err);
  }
});

// PUT /api/v1/modificaciones/:id
router.put('/modificaciones/:id', apiAuth, (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const parsed = updateModificacionSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(fromZodError(parsed.error));
    }
    const { actualizarModificacion } = buildDeps(req.container);
    // Mapear campos del schema (camelCase) al shape del repositorio (camelCase OK)
    const patch = {
      ...parsed.data,
      // El repo espera `nivelImpacto` (camelCase) y `idTipoModificacion`
      nivelImpacto: parsed.data.nivelImpacto,
      idTipoModificacion: parsed.data.idTipoModificacion
    };
    const modificacion = actualizarModificacion(req.user, id, patch);
    res.status(200).json({ modificacion });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/v1/modificaciones/:id
router.delete('/modificaciones/:id', apiAuth, (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { eliminarModificacion } = buildDeps(req.container);
    eliminarModificacion(req.user, id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
