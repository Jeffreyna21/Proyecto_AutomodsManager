// Validador de placa de vehículo — Capa de dominio
// Formato Ecuador: 3 letras mayúsculas + guion opcional + 3 o 4 dígitos

const PLACA_REGEX = /^[A-Z]{3}-?\d{3,4}$/;

const placaValidator = {
  /**
   * Normaliza una placa: mayúsculas, sin espacios, sin guion
   * @param {string} placa - Placa a normalizar
   * @returns {string} Placa normalizada (ej: "ABC1234")
   */
  normalizar: (placa) => {
    if (!placa || typeof placa !== 'string') return '';
    return placa.trim().toUpperCase().replace(/-/g, '').replace(/\s/g, '');
  },

  /**
   * Valida el formato de una placa
   * @param {string} placa - Placa sin normalizar
   * @returns {{ valida: boolean, error: string|null, placaNormalizada: string }}
   */
  validarFormato: (placa) => {
    if (!placa || typeof placa !== 'string' || placa.trim() === '') {
      return { valida: false, error: 'La placa es obligatoria', placaNormalizada: '' };
    }

    // Normalizar para test de regex (con guion permitido)
    const placaUpper = placa.trim().toUpperCase().replace(/\s/g, '');

    if (!PLACA_REGEX.test(placaUpper)) {
      return {
        valida: false,
        error: 'Formato de placa inválido. Debe ser 3 letras + 3 o 4 dígitos (ej: PCA-1234 o ABC1234)',
        placaNormalizada: ''
      };
    }

    // Normalizar para almacenamiento (sin guion)
    const placaNormalizada = placaUpper.replace(/-/g, '');

    return { valida: true, error: null, placaNormalizada };
  },

  /**
   * Valida unicidad de placa para un usuario
   * @param {string} placaNormalizada - Placa ya normalizada
   * @param {number} idUsuario - ID del usuario
   * @param {Function} existeFn - Función que verifica existencia en BD
   * @param {number|null} excludeId - ID de auto a excluir (para edición)
   * @returns {{ valida: boolean, error: string|null }}
   */
  validarUnicidad: (placaNormalizada, idUsuario, existeFn, excludeId = null) => {
    const existe = existeFn(placaNormalizada, idUsuario, excludeId);
    if (existe) {
      return {
        valida: false,
        error: 'Ya tienes un vehículo registrado con esta placa'
      };
    }
    return { valida: true, error: null };
  },

  /**
   * Validación completa: formato + unicidad
   * @param {string} placa - Placa sin normalizar
   * @param {number} idUsuario - ID del usuario
   * @param {Function} existeFn - Función que verifica existencia en BD
   * @param {number|null} excludeId - ID de auto a excluir (para edición)
   * @returns {{ valida: boolean, error: string|null, placaNormalizada: string }}
   */
  validar: (placa, idUsuario, existeFn, excludeId = null) => {
    const resultadoFormato = placaValidator.validarFormato(placa);
    if (!resultadoFormato.valida) {
      return resultadoFormato;
    }

    const resultadoUnicidad = placaValidator.validarUnicidad(
      resultadoFormato.placaNormalizada,
      idUsuario,
      existeFn,
      excludeId
    );

    if (!resultadoUnicidad.valida) {
      return { ...resultadoUnicidad, placaNormalizada: resultadoFormato.placaNormalizada };
    }

    return resultadoFormato;
  }
};

module.exports = placaValidator;
