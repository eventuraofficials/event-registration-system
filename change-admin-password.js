/**
 * 🔒 CHANGE DEFAULT ADMIN PASSWORD
 *
 * Security script to change the default admin password
 * Run: node change-admin-password.js
 */

const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');
const readline = require('readline');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function changeAdminPassword() {
  log('\n╔══════════════════════════════════════════════════════════╗', 'blue');
  log('║  🔒 CHANGE DEFAULT ADMIN PASSWORD                       ║', 'blue');
  log('╚══════════════════════════════════════════════════════════╝\n', 'blue');

  try {
    const dbPath = path.join(__dirname, 'data', 'event_registration.db');
    const db = new Database(dbPath);

    // Check if default admin exists
    const admin = db.prepare('SELECT * FROM admin_users WHERE username = ?').get('admin');

    if (!admin) {
      log('❌ Default admin account not found!', 'red');
      db.close();
      rl.close();
      return;
    }

    log('ℹ️  Current admin account found: admin', 'blue');
    log('⚠️  For security, you should change the default password\n', 'yellow');

    // Get new password
    const newPassword = await question('Enter new password (min 8 characters): ');

    if (!newPassword || newPassword.length < 8) {
      log('\n❌ Password must be at least 8 characters!', 'red');
      db.close();
      rl.close();
      return;
    }

    const confirmPassword = await question('Confirm new password: ');

    if (newPassword !== confirmPassword) {
      log('\n❌ Passwords do not match!', 'red');
      db.close();
      rl.close();
      return;
    }

    // Hash the new password
    log('\n🔄 Hashing password...', 'blue');
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update the password
    const result = db.prepare('UPDATE admin_users SET password = ? WHERE username = ?')
      .run(hashedPassword, 'admin');

    if (result.changes > 0) {
      log('✅ Password changed successfully!', 'green');
      log('\n📝 New credentials:', 'blue');
      log('   Username: admin', 'green');
      log('   Password: [hidden for security]', 'green');
      log('\n⚠️  Keep your new password safe and secure!\n', 'yellow');
    } else {
      log('\n❌ Failed to update password!', 'red');
    }

    db.close();
  } catch (error) {
    log(`\n❌ Error: ${error.message}`, 'red');
  }

  rl.close();
}

// Run the script
changeAdminPassword();
