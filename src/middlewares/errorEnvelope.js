const { DomainError, InternalError } = require('../errors/DomainError');

/**
 * Construye un envelope de error normalizado:
 *   { error: { code, message, details? } }
 *
 * `details` se incluye únicamente cuando se pasa explícitamente y es
 * un arreglo no vacío (regla de la spec api-v1-json: `details` solo
 * aparece en VALIDATION_ERROR).
 *
 * @param {string} code
 * @param {string} message
 * @param {Array<{path: string|Array<string>, message: string}>} [details]
 * @returns {{ error: { code: string, message: string, details?: Array } }}
 */
function apiError(code, message, details) {
  const error = { code, message };
  if (Array.isArray(details) && details.length > 0) {
    error.details = details;
  }
  return { error };
}

/**
 * Middleware final de errores para /api/v1. Cualquier error que
 * llegue aquí se mapea a un envelope JSON:
 *   - DomainError → usa su code/status/details
 *   - cualquier otro Error → INTERNAL 500, mensaje genérico (sin stack)
 *
 * Se monta DESPUÉS de todas las rutas en el app.use de /api/v1.
 *
 * @param {Error & { status?: number, code?: string, details?: any }} err
 * @param {import('express').Request} _req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} _next
 */
function errorHandler(err, _req, res, _next) {
  if (err instanceof DomainError) {
    return res.status(err.status).json(apiError(err.code, err.message, err.details));
  }
  // Error genérico: registrar para diagnóstico, pero NO filtrar al cliente.
  // La spec exige que el body de 500 NUNCA incluya `stack`.
  // eslint-disable-next-line no-console
  console.error('[errorHandler] Error no controlado:', err);
  const safe = new InternalError();
  return res.status(safe.status).json(apiError(safe.code, safe.message));
}

module.exports = { apiError, errorHandler };
