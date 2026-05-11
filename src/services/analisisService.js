// Servicio de análisis — Capa de dominio
// Calcula métricas de rendimiento de un vehículo según sus modificaciones

const { getDB, saveDB } = require('../models/db');

const VALOR_IMPACTO = {
  'Bajo': 1,
  'Medio': 2,
  'Alto': 3
};

const analisisService = {
  /**
   * Calcula las métricas de un vehículo a partir de sus modificaciones
   * @param {Array} modificaciones - Lista de modificaciones del vehículo
   * @returns {Object} Métricas calculadas
   */
  calcularMetricas: (modificaciones) => {
    const N = modificaciones.length;

    if (N === 0) {
      return {
        impacto_total: 0,
        costo_total: 0,
        numero_modificaciones: 0,
        promedio_mejora: null,
        costo_beneficio: null,
        indicador: 'Sin datos'
      };
    }

    const impacto_total = modificaciones.reduce((sum, mod) => {
      return sum + (VALOR_IMPACTO[mod.nivel_impacto] || 0);
    }, 0);

    const costo_total = modificaciones.reduce((sum, mod) => {
      return sum + parseFloat(mod.costo);
    }, 0);

    const promedio_mejora = impacto_total / N;

    let costo_beneficio = null;
    if (costo_total > 0) {
      costo_beneficio = impacto_total / costo_total;
    }

    let indicador;
    if (promedio_mejora < 1.5) {
      indicador = 'Deficiente';
    } else if (promedio_mejora < 2.5) {
      indicador = 'Regular';
    } else {
      indicador = 'Excelente';
    }

    return {
      impacto_total,
      costo_total,
      numero_modificaciones: N,
      promedio_mejora,
      costo_beneficio,
      indicador
    };
  },

  /**
   * Recalcula y persiste el análisis de un vehículo
   * @param {number} autoId - ID del vehículo
   * @param {Array} modificaciones - Lista de modificaciones del vehículo
   */
  recalcular: (autoId, modificaciones) => {
    const metricas = analisisService.calcularMetricas(modificaciones);
    const db = getDB();

    // Verificar si ya existe un análisis para este auto
    const existente = db.exec('SELECT id FROM analisis WHERE auto_id = ?', [autoId]);

    if (existente.length > 0 && existente[0].values.length > 0) {
      // Actualizar
      db.run(`
        UPDATE analisis SET
          impacto_total = ?,
          costo_total = ?,
          numero_modificaciones = ?,
          promedio_mejora = ?,
          costo_beneficio = ?,
          indicador = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE auto_id = ?
      `, [
        metricas.impacto_total,
        metricas.costo_total,
        metricas.numero_modificaciones,
        metricas.promedio_mejora,
        metricas.costo_beneficio,
        metricas.indicador,
        autoId
      ]);
    } else {
      // Insertar
      db.run(`
        INSERT INTO analisis (auto_id, impacto_total, costo_total, numero_modificaciones, promedio_mejora, costo_beneficio, indicador)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        autoId,
        metricas.impacto_total,
        metricas.costo_total,
        metricas.numero_modificaciones,
        metricas.promedio_mejora,
        metricas.costo_beneficio,
        metricas.indicador
      ]);
    }

    saveDB();
    return metricas;
  },

  /**
   * Obtiene el análisis de un vehículo
   * @param {number} autoId - ID del vehículo
   * @returns {Object|null} Análisis del vehículo
   */
  getByAutoId: (autoId) => {
    const db = getDB();
    const result = db.exec('SELECT * FROM analisis WHERE auto_id = ?', [autoId]);
    if (result.length > 0 && result[0].values.length > 0) {
      const row = result[0].values[0];
      return {
        id: row[0],
        auto_id: row[1],
        impacto_total: row[2],
        costo_total: row[3],
        numero_modificaciones: row[4],
        promedio_mejora: row[5],
        costo_beneficio: row[6],
        indicador: row[7],
        updated_at: row[8]
      };
    }
    return null;
  }
};

module.exports = analisisService;
