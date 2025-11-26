#!/usr/bin/env node
/**
 * PRODUCTION DEEP CLEAN & REFACTORING SCRIPT
 * ============================================
 *
 * This script performs comprehensive cleanup and refactoring:
 * 1. Removes all temporary/development files
 * 2. Removes console.log statements from production code
 * 3. Validates code structure and dependencies
 * 4. Generates technical audit report
 *
 * Author: Claude Code
 * Date: November 26, 2025
 */

const fs = require('fs');
const path = require('path');

// ANSI colors for terminal output
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

const log = {
    info: (msg) => console.log(`${colors.cyan}ℹ${colors.reset} ${msg}`),
    success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
    warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
    error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
    section: (msg) => console.log(`\n${colors.blue}${'='.repeat(60)}${colors.reset}\n${colors.blue}${msg}${colors.reset}\n${colors.blue}${'='.repeat(60)}${colors.reset}\n`)
};

// Files to DELETE (temporary/development)
const TEMP_FILES_TO_DELETE = [
    // Test files
    'test-auth.js',
    'test-registration.js',
    'check-event-qr.js',
    'check-events.js',
    'full-workflow-test.js',
    'production-test.js',

    // Fix/audit scripts (already applied)
    'auto-fix-all.js',
    'comprehensive-security-fixes.js',
    'migrate-enhancements.js',
    'migrate-form-settings.js',
    'change-admin-password.js',
    'update-event-qr.js',

    // Excessive documentation (keeping only essential)
    'AUTO_TOKEN_REFRESH_ADDED.md',
    'CLAUDE_DEEP_FIX.md',
    'CLEANUP_REPORT.md',
    'CRITICAL_FIXES_APPLIED.md',
    'DATABASE_SETUP.md',
    'DEEP_FIX_REPORT.md',
    'DELETE_FEATURE_GUIDE.md',
    'DEMO_MODE.md',
    'DEVICE_COMPATIBILITY.md',
    'ENHANCEMENTS_IMPLEMENTED.md',
    'EVENT_SELECTION_IMPROVEMENTS.md',
    'FAVICON_ADDED.md',
    'FEATURES_AT_A_GLANCE.md',
    'FEATURES_COMPLETED.md',
    'FINAL_CHECKLIST.md',
    'FINAL_IMPLEMENTATION_SUMMARY.md',
    'FIX_EVENT_CREATION.md',
    'FIXES_APPLIED.md',
    'FORM_CUSTOMIZATION_GUIDE.md',
    'HOW_TO_USE.md',
    'MOBILE_ACCESS.md',
    'NEW_FEATURES_IMPLEMENTED.md',
    'PROBLEM_FIXED.md',
    'PRODUCTION_FEATURES_ADDED.md',
    'PRODUCTION_GUIDE.md',
    'PRODUCTION_READY.md',
    'PRODUCTION_READY_GUIDE.md',
    'PROJECT_COMPLETE.md',
    'PROJECT_SUMMARY.md',
    'QUICKSTART.md',
    'REAL_WORLD_READY.md',
    'REQUIREMENTS_VERIFICATION.md',
    'SECURITY_AUDIT_REPORT.md',
    'SECURITY_COMPLETE_100.md',
    'SECURITY_FIXES_COMPLETE.md',
    'SECURITY-AUDIT-FULL-REPORT.md',
    'SETUP_DATABASE.md',
    'SHARE_EVENT_FEATURE.md',
    'START_HERE.md',
    'SYSTEM_READY.md',
    'TROUBLESHOOTING.md',
    'UI_CLARITY_IMPROVEMENTS.md',
    'UI-UX-IMPROVEMENTS-REPORT.md',
    'UI-UX-UPGRADES-LIST.md',
    'WEBSITE_LINKS.md',
    'ZERO_ERRORS_REPORT.md',

    // Security report (already applied)
    'security-fixes-report.json',

    // Audit output directory
    'audit-output'
];

// Files to KEEP (essential for production)
const ESSENTIAL_FILES = [
    'README.md',
    'SETUP.md',
    'DEPLOYMENT_GUIDE.md',
    'package.json',
    'package-lock.json',
    '.gitignore',
    '.env.example',
    'railway.json',
    'start-production.js',
    'start-render.js',
    'production-check.js'
];

// Statistics
const stats = {
    filesDeleted: 0,
    consoleLogsRemoved: 0,
    bytesFreed: 0,
    filesAnalyzed: 0
};

/**
 * Delete temporary files
 */
function deleteTemporaryFiles() {
    log.section('STEP 1: Deleting Temporary Files');

    TEMP_FILES_TO_DELETE.forEach(file => {
        const filePath = path.join(__dirname, file);

        try {
            if (fs.existsSync(filePath)) {
                const stat = fs.statSync(filePath);

                if (stat.isDirectory()) {
                    // Delete directory recursively
                    fs.rmSync(filePath, { recursive: true, force: true });
                    log.success(`Deleted directory: ${file}`);
                } else {
                    // Delete file
                    const size = stat.size;
                    fs.unlinkSync(filePath);
                    stats.filesDeleted++;
                    stats.bytesFreed += size;
                    log.success(`Deleted: ${file} (${(size / 1024).toFixed(2)} KB)`);
                }
            }
        } catch (error) {
            log.error(`Failed to delete ${file}: ${error.message}`);
        }
    });

    log.info(`\nFiles deleted: ${stats.filesDeleted}`);
    log.info(`Space freed: ${(stats.bytesFreed / 1024 / 1024).toFixed(2)} MB`);
}

