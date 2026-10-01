# Mahfil Fund — Deployment Guide

## Overview

Mahfil Fund is a multi-tenant, SaaS-ready donation and community fund management platform. This document covers environment setup, database migration, seeding, and deployment for all apps.

---

## Prerequisites

- Node.js 20+
- pnpm 10.32+
- PostgreSQL (via Supabase)
- Supabase project with Storage enabled
- Android Studio/JDK and Xcode/CocoaPods for mobile release builds

---

## Repository Structure

```
api/             → Fastify REST API (Node.js, TypeScript)
web/             → Unified Next.js customer and admin portal
mobile/          → React Native mobile app
```

There is no central package manager state or shared runtime package. Each deployable
owns its `package.json`, `pnpm-lock.yaml`, `node_modules`, contracts, API client,
validation, translations, and runtime code.

---

## 1. Install Dependencies

```bash
cd api && pnpm install
cd ../web && pnpm install
cd ../mobile && pnpm install
```

---

## 2. Environment Variables

### `api/.env`

```env
DATABASE_URL="postgresql://USER:PASS@HOST:5432/mahfil_fund"

JWT_SECRET="your-very-long-secret-here"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

SUPABASE_URL="https://xxxxx.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
SUPABASE_STORAGE_BUCKET="mahfil-uploads"

MAILTRAP_HOST="smtp.example.com"
MAILTRAP_PORT="2525"
MAILTRAP_USER="your-smtp-user"
MAILTRAP_PASS="your-smtp-password"
MAIL_FROM="noreply@mahfilfund.com"

ADMIN_COMMUNITY_LIMIT=10

PORT=4000
NODE_ENV=production
```

### `web/.env.local`

```env
API_INTERNAL_URL=http://localhost:4000
```

### `mobile/.env`

```env
API_URL=http://localhost:4000
```

---

## 3. Database Migration

```bash
cd api
PREFLIGHT_REPORT_PATH=./preflight-production.json pnpm security:preflight
pnpm exec prisma migrate deploy
```

---

## 4. Seed Data

The seed validates the schema and creates one API-owned super admin from `SEED_ADMIN_EMAIL` and
`SEED_ADMIN_PASSWORD`. It does not create demo users or print passwords.

```bash
SEED_ADMIN_EMAIL=admin@example.com SEED_ADMIN_PASSWORD='<long-random-password>' \
  pnpm exec prisma db seed
```

---

## 5. Storage Setup (Supabase)

1. Create a bucket named `mahfil-uploads` in Supabase Storage
2. Set bucket policy to **private** (access via signed URLs only)
3. Enable RLS if needed

---

## 6. Development

```bash
cd api && pnpm dev                    # API on :4000
cd web && pnpm dev                    # Customer at /, admin at /admin
cd mobile && pnpm start               # Metro bundler
```

---

## 7. Production Build

```bash
cd api && pnpm check
cd web && pnpm check
cd mobile && pnpm check
```

### Mobile Production Build

```bash
cd mobile
pnpm build:android:bundle
pnpm build:ios
```

---

## 8. API Deployment

The API is a Node.js/Fastify app. Deploy via:

- **Railway** / **Render** / **Fly.io**: set the service root to `api`, build with `pnpm install --frozen-lockfile && pnpm build`, then start with `node dist/server.js`

---

## 9. Frontend Deployment

`web` is one Next.js app serving both portals. Deploy via:

- **Vercel**: Link the repo, set the project root to `web`, and add the web environment variables
- **Netlify**: Similar setup with `next build` command

The canonical customer URL is `/`; the canonical administration URL is `/admin`.

---

## 10. Multi-Tenancy Notes

- The community ID in `/communities/:communityId/...` is the only tenant source
- The common tenant guard requires an active membership and active community
- Super admins have platform authority only and never bypass tenant membership
- Each community is fully isolated — data never leaks across tenants

---

## 11. User Roles

| Community role | Read | Write | Delete | Member admin |
| -------------- | ---- | ----- | ------ | ------------ |
| `ADMIN`        | ✓    | ✓     | ✓      | ✓            |
| `COLLECTOR`    | ✓    | ✓     | —      | —            |
| `VIEWER`       | ✓    | —     | —      | —            |

`User.isSuperAdmin` is a separate platform privilege used only by `/platform/*` routes.

---

## 12. Community Creation Limits

- Platform super admins: unlimited communities
- Other eligible accounts: max 10 communities (configurable via `ADMIN_COMMUNITY_LIMIT`)
- Enforced in the backend `communityLimit.ts` service

---

## 13. Account Provisioning

There is no public signup, invitation, join, magic-link, or passwordless flow. Community
administrators create accounts with temporary passwords or add an existing account by
normalized email. Existing-account credential resets are platform-super-admin only.

---

## 14. PDF/Export Generation

Reports and invoices are generated server-side using:

- `pdfmake` for PDF (with Hind Siliguri Bangla font)
- `exceljs` for XLSX
- `@json2csv/plainjs` for CSV

Fonts are embedded in `api/src/assets/fonts/`.
