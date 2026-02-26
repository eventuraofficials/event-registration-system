// Use SQLite instead of MySQL (no installation required!)
const Database = require('better-sqlite3');
const path = require('path');
require('dotenv').config();

// Create SQLite database file
const dbPath = path.join(__dirname, '../../../data/event_registration.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

console.log('✅ SQLite Database connected successfully');

// Wrapper to make it compatible with MySQL promise-based queries
const promisePool = {
  async query(sql, params = []) {
    try {
      // Replace ? placeholders with SQLite style if needed
      const cleanSql = sql.trim();

      // Handle SELECT queries
      if (cleanSql.toUpperCase().startsWith('SELECT')) {
        const stmt = db.prepare(cleanSql);
        const rows = params.length > 0 ? stmt.all(...params) : stmt.all();
        return [rows, null];
      }

      // Handle INSERT/UPDATE/DELETE queries
      const stmt = db.prepare(cleanSql);
      const result = params.length > 0 ? stmt.run(...params) : stmt.run();

      return [
        {
          insertId: result.lastInsertRowid,
          affectedRows: result.changes,
          changedRows: result.changes
        },
        null
      ];
    } catch (error) {
      console.error('Database query error:', error.message);
      console.error('SQL:', sql);
      console.error('Params:', params);
      throw error;
    }
  },

  async execute(sql, params = []) {
    return this.query(sql, params);
  },

  // Add promise() method for compatibility
  promise() {
    return this;
  }
};

module.exports = promisePool;
module.exports.db = db;
