const bcrypt = require('bcryptjs');
const usuarioModel = require('../models/usuarioModel');

const authController = {
  showLogin: (req, res) => {
    if (req.session.authenticated) {
      return res.redirect('/autos');
    }
    res.render('auth/login');
  },

  login: async (req, res) => {
    const { username, password } = req.body;

    const user = usuarioModel.getByUsername(username);

    if (!user) {
      req.flash('error', 'Usuario o contraseña incorrectos');
      return res.redirect('/login');
    }

    const isValid = await bcrypt.compare(password, user.password);

    if (!isValid) {
      req.flash('error', 'Usuario o contraseña incorrectos');
      return res.redirect('/login');
    }

    req.session.authenticated = true;
    req.session.user = { id: user.id, username: user.username };
    req.flash('success', `Bienvenido, ${user.username}!`);
    res.redirect('/autos');
  },

  logout: (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error('Error al cerrar sesión:', err);
      }
      res.redirect('/login');
    });
  }
};

module.exports = authController;
