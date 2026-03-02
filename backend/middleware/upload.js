const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directory exists
const uploadDir = process.env.UPLOAD_PATH || './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}


/**
 * Sanitize filename to prevent directory traversal and malicious filenames
 */
function sanitizeFilename(filename) {
  // Remove path separators and null bytes
  let safe = filename.replace(/[\/\0]/g, '');

  // Remove leading dots (hidden files)
  safe = safe.replace(/^\.+/, '');

  // Replace special characters with underscore
  safe = safe.replace(/[^a-zA-Z0-9._-]/g, '_');

  // Limit length
  if (safe.length > 100) {
    const ext = path.extname(safe);
    safe = safe.substring(0, 100 - ext.length) + ext;
  }

  return safe || 'upload';
}

// Configure storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const sanitizedName = sanitizeFilename(file.originalname);
    const ext = path.extname(sanitizedName);
    cb(null, 'guest-list-' + uniqueSuffix + ext);
  }
});

// File filter - only accept Excel/CSV files (validate both extension AND MIME type)
const ALLOWED_EXTENSIONS = new Set(['.xlsx', '.xls', '.csv']);
const ALLOWED_MIMETYPES = new Set([
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-excel',       // .xls
  'text/csv',                       // .csv
  'application/csv',
  'text/plain',                     // some OS/browsers report CSV as text/plain
  'application/octet-stream',       // generic binary — still gated by extension below
]);

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();

  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return cb(new Error('Only Excel (.xlsx, .xls) and CSV files are allowed'), false);
  }

  if (!ALLOWED_MIMETYPES.has(file.mimetype)) {
    return cb(new Error('File type not permitted'), false);
  }

  cb(null, true);
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024 // 5MB default
  }
});

// ── Event Logo Upload ────────────────────────────────────────────────────────

const logoDir = path.join(uploadDir, 'event-logos');
if (!fs.existsSync(logoDir)) {
  fs.mkdirSync(logoDir, { recursive: true });
}

const logoStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, logoDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(sanitizeFilename(file.originalname)).toLowerCase() || '.jpg';
    cb(null, 'event-logo-' + uniqueSuffix + ext);
  }
});

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp']);
const IMAGE_MIMETYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);

const imageFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!IMAGE_EXTENSIONS.has(ext) || !IMAGE_MIMETYPES.has(file.mimetype)) {
    return cb(new Error('Only image files (JPG, PNG, GIF, WebP) are allowed'), false);
  }
  cb(null, true);
};

const imageUpload = multer({
  storage: logoStorage,
  fileFilter: imageFilter,
  limits: { fileSize: 2 * 1024 * 1024 } // 2 MB
});

module.exports = { upload, imageUpload };
