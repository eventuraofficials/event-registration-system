# File Structure Reorganization Plan

## Current Structure Issues:
- HTML files scattered in public root
- No clear separation between pages and assets
- Components, CSS, and JS mixed together

## Proposed Clean Structure:

```
event-registration-system/
├── frontend/                    # All client-side code
│   ├── pages/                  # HTML pages
│   │   ├── index.html         # Registration page
│   │   ├── admin.html         # Admin dashboard
│   │   ├── checkin.html       # Check-in scanner
│   │   └── share-event.html   # Event sharing
│   │
│   ├── css/                    # Stylesheets
│   │   ├── theme/             # Theme files
│   │   │   ├── modern-theme.css
│   │   │   └── variables.css
│   │   ├── components/        # Component-specific styles
│   │   │   ├── components.css
│   │   │   └── qr-ticket.css
│   │   ├── layouts/           # Layout styles
│   │   │   ├── mobile-responsive.css
│   │   │   ├── admin.css
│   │   │   └── checkin.css
│   │   └── legacy/            # Old styles (to be removed)
│   │       └── style.css
│   │
│   ├── js/                     # JavaScript files
│   │   ├── core/              # Core functionality
│   │   │   ├── config.js
│   │   │   ├── components.js
│   │   │   └── security-utils.js
│   │   ├── pages/             # Page-specific scripts
│   │   │   ├── register.js
│   │   │   ├── admin.js
│   │   │   └── checkin.js
│   │   ├── utils/             # Utility functions
│   │   │   ├── admin-utils.js
│   │   │   └── mobile-menu.js
│   │   └── api/               # API client
│   │       └── api-client.js
│   │
│   ├── components/             # Reusable UI components
│   │   ├── Alert.js
│   │   ├── EventCard.js
│   │   ├── Footer.js
│   │   ├── Header.js
│   │   ├── LoadingSpinner.js
│   │   ├── QRPreview.js
│   │   ├── Sidebar.js
│   │   ├── StatsCard.js
│   │   └── UserTable.js
│   │
│   └── assets/                 # Static assets
│       ├── images/
│       ├── icons/
│       └── fonts/
│
├── backend/                     # All server-side code (already organized)
│   ├── api/                    # API layer (new)
│   │   ├── routes/
│   │   │   ├── adminRoutes.js
│   │   │   ├── eventRoutes.js
│   │   │   └── guestRoutes.js
│   │   └── controllers/
│   │       ├── adminController.js
│   │       ├── eventController.js
│   │       └── guestController.js
│   │
│   ├── db/                     # Database layer (new)
│   │   ├── config/
│   │   │   ├── database.js
│   │   │   └── init-sqlite.js
│   │   └── migrations/
│   │
│   ├── services/               # Business logic (new)
│   │   ├── eventService.js
│   │   ├── guestService.js
│   │   └── authService.js
│   │
│   ├── middleware/             # Express middleware
│   │   ├── auth.js
│   │   ├── csrf.js
│   │   └── upload.js
│   │
│   ├── utils/                  # Utility functions
│   │   ├── backup.js
│   │   ├── excelParser.js
│   │   ├── logger.js
│   │   ├── pagination.js
│   │   ├── qrGenerator.js
│   │   └── securityAudit.js
│   │
│   └── server.js               # Main server file
│
├── utils/                       # Shared utilities (both frontend & backend)
│   └── constants.js
│
├── docs/                        # Documentation
│   ├── API.md
│   ├── SETUP.md
│   └── ARCHITECTURE.md
│
├── scripts/                     # Build and deployment scripts
│   ├── backup.sh
│   ├── deploy.sh
│   └── seed-db.js
│
├── tests/                       # Test files
│   ├── backend/
│   └── frontend/
│
├── public/                      # Static files (symlink to frontend for serving)
│
├── start-production.js          # Production starter
├── package.json
└── README.md
```

## Migration Steps:

### Phase 1: Frontend Reorganization
1. Create new frontend directory structure
2. Move HTML files to frontend/pages/
3. Organize CSS into theme/, components/, layouts/
4. Organize JS into core/, pages/, utils/, api/
5. Components stay in frontend/components/
6. Create frontend/assets/ for images, icons, fonts

### Phase 2: Backend Reorganization
1. Create backend/api/ (routes + controllers)
2. Create backend/db/ (config + migrations)
3. Create backend/services/ (business logic)
4. Keep middleware/, utils/ as is

### Phase 3: Update References
1. Update all HTML script/link references
2. Update backend routes to serve from new paths
3. Update import paths in all JS files
4. Update CSS @import statements

### Phase 4: Create Symlink/Alias
1. Keep public/ as alias to frontend/ for Express static serving
2. OR update Express to serve from frontend/

## Benefits:
✅ Clear separation of concerns
✅ Easy to find files by category
✅ Scalable structure for future growth
✅ Better developer experience
✅ Industry-standard organization
