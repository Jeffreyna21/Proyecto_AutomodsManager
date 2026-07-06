const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { createInMemoryDb, closeInMemoryDb } = require('../helpers/inMemoryDb');
const AutoRepository = require('../../src/repositories/AutoRepository');

describe('repositories/AutoRepository', () => {
  let db;
  let repo;
  let userId;
  let marcaId;
  let modeloId;

  before(async () => {
    db = await createInMemoryDb();
    userId = db.exec("SELECT id FROM usuarios WHERE username = 'admin'")[0].values[0][0];
    marcaId = db.exec('SELECT id FROM marcas LIMIT 1')[0].values[0][0];
    modeloId = db.exec('SELECT id FROM modelos WHERE id_marca = ?', [marcaId])[0].values[0][0];
    repo = new AutoRepository(db);
  });

  after(() => { if (db) closeInMemoryDb(db); });

  it('create() returns a DTO with the documented shape', () => {
    const created = repo.create({ placa: 'ABC123', idMarca: marcaId, idModelo: modeloId, anio: 2024, idUsuario: userId });
    assert.equal(typeof created.id, 'number');
    assert.equal(created.placa, 'ABC123');
    assert.equal(created.anio, 2024);
    assert.equal(created.id_usuario, userId);
    assert.equal(typeof created.marca, 'string');
    assert.equal(typeof created.modelo, 'string');
    assert.equal(created.id_marca, marcaId);
    assert.equal(created.id_modelo, modeloId);
    assert.ok(created.created_at, 'created_at must be present');
  });

  it('findById() returns the DTO when the row exists', () => {
    const created = repo.create({ placa: 'XYZ999', idMarca: marcaId, idModelo: modeloId, anio: 2023, idUsuario: userId });
    const found = repo.findById(created.id);
    assert.equal(found.id, created.id);
    assert.equal(found.placa, 'XYZ999');
  });

  it('findById() returns null when the row does not exist', () => {
    assert.equal(repo.findById(99999), null);
  });

  it('findAllByUsuario() filters by user and orders by id DESC', () => {
    const user2 = db.exec("SELECT id FROM usuarios WHERE username = 'user'")[0].values[0][0];
    const a = repo.create({ placa: 'AAA111', idMarca: marcaId, idModelo: modeloId, anio: 2022, idUsuario: userId });
    const b = repo.create({ placa: 'BBB222', idMarca: marcaId, idModelo: modeloId, anio: 2021, idUsuario: user2 });
    const rows = repo.findAllByUsuario(userId, 10, 0);
    const ids = rows.map(r => r.id);
    assert.ok(ids.includes(a.id), 'user1 autos must be present');
    assert.ok(!ids.includes(b.id), 'user2 autos must NOT be present');
  });

  it('countByUsuario() returns the right count', () => {
    const before = repo.countByUsuario(userId);
    repo.create({ placa: 'CNT001', idMarca: marcaId, idModelo: modeloId, anio: 2020, idUsuario: userId });
    assert.equal(repo.countByUsuario(userId), before + 1);
  });

  it('update() mutates the row and returns the updated DTO', () => {
    const created = repo.create({ placa: 'UPD001', idMarca: marcaId, idModelo: modeloId, anio: 2019, idUsuario: userId });
    const updated = repo.update(created.id, { placa: 'UPD002', anio: 2020 });
    assert.equal(updated.placa, 'UPD002');
    assert.equal(updated.anio, 2020);
  });

  it('delete() removes the row', () => {
    const created = repo.create({ placa: 'DEL001', idMarca: marcaId, idModelo: modeloId, anio: 2018, idUsuario: userId });
    assert.equal(repo.delete(created.id), 1);
    assert.equal(repo.findById(created.id), null);
  });

  it('existsPlacaForUsuario() returns true for duplicates, false otherwise', () => {
    repo.create({ placa: 'DUP001', idMarca: marcaId, idModelo: modeloId, anio: 2017, idUsuario: userId });
    assert.equal(repo.existsPlacaForUsuario('DUP001', userId), true);
    assert.equal(repo.existsPlacaForUsuario('NEVER', userId), false);
  });

  it('create() throws on duplicate placa for the same user', () => {
    repo.create({ placa: 'DUP002', idMarca: marcaId, idModelo: modeloId, anio: 2016, idUsuario: userId });
    assert.throws(() => {
      repo.create({ placa: 'DUP002', idMarca: marcaId, idModelo: modeloId, anio: 2016, idUsuario: userId });
    }, /UNIQUE constraint failed/);
  });
});
