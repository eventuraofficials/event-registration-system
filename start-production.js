/**
 * Production Startup Script - Cloud Deployment Ready
 * Works with both .env files (local) and environment variables (Render/cloud)
 */

const fs = require('fs');
const path = require('path');

console.log('\n' + '='.repeat(70));
console.log('  EVENT REGISTRATION SYSTEM - PRODUCTION STARTUP');
console.log('='.repeat(70) + '\n');

// Load .env file if it exists (local development)
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
    console.log('📄 Loading environment from .env file');
    require('dotenv').config();
} else {
    console.log('☁️  Using cloud environment variables');
}

// Create required directories if they don't exist
const dirs = ['data', 'uploads', 'logs', 'backups'];
dirs.forEach(dir => {
    const dirPath = path.join(__dirname, dir);
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        console.log(`✅ Created directory: ${dir}`);
    }
});

// Check critical environment variables
const requiredEnvVars = ['JWT_SECRET'];
const missingEnvVars = requiredEnvVars.filter(v => !process.env[v]);

if (missingEnvVars.length > 0) {
    console.error(`\n❌ FATAL: Missing required environment variables: ${missingEnvVars.join(', ')}`);
    console.error('Please set these in your Render dashboard or .env file\n');
    process.exit(1);
}

// Set APP_URL dynamically for production (Render, Railway, etc.)
if (process.env.NODE_ENV === 'production' && !process.env.APP_URL) {
    const port = process.env.PORT || 10000;
    // Try to detect cloud platform
    if (process.env.RENDER) {
        process.env.APP_URL = `https://${process.env.RENDER_EXTERNAL_HOSTNAME}`;
    } else if (process.env.RAILWAY_STATIC_URL) {
        process.env.APP_URL = process.env.RAILWAY_STATIC_URL;
    } else {
        process.env.APP_URL = `http://localhost:${port}`;
    }
    console.log(`🌐 Auto-detected APP_URL: ${process.env.APP_URL}`);
}

// Initialize database if it doesn't exist
const dbPath = path.join(__dirname, 'data', 'event_registration.db');
if (!fs.existsSync(dbPath)) {
    console.log('📦 Initializing database...');
    try {
        require('./backend/config/init-sqlite');
        console.log('✅ Database initialized');
    } catch (error) {
        console.log('⚠️  Database will be initialized on first request');
    }
}

// Display configuration (without exposing secrets)
console.log('\n📋 Configuration:');
console.log(`   PORT: ${process.env.PORT || 5000}`);
console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
console.log(`   APP_URL: ${process.env.APP_URL || 'http://localhost:5000'}`);
console.log(`   JWT_SECRET: ${'*'.repeat(32)} (configured)`);

console.log('\n' + '='.repeat(70));
console.log('✅ Pre-checks complete. Starting server...');
console.log('='.repeat(70) + '\n');

// Start the server
try {
    require('./backend/server.js');
} catch (error) {
    console.error('\n❌ SERVER STARTUP FAILED:', error.message);
    console.error(error.stack);
    process.exit(1);
}
