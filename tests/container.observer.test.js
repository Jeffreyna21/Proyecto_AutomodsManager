const { describe, it, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { createInMemoryDb, closeInMemoryDb } = require('./helpers/inMemoryDb');
const { createBus } = require('../src/bus');
const events = require('../src/domain/events/events');

const CONTAINER_PATH = '../src/container';

describe('container — wires bus, ModificacionRepository, and AnalisisRecalcObserver (PR 2)', () => {
  let db;

  afterEach(() => {
    const { _resetContainer } = require(CONTAINER_PATH);
    _resetContainer();
    if (db) {
      closeInMemoryDb(db);
      db = null;
    }
  });

  it('container.services.analisis is an AnalisisService instance', async () => {
    const { buildContainer } = require(CONTAINER_PATH);
    db = await createInMemoryDb();
    const c = await buildContainer({ db });
    assert.ok(c.services, 'container must expose services');
    assert.ok(c.services.analisis, 'container.services.analisis must be defined');
    assert.equal(typeof c.services.analisis.recalcularForAuto, 'function');
  });

  it('ModificacionRepository is wired with the bus (emits events on writes)', async () => {
    const { buildContainer } = require(CONTAINER_PATH);
    db = await createInMemoryDb();
    const c = await buildContainer({ db });

    const seen = [];
    c.bus.on(events.MODIFICACION_CREATED, (p) => seen.push(p));

    // create the prerequisite auto first
    const userId = db.exec("SELECT id FROM usuarios WHERE username = 'admin'")[0].values[0][0];
    const marcaId = db.exec('SELECT id FROM marcas LIMIT 1')[0].values[0][0];
    const modeloId = db.exec('SELECT id FROM modelos WHERE id_marca = ?', [marcaId])[0].values[0][0];
    const tipoId = db.exec('SELECT id FROM tipos_modificacion LIMIT 1')[0].values[0][0];
    const auto = c.repositories.auto.create({ placa: 'WIRE-CASC', idMarca: marcaId, idModelo: modeloId, anio: 2024, idUsuario: userId });

    c.repositories.modificacion.create({
      nombre: 'wire', costo: 100, nivelImpacto: 'Alto', fecha: '2024-01-15', autoId: auto.id, idTipoModificacion: tipoId
    });

    assert.equal(seen.length, 1);
    assert.equal(seen[0].autoId, auto.id);
  });

  it('AnalisisRecalcObserver is attached by default — recalc fires after a CREATED event', async () => {
    const { buildContainer } = require(CONTAINER_PATH);
    db = await createInMemoryDb();
    const c = await buildContainer({ db });

    // Seed an auto + first mod (the observer will fire on this create)
    const userId = db.exec("SELECT id FROM usuarios WHERE username = 'admin'")[0].values[0][0];
    const marcaId = db.exec('SELECT id FROM marcas LIMIT 1')[0].values[0][0];
    const modeloId = db.exec('SELECT id FROM modelos WHERE id_marca = ?', [marcaId])[0].values[0][0];
    const tipoId = db.exec('SELECT id FROM tipos_modificacion LIMIT 1')[0].values[0][0];
    const auto = c.repositories.auto.create({ placa: 'OBS-001', idMarca: marcaId, idModelo: modeloId, anio: 2024, idUsuario: userId });

    c.repositories.modificacion.create({
      nombre: 'first', costo: 100, nivelImpacto: 'Alto', fecha: '2024-01-01', autoId: auto.id, idTipoModificacion: tipoId
    });

    // The observer fires synchronously on the bus, so the analisis
    // row must exist immediately after the create returns.
    const row = c.repositories.analisis.findByAutoId(auto.id);
    assert.ok(row, 'analisis row must exist after CREATED event');
    assert.equal(row.indicador, 'Excelente');
    assert.equal(row.impacto_total, 3);
  });

  it('container.observers.analisisRecalc exposes the wired observer', async () => {
    const { buildContainer } = require(CONTAINER_PATH);
    db = await createInMemoryDb();
    const c = await buildContainer({ db });
    assert.ok(c.observers, 'container must expose observers');
    assert.ok(c.observers.analisisRecalc, 'container.observers.analisisRecalc must be defined');
    assert.equal(typeof c.observers.analisisRecalc.attach, 'function');
  });

  it('buildContainer({ withRecalcObserver: false }) skips observer registration', async () => {
    const { buildContainer } = require(CONTAINER_PATH);
    db = await createInMemoryDb();
    const c = await buildContainer({ db, withRecalcObserver: false });

    const userId = db.exec("SELECT id FROM usuarios WHERE username = 'admin'")[0].values[0][0];
    const marcaId = db.exec('SELECT id FROM marcas LIMIT 1')[0].values[0][0];
    const modeloId = db.exec('SELECT id FROM modelos WHERE id_marca = ?', [marcaId])[0].values[0][0];
    const tipoId = db.exec('SELECT id FROM tipos_modificacion LIMIT 1')[0].values[0][0];
    const auto = c.repositories.auto.create({ placa: 'NO-OBS', idMarca: marcaId, idModelo: modeloId, anio: 2024, idUsuario: userId });

    c.repositories.modificacion.create({
      nombre: 'no-obs', costo: 100, nivelImpacto: 'Alto', fecha: '2024-01-01', autoId: auto.id, idTipoModificacion: tipoId
    });

    const row = c.repositories.analisis.findByAutoId(auto.id);
    assert.equal(row, null, 'analisis row must NOT exist when observer is disabled');
  });
});
