const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const session = require('express-session');
const request = require('supertest');
const { createInMemoryDb, closeInMemoryDb, SEED_USUARIOS } = require('../../helpers/inMemoryDb');

const CONTAINER_PATH = '../../../src/container';

/**
 * Build a fresh Express app wired to a fresh container and DB, with
 * /api/v1/auth mounted and the standard session/JSON middleware stack.
 * Returns the `app` and a `cleanup` callback.
 */
async function buildAuthApp() {
  const { buildContainer, _resetContainer } = require(CONTAINER_PATH);
  const authRoutes = require('../../../src/api/v1/auth.routes');
  const { errorHandler } = require('../../../src/middlewares/errorEnvelope');

  _resetContainer();
  const db = await createInMemoryDb();
  const container = await buildContainer({ db });

  const app = express();
  app.use(express.json());
  app.use(session({
    secret: 'test-secret',
    resave: false,
    saveUninitialized: false
  }));
  // Inyectamos el container por request para que las rutas lo lean.
  app.use((req, _res, next) => {
    req.container = container;
    next();
  });
  app.use('/api/v1/auth', authRoutes);
  app.use(errorHandler);

  return {
    app,
    container,
    cleanup: () => {
      _resetContainer();
      closeInMemoryDb(db);
    }
  };
}

describe('api/v1/auth — POST /login', () => {
  let setup;
  beforeEach(async () => { setup = await buildAuthApp(); });
  afterEach(() => setup.cleanup());

  it('login correcto devuelve 200 con user DTO y crea sesión', async () => {
    const { username, password } = SEED_USUARIOS[0]; // admin / admin
    const res = await request(setup.app)
      .post('/api/v1/auth/login')
      .send({ username, password });
    assert.equal(res.status, 200);
    assert.equal(typeof res.body.user, 'object');
    assert.equal(res.body.user.username, username);
    assert.equal(typeof res.body.user.id, 'number');
    assert.ok(res.body.user.password === undefined,
      'el DTO de usuario NUNCA debe exponer password');
    // La cookie de sesión se setea
    const setCookie = res.headers['set-cookie'];
    assert.ok(Array.isArray(setCookie) || typeof setCookie === 'string');
  });

  it('login con contraseña incorrecta devuelve 401 con envelope UNAUTHORIZED', async () => {
    const { username } = SEED_USUARIOS[0];
    const res = await request(setup.app)
      .post('/api/v1/auth/login')
      .send({ username, password: 'wrong-password' });
    assert.equal(res.status, 401);
    assert.equal(res.body.error.code, 'UNAUTHORIZED');
    assert.equal(typeof res.body.error.message, 'string');
  });

  it('login con username inexistente devuelve 401 con envelope', async () => {
    const res = await request(setup.app)
      .post('/api/v1/auth/login')
      .send({ username: 'no-existe', password: 'cualquiera' });
    assert.equal(res.status, 401);
    assert.equal(res.body.error.code, 'UNAUTHORIZED');
  });

  it('login sin password devuelve 400 con envelope VALIDATION_ERROR', async () => {
    const res = await request(setup.app)
      .post('/api/v1/auth/login')
      .send({ username: 'admin' });
    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
    assert.ok(Array.isArray(res.body.error.details));
    assert.ok(res.body.error.details.length > 0);
  });

  it('login con body vacío devuelve 400', async () => {
    const res = await request(setup.app).post('/api/v1/auth/login').send({});
    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
  });

  it('login con username vacío devuelve 400 con details apuntando a username', async () => {
    const res = await request(setup.app)
      .post('/api/v1/auth/login')
      .send({ username: '', password: 'x' });
    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
    assert.ok(res.body.error.details.some(d => d.path === 'username'));
  });
});

describe('api/v1/auth — GET /me', () => {
  let setup;
  beforeEach(async () => { setup = await buildAuthApp(); });
  afterEach(() => setup.cleanup());

  it('/me sin sesión devuelve 401 con envelope', async () => {
    const res = await request(setup.app).get('/api/v1/auth/me');
    assert.equal(res.status, 401);
    assert.equal(res.body.error.code, 'UNAUTHORIZED');
  });

  it('/me con sesión activa devuelve 200 con user DTO', async () => {
    const { username, password } = SEED_USUARIOS[1]; // user / user123
    const agent = request.agent(setup.app);
    const loginRes = await agent
      .post('/api/v1/auth/login')
      .send({ username, password });
    assert.equal(loginRes.status, 200, 'precondición: login exitoso');
    const res = await agent.get('/api/v1/auth/me');
    assert.equal(res.status, 200);
    assert.equal(res.body.user.username, username);
    assert.equal(res.body.user.password, undefined);
  });
});

describe('api/v1/auth — POST /logout', () => {
  let setup;
  beforeEach(async () => { setup = await buildAuthApp(); });
  afterEach(() => setup.cleanup());

  it('logout con sesión devuelve 204 y destruye la sesión', async () => {
    const { username, password } = SEED_USUARIOS[0];
    const agent = request.agent(setup.app);
    const loginRes = await agent.post('/api/v1/auth/login').send({ username, password });
    assert.equal(loginRes.status, 200);
    const logoutRes = await agent.post('/api/v1/auth/logout');
    assert.equal(logoutRes.status, 204);
    // /me debe fallar ahora
    const meRes = await agent.get('/api/v1/auth/me');
    assert.equal(meRes.status, 401);
  });

  it('logout sin sesión devuelve 401', async () => {
    const res = await request(setup.app).post('/api/v1/auth/logout');
    assert.equal(res.status, 401);
    assert.equal(res.body.error.code, 'UNAUTHORIZED');
  });
});
