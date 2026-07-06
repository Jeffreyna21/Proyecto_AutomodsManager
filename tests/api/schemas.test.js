const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  loginSchema,
  createAutoSchema,
  updateAutoSchema,
  createModificacionSchema,
  updateModificacionSchema
} = require('../../src/api/schemas');

describe('api/schemas — loginSchema', () => {
  it('acepta un login válido', () => {
    const r = loginSchema.safeParse({ username: 'ana', password: 'secret123' });
    assert.equal(r.success, true);
  });

  it('rechaza login sin username', () => {
    const r = loginSchema.safeParse({ password: 'x' });
    assert.equal(r.success, false);
  });

  it('rechaza login sin password', () => {
    const r = loginSchema.safeParse({ username: 'ana' });
    assert.equal(r.success, false);
  });

  it('rechaza username vacío', () => {
    const r = loginSchema.safeParse({ username: '', password: 'x' });
    assert.equal(r.success, false);
  });

  it('rechaza cuando el input no es un objeto', () => {
    const r = loginSchema.safeParse('no-soy-objeto');
    assert.equal(r.success, false);
  });
});

describe('api/schemas — createAutoSchema', () => {
  it('acepta un auto válido con campos requeridos', () => {
    const r = createAutoSchema.safeParse({
      placa: 'ABC-1234',
      idMarca: 1,
      idModelo: 1,
      anio: 2020
    });
    assert.equal(r.success, true);
  });

  it('acepta un auto válido con color opcional', () => {
    const r = createAutoSchema.safeParse({
      placa: 'ABC1234',
      idMarca: 1,
      idModelo: 1,
      anio: 2020,
      color: 'Rojo'
    });
    assert.equal(r.success, true);
  });

  it('rechaza placa con formato inválido', () => {
    const r = createAutoSchema.safeParse({
      placa: 'placa-mala',
      idMarca: 1,
      idModelo: 1,
      anio: 2020
    });
    assert.equal(r.success, false);
    const path = r.error.issues[0].path.join('.');
    assert.equal(path, 'placa');
  });

  it('rechaza anio no numérico', () => {
    const r = createAutoSchema.safeParse({
      placa: 'ABC1234',
      idMarca: 1,
      idModelo: 1,
      anio: 'no-es-numero'
    });
    assert.equal(r.success, false);
    assert.equal(r.error.issues[0].path.join('.'), 'anio');
  });

  it('rechaza anio fuera de rango razonable', () => {
    const r1 = createAutoSchema.safeParse({
      placa: 'ABC1234', idMarca: 1, idModelo: 1, anio: 1800
    });
    assert.equal(r1.success, false);
    const r2 = createAutoSchema.safeParse({
      placa: 'ABC1234', idMarca: 1, idModelo: 1, anio: 3000
    });
    assert.equal(r2.success, false);
  });

  it('rechaza idMarca o idModelo faltantes', () => {
    const r = createAutoSchema.safeParse({
      placa: 'ABC1234', idModelo: 1, anio: 2020
    });
    assert.equal(r.success, false);
  });

  it('rechaza placa vacía', () => {
    const r = createAutoSchema.safeParse({
      placa: '', idMarca: 1, idModelo: 1, anio: 2020
    });
    assert.equal(r.success, false);
  });
});

describe('api/schemas — updateAutoSchema', () => {
  it('acepta body parcial (solo placa)', () => {
    const r = updateAutoSchema.safeParse({ placa: 'ABC1234' });
    assert.equal(r.success, true);
  });

  it('acepta body parcial (solo anio)', () => {
    const r = updateAutoSchema.safeParse({ anio: 2021 });
    assert.equal(r.success, true);
  });

  it('rechaza body completamente vacío', () => {
    const r = updateAutoSchema.safeParse({});
    assert.equal(r.success, false);
  });

  it('rechaza placa inválida en update', () => {
    const r = updateAutoSchema.safeParse({ placa: 'mala-placa' });
    assert.equal(r.success, false);
  });

  it('rechaza anio fuera de rango en update', () => {
    const r = updateAutoSchema.safeParse({ anio: 99999 });
    assert.equal(r.success, false);
  });
});

