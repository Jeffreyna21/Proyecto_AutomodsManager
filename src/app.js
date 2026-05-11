const express = require('express');
const path = require('path');
const methodOverride = require('method-override');
const flash = require('connect-flash');
const sessionConfig = require('./config/session');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));
app.use(methodOverride('_method'));
app.use(sessionConfig);
app.use(flash());

app.use((req, res, next) => {
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  res.locals.user = req.session.user || null;
  next();
});

const authRoutes = require('./routes/authRoutes');
const autosRoutes = require('./routes/autosRoutes');
const modificacionesRoutes = require('./routes/modificacionesRoutes');
const apiRoutes = require('./routes/apiRoutes');

app.use('/', authRoutes);
app.use('/autos', autosRoutes);
app.use('/', modificacionesRoutes);
app.use('/api', apiRoutes);

app.use((req, res) => {
  res.status(404).render('partials/error', { 
    message: 'Página no encontrada',
    code: 404
  });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('partials/error', {
    message: 'Error interno del servidor',
    code: 500
  });
});

module.exports = app;
