const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createInMemoryDb, closeInMemoryDb, SEED_USUARIOS } = require('../../helpers/inMemoryDb');
const { buildApiApp } = require('../../helpers/apiApp');

/**
 * Integration test: monta la pila completa de /api/v1 (igual que
 * src/app.js) y verifica un flujo end-to-end que cruza varios
 * endpoints para asegurar que el wiring del composition root +
 * routers + error envelope es correcto.
 */
describe('api/v1 — integration end-to-end', () => {
  let setup;
  beforeEach(async () => {
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
    setup = {
      app,
      container,
      db,
      cleanup: () => { _resetContainer(); closeInMemoryDb(db); }
    };
  });
  afterEach(() => setup.cleanup());

  it('flujo completo: catalogos → login → autos → mods → analisis', async () => {
    // 1. Catalogos publicos antes de login
    const marcasRes = await request(setup.app).get('/api/v1/marcas');
    assert.equal(marcasRes.status, 200);
    assert.equal(marcasRes.body.length, 7);

    const tiposRes = await request(setup.app).get('/api/v1/tipos-modificacion');
    assert.equal(tiposRes.status, 200);
    assert.equal(tiposRes.body.length, 3);

    const modelosRes = await request(setup.app).get('/api/v1/marcas/1/modelos');
    assert.equal(modelosRes.status, 200);
    assert.equal(modelosRes.body.length, 5);

    // 2. Login (sin sesion, sin CSRF)
    const agent = request.agent(setup.app);
    const loginRes = await agent.post('/api/v1/auth/login').send({
      username: SEED_USUARIOS[0].username,
      password: SEED_USUARIOS[0].password
    });
    assert.equal(loginRes.status, 200);
    assert.equal(loginRes.body.user.username, 'admin');

    // 3. Crear un auto
    const createAuto = await agent.post('/api/v1/autos').send({
      placa: 'INT-001', idMarca: 1, idModelo: 1, anio: 2022
    });
    assert.equal(createAuto.status, 201);
    const idAuto = createAuto.body.auto.id;
    assert.equal(createAuto.body.auto.placa, 'INT001');

    // 4. Crear 2 modificaciones
    const m1 = await agent.post(`/api/v1/autos/${idAuto}/modificaciones`).send({
      nombre: 'Turbo', costo: 1500, nivelImpacto: 'Alto',
      fecha: '2024-01-15', idTipoModificacion: 1
    });
    assert.equal(m1.status, 201);
    const m2 = await agent.post(`/api/v1/autos/${idAuto}/modificaciones`).send({
      nombre: 'Escape', costo: 600, nivelImpacto: 'Medio',
      fecha: '2024-02-20', idTipoModificacion: 2
    });
    assert.equal(m2.status, 201);

    // 5. Listar modificaciones
    const listMods = await agent.get(`/api/v1/autos/${idAuto}/modificaciones`);
    assert.equal(listMods.status, 200);
    assert.equal(listMods.body.items.length, 2);

    // 6. Analisis (metrica agregada: impacto Alto(3) + Medio(2) = 5)
    const analisis = await agent.get(`/api/v1/autos/${idAuto}/analisis`);
    assert.equal(analisis.status, 200);
    assert.equal(analisis.body.analisis.metricas.numero_modificaciones, 2);
    assert.equal(analisis.body.analisis.metricas.impacto_total, 5);
    assert.equal(analisis.body.analisis.seriesEvolucion.length, 2);
    assert.equal(analisis.body.analisis.distribucionPorTipo.length, 2);

    // 7. Eliminar una modificacion y verificar que el analisis se recalcula
    const del = await agent.delete(`/api/v1/modificaciones/${m1.body.modificacion.id}`);
    assert.equal(del.status, 204);
    const analisis2 = await agent.get(`/api/v1/autos/${idAuto}/analisis`);
    assert.equal(analisis2.body.analisis.metricas.numero_modificaciones, 1);
    assert.equal(analisis2.body.analisis.metricas.impacto_total, 2); // solo Medio

    // 8. Logout
    const logout = await agent.post('/api/v1/auth/logout');
    assert.equal(logout.status, 204);
    const me = await agent.get('/api/v1/auth/me');
    assert.equal(me.status, 401);
  });

  it('ruta /api/v1 inexistente devuelve 404 JSON con envelope (no HTML)', async () => {
    const res = await request(setup.app).get('/api/v1/esta-ruta-no-existe');
    assert.equal(res.status, 404);
    assert.equal(res.headers['content-type'], 'application/json; charset=utf-8');
    assert.equal(res.body.error.code, 'NOT_FOUND');
  });

  it('Content-Type de todas las respuestas /api/v1 es application/json', async () => {
    const r1 = await request(setup.app).get('/api/v1/marcas');
    const r2 = await request(setup.app).get('/api/v1/tipos-modificacion');
    const r3 = await request(setup.app).get('/api/v1/marcas/1/modelos');
    const r4 = await request(setup.app).get('/api/v1/marcas/9999/modelos');
    const r5 = await request(setup.app).get('/api/v1/autos'); // sin sesion
    for (const r of [r1, r2, r3, r4, r5]) {
      assert.match(r.headers['content-type'] || '', /application\/json/);
    }
  });
});

/**
 * Suite independiente que ejercita el `buildApp()` real de
 * `src/app.js` (no el helper) para garantizar que el wiring de
 * produccion monta correctamente la API v1 SIN pisar las rutas EJS.
 */
describe('src/app.js buildApp() — wiring EJS + API v1', () => {
  let setup;
  beforeEach(async () => {
    const { buildContainer, _resetContainer } = require('../../../src/container');
    const { createInMemoryDb, closeInMemoryDb } = require('../../helpers/inMemoryDb');
    const buildApp = require('../../../src/app');

    _resetContainer();
    const db = await createInMemoryDb();
    const container = await buildContainer({ db });
    const app = await buildApp({ container });
    setup = {
      app,
      cleanup: () => { _resetContainer(); closeInMemoryDb(db); }
    };
  });
  afterEach(() => setup.cleanup());

  it('responde 200 con JSON en /api/v1/marcas (las EJS rutas no interceptan)', async () => {
    const res = await request(setup.app).get('/api/v1/marcas');
    assert.equal(res.status, 200);
    assert.equal(res.body.length, 7);
    assert.match(res.headers['content-type'] || '', /application\/json/);
  });

  it('responde 200 con HTML en /login (las rutas EJS siguen vivas)', async () => {
    const res = await request(setup.app).get('/login');
    assert.equal(res.status, 200);
    assert.match(res.headers['content-type'] || '', /text\/html/);
  });

  it('login API v1 responde 200 con JSON user DTO', async () => {
    const res = await request(setup.app)
      .post('/api/v1/auth/login')
      .send({ username: 'admin', password: 'admin' });
    assert.equal(res.status, 200);
    assert.ok(res.body.user);
    assert.equal(res.body.user.username, 'admin');
  });

  it('404 de /api/v1 devuelve JSON envelope (no la vista error.ejs)', async () => {
    const res = await request(setup.app).get('/api/v1/esta-ruta-no-existe');
    assert.equal(res.status, 404);
    assert.equal(res.body.error.code, 'NOT_FOUND');
  });

  it('404 de EJS (no /api) devuelve la vista error.ejs', async () => {
    const res = await request(setup.app).get('/pagina-ejs-inexistente');
    assert.equal(res.status, 404);
    assert.match(res.headers['content-type'] || '', /text\/html/);
  });
});
