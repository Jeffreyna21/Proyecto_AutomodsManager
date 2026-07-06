const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createInMemoryDb, closeInMemoryDb, SEED_USUARIOS } = require('../../helpers/inMemoryDb');
const { buildApiApp } = require('../../helpers/apiApp');

async function buildModificacionesApp() {
  const { buildContainer, _resetContainer } = require('../../../src/container');
  const modRoutes = require('../../../src/api/v1/modificaciones.routes');
  const autosRoutes = require('../../../src/api/v1/autos.routes');

  _resetContainer();
  const db = await createInMemoryDb();
  const container = await buildContainer({ db });
  // El router de autos tiene `POST /` (path final = /api/v1/autos/),
  // se monta en /api/v1/autos. El router de modificaciones tiene
  // paths absolutos `/autos/:id/modificaciones` y `/modificaciones/:id`,
  // se monta en /api/v1.
  const app = buildApiApp({
    container,
    mounts: [
      { mountPath: '/api/v1/autos', routes: autosRoutes },
      { mountPath: '/api/v1', routes: modRoutes }
    ]
  });

  return {
    app,
    container,
    cleanup: () => { _resetContainer(); closeInMemoryDb(db); }
  };
}

async function loginAs(app, username, password) {
  const agent = request.agent(app);
  const r = await agent.post('/api/v1/auth/login').send({ username, password });
  if (r.status !== 200) {
    throw new Error(`loginAs(${username}) falló: ${r.status} ${JSON.stringify(r.body)}`);
  }
  return agent;
}

async function createAuto(agent, placa) {
  const r = await agent.post('/api/v1/autos').send({
    placa, idMarca: 1, idModelo: 1, anio: 2020
  });
  if (r.status !== 201) {
    throw new Error(`createAuto(${placa}) falló: ${r.status} ${JSON.stringify(r.body)}`);
  }
  return r.body.auto;
}

