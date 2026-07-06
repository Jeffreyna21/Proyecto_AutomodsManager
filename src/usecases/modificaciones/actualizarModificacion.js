const { NotFoundError, InternalError } = require('../../errors/DomainError');

/**
 * use case: actualizarModificacion
 *
 * Aplica un patch sobre la modificación indicada. Verifica ownership
 * a través del auto padre (la ModificacionPolicy exige un join con
 * el auto en el DTO; aquí el repositorio no lo carga por defecto, así
 * que hacemos la verificación manualmente).
 *
 * @param {object} deps
 * @param {{ findById: Function }} deps.modificacionRepository
 * @param {{ findById: Function }} deps.autoRepository
 * @param {{ canView: Function }} deps.autoPolicy
 */
function buildActualizarModificacion({ modificacionRepository, autoRepository, autoPolicy }) {
  return function actualizarModificacion(user, id, patch) {
    if (!user || typeof user.id !== 'number') {
      throw new InternalError('actualizarModificacion requiere user.id');
    }
    const mod = modificacionRepository.findById(id);
    if (!mod) {
      throw new NotFoundError('Modificación no encontrada');
    }
    const auto = autoRepository.findById(mod.auto_id);
    if (!auto || !autoPolicy.canView(user, auto)) {
      throw new NotFoundError('Modificación no encontrada');
    }
    return modificacionRepository.update(id, patch);
  };
}

module.exports = buildActualizarModificacion;
