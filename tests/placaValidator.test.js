const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const placaValidator = require('../src/services/placaValidator');

describe('PlacaValidator - Validación de formato', () => {
  it('placa con formato válido sin guion pasa', () => {
    const resultado = placaValidator.validarFormato('PCA1234');
    assert.equal(resultado.valida, true);
    assert.equal(resultado.placaNormalizada, 'PCA1234');
  });

  it('placa con formato válido con guion pasa y se normaliza', () => {
    const resultado = placaValidator.validarFormato('PCA-1234');
    assert.equal(resultado.valida, true);
    assert.equal(resultado.placaNormalizada, 'PCA1234');
  });

  it('placa en minúsculas pasa y se normaliza a mayúsculas', () => {
    const resultado = placaValidator.validarFormato('abc-123');
    assert.equal(resultado.valida, true);
    assert.equal(resultado.placaNormalizada, 'ABC123');
  });

  it('placa con caracteres especiales falla con mensaje de formato', () => {
    const resultado = placaValidator.validarFormato('AB@-1234');
    assert.equal(resultado.valida, false);
    assert.ok(resultado.error.includes('Formato'));
  });

  it('placa vacía falla', () => {
    const resultado = placaValidator.validarFormato('');
    assert.equal(resultado.valida, false);
    assert.ok(resultado.error.includes('obligatoria'));
  });
});

describe('PlacaValidator - Validación de unicidad', () => {
  it('placa duplicada para el mismo usuario falla con error de unicidad', () => {
    // Simular que la placa ya existe para el usuario
    const existeFn = () => true;
    const resultado = placaValidator.validarUnicidad('PCA1234', 1, existeFn);
    assert.equal(resultado.valida, false);
    assert.ok(resultado.error.includes('Ya tienes'));
  });

  it('placa duplicada en distinto usuario pasa', () => {
    // Simular que la placa NO existe para este usuario
    const existeFn = () => false;
    const resultado = placaValidator.validarUnicidad('PCA1234', 2, existeFn);
    assert.equal(resultado.valida, true);
  });
});
