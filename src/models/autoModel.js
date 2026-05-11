const { getDB, saveDB } = require('./db');

const autoModel = {
  getAllByUsuario: (idUsuario, limit, offset) => {
    const db = getDB();
    const result = db.exec(`
      SELECT a.id, a.placa, a.anio, a.id_usuario, a.created_at,
             m.nombre AS marca, mo.nombre AS modelo,
             a.id_marca, a.id_modelo
      FROM autos a
      JOIN marcas m ON a.id_marca = m.id
      JOIN modelos mo ON a.id_modelo = mo.id
      WHERE a.id_usuario = ?
      ORDER BY a.id DESC LIMIT ? OFFSET ?
    `, [idUsuario, limit, offset]);
    return result.length > 0 ? result[0].values.map(row => ({
      id: row[0],
      placa: row[1],
      anio: row[2],
      id_usuario: row[3],
      created_at: row[4],
      marca: row[5],
      modelo: row[6],
      id_marca: row[7],
      id_modelo: row[8]
    })) : [];
  },

  getCountByUsuario: (idUsuario) => {
    const db = getDB();
    const result = db.exec('SELECT COUNT(*) FROM autos WHERE id_usuario = ?', [idUsuario]);
    return result.length > 0 ? result[0].values[0][0] : 0;
  },

  getById: (id) => {
    const db = getDB();
    const result = db.exec(`
      SELECT a.id, a.placa, a.anio, a.id_usuario, a.created_at,
             m.nombre AS marca, mo.nombre AS modelo,
             a.id_marca, a.id_modelo
      FROM autos a
      JOIN marcas m ON a.id_marca = m.id
      JOIN modelos mo ON a.id_modelo = mo.id
      WHERE a.id = ?
    `, [id]);
    if (result.length > 0 && result[0].values.length > 0) {
      const row = result[0].values[0];
      return {
        id: row[0],
        placa: row[1],
        anio: row[2],
        id_usuario: row[3],
        created_at: row[4],
        marca: row[5],
        modelo: row[6],
        id_marca: row[7],
        id_modelo: row[8]
      };
    }
    return null;
  },

  create: (placa, idMarca, idModelo, anio, idUsuario) => {
    const db = getDB();
    db.run(
      'INSERT INTO autos (placa, id_marca, id_modelo, anio, id_usuario) VALUES (?, ?, ?, ?, ?)',
      [placa, idMarca, idModelo, anio, idUsuario]
    );
    const result = db.exec('SELECT last_insert_rowid()');
    saveDB();
    return result[0].values[0][0];
  },

  update: (id, placa, idMarca, idModelo, anio) => {
    const db = getDB();
    db.run(
      'UPDATE autos SET placa = ?, id_marca = ?, id_modelo = ?, anio = ? WHERE id = ?',
      [placa, idMarca, idModelo, anio, id]
    );
    const result = db.exec('SELECT changes()');
    saveDB();
    return result[0].values[0][0];
  },

  existePlacaParaUsuario: (placa, idUsuario, excludeId = null) => {
    const db = getDB();
    let sql = 'SELECT COUNT(*) FROM autos WHERE placa = ? AND id_usuario = ?';
    const params = [placa, idUsuario];
    if (excludeId) {
      sql += ' AND id != ?';
      params.push(excludeId);
    }
    const result = db.exec(sql, params);
    return result[0].values[0][0] > 0;
  },

  delete: (id) => {
    const db = getDB();
    db.run('DELETE FROM autos WHERE id = ?', [id]);
    const result = db.exec('SELECT changes()');
    saveDB();
    return result[0].values[0][0];
  }
};

module.exports = autoModel;
