const { createNotImplementedError } = require('./_notImplemented');

/**
 * @typedef {Object} AnalisisDTO
 * @property {number} id
 * @property {number} auto_id
 * @property {number} impacto_total
 * @property {number} costo_total
 * @property {number} numero_modificaciones
 * @property {number|null} promedio_mejora
 * @property {number|null} costo_beneficio
 * @property {string} indicador
 * @property {string} updated_at
 */

class IAnalisisRepository {
  /** @returns {AnalisisDTO | null} */
  findByAutoId(autoId) { throw createNotImplementedError('IAnalisisRepository.findByAutoId'); }

  /** @returns {AnalisisDTO} */
  upsert(autoId, metricas) { throw createNotImplementedError('IAnalisisRepository.upsert'); }
}

module.exports = IAnalisisRepository;
