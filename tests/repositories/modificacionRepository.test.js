const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { createInMemoryDb, closeInMemoryDb } = require('../helpers/inMemoryDb');
const ModificacionRepository = require('../../src/repositories/ModificacionRepository');
const AutoRepository = require('../../src/repositories/AutoRepository');

describe('repositories/ModificacionRepository', () => {
  let db;
  let repo;
  let autoRepo;
  let userId;
  let autoId;
  let tipoId;

  before(async () => {
    db = await createInMemoryDb();
    userId = db.exec("SELECT id FROM usuarios WHERE username = 'admin'")[0].values[0][0];
    const marcaId = db.exec('SELECT id FROM marcas LIMIT 1')[0].values[0][0];
    const modeloId = db.exec('SELECT id FROM modelos WHERE id_marca = ?', [marcaId])[0].values[0][0];
    tipoId = db.exec('SELECT id FROM tipos_modificacion LIMIT 1')[0].values[0][0];
    autoRepo = new AutoRepository(db);
    repo = new ModificacionRepository(db);
    const created = autoRepo.create({ placa: 'AUTO-MOD', idMarca: marcaId, idModelo: modeloId, anio: 2024, idUsuario: userId });
    autoId = created.id;
  });

  after(() => { if (db) closeInMemoryDb(db); });

  it('create() returns a DTO with the documented shape', () => {
    const m = repo.create({
      nombre: 'Turbo kit', descripcion: 'Stage 1', costo: 1500,
      nivelImpacto: 'Alto', fecha: '2024-01-15', autoId, idTipoModificacion: tipoId
    });
    assert.equal(typeof m.id, 'number');
    assert.equal(m.nombre, 'Turbo kit');
    assert.equal(m.descripcion, 'Stage 1');
    assert.equal(m.costo, 1500);
    assert.equal(m.nivel_impacto, 'Alto');
    assert.equal(m.auto_id, autoId);
    assert.equal(m.id_tipo_modificacion, tipoId);
    assert.equal(typeof m.tipo, 'string', 'tipo (joined from tipos_modificacion) must be present');
  });

  it('findById() returns the DTO when the row exists', () => {
    const m = repo.create({
      nombre: 'Cold air intake', costo: 300, nivelImpacto: 'Medio',
      fecha: '2024-02-01', autoId, idTipoModificacion: tipoId
    });
    const found = repo.findById(m.id);
    assert.equal(found.id, m.id);
    assert.equal(found.nombre, 'Cold air intake');
  });

  it('findById() returns null when the row does not exist', () => {
    assert.equal(repo.findById(99999), null);
  });

  it('findByAutoId() filters by auto and orders by fecha DESC', () => {
    repo.create({ nombre: 'EARLIER', costo: 100, nivelImpacto: 'Bajo', fecha: '2024-01-01', autoId, idTipoModificacion: tipoId });
    repo.create({ nombre: 'LATER', costo: 100, nivelImpacto: 'Bajo', fecha: '2024-03-01', autoId, idTipoModificacion: tipoId });
    const rows = repo.findByAutoId(autoId);
    assert.equal(rows[0].nombre, 'LATER', 'rows must be ordered by fecha DESC (most recent first)');
    assert.ok(rows.every(r => r.auto_id === autoId));
  });

  it('update() mutates the row and returns the updated DTO', () => {
    const m = repo.create({ nombre: 'OLD', costo: 100, nivelImpacto: 'Bajo', fecha: '2024-04-01', autoId, idTipoModificacion: tipoId });
    const updated = repo.update(m.id, { nombre: 'NEW', costo: 200, nivelImpacto: 'Alto' });
    assert.equal(updated.nombre, 'NEW');
    assert.equal(updated.costo, 200);
    assert.equal(updated.nivel_impacto, 'Alto');
  });

  it('delete() removes the row and returns 1', () => {
    const m = repo.create({ nombre: 'TEMP', costo: 100, nivelImpacto: 'Bajo', fecha: '2024-05-01', autoId, idTipoModificacion: tipoId });
    assert.equal(repo.delete(m.id), 1);
    assert.equal(repo.findById(m.id), null);
  });
});
