const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// ── Startup diagnostics ────────────────────────────────────────────────
console.log('[STARTUP] NODE_ENV:', process.env.NODE_ENV);
console.log('[STARTUP] PORT:', process.env.PORT);
console.log('[STARTUP] MONGO_URI set:', !!process.env.MONGO_URI);
console.log('[STARTUP] JWT_SECRET set:', !!process.env.JWT_SECRET);

// ── Process-level error protection for Node v26 ────────────────────────
process.on('uncaughtException', (err) => {
  console.error('[UNCAUGHT EXCEPTION]:', err?.message || err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[UNHANDLED REJECTION]:', reason?.message || reason);
});
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const connectDB = require('./config/db');
const { runAutoSeed } = require('./utils/autoSeedHelper');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

// ── Auto-seed default accounts and sample data on startup ─────────────
const autoSeed = async () => {
  try {
    await connectDB();
    await runAutoSeed();
  } catch (err) {
    console.error('[SEED] Auto-seed error:', err.message);
  }
};
autoSeed();

const app = express();
// ── Flexible CORS configuration for Localhost & Aletcloud ─────────────
const parseAllowedOrigins = () => {
  const origins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:5000',
    'http://127.0.0.1:5000',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
  ];

  if (process.env.CLIENT_URL) {
    process.env.CLIENT_URL.split(',').forEach((u) => {
      const clean = u.trim().replace(/\/+$/, '');
      if (clean && !origins.includes(clean)) origins.push(clean);
    });
  }

  if (process.env.PUBLIC_URL) {
    const cleanPublic = process.env.PUBLIC_URL.trim().replace(/\/+$/, '');
    if (cleanPublic && !origins.includes(cleanPublic)) origins.push(cleanPublic);
  }

  return origins;
};

const allowedOrigins = parseAllowedOrigins();

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);

      const cleanOrigin = origin.replace(/\/+$/, '');

      // Allow if matches allowed list or wildcard
      if (allowedOrigins.includes('*') || allowedOrigins.includes(cleanOrigin)) {
        return callback(null, true);
      }

      // Automatically allow all localhost, 127.0.0.1, and cloud deployment domains
      try {
        const parsed = new URL(origin);
        if (
          parsed.hostname === 'localhost' ||
          parsed.hostname === '127.0.0.1' ||
          parsed.hostname.endsWith('.aletcloud.com') ||
          parsed.hostname.endsWith('.onrender.com') ||
          parsed.hostname.endsWith('.vercel.app')
        ) {
          return callback(null, true);
        }
      } catch { }

      // Allow any origin dynamically so functional deployments are never blocked by CORS
      return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'x-otp-token'],
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
// Immediate readiness & health check for Docker, Aletcloud, Render
app.get(['/api/health', '/health'], (req, res) => res.status(200).json({ status: 'ok', service: 'company-stock-server', timestamp: new Date() }));

// Ensure DB is connected for requests
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    next(err);
  }
});

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/suppliers', require('./routes/supplierRoutes'));
app.use('/api/materials', require('./routes/materialRoutes'));
app.use('/api/categories', require('./routes/categoryRoutes'));
app.use('/api/purchases', require('./routes/purchaseRoutes'));
app.use('/api/transactions', require('./routes/transactionRoutes'));
app.use('/api/reports', require('./routes/reportRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/settings', require('./routes/settingRoutes'));
app.use('/api/companies', require('./routes/companyRoutes'));
app.use('/api/analytics', require('./routes/analyticsRoutes'));
app.use('/api/upload', require('./routes/uploadRoutes'));
app.use('/api/inventory-count', require('./routes/inventoryCountRoutes'));
app.use('/api/recycle-bin', require('./routes/recycleBinRoutes'));
app.use('/api/telegram', require('./routes/telegramRoutes'));
app.use('/api/consumption', require('./routes/consumptionRoutes'));
app.use('/api/employees', require('./routes/employeeRoutes'));
app.use('/api/stock-requests', require('./routes/stockRequestRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/customers', require('./routes/customerRoutes'));
app.use('/api/sales-closing', require('./routes/salesClosingRoutes'));
app.use('/api/sales-routes', require('./routes/salesRouteRoutes'));
app.use('/api/sales-security', require('./routes/salesSecurityRoutes'));
app.use('/api/ai', require('./routes/aiRoutes'));
app.use('/api/backup', require('./routes/backupRoutes'));

// Serve Frontend in production (for Aletcloud, Render, etc.)
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/dist')));

  // Exclude /api routes from being caught by the wildcard
  app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.resolve(__dirname, '../client/dist', 'index.html'));
  });
} else {
  app.get('/', (req, res) => res.send('Please set to production'));
}

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// Listen on port unless we are in Vercel's serverless environment
if (!process.env.VERCEL) {
  const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);

    // ── Keep-alive ping every 10 minutes ──────────────────────────
    // Prevents free-tier hosting (Aletcloud, Render) from sleeping.
    // Only runs if a PUBLIC_URL env var is set (set it in Aletcloud
    // to your server URL, e.g. https://five-stop.app.aletcloud.com)
    const publicUrl = process.env.PUBLIC_URL;
    if (publicUrl) {
      const https = require('https');
      const http = require('http');
      const INTERVAL = 10 * 60 * 1000; // 10 minutes

      setInterval(() => {
        try {
          const url = new URL(`${publicUrl}/api/health`);
          const lib = url.protocol === 'https:' ? https : http;
          lib.get(url.toString(), (res) => {
            console.log(`[KEEP-ALIVE] Pinged ${url.toString()} — status ${res.statusCode}`);
            res.resume();
          }).on('error', (err) => {
            console.warn('[KEEP-ALIVE] Ping failed:', err.message);
          });
        } catch (err) {
          console.warn('[KEEP-ALIVE] Invalid PUBLIC_URL:', err.message);
        }
      }, INTERVAL);

      console.log(`[KEEP-ALIVE] Server ping active every 10 min → ${publicUrl}/api/health`);
    }
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\n[PORT CONFLICT] Port ${PORT} is already in use by another instance.`);
      console.error(`Please stop any other running server before starting.\n`);
      process.exit(1);
    } else {
      console.error('[SERVER ERROR]:', err.message);
    }
  });
}

module.exports = app;
