const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Validate critical environment variables
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error('❌ CRITICAL: JWT_SECRET must be set and at least 32 characters long');
  console.error('Please set a strong JWT_SECRET in your .env file');
  process.exit(1);
}

if (process.env.JWT_SECRET === 'your-secret-key-change-this-in-production') {

}

// Import backup utility
const { scheduleAutoBackup } = require('./utils/backup');

// Import logger
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';

// Security Middleware
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: false,
    directives: {
      "default-src": ["'self'"],
      "script-src": ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdnjs.cloudflare.com", "https://unpkg.com"],
      "style-src": ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com"],
      "font-src": ["'self'", "https://cdnjs.cloudflare.com", "https://fonts.gstatic.com"],
      "img-src": ["'self'", "data:", "blob:", "https:"],
      "media-src": ["'self'", "data:", "blob:"],
      "connect-src": ["'self'"],
      "base-uri": ["'self'"],
      "form-action": ["'self'"],
      "frame-ancestors": ["'none'"],
      "object-src": ["'none'"]
      // Note: upgrade-insecure-requests removed for local HTTP development
      // Add back in production with HTTPS
    }
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
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

// Rate limit for guest registration (prevent spam)
const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 registrations per IP per hour
  message: 'Too many registrations from this IP, please try again later.'
});

// CORS Configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body Parser Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware (production only)
if (process.env.NODE_ENV === 'production') {
  app.use(logger.requestLogger());
}

// Root route - redirect to admin login page (MUST be before static middleware)
app.get('/', (req, res) => {
  res.redirect('/pages/admin.html');
});

// Static files - Serve public folder with no-cache for JS files
// Use process.cwd() for deployment compatibility
const publicPath = path.join(process.cwd(), 'public');
const uploadsPath = path.join(process.cwd(), 'uploads');

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
const adminRoutes = require('./api/routes/adminRoutes');
const eventRoutes = require('./api/routes/eventRoutes');
const guestRoutes = require('./api/routes/guestRoutes');

// API Routes
app.use('/api/admin', adminRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/guests/register', registrationLimiter);
app.use('/api/guests', guestRoutes);

// Export loginLimiter for use in routes
app.set('loginLimiter', loginLimiter);

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
    const db = require('./db/config/database');

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

  server.close(() => {

    process.exit(0);
  });
});

process.on('SIGINT', () => {

  server.close(() => {

    process.exit(0);
  });
});

// Start server
const server = app.listen(PORT, HOST, () => {
  const env = process.env.NODE_ENV || 'development';
  const isProduction = env === 'production';

  if (!isProduction) {

  }

  // Start automatic database backups (every 24 hours)
  if (process.env.AUTO_BACKUP !== 'false') {
    const backupInterval = parseInt(process.env.BACKUP_INTERVAL_HOURS) || 24;
    scheduleAutoBackup(backupInterval);
  }
});

module.exports = app;
