const { getDB } = require('./db');

const marcaModel = {
  getAll: () => {
    const db = getDB();
    const result = db.exec('SELECT * FROM marcas ORDER BY nombre');
    return result.length > 0 ? result[0].values.map(row => ({
      id: row[0],
      nombre: row[1]
    })) : [];
  },

  getById: (id) => {
    const db = getDB();
    const result = db.exec('SELECT * FROM marcas WHERE id = ?', [id]);
    if (result.length > 0 && result[0].values.length > 0) {
      const row = result[0].values[0];
      return { id: row[0], nombre: row[1] };
    }
    return null;
  }
};

const modeloModel = {
  getByMarcaId: (idMarca) => {
    const db = getDB();
    const result = db.exec('SELECT * FROM modelos WHERE id_marca = ? ORDER BY nombre', [idMarca]);
    return result.length > 0 ? result[0].values.map(row => ({
      id: row[0],
      nombre: row[1],
      id_marca: row[2]
    })) : [];
  },

  getById: (id) => {
    const db = getDB();
    const result = db.exec('SELECT * FROM modelos WHERE id = ?', [id]);
    if (result.length > 0 && result[0].values.length > 0) {
      const row = result[0].values[0];
      return { id: row[0], nombre: row[1], id_marca: row[2] };
    }
    return null;
  }
};

const tipoModificacionModel = {
  getAll: () => {
    const db = getDB();
    const result = db.exec('SELECT * FROM tipos_modificacion ORDER BY nombre');
    return result.length > 0 ? result[0].values.map(row => ({
      id: row[0],
      nombre: row[1]
    })) : [];
  },

  getById: (id) => {
    const db = getDB();
    const result = db.exec('SELECT * FROM tipos_modificacion WHERE id = ?', [id]);
    if (result.length > 0 && result[0].values.length > 0) {
      const row = result[0].values[0];
      return { id: row[0], nombre: row[1] };
    }
    return null;
  }
};

module.exports = { marcaModel, modeloModel, tipoModificacionModel };
