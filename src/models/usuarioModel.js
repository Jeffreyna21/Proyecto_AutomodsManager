const { getDB } = require('./db');

const usuarioModel = {
  getByUsername: (username) => {
    const db = getDB();
    const result = db.exec('SELECT * FROM usuarios WHERE username = ?', [username]);
    if (result.length > 0 && result[0].values.length > 0) {
      const row = result[0].values[0];
      return {
        id: row[0],
        username: row[1],
        password: row[2],
        created_at: row[3]
      };
    }
    return null;
  },

  getById: (id) => {
    const db = getDB();
    const result = db.exec('SELECT * FROM usuarios WHERE id = ?', [id]);
    if (result.length > 0 && result[0].values.length > 0) {
      const row = result[0].values[0];
      return {
        id: row[0],
        username: row[1],
        password: row[2],
        created_at: row[3]
      };
    }
    return null;
  }
};

module.exports = usuarioModel;
