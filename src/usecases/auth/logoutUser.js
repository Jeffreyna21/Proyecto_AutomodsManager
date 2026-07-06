/**
 * use case: logoutUser
 *
 * Destruye la sesión actual. No requiere dependencias: solo delega en
 * `req.session.destroy`. Devuelve una promesa que se resuelve cuando
 * la sesión fue destruida.
 *
 * @returns {(req: import('express').Request) => Promise<void>}
 */
function buildLogoutUser() {
  return function logoutUser(req) {
    return new Promise((resolve, reject) => {
      if (!req.session) return resolve();
      req.session.destroy((err) => {
        if (err) return reject(err);
        return resolve();
      });
    });
  };
}

module.exports = buildLogoutUser;
