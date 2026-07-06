const { UnauthorizedError, NotFoundError, InternalError } = require('../errors/DomainError');

/**
 * apiAuth — middleware que exige una sesión autenticada para los
 * endpoints de /api/v1. Si la sesión no está activa, responde con el
 * envelope 401 UNAUTHORIZED.
 *
 * El "usuario" se considera autenticado cuando `req.session.user` está
 * presente y tiene un `id` numérico. Esto coincide con la convención
 * que ya usan los EJS controllers (`req.session.user = { id, username }`).
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} _res
 * @param {import('express').NextFunction} next
 */
function apiAuth(req, _res, next) {
  const user = req.session && req.session.user;
  if (!user || typeof user.id !== 'number') {
    return next(new UnauthorizedError('Debes iniciar sesión para acceder a este recurso'));
  }
  // Lo dejamos en req.user para que los handlers no tengan que
  // re-leerlo de la sesión.
  req.user = user;
  return next();
}

module.exports = apiAuth;
