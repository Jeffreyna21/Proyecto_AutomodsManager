const express = require('express');
const router = express.Router();
const modificacionesController = require('../controllers/modificacionesController');
const { requireAuth } = require('../middlewares/authMiddleware');
const { validateModificacion, handleValidationErrors } = require('../middlewares/validationMiddleware');

router.use(requireAuth);

router.get('/autos/:autoId/modificaciones/new', modificacionesController.showCreate);
router.post('/autos/:autoId/modificaciones', validateModificacion, handleValidationErrors, modificacionesController.create);
router.get('/modificaciones/:id/edit', modificacionesController.showEdit);
router.put('/modificaciones/:id', validateModificacion, handleValidationErrors, modificacionesController.update);
router.delete('/modificaciones/:id', modificacionesController.delete);

module.exports = router;
