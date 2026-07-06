const { NotFoundError, InternalError } = require('../../errors/DomainError');

/**
 * use case: listarModificaciones
 *
 * Devuelve la lista de modificaciones del auto. Verifica ownership
 * (existence-leak safe: si el auto no existe o no pertenece al
 * usuario, lanza 404).
 *
 * @param {object} deps
 * @param {{ findById: Function }} deps.autoRepository
 * @param {{ findByAutoId: Function }} deps.modificacionRepository
 * @param {{ canView: Function }} deps.autoPolicy
 */
function buildListarModificaciones({ autoRepository, modificacionRepository, autoPolicy }) {
  return function listarModificaciones(user, autoId) {
    if (!user || typeof user.id !== 'number') {
      throw new InternalError('listarModificaciones requiere user.id');
    }
    const auto = autoRepository.findById(autoId);
    if (!auto || !autoPolicy.canView(user, auto)) {
      throw new NotFoundError('Auto no encontrado');
    }
    return modificacionRepository.findByAutoId(autoId);
  };
}

module.exports = buildListarModificaciones;
