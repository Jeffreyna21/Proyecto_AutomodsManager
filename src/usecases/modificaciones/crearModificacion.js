const { NotFoundError, InternalError } = require('../../errors/DomainError');

/**
 * use case: crearModificacion
 *
 * Crea una modificación en el auto del usuario. El Observer
 * (AnalisisRecalcObserver) recalcula el análisis automáticamente
 * porque ModificacionRepository emite el evento MODIFICACION_CREATED.
 *
 * @param {object} deps
 * @param {{ findById: Function }} deps.autoRepository
 * @param {{ create: Function }} deps.modificacionRepository
 * @param {{ canView: Function }} deps.autoPolicy
 */
function buildCrearModificacion({ autoRepository, modificacionRepository, autoPolicy }) {
  return function crearModificacion(user, autoId, body) {
    if (!user || typeof user.id !== 'number') {
      throw new InternalError('crearModificacion requiere user.id');
    }
    const auto = autoRepository.findById(autoId);
    if (!auto || !autoPolicy.canView(user, auto)) {
      throw new NotFoundError('Auto no encontrado');
    }
    return modificacionRepository.create({
      nombre: body.nombre,
      descripcion: body.descripcion || null,
      costo: body.costo,
      nivelImpacto: body.nivelImpacto,
      fecha: body.fecha,
      autoId,
      idTipoModificacion: body.idTipoModificacion
    });
  };
}

module.exports = buildCrearModificacion;
