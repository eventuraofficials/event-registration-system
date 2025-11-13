/**
 * Render.com Production Startup Script
 * Simplified for cloud deployment
 */

const fs = require('fs');
const path = require('path');

console.log('\n' + '='.repeat(70));
console.log('  EVENT REGISTRATION SYSTEM - RENDER DEPLOYMENT');
console.log('='.repeat(70) + '\n');

// Create required directories if they don't exist
const dirs = ['data', 'uploads', 'logs', 'backups'];
dirs.forEach(dir => {
    const dirPath = path.join(__dirname, dir);
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        console.log(`✅ Created directory: ${dir}`);
    }
});

// Initialize database if it doesn't exist
const dbPath = path.join(__dirname, 'data', 'event_registration.db');
if (!fs.existsSync(dbPath)) {
    console.log('📦 Initializing database...');
    try {
        require('./backend/config/init-sqlite');
        console.log('✅ Database initialized');
    } catch (error) {
        console.log('⚠️  Database initialization will happen on first request');
    }
}

// Check environment variables
const requiredEnvVars = ['JWT_SECRET', 'PORT'];
const missingEnvVars = requiredEnvVars.filter(v => !process.env[v]);

if (missingEnvVars.length > 0) {
    console.log(`⚠️  Warning: Missing environment variables: ${missingEnvVars.join(', ')}`);
}

console.log('\n' + '='.repeat(70));
console.log('✅ Pre-checks complete. Starting server...');
console.log('='.repeat(70) + '\n');

// Start the server
require('./backend/server');