describe('api/schemas — createModificacionSchema', () => {
  it('acepta una modificación válida', () => {
    const r = createModificacionSchema.safeParse({
      nombre: 'Turbo kit',
      costo: 1500,
      nivelImpacto: 'Alto',
      fecha: '2024-05-01',
      idTipoModificacion: 1
    });
    assert.equal(r.success, true);
  });

  it('acepta descripcion opcional', () => {
    const r = createModificacionSchema.safeParse({
      nombre: 'Turbo kit',
      descripcion: 'Aumenta potencia',
      costo: 1500,
      nivelImpacto: 'Medio',
      fecha: '2024-05-01',
      idTipoModificacion: 1
    });
    assert.equal(r.success, true);
  });

  it('rechaza nivelImpacto fuera de {Bajo, Medio, Alto}', () => {
    const r = createModificacionSchema.safeParse({
      nombre: 'X', costo: 100, nivelImpacto: 'Critico',
      fecha: '2024-05-01', idTipoModificacion: 1
    });
    assert.equal(r.success, false);
    assert.equal(r.error.issues[0].path.join('.'), 'nivelImpacto');
  });

  it('rechaza costo negativo o cero', () => {
    const r1 = createModificacionSchema.safeParse({
      nombre: 'X', costo: 0, nivelImpacto: 'Bajo',
      fecha: '2024-05-01', idTipoModificacion: 1
    });
    assert.equal(r1.success, false);
    const r2 = createModificacionSchema.safeParse({
      nombre: 'X', costo: -10, nivelImpacto: 'Bajo',
      fecha: '2024-05-01', idTipoModificacion: 1
    });
    assert.equal(r2.success, false);
  });

  it('rechaza fecha con formato inválido', () => {
    const r = createModificacionSchema.safeParse({
      nombre: 'X', costo: 100, nivelImpacto: 'Bajo',
      fecha: '01-05-2024', idTipoModificacion: 1
    });
    assert.equal(r.success, false);
  });

  it('rechaza idTipoModificacion faltante', () => {
    const r = createModificacionSchema.safeParse({
      nombre: 'X', costo: 100, nivelImpacto: 'Bajo', fecha: '2024-05-01'
    });
    assert.equal(r.success, false);
  });

  it('rechaza nombre vacío', () => {
    const r = createModificacionSchema.safeParse({
      nombre: '', costo: 100, nivelImpacto: 'Bajo',
      fecha: '2024-05-01', idTipoModificacion: 1
    });
    assert.equal(r.success, false);
  });
});

describe('api/schemas — updateModificacionSchema', () => {
  it('acepta body parcial (solo nombre)', () => {
    const r = updateModificacionSchema.safeParse({ nombre: 'Nuevo nombre' });
    assert.equal(r.success, true);
  });

  it('acepta body parcial (solo costo)', () => {
    const r = updateModificacionSchema.safeParse({ costo: 999 });
    assert.equal(r.success, true);
  });

  it('rechaza body completamente vacío', () => {
    const r = updateModificacionSchema.safeParse({});
    assert.equal(r.success, false);
  });

  it('rechaza nivelImpacto inválido en update', () => {
    const r = updateModificacionSchema.safeParse({ nivelImpacto: 'critico' });
    assert.equal(r.success, false);
  });
});

describe('api/schemas — issues se serializan a { path, message }', () => {
  it('cada issue tiene un path (string o array) y un message', () => {
    const r = createAutoSchema.safeParse({ placa: 'mala', idMarca: 1, idModelo: 1, anio: 2020 });
    assert.equal(r.success, false);
    for (const issue of r.error.issues) {
      assert.ok(issue.path !== undefined, 'cada issue debe tener un path');
      assert.ok(typeof issue.message === 'string' && issue.message.length > 0,
        'cada issue debe tener un message no vacío');
    }
  });
});
