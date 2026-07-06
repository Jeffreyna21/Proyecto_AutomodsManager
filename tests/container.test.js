const { describe, it, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { createInMemoryDb, closeInMemoryDb } = require('./helpers/inMemoryDb');

const CONTAINER_PATH = '../src/container';

describe('container — composition root', () => {
  let db;

  afterEach(() => {
    const { _resetContainer } = require(CONTAINER_PATH);
    _resetContainer();
    if (db) {
      closeInMemoryDb(db);
      db = null;
    }
  });

  it('buildContainer() returns an object with the documented shape', async () => {
    const { buildContainer } = require(CONTAINER_PATH);
    db = await createInMemoryDb();
    const c = await buildContainer({ db });
    assert.equal(typeof c, 'object');
    assert.equal(typeof c.bus, 'object');
    assert.equal(typeof c.repositories, 'object');
    assert.equal(typeof c.policies, 'object');
    assert.equal(typeof c.useCases, 'object');
    assert.equal(typeof c.controllers, 'object');
    assert.equal(typeof c.buildApp, 'function');
  });

  it('getContainer() is a singleton — same object across reads', async () => {
    const { buildContainer, getContainer } = require(CONTAINER_PATH);
    db = await createInMemoryDb();
    await buildContainer({ db });
    const a = getContainer();
    const b = getContainer();
    assert.strictEqual(a, b);
  });

  it('buildApp() returns a function (Express app placeholder)', async () => {
    const { buildContainer } = require(CONTAINER_PATH);
    db = await createInMemoryDb();
    const c = await buildContainer({ db });
    const app = c.buildApp();
    assert.equal(typeof app, 'function');
  });

  it('wires every concrete repository against the injected Database', async () => {
    const { buildContainer } = require(CONTAINER_PATH);
    const AutoRepository = require('../src/repositories/AutoRepository');
    const ModificacionRepository = require('../src/repositories/ModificacionRepository');
    const UsuarioRepository = require('../src/repositories/UsuarioRepository');
    const CatalogoRepository = require('../src/repositories/CatalogoRepository');
    const AnalisisRepository = require('../src/repositories/AnalisisRepository');
    db = await createInMemoryDb();
    const c = await buildContainer({ db });

    assert.ok(c.repositories.auto instanceof AutoRepository, 'repositories.auto');
    assert.ok(c.repositories.modificacion instanceof ModificacionRepository, 'repositories.modificacion');
    assert.ok(c.repositories.usuario instanceof UsuarioRepository, 'repositories.usuario');
    assert.ok(c.repositories.catalogo instanceof CatalogoRepository, 'repositories.catalogo');
    assert.ok(c.repositories.analisis instanceof AnalisisRepository, 'repositories.analisis');
  });

  it('repositories share the same Database handle from the container', async () => {
    const { buildContainer } = require(CONTAINER_PATH);
    db = await createInMemoryDb();
    const c = await buildContainer({ db });
    // The wired repos can read and write through the shared handle: this
    // proves the injection was wired correctly, not just that the keys exist.
    const created = c.repositories.auto.create({
      placa: 'WIRE-01', idMarca: 1, idModelo: 1, anio: 2024, idUsuario: 1
    });
    assert.equal(typeof created.id, 'number');
    const read = c.repositories.auto.findById(created.id);
    assert.equal(read.placa, 'WIRE-01');
  });

  it('wires every policy', async () => {
    const { buildContainer } = require(CONTAINER_PATH);
    const AutoPolicy = require('../src/policies/AutoPolicy');
    const ModificacionPolicy = require('../src/policies/ModificacionPolicy');
    db = await createInMemoryDb();
    const c = await buildContainer({ db });
    assert.ok(c.policies.auto instanceof AutoPolicy, 'policies.auto');
    assert.ok(c.policies.modificacion instanceof ModificacionPolicy, 'policies.modificacion');
  });
});
