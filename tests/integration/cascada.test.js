const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');

const { createInMemoryDb, closeInMemoryDb } = require('../helpers/inMemoryDb');
const { buildContainer, _resetContainer } = require('../../src/container');

/**
 * Integration test for the cascada recalculation flow. This is the
 * single end-to-end proof that the Observer wiring in `src/container.js`
 * actually works: a write through `ModificacionRepository` triggers
 * `AnalisisRecalcObserver` which calls `AnalisisService.recalcularForAuto`
 * which calls `AnalisisRepository.upsert` to persist the new metricas.
 */
describe('integration — cascada recalc end-to-end', () => {
  let db;
  let c;
  let autoId;
  let userId;
  let marcaId;
  let modeloId;
  let tipoId;

  before(async () => {
    db = await createInMemoryDb();
    c = await buildContainer({ db });

    userId = db.exec("SELECT id FROM usuarios WHERE username = 'admin'")[0].values[0][0];
    marcaId = db.exec('SELECT id FROM marcas LIMIT 1')[0].values[0][0];
    modeloId = db.exec('SELECT id FROM modelos WHERE id_marca = ?', [marcaId])[0].values[0][0];
    tipoId = db.exec('SELECT id FROM tipos_modificacion LIMIT 1')[0].values[0][0];

    const auto = c.repositories.auto.create({
      placa: 'CASCADA-01', idMarca: marcaId, idModelo: modeloId, anio: 2024, idUsuario: userId
    });
    autoId = auto.id;
  });

  after(() => {
    _resetContainer();
    if (db) closeInMemoryDb(db);
  });

  it('create() on ModificacionRepository triggers the observer and persists the analysis', () => {
    c.repositories.modificacion.create({
      nombre: 'turbo', costo: 100, nivelImpacto: 'Alto', fecha: '2024-01-01', autoId, idTipoModificacion: tipoId
    });

    const row = c.repositories.analisis.findByAutoId(autoId);
    assert.ok(row, 'analisis row must exist after CREATED event');
    assert.equal(row.auto_id, autoId);
    assert.equal(row.numero_modificaciones, 1);
    assert.equal(row.impacto_total, 3);
    assert.equal(row.promedio_mejora, 3.0);
    assert.equal(row.indicador, 'Excelente');
  });

  it('update() on ModificacionRepository re-triggers the observer with the new metricas', () => {
    const m = c.repositories.modificacion.create({
      nombre: 'intake', costo: 50, nivelImpacto: 'Medio', fecha: '2024-02-01', autoId, idTipoModificacion: tipoId
    });

    // After the create above, we have 2 mods (Alto + Medio) → promedio 2.0 → Regular
    let row = c.repositories.analisis.findByAutoId(autoId);
    assert.equal(row.numero_modificaciones, 2);
    assert.equal(row.impacto_total, 5); // 3 + 2
    assert.equal(row.promedio_mejora, 2.5);
    assert.equal(row.indicador, 'Excelente');

    // Downgrade the Medio to Bajo
    c.repositories.modificacion.update(m.id, { nivelImpacto: 'Bajo' });
    row = c.repositories.analisis.findByAutoId(autoId);
    assert.equal(row.numero_modificaciones, 2);
    assert.equal(row.impacto_total, 4); // 3 + 1
    assert.equal(row.promedio_mejora, 2.0);
    assert.equal(row.indicador, 'Regular');
  });

  it('delete() on ModificacionRepository re-triggers the observer and handles N=0', () => {
    // Delete both mods
    const mods = c.repositories.modificacion.findByAutoId(autoId);
    for (const m of mods) {
      c.repositories.modificacion.delete(m.id);
    }

    const row = c.repositories.analisis.findByAutoId(autoId);
    assert.ok(row, 'analisis row must still exist (upsert, not delete)');
    assert.equal(row.numero_modificaciones, 0);
    assert.equal(row.impacto_total, 0);
    assert.equal(row.promedio_mejora, null);
    assert.equal(row.costo_beneficio, null);
    assert.equal(row.indicador, 'Sin datos');
  });

  it('parametrized: create/update/delete all fire the observer exactly once', () => {
    // The observer should fire exactly once per repository write.
    const seen = [];
    c.bus.on('modificacion.created', () => seen.push('c'));
    c.bus.on('modificacion.updated', () => seen.push('u'));
    c.bus.on('modificacion.deleted', () => seen.push('d'));

    const m = c.repositories.modificacion.create({
      nombre: 'param', costo: 100, nivelImpacto: 'Bajo', fecha: '2024-03-01', autoId, idTipoModificacion: tipoId
    });
    c.repositories.modificacion.update(m.id, { nombre: 'param-2' });
    c.repositories.modificacion.delete(m.id);

    assert.deepEqual(seen, ['c', 'u', 'd']);
  });
});
