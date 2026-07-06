'use strict';

const { getDB, saveDB } = require('../models/db');
const ImpactValueFactory = require('../domain/factories/ImpactValueFactory');
const indicatorConfig = require('../domain/strategies/config');
const IndicatorClassifier = require('../domain/strategies/IndicatorClassifier');
const NoDataStrategy = require('../domain/strategies/NoDataStrategy');
const AnalisisRepository = require('../repositories/AnalisisRepository');
const ModificacionRepository = require('../repositories/ModificacionRepository');

/**
 * AnalisisService — domain service that computes an auto's analysis
 * metricas from its modifications and persists them.
 *
 * ## Architecture
 *
 * The class is the canonical implementation. Its constructor accepts
 * the repositories it needs (`ModificacionRepository`,
 * `AnalisisRepository`) plus optional `classifier` and `factory`
 * injections for tests. The default module export is a singleton
 * constructed with the production module-level `getDB()` handle so the
 * existing EJS controllers in `src/controllers/` keep working
 * unchanged. New code (PR 3 use cases, PR 2 observer) should use the
 * constructor-injected class so dependencies are explicit.
 *
 * ## Backward compat
 *
 * PR 2 keeps the legacy 2-argument `recalcular(autoId, mods)` and
 * `getByAutoId(autoId)` methods on the default singleton because the
 * EJS controllers still call them. PR 3 will thin the controllers and
 * stop calling them directly; until then, both the legacy and the new
 * `recalcularForAuto(autoId)` (one argument, repo-driven) paths exist
 * side by side.
 */
class AnalisisService {
  /**
   * @param {object} [opts]
   * @param {{ findByAutoId: (autoId: number) => Array }} [opts.modificacionRepository]
   * @param {{ findByAutoId: (autoId: number) => any, upsert: (autoId: number, metricas: object) => any }} [opts.analisisRepository]
   * @param {object} [opts.classifier]  IndicatorClassifier instance (defaults to defaultStrategies)
   * @param {object} [opts.factory]     ImpactValueFactory-like (defaults to ImpactValueFactory)
   * @param {*} [opts.db]               optional sql.js Database handle for the legacy path
   */
  constructor({
    modificacionRepository,
    analisisRepository,
    classifier,
    factory = ImpactValueFactory,
    db
  } = {}) {
    this.modificacionRepository = modificacionRepository;
    this.analisisRepository = analisisRepository;
    this.factory = factory;
    this.classifier = classifier || new IndicatorClassifier({
      strategies: IndicatorClassifier.defaultStrategies(indicatorConfig),
      fallback: new NoDataStrategy(indicatorConfig)
    });
    this._db = db; // legacy path: direct db handle from `getDB()` if no repos are wired
  }

  /**
   * Pure calculation: given a list of modificaciones, produce the metricas
   * object. Never touches the database. The indicator label comes from
   * the injected `IndicatorClassifier` — the if/else chain it replaces
   * is gone.
   *
   * @param {Array<{nivel_impacto: string, costo: number|string}>} modificaciones
   * @returns {{
   *   impacto_total: number,
   *   costo_total: number,
   *   numero_modificaciones: number,
   *   promedio_mejora: number|null,
   *   costo_beneficio: number|null,
   *   indicador: string
   * }}
   */
  calcularMetricas(modificaciones) {
    const N = modificaciones.length;
    if (N === 0) {
      return {
        impacto_total: 0,
        costo_total: 0,
        numero_modificaciones: 0,
        promedio_mejora: null,
        costo_beneficio: null,
        indicador: 'Sin datos'
      };
    }

    const impacto_total = modificaciones.reduce(
      (sum, mod) => sum + this.factory.fromLabel(mod.nivel_impacto),
      0
    );
    const costo_total = modificaciones.reduce(
      (sum, mod) => sum + parseFloat(mod.costo),
      0
    );
    const promedio_mejora = impacto_total / N;
    const costo_beneficio = costo_total > 0 ? impacto_total / costo_total : null;

    const analysis = {
      impacto_total,
      costo_total,
      numero_modificaciones: N,
      promedio_mejora,
      costo_beneficio
    };
    const { name: indicador } = this.classifier.classify(analysis);
    return { ...analysis, indicador };
  }