describe('api/v1 — modificaciones', () => {
  let setup;
  beforeEach(async () => { setup = await buildModificacionesApp(); });
  afterEach(() => setup.cleanup());

  it('POST /api/v1/autos/:id/modificaciones crea una modificación', async () => {
    const agent = await loginAs(setup.app, SEED_USUARIOS[0].username, SEED_USUARIOS[0].password);
    const auto = await createAuto(agent, 'AAA111');
    const res = await agent.post(`/api/v1/autos/${auto.id}/modificaciones`).send({
      nombre: 'Turbo', costo: 1500, nivelImpacto: 'Alto',
      fecha: '2024-01-15', idTipoModificacion: 1
    });
    assert.equal(res.status, 201);
    assert.equal(res.body.modificacion.nombre, 'Turbo');
    assert.equal(res.body.modificacion.costo, 1500);
  });

  it('GET /api/v1/autos/:id/modificaciones lista las del auto', async () => {
    const agent = await loginAs(setup.app, SEED_USUARIOS[0].username, SEED_USUARIOS[0].password);
    const auto = await createAuto(agent, 'AAA111');
    await agent.post(`/api/v1/autos/${auto.id}/modificaciones`).send({
      nombre: 'Mod 1', costo: 100, nivelImpacto: 'Bajo',
      fecha: '2024-01-01', idTipoModificacion: 1
    });
    await agent.post(`/api/v1/autos/${auto.id}/modificaciones`).send({
      nombre: 'Mod 2', costo: 200, nivelImpacto: 'Medio',
      fecha: '2024-02-01', idTipoModificacion: 1
    });
    const res = await agent.get(`/api/v1/autos/${auto.id}/modificaciones`);
    assert.equal(res.status, 200);
    assert.equal(res.body.items.length, 2);
  });

  it('PUT /api/v1/modificaciones/:id actualiza una modificación propia', async () => {
    const agent = await loginAs(setup.app, SEED_USUARIOS[0].username, SEED_USUARIOS[0].password);
    const auto = await createAuto(agent, 'AAA111');
    const create = await agent.post(`/api/v1/autos/${auto.id}/modificaciones`).send({
      nombre: 'Original', costo: 100, nivelImpacto: 'Bajo',
      fecha: '2024-01-01', idTipoModificacion: 1
    });
    const idMod = create.body.modificacion.id;
    const res = await agent.put(`/api/v1/modificaciones/${idMod}`).send({
      nombre: 'Actualizado', costo: 250
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.modificacion.nombre, 'Actualizado');
    assert.equal(res.body.modificacion.costo, 250);
  });

  it('DELETE /api/v1/modificaciones/:id elimina una modificación propia', async () => {
    const agent = await loginAs(setup.app, SEED_USUARIOS[0].username, SEED_USUARIOS[0].password);
    const auto = await createAuto(agent, 'AAA111');
    const create = await agent.post(`/api/v1/autos/${auto.id}/modificaciones`).send({
      nombre: 'X', costo: 100, nivelImpacto: 'Bajo',
      fecha: '2024-01-01', idTipoModificacion: 1
    });
    const idMod = create.body.modificacion.id;
    const res = await agent.delete(`/api/v1/modificaciones/${idMod}`);
    assert.equal(res.status, 204);
    const get = await agent.get(`/api/v1/autos/${auto.id}/modificaciones`);
    assert.equal(get.body.items.length, 0);
  });

  it('modificación de otro usuario devuelve 404 (existence-leak safe)', async () => {
    const adminAgent = await loginAs(setup.app, SEED_USUARIOS[0].username, SEED_USUARIOS[0].password);
    const userAgent = await loginAs(setup.app, SEED_USUARIOS[1].username, SEED_USUARIOS[1].password);
    const auto = await createAuto(adminAgent, 'AAA111');
    const create = await adminAgent.post(`/api/v1/autos/${auto.id}/modificaciones`).send({
      nombre: 'X', costo: 100, nivelImpacto: 'Bajo',
      fecha: '2024-01-01', idTipoModificacion: 1
    });
    const idMod = create.body.modificacion.id;
    // user intenta listar las mods del auto de admin → 404
    const list = await userAgent.get(`/api/v1/autos/${auto.id}/modificaciones`);
    assert.equal(list.status, 404);
    // user intenta actualizar la mod de admin → 404
    const put = await userAgent.put(`/api/v1/modificaciones/${idMod}`).send({ nombre: 'hack' });
    assert.equal(put.status, 404);
    // user intenta eliminar la mod de admin → 404
    const del = await userAgent.delete(`/api/v1/modificaciones/${idMod}`);
    assert.equal(del.status, 404);
  });

  it('crear modificación en auto de otro usuario devuelve 404', async () => {
    const adminAgent = await loginAs(setup.app, SEED_USUARIOS[0].username, SEED_USUARIOS[0].password);
    const userAgent = await loginAs(setup.app, SEED_USUARIOS[1].username, SEED_USUARIOS[1].password);
    const auto = await createAuto(adminAgent, 'AAA111');
    const res = await userAgent.post(`/api/v1/autos/${auto.id}/modificaciones`).send({
      nombre: 'hack', costo: 1, nivelImpacto: 'Bajo',
      fecha: '2024-01-01', idTipoModificacion: 1
    });
    assert.equal(res.status, 404);
    assert.equal(res.body.error.code, 'NOT_FOUND');
  });

  it('cuerpo con nivelImpacto inválido devuelve 400 con details', async () => {
    const agent = await loginAs(setup.app, SEED_USUARIOS[0].username, SEED_USUARIOS[0].password);
    const auto = await createAuto(agent, 'AAA111');
    const res = await agent.post(`/api/v1/autos/${auto.id}/modificaciones`).send({
      nombre: 'X', costo: 100, nivelImpacto: 'critico',
      fecha: '2024-01-01', idTipoModificacion: 1
    });
    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
    assert.ok(res.body.error.details.some(d => d.path === 'nivelImpacto'));
  });

  it('sin sesión devuelve 401', async () => {
    const res = await request(setup.app).get('/api/v1/autos/1/modificaciones');
    assert.equal(res.status, 401);
  });
});
