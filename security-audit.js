#!/usr/bin/env node
/**
 * COMPREHENSIVE SECURITY AUDIT SCRIPT
 * ====================================
 *
 * Scans Event Registration System for:
 * - SQL Injection vulnerabilities
 * - XSS vulnerabilities
 * - CSRF protection gaps
 * - Insecure file uploads
 * - Weak validation
 * - Exposed credentials
 * - Unsafe redirects
 * - Authentication/Authorization issues
 *
 * Author: Claude Code
 * Date: November 26, 2025
 */

const fs = require('fs');
const path = require('path');

// ANSI colors
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    magenta: '\x1b[35m'
};

const log = {
    critical: (msg) => console.log(`${colors.red}[CRITICAL]${colors.reset} ${msg}`),
    high: (msg) => console.log(`${colors.magenta}[HIGH]${colors.reset} ${msg}`),
    medium: (msg) => console.log(`${colors.yellow}[MEDIUM]${colors.reset} ${msg}`),
    low: (msg) => console.log(`${colors.cyan}[LOW]${colors.reset} ${msg}`),
    pass: (msg) => console.log(`${colors.green}[PASS]${colors.reset} ${msg}`),
    info: (msg) => console.log(`${colors.blue}[INFO]${colors.reset} ${msg}`)
};

// Vulnerability tracking
const vulnerabilities = {
    critical: [],
    high: [],
    medium: [],
    low: [],
    passed: []
};

/**
 * Scan for SQL Injection vulnerabilities
 */
