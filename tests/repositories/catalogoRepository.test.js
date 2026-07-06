const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { createInMemoryDb, closeInMemoryDb } = require('../helpers/inMemoryDb');
const CatalogoRepository = require('../../src/repositories/CatalogoRepository');

describe('repositories/CatalogoRepository', () => {
  let db;
  let repo;

  before(async () => {
    db = await createInMemoryDb();
    repo = new CatalogoRepository(db);
  });

  after(() => { if (db) closeInMemoryDb(db); });

  it('findMarcas() returns 7 marcas ordered by nombre', () => {
    const marcas = repo.findMarcas();
    assert.equal(marcas.length, 7);
    const nombres = marcas.map(m => m.nombre);
    const sorted = [...nombres].sort();
    assert.deepEqual(nombres, sorted, 'marcas must be ordered by nombre');
  });

  it('findModelosByMarca() returns 5 modelos for the given marca', () => {
    const toyota = repo.findMarcas().find(m => m.nombre === 'Toyota');
    const modelos = repo.findModelosByMarca(toyota.id);
    assert.equal(modelos.length, 5);
    assert.ok(modelos.every(m => m.id_marca === toyota.id));
  });

  it('findModelosByMarca() returns [] for a marca with no modelos (here: all have 5)', () => {
    // Sanity check: an unknown marca should return [].
    const modelos = repo.findModelosByMarca(99999);
    assert.deepEqual(modelos, []);
  });

  it('findTiposModificacion() returns 3 tipos', () => {
    const tipos = repo.findTiposModificacion();
    assert.equal(tipos.length, 3);
    const nombres = tipos.map(t => t.nombre);
    assert.ok(nombres.includes('Rendimiento'));
    assert.ok(nombres.includes('Estética'));
    assert.ok(nombres.includes('Mantenimiento'));
  });
});
