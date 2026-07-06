const { NotFoundError, InternalError } = require('../../errors/DomainError');

/**
 * use case: obtenerAnalisis
 *
 * Devuelve el analisis del auto con tres bloques:
 *  - metricas: totales, promedio, indicador (leidos de la fila analisis)
 *  - seriesEvolucion: impacto total agrupado por fecha
 *  - distribucionPorTipo: conteo de modificaciones por tipo
 *
 * Verifica ownership (404 existence-leak safe si el auto no existe
 * o no pertenece al usuario).
 *
 * @param {object} deps
 * @param {{ findById: Function }} deps.autoRepository
 * @param {{ canView: Function }} deps.autoPolicy
 * @param {{ findByAutoId: Function }} [deps.analisisRepository] - repositorio de la fila analisis
 * @param {{ findByAutoId: Function }} [deps.modificacionRepository] - repositorio de modificaciones
 * @param {{ calcularMetricas: Function }} [deps.analisisService] - opcional, para recalcular en linea
 */
function buildObtenerAnalisis({
  autoRepository,
  autoPolicy,
  analisisRepository,
  modificacionRepository,
  analisisService
}) {
  return function obtenerAnalisis(user, autoId) {
    if (!user || typeof user.id !== 'number') {
      throw new InternalError('obtenerAnalisis requiere user.id');
    }
    const auto = autoRepository.findById(autoId);
    if (!auto || !autoPolicy.canView(user, auto)) {
      throw new NotFoundError('Auto no encontrado');
    }
    // Leemos la fila analisis persistida (la mantiene el Observer)
    const metricas = analisisRepository
      ? analisisRepository.findByAutoId(autoId)
      : null;

    // Leemos las modificaciones para derivar las series y distribuciones
    const modificaciones = modificacionRepository
      ? modificacionRepository.findByAutoId(autoId)
      : [];

    // metricas: si la fila no existe (aun no se recalculo) usamos
    // un placeholder con `indicador: 'Sin datos'` para mantener el shape.
    const metricasNorm = metricas
      ? {
          impacto_total: metricas.impacto_total,
          costo_total: metricas.costo_total,
          numero_modificaciones: metricas.numero_modificaciones,
          promedio_mejora: metricas.promedio_mejora,
          costo_beneficio: metricas.costo_beneficio,
          indicador: metricas.indicador
        }
      : {
          impacto_total: 0,
          costo_total: 0,
          numero_modificaciones: 0,
          promedio_mejora: null,
          costo_beneficio: null,
          indicador: 'Sin datos'
        };

    const seriesEvolucion = computeSeriesEvolucion(modificaciones);
    const distribucionPorTipo = computeDistribucionPorTipo(modificaciones);

    return {
      metricas: metricasNorm,
      seriesEvolucion,
      distribucionPorTipo
    };
  };
}

/**
 * Agrupa el impacto por fecha y devuelve un array
 * `[{ fecha, impacto }, ...]` ordenado por fecha ascendente.
 */
function computeSeriesEvolucion(modificaciones) {
  const bucket = new Map();
  for (const mod of modificaciones) {
    const fecha = mod.fecha;
    const impacto = impactoValue(mod.nivel_impacto);
    bucket.set(fecha, (bucket.get(fecha) || 0) + impacto);
  }
  return Array.from(bucket.entries())
    .map(([fecha, impacto]) => ({ fecha, impacto }))
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
}

/**
 * Cuenta modificaciones por `id_tipo_modificacion` y devuelve
 * `[{ idTipoModificacion, tipo, cantidad }, ...]`.
 */
function computeDistribucionPorTipo(modificaciones) {
  const bucket = new Map();
  for (const mod of modificaciones) {
    const key = mod.id_tipo_modificacion;
    if (!bucket.has(key)) {
      bucket.set(key, { idTipoModificacion: key, tipo: mod.tipo, cantidad: 0 });
    }
    bucket.get(key).cantidad += 1;
  }
  return Array.from(bucket.values());
}

/**
 * Convierte el label de nivel de impacto (Bajo|Medio|Alto) a su
 * valor numerico (1|2|3). No depende del factory (puede recibir
 * una fila persistida con `nivel_impacto` o el DTO en camelCase).
 */
function impactoValue(label) {
  const k = String(label || '').toLowerCase();
  if (k === 'alto') return 3;
  if (k === 'medio') return 2;
  if (k === 'bajo') return 1;
  return 0;
}

module.exports = buildObtenerAnalisis;
