const BaseRepository = require('./BaseRepository');

const AUTO_BASE_SELECT = `
  SELECT a.id, a.placa, a.anio, a.id_usuario, a.created_at,
         m.nombre AS marca, mo.nombre AS modelo,
         a.id_marca, a.id_modelo
  FROM autos a
  JOIN marcas m ON a.id_marca = m.id
  JOIN modelos mo ON a.id_modelo = mo.id
`;

function rowToDto(row) {
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

class AutoRepository extends BaseRepository {
  /**
   * @param {*} db sql.js Database handle
   */
  constructor(db) {
    super();
    this.db = db;
  }

  findById(id) {
    const result = this.db.exec(`${AUTO_BASE_SELECT} WHERE a.id = ?`, [id]);
    if (result.length > 0 && result[0].values.length > 0) {
      return rowToDto(result[0].values[0]);
    }
    return null;
  }

  findAllByUsuario(idUsuario, limit, offset) {
    const result = this.db.exec(
      `${AUTO_BASE_SELECT} WHERE a.id_usuario = ? ORDER BY a.id DESC LIMIT ? OFFSET ?`,
      [idUsuario, limit, offset]
    );
    if (result.length === 0) return [];
    return result[0].values.map(rowToDto);
  }

  countByUsuario(idUsuario) {
    const result = this.db.exec('SELECT COUNT(*) FROM autos WHERE id_usuario = ?', [idUsuario]);
    return result.length > 0 ? result[0].values[0][0] : 0;
  }

  create({ placa, idMarca, idModelo, anio, idUsuario }) {
    this.db.run(
      'INSERT INTO autos (placa, id_marca, id_modelo, anio, id_usuario) VALUES (?, ?, ?, ?, ?)',
      [placa, idMarca, idModelo, anio, idUsuario]
    );
    const result = this.db.exec('SELECT last_insert_rowid()');
    return this.findById(result[0].values[0][0]);
  }

  update(id, { placa, idMarca, idModelo, anio }) {
    // Coalesce: only the provided fields are updated. Undefined values
    // fall back to the existing column value (read first).
    const current = this.findById(id);
    if (!current) return null;
    const next = {
      placa: placa !== undefined ? placa : current.placa,
      idMarca: idMarca !== undefined ? idMarca : current.id_marca,
      idModelo: idModelo !== undefined ? idModelo : current.id_modelo,
      anio: anio !== undefined ? anio : current.anio
    };
    this.db.run(
      'UPDATE autos SET placa = ?, id_marca = ?, id_modelo = ?, anio = ? WHERE id = ?',
      [next.placa, next.idMarca, next.idModelo, next.anio, id]
    );
    return this.findById(id);
  }

  delete(id) {
    this.db.run('DELETE FROM autos WHERE id = ?', [id]);
    const result = this.db.exec('SELECT changes()');
    return result[0].values[0][0];
  }

  existsPlacaForUsuario(placa, idUsuario, excludeId = null) {
    let sql = 'SELECT COUNT(*) FROM autos WHERE placa = ? AND id_usuario = ?';
    const params = [placa, idUsuario];
    if (excludeId !== null && excludeId !== undefined) {
      sql += ' AND id != ?';
      params.push(excludeId);
    }
    const result = this.db.exec(sql, params);
    return result[0].values[0][0] > 0;
  }
}

module.exports = AutoRepository;
