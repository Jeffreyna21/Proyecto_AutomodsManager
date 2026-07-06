const { createNotImplementedError } = require('./_notImplemented');

/**
 * @typedef {Object} UsuarioDTO
 * @property {number} id
 * @property {string} username
 * @property {string} password
 * @property {string} created_at
 */

class IUsuarioRepository {
  /** @returns {UsuarioDTO | null} */
  findById(id) { throw createNotImplementedError('IUsuarioRepository.findById'); }

  /** @returns {UsuarioDTO | null} */
  findByUsername(username) { throw createNotImplementedError('IUsuarioRepository.findByUsername'); }
}

module.exports = IUsuarioRepository;
