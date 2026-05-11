// Dropdown dependiente: Marca → Modelo
// Al seleccionar una marca, se cargan los modelos desde /api/marcas/:id/modelos

document.addEventListener('DOMContentLoaded', () => {
  const marcaSelect = document.getElementById('id_marca');
  const modeloSelect = document.getElementById('id_modelo');

  if (!marcaSelect || !modeloSelect) return;

  // Guardar el valor preseleccionado (modo edición)
  const modeloPreseleccionado = modeloSelect.dataset.selected || '';

  marcaSelect.addEventListener('change', async () => {
    const idMarca = marcaSelect.value;

    // Resetear el dropdown de modelo
    modeloSelect.innerHTML = '<option value="">Cargando modelos...</option>';
    modeloSelect.disabled = true;

    if (!idMarca) {
      modeloSelect.innerHTML = '<option value="">Primero seleccione una marca</option>';
      return;
    }

    try {
      const response = await fetch(`/api/marcas/${idMarca}/modelos`);

      if (!response.ok) {
        throw new Error('Error al cargar modelos');
      }

      const modelos = await response.json();

      modeloSelect.innerHTML = '<option value="">Seleccione un modelo</option>';
      modelos.forEach(modelo => {
        const option = document.createElement('option');
        option.value = modelo.id;
        option.textContent = modelo.nombre;
        // Preseleccionar en modo edición
        if (modelo.id.toString() === modeloPreseleccionado) {
          option.selected = true;
        }
        modeloSelect.appendChild(option);
      });

      modeloSelect.disabled = false;
    } catch (error) {
      console.error('Error:', error);
      modeloSelect.innerHTML = '<option value="">Error al cargar modelos</option>';
    }
  });

  // Si ya hay una marca seleccionada (modo edición), disparar el change
  if (marcaSelect.value) {
    marcaSelect.dispatchEvent(new Event('change'));
  }
});
