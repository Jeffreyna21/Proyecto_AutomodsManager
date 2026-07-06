require('dotenv').config();
const buildApp = require('./src/app');
const { initDB } = require('./src/models/db');

const PORT = process.env.PORT || 3000;

initDB()
  .then(() => buildApp())
  .then((app) => {
    app.listen(PORT, () => {
      console.log(`🚗 AutoMods Manager corriendo en http://localhost:${PORT}`);
      console.log(`📝 Usuarios: admin/admin, user/user123`);
    });
  })
  .catch((err) => {
    console.error('Error al inicializar la base de datos:', err);
    process.exit(1);
  });
