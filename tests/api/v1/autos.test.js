const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const session = require('express-session');
const request = require('supertest');
const { createInMemoryDb, closeInMemoryDb, SEED_USUARIOS } = require('../../helpers/inMemoryDb');
const { buildApiApp } = require('../../helpers/apiApp');

/**
 * Helper: crea una app de Express con la sesión configurada, el router
 * /api/v1/autos montado y el errorHandler. Devuelve { app, container, cleanup }.
 */
async function buildAutosApp() {
  const { buildContainer, _resetContainer } = require('../../../src/container');
  const autosRoutes = require('../../../src/api/v1/autos.routes');

  _resetContainer();
  const db = await createInMemoryDb();
  const container = await buildContainer({ db });
  const app = buildApiApp({
    container,
    mounts: [{ mountPath: '/api/v1/autos', routes: autosRoutes }]
  });

  return {
    app,
    container,
    cleanup: () => { _resetContainer(); closeInMemoryDb(db); }
  };
}

/**
 * Helper: loguea un usuario y devuelve un supertest agent con la
 * cookie de sesión ya establecida.
 */
async function loginAs(app, username, password) {
  const agent = request.agent(app);
  const r = await agent.post('/api/v1/auth/login').send({ username, password });
  if (r.status !== 200) {
    throw new Error(`loginAs(${username}) falló: ${r.status} ${JSON.stringify(r.body)}`);
  }
  return agent;
}

describe('api/v1/autos — GET /', () => {
  let setup;
  beforeEach(async () => { setup = await buildAutosApp(); });
  afterEach(() => setup.cleanup());

  it('lista vacía cuando el usuario no tiene autos', async () => {
    const agent = await loginAs(setup.app, SEED_USUARIOS[0].username, SEED_USUARIOS[0].password);
    const res = await agent.get('/api/v1/autos');
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.items, []);
    assert.equal(res.body.page, 1);
    assert.equal(res.body.totalPages, 0);
  });

  it('lista los autos del usuario autenticado (paginado)', async () => {
    const agent = await loginAs(setup.app, SEED_USUARIOS[0].username, SEED_USUARIOS[0].password);
    // crear 2 autos para el admin
    await agent.post('/api/v1/autos').send({
      placa: 'AAA111', idMarca: 1, idModelo: 1, anio: 2020
    });
    await agent.post('/api/v1/autos').send({
      placa: 'BBB222', idMarca: 1, idModelo: 1, anio: 2021
    });
    const res = await agent.get('/api/v1/autos');
    assert.equal(res.status, 200);
    assert.equal(res.body.items.length, 2);
    assert.equal(res.body.totalPages, 1);
  });

  it('NO lista autos de otros usuarios (scope por id_usuario)', async () => {
    const adminAgent = await loginAs(setup.app, SEED_USUARIOS[0].username, SEED_USUARIOS[0].password);
    const userAgent = await loginAs(setup.app, SEED_USUARIOS[1].username, SEED_USUARIOS[1].password);
    // admin crea un auto
    await adminAgent.post('/api/v1/autos').send({
      placa: 'AAA111', idMarca: 1, idModelo: 1, anio: 2020
    });
    // user lista sus autos (debería estar vacío)
    const res = await userAgent.get('/api/v1/autos');
    assert.equal(res.status, 200);
    assert.equal(res.body.items.length, 0);
  });

  it('sin sesión devuelve 401', async () => {
    const res = await request(setup.app).get('/api/v1/autos');
    assert.equal(res.status, 401);
    assert.equal(res.body.error.code, 'UNAUTHORIZED');
  });
});

