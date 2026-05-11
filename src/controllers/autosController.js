const autoModel = require('../models/autoModel');
const modificacionModel = require('../models/modificacionModel');
const { marcaModel } = require('../models/catalogoModel');
const placaValidator = require('../services/placaValidator');
const analisisService = require('../services/analisisService');

const ITEMS_PER_PAGE = 10;

const autosController = {
  index: (req, res) => {
    try {
      const idUsuario = req.session.user.id;
      const page = parseInt(req.query.page) || 1;
      const offset = (page - 1) * ITEMS_PER_PAGE;

      const autos = autoModel.getAllByUsuario(idUsuario, ITEMS_PER_PAGE, offset);
      const totalCount = autoModel.getCountByUsuario(idUsuario);
      const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

      res.render('autos/index', {
        autos,
        currentPage: page,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      });
    } catch (error) {
      console.error('Error al listar autos:', error);
      req.flash('error', 'Error al cargar la lista de autos');
      res.render('autos/index', {
        autos: [],
        currentPage: 1,
        totalPages: 0,
        hasNextPage: false,
        hasPrevPage: false
      });
    }
  },

  showCreate: (req, res) => {
    const marcas = marcaModel.getAll();
    res.render('autos/create', { marcas });
  },

  create: (req, res) => {
    try {
      const { placa, id_marca, id_modelo, anio } = req.body;
      const idUsuario = req.session.user.id;

      // Validar placa (formato + unicidad)
      const resultadoPlaca = placaValidator.validar(
        placa, idUsuario, autoModel.existePlacaParaUsuario
      );
      if (!resultadoPlaca.valida) {
        req.flash('error', resultadoPlaca.error);
        return res.redirect('/autos/new');
      }

      autoModel.create(resultadoPlaca.placaNormalizada, parseInt(id_marca), parseInt(id_modelo), parseInt(anio), idUsuario);
      req.flash('success', 'Auto creado exitosamente');
      res.redirect('/autos');
    } catch (error) {
      console.error('Error al crear auto:', error);
      req.flash('error', 'Error al crear el auto');
      res.redirect('/autos/new');
    }
  },

  show: (req, res) => {
    try {
      const { id } = req.params;
      const idUsuario = req.session.user.id;
      const auto = autoModel.getById(id);

      if (!auto || auto.id_usuario !== idUsuario) {
        req.flash('error', 'Auto no encontrado');
        return res.redirect('/autos');
      }

      const modificaciones = modificacionModel.getByAutoId(id);
      const analisis = analisisService.getByAutoId(id);
      res.render('autos/show', { auto, modificaciones, analisis });
    } catch (error) {
      console.error('Error al mostrar auto:', error);
      req.flash('error', 'Error al cargar el auto');
      res.redirect('/autos');
    }
  },

  showEdit: (req, res) => {
    try {
      const { id } = req.params;
      const idUsuario = req.session.user.id;
      const auto = autoModel.getById(id);

      if (!auto || auto.id_usuario !== idUsuario) {
        req.flash('error', 'Auto no encontrado');
        return res.redirect('/autos');
      }

      const marcas = marcaModel.getAll();
      res.render('autos/edit', { auto, marcas });
    } catch (error) {
      console.error('Error al cargar formulario de edición:', error);
      req.flash('error', 'Error al cargar el auto');
      res.redirect('/autos');
    }
  },

  update: (req, res) => {
    try {
      const { id } = req.params;
      const { placa, id_marca, id_modelo, anio } = req.body;
      const idUsuario = req.session.user.id;

      const auto = autoModel.getById(id);
      if (!auto || auto.id_usuario !== idUsuario) {
        req.flash('error', 'Auto no encontrado');
        return res.redirect('/autos');
      }

      // Validar placa (formato + unicidad, excluyendo el auto actual)
      const resultadoPlaca = placaValidator.validar(
        placa, idUsuario, autoModel.existePlacaParaUsuario, parseInt(id)
      );
      if (!resultadoPlaca.valida) {
        req.flash('error', resultadoPlaca.error);
        return res.redirect(`/autos/${id}/edit`);
      }

      autoModel.update(id, resultadoPlaca.placaNormalizada, parseInt(id_marca), parseInt(id_modelo), parseInt(anio));
      req.flash('success', 'Auto actualizado exitosamente');
      res.redirect(`/autos/${id}`);
    } catch (error) {
      console.error('Error al actualizar auto:', error);
      req.flash('error', 'Error al actualizar el auto');
      res.redirect(`/autos/${req.params.id}/edit`);
    }
  },

  showAnalisis: (req, res) => {
    try {
      const { id } = req.params;
      const idUsuario = req.session.user.id;
      const auto = autoModel.getById(id);

      if (!auto || auto.id_usuario !== idUsuario) {
        req.flash('error', 'Auto no encontrado');
        return res.redirect('/autos');
      }

      const modificaciones = modificacionModel.getByAutoId(id);
      const analisis = analisisService.getByAutoId(id);
      res.render('autos/analisis', { auto, modificaciones, analisis });
    } catch (error) {
      console.error('Error al mostrar análisis:', error);
      req.flash('error', 'Error al cargar el análisis');
      res.redirect('/autos');
    }
  },

  delete: (req, res) => {
    try {
      const { id } = req.params;
      const idUsuario = req.session.user.id;

      const auto = autoModel.getById(id);
      if (!auto || auto.id_usuario !== idUsuario) {
        req.flash('error', 'Auto no encontrado');
        return res.redirect('/autos');
      }

      autoModel.delete(id);
      req.flash('success', 'Auto eliminado exitosamente (incluyendo sus modificaciones)');
      res.redirect('/autos');
    } catch (error) {
      console.error('Error al eliminar auto:', error);
      req.flash('error', 'Error al eliminar el auto');
      res.redirect('/autos');
    }
  }
};

module.exports = autosController;
