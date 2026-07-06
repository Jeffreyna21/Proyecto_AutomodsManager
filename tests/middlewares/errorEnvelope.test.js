const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const request = require('supertest');
const {
  DomainError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  InternalError
} = require('../../src/errors/DomainError');
const { apiError, errorHandler } = require('../../src/middlewares/errorEnvelope');

describe('errors/DomainError — jerarquía de errores de dominio', () => {
  it('DomainError es una subclase de Error', () => {
    const e = new DomainError('algo falló', 'GEN', 500);
    assert.ok(e instanceof Error, 'DomainError debe extender Error');
    assert.equal(e.name, 'DomainError');
    assert.equal(e.message, 'algo falló');
    assert.equal(e.code, 'GEN');
    assert.equal(e.status, 500);
  });

  it('ValidationError → status 400, code VALIDATION_ERROR', () => {
    const e = new ValidationError('dato inválido', [{ path: 'anio', message: 'requerido' }]);
    assert.equal(e.status, 400);
    assert.equal(e.code, 'VALIDATION_ERROR');
    assert.equal(e.message, 'dato inválido');
    assert.deepEqual(e.details, [{ path: 'anio', message: 'requerido' }]);
  });

  it('UnauthorizedError → status 401, code UNAUTHORIZED', () => {
    const e = new UnauthorizedError('no autenticado');
    assert.equal(e.status, 401);
    assert.equal(e.code, 'UNAUTHORIZED');
  });

  it('ForbiddenError → status 403, code FORBIDDEN', () => {
    const e = new ForbiddenError('acceso denegado');
    assert.equal(e.status, 403);
    assert.equal(e.code, 'FORBIDDEN');
  });

  it('NotFoundError → status 404, code NOT_FOUND', () => {
    const e = new NotFoundError('recurso no encontrado');
    assert.equal(e.status, 404);
    assert.equal(e.code, 'NOT_FOUND');
  });

  it('ConflictError → status 409, code CONFLICT', () => {
    const e = new ConflictError('placa duplicada');
    assert.equal(e.status, 409);
    assert.equal(e.code, 'CONFLICT');
  });

  it('InternalError → status 500, code INTERNAL', () => {
    const e = new InternalError('fallo interno');
    assert.equal(e.status, 500);
    assert.equal(e.code, 'INTERNAL');
  });

  it('cualquier DomainError se identifica con instanceof DomainError', () => {
    assert.ok(new ValidationError('x') instanceof DomainError);
    assert.ok(new UnauthorizedError('x') instanceof DomainError);
    assert.ok(new NotFoundError('x') instanceof DomainError);
    assert.ok(new ConflictError('x') instanceof DomainError);
    assert.ok(new InternalError('x') instanceof DomainError);
  });
});

describe('middlewares/errorEnvelope — apiError() y errorHandler()', () => {
  it('apiError() retorna { error: { code, message } } sin details', () => {
    const result = apiError('NOT_FOUND', 'recurso no encontrado');
    assert.deepEqual(result, {
      error: { code: 'NOT_FOUND', message: 'recurso no encontrado' }
    });
  });

  it('apiError() incluye details solo cuando se pasan', () => {
    const result = apiError('VALIDATION_ERROR', 'datos inválidos', [
      { path: 'anio', message: 'requerido' }
    ]);
    assert.deepEqual(result, {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'datos inválidos',
        details: [{ path: 'anio', message: 'requerido' }]
      }
    });
  });

  it('errorHandler() formatea un DomainError con su status y envelope', async () => {
    const app = express();
    app.get('/boom', () => {
      throw new NotFoundError('auto no existe');
    });
    app.use(errorHandler);

    const res = await request(app).get('/boom');
    assert.equal(res.status, 404);
    assert.match(res.headers['content-type'], /application\/json/);
    assert.deepEqual(res.body, {
      error: { code: 'NOT_FOUND', message: 'auto no existe' }
    });
  });

  it('errorHandler() formatea un ValidationError con details', async () => {
    const app = express();
    app.get('/bad', () => {
      throw new ValidationError('datos inválidos', [
        { path: 'anio', message: 'debe ser número' }
      ]);
    });
    app.use(errorHandler);

    const res = await request(app).get('/bad');
    assert.equal(res.status, 400);
    assert.deepEqual(res.body, {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'datos inválidos',
        details: [{ path: 'anio', message: 'debe ser número' }]
      }
    });
  });

  it('errorHandler() convierte excepciones no controladas a INTERNAL 500 sin stack', async () => {
    const app = express();
    app.get('/crash', () => {
      throw new Error('explota con detalles sensibles en stack');
    });
    app.use(errorHandler);

    const res = await request(app).get('/crash');
    assert.equal(res.status, 500);
    assert.equal(res.body.error.code, 'INTERNAL');
    assert.equal(typeof res.body.error.message, 'string');
    // Nunca se filtra el stack ni el mensaje original al cliente
    assert.equal(res.body.error.stack, undefined);
    assert.equal(res.body.error.message.includes('explota con detalles sensibles'), false);
  });

  it('errorHandler() siempre responde con Content-Type application/json', async () => {
    const app = express();
    app.get('/forbidden', () => {
      throw new ForbiddenError('acceso denegado');
    });
    app.use(errorHandler);

    const res = await request(app).get('/forbidden');
    assert.match(res.headers['content-type'], /application\/json/);
  });

  it('errorHandler() maneja ConflictError con status 409', async () => {
    const app = express();
    app.get('/dup', () => {
      throw new ConflictError('placa duplicada');
    });
    app.use(errorHandler);

    const res = await request(app).get('/dup');
    assert.equal(res.status, 409);
    assert.equal(res.body.error.code, 'CONFLICT');
  });

  it('errorHandler() maneja UnauthorizedError con status 401', async () => {
    const app = express();
    app.get('/auth', () => {
      throw new UnauthorizedError('sin sesión');
    });
    app.use(errorHandler);

    const res = await request(app).get('/auth');
    assert.equal(res.status, 401);
    assert.equal(res.body.error.code, 'UNAUTHORIZED');
  });
});
