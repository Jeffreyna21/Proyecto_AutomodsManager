const { createNotImplementedError } = require('./_notImplemented');

/**
 * @typedef {Object} ModificacionCreateInput
 * @property {string} nombre
 * @property {string} [descripcion]
 * @property {number} costo
 * @property {'Bajo'|'Medio'|'Alto'} nivelImpacto
 * @property {string} fecha
 * @property {number} autoId
 * @property {number} idTipoModificacion
 */

/**
 * @typedef {Object} ModificacionDTO
 * @property {number} id
 * @property {string} nombre
 * @property {string|null} descripcion
 * @property {number} costo
 * @property {string} nivel_impacto
 * @property {string} fecha
 * @property {number} auto_id
 * @property {number} id_tipo_modificacion
 * @property {string} created_at
 * @property {string} tipo
 */

class IModificacionRepository {
  /** @returns {ModificacionDTO | null} */
  findById(id) { throw createNotImplementedError('IModificacionRepository.findById'); }

  /** @returns {ModificacionDTO[]} */
  findByAutoId(autoId) { throw createNotImplementedError('IModificacionRepository.findByAutoId'); }

  /** @returns {ModificacionDTO} */
  create(input) { throw createNotImplementedError('IModificacionRepository.create'); }

  /** @returns {ModificacionDTO | null} */
  update(id, input) { throw createNotImplementedError('IModificacionRepository.update'); }

  /** @returns {number} number of rows deleted */
  delete(id) { throw createNotImplementedError('IModificacionRepository.delete'); }
}

module.exports = IModificacionRepository;
