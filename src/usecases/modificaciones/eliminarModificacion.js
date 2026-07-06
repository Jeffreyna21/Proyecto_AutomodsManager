const { NotFoundError, InternalError } = require('../../errors/DomainError');

/**
 * use case: eliminarModificacion
 *
 * Verifica ownership vía auto padre y borra la modificación. El
 * Observer recalcula el análisis como efecto colateral.
 *
 * @param {object} deps
 * @param {{ findById: Function, delete: Function }} deps.modificacionRepository
 * @param {{ findById: Function }} deps.autoRepository
 * @param {{ canView: Function }} deps.autoPolicy
 */
function buildEliminarModificacion({ modificacionRepository, autoRepository, autoPolicy }) {
  return function eliminarModificacion(user, id) {
    if (!user || typeof user.id !== 'number') {
      throw new InternalError('eliminarModificacion requiere user.id');
    }
    const mod = modificacionRepository.findById(id);
    if (!mod) {
      throw new NotFoundError('Modificación no encontrada');
    }
    const auto = autoRepository.findById(mod.auto_id);
    if (!auto || !autoPolicy.canView(user, auto)) {
      throw new NotFoundError('Modificación no encontrada');
    }
    return modificacionRepository.delete(id);
  };
}

module.exports = buildEliminarModificacion;
