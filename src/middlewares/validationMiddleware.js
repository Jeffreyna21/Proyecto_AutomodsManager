const { body, validationResult } = require('express-validator');

const validateAuto = [
  body('placa')
    .trim()
    .notEmpty()
    .withMessage('La placa es obligatoria'),
  body('id_marca')
    .isInt({ min: 1 })
    .withMessage('Debe seleccionar una marca'),
  body('id_modelo')
    .isInt({ min: 1 })
    .withMessage('Debe seleccionar un modelo'),
  body('anio')
    .isInt({ min: 1900, max: 2100 })
    .withMessage('El año debe ser un número entre 1900 y 2100')
];

const validateModificacion = [
  body('nombre')
    .trim()
    .notEmpty()
    .withMessage('El nombre de la modificación es obligatorio')
    .isLength({ max: 100 })
    .withMessage('El nombre no puede exceder 100 caracteres'),
  body('costo')
    .isFloat({ gt: 0 })
    .withMessage('El costo debe ser un número mayor a 0'),
  body('nivel_impacto')
    .isIn(['Bajo', 'Medio', 'Alto'])
    .withMessage('El nivel de impacto debe ser Bajo, Medio o Alto'),
  body('fecha')
    .isDate()
    .withMessage('La fecha es obligatoria y debe tener formato válido')
    .custom((value) => {
      const fecha = new Date(value);
      const hoy = new Date();
      hoy.setHours(23, 59, 59, 999);
      if (fecha > hoy) {
        throw new Error('La fecha no puede ser futura');
      }
      return true;
    }),
  body('id_tipo_modificacion')
    .isInt({ min: 1 })
    .withMessage('Debe seleccionar un tipo de modificación')
];

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    errors.array().forEach(error => {
      req.flash('error', error.msg);
    });
    return res.redirect('back');
  }
  next();
};

module.exports = {
  validateAuto,
  validateModificacion,
  handleValidationErrors
};
