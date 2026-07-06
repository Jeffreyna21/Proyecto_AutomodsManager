const { UnauthorizedError, NotFoundError, InternalError } = require('../../errors/DomainError');

/**
 * use case: loginUser
 *
 * Valida credenciales contra el `UsuarioRepository` (inyectado). Si son
 * correctas, escribe `req.session.user = { id, username }` y devuelve
 * el `UserDTO` listo para responder. Si las credenciales son
 * incorrectas, lanza `UnauthorizedError` (envelope 401).
 *
 * @param {object} deps
 * @param {{ findByUsername: (u: string) => (any|null) }} deps.usuarioRepository
 * @param {import('bcryptjs')} deps.bcrypt  módulo bcrypt (testeable: se inyecta)
 * @returns {(req: import('express').Request, input: { username: string, password: string }) => Promise<{ id: number, username: string }>}
 */
function buildLoginUser({ usuarioRepository, bcrypt }) {
  return async function loginUser(_req, { username, password }) {
    if (!usuarioRepository || typeof usuarioRepository.findByUsername !== 'function') {
      throw new InternalError('loginUser requiere usuarioRepository inyectado');
    }
    const user = usuarioRepository.findByUsername(username);
    if (!user) {
      // Mensaje genérico para no filtrar la existencia del username
      throw new UnauthorizedError('Usuario o contraseña incorrectos');
    }
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      throw new UnauthorizedError('Usuario o contraseña incorrectos');
    }
    return { id: user.id, username: user.username };
  };
}

module.exports = buildLoginUser;
