const BaseRepository = require('./BaseRepository');

function rowToDto(row) {
  return {
    id: row[0],
    username: row[1],
    password: row[2],
    created_at: row[3]
  };
}

class UsuarioRepository extends BaseRepository {
  constructor(db) {
    super();
    this.db = db;
  }

  findById(id) {
    const result = this.db.exec('SELECT * FROM usuarios WHERE id = ?', [id]);
    if (result.length > 0 && result[0].values.length > 0) {
      return rowToDto(result[0].values[0]);
    }
    return null;
  }

  findByUsername(username) {
    const result = this.db.exec('SELECT * FROM usuarios WHERE username = ?', [username]);
    if (result.length > 0 && result[0].values.length > 0) {
      return rowToDto(result[0].values[0]);
    }
    return null;
  }

  findAll() {
    const result = this.db.exec('SELECT * FROM usuarios ORDER BY id');
    if (result.length === 0) return [];
    return result[0].values.map(rowToDto);
  }
}

module.exports = UsuarioRepository;