function scanSQLInjection() {
    log.info('\n=== SQL INJECTION SCAN ===\n');

    const files = [
        'backend/controllers/adminController.js',
        'backend/controllers/eventController.js',
        'backend/controllers/guestController.js'
    ];

    files.forEach(file => {
        const filePath = path.join(__dirname, file);
        if (!fs.existsSync(filePath)) return;

        const content = fs.readFileSync(filePath, 'utf8');

        // Check for string concatenation in SQL queries
        const dangerousPatterns = [
            { pattern: /db\.query\([`'"]\s*SELECT.*\$\{/gi, desc: 'String interpolation in SELECT' },
            { pattern: /db\.query\([`'"]\s*INSERT.*\$\{/gi, desc: 'String interpolation in INSERT' },
            { pattern: /db\.query\([`'"]\s*UPDATE.*\$\{/gi, desc: 'String interpolation in UPDATE' },
            { pattern: /db\.query\([`'"]\s*DELETE.*\$\{/gi, desc: 'String interpolation in DELETE' },
            { pattern: /db\.query\([`'"].*\+\s*req\./gi, desc: 'String concatenation with req.*' },
            { pattern: /WHERE.*\$\{req\./gi, desc: 'Direct req.* in WHERE clause' }
        ];

        dangerousPatterns.forEach(({ pattern, desc }) => {
            const matches = content.match(pattern);
            if (matches) {
                vulnerabilities.high.push({
                    file,
                    type: 'SQL Injection',
                    description: desc,
                    count: matches.length,
                    severity: 'HIGH'
                });
                log.high(`${file}: ${desc} (${matches.length} instances)`);
            }
        });

        // Check for parameterized queries (good practice)
        const goodPattern = /db\.query\([^,]+,\s*\[/g;
        const goodMatches = content.match(goodPattern);
        if (goodMatches && goodMatches.length > 5) {
            vulnerabilities.passed.push({
                file,
                type: 'SQL Injection Protection',
                description: 'Uses parameterized queries',
                count: goodMatches.length
            });
            log.pass(`${file}: Uses parameterized queries (${goodMatches.length} instances)`);
        }
    });
}

/**
 * Scan for XSS vulnerabilities
 */
function scanXSS() {
    log.info('\n=== XSS VULNERABILITY SCAN ===\n');

    const frontendFiles = [
        'public/js/admin.js',
        'public/js/register.js',
        'public/js/checkin.js',
        'public/share-event.html',
        'public/admin.html',
        'public/index.html'
    ];

    frontendFiles.forEach(file => {
        const filePath = path.join(__dirname, file);
        if (!fs.existsSync(filePath)) return;

        const content = fs.readFileSync(filePath, 'utf8');

        // Dangerous patterns
        const xssPatterns = [
            { pattern: /innerHTML\s*=\s*[^;]*data\./gi, desc: 'innerHTML with unescaped data' },
            { pattern: /innerHTML\s*=\s*[^;]*\$\{/gi, desc: 'innerHTML with template literal' },
            { pattern: /\.html\([^)]*data\./gi, desc: '.html() with unescaped data' },
            { pattern: /document\.write\(/gi, desc: 'document.write() usage' },
            { pattern: /eval\(/gi, desc: 'eval() usage (DANGEROUS)' },
            { pattern: /<script>.*\$\{/gi, desc: 'Script tag with template literal' }
        ];

        xssPatterns.forEach(({ pattern, desc }) => {
            const matches = content.match(pattern);
            if (matches) {
                const severity = desc.includes('DANGEROUS') ? 'CRITICAL' : 'HIGH';
                vulnerabilities[severity.toLowerCase()].push({
                    file,
                    type: 'XSS',
                    description: desc,
                    count: matches.length,
                    severity
                });
                (severity === 'CRITICAL' ? log.critical : log.high)(
                    `${file}: ${desc} (${matches.length} instances)`
                );
            }
        });

        // Check for security utils usage (good)
        if (content.includes('SecurityUtils.escapeHtml') || content.includes('sanitize')) {
            vulnerabilities.passed.push({
                file,
                type: 'XSS Protection',
                description: 'Uses sanitization functions'
            });
            log.pass(`${file}: Uses sanitization functions`);
        }
    });
}

/**
 * Scan for CSRF protection
 */
function scanCSRF() {
    log.info('\n=== CSRF PROTECTION SCAN ===\n');

    const serverPath = path.join(__dirname, 'backend/server.js');
    if (!fs.existsSync(serverPath)) return;

    const content = fs.readFileSync(serverPath, 'utf8');

    // Check for CSRF middleware
    if (!content.includes('csrf') && !content.includes('CSRF')) {
        vulnerabilities.medium.push({
            file: 'backend/server.js',
            type: 'CSRF',
            description: 'No CSRF protection middleware detected',
            severity: 'MEDIUM',
            recommendation: 'Implement csurf middleware'
        });
        log.medium('backend/server.js: No CSRF protection detected');
    } else {
        log.pass('backend/server.js: CSRF middleware found');
    }

    // Check frontend for CSRF token usage
    const frontendFiles = ['public/js/admin.js', 'public/js/register.js'];
    frontendFiles.forEach(file => {
        const filePath = path.join(__dirname, file);
        if (!fs.existsSync(filePath)) return;

        const frontendContent = fs.readFileSync(filePath, 'utf8');
        if (!frontendContent.includes('csrf') && !frontendContent.includes('X-CSRF-Token')) {
            vulnerabilities.low.push({
                file,
                type: 'CSRF',
                description: 'No CSRF token in requests',
                severity: 'LOW'
            });
            log.low(`${file}: No CSRF token in requests`);
        }
    });
}

/**
 * Scan file upload security
 */
function scanFileUpload() {
    log.info('\n=== FILE UPLOAD SECURITY SCAN ===\n');

    const uploadPath = path.join(__dirname, 'backend/middleware/upload.js');
    if (!fs.existsSync(uploadPath)) {
        log.info('No upload middleware found');
        return;
    }

    const content = fs.readFileSync(uploadPath, 'utf8');

    // Check for file type validation
    if (!content.includes('fileFilter') && !content.includes('mimetype')) {
        vulnerabilities.high.push({
            file: 'backend/middleware/upload.js',
            type: 'File Upload',
            description: 'No file type validation',
            severity: 'HIGH'
        });
        log.high('backend/middleware/upload.js: No file type validation');
    } else {
        log.pass('backend/middleware/upload.js: File type validation present');
    }

    // Check for file size limits
    if (!content.includes('limits') && !content.includes('fileSize')) {
        vulnerabilities.medium.push({
            file: 'backend/middleware/upload.js',
            type: 'File Upload',
            description: 'No file size limits',
            severity: 'MEDIUM'
        });
        log.medium('backend/middleware/upload.js: No file size limits');
    } else {
        log.pass('backend/middleware/upload.js: File size limits present');
    }

    // Check for filename sanitization
    if (!content.includes('sanitize') && !content.includes('path.basename')) {
        vulnerabilities.medium.push({
            file: 'backend/middleware/upload.js',
            type: 'File Upload',
            description: 'No filename sanitization',
            severity: 'MEDIUM'
        });
        log.medium('backend/middleware/upload.js: No filename sanitization');
    }
}

/**
 * Scan for exposed credentials
 */
function scanCredentials() {
    log.info('\n=== EXPOSED CREDENTIALS SCAN ===\n');

    const files = fs.readdirSync(__dirname, { recursive: true })
        .filter(f => f.endsWith('.js') && !f.includes('node_modules'))
        .map(f => path.join(__dirname, f));

    const credentialPatterns = [
        { pattern: /(password|passwd|pwd)\s*=\s*['"][^'"]{1,}/gi, desc: 'Hardcoded password' },
        { pattern: /(api[_-]?key|apikey)\s*=\s*['"][^'"]{1,}/gi, desc: 'Hardcoded API key' },
        { pattern: /(secret|token)\s*=\s*['"][a-zA-Z0-9]{20,}/gi, desc: 'Hardcoded secret/token' },
        { pattern: /mongodb:\/\/[^@]*:[^@]*@/gi, desc: 'Database connection string with credentials' }
    ];

    files.slice(0, 20).forEach(file => {
        if (!fs.existsSync(file) || !fs.statSync(file).isFile()) return;

        const content = fs.readFileSync(file, 'utf8');

        credentialPatterns.forEach(({ pattern, desc }) => {
            const matches = content.match(pattern);
            if (matches) {
                // Filter out false positives
                const realMatches = matches.filter(m =>
                    !m.includes('process.env') &&
                    !m.includes('your-') &&
                    !m.includes('example') &&
                    !m.includes('test')
                );

                if (realMatches.length > 0) {
                    vulnerabilities.critical.push({
                        file: file.replace(__dirname, ''),
                        type: 'Exposed Credentials',
                        description: desc,
                        count: realMatches.length,
                        severity: 'CRITICAL'
                    });
                    log.critical(`${file.replace(__dirname, '')}: ${desc}`);
                }
            }
        });
    });

    // Check for .env file
    if (fs.existsSync(path.join(__dirname, '.env'))) {
        log.pass('.env file exists (credentials should be here)');
    } else {
        vulnerabilities.medium.push({
            file: 'root',
            type: 'Configuration',
            description: 'No .env file found',
            severity: 'MEDIUM'
        });
        log.medium('No .env file found');
    }
}

/**
 * Scan input validation
 */
function scanInputValidation() {
    log.info('\n=== INPUT VALIDATION SCAN ===\n');

    const controllers = [
        'backend/controllers/guestController.js',
        'backend/controllers/adminController.js',
        'backend/controllers/eventController.js'
    ];

    controllers.forEach(file => {
        const filePath = path.join(__dirname, file);
        if (!fs.existsSync(filePath)) return;

        const content = fs.readFileSync(filePath, 'utf8');

        // Check for validation
        if (content.includes('sanitize') || content.includes('validator')) {
            vulnerabilities.passed.push({
                file,
                type: 'Input Validation',
                description: 'Input validation/sanitization present'
            });
            log.pass(`${file}: Input validation present`);
        } else {
            vulnerabilities.medium.push({
                file,
                type: 'Input Validation',
                description: 'Limited input validation',
                severity: 'MEDIUM'
            });
            log.medium(`${file}: Limited input validation`);
        }

        // Check for email validation
        if (content.includes('email') && !content.includes('emailRegex') && !content.includes('@')) {
            vulnerabilities.low.push({
                file,
                type: 'Input Validation',
                description: 'No email format validation',
                severity: 'LOW'
            });
            log.low(`${file}: No email format validation`);
        }
    });
}

/**
 * Scan authentication & authorization
 */
function scanAuth() {
    log.info('\n=== AUTHENTICATION & AUTHORIZATION SCAN ===\n');

    const authPath = path.join(__dirname, 'backend/middleware/auth.js');
    if (!fs.existsSync(authPath)) {
        vulnerabilities.critical.push({
            file: 'backend/middleware',
            type: 'Authentication',
            description: 'No authentication middleware found',
            severity: 'CRITICAL'
        });
        log.critical('No authentication middleware found');
        return;
    }

    const content = fs.readFileSync(authPath, 'utf8');

    // Check for JWT
    if (content.includes('jwt') || content.includes('jsonwebtoken')) {
        log.pass('JWT authentication implemented');
    } else {
        vulnerabilities.high.push({
            file: 'backend/middleware/auth.js',
            type: 'Authentication',
            description: 'No JWT implementation found',
            severity: 'HIGH'
        });
        log.high('No JWT implementation found');
    }

    // Check for token expiration
    if (!content.includes('exp') && !content.includes('expiresIn')) {
        vulnerabilities.medium.push({
            file: 'backend/middleware/auth.js',
            type: 'Authentication',
            description: 'No token expiration check',
            severity: 'MEDIUM'
        });
        log.medium('No token expiration check');
    } else {
        log.pass('Token expiration implemented');
    }

    // Check routes for auth middleware
    const routeFiles = [
        'backend/routes/adminRoutes.js',
        'backend/routes/eventRoutes.js',
        'backend/routes/guestRoutes.js'
    ];

    routeFiles.forEach(file => {
        const filePath = path.join(__dirname, file);
        if (!fs.existsSync(filePath)) return;

        const routeContent = fs.readFileSync(filePath, 'utf8');
        if (routeContent.includes('authenticateToken') || routeContent.includes('auth')) {
            log.pass(`${file}: Uses authentication middleware`);
        } else {
            vulnerabilities.medium.push({
                file,
                type: 'Authorization',
                description: 'No authentication middleware on routes',
                severity: 'MEDIUM'
            });
            log.medium(`${file}: No authentication middleware`);
        }
    });
}

/**
 * Generate security report
 */
function generateReport() {
    console.log(`\n${colors.cyan}${'='.repeat(70)}${colors.reset}`);
    console.log(`${colors.cyan}SECURITY AUDIT SUMMARY${colors.reset}`);
    console.log(`${colors.cyan}${'='.repeat(70)}${colors.reset}\n`);

    const total = vulnerabilities.critical.length +
        vulnerabilities.high.length +
        vulnerabilities.medium.length +
        vulnerabilities.low.length;

    console.log(`${colors.red}Critical: ${vulnerabilities.critical.length}${colors.reset}`);
    console.log(`${colors.magenta}High: ${vulnerabilities.high.length}${colors.reset}`);
    console.log(`${colors.yellow}Medium: ${vulnerabilities.medium.length}${colors.reset}`);
    console.log(`${colors.cyan}Low: ${vulnerabilities.low.length}${colors.reset}`);
    console.log(`${colors.green}Passed: ${vulnerabilities.passed.length}${colors.reset}`);
    console.log(`\nTotal Issues: ${total}\n`);

    // Save detailed report
    const report = {
        date: new Date().toISOString(),
        summary: {
            critical: vulnerabilities.critical.length,
            high: vulnerabilities.high.length,
            medium: vulnerabilities.medium.length,
            low: vulnerabilities.low.length,
            passed: vulnerabilities.passed.length,
            total: total
        },
        vulnerabilities: vulnerabilities
    };

    fs.writeFileSync(
        path.join(__dirname, 'SECURITY-AUDIT-RESULTS.json'),
        JSON.stringify(report, null, 2)
    );

    console.log(`${colors.green}✓ Detailed report saved to SECURITY-AUDIT-RESULTS.json${colors.reset}\n`);

    return report;
}

/**
 * Main execution
 */
function main() {
    console.log(`
${colors.cyan}╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║           COMPREHENSIVE SECURITY AUDIT                         ║
║           Event Registration System                            ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝${colors.reset}
`);

    scanSQLInjection();
    scanXSS();
    scanCSRF();
    scanFileUpload();
    scanCredentials();
    scanInputValidation();
    scanAuth();

    const report = generateReport();

    // Exit code based on critical/high vulnerabilities
    if (report.summary.critical > 0) {
        process.exit(2);
    } else if (report.summary.high > 0) {
        process.exit(1);
    } else {
        process.exit(0);
    }
}

if (require.main === module) {
    main();
}

module.exports = { main, vulnerabilities };
