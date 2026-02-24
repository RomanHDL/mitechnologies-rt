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

const { connectDB } = require('./src/config/db');

const app = express(); // ✅ primero crear app
const httpServer = http.createServer(app);

/**
 * CORS (a prueba de preflight)
 * En Railway agrega:
 * CORS_ORIGIN="http://localhost:5173,https://mitechnologies-rt.vercel.app"
 */
const corsOriginEnv = process.env.CORS_ORIGIN || '';
const allowedOrigins = corsOriginEnv ?
    corsOriginEnv.split(',').map(s => s.trim()).filter(Boolean) : [];

const corsOptions = {
    origin: function(origin, callback) {
        // Permite requests sin Origin (Postman/curl)
        if (!origin) return callback(null, true);

        // Si NO configuraste CORS_ORIGIN, permite todo (temporal)
        if (!allowedOrigins.length) return callback(null, true);

        // Si sí configuraste, solo permite los que están en la lista
        if (allowedOrigins.includes(origin)) return callback(null, true);

        // Importante: NO lanzar error duro, mejor bloquear con false
        return callback(null, false);
    },
    credentials: false, // JWT no usa cookies
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
};

// ✅ CORS primero
app.use(cors(corsOptions));
// ✅ Responder preflight
app.options('*', cors(corsOptions));

// Socket.io
const io = new Server(httpServer, {
    cors: {
        origin: allowedOrigins.length ? allowedOrigins : true,
        methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
        credentials: false,
    },
});
app.set('io', io);

// Rate limit
const limiter = rateLimit({ windowMs: 60 * 1000, max: 120 });
app.use(limiter);

// Seguridad + logs
app.use(helmet());
app.use(express.json({ limit: '2mb' }));
app.use(morgan('dev'));

// Healthcheck
app.get('/health', (req, res) =>
    res.json({ ok: true, time: new Date().toISOString() })
);

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/counts', countRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/users', usersRoutes); // ❌ solo para testing, admin maneja usuarios en /api/admin/users
app.use('/api/pallets', palletRoutes);
app.use('/api/movements', movementRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.use('/api/admin', adminRoutes);
// app.use('/api/production', productionRoutes); // ❌ desactivado

// Error handler
app.use((err, req, res, next) => {
    console.error(err);
    res.status(err.status || 500).json({
        message: err.message || 'Internal Server Error',
        details: err.details || undefined,
    });
});

const PORT = process.env.PORT || 5000;

// IMPORTANT: levantar httpServer (no app.listen) para que socket.io funcione
connectDB()
    .then(() => {
        httpServer.listen(PORT, () => console.log(`API listening on :${PORT}`));
    })
    .catch((e) => {
        console.error('DB connection failed:', e);
        process.exit(1);
    });