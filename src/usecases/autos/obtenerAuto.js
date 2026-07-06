const { NotFoundError, InternalError } = require('../../errors/DomainError');

/**
 * use case: obtenerAuto
 *
 * Devuelve el DTO de un auto por id. Si no existe o no pertenece al
 * usuario, lanza `NotFoundError` (existence-leak safe).
 *
 * @param {object} deps
 * @param {{ findById: Function }} deps.autoRepository
 * @param {{ canView: Function }} deps.autoPolicy
 */
function buildObtenerAuto({ autoRepository, autoPolicy }) {
  return function obtenerAuto(user, id) {
    if (!user || typeof user.id !== 'number') {
      throw new InternalError('obtenerAuto requiere user.id');
    }
    const auto = autoRepository.findById(id);
    if (!auto || !autoPolicy.canView(user, auto)) {
      throw new NotFoundError('Auto no encontrado');
    }
    return auto;
  };
}

module.exports = buildObtenerAuto;
