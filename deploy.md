# Instrucciones de Despliegue — AutoMods Intelligence

## 1. Prerrequisitos del entorno

- **Node.js**: v18 o superior (recomendado v22 LTS)
- **pnpm**: gestor de paquetes (`npm install -g pnpm`)
- **Git**: para versionado (si aplica)

> **Nota**: SQLite se maneja en memoria con sql.js (WebAssembly). No se necesita instalar una base de datos externa.

## 2. Variables de entorno

Crear archivo `.env` en la raíz del proyecto:

```bash
cp .env.example .env
```

Variables requeridas:

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `SESSION_SECRET` | Clave secreta para firmar sesiones | `mi-secreto-super-seguro-2024` |
| `PORT` | Puerto del servidor (opcional, default 3000) | `3000` |

## 3. Instalación de dependencias

```bash
pnpm install
```

## 4. Base de datos (automática)

La base de datos se crea automáticamente al iniciar el servidor por primera vez:

- Se genera el archivo `database/automods.db`
- Se crean todas las tablas (`usuarios`, `marcas`, `modelos`, `tipos_modificacion`, `autos`, `modificaciones`, `analisis`)
- Se ejecuta el seed de catálogos (7 marcas con 5 modelos cada una, 3 tipos de modificación)
- Se crean los usuarios de prueba (`admin/admin`, `user/user123`)

> **No se requiere ejecutar migraciones manualmente.** Todo se maneja en `src/models/db.js`.

## 5. Correr los tests

```bash
pnpm test
```

Debe mostrar 15 tests pasando (0 fallos).

## 6. Iniciar el servidor

**Desarrollo** (con auto-reload via nodemon):
```bash
pnpm dev
```

**Producción**:
```bash
pnpm start
```

## 7. Verificación post-despliegue

1. Abrir `http://localhost:3000` en el navegador
2. Debe mostrar la pantalla de login
3. Iniciar sesión con `admin` / `admin`
4. Crear un auto con placa (ej: `PBA-1234`), seleccionar marca y modelo del dropdown
5. Agregar una modificación con tipo, nivel de impacto y costo
6. Verificar que el indicador de rendimiento se muestra en el detalle del auto
7. Acceder a "Ver Análisis Detallado" para ver gráficos
8. Cerrar sesión e iniciar con `user` / `user123` para verificar aislamiento de datos

---

## 8. Lista de commits sugerida (para versionado Git)

Si se necesita versionar el proyecto con Git, ejecutar los siguientes commits en orden. Cada commit agrupa cambios coherentes y verificables:

```bash
git init
git add .gitignore .env.example
git commit -m "chore: configuración inicial del repositorio"

git add package.json pnpm-lock.yaml pnpm-workspace.yaml server.js
git commit -m "chore: configuración del proyecto Node.js con pnpm"

git add src/config/ src/app.js
git commit -m "feat(config): configuración de Express, sesiones y middlewares"

git add src/models/db.js
git commit -m "feat(db): schema completo con tablas de usuarios, catálogos, autos, modificaciones y análisis"

git add src/models/usuarioModel.js
git commit -m "feat(usuarios): modelo de usuarios con consulta por username e id"

git add src/models/catalogoModel.js
git commit -m "feat(catalogos): modelos de marca, modelo y tipo de modificación"

git add src/models/autoModel.js
git commit -m "feat(vehiculo): modelo de autos con FKs a marca, modelo y usuario, validación de unicidad de placa"

git add src/models/modificacionModel.js
git commit -m "feat(modificacion): modelo de modificaciones con nivel de impacto, tipo y fecha"

git add src/services/placaValidator.js
git commit -m "feat(validacion): validador de placa en capa de dominio con formato Ecuador y unicidad por usuario"

git add src/services/analisisService.js
git commit -m "feat(core): servicio de análisis con cálculo de métricas y clasificación del indicador"

git add src/middlewares/
git commit -m "feat(middlewares): autenticación y validación de datos con express-validator"

git add src/controllers/authController.js src/routes/authRoutes.js
git commit -m "feat(auth): autenticación con usuarios desde base de datos"

git add src/controllers/autosController.js src/routes/autosRoutes.js
git commit -m "feat(vehiculo): controlador CRUD con validación de placa, filtro por usuario y análisis"

git add src/controllers/modificacionesController.js src/routes/modificacionesRoutes.js
git commit -m "feat(modificacion): controlador CRUD con recálculo de análisis en cascada"

git add src/routes/apiRoutes.js
git commit -m "feat(api): endpoint para listar modelos por marca"

git add src/views/partials/ src/views/auth/
git commit -m "feat(ui): partials y vista de login"

git add src/views/autos/index.ejs src/views/autos/create.ejs src/views/autos/edit.ejs
git commit -m "feat(ui): vistas de listado, creación y edición de autos con dropdowns dependientes"

git add src/views/autos/show.ejs
git commit -m "feat(ui): panel de vehículo con métricas e indicador de rendimiento"

git add src/views/autos/analisis.ejs
git commit -m "feat(ui): panel de análisis detallado con gráficos de evolución y distribución"

git add src/views/modificaciones/
git commit -m "feat(ui): formularios de modificación con tipo, nivel de impacto y fecha"

git add public/css/styles.css
git commit -m "style: estilos para badges de impacto, indicadores, métricas y radio buttons"

git add public/js/dropdownMarcaModelo.js
git commit -m "feat(vehiculo): dropdown dependiente marca-modelo con fetch al API"

git add tests/placaValidator.test.js
git commit -m "test(validacion): 7 casos de validación de formato y unicidad de placa"

git add tests/analisisService.test.js
git commit -m "test(core): 8 casos de cálculo de métricas y clasificación del indicador"

git add README.md
git commit -m "docs: actualizar README con descripción, stack, estructura y comandos"

git add deploy.md
git commit -m "docs: agregar instrucciones de despliegue paso a paso"
```

> **Total**: 25 commits atómicos siguiendo Conventional Commits en español.

---

## 9. Solución de problemas

### Error: "Session secret not set"
Verificar que `.env` existe con `SESSION_SECRET` definido.

### Base de datos corrupta
Eliminar `database/automods.db` y reiniciar el servidor. Se recreará con datos limpios.

### Puerto en uso
Cambiar `PORT` en `.env` (ej: `PORT=3001`).

### Tests fallan
Verificar Node.js v18+ (`node --version`). El test runner nativo requiere esta versión mínima.
