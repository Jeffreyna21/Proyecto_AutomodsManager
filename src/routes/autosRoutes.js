const express = require('express');
const router = express.Router();
const autosController = require('../controllers/autosController');
const { requireAuth } = require('../middlewares/authMiddleware');
const { validateAuto, handleValidationErrors } = require('../middlewares/validationMiddleware');

router.use(requireAuth);

router.get('/', autosController.index);
router.get('/new', autosController.showCreate);
router.post('/', validateAuto, handleValidationErrors, autosController.create);
router.get('/:id', autosController.show);
router.get('/:id/analisis', autosController.showAnalisis);
router.get('/:id/edit', autosController.showEdit);
router.put('/:id', validateAuto, handleValidationErrors, autosController.update);
router.delete('/:id', autosController.delete);

module.exports = router;
