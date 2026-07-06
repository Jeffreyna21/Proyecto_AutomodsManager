const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

const { createInMemoryDb, closeInMemoryDb } = require('../helpers/inMemoryDb');
const ModificacionRepository = require('../../src/repositories/ModificacionRepository');
const AutoRepository = require('../../src/repositories/AutoRepository');
const { createBus } = require('../../src/bus');
const events = require('../../src/domain/events/events');

describe('ModificacionRepository — emits MODIFICACION_* events on writes', () => {
  let db;
  let bus;
  let repo;
  let autoRepo;
  let autoId;
  let tipoId;

  before(async () => {
    db = await createInMemoryDb();
    bus = createBus();
    const userId = db.exec("SELECT id FROM usuarios WHERE username = 'admin'")[0].values[0][0];
    const marcaId = db.exec('SELECT id FROM marcas LIMIT 1')[0].values[0][0];
    const modeloId = db.exec('SELECT id FROM modelos WHERE id_marca = ?', [marcaId])[0].values[0][0];
    tipoId = db.exec('SELECT id FROM tipos_modificacion LIMIT 1')[0].values[0][0];
    autoRepo = new AutoRepository(db);
    repo = new ModificacionRepository(db, { bus });
    const created = autoRepo.create({ placa: 'BUS-001', idMarca: marcaId, idModelo: modeloId, anio: 2024, idUsuario: userId });
    autoId = created.id;
  });

  after(() => { if (db) closeInMemoryDb(db); });

  beforeEach(() => {
    bus.removeAllListeners();
  });

  it('create() emits MODIFICACION_CREATED with { autoId, modificacionId }', () => {
    const seen = [];
    bus.on(events.MODIFICACION_CREATED, (p) => seen.push(p));

    const m = repo.create({
      nombre: 'turbo', costo: 100, nivelImpacto: 'Alto', fecha: '2024-01-15', autoId, idTipoModificacion: tipoId
    });

    assert.equal(seen.length, 1);
    assert.equal(seen[0].autoId, autoId);
    assert.equal(seen[0].modificacionId, m.id);
    assert.equal(seen[0].type, events.MODIFICACION_CREATED);
    assert.equal(typeof seen[0].at, 'string');
  });

  it('update() emits MODIFICACION_UPDATED with the affected autoId', () => {
    const m = repo.create({ nombre: 'pre-u', costo: 100, nivelImpacto: 'Bajo', fecha: '2024-02-01', autoId, idTipoModificacion: tipoId });
    const seen = [];
    bus.on(events.MODIFICACION_UPDATED, (p) => seen.push(p));

    const updated = repo.update(m.id, { nombre: 'post-u' });
    assert.equal(updated.nombre, 'post-u');

    assert.equal(seen.length, 1);
    assert.equal(seen[0].autoId, autoId);
    assert.equal(seen[0].modificacionId, m.id);
    assert.equal(seen[0].type, events.MODIFICACION_UPDATED);
  });

  it('delete() emits MODIFICACION_DELETED with the parent autoId', () => {
    const m = repo.create({ nombre: 'pre-d', costo: 100, nivelImpacto: 'Bajo', fecha: '2024-03-01', autoId, idTipoModificacion: tipoId });
    const seen = [];
    bus.on(events.MODIFICACION_DELETED, (p) => seen.push(p));

    repo.delete(m.id);
    assert.equal(seen.length, 1);
    assert.equal(seen[0].autoId, autoId);
    assert.equal(seen[0].modificacionId, m.id);
    assert.equal(seen[0].type, events.MODIFICACION_DELETED);
  });

  it('failed create() does NOT emit (e.g. unknown autoId violates FK)', () => {
    const seen = [];
    bus.on(events.MODIFICACION_CREATED, (p) => seen.push(p));

    // FK violation: autoId 99999 does not exist
    let threw = false;
    try {
      repo.create({
        nombre: 'orphan', costo: 100, nivelImpacto: 'Bajo', fecha: '2024-04-01', autoId: 99999, idTipoModificacion: tipoId
      });
    } catch (_) {
      threw = true;
    }
    assert.equal(threw, true, 'create with invalid autoId must throw (FK violation)');
    assert.equal(seen.length, 0, 'no event should be emitted on a failed mutation');
  });

  it('event payload includes a parseable ISO timestamp', () => {
    const seen = [];
    bus.on(events.MODIFICACION_CREATED, (p) => seen.push(p));
    repo.create({ nombre: 'time', costo: 100, nivelImpacto: 'Bajo', fecha: '2024-05-01', autoId, idTipoModificacion: tipoId });
    assert.equal(seen.length, 1);
    const ts = Date.parse(seen[0].at);
    assert.ok(!Number.isNaN(ts), 'at must be a parseable ISO timestamp');
  });

  it('emits exactly one event per successful mutation (no double-emit)', () => {
    const seenC = []; bus.on(events.MODIFICACION_CREATED, (p) => seenC.push(p));
    const seenU = []; bus.on(events.MODIFICACION_UPDATED, (p) => seenU.push(p));
    const seenD = []; bus.on(events.MODIFICACION_DELETED, (p) => seenD.push(p));

    const m = repo.create({ nombre: 'one', costo: 100, nivelImpacto: 'Bajo', fecha: '2024-06-01', autoId, idTipoModificacion: tipoId });
    repo.update(m.id, { nombre: 'one-updated' });
    repo.delete(m.id);

    assert.equal(seenC.length, 1);
    assert.equal(seenU.length, 1);
    assert.equal(seenD.length, 1);
  });

  it('repos created WITHOUT a bus still work (bus is optional for backward compat)', () => {
    const repo2 = new ModificacionRepository(db); // no bus
    const m = repo2.create({ nombre: 'no-bus', costo: 100, nivelImpacto: 'Bajo', fecha: '2024-07-01', autoId, idTipoModificacion: tipoId });
    assert.equal(typeof m.id, 'number');
    // The constructor MUST NOT throw when no bus is passed
  });
});
