const BaseRepository = require('./BaseRepository');

function rowToDto(row) {
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

class AnalisisRepository extends BaseRepository {
  constructor(db) {
    super();
    this.db = db;
  }

  findByAutoId(autoId) {
    const result = this.db.exec('SELECT * FROM analisis WHERE auto_id = ?', [autoId]);
    if (result.length > 0 && result[0].values.length > 0) {
      return rowToDto(result[0].values[0]);
    }
    return null;
  }

  upsert(autoId, metricas) {
    const existing = this.findByAutoId(autoId);
    if (existing) {
      this.db.run(
        `UPDATE analisis SET
          impacto_total = ?, costo_total = ?, numero_modificaciones = ?,
          promedio_mejora = ?, costo_beneficio = ?, indicador = ?,
          updated_at = CURRENT_TIMESTAMP
         WHERE auto_id = ?`,
        [
          metricas.impacto_total,
          metricas.costo_total,
          metricas.numero_modificaciones,
          metricas.promedio_mejora,
          metricas.costo_beneficio,
          metricas.indicador,
          autoId
        ]
      );
    } else {
      this.db.run(
        `INSERT INTO analisis
          (auto_id, impacto_total, costo_total, numero_modificaciones, promedio_mejora, costo_beneficio, indicador)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          autoId,
          metricas.impacto_total,
          metricas.costo_total,
          metricas.numero_modificaciones,
          metricas.promedio_mejora,
          metricas.costo_beneficio,
          metricas.indicador
        ]
      );
    }
    return this.findByAutoId(autoId);
  }
}

module.exports = AnalisisRepository;
