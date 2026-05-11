const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, '../../database/automods.db');
let db = null;

const initDB = async () => {
  const SQL = await initSqlJs();

  if (fs.existsSync(dbPath)) {
    const buffer = fs.readFileSync(dbPath);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  db.run('PRAGMA foreign_keys = ON');

  // --- Tabla de usuarios ---
  db.run(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // --- Tablas catálogo ---
  db.run(`
    CREATE TABLE IF NOT EXISTS marcas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL UNIQUE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS modelos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      id_marca INTEGER NOT NULL,
      FOREIGN KEY (id_marca) REFERENCES marcas(id),
      UNIQUE (nombre, id_marca)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS tipos_modificacion (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL UNIQUE
    )
  `);

  // --- Tabla de autos (vehículos) ---
  db.run(`
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
    )
  `);

  // --- Tabla de modificaciones ---
  db.run(`
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
    )
  `);

  // --- Tabla de análisis ---
  db.run(`
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
    )
  `);

  // --- Índices ---
  db.run('CREATE INDEX IF NOT EXISTS idx_modificaciones_auto_id ON modificaciones(auto_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_autos_id_usuario ON autos(id_usuario)');
  db.run('CREATE INDEX IF NOT EXISTS idx_modelos_id_marca ON modelos(id_marca)');
  db.run('CREATE UNIQUE INDEX IF NOT EXISTS idx_placa_usuario ON autos(placa, id_usuario)');

  // --- Seed: usuarios por defecto ---
  seedUsuarios();

  // --- Seed: catálogos ---
  seedCatalogos();

  saveDB();
};

const seedUsuarios = () => {
  const result = db.exec('SELECT COUNT(*) FROM usuarios');
  const count = result[0].values[0][0];
  if (count > 0) return;

  const usuarios = [
    { username: 'admin', password: bcrypt.hashSync('admin', 10) },
    { username: 'user', password: bcrypt.hashSync('user123', 10) }
  ];

  usuarios.forEach(u => {
    db.run('INSERT INTO usuarios (username, password) VALUES (?, ?)', [u.username, u.password]);
  });
};

const seedCatalogos = () => {
  // Solo insertar si las tablas están vacías
  const resultMarcas = db.exec('SELECT COUNT(*) FROM marcas');
  if (resultMarcas[0].values[0][0] > 0) return;

  const marcasModelos = {
    'Toyota': ['Corolla', 'Camry', 'Hilux', 'RAV4', 'Yaris'],
    'Chevrolet': ['Spark', 'Cruze', 'Aveo', 'Tracker', 'Equinox'],
    'Ford': ['Fiesta', 'Focus', 'Mustang', 'Explorer', 'Ranger'],
    'Kia': ['Rio', 'Sportage', 'Cerato', 'Seltos', 'Picanto'],
    'Hyundai': ['Accent', 'Tucson', 'Elantra', 'Santa Fe', 'i10'],
    'Mazda': ['Mazda 2', 'Mazda 3', 'CX-5', 'CX-30', 'Mazda 6'],
    'Nissan': ['Sentra', 'Versa', 'March', 'Kicks', 'Frontier']
  };

  for (const [marca, modelos] of Object.entries(marcasModelos)) {
    db.run('INSERT INTO marcas (nombre) VALUES (?)', [marca]);
    const idMarca = db.exec('SELECT last_insert_rowid()')[0].values[0][0];
    modelos.forEach(modelo => {
      db.run('INSERT INTO modelos (nombre, id_marca) VALUES (?, ?)', [modelo, idMarca]);
    });
  }

  // Tipos de modificación
  const tipos = ['Rendimiento', 'Estética', 'Mantenimiento'];
  tipos.forEach(tipo => {
    db.run('INSERT INTO tipos_modificacion (nombre) VALUES (?)', [tipo]);
  });
};

const saveDB = () => {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  }
};

const getDB = () => db;

module.exports = { getDB, initDB, saveDB };
