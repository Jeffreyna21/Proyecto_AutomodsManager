const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { createInMemoryDb, closeInMemoryDb } = require('../helpers/inMemoryDb');
const AnalisisRepository = require('../../src/repositories/AnalisisRepository');
const AutoRepository = require('../../src/repositories/AutoRepository');

describe('repositories/AnalisisRepository', () => {
  let db;
  let repo;
  let autoId;

  before(async () => {
    db = await createInMemoryDb();
    const userId = db.exec("SELECT id FROM usuarios WHERE username = 'admin'")[0].values[0][0];
    const marcaId = db.exec('SELECT id FROM marcas LIMIT 1')[0].values[0][0];
    const modeloId = db.exec('SELECT id FROM modelos WHERE id_marca = ?', [marcaId])[0].values[0][0];
    const autoRepo = new AutoRepository(db);
    const created = autoRepo.create({ placa: 'AN-001', idMarca: marcaId, idModelo: modeloId, anio: 2024, idUsuario: userId });
    autoId = created.id;
    repo = new AnalisisRepository(db);
  });

  after(() => { if (db) closeInMemoryDb(db); });

  it('findByAutoId() returns null when no analysis row exists', () => {
    assert.equal(repo.findByAutoId(autoId), null);
  });

  it('upsert() inserts a new analysis row when none exists', () => {
    const metricas = {
      impacto_total: 5,
      costo_total: 1000,
      numero_modificaciones: 2,
      promedio_mejora: 2.5,
      costo_beneficio: 0.005,
      indicador: 'Excelente'
    };
    const inserted = repo.upsert(autoId, metricas);
    assert.equal(inserted.auto_id, autoId);
    assert.equal(inserted.impacto_total, 5);
    assert.equal(inserted.costo_total, 1000);
    assert.equal(inserted.indicador, 'Excelente');
    assert.ok(inserted.updated_at);
  });

  it('findByAutoId() returns the analysis row after upsert', () => {
    const found = repo.findByAutoId(autoId);
    assert.equal(found.auto_id, autoId);
    assert.equal(found.indicador, 'Excelente');
  });

  it('upsert() updates an existing analysis row (not insert)', () => {
    const before = repo.findByAutoId(autoId);
    const updated = repo.upsert(autoId, {
      impacto_total: 10, costo_total: 2000, numero_modificaciones: 4,
      promedio_mejora: 2.5, costo_beneficio: 0.005, indicador: 'Excelente'
    });
    assert.equal(updated.id, before.id, 'upsert must UPDATE the same row id');
    assert.equal(updated.impacto_total, 10);
    const after = repo.findByAutoId(autoId);
    assert.equal(after.impacto_total, 10);
  });
});
