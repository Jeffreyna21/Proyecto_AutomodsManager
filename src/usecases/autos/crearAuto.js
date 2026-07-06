const { ConflictError, InternalError } = require('../../errors/DomainError');

/**
 * use case: crearAuto
 *
 * Valida el formato y la unicidad de la placa, y delega la inserción al
 * repositorio. Devuelve el DTO del auto creado.
 *
 * @param {object} deps
 * @param {{ existsPlacaForUsuario: Function, create: Function }} deps.autoRepository
 */
function buildCrearAuto({ autoRepository }) {
  return function crearAuto(user, { placa, idMarca, idModelo, anio, color }) {
    if (!user || typeof user.id !== 'number') {
      throw new InternalError('crearAuto requiere user.id');
    }
    // El Zod schema ya normalizó la placa. Validamos unicidad con el repo.
    if (autoRepository.existsPlacaForUsuario(placa, user.id)) {
      throw new ConflictError('Ya tienes un vehículo registrado con esta placa');
    }
    return autoRepository.create({
      placa,
      idMarca,
      idModelo,
      anio,
      color: color || null,
      idUsuario: user.id
    });
  };
}

module.exports = buildCrearAuto;
