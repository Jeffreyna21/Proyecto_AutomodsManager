const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middlewares/authMiddleware');
const { marcaModel, modeloModel } = require('../models/catalogoModel');

router.use(requireAuth);

// GET /api/marcas/:id/modelos — devuelve modelos asociados a una marca
router.get('/marcas/:id/modelos', (req, res) => {
  try {
    const { id } = req.params;
    const marca = marcaModel.getById(parseInt(id));

    if (!marca) {
      return res.status(404).json({ error: 'Marca no encontrada' });
    }

    const modelos = modeloModel.getByMarcaId(parseInt(id));
    res.json(modelos);
  } catch (error) {
    console.error('Error al obtener modelos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
