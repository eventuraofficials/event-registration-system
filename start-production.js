/**
 * Production Startup Script
 * Performs pre-flight checks and starts the server safely
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('\n' + '='.repeat(70));
console.log('  EVENT REGISTRATION SYSTEM - PRODUCTION STARTUP');
console.log('='.repeat(70) + '\n');

// Pre-flight checks
const checks = [];

function check(name, fn) {
    try {
        const result = fn();
        if (result) {
            console.log(`✅ ${name}`);
            checks.push({ name, passed: true });
        } else {
            console.log(`❌ ${name}`);
            checks.push({ name, passed: false });
        }
    } catch (error) {
        console.log(`❌ ${name}: ${error.message}`);
        checks.push({ name, passed: false, error: error.message });
    }
}

console.log('🔍 Running pre-flight checks...\n');

// Check 1: Node.js version
check('Node.js version (v14+)', () => {
    const version = process.version;
    const major = parseInt(version.slice(1).split('.')[0]);
    return major >= 14;
});

// Check 2: Required directories
check('Required directories exist', () => {
    const dirs = ['data', 'uploads', 'logs', 'backups', 'public', 'backend'];
    return dirs.every(dir => fs.existsSync(path.join(__dirname, dir)));
});

// Check 3: Database file
check('Database file exists', () => {
    return fs.existsSync(path.join(__dirname, 'data', 'event_registration.db'));
});

// Check 4: Environment file
check('Environment configuration (.env)', () => {
    return fs.existsSync(path.join(__dirname, '.env'));
});

// Check 5: Required dependencies
check('Node modules installed', () => {
    return fs.existsSync(path.join(__dirname, 'node_modules'));
});

// Check 6: JWT Secret configured (SECURITY: Must be 32+ characters)
check('JWT Secret configured', () => {
    require('dotenv').config();
    if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET is not set in .env file');
    }
    if (process.env.JWT_SECRET.length < 32) {
        throw new Error(`JWT_SECRET must be at least 32 characters (current: ${process.env.JWT_SECRET.length})`);
    }
    return true;
});

// Check 7: Port configuration
check('PORT configured', () => {
    require('dotenv').config();
    return process.env.PORT && !isNaN(parseInt(process.env.PORT));
});

// Check 8: Critical files exist
check('Critical backend files', () => {
    const files = [
        'backend/server.js',
        'backend/config/database.js',
        'backend/controllers/adminController.js',
        'backend/controllers/eventController.js',
        'backend/controllers/guestController.js'
    ];
    return files.every(file => fs.existsSync(path.join(__dirname, file)));
});

// Check 9: Critical frontend files
check('Critical frontend files', () => {
    const files = [
        'public/index.html',
        'public/admin.html',
        'public/checkin.html',
        'public/js/config.js',
        'public/js/admin.js'
    ];
    return files.every(file => fs.existsSync(path.join(__dirname, file)));
});

console.log('\n' + '='.repeat(70));

// Evaluate results
const failed = checks.filter(c => !c.passed);

if (failed.length > 0) {
    console.log('\n❌ PRE-FLIGHT CHECKS FAILED\n');
    console.log('The following checks failed:');
    failed.forEach(f => {
        console.log(`  - ${f.name}${f.error ? ': ' + f.error : ''}`);
    });
    console.log('\nPlease fix these issues before starting the server.\n');
    process.exit(1);
}

console.log('\n✅ ALL PRE-FLIGHT CHECKS PASSED\n');
console.log('Starting server...\n');
console.log('='.repeat(70) + '\n');

// Start the server
try {
    require('./backend/server.js');
} catch (error) {
    console.error('\n❌ SERVER STARTUP FAILED:', error.message);
    console.error(error.stack);
    process.exit(1);
}
