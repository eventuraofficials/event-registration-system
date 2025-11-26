# Path Updates After Reorganization

## CSS Path Updates (in HTML files):
- `css/modern-theme.css` → `css/theme/modern-theme.css`
- `css/components.css` → `css/components/components.css`
- `css/qr-ticket.css` → `css/components/qr-ticket.css`
- `css/mobile-responsive.css` → `css/layouts/mobile-responsive.css`
- `css/admin.css` → `css/layouts/admin.css`
- `css/checkin.css` → `css/layouts/checkin.css`

## JS Path Updates (in HTML files):
- `js/config.js` → `js/core/config.js`
- `js/components.js` → `js/core/components.js`
- `js/security-utils.js` → `js/core/security-utils.js`
- `js/register.js` → `js/pages/register.js`
- `js/admin.js` → `js/pages/admin.js`
- `js/checkin.js` → `js/pages/checkin.js`
- `js/admin-utils.js` → `js/utils/admin-utils.js`
- `js/mobile-menu.js` → `js/utils/mobile-menu.js`

## HTML Pages (for backend routing):
- `/index.html` → `/pages/index.html`
- `/admin.html` → `/pages/admin.html`
- `/checkin.html` → `/pages/checkin.html`
- `/share-event.html` → `/pages/share-event.html`

## Backend Import Updates:
- `backend/routes/*` → `backend/api/routes/*`
- `backend/controllers/*` → `backend/api/controllers/*`
- `backend/config/*` → `backend/db/config/*`
