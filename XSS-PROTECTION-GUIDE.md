# XSS Protection Guidelines

## Current Implementation

The application uses `SecurityUtils.escapeHtml()` to sanitize user inputs before rendering.

### Safe Patterns

```javascript
// SAFE: Using escapeHtml for user data
element.innerHTML = `<div>${SecurityUtils.escapeHtml(userData)}</div>`;

// SAFE: Using textContent (automatic escaping)
element.textContent = userData;

// SAFE: Using createSafeElement
const elem = SecurityUtils.createSafeElement('div', userData, {class: 'user-info'});
```

### Unsafe Patterns (AVOID)

```javascript
// UNSAFE: Direct innerHTML without escaping
element.innerHTML = userData; // ❌ XSS vulnerability!

// UNSAFE: eval usage
eval(userCode); // ❌ NEVER use eval!

// UNSAFE: innerHTML with unescaped template literals
element.innerHTML = `<div>${req.body.name}</div>`; // ❌ Must escape!
```

## Files with XSS Protection

- ✅ public/js/admin.js - Uses SecurityUtils.escapeHtml()
- ✅ public/js/checkin.js - Uses SecurityUtils.escapeHtml()
- ✅ public/js/security-utils.js - Core sanitization library

## Verification

All innerHTML assignments have been reviewed. Template literals containing user data
are properly sanitized using SecurityUtils.escapeHtml().

Generated: 2025-11-26T12:00:02.443Z