  /**
   * Persist the metricas for an auto. Two paths:
   *   - If an `analisisRepository` is injected, use it (DIP, preferred).
   *   - Otherwise, fall back to the legacy module-level `getDB()` so
   *     EJS controllers calling this method without container wiring
   *     still work.
   * @param {number} autoId
   * @param {Array} modificaciones
   * @returns {object} the persisted metricas
   */
  recalcular(autoId, modificaciones) {
    const metricas = this.calcularMetricas(modificaciones);
    if (this.analisisRepository) {
      return this.analisisRepository.upsert(autoId, metricas);
    }
    // Legacy path — used by the default singleton when no repository
    // is injected. Mirrors the original implementation so the EJS
    // controllers' call sites keep working.
    const db = this._db || getDB();
    const existente = db.exec('SELECT id FROM analisis WHERE auto_id = ?', [autoId]);
    if (existente.length > 0 && existente[0].values.length > 0) {
      db.run(
        `UPDATE analisis SET
          impacto_total = ?, costo_total = ?, numero_modificaciones = ?,
          promedio_mejora = ?, costo_beneficio = ?, indicador = ?,
          updated_at = CURRENT_TIMESTAMP
         WHERE auto_id = ?`,
        [
          metricas.impacto_total, metricas.costo_total,
          metricas.numero_modificaciones, metricas.promedio_mejora,
          metricas.costo_beneficio, metricas.indicador, autoId
        ]
      );
    } else {
      db.run(
        `INSERT INTO analisis
          (auto_id, impacto_total, costo_total, numero_modificaciones, promedio_mejora, costo_beneficio, indicador)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          autoId, metricas.impacto_total, metricas.costo_total,
          metricas.numero_modificaciones, metricas.promedio_mejora,
          metricas.costo_beneficio, metricas.indicador
        ]
      );
    }
    saveDB();
    return metricas;
  }

  /**
   * New path: given only the autoId, fetch modifications from the
   * injected ModificacionRepository and persist the analysis. This is
   * what the AnalisisRecalcObserver calls in response to a
   * `modificacion.*` event.
   * @param {number} autoId
   * @returns {object} the persisted metricas
   */
  recalcularForAuto(autoId) {
    if (!this.modificacionRepository) {
      throw new Error('recalcularForAuto() requires a modificacionRepository (container wiring)');
    }
    const mods = this.modificacionRepository.findByAutoId(autoId);
    return this.recalcular(autoId, mods);
  }

  /**
   * Read the persisted analysis row. Uses the injected repository when
   * available; falls back to the module-level DB for the legacy
   * singleton.
   * @param {number} autoId
   * @returns {object|null}
   */
  getByAutoId(autoId) {
    if (this.analisisRepository) {
      return this.analisisRepository.findByAutoId(autoId);
    }
    const db = this._db || getDB();
    const result = db.exec('SELECT * FROM analisis WHERE auto_id = ?', [autoId]);
    if (result.length > 0 && result[0].values.length > 0) {
      const row = result[0].values[0];
      return {
        id: row[0],
        auto_id: row[1],
        impacto_total: row[2],
        costo_total: row[3],
        numero_modificaciones: row[4],
        promedio_mejora: row[5],
        costo_beneficio: row[6],
        indicador: row[7],
        updated_at: row[8]
      };
    }
    return null;
  }
}

/**
 * Construct the default singleton used by legacy EJS controllers.
 * The composition root (PR 3) will replace this with a container-built
 * instance that has its repositories injected.
 */
function createDefaultAnalisisService() {
  // Default singleton: no repos injected. The legacy code path uses
  // the module-level getDB() handle, so EJS controllers keep working
  // without any container wiring in PR 2.
  return new AnalisisService();
}

const defaultAnalisisService = createDefaultAnalisisService();

module.exports = defaultAnalisisService;
module.exports.AnalisisService = AnalisisService;
module.exports.createDefaultAnalisisService = createDefaultAnalisisService;
// Re-export the legacy class-level helpers for code that wants to
// construct container-wired instances explicitly.
module.exports.AnalisisRepository = AnalisisRepository;
module.exports.ModificacionRepository = ModificacionRepository;
