const { NotFoundError, InternalError } = require('../../errors/DomainError');

/**
 * use case: eliminarAuto
 *
 * Verifica ownership y luego borra el auto. El borrado es en cascada
 * (las modificaciones y el analisis del auto se eliminan por el
 * `ON DELETE CASCADE` del schema).
 *
 * @param {object} deps
 * @param {{ findById: Function, delete: Function }} deps.autoRepository
 * @param {{ canDelete: Function }} deps.autoPolicy
 */
function buildEliminarAuto({ autoRepository, autoPolicy }) {
  return function eliminarAuto(user, id) {
    if (!user || typeof user.id !== 'number') {
      throw new InternalError('eliminarAuto requiere user.id');
    }
    const current = autoRepository.findById(id);
    if (!current || !autoPolicy.canDelete(user, current)) {
      throw new NotFoundError('Auto no encontrado');
    }
    return autoRepository.delete(id);
  };
}

module.exports = buildEliminarAuto;
