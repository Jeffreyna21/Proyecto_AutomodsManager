const buildListarModificaciones = require('./listarModificaciones');
const buildCrearModificacion = require('./crearModificacion');
const buildActualizarModificacion = require('./actualizarModificacion');
const buildEliminarModificacion = require('./eliminarModificacion');

module.exports = {
  buildListarModificaciones,
  buildCrearModificacion,
  buildActualizarModificacion,
  buildEliminarModificacion
};
