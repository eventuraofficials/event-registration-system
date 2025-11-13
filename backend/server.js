const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const fs = require('fs');
require('dotenv').config();

// Import backup utility
const { scheduleAutoBackup, createBackup } = require('./utils/backup');

// Import logger
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';

// Security Middleware
app.use(helmet({
  contentSecurityPolicy: false, // Allow inline scripts for QR codes
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false,
  crossOriginResourcePolicy: false
}));

// Compression Middleware (gzip)
app.use(compression());

// Rate Limiting - Prevent brute force attacks
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to API routes
app.use('/api/', limiter);

// Stricter rate limit for login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 login attempts
  message: 'Too many login attempts, please try again later.',
  skipSuccessfulRequests: true
});

// CORS Configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));

// Body Parser Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware (production only)
if (process.env.NODE_ENV === 'production') {
  app.use(logger.requestLogger());
}

// Static files - Serve public folder with no-cache for JS files
// Use process.cwd() for deployment compatibility
const publicPath = path.join(process.cwd(), 'public');
const uploadsPath = path.join(process.cwd(), 'uploads');

console.log('📁 Serving static files from:', publicPath);
console.log('📁 Serving uploads from:', uploadsPath);

app.use(express.static(publicPath, {
  setHeaders: (res, filePath) => {
    // Disable caching for JavaScript, HTML, AND CSS files to ensure updates are loaded
    if (filePath.endsWith('.js') || filePath.endsWith('.html') || filePath.endsWith('.css')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('Last-Modified', new Date().toUTCString());
      res.setHeader('ETag', `"${Date.now()}"`); // Force revalidation
    }
  }
}));
app.use('/uploads', express.static(uploadsPath));

// Import routes
const adminRoutes = require('./routes/adminRoutes');
const eventRoutes = require('./routes/eventRoutes');
const guestRoutes = require('./routes/guestRoutes');

// API Routes
app.use('/api/admin', adminRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/guests', guestRoutes);

// Export loginLimiter for use in routes
app.set('loginLimiter', loginLimiter);

// Root route - redirect to admin login page
app.get('/', (req, res) => {
  res.redirect('/admin.html');
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Event Registration System API is running',
    timestamp: new Date().toISOString()
  });
});

// System diagnostics endpoint (detailed health check)
app.get('/api/diagnostics', async (req, res) => {
  try {
    const db = require('./config/database');

    // Check database tables
    const tables = db.db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();

    // Count records in each table (SECURITY: Whitelist valid table names)
    const VALID_TABLES = ['events', 'guests', 'admin_users'];
    const counts = {};
    for (const table of tables) {
      if (table.name !== 'sqlite_sequence' && VALID_TABLES.includes(table.name)) {
        try {
          const result = db.db.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).get();
          counts[table.name] = result.count;
        } catch (e) {
          counts[table.name] = 'Error: ' + e.message;
        }
      }
    }

    res.json({
      success: true,
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        uptime: Math.floor(process.uptime()) + ' seconds',
        memory: {
          used: Math.floor(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
          total: Math.floor(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB'
        }
      },
      database: {
        tables: tables.map(t => t.name),
        recordCounts: counts
      },
      environment: {
        nodeEnv: process.env.NODE_ENV || 'development',
        port: PORT,
        host: HOST
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Diagnostics error',
      error: error.message
    });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error handler
app.use((err, req, res, next) => {
  // Log error
  logger.error('Server error', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip
  });

  // Don't expose error details in production
  const message = process.env.NODE_ENV === 'production'
    ? 'Internal server error'
    : err.message;

  res.status(err.status || 500).json({
    success: false,
    message: message
  });
});

// Graceful shutdown handler
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\nSIGINT received, closing server gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

// Start server
const server = app.listen(PORT, HOST, () => {
  const env = process.env.NODE_ENV || 'development';
  const isProduction = env === 'production';

  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║         Event Registration System - Server Started           ║
╠═══════════════════════════════════════════════════════════════╣
║  Status: ${isProduction ? '🟢 PRODUCTION' : '🟡 DEVELOPMENT'}                                       ║
║  Port: ${PORT}                                                    ║
║  Host: ${HOST}                                             ║
║  Security: ✅ Helmet, Rate Limiting, Compression          ║
║                                                               ║
║  📱 Access URLs:                                              ║
║  Admin:    http://localhost:${PORT}/admin.html                   ║
║  Register: http://localhost:${PORT}/index.html                   ║
║  Check-In: http://localhost:${PORT}/checkin.html                 ║
║  Health:   http://localhost:${PORT}/api/health                   ║
╚═══════════════════════════════════════════════════════════════╝
  `);

  if (!isProduction) {
    console.log('⚠️  Running in development mode. Set NODE_ENV=production for production use.\n');
  }

  // Start automatic database backups (every 24 hours)
  if (process.env.AUTO_BACKUP !== 'false') {
    const backupInterval = parseInt(process.env.BACKUP_INTERVAL_HOURS) || 24;
    scheduleAutoBackup(backupInterval);
  }
});

module.exports = app;
