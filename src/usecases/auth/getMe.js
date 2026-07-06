/**
 * use case: getMe
 *
 * Devuelve el usuario actual de la sesión. El middleware `apiAuth` ya
 * validó que exista; este use case solo mapea al DTO público
 * (`UserDTO` = `{ id, username }`).
 *
 * @returns {(req: import('express').Request) => { id: number, username: string }}
 */
function buildGetMe() {
  return function getMe(req) {
    return { id: req.user.id, username: req.user.username };
  };
}

module.exports = buildGetMe;
