const { z } = require('zod');

/**
 * Esquemas de validación para los endpoints /api/v1.
 *
 * Todos los mensajes de error son en español (target académico) y se
 * exponen al cliente en el campo `details` del envelope de error.
 *
 * Convenciones:
 *   - `safeParse(input)` se usa en los middlewares para no lanzar
 *     excepciones; un fallo de validación se convierte en ValidationError
 *     con el `code: 'VALIDATION_ERROR'` y `details: [{ path, message }]`.
 *   - Los `path` de los issues se serializan como string (separados por
 *     punto) para mantener el contrato del envelope estable.
 */

// --- Auth ---

const loginSchema = z.object({
  username: z.string({ message: 'El nombre de usuario es obligatorio' })
    .trim()
    .min(1, 'El nombre de usuario es obligatorio'),
  password: z.string({ message: 'La contraseña es obligatoria' })
    .min(1, 'La contraseña es obligatoria')
}).strict();

// --- Autos ---

// Formato Ecuador: 3 letras + guion opcional + 3 o 4 dígitos (ej. PCA-1234, ABC1234)
const PLACA_REGEX = /^[A-Z]{3}-?\d{3,4}$/;

const placaField = z.string({ message: 'La placa es obligatoria' })
  .trim()
  .min(1, 'La placa es obligatoria')
  .transform((v) => v.toUpperCase().replace(/-/g, ''))
  .refine((v) => PLACA_REGEX.test(v), {
    message: 'Formato de placa inválido. Debe ser 3 letras + 3 o 4 dígitos (ej. PCA-1234)'
  });

const idMarcaField = z.coerce.number({ message: 'idMarca debe ser numérico' })
  .int('idMarca debe ser un entero')
  .positive('idMarca debe ser positivo');

const idModeloField = z.coerce.number({ message: 'idModelo debe ser numérico' })
  .int('idModelo debe ser un entero')
  .positive('idModelo debe ser positivo');

const anioField = z.coerce.number({ message: 'El año debe ser numérico' })
  .int('El año debe ser un entero')
  .min(1900, 'El año debe ser al menos 1900')
  .max(2100, 'El año debe ser como máximo 2100');

const colorField = z.string({ message: 'El color debe ser texto' })
  .trim()
  .min(1)
  .max(50)
  .optional();

const createAutoSchema = z.object({
  placa: placaField,
  idMarca: idMarcaField,
  idModelo: idModeloField,
  anio: anioField,
  color: colorField
}).strict();

const updateAutoSchema = z.object({
  placa: placaField.optional(),
  idMarca: idMarcaField.optional(),
  idModelo: idModeloField.optional(),
  anio: anioField.optional(),
  color: colorField
}).strict().refine(
  (obj) => Object.keys(obj).length > 0,
  { message: 'Debe enviar al menos un campo para actualizar' }
);

// --- Modificaciones ---

const NIVEL_IMPACTO = z.enum(['Bajo', 'Medio', 'Alto'], {
  message: 'nivelImpacto debe ser "Bajo", "Medio" o "Alto"'
});

const nombreField = z.string({ message: 'El nombre es obligatorio' })
  .trim()
  .min(1, 'El nombre es obligatorio')
  .max(100, 'El nombre no puede tener más de 100 caracteres');

const descripcionField = z.string({ message: 'La descripción debe ser texto' })
  .trim()
  .max(500, 'La descripción no puede tener más de 500 caracteres')
  .optional()
  .nullable();

const costoField = z.coerce.number({ message: 'El costo debe ser numérico' })
  .positive('El costo debe ser mayor a cero');

const fechaField = z.string({ message: 'La fecha es obligatoria' })
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha debe tener formato AAAA-MM-DD');

const idTipoModificacionField = z.coerce.number({ message: 'idTipoModificacion debe ser numérico' })
  .int('idTipoModificacion debe ser un entero')
  .positive('idTipoModificacion debe ser positivo');

const createModificacionSchema = z.object({
  nombre: nombreField,
  descripcion: descripcionField,
  costo: costoField,
  nivelImpacto: NIVEL_IMPACTO,
  fecha: fechaField,
  idTipoModificacion: idTipoModificacionField
}).strict();

const updateModificacionSchema = z.object({
  nombre: nombreField.optional(),
  descripcion: descripcionField,
  costo: costoField.optional(),
  nivelImpacto: NIVEL_IMPACTO.optional(),
  fecha: fechaField.optional(),
  idTipoModificacion: idTipoModificacionField.optional()
}).strict().refine(
  (obj) => Object.keys(obj).length > 0,
  { message: 'Debe enviar al menos un campo para actualizar' }
);

module.exports = {
  loginSchema,
  createAutoSchema,
  updateAutoSchema,
  createModificacionSchema,
  updateModificacionSchema
};
