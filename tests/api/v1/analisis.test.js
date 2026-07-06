const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createInMemoryDb, closeInMemoryDb, SEED_USUARIOS } = require('../../helpers/inMemoryDb');
const { buildApiApp } = require('../../helpers/apiApp');

/**
 * Helper: construye una app con auth + autos + modificaciones + analisis
 * montados bajo /api/v1. Necesita autos para poder crear el auto del
 * usuario antes de pegarle al endpoint de analisis.
 */
async function buildAnalisisApp() {
  const { buildContainer, _resetContainer } = require('../../../src/container');
  const autosRoutes = require('../../../src/api/v1/autos.routes');
  const modRoutes = require('../../../src/api/v1/modificaciones.routes');
  const analisisRoutes = require('../../../src/api/v1/analisis.routes');

  _resetContainer();
  const db = await createInMemoryDb();
  const container = await buildContainer({ db });
  const app = buildApiApp({
    container,
    mounts: [
      { mountPath: '/api/v1/autos', routes: autosRoutes },
      { mountPath: '/api/v1', routes: [modRoutes, analisisRoutes] }
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

describe('api/v1/analisis — GET /autos/:id/analisis', () => {
  let setup;
  beforeEach(async () => { setup = await buildAnalisisApp(); });
  afterEach(() => setup.cleanup());

  it('devuelve envelope con metricas, seriesEvolucion y distribucionPorTipo', async () => {
    const agent = await loginAs(setup.app, SEED_USUARIOS[0].username, SEED_USUARIOS[0].password);
    const auto = await createAuto(agent, 'AAA111');
    // 2 modificaciones: 1 de rendimiento, 1 de estetica
    await agent.post(`/api/v1/autos/${auto.id}/modificaciones`).send({
      nombre: 'Turbo', costo: 1500, nivelImpacto: 'Alto',
      fecha: '2024-01-15', idTipoModificacion: 1
    });
    await agent.post(`/api/v1/autos/${auto.id}/modificaciones`).send({
      nombre: 'Pintura', costo: 800, nivelImpacto: 'Bajo',
      fecha: '2024-02-10', idTipoModificacion: 2
    });
    const res = await agent.get(`/api/v1/autos/${auto.id}/analisis`);
    assert.equal(res.status, 200);
    // Estructura: { analisis: { metricas, seriesEvolucion, distribucionPorTipo } }
    assert.ok(res.body.analisis, 'debe haber clave analisis');
    const a = res.body.analisis;
    assert.ok(a.metricas, 'debe haber clave metricas');
    assert.equal(a.metricas.numero_modificaciones, 2);
    assert.equal(a.metricas.impacto_total, 4); // Alto(3) + Bajo(1)
    assert.equal(typeof a.metricas.costo_total, 'number');
    assert.equal(typeof a.metricas.indicador, 'string');
    assert.ok(Array.isArray(a.seriesEvolucion));
    assert.equal(a.seriesEvolucion.length, 2);
    assert.ok(Array.isArray(a.distribucionPorTipo));
    assert.equal(a.distribucionPorTipo.length, 2);
  });

  it('auto sin modificaciones devuelve metricas con numero_modificaciones=0', async () => {
    const agent = await loginAs(setup.app, SEED_USUARIOS[0].username, SEED_USUARIOS[0].password);
    const auto = await createAuto(agent, 'AAA111');
    const res = await agent.get(`/api/v1/autos/${auto.id}/analisis`);
    assert.equal(res.status, 200);
    const m = res.body.analisis.metricas;
    assert.equal(m.numero_modificaciones, 0);
    assert.equal(m.impacto_total, 0);
    assert.equal(m.costo_total, 0);
    assert.equal(m.indicador, 'Sin datos');
  });

  it('analisis de auto de otro usuario devuelve 404 con envelope', async () => {
    const adminAgent = await loginAs(setup.app, SEED_USUARIOS[0].username, SEED_USUARIOS[0].password);
    const userAgent = await loginAs(setup.app, SEED_USUARIOS[1].username, SEED_USUARIOS[1].password);
    const auto = await createAuto(adminAgent, 'AAA111');
    const res = await userAgent.get(`/api/v1/autos/${auto.id}/analisis`);
    assert.equal(res.status, 404);
    assert.equal(res.body.error.code, 'NOT_FOUND');
  });

  it('auto inexistente devuelve 404 con envelope', async () => {
    const agent = await loginAs(setup.app, SEED_USUARIOS[0].username, SEED_USUARIOS[0].password);
    const res = await agent.get('/api/v1/autos/9999/analisis');
    assert.equal(res.status, 404);
    assert.equal(res.body.error.code, 'NOT_FOUND');
  });

  it('sin sesion devuelve 401 con envelope', async () => {
    const res = await request(setup.app).get('/api/v1/autos/1/analisis');
    assert.equal(res.status, 401);
    assert.equal(res.body.error.code, 'UNAUTHORIZED');
  });
});
