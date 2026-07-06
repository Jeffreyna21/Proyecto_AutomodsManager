const { InternalError } = require('../../errors/DomainError');

/**
 * use case: listarAutos
 *
 * Devuelve la lista paginada de autos del usuario autenticado, junto
 * con la metadata de paginación.
 *
 * @param {object} deps
 * @param {{ findAllByUsuario: Function, countByUsuario: Function }} deps.autoRepository
 * @param {{ canView: Function }} deps.autoPolicy
 * @returns {(user: {id:number}, page: number, pageSize: number) => { items: any[], page: number, totalPages: number }}
 */
function buildListarAutos({ autoRepository, autoPolicy }) {
  return function listarAutos(user, page = 1, pageSize = 10) {
    if (!user || typeof user.id !== 'number') {
      throw new InternalError('listarAutos requiere user.id');
    }
    const offset = (Math.max(1, page) - 1) * pageSize;
    const items = autoRepository.findAllByUsuario(user.id, pageSize, offset);
    const total = autoRepository.countByUsuario(user.id);
    return {
      items,
      page,
      totalPages: Math.ceil(total / pageSize) || 0
    };
  };
}

module.exports = buildListarAutos;
