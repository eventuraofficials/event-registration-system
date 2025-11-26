/**
 * DEEP AUDIT SCRIPT
 * Comprehensive code analysis and issue detection
 */

const fs = require('fs');
const path = require('path');

const findings = [];
let issueId = 1;

function addFinding(priority, category, file, line, description, rootCause, suggestedFix) {
    findings.push({
        id: `ISSUE-${String(issueId++).padStart(3, '0')}`,
        priority,
        category,
        file,
        line,
        description,
        root_cause: rootCause,
        suggested_fix: suggestedFix,
        fix_commit: null,
        pr_link_or_patch: null,
        tests_added: false
    });
}

// Scan JavaScript files for common issues
function scanFile(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');

        lines.forEach((line, index) => {
            const lineNum = index + 1;

            // P0: console.log in production code
            if (line.includes('console.log') && !filePath.includes('node_modules')) {
                if (filePath.includes('backend/') || filePath.includes('public/js/')) {
                    addFinding(
                        'P1',
                        'code-quality',
                        filePath,
                        lineNum,
                        'console.log found in production code',
                        'Debug logging left in production code can expose sensitive data and impact performance',
                        'Remove console.log or replace with proper logger'
                    );
                }
            }

            // P0: Hardcoded secrets
            if (line.match(/(password|secret|key)\s*=\s*['"]/i) && !line.includes('process.env')) {
                addFinding(
                    'P0',
                    'security',
                    filePath,
                    lineNum,
                    'Potential hardcoded secret detected',
                    'Secrets should never be hardcoded in source code',
                    'Move to environment variables'
                );
            }

            // P1: SQL injection risks
            if (line.includes('db.execute') && line.includes('+') && !line.includes('?')) {
                addFinding(
                    'P0',
                    'security',
                    filePath,
                    lineNum,
                    'Potential SQL injection vulnerability',
                    'String concatenation in SQL query',
                    'Use parameterized queries with ? placeholders'
                );
            }

            // P1: eval() usage
            if (line.includes('eval(')) {
                addFinding(
                    'P0',
                    'security',
                    filePath,
                    lineNum,
                    'eval() usage detected',
                    'eval() can execute arbitrary code and is a security risk',
                    'Remove eval() or use safer alternatives'
                );
            }

            // P2: var usage instead of let/const
            if (line.trim().startsWith('var ')) {
                addFinding(
                    'P2',
                    'code-quality',
                    filePath,
                    lineNum,
                    'var usage instead of let/const',
                    'var has function scope and can cause unexpected behavior',
                    'Replace with let or const'
                );
            }

            // P1: Missing error handling
            if (line.includes('async function') && !content.includes('try') && !content.includes('catch')) {
                addFinding(
                    'P1',
                    'reliability',
                    filePath,
                    lineNum,
                    'Async function without error handling',
                    'Unhandled promise rejections can crash the application',
                    'Add try-catch block'
                );
            }
        });

    } catch (error) {
        console.error(`Error scanning ${filePath}:`, error.message);
    }
}

// Scan all source files
function scanDirectory(dir, extensions = ['.js']) {
    const files = fs.readdirSync(dir);

    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory() && file !== 'node_modules' && file !== '.git') {
            scanDirectory(filePath, extensions);
        } else if (extensions.some(ext => file.endsWith(ext))) {
            scanFile(filePath);
        }
    });
}

// Check for missing config files
function checkConfigFiles() {
    const requiredConfigs = [
        { file: '.gitignore', priority: 'P1', desc: 'Prevents committing sensitive files' },
        { file: '.env.example', priority: 'P1', desc: 'Documents required environment variables' },
        { file: 'package.json', priority: 'P0', desc: 'Node.js project configuration' }
    ];

    requiredConfigs.forEach(config => {
        if (!fs.existsSync(config.file)) {
            addFinding(
                config.priority,
                'configuration',
                config.file,
                0,
                `Missing ${config.file}`,
                config.desc,
                `Create ${config.file} file`
            );
        }
    });

    // Check for linting config
    const lintConfigs = ['.eslintrc.js', '.eslintrc.json', 'eslint.config.js'];
    if (!lintConfigs.some(f => fs.existsSync(f))) {
        addFinding(
            'P2',
            'code-quality',
            'eslint config',
            0,
            'No ESLint configuration found',
            'ESLint helps maintain code quality and consistency',
            'Add .eslintrc.json configuration'
        );
    }
}

// Check package.json for issues
function checkPackageJson() {
    try {
        const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

        // Check for outdated dependencies (from audit)
        if (!pkg.scripts || !pkg.scripts.test) {
            addFinding(
                'P1',
                'testing',
                'package.json',
                0,
                'No test script defined',
                'Testing is essential for production readiness',
                'Add proper test suite with framework like Jest or Mocha'
            );
        }

        // Check for build script
        if (pkg.scripts && !pkg.scripts.build && !pkg.scripts.start) {
            addFinding(
                'P1',
                'build',
                'package.json',
                0,
                'No build or start script',
                'Production deployment requires clear start command',
                'Add npm start script'
            );
        }
    } catch (error) {
        console.error('Error checking package.json:', error.message);
    }
}

// Main execution
console.log('🔍 Starting Deep Audit...\n');

checkConfigFiles();
checkPackageJson();

console.log('📁 Scanning backend files...');
if (fs.existsSync('backend')) {
    scanDirectory('backend');
}

console.log('📁 Scanning frontend files...');
if (fs.existsSync('public')) {
    scanDirectory('public');
}

console.log('📁 Scanning root level scripts...');
const rootFiles = fs.readdirSync('.');
rootFiles.forEach(file => {
    if (file.endsWith('.js') && !file.startsWith('node_modules')) {
        scanFile(file);
    }
});

// Group findings by priority
const p0 = findings.filter(f => f.priority === 'P0');
const p1 = findings.filter(f => f.priority === 'P1');
const p2 = findings.filter(f => f.priority === 'P2');

console.log('\n📊 AUDIT SUMMARY:');
console.log(`P0 (Critical): ${p0.length}`);
console.log(`P1 (Important): ${p1.length}`);
console.log(`P2 (Optional): ${p2.length}`);
console.log(`Total Issues: ${findings.length}\n`);

// Write findings to JSON
fs.writeFileSync(
    'audit-output/reports/findings.json',
    JSON.stringify({ findings, summary: { p0: p0.length, p1: p1.length, p2: p2.length, total: findings.length } }, null, 2)
);

console.log('✅ Audit complete! Results saved to audit-output/reports/findings.json');

// Print top P0 issues
if (p0.length > 0) {
    console.log('\n⚠️  TOP P0 ISSUES:');
    p0.slice(0, 5).forEach(issue => {
        console.log(`  ${issue.id}: ${issue.description} (${issue.file}:${issue.line})`);
    });
}
