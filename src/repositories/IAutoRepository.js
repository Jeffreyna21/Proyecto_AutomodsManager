const { createNotImplementedError } = require('./_notImplemented');

/**
 * @typedef {Object} AutoCreateInput
 * @property {string} placa
 * @property {number} idMarca
 * @property {number} idModelo
 * @property {number} anio
 * @property {number} idUsuario
 * @property {string} [color]
 */

/**
 * @typedef {Object} AutoUpdateInput
 * @property {string} [placa]
 * @property {number} [idMarca]
 * @property {number} [idModelo]
 * @property {number} [anio]
 * @property {string} [color]
 */

/**
 * @typedef {Object} AutoDTO
 * @property {number} id
 * @property {string} placa
 * @property {number} anio
 * @property {number} id_usuario
 * @property {string} created_at
 * @property {string} marca
 * @property {string} modelo
 * @property {number} id_marca
 * @property {number} id_modelo
 * @property {string} [color]
 */

class IAutoRepository {
  /** @returns {AutoDTO | null} */
  findById(id) { throw createNotImplementedError('IAutoRepository.findById'); }

  /** @returns {AutoDTO[]} */
  findAllByUsuario(idUsuario, limit, offset) { throw createNotImplementedError('IAutoRepository.findAllByUsuario'); }

  /** @returns {AutoDTO} */
  create(input) { throw createNotImplementedError('IAutoRepository.create'); }

  /** @returns {AutoDTO | null} */
  update(id, input) { throw createNotImplementedError('IAutoRepository.update'); }

  /** @returns {number} number of rows deleted */
  delete(id) { throw createNotImplementedError('IAutoRepository.delete'); }

  /** @returns {boolean} */
  existsPlacaForUsuario(placa, idUsuario, excludeId) { throw createNotImplementedError('IAutoRepository.existsPlacaForUsuario'); }

  /** @returns {number} */
  countByUsuario(idUsuario) { throw createNotImplementedError('IAutoRepository.countByUsuario'); }
}

module.exports = IAutoRepository;
