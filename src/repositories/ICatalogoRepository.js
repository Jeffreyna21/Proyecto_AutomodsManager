const { createNotImplementedError } = require('./_notImplemented');

/**
 * @typedef {Object} MarcaDTO
 * @property {number} id
 * @property {string} nombre
 *
 * @typedef {Object} ModeloDTO
 * @property {number} id
 * @property {string} nombre
 * @property {number} id_marca
 *
 * @typedef {Object} TipoModificacionDTO
 * @property {number} id
 * @property {string} nombre
 */

class ICatalogoRepository {
  /** @returns {MarcaDTO[]} */
  findMarcas() { throw createNotImplementedError('ICatalogoRepository.findMarcas'); }

  /** @returns {ModeloDTO[]} */
  findModelosByMarca(idMarca) { throw createNotImplementedError('ICatalogoRepository.findModelosByMarca'); }

  /** @returns {TipoModificacionDTO[]} */
  findTiposModificacion() { throw createNotImplementedError('ICatalogoRepository.findTiposModificacion'); }
}

module.exports = ICatalogoRepository;
