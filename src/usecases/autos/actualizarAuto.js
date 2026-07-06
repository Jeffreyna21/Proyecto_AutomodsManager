const { NotFoundError, ConflictError, InternalError } = require('../../errors/DomainError');

/**
 * use case: actualizarAuto
 *
 * Aplica un patch sobre el auto del usuario. Ownership se valida
 * primero; si la placa nueva ya está en uso por otro auto del mismo
 * usuario, devuelve 409.
 *
 * @param {object} deps
 * @param {{ findById: Function, existsPlacaForUsuario: Function, update: Function }} deps.autoRepository
 * @param {{ canView: Function }} deps.autoPolicy
 */
function buildActualizarAuto({ autoRepository, autoPolicy }) {
  return function actualizarAuto(user, id, patch) {
    if (!user || typeof user.id !== 'number') {
      throw new InternalError('actualizarAuto requiere user.id');
    }
    const current = autoRepository.findById(id);
    if (!current || !autoPolicy.canView(user, current)) {
      throw new NotFoundError('Auto no encontrado');
    }
    if (patch.placa !== undefined && patch.placa !== current.placa) {
      if (autoRepository.existsPlacaForUsuario(patch.placa, user.id, id)) {
        throw new ConflictError('Ya tienes un vehículo registrado con esta placa');
      }
    }
    return autoRepository.update(id, patch);
  };
}

module.exports = buildActualizarAuto;
