/**
 * use case: listarTiposModificacion
 *
 * Devuelve todos los tipos de modificacion del catalogo. Es publico.
 *
 * @param {object} deps
 * @param {{ findTiposModificacion: Function }} deps.catalogoRepository
 */
function buildListarTiposModificacion({ catalogoRepository }) {
  return function listarTiposModificacion() {
    return catalogoRepository.findTiposModificacion();
  };
}

module.exports = buildListarTiposModificacion;
