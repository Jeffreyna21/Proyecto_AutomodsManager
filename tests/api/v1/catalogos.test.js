const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createInMemoryDb, closeInMemoryDb } = require('../../helpers/inMemoryDb');
const { buildApiApp } = require('../../helpers/apiApp');

/**
 * Helper: construye una app con /api/v1/catalogos montado.
 * Los catalogos son publicos (no requieren sesion).
 */
async function buildCatalogosApp() {
  const { buildContainer, _resetContainer } = require('../../../src/container');
  const catalogosRoutes = require('../../../src/api/v1/catalogos.routes');

  _resetContainer();
  const db = await createInMemoryDb();
  const container = await buildContainer({ db });
  // /catalogos va dentro de /api/v1
  const app = buildApiApp({
    container,
    mounts: [{ mountPath: '/api/v1', routes: catalogosRoutes }]
  });

  return {
    app,
    container,
    cleanup: () => { _resetContainer(); closeInMemoryDb(db); }
  };
}

describe('api/v1/catalogos — GET /marcas', () => {
  let setup;
  beforeEach(async () => { setup = await buildCatalogosApp(); });
  afterEach(() => setup.cleanup());

  it('devuelve las 7 marcas del seed con shape { id, nombre }', async () => {
    const res = await request(setup.app).get('/api/v1/marcas');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body));
    assert.equal(res.body.length, 7);
    for (const m of res.body) {
      assert.equal(typeof m.id, 'number');
      assert.equal(typeof m.nombre, 'string');
    }
  });

  it('es publico: no requiere sesion', async () => {
    // Sin agente ni login previo
    const res = await request(setup.app).get('/api/v1/marcas');
    assert.equal(res.status, 200);
  });
});

describe('api/v1/catalogos — GET /marcas/:id/modelos', () => {
  let setup;
  beforeEach(async () => { setup = await buildCatalogosApp(); });
  afterEach(() => setup.cleanup());

  it('devuelve los 5 modelos de la marca 1 (Toyota)', async () => {
    const res = await request(setup.app).get('/api/v1/marcas/1/modelos');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body));
    assert.equal(res.body.length, 5);
    for (const m of res.body) {
      assert.equal(typeof m.id, 'number');
      assert.equal(typeof m.nombre, 'string');
      assert.equal(m.id_marca, 1);
    }
  });

  it('devuelve los 5 modelos de la marca 2 (Chevrolet)', async () => {
    const res = await request(setup.app).get('/api/v1/marcas/2/modelos');
    assert.equal(res.status, 200);
    assert.equal(res.body.length, 5);
    for (const m of res.body) {
      assert.equal(m.id_marca, 2);
    }
  });

  it('marca inexistente devuelve 404 con envelope', async () => {
    const res = await request(setup.app).get('/api/v1/marcas/9999/modelos');
    assert.equal(res.status, 404);
    assert.equal(res.body.error.code, 'NOT_FOUND');
  });

  it('id no numerico devuelve 400 con envelope VALIDATION_ERROR', async () => {
    const res = await request(setup.app).get('/api/v1/marcas/abc/modelos');
    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
  });
});

describe('api/v1/catalogos — GET /tipos-modificacion', () => {
  let setup;
  beforeEach(async () => { setup = await buildCatalogosApp(); });
  afterEach(() => setup.cleanup());

  it('devuelve los 3 tipos del seed con shape { id, nombre }', async () => {
    const res = await request(setup.app).get('/api/v1/tipos-modificacion');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body));
    assert.equal(res.body.length, 3);
    for (const t of res.body) {
      assert.equal(typeof t.id, 'number');
      assert.equal(typeof t.nombre, 'string');
    }
  });

  it('es publico: no requiere sesion', async () => {
    const res = await request(setup.app).get('/api/v1/tipos-modificacion');
    assert.equal(res.status, 200);
  });
});