describe('api/v1/autos — POST /', () => {
  let setup;
  beforeEach(async () => { setup = await buildAutosApp(); });
  afterEach(() => setup.cleanup());

  it('crea un auto con datos válidos → 201 con DTO', async () => {
    const agent = await loginAs(setup.app, SEED_USUARIOS[0].username, SEED_USUARIOS[0].password);
    const res = await agent.post('/api/v1/autos').send({
      placa: 'ABC-1234', idMarca: 1, idModelo: 1, anio: 2020
    });
    assert.equal(res.status, 201);
    assert.equal(res.body.auto.placa, 'ABC1234');
    assert.equal(typeof res.body.auto.id, 'number');
  });

  it('placa con formato inválido devuelve 400 con details', async () => {
    const agent = await loginAs(setup.app, SEED_USUARIOS[0].username, SEED_USUARIOS[0].password);
    const res = await agent.post('/api/v1/autos').send({
      placa: 'mala-placa', idMarca: 1, idModelo: 1, anio: 2020
    });
    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
    assert.ok(res.body.error.details.some(d => d.path === 'placa'));
  });

  it('placa duplicada para el mismo usuario devuelve 409 CONFLICT', async () => {
    const agent = await loginAs(setup.app, SEED_USUARIOS[0].username, SEED_USUARIOS[0].password);
    const r1 = await agent.post('/api/v1/autos').send({
      placa: 'ABC1234', idMarca: 1, idModelo: 1, anio: 2020
    });
    assert.equal(r1.status, 201, 'precondición: primer create');
    const r2 = await agent.post('/api/v1/autos').send({
      placa: 'ABC1234', idMarca: 1, idModelo: 1, anio: 2021
    });
    assert.equal(r2.status, 409);
    assert.equal(r2.body.error.code, 'CONFLICT');
  });

  it('anio no numérico devuelve 400 con details apuntando a anio', async () => {
    const agent = await loginAs(setup.app, SEED_USUARIOS[0].username, SEED_USUARIOS[0].password);
    const res = await agent.post('/api/v1/autos').send({
      placa: 'ABC1234', idMarca: 1, idModelo: 1, anio: 'no-es-numero'
    });
    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
    assert.ok(res.body.error.details.some(d => d.path === 'anio'));
  });

  it('sin sesión devuelve 401', async () => {
    const res = await request(setup.app).post('/api/v1/autos').send({
      placa: 'ABC1234', idMarca: 1, idModelo: 1, anio: 2020
    });
    assert.equal(res.status, 401);
  });
});

