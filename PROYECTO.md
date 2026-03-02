# MiTechnologies RT — Sistema de Gestión de Almacén

> Sistema web full-stack de gestión de almacén con tiempo real, roles de usuario, mapa visual de racks, trazabilidad completa de pallets y exportación de reportes.

---

## Tabla de Contenidos

- [Stack Tecnológico](#stack-tecnológico)
- [Arquitectura](#arquitectura)
- [Funcionalidades](#funcionalidades)
- [Modelos de Base de Datos](#modelos-de-base-de-datos)
- [Endpoints API](#endpoints-api)
- [Páginas del Frontend](#páginas-del-frontend)
- [Roles y Permisos](#roles-y-permisos)
- [Instalación Local](#instalación-local)
- [Credenciales Demo](#credenciales-demo)
- [Variables de Entorno](#variables-de-entorno)
- [Deploy](#deploy)
- [Tiempo Real y PWA](#tiempo-real-y-pwa)

---

## Stack Tecnológico

### Backend
| Tecnología | Uso |
|---|---|
| Node.js 18+ | Runtime |
| Express 4 | Framework HTTP |
| Sequelize 6 | ORM |
| MySQL 8 | Base de datos |
| Socket.IO 4 | Tiempo real |
| JWT (jsonwebtoken) | Autenticación |
| bcryptjs | Hash de contraseñas |
| Zod | Validación de esquemas |
| Helmet + express-rate-limit | Seguridad |
| QRCode | Generación de códigos QR |
| morgan | Logging HTTP |

### Frontend
| Tecnología | Uso |
|---|---|
| React 18 | UI framework |
| Vite 5 | Build tool |
| MUI (Material UI) v5 | Componentes UI |
| React Router DOM 6 | Enrutamiento |
| Axios | Peticiones HTTP |
| Socket.IO Client | Tiempo real |
| Recharts | Gráficas |
| html5-qrcode | Escáner QR (cámara) |
| xlsx | Exportación Excel |
| dayjs | Manejo de fechas |
| vite-plugin-pwa | PWA |

---

## Arquitectura

```
mitechnologies-rt/
├── backend/
│   ├── server.js              # Entrada principal, Socket.IO
│   ├── src/
│   │   ├── config/            # Configuración DB, Sequelize
│   │   ├── controllers/       # Lógica de negocio por recurso
│   │   ├── middleware/        # Auth JWT, roles, validación
│   │   ├── models/
│   │   │   └── sequelize/     # Modelos ORM (User, Pallet, etc.)
│   │   ├── routes/            # Definición de rutas Express
│   │   ├── scripts/           # Seed de datos
│   │   ├── utils/             # Helpers (QR, CSV, etc.)
│   │   └── validation/        # Esquemas Zod
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx            # Router principal
│   │   ├── pages/             # Vistas de la app
│   │   ├── services/          # Llamadas a la API (axios)
│   │   ├── state/             # Estado global (context)
│   │   ├── ui/                # Componentes reutilizables
│   │   └── lib/               # Utilidades (socket, etc.)
│   ├── vite.config.js
│   └── package.json
│
└── vercel.json                # Configuración deploy frontend
```

---

## Funcionalidades

### Autenticación y Usuarios
- Login con correo + contraseña + número de empleado (triple validación)
- Registro de usuarios (solo ADMIN)
- Recuperación de contraseña
- Log de autenticación (login/logout)
- Gestión completa de usuarios: roles, puestos, activar/desactivar

### Inventario y Pallets
- **1 tarima por ubicación** (modelo estricto de almacén)
- Cada pallet contiene un array de `items[]` con: SKU, descripción, cantidad, seriales
- Entradas de pallet con asignación de ubicación
- Salidas con autorización por rol/puesto
- Transferencias entre ubicaciones
- Ajustes de inventario con nota
- Generación de código QR por pallet
- Consulta por QR (escaneo con cámara o lector físico)

### Mapa de Racks
- Áreas: **A1, A2, A3, A4**
- Niveles: **A, B, C**
- Posiciones: **1 – 12**
- Vista visual de disponibilidad por color
- Bloqueo/desbloqueo de ubicaciones con motivo (SUPERVISOR/ADMIN)
- Tipos: RACK, FLOOR, QUARANTINE, RETURNS

### Catálogo de Productos / SKUs
- CRUD de productos: SKU, descripción, marca, modelo, categoría, unidad
- Stock mínimo configurable
- Activar/desactivar productos

### Órdenes de Salida
- Creación de órdenes con líneas de pedido (SKU + cantidad)
- Tipos de destino: CLIENT, PRODUCTION, OTHER
- Workflow de estados: DRAFT → PENDING_PICK → PICKED → SHIPPED / CANCELLED
- Autorización de órdenes

### Conteos Cíclicos
- Apertura de conteos por área, nivel o personalizado
- Captura de cantidades en campo
- Revisión y aprobación (SUPERVISOR/ADMIN)
- Estados: OPEN → REVIEW → APPROVED / CLOSED / CANCELLED

### Bitácora de Movimientos
- Registro de todos los movimientos: IN, OUT, TRANSFER, ADJUST
- Snapshot de ítems en cada movimiento (auditoría)
- Filtros por fecha, tipo, pallet, usuario
- Exportación a CSV

### Dashboard
- KPIs en tiempo real:
  - Pallets en stock
  - Movimientos del día
  - Ubicaciones ocupadas vs disponibles
  - Alertas de stock mínimo
- Gráficas de movimientos (Recharts)
- Actualización automática vía Socket.IO

---

## Modelos de Base de Datos

### User
| Campo | Tipo | Notas |
|---|---|---|
| id | UUID (PK) | |
| email | STRING UNIQUE | |
| passwordHash | STRING | bcrypt |
| employeeNumber | STRING | |
| fullName | STRING | |
| role | ENUM | ADMIN / SUPERVISOR / OPERADOR |
| position | STRING | ayudante, montacargista, coordinador, gerente… |
| isActive | BOOLEAN | default: true |

### Product
| Campo | Tipo | Notas |
|---|---|---|
| id | UUID (PK) | |
| sku | STRING UNIQUE | |
| description | STRING | |
| brand | STRING | |
| model | STRING | |
| category | STRING | |
| unit | STRING | default: 'pz' |
| minStock | INTEGER | |
| isActive | BOOLEAN | |

### Location
| Campo | Tipo | Notas |
|---|---|---|
| id | UUID (PK) | |
| area | ENUM | A1, A2, A3, A4 |
| level | ENUM | A, B, C |
| position | INTEGER | 1 – 12 |
| type | ENUM | RACK, FLOOR, QUARANTINE, RETURNS |
| maxPallets | INTEGER | default: 1 |
| blocked | BOOLEAN | |
| blockedReason | TEXT | |

### Pallet
| Campo | Tipo | Notas |
|---|---|---|
| id | UUID (PK) | |
| code | STRING UNIQUE | Código / QR |
| lot | STRING | Lote/SKU |
| supplier | STRING | |
| receivedAt | DATE | |
| items | JSON | [{sku, description, qty, serials}] |
| locationId | UUID (FK) | → Location |
| status | ENUM | IN_STOCK, OUT, QUARANTINE, DAMAGED, RETURNED, ADJUSTED |

### Movement
| Campo | Tipo | Notas |
|---|---|---|
| id | UUID (PK) | |
| type | ENUM | IN, OUT, TRANSFER, ADJUST |
| palletId | UUID (FK) | → Pallet |
| userId | UUID (FK) | → User |
| fromLocationId | UUID (FK) | → Location (nullable) |
| toLocationId | UUID (FK) | → Location (nullable) |
| note | TEXT | |
| itemsSnapshot | JSON | Auditoría del estado al momento del movimiento |

### OutboundOrder
| Campo | Tipo | Notas |
|---|---|---|
| id | UUID (PK) | |
| orderNumber | STRING UNIQUE | |
| destinationType | ENUM | CLIENT, PRODUCTION, OTHER |
| status | ENUM | DRAFT, PENDING_PICK, PICKED, SHIPPED, CANCELLED |
| lines | JSON | [{sku, description, qty}] |
| createdById | UUID (FK) | → User |
| authorizedById | UUID (FK) | → User (nullable) |
| pallets | JSON | [palletId, …] |

### CycleCount
| Campo | Tipo | Notas |
|---|---|---|
| id | UUID (PK) | |
| name | STRING | |
| scope | ENUM | AREA, LEVEL, CUSTOM |
| area / level | STRING | |
| status | ENUM | OPEN, REVIEW, APPROVED, CLOSED, CANCELLED |
| lines | JSON | Datos del conteo |
| createdById / approvedById | UUID (FK) | → User |

---

## Endpoints API

### Auth — `/api/auth`
| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| POST | `/login` | Público | Inicio de sesión |
| GET | `/me` | Autenticado | Perfil del usuario actual |
| POST | `/register` | ADMIN | Registrar nuevo usuario |

### Locations — `/api/locations`
| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/` | Autenticado | Listar ubicaciones (filtro: `?area=A1`) |
| PATCH | `/:id/block` | ADMIN/SUPERVISOR | Bloquear ubicación |
| PATCH | `/:id/unblock` | ADMIN/SUPERVISOR | Desbloquear ubicación |

### Pallets — `/api/pallets`
| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| POST | `/` | Autenticado | Crear entrada de pallet |
| GET | `/` | Autenticado | Listar pallets |
| GET | `/:id` | Autenticado | Detalle de pallet |
| GET | `/by-qr/:code` | Autenticado | Buscar por código QR |
| PATCH | `/:id/transfer` | Autenticado | Transferir a otra ubicación |
| POST | `/:id/out` | SUPERVISOR/ADMIN* | Registrar salida |
| POST | `/:id/adjust` | ADMIN/SUPERVISOR | Ajuste de inventario |

> *También permitido si `position` es Supervisor, Coordinador o Gerente.

### Movements — `/api/movements`
| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/` | Autenticado | Bitácora de movimientos |
| GET | `/?export=csv` | ADMIN/SUPERVISOR | Exportar CSV |

### Dashboard — `/api/dashboard`
| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/kpis` | Autenticado | KPIs y métricas del almacén |

### Products — `/api/products`
| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/` | Autenticado | Catálogo de productos |
| POST | `/` | ADMIN | Crear producto |
| PATCH | `/:id` | ADMIN | Actualizar producto |

### Orders — `/api/orders`
| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/` | Autenticado | Listar órdenes |
| POST | `/` | Autenticado | Crear orden |
| PATCH | `/:id/status` | SUPERVISOR/ADMIN | Cambiar estado |

### Cycle Counts — `/api/counts`
| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/` | Autenticado | Listar conteos |
| POST | `/` | SUPERVISOR/ADMIN | Abrir conteo |
| PATCH | `/:id` | Autenticado | Capturar conteo |
| PATCH | `/:id/approve` | SUPERVISOR/ADMIN | Aprobar conteo |

---

## Páginas del Frontend

| Ruta | Página | Descripción |
|---|---|---|
| `/login` | LoginPage | Inicio de sesión |
| `/forgot-password` | ForgotPasswordPage | Recuperar contraseña |
| `/register` | RegisterPage | Registro (ADMIN) |
| `/dashboard` | DashboardPage | KPIs y gráficas |
| `/inventory` | InventoryPage | Lista de pallets en stock |
| `/racks` | RacksPage | Mapa visual de racks |
| `/locations` | LocationsPage | Gestión de ubicaciones |
| `/products` | ProductsPage | Catálogo de SKUs |
| `/movements` | MovementsPage | Bitácora de movimientos |
| `/orders` | OrdersPage | Órdenes de salida |
| `/counts` | CountsPage | Conteos cíclicos |
| `/scan` | ScanPage | Escaneo de QR |
| `/production` | ProductionPage | Gestión de producción |
| `/users` | UsersPage | Gestión de usuarios |
| `/admin/users` | AdminUsers | Admin avanzado de usuarios |

---

## Roles y Permisos

| Acción | OPERADOR | SUPERVISOR | ADMIN |
|---|---|---|---|
| Ver inventario | ✅ | ✅ | ✅ |
| Crear entrada (pallet) | ✅ | ✅ | ✅ |
| Transferir pallet | ✅ | ✅ | ✅ |
| Registrar salida | ⚠️* | ✅ | ✅ |
| Bloquear ubicación | ❌ | ✅ | ✅ |
| Exportar CSV | ❌ | ✅ | ✅ |
| Gestionar productos | ❌ | ❌ | ✅ |
| Gestionar usuarios | ❌ | ❌ | ✅ |
| Aprobar conteos | ❌ | ✅ | ✅ |

> ⚠️ *Permitido si el puesto del operador es: Supervisor, Coordinador o Gerente.

---

## Instalación Local

### Requisitos
- Node.js 18+
- MySQL 8 corriendo localmente (o remoto)

### 1. Clonar el repositorio
```bash
git clone <repo-url>
cd mitechnologies-rt
```

### 2. Configurar Backend
```bash
cd backend
cp .env.example .env
# Edita .env con tus credenciales de MySQL
npm install
npm run seed      # Crea tablas y datos de prueba
npm run dev       # Inicia en http://localhost:5000
```

### 3. Configurar Frontend
```bash
cd frontend
cp .env.example .env
# Edita .env: VITE_API_BASE_URL=http://localhost:5000
npm install
npm run dev       # Inicia en http://localhost:5173
```

---

## Credenciales Demo

| Rol | Email | Contraseña | N° Empleado | Puesto |
|---|---|---|---|---|
| ADMIN | admin@demo.com | Admin123! | 0001 | Gerente |
| SUPERVISOR | supervisor@demo.com | Supervisor123! | 0002 | Supervisor |
| OPERADOR | operador@demo.com | Operador123! | 0003 | Montacargista |

---

## Variables de Entorno

### Backend (`backend/.env`)
```env
PORT=5000
NODE_ENV=development

# MySQL
DB_HOST=localhost
DB_PORT=3306
DB_NAME=almacen_db
DB_USER=root
DB_PASS=tu_password

# JWT
JWT_SECRET=tu_secreto_jwt_muy_largo

# CORS
CORS_ORIGIN=http://localhost:5173
```

### Frontend (`frontend/.env`)
```env
VITE_API_BASE_URL=http://localhost:5000
```

---

## Deploy

### Base de Datos — PlanetScale / Railway / AWS RDS
1. Crea una base de datos MySQL.
2. Copia el connection string como `MYSQL_URI` o configura los campos `DB_*`.
3. Ejecuta el seed: `npm run seed` (una sola vez).

### Backend — Render
1. Nuevo Web Service → selecciona el repo.
2. Root directory: `backend`
3. Build command: `npm install`
4. Start command: `npm start`
5. Variables de entorno:
   - `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASS`
   - `JWT_SECRET`
   - `CORS_ORIGIN` = URL de Vercel
   - `NODE_ENV=production`

### Frontend — Vercel
1. Importa el repo a Vercel.
2. Root directory: `frontend`
3. Variable de entorno:
   - `VITE_API_BASE_URL` = URL de Render
4. Deploy.

---

## Tiempo Real y PWA

### Socket.IO
El backend emite eventos que el frontend escucha para actualizar la UI sin recargar:

| Evento | Disparado por | Efecto en frontend |
|---|---|---|
| `movement:new` | Cualquier movimiento | Actualiza bitácora |
| `dashboard:update` | Movimientos / ajustes | Recalcula KPIs |

### PWA
- Habilitada con `vite-plugin-pwa`
- Permite instalar la app en dispositivos móviles / tablets de almacén
- Funciona como app nativa en pantalla completa

---

## Relaciones del Modelo

```
User ──1:N── Movement
User ──1:N── OutboundOrder (createdBy)
User ──0:N── OutboundOrder (authorizedBy)
User ──1:N── CycleCount (createdBy)
User ──0:N── CycleCount (approvedBy)

Location ──1:N── Pallet
Location ──0:N── Movement (fromLocation)
Location ──0:N── Movement (toLocation)

Pallet ──1:N── Movement
Pallet ──N:1── Location
```

---

*Proyecto MiTechnologies RT — Gestión de Almacén en Tiempo Real*
