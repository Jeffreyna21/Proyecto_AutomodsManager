const requireAuth = (req, res, next) => {
  if (req.session && req.session.authenticated) {
    return next();
  }
  req.flash('error', 'Debes iniciar sesión para acceder a esta página');
  res.redirect('/login');
};

module.exports = { requireAuth };
