const BaseRepository = require('./BaseRepository');

const MOD_BASE_SELECT = `
  SELECT m.id, m.nombre, m.descripcion, m.costo, m.nivel_impacto,
         m.fecha, m.auto_id, m.id_tipo_modificacion, m.created_at,
         t.nombre AS tipo
  FROM modificaciones m
  JOIN tipos_modificacion t ON m.id_tipo_modificacion = t.id
`;

function rowToDto(row) {
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

class ModificacionRepository extends BaseRepository {
  constructor(db) {
    super();
    this.db = db;
  }

  findById(id) {
    const result = this.db.exec(`${MOD_BASE_SELECT} WHERE m.id = ?`, [id]);
    if (result.length > 0 && result[0].values.length > 0) {
      return rowToDto(result[0].values[0]);
    }
    return null;
  }

  findByAutoId(autoId) {
    const result = this.db.exec(
      `${MOD_BASE_SELECT} WHERE m.auto_id = ? ORDER BY m.fecha DESC`,
      [autoId]
    );
    if (result.length === 0) return [];
    return result[0].values.map(rowToDto);
  }

  create({ nombre, descripcion = null, costo, nivelImpacto, fecha, autoId, idTipoModificacion }) {
    this.db.run(
      `INSERT INTO modificaciones
        (nombre, descripcion, costo, nivel_impacto, fecha, auto_id, id_tipo_modificacion)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [nombre, descripcion, costo, nivelImpacto, fecha, autoId, idTipoModificacion]
    );
    const result = this.db.exec('SELECT last_insert_rowid()');
    return this.findById(result[0].values[0][0]);
  }

  update(id, { nombre, descripcion, costo, nivelImpacto, fecha, idTipoModificacion }) {
    const current = this.findById(id);
    if (!current) return null;
    const next = {
      nombre: nombre !== undefined ? nombre : current.nombre,
      descripcion: descripcion !== undefined ? descripcion : current.descripcion,
      costo: costo !== undefined ? costo : current.costo,
      nivelImpacto: nivelImpacto !== undefined ? nivelImpacto : current.nivel_impacto,
      fecha: fecha !== undefined ? fecha : current.fecha,
      idTipoModificacion: idTipoModificacion !== undefined ? idTipoModificacion : current.id_tipo_modificacion
    };
    this.db.run(
      `UPDATE modificaciones SET
        nombre = ?, descripcion = ?, costo = ?, nivel_impacto = ?,
        fecha = ?, id_tipo_modificacion = ?
       WHERE id = ?`,
      [next.nombre, next.descripcion, next.costo, next.nivelImpacto, next.fecha, next.idTipoModificacion, id]
    );
    return this.findById(id);
  }

  delete(id) {
    this.db.run('DELETE FROM modificaciones WHERE id = ?', [id]);
    const result = this.db.exec('SELECT changes()');
    return result[0].values[0][0];
  }
}

module.exports = ModificacionRepository;
