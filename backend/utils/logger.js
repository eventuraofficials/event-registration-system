const fs = require('fs');
const path = require('path');

/**
 * Simple logging utility for production use
 */

const LOG_DIR = path.join(__dirname, '../../logs');
const LOG_FILE = path.join(LOG_DIR, 'app.log');
const ERROR_LOG_FILE = path.join(LOG_DIR, 'error.log');
const ACCESS_LOG_FILE = path.join(LOG_DIR, 'access.log');

// Ensure logs directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

const LOG_LEVELS = {
  ERROR: 'ERROR',
  WARN: 'WARN',
  INFO: 'INFO',
  DEBUG: 'DEBUG'
};

/**
 * Format log message with timestamp and level
 */
function formatLog(level, message, meta = {}) {
  const timestamp = new Date().toISOString();
  const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
  return `[${timestamp}] [${level}] ${message}${metaStr}\n`;
}

/**
 * Write log to file
 */
function writeLog(file, content) {
  try {
    fs.appendFileSync(file, content, 'utf8');
  } catch (error) {
    console.error('Failed to write log:', error.message);
  }
}

/**
 * Log error message
 */
function error(message, meta = {}) {
  const log = formatLog(LOG_LEVELS.ERROR, message, meta);
  console.error(`❌ ${message}`, meta);
  writeLog(ERROR_LOG_FILE, log);
  writeLog(LOG_FILE, log);
}

/**
 * Log warning message
 */
function warn(message, meta = {}) {
  const log = formatLog(LOG_LEVELS.WARN, message, meta);
  console.warn(`⚠️  ${message}`, meta);
  writeLog(LOG_FILE, log);
}

/**
 * Log info message
 */
function info(message, meta = {}) {
  const log = formatLog(LOG_LEVELS.INFO, message, meta);
  console.log(`ℹ️  ${message}`, meta);
  writeLog(LOG_FILE, log);
}

/**
 * Log debug message (only in development)
 */
function debug(message, meta = {}) {
  if (process.env.NODE_ENV !== 'production') {
    const log = formatLog(LOG_LEVELS.DEBUG, message, meta);
    console.log(`🔍 ${message}`, meta);
    writeLog(LOG_FILE, log);
  }
}

/**
 * Log access/request
 */
function access(req, res, responseTime) {
  const log = formatLog('ACCESS', `${req.method} ${req.path}`, {
    ip: req.ip || req.connection.remoteAddress,
    status: res.statusCode,
    responseTime: `${responseTime}ms`,
    userAgent: req.get('user-agent')
  });
  writeLog(ACCESS_LOG_FILE, log);
}

/**
 * Clean old logs (keep last 30 days)
 */
function cleanOldLogs(daysToKeep = 30) {
  const files = [LOG_FILE, ERROR_LOG_FILE, ACCESS_LOG_FILE];

  files.forEach(file => {
    if (fs.existsSync(file)) {
      const stats = fs.statSync(file);
      const fileAge = Date.now() - stats.mtime.getTime();
      const daysOld = fileAge / (1000 * 60 * 60 * 24);

      if (daysOld > daysToKeep) {
        // Archive old log
        const archiveName = `${file}.${new Date().toISOString().split('T')[0]}.old`;
        fs.renameSync(file, archiveName);
        info(`Log file archived: ${path.basename(archiveName)}`);
      }
    }
  });
}

/**
 * Express middleware for request logging
 */
function requestLogger() {
  return (req, res, next) => {
    const start = Date.now();

    // Log after response is sent
    res.on('finish', () => {
      const duration = Date.now() - start;
      access(req, res, duration);
    });

    next();
  };
}

module.exports = {
  error,
  warn,
  info,
  debug,
  access,
  cleanOldLogs,
  requestLogger,
  LOG_LEVELS
};
