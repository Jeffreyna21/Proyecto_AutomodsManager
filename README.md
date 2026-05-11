# AutoMods Intelligence

Sistema de gestión de vehículos y modificaciones con análisis de rendimiento, desarrollado con Node.js + Express siguiendo el patrón MVC para la asignatura **Ingeniería Web**.

## Características

- **CRUD completo de Vehículos**: Crear, listar, ver, editar y eliminar vehículos con placa, marca, modelo y año
- **CRUD completo de Modificaciones**: Gestionar modificaciones con tipo, nivel de impacto, costo y fecha
- **Análisis de Rendimiento**: Cálculo automático de métricas (impacto total, costo total, promedio de mejora, costo/beneficio) con indicador de rendimiento (Sin datos, Deficiente, Regular, Excelente)
- **Gráficos interactivos**: Evolución del impacto acumulado y distribución por tipo de modificación (Chart.js)
- **Dropdowns dependientes**: Marca → Modelo cargados dinámicamente desde la base de datos
- **Validación de placa**: Formato Ecuador (3 letras + 3-4 dígitos), normalización y unicidad por usuario en backend
- **Autenticación con sesiones**: Login seguro con bcrypt y usuarios en base de datos
- **Datos aislados por usuario**: Cada usuario solo ve y gestiona sus propios vehículos
- **Catálogos desde BD**: Marcas, modelos y tipos de modificación cargados desde tablas catálogo con seed inicial
- **Recálculo en cascada**: Las métricas se recalculan automáticamente al crear, editar o eliminar modificaciones

## Stack Tecnológico

- **Backend**: Node.js (v18+) + Express.js 5
- **Motor de vistas**: EJS
- **Base de datos**: SQLite (sql.js - WebAssembly)
- **Autenticación**: express-session + bcryptjs
- **Validación**: express-validator + validador de dominio personalizado
- **Gráficos**: Chart.js 4 (CDN)
- **Testing**: Node.js Test Runner nativo (node:test + node:assert)
- **Gestor de paquetes**: pnpm
- **Patrón**: MVC con capa de servicios/dominio

## Estructura del Proyecto

```
proyecto-automods-manager/
├── src/
│   ├── controllers/           # Controladores (orquestación)
│   │   ├── authController.js
│   │   ├── autosController.js
│   │   └── modificacionesController.js
│   ├── models/                # Modelos (acceso a datos)
│   │   ├── db.js              # Configuración SQLite + schema + seeds
│   │   ├── autoModel.js
│   │   ├── modificacionModel.js
│   │   ├── usuarioModel.js
│   │   └── catalogoModel.js   # Marca, Modelo, TipoModificacion
│   ├── services/              # Capa de dominio / lógica de negocio
│   │   ├── analisisService.js # Cálculo de métricas e indicador
│   │   └── placaValidator.js  # Validación de formato y unicidad
│   ├── views/                 # Plantillas EJS
│   │   ├── partials/
│   │   ├── auth/
│   │   ├── autos/
│   │   └── modificaciones/
│   ├── middlewares/
│   │   ├── authMiddleware.js
│   │   └── validationMiddleware.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── autosRoutes.js
│   │   ├── modificacionesRoutes.js
│   │   └── apiRoutes.js       # API REST (modelos por marca)
│   ├── config/
│   │   └── session.js
│   └── app.js
├── public/
│   ├── css/styles.css
│   └── js/dropdownMarcaModelo.js
├── tests/                     # Tests automatizados
│   ├── analisisService.test.js
│   └── placaValidator.test.js
├── database/                  # Base de datos SQLite (se genera automáticamente)
├── .env.example
├── .gitignore
├── deploy.md                  # Instrucciones de despliegue
├── server.js
└── package.json
```

## Instalación

### Prerrequisitos

- Node.js v18 o superior
- pnpm (gestor de paquetes)

### Pasos

1. **Clonar el repositorio**:
```bash
git clone <url-del-repositorio>
cd proyecto-automods-manager
```

2. **Instalar dependencias**:
```bash
pnpm install
```

3. **Configurar variables de entorno**:
```bash
cp .env.example .env
```
Editar `.env` y establecer un `SESSION_SECRET` seguro.

4. **Iniciar el servidor**:

**Modo desarrollo** (con auto-reload):
```bash
pnpm dev
```

**Modo producción**:
```bash
pnpm start
```

5. **Acceder a la aplicación**: `http://localhost:3000`

> La base de datos se crea automáticamente con las tablas, catálogos y usuarios de prueba en el primer arranque.

## Correr los Tests

```bash
pnpm test
```

Suite de 15 tests que cubren:
- **Validación de placa** (7 casos): formato, normalización, unicidad por usuario
- **Core de análisis** (8 casos): cálculo de métricas, clasificación del indicador, manejo de N=0 y costo_total=0

## Credenciales de Acceso

| Usuario | Contraseña | Descripción |
|---------|------------|-------------|
| `admin` | `admin`    | Usuario administrador |
| `user`  | `user123`  | Usuario estándar |

## Modelo de Datos

### Tabla: `usuarios`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | INTEGER PK | Identificador único |
| username | TEXT UNIQUE | Nombre de usuario |
| password | TEXT | Contraseña hasheada (bcrypt) |

### Tabla: `marcas` (catálogo)
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | INTEGER PK | Identificador único |
| nombre | TEXT UNIQUE | Nombre de la marca |

### Tabla: `modelos` (catálogo)
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | INTEGER PK | Identificador único |
| nombre | TEXT | Nombre del modelo |
| id_marca | INTEGER FK | Referencia a marcas |

### Tabla: `tipos_modificacion` (catálogo)
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | INTEGER PK | Identificador único |
| nombre | TEXT UNIQUE | Rendimiento, Estética, Mantenimiento |

### Tabla: `autos`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | INTEGER PK | Identificador único |
| placa | TEXT | Placa normalizada (ej: ABC1234) |
| id_marca | INTEGER FK | Referencia a marcas |
| id_modelo | INTEGER FK | Referencia a modelos |
| anio | INTEGER | Año del vehículo |
| id_usuario | INTEGER FK | Propietario del registro |

### Tabla: `modificaciones`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | INTEGER PK | Identificador único |
| nombre | TEXT | Nombre de la modificación |
| descripcion | TEXT | Descripción opcional |
| costo | REAL | Costo en USD |
| nivel_impacto | TEXT | Bajo (1), Medio (2), Alto (3) |
| fecha | DATE | Fecha de la modificación |
| auto_id | INTEGER FK | Referencia a autos (CASCADE) |
| id_tipo_modificacion | INTEGER FK | Referencia a tipos_modificacion |

### Tabla: `analisis`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| auto_id | INTEGER FK UNIQUE | Referencia a autos (CASCADE) |
| impacto_total | INTEGER | Suma de valores de impacto |
| costo_total | REAL | Suma de costos |
| numero_modificaciones | INTEGER | Cantidad de modificaciones |
| promedio_mejora | REAL | impacto_total / N (null si N=0) |
| costo_beneficio | REAL | impacto_total / costo_total (null si costo=0) |
| indicador | TEXT | Sin datos, Deficiente, Regular, Excelente |

## Convenciones de Commits

Formato: `<tipo>(<scope>): <descripción en español>`

Tipos: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `style`, `perf`, `build`, `ci`

## Autor

Proyecto desarrollado para la asignatura Ingeniería Web.

## Licencia

ISC
