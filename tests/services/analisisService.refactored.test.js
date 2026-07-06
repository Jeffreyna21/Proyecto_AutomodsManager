const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const AnalisisService = require('../../src/services/analisisService');
const config = require('../../src/domain/strategies/config');
const ImpactValueFactory = require('../../src/domain/factories/ImpactValueFactory');

function makeStubModRepo(mods = []) {
  const calls = [];
  return {
    calls,
    findByAutoId(autoId) {
      calls.push({ method: 'findByAutoId', autoId });
      return mods;
    }
  };
}

function makeStubAnalisisRepo() {
  const calls = [];
  return {
    calls,
    findByAutoId(autoId) { calls.push({ method: 'findByAutoId', autoId }); return null; },
    upsert(autoId, metricas) {
      calls.push({ method: 'upsert', autoId, metricas });
      return { id: 1, auto_id: autoId, ...metricas };
    }
  };
}

describe('AnalisisService (refactored) — class with constructor-injected repos', () => {
  // The default module export is the legacy singleton (used by EJS
  // controllers). The class is exposed as `AnalisisService.AnalisisService`
  // for container wiring and tests.
  const Class = AnalisisService.AnalisisService;

  it('exports a default singleton with the legacy shape (backward compat for EJS controllers)', () => {
    assert.equal(typeof AnalisisService, 'object');
    assert.equal(typeof AnalisisService.calcularMetricas, 'function');
    assert.equal(typeof AnalisisService.recalcular, 'function');
    assert.equal(typeof AnalisisService.recalcularForAuto, 'function');
    assert.equal(typeof AnalisisService.getByAutoId, 'function');
  });

  it('exposes the AnalisisService class for explicit construction', () => {
    assert.equal(typeof Class, 'function');
  });

  it('calcularMetricas is pure: it never reads from the repos or the DB', () => {
    const svc = new Class({
      modificacionRepository: makeStubModRepo(),
      analisisRepository: makeStubAnalisisRepo()
    });
    const result = svc.calcularMetricas([{ nivel_impacto: 'Bajo', costo: 100 }]);
    assert.equal(result.indicador, 'Deficiente');
  });

  it('recalcularForAuto(autoId) fetches mods via the injected repo and upserts the metricas', () => {
    const modRepo = makeStubModRepo([
      { id: 1, nivel_impacto: 'Alto', costo: 200 },
      { id: 2, nivel_impacto: 'Bajo', costo: 100 }
    ]);
    const analRepo = makeStubAnalisisRepo();
    const svc = new Class({
      modificacionRepository: modRepo,
      analisisRepository: analRepo
    });

    const result = svc.recalcularForAuto(7);

    assert.equal(modRepo.calls.length, 1);
    assert.deepEqual(modRepo.calls[0], { method: 'findByAutoId', autoId: 7 });
    assert.equal(analRepo.calls.length, 1);
    assert.equal(analRepo.calls[0].method, 'upsert');
    assert.equal(analRepo.calls[0].autoId, 7);
    // Computed metrics: impacto_total = 3+1 = 4, promedio = 2.0, indicador = Regular
    assert.equal(result.impacto_total, 4);
    assert.equal(result.indicador, 'Regular');
    assert.equal(analRepo.calls[0].metricas.indicador, 'Regular');
  });

  it('recalcularForAuto() with N=0 metrics yields "Sin datos" via the fallback', () => {
    const modRepo = makeStubModRepo([]);
    const analRepo = makeStubAnalisisRepo();
    const svc = new Class({
      modificacionRepository: modRepo,
      analisisRepository: analRepo
    });

    const result = svc.recalcularForAuto(7);

    assert.equal(result.numero_modificaciones, 0);
    assert.equal(result.indicador, 'Sin datos');
    assert.equal(analRepo.calls[0].metricas.indicador, 'Sin datos');
  });

  it('recalcular(autoId, mods) is the legacy 2-arg path used by EJS controllers', () => {
    const analRepo = makeStubAnalisisRepo();
    const svc = new Class({
      modificacionRepository: makeStubModRepo(),
      analisisRepository: analRepo
    });

    const mods = [{ nivel_impacto: 'Alto', costo: 100 }];
    const result = svc.recalcular(7, mods);

    assert.equal(result.indicador, 'Excelente');
    assert.equal(analRepo.calls.length, 1);
    assert.equal(analRepo.calls[0].method, 'upsert');
    assert.equal(analRepo.calls[0].autoId, 7);
  });

  it('calcularMetricas uses ImpactValueFactory (no hardcoded VALOR_IMPACTO map)', () => {
    const svc = new Class({});
    // Three "Medio" mods → impacto_total = 6, promedio = 2.0 → "Regular"
    const result = svc.calcularMetricas([
      { nivel_impacto: 'Medio', costo: 100 },
      { nivel_impacto: 'Medio', costo: 200 },
      { nivel_impacto: 'Medio', costo: 300 }
    ]);
    assert.equal(result.impacto_total, 6);
    assert.equal(result.promedio_mejora, 2.0);
    assert.equal(result.indicador, 'Regular');
  });

  it('calcularMetricas uses ImpactValueFactory for case-insensitive lowercase labels', () => {
    const svc = new Class({});
    const result = svc.calcularMetricas([
      { nivel_impacto: 'alto', costo: 100 } // spec example uses lowercase
    ]);
    assert.equal(result.impacto_total, ImpactValueFactory.fromLabel('alto'));
    assert.equal(result.indicador, 'Excelente');
  });

  it('calcularMetricas returns the canonical capitalized indicator name (EJS view compat)', () => {
    const svc = new Class({});
    const result = svc.calcularMetricas([{ nivel_impacto: 'Bajo', costo: 100 }]);
    assert.equal(result.indicador, 'Deficiente');
  });

  it('getByAutoId() delegates to the injected AnalisisRepository', () => {
    const analRepo = makeStubAnalisisRepo();
    analRepo.findByAutoId = (id) => { analRepo.calls.push({ method: 'findByAutoId', id }); return { auto_id: id, indicador: 'Excelente' }; };
    const svc = new Class({ analisisRepository: analRepo });
    const out = svc.getByAutoId(42);
    assert.equal(out.auto_id, 42);
    assert.equal(analRepo.calls.length, 1);
  });
});