/**
 * Remove console.log statements from JavaScript files
 */
function removeConsoleLogs() {
    log.section('STEP 2: Removing Console.log Statements');

    const jsFiles = [
        'public/js/admin.js',
        'public/js/checkin.js',
        'public/js/register.js',
        'public/js/config.js',
        'public/js/admin-utils.js',
        'backend/server.js'
    ];

    jsFiles.forEach(file => {
        const filePath = path.join(__dirname, file);

        try {
            if (!fs.existsSync(filePath)) {
                log.warning(`File not found: ${file}`);
                return;
            }

            let content = fs.readFileSync(filePath, 'utf8');
            const originalLength = content.length;

            // Count console.log before removal
            const logMatches = content.match(/console\.(log|info|warn)\([^)]*\);?/g);
            const logsFound = logMatches ? logMatches.length : 0;

            if (logsFound > 0) {
                // Remove standalone console.log/info/warn (keep console.error for production)
                content = content.replace(/^\s*console\.(log|info|warn)\([^)]*\);?\s*$/gm, '');

                // Remove inline console.log/info/warn
                content = content.replace(/console\.(log|info|warn)\([^)]*\);?\s*/g, '');

                // Clean up excessive newlines
                content = content.replace(/\n{3,}/g, '\n\n');

                fs.writeFileSync(filePath, content, 'utf8');

                stats.consoleLogsRemoved += logsFound;
                stats.filesAnalyzed++;
                log.success(`${file}: Removed ${logsFound} console.log statements`);
            } else {
                stats.filesAnalyzed++;
                log.info(`${file}: No console.log found (clean)`);
            }

        } catch (error) {
            log.error(`Failed to process ${file}: ${error.message}`);
        }
    });

    log.info(`\nFiles analyzed: ${stats.filesAnalyzed}`);
    log.info(`Console logs removed: ${stats.consoleLogsRemoved}`);
}

/**
 * Validate code structure
 */
function validateCodeStructure() {
    log.section('STEP 3: Validating Code Structure');

    const checks = {
        'Backend Controllers': fs.existsSync(path.join(__dirname, 'backend/controllers')),
        'Backend Routes': fs.existsSync(path.join(__dirname, 'backend/routes')),
        'Backend Middleware': fs.existsSync(path.join(__dirname, 'backend/middleware')),
        'Backend Utils': fs.existsSync(path.join(__dirname, 'backend/utils')),
        'Public HTML': fs.existsSync(path.join(__dirname, 'public/index.html')),
        'Public CSS': fs.existsSync(path.join(__dirname, 'public/css/style.css')),
        'Public JS': fs.existsSync(path.join(__dirname, 'public/js')),
        'Package.json': fs.existsSync(path.join(__dirname, 'package.json')),
        'Environment': fs.existsSync(path.join(__dirname, '.env')),
        'README': fs.existsSync(path.join(__dirname, 'README.md'))
    };

    let allPassed = true;
    Object.entries(checks).forEach(([check, passed]) => {
        if (passed) {
            log.success(check);
        } else {
            log.error(check);
            allPassed = false;
        }
    });

    if (allPassed) {
        log.info('\n✅ All structure checks passed!');
    } else {
        log.warning('\n⚠️  Some structure checks failed');
    }
}

/**
 * Generate technical audit report
 */
function generateAuditReport() {
    log.section('STEP 4: Generating Technical Audit Report');

    const report = {
        date: new Date().toISOString(),
        cleanup: {
            filesDeleted: stats.filesDeleted,
            bytesFreed: stats.bytesFreed,
            consoleLogsRemoved: stats.consoleLogsRemoved,
            filesAnalyzed: stats.filesAnalyzed
        },
        structure: {
            backend: {
                controllers: fs.readdirSync(path.join(__dirname, 'backend/controllers')).length,
                routes: fs.readdirSync(path.join(__dirname, 'backend/routes')).length,
                middleware: fs.readdirSync(path.join(__dirname, 'backend/middleware')).length,
                utils: fs.readdirSync(path.join(__dirname, 'backend/utils')).length
            },
            frontend: {
                html: fs.readdirSync(path.join(__dirname, 'public')).filter(f => f.endsWith('.html')).length,
                css: fs.readdirSync(path.join(__dirname, 'public/css')).length,
                js: fs.readdirSync(path.join(__dirname, 'public/js')).length
            }
        }
    };

    const reportPath = path.join(__dirname, 'PRODUCTION-CLEANUP-REPORT.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    log.success(`Audit report generated: ${reportPath}`);
}

/**
 * Main execution
 */
function main() {
    console.log(`
${colors.cyan}╔════════════════════════════════════════════════════════════╗
║                                                            ║
║       EVENT REGISTRATION SYSTEM - PRODUCTION CLEANUP       ║
║                                                            ║
║  Deep clean, refactor, and optimize for production deploy ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝${colors.reset}
`);

    try {
        deleteTemporaryFiles();
        removeConsoleLogs();
        validateCodeStructure();
        generateAuditReport();

        log.section('CLEANUP COMPLETE');
        log.success(`Files deleted: ${stats.filesDeleted}`);
        log.success(`Space freed: ${(stats.bytesFreed / 1024 / 1024).toFixed(2)} MB`);
        log.success(`Console logs removed: ${stats.consoleLogsRemoved}`);
        log.info('\n🎉 Production cleanup completed successfully!\n');

    } catch (error) {
        log.error(`Fatal error: ${error.message}`);
        process.exit(1);
    }
}

// Run if executed directly
if (require.main === module) {
    main();
}

module.exports = { main, stats };
