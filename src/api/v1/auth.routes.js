const express = require('express');
const bcrypt = require('bcryptjs');
const { loginSchema } = require('../schemas');
const apiAuth = require('../../middlewares/apiAuth');
const { buildLoginUser, buildLogoutUser, buildGetMe } = require('../../usecases/auth');
const { ValidationError } = require('../../errors/DomainError');

const router = express.Router();

/**
 * Construye las dependencias de los use cases a partir del container.
 * Llamado una sola vez al montar el router.
 */
function buildDeps(container) {
  return {
    loginUser: buildLoginUser({
      usuarioRepository: container.repositories.usuario,
      bcrypt
    }),
    logoutUser: buildLogoutUser(),
    getMe: buildGetMe()
  };
}

/**
 * Convierte un `ZodError` en `ValidationError` con `details` ya
 * formateados (path como string separado por punto).
 */
function fromZodError(zodErr) {
  const details = (zodErr.issues || []).map((iss) => ({
    path: Array.isArray(iss.path) ? iss.path.join('.') : String(iss.path || ''),
    message: iss.message
  }));
  return new ValidationError('Datos inválidos', details);
}

// POST /api/v1/auth/login — público (sin apiAuth)
router.post('/login', async (req, res, next) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(fromZodError(parsed.error));
    }
    const { loginUser } = buildDeps(req.container);
    const user = await loginUser(req, parsed.data);
    req.session.user = user;
    res.status(200).json({ user });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/auth/me — protegido
router.get('/me', apiAuth, (req, res, next) => {
  try {
    const { getMe } = buildDeps(req.container);
    const user = getMe(req);
    res.status(200).json({ user });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/auth/logout — protegido
router.post('/logout', apiAuth, async (req, res, next) => {
  try {
    const { logoutUser } = buildDeps(req.container);
    await logoutUser(req);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
