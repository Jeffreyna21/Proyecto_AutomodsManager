const { NotFoundError } = require('../../errors/DomainError');

/**
 * use case: listarModelosPorMarca
 *
 * Devuelve los modelos de una marca. Si la marca no existe (no
 * tiene modelos), devuelve 404 con envelope NOT_FOUND.
 *
 * @param {object} deps
 * @param {{ findMarcas: Function, findModelosByMarca: Function }} deps.catalogoRepository
 */
function buildListarModelosPorMarca({ catalogoRepository }) {
  return function listarModelosPorMarca(idMarca) {
    const marcas = catalogoRepository.findMarcas();
    const marca = marcas.find((m) => m.id === idMarca);
    if (!marca) {
      throw new NotFoundError('Marca no encontrada');
    }
    return catalogoRepository.findModelosByMarca(idMarca);
  };
}

module.exports = buildListarModelosPorMarca;
