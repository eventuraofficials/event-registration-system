# Missing Environment Variables Documentation

This document lists all required environment variables that must be configured for production deployment.

---

## Required Environment Variables

### 1. JWT_SECRET (CRITICAL)
**Description:** Secret key for JWT token signing and verification
**Required:** YES
**Security Level:** HIGH
**Format:** String, minimum 32 characters
**Example:** `afd233350d33633fc555b52c98e60d9ba1d133afa78c2cb987af7e06b47abe14`

**Generation:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Impact if Missing:** Application will fail to start or authentication will be insecure

---

### 2. NODE_ENV
**Description:** Application environment mode
**Required:** YES
**Values:** `development` | `production` | `test`
**Default:** `development`
**Example:** `production`

**Impact if Missing:** May use development configurations in production

---

### 3. PORT
**Description:** Server port number
**Required:** NO
**Default:** `5000`
**Example:** `10000` (for Render.com)

**Impact if Missing:** Uses default port 5000

---

### 4. APP_URL
**Description:** Full application URL for QR code generation
**Required:** YES (for production)
**Format:** Full HTTPS URL
**Example:** `https://event-registration-system-vaj3.onrender.com`

**Impact if Missing:** QR codes will contain localhost URLs instead of production URLs

---

### 5. CORS_ORIGIN
**Description:** Allowed CORS origins
**Required:** NO
**Default:** Same as APP_URL
**Example:** `https://event-registration-system-vaj3.onrender.com`

**Impact if Missing:** May allow requests from unauthorized origins

---

## Optional Environment Variables

### Email Configuration (if using nodemailer)

```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM="Event System <noreply@yourdomain.com>"
```

### Database Configuration

```env
DB_PATH=./data/event_registration.db
```
**Note:** SQLite database, auto-created if not exists

### Logging

```env
LOG_LEVEL=info
LOG_FILE=./logs/app.log
```

---

## Environment Setup by Platform

### Local Development

Create `.env` file:
```env
JWT_SECRET=dev-secret-32-characters-long-string
NODE_ENV=development
PORT=5000
APP_URL=http://localhost:5000
```

### Render.com Production

Configure in Render Dashboard → Environment:
```env
JWT_SECRET=<generated-secret>
NODE_ENV=production
APP_URL=https://your-app.onrender.com
PORT=10000
```

### Heroku

```bash
heroku config:set JWT_SECRET=<generated-secret>
heroku config:set NODE_ENV=production
heroku config:set APP_URL=https://your-app.herokuapp.com
```

### Docker

In `docker-compose.yml`:
```yaml
environment:
  - JWT_SECRET=${JWT_SECRET}
  - NODE_ENV=production
  - APP_URL=${APP_URL}
```

---

## Mock/Test Values

For testing and local development only:

```env
# .env.test
JWT_SECRET=test-secret-for-development-only-32-chars
NODE_ENV=test
PORT=5001
APP_URL=http://localhost:5001
CORS_ORIGIN=http://localhost:5001

# Test email (use ethereal.email for dev)
EMAIL_HOST=smtp.ethereal.email
EMAIL_PORT=587
EMAIL_USER=test@ethereal.email
EMAIL_PASS=test-password
```

**⚠️ WARNING:** Never use mock values in production!

---

## Validation Checklist

Before deploying to production:

- [ ] JWT_SECRET is set and is 32+ characters
- [ ] JWT_SECRET is different from development
- [ ] NODE_ENV is set to `production`
- [ ] APP_URL matches actual production URL
- [ ] APP_URL uses HTTPS (not HTTP)
- [ ] No .env file is committed to git
- [ ] All secrets are stored in platform's secret manager
- [ ] Team members don't have access to production secrets

---

## Security Best Practices

1. **Never commit .env to version control**
   - Ensure `.env` is in `.gitignore`
   - Use `.env.example` with placeholder values

2. **Use different secrets per environment**
   - Development, staging, production should have unique JWT_SECRET

3. **Rotate secrets regularly**
   - Recommended: Every 90 days
   - Always rotate after team member departure

4. **Use strong random values**
   - Minimum 32 characters for JWT_SECRET
   - Use cryptographically secure random generation

5. **Limit secret access**
   - Only platform admins should see production secrets
   - Use secret management tools (AWS Secrets Manager, Vault)

---

## Troubleshooting

### Error: "JWT_SECRET is not set"
**Solution:** Ensure JWT_SECRET environment variable is configured

### Error: "Invalid token"
**Solution:** JWT_SECRET may have changed. Users need to login again

### QR Codes show localhost URL
**Solution:** Set APP_URL to production URL

### CORS errors in browser
**Solution:** Set CORS_ORIGIN to match frontend URL

---

## Next Steps

1. Generate production JWT_SECRET
2. Configure all required env vars on hosting platform
3. Test application with production configuration
4. Verify QR codes contain correct URLs
5. Monitor logs for environment-related errors

---

**Document Version:** 1.0
**Last Updated:** 2025-11-26
