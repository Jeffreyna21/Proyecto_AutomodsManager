const modificacionModel = require('../models/modificacionModel');
const autoModel = require('../models/autoModel');
const { tipoModificacionModel } = require('../models/catalogoModel');
const analisisService = require('../services/analisisService');

const modificacionesController = {
  showCreate: (req, res) => {
    try {
      const { autoId } = req.params;
      const idUsuario = req.session.user.id;
      const auto = autoModel.getById(autoId);

      if (!auto || auto.id_usuario !== idUsuario) {
        req.flash('error', 'Auto no encontrado');
        return res.redirect('/autos');
      }

      const tipos = tipoModificacionModel.getAll();
      res.render('modificaciones/create', { auto, tipos });
    } catch (error) {
      console.error('Error al cargar formulario de modificación:', error);
      req.flash('error', 'Error al cargar el formulario');
      res.redirect('/autos');
    }
  },

  create: (req, res) => {
    try {
      const { autoId } = req.params;
      const { nombre, descripcion, costo, nivel_impacto, fecha, id_tipo_modificacion } = req.body;
      const idUsuario = req.session.user.id;

      const auto = autoModel.getById(autoId);
      if (!auto || auto.id_usuario !== idUsuario) {
        req.flash('error', 'Auto no encontrado');
        return res.redirect('/autos');
      }

      modificacionModel.create(
        nombre,
        descripcion || null,
        parseFloat(costo),
        nivel_impacto,
        fecha,
        autoId,
        parseInt(id_tipo_modificacion)
      );

      // Recalcular análisis del vehículo
      const modificaciones = modificacionModel.getByAutoId(autoId);
      analisisService.recalcular(autoId, modificaciones);

      req.flash('success', 'Modificación agregada exitosamente');
      res.redirect(`/autos/${autoId}`);
    } catch (error) {
      console.error('Error al crear modificación:', error);
      req.flash('error', 'Error al agregar la modificación');
      res.redirect(`/autos/${req.params.autoId}/modificaciones/new`);
    }
  },

  showEdit: (req, res) => {
    try {
      const { id } = req.params;
      const idUsuario = req.session.user.id;
      const modificacion = modificacionModel.getById(id);

      if (!modificacion) {
        req.flash('error', 'Modificación no encontrada');
        return res.redirect('/autos');
      }

      const auto = autoModel.getById(modificacion.auto_id);
      if (!auto || auto.id_usuario !== idUsuario) {
        req.flash('error', 'Auto no encontrado');
        return res.redirect('/autos');
      }

      const tipos = tipoModificacionModel.getAll();
      res.render('modificaciones/edit', { modificacion, auto, tipos });
    } catch (error) {
      console.error('Error al cargar formulario de edición:', error);
      req.flash('error', 'Error al cargar la modificación');
      res.redirect('/autos');
    }
  },

  update: (req, res) => {
    try {
      const { id } = req.params;
      const { nombre, descripcion, costo, nivel_impacto, fecha, id_tipo_modificacion } = req.body;
      const idUsuario = req.session.user.id;

      const modificacion = modificacionModel.getById(id);
      if (!modificacion) {
        req.flash('error', 'Modificación no encontrada');
        return res.redirect('/autos');
      }

      const auto = autoModel.getById(modificacion.auto_id);
      if (!auto || auto.id_usuario !== idUsuario) {
        req.flash('error', 'Auto no encontrado');
        return res.redirect('/autos');
      }

      modificacionModel.update(
        id,
        nombre,
        descripcion || null,
        parseFloat(costo),
        nivel_impacto,
        fecha,
        parseInt(id_tipo_modificacion)
      );

      // Recalcular análisis del vehículo
      const modificacionesActualizadas = modificacionModel.getByAutoId(modificacion.auto_id);
      analisisService.recalcular(modificacion.auto_id, modificacionesActualizadas);

      req.flash('success', 'Modificación actualizada exitosamente');
      res.redirect(`/autos/${modificacion.auto_id}`);
    } catch (error) {
      console.error('Error al actualizar modificación:', error);
      req.flash('error', 'Error al actualizar la modificación');
      res.redirect(`/modificaciones/${req.params.id}/edit`);
    }
  },

  delete: (req, res) => {
    try {
      const { id } = req.params;
      const idUsuario = req.session.user.id;
      const modificacion = modificacionModel.getById(id);

      if (!modificacion) {
        req.flash('error', 'Modificación no encontrada');
        return res.redirect('/autos');
      }

      const auto = autoModel.getById(modificacion.auto_id);
      if (!auto || auto.id_usuario !== idUsuario) {
        req.flash('error', 'Auto no encontrado');
        return res.redirect('/autos');
      }

      const autoId = modificacion.auto_id;
      modificacionModel.delete(id);

      // Recalcular análisis del vehículo
      const modificacionesRestantes = modificacionModel.getByAutoId(autoId);
      analisisService.recalcular(autoId, modificacionesRestantes);

      req.flash('success', 'Modificación eliminada exitosamente');
      res.redirect(`/autos/${autoId}`);
    } catch (error) {
      console.error('Error al eliminar modificación:', error);
      req.flash('error', 'Error al eliminar la modificación');
      res.redirect('/autos');
    }
  }
};

module.exports = modificacionesController;
