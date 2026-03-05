require('dotenv').config();

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const usersRoutes = require('./src/routes/users.routes');
const adminRoutes = require('./src/routes/admin.routes');
const authRoutes = require('./src/routes/auth.routes');
const productRoutes = require('./src/routes/product.routes');
const orderRoutes = require('./src/routes/order.routes');
const countRoutes = require('./src/routes/count.routes');
const reportRoutes = require('./src/routes/report.routes');
const locationRoutes = require('./src/routes/location.routes');
const palletRoutes = require('./src/routes/pallet.routes');
const movementRoutes = require('./src/routes/movement.routes');
const dashboardRoutes = require('./src/routes/dashboard.routes');
const productionRoutes = require('./src/routes/production.routes'); // ✅ ACTIVADO

// ✅ NUEVO: Paletizado Dashboard (FFT > Paletizado)
const palletDashboardRoutes = require('./src/routes/palletDashboard.routes');

// ✅ NUEVO: Admin Import Excel
const adminImportRoutes = require('./src/routes/adminImport.routes');

// ⚠️ OJO: connectDB era para Mongo. NO lo borro, pero ya no tumbará el server si falla.
const { connectDB } = require('./src/config/db');

// ✅ MySQL / Sequelize (Railway)
const { sequelize } = require('./src/config/mysql');

const app = express();
const httpServer = http.createServer(app);

/**
 * ✅ IMPORTANTE (Railway / proxies)
 * Arregla: ERR_ERL_UNEXPECTED_X_FORWARDED_FOR de express-rate-limit
 */
app.set('trust proxy', 1);

/**
 * CORS
 */
const corsOriginEnv = process.env.CORS_ORIGIN || '';
const allowedOrigins = corsOriginEnv ?
    corsOriginEnv.split(',').map(s => s.trim()).filter(Boolean) : [];

// ✅ Dominio principal de tu frontend (fallback si no lo pones en Railway)
const VERCEL_MAIN = 'https://mitechnologies-rt.vercel.app';

// ✅ Previews (si usas deploy previews)
const vercelPreviewRegex = /^https:\/\/mitechnologies-[a-z0-9-]+-romanhdls-projects\.vercel\.app$/i;

const corsOptions = {
    origin: function(origin, callback) {
        // Permite Postman / Server-to-server (sin Origin)
        if (!origin) return callback(null, true);

        // ✅ Siempre permite tu Vercel principal
        if (origin === VERCEL_MAIN) return callback(null, true);

        // ✅ Permite previews de Vercel
        if (vercelPreviewRegex.test(origin)) return callback(null, true);

        // ✅ Permite lo definido en Railway por env (CORS_ORIGIN="..., ...")
        if (allowedOrigins.includes(origin)) return callback(null, true);

        return callback(new Error(`CORS not allowed for origin: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    optionsSuccessStatus: 204,
    maxAge: 86400,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

/**
 * Socket.io
 */
const io = new Server(httpServer, {
    cors: {
        origin: (origin, callback) => {
            if (!origin) return callback(null, true);
            if (origin === VERCEL_MAIN) return callback(null, true);
            if (vercelPreviewRegex.test(origin)) return callback(null, true);
            if (allowedOrigins.includes(origin)) return callback(null, true);
            return callback(new Error(`Socket CORS not allowed: ${origin}`));
        },
        methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
        credentials: true,
    },
});
app.set('io', io);

// ✅ REALTIME: log conexiones + canal ping/pong
io.on('connection', (socket) => {
    console.log('socket connected:', socket.id);

    socket.on('disconnect', () => {
        console.log('socket disconnected:', socket.id);
    });

    socket.on('ping', () => {
        socket.emit('pong', { at: new Date().toISOString() });
    });
});

// ✅ REALTIME: middleware para emitir eventos desde rutas SIN tocar tu lógica
// Uso en rutas: res.locals.emit = [{ event:'dashboard:update', data:{...} }, ...]
app.use((req, res, next) => {
    res.on('finish', () => {
        try {
            const list = Array.isArray(res.locals ? .emit) ? res.locals.emit : [];
            if (!list.length) return;
            const _io = req.app.get('io');
            if (!_io) return;

            for (const e of list) {
                if (!e || !e.event) continue;
                _io.emit(e.event, e.data ? ? { at: new Date().toISOString() });
            }
        } catch (_) {
            // no-op
        }
    });
    next();
});

/**
 * Rate limit
 */
const limiter = rateLimit({ windowMs: 60 * 1000, max: 120 });
app.use(limiter);

/**
 * Seguridad + logs
 */
app.use(helmet());
app.use(express.json({ limit: '2mb' }));
app.use(morgan('dev'));

/**
 * ✅ Admin Import Excel (multipart/form-data)
 * Lo montamos aquí para que ya tenga CORS/helmet/rate-limit/logs.
 */
app.use('/api', adminImportRoutes);

/**
 * Healthcheck
 */
app.get('/health', (req, res) =>
    res.json({ ok: true, time: new Date().toISOString() })
);

// ✅ REALTIME: endpoint simple para probar sockets (no afecta nada)
app.get('/socket-test', (req, res) => {
    try {
        const _io = req.app.get('io');
        _io ? .emit('dashboard:update', { at: new Date().toISOString(), reason: 'socket-test' });
    } catch (e) {}
    res.json({ ok: true });
});

/**
 * Rutas
 */
app.use('/api/auth', authRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/counts', countRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/pallets', palletRoutes);
app.use('/api/movements', movementRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/production', productionRoutes); // ✅ AHORA SÍ ACTIVO

// ✅ NUEVO: monta /api/pallet-dashboard y /api/pallet-dashboard/:id/status
app.use('/api', palletDashboardRoutes);

/**
 * Error handler
 */
app.use((err, req, res, next) => {
    console.error(err);

    // ✅ Si el error viene por CORS, responde 403 en vez de 500
    if (String(err.message || '').toLowerCase().includes('cors')) {
        return res.status(403).json({ message: err.message });
    }

    res.status(err.status || 500).json({
        message: err.message || 'Internal Server Error',
        details: err.details || undefined,
    });
});

const PORT = process.env.PORT || 5000;

/**
 * INICIO DEL SERVIDOR
 * ✅ Primero MySQL (Sequelize).
 * ✅ Luego intentamos connectDB() (Mongo) pero si falla NO tumba el server.
 */
(async() => {
    try {
        await sequelize.authenticate();
        console.log('MySQL OK (Sequelize conectado)');
    } catch (e) {
        console.error('MySQL connection failed:', e);
        process.exit(1);
    }

    try {
        // No lo borro (por si aún lo usan en algo), pero ya NO rompe.
        await connectDB();
        console.log('Mongo connectDB OK');
    } catch (e) {
        console.warn('Mongo connectDB falló (IGNORADO):', e ? .message || e);
    }

    httpServer.listen(PORT, () => console.log(`API listening on :${PORT}`));
})();