describe('api/v1/autos — GET /:id', () => {
  let setup;
  beforeEach(async () => { setup = await buildAutosApp(); });
  afterEach(() => setup.cleanup());

  it('devuelve el auto del usuario autenticado', async () => {
    const agent = await loginAs(setup.app, SEED_USUARIOS[0].username, SEED_USUARIOS[0].password);
    const create = await agent.post('/api/v1/autos').send({
      placa: 'ABC1234', idMarca: 1, idModelo: 1, anio: 2020
    });
    const res = await agent.get(`/api/v1/autos/${create.body.auto.id}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.auto.placa, 'ABC1234');
  });

  it('auto de otro usuario devuelve 404 (existence-leak safe)', async () => {
    const adminAgent = await loginAs(setup.app, SEED_USUARIOS[0].username, SEED_USUARIOS[0].password);
    const userAgent = await loginAs(setup.app, SEED_USUARIOS[1].username, SEED_USUARIOS[1].password);
    const create = await adminAgent.post('/api/v1/autos').send({
      placa: 'ABC1234', idMarca: 1, idModelo: 1, anio: 2020
    });
    const res = await userAgent.get(`/api/v1/autos/${create.body.auto.id}`);
    assert.equal(res.status, 404);
    assert.equal(res.body.error.code, 'NOT_FOUND');
  });

  it('auto inexistente devuelve 404', async () => {
    const agent = await loginAs(setup.app, SEED_USUARIOS[0].username, SEED_USUARIOS[0].password);
    const res = await agent.get('/api/v1/autos/9999');
    assert.equal(res.status, 404);
    assert.equal(res.body.error.code, 'NOT_FOUND');
  });
});

describe('api/v1/autos — PUT /:id', () => {
  let setup;
  beforeEach(async () => { setup = await buildAutosApp(); });
  afterEach(() => setup.cleanup());

  it('actualiza campos y devuelve el DTO actualizado', async () => {
    const agent = await loginAs(setup.app, SEED_USUARIOS[0].username, SEED_USUARIOS[0].password);
    const create = await agent.post('/api/v1/autos').send({
      placa: 'ABC1234', idMarca: 1, idModelo: 1, anio: 2020
    });
    const res = await agent.put(`/api/v1/autos/${create.body.auto.id}`).send({
      anio: 2023
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.auto.anio, 2023);
    assert.equal(res.body.auto.placa, 'ABC1234');
  });

  it('auto de otro usuario devuelve 404', async () => {
    const adminAgent = await loginAs(setup.app, SEED_USUARIOS[0].username, SEED_USUARIOS[0].password);
    const userAgent = await loginAs(setup.app, SEED_USUARIOS[1].username, SEED_USUARIOS[1].password);
    const create = await adminAgent.post('/api/v1/autos').send({
      placa: 'ABC1234', idMarca: 1, idModelo: 1, anio: 2020
    });
    const res = await userAgent.put(`/api/v1/autos/${create.body.auto.id}`).send({ anio: 2024 });
    assert.equal(res.status, 404);
  });

  it('placa duplicada en update devuelve 409', async () => {
    const agent = await loginAs(setup.app, SEED_USUARIOS[0].username, SEED_USUARIOS[0].password);
    const a = await agent.post('/api/v1/autos').send({
      placa: 'AAA111', idMarca: 1, idModelo: 1, anio: 2020
    });
    const b = await agent.post('/api/v1/autos').send({
      placa: 'BBB222', idMarca: 1, idModelo: 1, anio: 2020
    });
    const res = await agent.put(`/api/v1/autos/${b.body.auto.id}`).send({
      placa: 'AAA111'
    });
    assert.equal(res.status, 409);
  });
});

describe('api/v1/autos — DELETE /:id', () => {
  let setup;
  beforeEach(async () => { setup = await buildAutosApp(); });
  afterEach(() => setup.cleanup());

  it('elimina un auto propio y devuelve 204', async () => {
    const agent = await loginAs(setup.app, SEED_USUARIOS[0].username, SEED_USUARIOS[0].password);
    const create = await agent.post('/api/v1/autos').send({
      placa: 'ABC1234', idMarca: 1, idModelo: 1, anio: 2020
    });
    const del = await agent.delete(`/api/v1/autos/${create.body.auto.id}`);
    assert.equal(del.status, 204);
    // y ya no aparece
    const get = await agent.get(`/api/v1/autos/${create.body.auto.id}`);
    assert.equal(get.status, 404);
  });

  it('auto de otro usuario devuelve 404', async () => {
    const adminAgent = await loginAs(setup.app, SEED_USUARIOS[0].username, SEED_USUARIOS[0].password);
    const userAgent = await loginAs(setup.app, SEED_USUARIOS[1].username, SEED_USUARIOS[1].password);
    const create = await adminAgent.post('/api/v1/autos').send({
      placa: 'ABC1234', idMarca: 1, idModelo: 1, anio: 2020
    });
    const res = await userAgent.delete(`/api/v1/autos/${create.body.auto.id}`);
    assert.equal(res.status, 404);
  });

  it('eliminar un auto cascada sus modificaciones', async () => {
    const agent = await loginAs(setup.app, SEED_USUARIOS[0].username, SEED_USUARIOS[0].password);
    const create = await agent.post('/api/v1/autos').send({
      placa: 'ABC1234', idMarca: 1, idModelo: 1, anio: 2020
    });
    const idAuto = create.body.auto.id;
    // Creamos una modificación
    await agent.post(`/api/v1/autos/${idAuto}/modificaciones`).send({
      nombre: 'Turbo', costo: 1500, nivelImpacto: 'Alto',
      fecha: '2024-01-01', idTipoModificacion: 1
    });
    const del = await agent.delete(`/api/v1/autos/${idAuto}`);
    assert.equal(del.status, 204);
    // La modificación ya no debe existir
    const list = await agent.get(`/api/v1/autos/${idAuto}/modificaciones`);
    assert.equal(list.status, 404, 'el auto ya no existe → /modificaciones devuelve 404');
  });
});
