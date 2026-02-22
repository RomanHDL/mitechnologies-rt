require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const { connectDB } = require('./src/config/db');

const authRoutes = require('./src/routes/auth.routes');
const productRoutes = require('./src/routes/product.routes');
const orderRoutes = require('./src/routes/order.routes');
const countRoutes = require('./src/routes/count.routes');
const reportRoutes = require('./src/routes/report.routes');
const aiRoutes = require('./src/routes/ai.routes');
const locationRoutes = require('./src/routes/location.routes');
const palletRoutes = require('./src/routes/pallet.routes');
const movementRoutes = require('./src/routes/movement.routes');
const dashboardRoutes = require('./src/routes/dashboard.routes');
const productionRoutes = require('./src/routes/production.routes');

const app = express();
const httpServer = http.createServer(app);

/**
 * CORS (sin optional chaining)
 * CORS_ORIGIN puede ser: "http://localhost:5173,https://tusitio.com"
 */
const corsOriginEnv = process.env.CORS_ORIGIN || '';
const allowedOrigins = corsOriginEnv
  ? corsOriginEnv.split(',').map(s => s.trim()).filter(Boolean)
  : [];

// Express CORS: si no hay lista, permite todo (para desarrollo)
app.use(cors({
  origin: allowedOrigins.length ? allowedOrigins : '*',
  credentials: true,
}));

// Socket.IO (usa la misma lógica)
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins.length ? allowedOrigins : '*',
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
    credentials: true,
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
app.use('/api/ai', aiRoutes);
app.use('/api/pallets', palletRoutes);
app.use('/api/movements', movementRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/production', productionRoutes);

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