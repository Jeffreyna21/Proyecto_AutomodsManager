/**
 * use case: listarMarcas
 *
 * Devuelve todas las marcas del catalogo, ordenadas por nombre.
 * Es publico: no requiere usuario.
 *
 * @param {object} deps
 * @param {{ findMarcas: Function }} deps.catalogoRepository
 */
function buildListarMarcas({ catalogoRepository }) {
  return function listarMarcas() {
    return catalogoRepository.findMarcas();
  };
}

module.exports = buildListarMarcas;
