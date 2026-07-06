const initSqlJs = require('sql.js');
const bcrypt = require('bcryptjs');

const SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS marcas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL UNIQUE
  );

  CREATE TABLE IF NOT EXISTS modelos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    id_marca INTEGER NOT NULL,
    FOREIGN KEY (id_marca) REFERENCES marcas(id),
    UNIQUE (nombre, id_marca)
  );

  CREATE TABLE IF NOT EXISTS tipos_modificacion (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL UNIQUE
  );

  CREATE TABLE IF NOT EXISTS autos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    placa TEXT NOT NULL,
    id_marca INTEGER NOT NULL,
    id_modelo INTEGER NOT NULL,
    anio INTEGER NOT NULL,
    id_usuario INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_marca) REFERENCES marcas(id),
    FOREIGN KEY (id_modelo) REFERENCES modelos(id),
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id)
  );

  CREATE TABLE IF NOT EXISTS modificaciones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    costo REAL NOT NULL,
    nivel_impacto TEXT NOT NULL DEFAULT 'Bajo',
    fecha DATE NOT NULL,
    auto_id INTEGER NOT NULL,
    id_tipo_modificacion INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (auto_id) REFERENCES autos(id) ON DELETE CASCADE,
    FOREIGN KEY (id_tipo_modificacion) REFERENCES tipos_modificacion(id)
  );

  CREATE TABLE IF NOT EXISTS analisis (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    auto_id INTEGER NOT NULL UNIQUE,
    impacto_total INTEGER NOT NULL DEFAULT 0,
    costo_total REAL NOT NULL DEFAULT 0,
    numero_modificaciones INTEGER NOT NULL DEFAULT 0,
    promedio_mejora REAL,
    costo_beneficio REAL,
    indicador TEXT NOT NULL DEFAULT 'Sin datos',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (auto_id) REFERENCES autos(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_modificaciones_auto_id ON modificaciones(auto_id);
  CREATE INDEX IF NOT EXISTS idx_autos_id_usuario ON autos(id_usuario);
  CREATE INDEX IF NOT EXISTS idx_modelos_id_marca ON modelos(id_marca);
  CREATE UNIQUE INDEX IF NOT EXISTS idx_placa_usuario ON autos(placa, id_usuario);
`;

const SEED_MARCAS_MODELOS = {
  'Toyota': ['Corolla', 'Camry', 'Hilux', 'RAV4', 'Yaris'],
  'Chevrolet': ['Spark', 'Cruze', 'Aveo', 'Tracker', 'Equinox'],
  'Ford': ['Fiesta', 'Focus', 'Mustang', 'Explorer', 'Ranger'],
  'Kia': ['Rio', 'Sportage', 'Cerato', 'Seltos', 'Picanto'],
  'Hyundai': ['Accent', 'Tucson', 'Elantra', 'Santa Fe', 'i10'],
  'Mazda': ['Mazda 2', 'Mazda 3', 'CX-5', 'CX-30', 'Mazda 6'],
  'Nissan': ['Sentra', 'Versa', 'March', 'Kicks', 'Frontier']
};

const SEED_USUARIOS = [
  { username: 'admin', password: 'admin' },
  { username: 'user', password: 'user123' }
];

const SEED_TIPOS_MODIFICACION = ['Rendimiento', 'Estética', 'Mantenimiento'];

let sqlPromise = null;

/**
 * Load and cache the sql.js WASM module. Safe to call multiple times;
 * the underlying promise resolves once and is reused for every test
 * suite.
 */
function loadSql() {
  if (!sqlPromise) {
    sqlPromise = initSqlJs();
  }
  return sqlPromise;
}

async function buildDb(opts = {}) {
  const withSeeds = opts.withSeeds !== false;
  const SQL = await loadSql();
  const db = new SQL.Database();
  db.run('PRAGMA foreign_keys = ON');
  db.run(SCHEMA_SQL);
  if (withSeeds) {
    seedUsuarios(db);
    seedCatalogos(db);
    seedTiposModificacion(db);
  }
  return db;
}

function seedUsuarios(db) {
  for (const u of SEED_USUARIOS) {
    db.run(
      'INSERT INTO usuarios (username, password) VALUES (?, ?)',
      [u.username, bcrypt.hashSync(u.password, 4)]
    );
  }
}

function seedCatalogos(db) {
  for (const [marca, modelos] of Object.entries(SEED_MARCAS_MODELOS)) {
    db.run('INSERT INTO marcas (nombre) VALUES (?)', [marca]);
    const idMarca = db.exec('SELECT last_insert_rowid()')[0].values[0][0];
    for (const modelo of modelos) {
      db.run('INSERT INTO modelos (nombre, id_marca) VALUES (?, ?)', [modelo, idMarca]);
    }
  }
}

function seedTiposModificacion(db) {
  for (const tipo of SEED_TIPOS_MODIFICACION) {
    db.run('INSERT INTO tipos_modificacion (nombre) VALUES (?)', [tipo]);
  }
}

/**
 * Create a fresh in-memory sql.js database with the same schema and
 * seed data as the production database. Each call yields a new
 * database handle so tests are fully isolated from one another.
 *
 * Returns a Promise<Database> because sql.js is async-loaded via
 * WebAssembly.
 *
 * @param {object} [opts]
 * @param {boolean} [opts.withSeeds=true] seed catalogos and usuarios
 * @returns {Promise<*>} the sql.js Database handle
 */
async function createInMemoryDb(opts) {
  return buildDb(opts);
}

/**
 * Close and free the database handle. Safe to call with `null`.
 * @param {*} db
 */
function closeInMemoryDb(db) {
  if (db && typeof db.close === 'function') {
    db.close();
  }
}

module.exports = {
  createInMemoryDb,
  closeInMemoryDb,
  SEED_MARCAS_MODELOS,
  SEED_USUARIOS,
  SEED_TIPOS_MODIFICACION
};
