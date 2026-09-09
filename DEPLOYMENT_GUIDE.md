# Event Registration System Deployment Guide

This guide deploys the single multi-tenant Event Registration System. One service can host multiple clients and events; authorization and assignment rules isolate their data.

## Prerequisites

- Node.js 18 or newer
- GitHub repository access
- A production JWT secret with at least 32 characters
- A persistent disk or managed storage for SQLite, uploads, and backups

## Render deployment

1. Create a Render Web Service from the repository.
2. Set the build command to `npm install`.
3. Set the start command to `npm run production`.
4. Set the health check path to `/api/health`.
5. Add a persistent disk mounted at `/opt/render/project/src/data`.
6. Configure these environment variables:

```text
NODE_ENV=production
PORT=10000
JWT_SECRET=<long-random-secret>
ADMIN_INITIAL_PASSWORD=<initial-password>
ADMIN_INITIAL_USERNAME=admin
ADMIN_INITIAL_EMAIL=<admin-email>
APP_URL=https://<service>.onrender.com
CORS_ORIGIN=https://<service>.onrender.com
UPLOAD_PATH=/opt/render/project/src/data/uploads
BACKUP_PATH=/opt/render/project/src/data/backups
AUTO_BACKUP=true
BACKUP_INTERVAL_HOURS=24
```

The persistent disk stores the database, event logos, event banners, and automatic backups. Do not use the free ephemeral filesystem for production data.

## Railway or another host

Use the same build and start commands. Configure the same environment variables and attach a persistent volume. Set `UPLOAD_PATH` and `BACKUP_PATH` to directories inside that volume. If the host has no persistent volume, use object storage for uploads and a managed database before going live.

## First deployment checks

Run these checks after deployment:

```text
GET /api/health
GET /pages/landing.html
GET /assets/images/boh-favicon.svg
GET /assets/images/boh-logo-tight.png
```

Then log in with the initial admin account, change the initial password, create a client, create an event, upload a logo and banner, and verify the public registration and facilitator links.

## Local verification

```bash
npm install
npm test
npm run production
```

The local server listens on port 5000 unless `PORT` is set. Use a development JWT secret only for local work.

## Production notes

- Keep `JWT_SECRET` stable after the first deployment; changing it invalidates active JWTs.
- Keep `ADMIN_INITIAL_PASSWORD` out of source control.
- Use one service for multiple clients unless a separate database is explicitly required.
- Uploaded files are written through `UPLOAD_PATH`; backup files are written through `BACKUP_PATH`.
- The PDF report endpoint is authenticated and respects event access authorization.
