const { describe, it, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { createInMemoryDb, closeInMemoryDb } = require('../helpers/inMemoryDb');

describe('helpers/inMemoryDb — fresh in-memory database', () => {
  let db;
  afterEach(() => { if (db) closeInMemoryDb(db); });

  it('returns a non-null Database handle', async () => {
    db = await createInMemoryDb();
    assert.ok(db);
    assert.equal(typeof db.run, 'function');
    assert.equal(typeof db.exec, 'function');
    assert.equal(typeof db.export, 'function');
  });

  it('two consecutive calls return different database instances', async () => {
    const a = await createInMemoryDb();
    const b = await createInMemoryDb();
    assert.notStrictEqual(a, b, 'each call must yield a fresh database');
    closeInMemoryDb(a);
    closeInMemoryDb(b);
    db = null;
  });

  it('seeds catalogos (7 marcas) by default', async () => {
    db = await createInMemoryDb();
    const result = db.exec('SELECT COUNT(*) FROM marcas');
    assert.equal(result[0].values[0][0], 7, 'marcas should be seeded with 7 entries');
  });

  it('seeds tipos_modificacion (3 rows) by default', async () => {
    db = await createInMemoryDb();
    const result = db.exec('SELECT COUNT(*) FROM tipos_modificacion');
    assert.equal(result[0].values[0][0], 3, 'tipos_modificacion should be seeded with 3 entries');
  });

  it('seeds two test users by default', async () => {
    db = await createInMemoryDb();
    const result = db.exec('SELECT COUNT(*) FROM usuarios');
    assert.equal(result[0].values[0][0], 2, 'usuarios should be seeded with 2 entries');
    const rows = db.exec('SELECT username FROM usuarios ORDER BY id');
    const usernames = rows[0].values.map(r => r[0]);
    assert.deepEqual(usernames, ['admin', 'user']);
  });

  it('seeds modelos (5 per marca) for a total of 35 rows', async () => {
    db = await createInMemoryDb();
    const result = db.exec('SELECT COUNT(*) FROM modelos');
    assert.equal(result[0].values[0][0], 35, 'modelos should be seeded with 35 entries (7 marcas x 5)');
  });

  it('can be closed (closeInMemoryDb is safe to call)', async () => {
    db = await createInMemoryDb();
    closeInMemoryDb(db);
    db = null;
    // Second call on a closed handle should not crash; we just verify it does not throw.
    closeInMemoryDb(null);
  });

  it('has a writable autos table (FK to marcas, modelos, usuarios)', async () => {
    db = await createInMemoryDb();
    const userId = db.exec("SELECT id FROM usuarios WHERE username = 'admin'")[0].values[0][0];
    const marcaId = db.exec('SELECT id FROM marcas LIMIT 1')[0].values[0][0];
    const modeloId = db.exec('SELECT id FROM modelos WHERE id_marca = ?', [marcaId])[0].values[0][0];
    db.run(
      'INSERT INTO autos (placa, id_marca, id_modelo, anio, id_usuario) VALUES (?, ?, ?, ?, ?)',
      ['TEST-001', marcaId, modeloId, 2024, userId]
    );
    const rows = db.exec('SELECT placa FROM autos WHERE placa = ?', ['TEST-001']);
    assert.equal(rows[0].values.length, 1);
    assert.equal(rows[0].values[0][0], 'TEST-001');
  });

  it('rejects orphan autos insert (FK enforcement)', async () => {
    db = await createInMemoryDb();
    assert.throws(() => {
      db.run(
        'INSERT INTO autos (placa, id_marca, id_modelo, anio, id_usuario) VALUES (?, ?, ?, ?, ?)',
        ['ORPHAN', 9999, 9999, 2024, 9999]
      );
    }, /FOREIGN KEY/);
  });
});
