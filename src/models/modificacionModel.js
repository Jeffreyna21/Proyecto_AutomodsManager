const { getDB, saveDB } = require('./db');

const modificacionModel = {
  getByAutoId: (autoId) => {
    const db = getDB();
    const result = db.exec(`
      SELECT m.id, m.nombre, m.descripcion, m.costo, m.nivel_impacto,
             m.fecha, m.auto_id, m.id_tipo_modificacion, m.created_at,
             t.nombre AS tipo
      FROM modificaciones m
      JOIN tipos_modificacion t ON m.id_tipo_modificacion = t.id
      WHERE m.auto_id = ?
      ORDER BY m.fecha DESC
    `, [autoId]);
    return result.length > 0 ? result[0].values.map(row => ({
      id: row[0],
      nombre: row[1],
      descripcion: row[2],
      costo: row[3],
      nivel_impacto: row[4],
      fecha: row[5],
      auto_id: row[6],
      id_tipo_modificacion: row[7],
      created_at: row[8],
      tipo: row[9]
    })) : [];
  },

  getById: (id) => {
    const db = getDB();
    const result = db.exec(`
      SELECT m.id, m.nombre, m.descripcion, m.costo, m.nivel_impacto,
             m.fecha, m.auto_id, m.id_tipo_modificacion, m.created_at,
             t.nombre AS tipo
      FROM modificaciones m
      JOIN tipos_modificacion t ON m.id_tipo_modificacion = t.id
      WHERE m.id = ?
    `, [id]);
    if (result.length > 0 && result[0].values.length > 0) {
      const row = result[0].values[0];
      return {
        id: row[0],
        nombre: row[1],
        descripcion: row[2],
        costo: row[3],
        nivel_impacto: row[4],
        fecha: row[5],
        auto_id: row[6],
        id_tipo_modificacion: row[7],
        created_at: row[8],
        tipo: row[9]
      };
    }
    return null;
  },

  create: (nombre, descripcion, costo, nivelImpacto, fecha, autoId, idTipoModificacion) => {
    const db = getDB();
    db.run(
      `INSERT INTO modificaciones (nombre, descripcion, costo, nivel_impacto, fecha, auto_id, id_tipo_modificacion)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [nombre, descripcion, costo, nivelImpacto, fecha, autoId, idTipoModificacion]
    );
    const result = db.exec('SELECT last_insert_rowid()');
    saveDB();
    return result[0].values[0][0];
  },

  update: (id, nombre, descripcion, costo, nivelImpacto, fecha, idTipoModificacion) => {
    const db = getDB();
    db.run(
      `UPDATE modificaciones SET nombre = ?, descripcion = ?, costo = ?,
       nivel_impacto = ?, fecha = ?, id_tipo_modificacion = ? WHERE id = ?`,
      [nombre, descripcion, costo, nivelImpacto, fecha, idTipoModificacion, id]
    );
    const result = db.exec('SELECT changes()');
    saveDB();
    return result[0].values[0][0];
  },

  delete: (id) => {
    const db = getDB();
    db.run('DELETE FROM modificaciones WHERE id = ?', [id]);
    const result = db.exec('SELECT changes()');
    saveDB();
    return result[0].values[0][0];
  }
};

module.exports = modificacionModel;
