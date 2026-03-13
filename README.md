# MiTechnologies WMS (Full‑Stack) — React + Node/Express + MySQL (Sequelize)

Sistema de gestión de almacén **full-stack** (frontend + backend + base de datos) con:
- Login por **correo + contraseña** y validación adicional de **número de empleado**
- Roles: **ADMIN / SUPERVISOR / OPERADOR**
- Puestos (texto): ayudante, montacargista, coordinador, gerente, etc.
- Mapa visual de racks por área (A1–A4), niveles A–C y posiciones 1–12
- Catálogo maestro de **Productos/SKUs**
- Órdenes de salida (workflow básico)
- Conteos cíclicos (snapshot + captura en backend)
- Ubicaciones con tipo/capacidad y bloqueo con motivo
- Log de autenticación (login/logout)
- Entradas / Salidas / Transferencias / Ajustes
- Bitácora (auditoría) de movimientos
- QR: generar y consultar por QR (y en frontend escanear con cámara o input de escáner)

> Nota: Yo no puedo “dejarlo ya desplegado” desde aquí, pero te dejo el **código completo** + **seed** + **pasos exactos** para desplegar en Vercel/Render/MongoDB Atlas.

---

## 1) Requisitos
- Node.js 18+ (recomendado 20)
- MySQL 8.0+ (local o servicio como PlanetScale/Railway)
- Cuenta en Render (backend) o Railway
- Cuenta en Vercel (frontend)

---

## 2) Estructura del repo
```
/backend   -> API Node/Express
/frontend  -> React (Vite) + MUI
```

---

## 3) Backend (local)
### 3.1 Variables de entorno
Copia:
```
backend/.env.example -> backend/.env
```

### 3.2 Instalar y correr
```bash
cd backend
npm install
npm run seed
npm run dev
```

API por defecto: `http://localhost:5000`

---

## 4) Frontend (local)
Copia:
```
frontend/.env.example -> frontend/.env
```

Instala y corre:
```bash
cd frontend
npm install
npm run dev
```

Frontend: `http://localhost:5173`

---

## 5) Credenciales demo (seed)
- **Admin**
  - email: `admin@demo.com`
  - password: `Admin123!`
  - employeeNumber: `0001`
  - puesto: `Gerente`
- **Supervisor**
  - email: `supervisor@demo.com`
  - password: `Supervisor123!`
  - employeeNumber: `0002`
  - puesto: `Supervisor`
- **Operador**
  - email: `operador@demo.com`
  - password: `Operador123!`
  - employeeNumber: `0003`
  - puesto: `Montacargista`

---

## 6) Deploy en MongoDB Atlas
1. Crea un cluster y un usuario de DB.
2. En *Network Access*, permite tu IP (y en producción, 0.0.0.0/0 si lo necesitas).
3. Copia tu `MONGODB_URI`.

---

## 7) Deploy backend en Render
1. Crea un nuevo **Web Service** desde tu repo (o sube este código).
2. Root directory: `backend`
3. Build command: `npm install`
4. Start command: `npm start`
5. Env vars:
   - `MONGODB_URI`
   - `JWT_SECRET`
   - `CORS_ORIGIN` = URL de Vercel (ej. `https://tu-app.vercel.app`)
   - `NODE_ENV` = `production`
6. En Render toma tu URL: `https://<tu-backend>.onrender.com`

---

## 8) Deploy frontend en Vercel
1. Importa el repo a Vercel.
2. Root directory: `frontend`
3. Env vars:
   - `VITE_API_BASE_URL` = `https://<tu-backend>.onrender.com`
4. Deploy.

---

## 9) Documentación rápida de endpoints
### Auth
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/register` (ADMIN)

### Locations (racks)
- `GET /api/locations?area=A1`
- `PATCH /api/locations/:id/block` (ADMIN o SUPERVISOR)
- `PATCH /api/locations/:id/unblock` (ADMIN o SUPERVISOR)

### Pallets (tarimas)
- `POST /api/pallets` (entrada)
- `GET /api/pallets`
- `GET /api/pallets/:id`
- `GET /api/pallets/by-qr/:code`
- `PATCH /api/pallets/:id/transfer`
- `POST /api/pallets/:id/out` (requiere puesto Supervisor/Coordinador/Gerente o rol SUPERVISOR/ADMIN)
- `POST /api/pallets/:id/adjust`

### Movements
- `GET /api/movements`
- `GET /api/movements?export=csv` (descarga CSV)

### Dashboard
- `GET /api/dashboard/kpis`

---

## 10) Notas de negocio (lo que ya dejé implementado)
- **1 tarima por ubicación** (A1–A4 / A–C / 1–12)
- Una tarima puede tener **varios productos** (electrónicos) dentro: `items[]`
- Regla de autorización para **salidas**:
  - Permitido si `role` es `ADMIN` o `SUPERVISOR`, **o** si `position` es `Supervisor`, `Coordinador` o `Gerente`.

---

Si quieres que cambie nombres de áreas/producción o que soporte múltiples racks por área, se puede ampliar rápido.


## Extra (Tiempo real + PWA)
- Socket.IO emite `movement:new` y `dashboard:update`.
- Frontend escucha eventos para actualizar dashboard.
- PWA habilitada (vite-plugin-pwa) con íconos básicos.
