const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createInMemoryDb, closeInMemoryDb, SEED_USUARIOS } = require('../../helpers/inMemoryDb');
const { buildApiApp } = require('../../helpers/apiApp');

/**
 * Helper: monta la pila completa de /api/v1 con TODOS los routers
 * (auth, autos, modificaciones, analisis, catalogos) y el
 * errorHandler. Devuelve { app, container, cleanup }.
 */
async function buildFullApp() {
  const { buildContainer, _resetContainer } = require('../../../src/container');
  const authRoutes = require('../../../src/api/v1/auth.routes');
  const autosRoutes = require('../../../src/api/v1/autos.routes');
  const modRoutes = require('../../../src/api/v1/modificaciones.routes');
  const analisisRoutes = require('../../../src/api/v1/analisis.routes');
  const catalogosRoutes = require('../../../src/api/v1/catalogos.routes');

  _resetContainer();
  const db = await createInMemoryDb();
  const container = await buildContainer({ db });
  const app = buildApiApp({
    container,
    mounts: [
      { mountPath: '/api/v1/auth', routes: authRoutes },
      { mountPath: '/api/v1/autos', routes: autosRoutes },
      { mountPath: '/api/v1', routes: [modRoutes, analisisRoutes, catalogosRoutes] }
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

describe('envelope de errores — shape consistente en todos los codigos', () => {
  let setup;
  beforeEach(async () => { setup = await buildFullApp(); });
  afterEach(() => setup.cleanup());

  /**
   * El helper assertEnvelope centraliza la verificacion del shape:
   * - status correcto
   * - content-type = application/json
   * - body tiene la forma { error: { code, message } } con code
   *   en UPPER_SNAKE_CASE y message string
   * - details solo aparece en VALIDATION_ERROR
   */
  function assertEnvelope(res, expectedStatus, expectedCode) {
    assert.equal(res.status, expectedStatus, `status esperado ${expectedStatus}, recibio ${res.status}`);
    assert.match(res.headers['content-type'] || '', /application\/json/);
    assert.equal(typeof res.body, 'object');
    assert.ok(res.body.error, `body debe tener clave 'error', recibio ${JSON.stringify(res.body)}`);
    assert.equal(res.body.error.code, expectedCode);
    assert.equal(typeof res.body.error.message, 'string');
    assert.ok(res.body.error.message.length > 0, 'message no debe estar vacio');
    if (expectedCode !== 'VALIDATION_ERROR') {
      assert.equal(res.body.error.details, undefined,
        `details solo aparece en VALIDATION_ERROR, recibio ${JSON.stringify(res.body.error.details)}`);
    }
  }

  describe('VALIDATION_ERROR (400)', () => {
    it('login con body vacio', async () => {
      const res = await request(setup.app).post('/api/v1/auth/login').send({});
      assertEnvelope(res, 400, 'VALIDATION_ERROR');
      assert.ok(Array.isArray(res.body.error.details));
      assert.ok(res.body.error.details.length > 0);
    });

    it('crear auto con placa invalida', async () => {
      const agent = await loginAs(setup.app, SEED_USUARIOS[0].username, SEED_USUARIOS[0].password);
      const res = await agent.post('/api/v1/autos').send({
        placa: 'mala-placa', idMarca: 1, idModelo: 1, anio: 2020
      });
      assertEnvelope(res, 400, 'VALIDATION_ERROR');
      assert.ok(res.body.error.details.some((d) => d.path === 'placa'));
    });

    it('marcas/:id/modelos con id no numerico', async () => {
      const res = await request(setup.app).get('/api/v1/marcas/abc/modelos');
      assertEnvelope(res, 400, 'VALIDATION_ERROR');
      assert.ok(res.body.error.details.length > 0);
    });
  });

  describe('UNAUTHORIZED (401)', () => {
    it('GET /me sin sesion', async () => {
      const res = await request(setup.app).get('/api/v1/auth/me');
      assertEnvelope(res, 401, 'UNAUTHORIZED');
    });

    it('GET /autos sin sesion', async () => {
      const res = await request(setup.app).get('/api/v1/autos');
      assertEnvelope(res, 401, 'UNAUTHORIZED');
    });

    it('POST /autos sin sesion', async () => {
      const res = await request(setup.app).post('/api/v1/autos').send({
        placa: 'ABC1234', idMarca: 1, idModelo: 1, anio: 2020
      });
      assertEnvelope(res, 401, 'UNAUTHORIZED');
    });

    it('GET /autos/:id/analisis sin sesion', async () => {
      const res = await request(setup.app).get('/api/v1/autos/1/analisis');
      assertEnvelope(res, 401, 'UNAUTHORIZED');
    });

    it('POST /autos/:id/modificaciones sin sesion', async () => {
      const res = await request(setup.app).post('/api/v1/autos/1/modificaciones').send({
        nombre: 'X', costo: 100, nivelImpacto: 'Bajo',
        fecha: '2024-01-01', idTipoModificacion: 1
      });
      assertEnvelope(res, 401, 'UNAUTHORIZED');
    });
  });

  describe('NOT_FOUND (404)', () => {
    it('auto de otro usuario (existence-leak safe)', async () => {
      const admin = await loginAs(setup.app, SEED_USUARIOS[0].username, SEED_USUARIOS[0].password);
      const user = await loginAs(setup.app, SEED_USUARIOS[1].username, SEED_USUARIOS[1].password);
      const create = await admin.post('/api/v1/autos').send({
        placa: 'ABC1234', idMarca: 1, idModelo: 1, anio: 2020
      });
      const res = await user.get(`/api/v1/autos/${create.body.auto.id}`);
      assertEnvelope(res, 404, 'NOT_FOUND');
    });

    it('marca inexistente en catalogos', async () => {
      const res = await request(setup.app).get('/api/v1/marcas/9999/modelos');
      assertEnvelope(res, 404, 'NOT_FOUND');
    });

    it('ruta /api/v1/* inexistente', async () => {
      const res = await request(setup.app).get('/api/v1/no-existe');
      assertEnvelope(res, 404, 'NOT_FOUND');
    });
  });

  describe('CONFLICT (409)', () => {
    it('placa duplicada para el mismo usuario', async () => {
      const agent = await loginAs(setup.app, SEED_USUARIOS[0].username, SEED_USUARIOS[0].password);
      const r1 = await agent.post('/api/v1/autos').send({
        placa: 'ABC1234', idMarca: 1, idModelo: 1, anio: 2020
      });
      assert.equal(r1.status, 201, 'precondicion: primer create');
      const r2 = await agent.post('/api/v1/autos').send({
        placa: 'ABC1234', idMarca: 1, idModelo: 1, anio: 2021
      });
      assertEnvelope(r2, 409, 'CONFLICT');
    });
  });

  describe('INTERNAL (500)', () => {
    it('unhandled error en un handler se mapea a 500 con envelope', async () => {
      // Inyectamos un router adicional que siempre lanza un error
      // no-controlado. El errorHandler lo mapea a INTERNAL.
      const express = require('express');
      const explodingRouter = express.Router();
      explodingRouter.get('/__explota', () => {
        throw new Error('boom interno con stack sensible\n  at /app/secrets/db.js:42');
      });
      const fullApp = buildApiApp({
        container: setup.container,
        mounts: [{ mountPath: '/api/v1', routes: explodingRouter }]
      });
      const res = await request(fullApp).get('/api/v1/__explota');
      assert.equal(res.status, 500);
      assert.match(res.headers['content-type'] || '', /application\/json/);
      assert.equal(res.body.error.code, 'INTERNAL');
      assert.equal(typeof res.body.error.message, 'string');
      // El mensaje generico NUNCA debe incluir el stack ni el path interno
      assert.equal(res.body.error.stack, undefined, 'no debe haber stack en el body');
      assert.ok(!/at \/app\/secrets\/db\.js/.test(res.body.error.message),
        'el mensaje no debe filtrar paths internos');
    });
  });

  describe('Content-Type y parseabilidad JSON', () => {
    it('TODAS las respuestas de error son application/json (no HTML)', async () => {
      const cases = [
        request(setup.app).get('/api/v1/auth/me'),
        request(setup.app).get('/api/v1/autos'),
        request(setup.app).get('/api/v1/autos/1/analisis'),
        request(setup.app).post('/api/v1/auth/login').send({}),
        request(setup.app).get('/api/v1/marcas/9999/modelos'),
        request(setup.app).get('/api/v1/no-existe')
      ];
      for (const p of cases) {
        const r = await p;
        assert.match(r.headers['content-type'] || '', /application\/json/,
          `Content-Type para ${r.req.path} debe ser JSON, fue ${r.headers['content-type']}`);
        // El body debe parsear como JSON sin error
        assert.equal(typeof r.body, 'object');
        assert.ok(r.body.error);
      }
    });
  });
});
