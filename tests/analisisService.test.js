const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

// Importamos solo la función pura de cálculo, sin dependencia de BD
const analisisService = require('../src/services/analisisService');

describe('AnalisisService - Cálculo de métricas', () => {
  it('vehículo sin modificaciones devuelve indicador Sin datos', () => {
    const resultado = analisisService.calcularMetricas([]);
    assert.equal(resultado.indicador, 'Sin datos');
    assert.equal(resultado.impacto_total, 0);
    assert.equal(resultado.costo_total, 0);
    assert.equal(resultado.numero_modificaciones, 0);
    assert.equal(resultado.promedio_mejora, null);
    assert.equal(resultado.costo_beneficio, null);
  });

  it('una modificación nivel Bajo, costo $100 → Deficiente', () => {
    const mods = [{ nivel_impacto: 'Bajo', costo: 100 }];
    const resultado = analisisService.calcularMetricas(mods);
    assert.equal(resultado.impacto_total, 1);
    assert.equal(resultado.promedio_mejora, 1.0);
    assert.equal(resultado.indicador, 'Deficiente');
    assert.equal(resultado.numero_modificaciones, 1);
  });

  it('tres modificaciones Alto, Alto, Medio → promedio 2.67, Excelente', () => {
    const mods = [
      { nivel_impacto: 'Alto', costo: 200 },
      { nivel_impacto: 'Alto', costo: 300 },
      { nivel_impacto: 'Medio', costo: 150 }
    ];
    const resultado = analisisService.calcularMetricas(mods);
    assert.equal(resultado.impacto_total, 8); // 3 + 3 + 2
    assert.ok(Math.abs(resultado.promedio_mejora - 2.6667) < 0.01);
    assert.equal(resultado.indicador, 'Excelente');
  });

  it('modificación con costo=0 → C/B null, indicador depende del promedio', () => {
    const mods = [{ nivel_impacto: 'Medio', costo: 0 }];
    const resultado = analisisService.calcularMetricas(mods);
    assert.equal(resultado.costo_beneficio, null);
    assert.equal(resultado.indicador, 'Regular'); // promedio 2.0
  });

  it('todas las modificaciones con costo=0 → costo_total=0, C/B null, no crashea', () => {
    const mods = [
      { nivel_impacto: 'Alto', costo: 0 },
      { nivel_impacto: 'Bajo', costo: 0 }
    ];
    const resultado = analisisService.calcularMetricas(mods);
    assert.equal(resultado.costo_total, 0);
    assert.equal(resultado.costo_beneficio, null);
    assert.equal(resultado.numero_modificaciones, 2);
  });

  it('edición de una modificación recalcula correctamente', () => {
    // Simula estado antes de edición
    const modsAntes = [
      { nivel_impacto: 'Bajo', costo: 100 },
      { nivel_impacto: 'Bajo', costo: 100 }
    ];
    const antes = analisisService.calcularMetricas(modsAntes);
    assert.equal(antes.indicador, 'Deficiente');

    // Simula estado después de edición (cambiar uno a Alto)
    const modsDespues = [
      { nivel_impacto: 'Alto', costo: 100 },
      { nivel_impacto: 'Bajo', costo: 100 }
    ];
    const despues = analisisService.calcularMetricas(modsDespues);
    assert.equal(despues.impacto_total, 4); // 3 + 1
    assert.equal(despues.promedio_mejora, 2.0);
    assert.equal(despues.indicador, 'Regular');
  });

  it('eliminación de una modificación recalcula correctamente', () => {
    // Estado con 2 mods
    const modsCon2 = [
      { nivel_impacto: 'Alto', costo: 500 },
      { nivel_impacto: 'Bajo', costo: 100 }
    ];
    const con2 = analisisService.calcularMetricas(modsCon2);
    assert.equal(con2.numero_modificaciones, 2);

    // Después de eliminar la de impacto Bajo
    const modsCon1 = [
      { nivel_impacto: 'Alto', costo: 500 }
    ];
    const con1 = analisisService.calcularMetricas(modsCon1);
    assert.equal(con1.numero_modificaciones, 1);
    assert.equal(con1.impacto_total, 3);
    assert.equal(con1.indicador, 'Excelente');
  });

  it('eliminar la última modificación devuelve el vehículo a Sin datos', () => {
    const modsConUna = [{ nivel_impacto: 'Medio', costo: 200 }];
    const conUna = analisisService.calcularMetricas(modsConUna);
    assert.equal(conUna.indicador, 'Regular');

    // Eliminar la última → sin modificaciones
    const sinMods = analisisService.calcularMetricas([]);
    assert.equal(sinMods.indicador, 'Sin datos');
    assert.equal(sinMods.promedio_mejora, null);
  });
});
