/**
 * DomainError — clase base para todos los errores de la capa de
 * aplicación y dominio. Cada subclase define un `code` (string estable
 * que la API expone en el envelope) y un `status` (código HTTP
 * correspondiente). El envelope de error se construye a partir de
 * estos campos; el `message` es seguro de mostrar al usuario.
 */
class DomainError extends Error {
  /**
   * @param {string} message mensaje seguro para el usuario (en español)
   * @param {string} code    código estable de error (UPPER_SNAKE_CASE)
   * @param {number} status  código HTTP recomendado
   */
  constructor(message, code, status) {
    super(message);
    this.name = 'DomainError';
    this.code = code;
    this.status = status;
    this.details = null;
  }
}

/**
 * ValidationError — entrada del cliente no cumple las reglas de
 * validación. Lleva `details` (lista de { path, message }) que la
 * API expone en el envelope.
 */
class ValidationError extends DomainError {
  /**
   * @param {string} message
   * @param {Array<{path: string|Array<string>, message: string}>} [details]
   */
  constructor(message, details) {
    super(message || 'Datos inválidos', 'VALIDATION_ERROR', 400);
    this.name = 'ValidationError';
    this.details = Array.isArray(details) ? details : [];
  }
}

/**
 * UnauthorizedError — no hay sesión válida, o las credenciales son
 * incorrectas. HTTP 401.
 */
class UnauthorizedError extends DomainError {
  constructor(message) {
    super(message || 'No autorizado', 'UNAUTHORIZED', 401);
    this.name = 'UnauthorizedError';
  }
}

/**
 * ForbiddenError — autenticado pero sin permiso para el recurso.
 * HTTP 403. Se mantiene por completitud aunque la API actualmente
 * colapsa estos casos a 404 (existence-leak safe).
 */
class ForbiddenError extends DomainError {
  constructor(message) {
    super(message || 'Acceso denegado', 'FORBIDDEN', 403);
    this.name = 'ForbiddenError';
  }
}

/**
 * NotFoundError — el recurso no existe o no pertenece al usuario
 * (existence-leak safe: el cliente no puede distinguir entre ambos).
 */
class NotFoundError extends DomainError {
  constructor(message) {
    super(message || 'Recurso no encontrado', 'NOT_FOUND', 404);
    this.name = 'NotFoundError';
  }
}

/**
 * ConflictError — el recurso ya existe (placa duplicada, etc.).
 */
class ConflictError extends DomainError {
  constructor(message) {
    super(message || 'Conflicto con el estado actual', 'CONFLICT', 409);
    this.name = 'ConflictError';
  }
}

/**
 * InternalError — error inesperado del servidor. El mensaje genérico
 * se devuelve al cliente; el `cause` se puede conservar para logging.
 */
class InternalError extends DomainError {
  constructor(message) {
    super(message || 'Error interno del servidor', 'INTERNAL', 500);
    this.name = 'InternalError';
  }
}

module.exports = {
  DomainError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  InternalError
};
