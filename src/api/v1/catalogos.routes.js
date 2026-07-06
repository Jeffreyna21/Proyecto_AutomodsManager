const express = require('express');
const { idMarcaPathSchema } = require('../schemas');
const { ValidationError } = require('../../errors/DomainError');
const {
  buildListarMarcas,
  buildListarModelosPorMarca,
  buildListarTiposModificacion
} = require('../../usecases/catalogos');

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
    listarMarcas: buildListarMarcas({
      catalogoRepository: container.repositories.catalogo
    }),
    listarModelosPorMarca: buildListarModelosPorMarca({
      catalogoRepository: container.repositories.catalogo
    }),
    listarTiposModificacion: buildListarTiposModificacion({
      catalogoRepository: container.repositories.catalogo
    })
  };
}

/**
 * GET /api/v1/marcas — publico
 */
router.get('/marcas', (req, res, next) => {
  try {
    const { listarMarcas } = buildDeps(req.container);
    const marcas = listarMarcas();
    res.status(200).json(marcas);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/marcas/:id/modelos — publico
 */
router.get('/marcas/:id/modelos', (req, res, next) => {
  try {
    const parsed = idMarcaPathSchema.safeParse(req.params.id);
    if (!parsed.success) {
      return next(fromZodError(parsed.error));
    }
    const { listarModelosPorMarca } = buildDeps(req.container);
    const modelos = listarModelosPorMarca(parsed.data);
    res.status(200).json(modelos);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/tipos-modificacion — publico
 */
router.get('/tipos-modificacion', (req, res, next) => {
  try {
    const { listarTiposModificacion } = buildDeps(req.container);
    const tipos = listarTiposModificacion();
    res.status(200).json(tipos);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
