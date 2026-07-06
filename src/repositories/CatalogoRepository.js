const BaseRepository = require('./BaseRepository');

class CatalogoRepository extends BaseRepository {
  constructor(db) {
    super();
    this.db = db;
  }

  findMarcas() {
    const result = this.db.exec('SELECT id, nombre FROM marcas ORDER BY nombre');
    if (result.length === 0) return [];
    return result[0].values.map(row => ({ id: row[0], nombre: row[1] }));
  }

  findModelosByMarca(idMarca) {
    const result = this.db.exec(
      'SELECT id, nombre, id_marca FROM modelos WHERE id_marca = ? ORDER BY nombre',
      [idMarca]
    );
    if (result.length === 0) return [];
    return result[0].values.map(row => ({ id: row[0], nombre: row[1], id_marca: row[2] }));
  }

  findTiposModificacion() {
    const result = this.db.exec('SELECT id, nombre FROM tipos_modificacion ORDER BY nombre');
    if (result.length === 0) return [];
    return result[0].values.map(row => ({ id: row[0], nombre: row[1] }));
  }
}

module.exports = CatalogoRepository;
