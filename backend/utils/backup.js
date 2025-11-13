const fs = require('fs');
const path = require('path');

/**
 * Database Backup Utility
 * Creates timestamped backups of the SQLite database
 */

const DB_PATH = path.join(__dirname, '../../data/event_registration.db');
const BACKUP_DIR = path.join(__dirname, '../../backups');

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

/**
 * Create a database backup
 * @returns {Promise<string>} Path to backup file
 */
async function createBackup() {
  try {
    // Generate timestamp for backup filename
    const timestamp = new Date().toISOString()
      .replace(/:/g, '-')
      .replace(/\./g, '-')
      .replace('T', '_')
      .slice(0, 19);

    const backupFilename = `events_backup_${timestamp}.db`;
    const backupPath = path.join(BACKUP_DIR, backupFilename);

    // Check if source database exists
    if (!fs.existsSync(DB_PATH)) {
      throw new Error('Database file not found');
    }

    // Copy database file
    await fs.promises.copyFile(DB_PATH, backupPath);

    // Get file size
    const stats = fs.statSync(backupPath);
    const fileSizeInBytes = stats.size;
    const fileSizeInKB = (fileSizeInBytes / 1024).toFixed(2);

    console.log(`✅ Backup created: ${backupFilename} (${fileSizeInKB} KB)`);

    // Clean old backups (keep last 30)
    await cleanOldBackups(30);

    return backupPath;
  } catch (error) {
    console.error('❌ Backup failed:', error.message);
    throw error;
  }
}

/**
 * Clean old backups, keeping only the most recent N backups
 * @param {number} keepCount Number of backups to keep
 */
async function cleanOldBackups(keepCount = 30) {
  try {
    const files = await fs.promises.readdir(BACKUP_DIR);

    // Filter only backup files
    const backupFiles = files
      .filter(file => file.startsWith('events_backup_') && file.endsWith('.db'))
      .map(file => ({
        name: file,
        path: path.join(BACKUP_DIR, file),
        time: fs.statSync(path.join(BACKUP_DIR, file)).mtime.getTime()
      }))
      .sort((a, b) => b.time - a.time); // Sort by time, newest first

    // Delete old backups
    if (backupFiles.length > keepCount) {
      const filesToDelete = backupFiles.slice(keepCount);

      for (const file of filesToDelete) {
        await fs.promises.unlink(file.path);
        console.log(`🗑️  Deleted old backup: ${file.name}`);
      }
    }
  } catch (error) {
    console.error('Warning: Failed to clean old backups:', error.message);
  }
}

/**
 * Restore database from backup
 * @param {string} backupFilename Backup filename to restore
 */
async function restoreBackup(backupFilename) {
  try {
    const backupPath = path.join(BACKUP_DIR, backupFilename);

    // Check if backup exists
    if (!fs.existsSync(backupPath)) {
      throw new Error('Backup file not found');
    }

    // Create a backup of current database before restoring
    const currentBackupName = `events_backup_before_restore_${Date.now()}.db`;
    const currentBackupPath = path.join(BACKUP_DIR, currentBackupName);

    if (fs.existsSync(DB_PATH)) {
      await fs.promises.copyFile(DB_PATH, currentBackupPath);
      console.log(`📦 Current database backed up to: ${currentBackupName}`);
    }

    // Restore backup
    await fs.promises.copyFile(backupPath, DB_PATH);

    console.log(`✅ Database restored from: ${backupFilename}`);

    return DB_PATH;
  } catch (error) {
    console.error('❌ Restore failed:', error.message);
    throw error;
  }
}

/**
 * List all available backups
 * @returns {Promise<Array>} List of backup files with details
 */
async function listBackups() {
  try {
    const files = await fs.promises.readdir(BACKUP_DIR);

    const backupFiles = files
      .filter(file => file.startsWith('events_backup_') && file.endsWith('.db'))
      .map(file => {
        const filePath = path.join(BACKUP_DIR, file);
        const stats = fs.statSync(filePath);

        return {
          filename: file,
          size: `${(stats.size / 1024).toFixed(2)} KB`,
          created: stats.mtime.toISOString(),
          createdReadable: stats.mtime.toLocaleString()
        };
      })
      .sort((a, b) => new Date(b.created) - new Date(a.created));

    return backupFiles;
  } catch (error) {
    console.error('Failed to list backups:', error.message);
    return [];
  }
}

/**
 * Schedule automatic backups
 * @param {number} intervalHours Backup interval in hours
 */
function scheduleAutoBackup(intervalHours = 24) {
  const intervalMs = intervalHours * 60 * 60 * 1000;

  // Create initial backup (only if database exists)
  createBackup().catch(err => {
    console.log('ℹ️  No database to backup yet (will backup after first use)');
  });

  // Schedule recurring backups
  setInterval(() => {
    createBackup().catch(err => {
      // Silently fail if database doesn't exist yet
    });
  }, intervalMs);

  console.log(`📅 Auto-backup scheduled: every ${intervalHours} hour(s)`);
}

module.exports = {
  createBackup,
  restoreBackup,
  listBackups,
  cleanOldBackups,
  scheduleAutoBackup
};
