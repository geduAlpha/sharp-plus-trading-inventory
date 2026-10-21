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
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

// ── Auto-seed default accounts and sample data on startup ─────────────
const autoSeed = async () => {
  try {
    await connectDB();
    const User = require('./models/User');
    const defaults = [
      { name: 'System Developer & Owner', email: 'developer@company.com', password: 'admin123', role: 'developer', phone: '0912627366' },
      { name: 'Sharp Plus Admin', email: 'admin@company.com', password: 'admin123', role: 'admin', phone: '0912627366' },
      { name: 'company Manager', email: 'manager@company.com', password: 'admin123', role: 'manager' },
      { name: 'Store Keeper', email: 'storekeeper@company.com', password: 'admin123', role: 'storekeeper' },
      { name: 'Cashier', email: 'cashier@company.com', password: 'admin123', role: 'cashier' },
    ];
    for (const u of defaults) {
      const exists = await User.findOne({ email: u.email });
      if (!exists) {
        await User.create({ ...u, isActive: true });
        console.log(`[SEED] Created ${u.role} -> ${u.email}`);
      } else {
        let changed = false;
        if (exists.isActive !== true) {
          exists.isActive = true;
          changed = true;
        }
        if (u.phone && exists.phone !== u.phone) {
          exists.phone = u.phone;
          changed = true;
        }
        if (changed) {
          await exists.save();
          console.log(`[SEED] Ensured active status & phone for ${u.email}`);
        }
      }
    }

    // Auto-init default company if none exists
    const { ensureDefaultCompany } = require('./controllers/companyController');
    if (ensureDefaultCompany) {
      await ensureDefaultCompany().catch(err => console.warn('[SEED] Company init error:', err.message));
    }

    const Supplier = require('./models/Supplier');
    const supplierCount = await Supplier.countDocuments();
    if (supplierCount === 0) {
      await Supplier.insertMany([
        { name: 'Green Valley Farms', category: 'Produce', contactPerson: 'Abel Tesfaye', phone: '+251911000111' },
        { name: 'Addis Meat Suppliers', category: 'Meat & Poultry', contactPerson: 'Sara Girma', phone: '+251911000222' },
        { name: 'Blue Nile Beverages', category: 'Beverages', contactPerson: 'Yonas Bekele', phone: '+251911000333' },
      ]);
      console.log('[SEED] Seeded sample suppliers.');
    }

    const RawMaterial = require('./models/RawMaterial');
    const materialCount = await RawMaterial.countDocuments();
    if (materialCount === 0) {
      await RawMaterial.insertMany([
        { name: 'Basmati Rice', category: 'Grains', unit: 'kg', currentStock: 120, reorderLevel: 30, unitCost: 85 },
        { name: 'Chicken Breast', category: 'Meat & Poultry', unit: 'kg', currentStock: 18, reorderLevel: 20, unitCost: 320 },
        { name: 'Cooking Oil', category: 'Pantry', unit: 'ltr', currentStock: 40, reorderLevel: 15, unitCost: 210 },
        { name: 'Fresh Tomatoes', category: 'Produce', unit: 'kg', currentStock: 8, reorderLevel: 15, unitCost: 45 },
        { name: 'Bottled Water 500ml', category: 'Beverages', unit: 'pcs', currentStock: 300, reorderLevel: 100, unitCost: 8 },
        { name: 'Bath Towels', category: 'Housekeeping', unit: 'pcs', currentStock: 5, reorderLevel: 20, unitCost: 150 },
      ]);
      console.log('[SEED] Seeded sample Items.');
    }

    const Customer = require('./models/Customer');
    const customerCount = await Customer.countDocuments();
    if (customerCount === 0) {
      await Customer.insertMany([
        { name: 'Addis International Hotel', phone: '+251911223344', address: 'Bole, Addis Ababa', customerType: 'corporate', creditLimit: 100000 },
        { name: 'Sheger Cafe & Business', phone: '+251922334455', address: 'Piassa, Addis Ababa', customerType: 'credit', creditLimit: 50000 },
        { name: 'Walelgn Mart & Grocery', phone: '+251933445566', address: 'Merkato, Addis Ababa', customerType: 'regular', creditLimit: 25000 },
      ]);
      console.log('[SEED] Seeded sample customers.');
    }
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
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
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
app.use('/api/ai', require('./routes/aiRoutes'));

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
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT} (0.0.0.0)`);

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
