# Event Registration System - Audit Runbook

This runbook provides step-by-step instructions for reproducing issues, applying fixes, and validating the system.

---

## Table of Contents

1. [Environment Setup](#environment-setup)
2. [Running the Audit](#running-the-audit)
3. [Reproducing Issues](#reproducing-issues)
4. [Applying Fixes](#applying-fixes)
5. [Validation Steps](#validation-steps)
6. [Rollback Procedures](#rollback-procedures)

---

## Environment Setup

### Prerequisites
- Node.js 18+ installed
- npm 9+ installed
- Git installed
- Access to repository

### Initial Setup
```bash
# Clone repository
git clone <repository-url>
cd event-registration-system

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with required values
# Required variables:
#   JWT_SECRET=<random-32-char-string>
#   PORT=5000
#   NODE_ENV=development
```

### Generate JWT Secret
```bash
# Generate secure random secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Copy output to JWT_SECRET in .env
```

---

## Running the Audit

### Full Audit Execution
```bash
# Run complete audit suite
npm install                    # Install dependencies
npm audit --json > audit.json  # Security audit
npm test                       # Run tests
node audit-output/deep-audit.js # Code analysis
```

### Security Audit Only
```bash
npm audit
npm audit --json > npm-audit.json

# View specific vulnerabilities
npm audit | grep -A 5 "High\|Moderate"
```

### Test Suite
```bash
# Basic production test
npm test

# Full workflow test
npm run test:full

# Both tests
npm run test:all
```

---

## Reproducing Issues

### SEC-001: xlsx Prototype Pollution Vulnerability

**Test Environment:**
```bash
npm list xlsx
# Should show: xlsx@0.18.5
```

**Reproduce:**
1. Create malicious Excel file with prototype pollution payload
2. Upload via admin panel → Import Guests
3. Observe potential RCE or application crash

**Detection:**
```bash
npm audit | grep xlsx
# Should show HIGH severity warning
```

### SEC-002: Nodemailer Vulnerability

**Reproduce:**
1. Use email feature to send registration confirmation
2. Craft email with domain confusion payload
3. Observe email sent to unintended domain

**Detection:**
```bash
npm audit | grep nodemailer
# Should show MODERATE severity warning
```

### SEC-003: Validator.js URL Bypass

**Reproduce:**
1. Submit form with malicious URL in validation
2. Bypass occurs if validator.js < 13.15.20
3. Could lead to XSS

**Detection:**
```bash
npm audit | grep validator
# Should show MODERATE severity warning
```

### TEST-001: Limited Test Coverage

**Verify:**
```bash
# Check test files
find . -name "*.test.js" -o -name "*.spec.js"

# Run existing tests
npm test

# Should only run basic health check, no unit/integration tests
```

---

## Applying Fixes

### AUTO-FIX: Validator.js (SEC-003)

**SAFE TO AUTO-APPLY**

```bash
# Backup current state
git stash

# Apply fix
npm audit fix

# Verify fix
npm audit | grep validator
# Should show no vulnerabilities

# Test application
npm test
npm start
# Test registration form validation manually

# If successful, commit
git add package.json package-lock.json
git commit -m "fix: upgrade validator.js to patch URL bypass vulnerability"
```

**Rollback if needed:**
```bash
git reset --hard HEAD~1
npm install
```

---

### MANUAL FIX: xlsx Package (SEC-001)

**REQUIRES TESTING**

#### Option 1: Upgrade xlsx (if patch available)

```bash
# Check if new version available
npm show xlsx version

# Upgrade
npm install xlsx@latest

# Test Excel import functionality
npm test
# Manual test: Upload test Excel file in admin panel
```

#### Option 2: Replace with exceljs (RECOMMENDED)

```bash
# Uninstall xlsx
npm uninstall xlsx

# Install exceljs
npm install exceljs

# Update code in backend/utils/excelParser.js
```

**Code Changes Required:**
```javascript
// OLD (xlsx):
const XLSX = require('xlsx');
const workbook = XLSX.read(buffer);

// NEW (exceljs):
const ExcelJS = require('exceljs');
const workbook = new ExcelJS.Workbook();
await workbook.xlsx.load(buffer);
```

**Testing:**
```bash
# Test Excel import
node -e "
const parser = require('./backend/utils/excelParser');
const fs = require('fs');
const buffer = fs.readFileSync('test-file.xlsx');
parser.parseExcelFile(buffer).then(console.log);
"
```

---

### MANUAL FIX: Nodemailer Upgrade (SEC-002)

**REQUIRES TESTING - MAJOR VERSION**

```bash
# Backup
git checkout -b upgrade/nodemailer-v7

# Upgrade
npm install nodemailer@^7.0.7

# Review breaking changes
# Check: https://github.com/nodemailer/nodemailer/releases

# Update code if needed (check email config)
# Test email sending functionality

npm test

# Manual test: Send test email
node -e "
const nodemailer = require('nodemailer');
// Test your email configuration
"
```

**Validation:**
- Send registration confirmation email
- Send guest QR code email
- Verify email delivery and formatting

---

### CODE QUALITY: Remove console.log (DEBUG-001)

**SAFE TO APPLY**

```bash
# Create feature branch
git checkout -b fix/remove-console-logs

# Remove debug logs from:
# - public/js/register.js
# - public/js/checkin.js
# - public/js/admin.js

# Use find/replace in your editor:
# Find: console.log(.*);
# Replace: // Removed debug log

# Or keep important ones, replace with proper logger:
const logger = {
  info: (msg) => console.info(`[INFO] ${msg}`),
  error: (msg) => console.error(`[ERROR] ${msg}`)
};
```

**Testing:**
1. npm start
2. Test all pages load correctly
3. Check browser console for errors
4. Ensure no functionality broken

---

### ADD ESLINT (CFG-001)

**SAFE TO APPLY**

```bash
# Install
npm install --save-dev eslint

# Copy configuration from patch
cp audit-output/patches/005-add-eslint.patch .eslintrc.json

# Run lint
npx eslint .

# Fix auto-fixable issues
npx eslint . --fix

# Add to package.json
npm pkg set scripts.lint="eslint ."
npm pkg set scripts.lint:fix="eslint . --fix"
```

---

### ADD CI/CD (CI-001)

**SAFE TO APPLY**

```bash
# Create directory
mkdir -p .github/workflows

# Copy workflow
cp audit-output/patches/008-add-ci-workflow.patch .github/workflows/ci.yml

# Commit and push
git add .github/workflows/ci.yml
git commit -m "ci: add GitHub Actions workflow"
git push origin main

# Configure GitHub secrets:
# Go to repo → Settings → Secrets → Actions
# Add: JWT_SECRET
```

---

## Validation Steps

### Post-Fix Validation Checklist

#### Security Validation
```bash
# Run security audit
npm audit

# Should show 0 high, 0 critical vulnerabilities
# Moderate vulnerabilities for nodemailer acceptable if not upgraded yet

# Verify no secrets in code
git grep -i "password\s*=\s*['\"]" | grep -v "process.env" | grep -v ".example"
# Should return nothing

# Check .env is gitignored
git check-ignore .env
# Should output: .env
```

#### Functional Validation
```bash
# Start server
npm start

# In another terminal, run health check
curl http://localhost:5000/api/health
# Should return: {"status":"ok"}

# Run full workflow test
npm run test:full
```

#### Manual Testing Checklist

**Admin Panel:**
- [ ] Login with admin credentials
- [ ] Create new event
- [ ] Download event QR code (verify URL is correct)
- [ ] Import guests from Excel
- [ ] Export guest list

**Registration:**
- [ ] Scan event QR code
- [ ] Fill registration form
- [ ] Receive guest QR code
- [ ] Download QR code

**Check-in:**
- [ ] Select event
- [ ] Scan guest QR code
- [ ] Verify attendance marked
- [ ] Check statistics update

**Mobile Testing:**
- [ ] Test on iPhone/Android
- [ ] QR scanner camera works
- [ ] Forms are responsive
- [ ] All buttons clickable

---

## Rollback Procedures

### Rollback Package Changes

```bash
# If npm audit fix caused issues
git checkout package.json package-lock.json
npm install

# If manual upgrade caused issues
git checkout package.json package-lock.json
npm install
npm start
```

### Rollback Code Changes

```bash
# Rollback last commit
git reset --hard HEAD~1

# Rollback to specific commit
git reset --hard <commit-hash>

# Restore specific file
git checkout HEAD -- <file-path>
```

### Emergency Rollback

```bash
# If production is broken
git revert HEAD
git push origin main

# Force previous version
git reset --hard <last-known-good-commit>
git push --force origin main
```

---

## Environment Variables

### Required in Production

```env
# Authentication
JWT_SECRET=<32-char-random-string>

# Server
NODE_ENV=production
PORT=10000

# Application
APP_URL=https://your-domain.onrender.com
CORS_ORIGIN=https://your-domain.onrender.com

# Database (auto-created)
DB_PATH=./data/event_registration.db
```

### Optional

```env
# Email (if using nodemailer)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Logging
LOG_LEVEL=info
```

---

## Monitoring Post-Deployment

### Health Checks

```bash
# Endpoint health
curl https://your-domain.onrender.com/api/health

# Database check
curl https://your-domain.onrender.com/api/events/available
```

### Log Monitoring

```bash
# On Render
# Go to Logs tab in dashboard

# Look for errors
grep ERROR logs.txt

# Monitor security events
grep "401\|403\|500" logs.txt
```

---

## Support

### Common Issues

**Issue:** npm audit fix breaks application
**Solution:** Rollback and apply fixes one at a time

**Issue:** Tests fail after upgrade
**Solution:** Check breaking changes in package release notes

**Issue:** Server won't start
**Solution:** Check JWT_SECRET is set, verify .env file exists

---

## Next Steps After Audit

1. ✅ Apply auto-fixes (validator.js)
2. 📋 Review and test manual fixes (xlsx, nodemailer)
3. 🧪 Add comprehensive test suite
4. 🚀 Deploy to production with monitoring
5. 📊 Schedule next security audit (quarterly)

---

**Document Version:** 1.0
**Last Updated:** 2025-11-26
**Maintained By:** Development Team
