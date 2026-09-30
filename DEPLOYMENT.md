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
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### `mobile/.env`

```env
API_URL=http://localhost:4000
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=your-anon-key
```

---

## 3. Database Migration

```bash
cd api
pnpm exec prisma migrate dev --name init

# After adding communityId to existing tables:
pnpm exec prisma migrate dev --name add_community_tenant
```

---

## 4. Seed Data

The seed creates the role records, a default community for existing-data
backfill, and one super admin from `SEED_ADMIN_EMAIL` and
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

- Every API request to tenant-scoped endpoints must include `X-Community-Id` header
- The `tenantGuard` plugin validates membership automatically
- Super admins bypass tenant checks
- Each community is fully isolated — data never leaks across tenants

---

## 11. User Roles

| Role          | Read | Write | Delete | Admin |
| ------------- | ---- | ----- | ------ | ----- |
| `super_admin` | ✓    | ✓     | ✓      | ✓     |
| `admin`       | ✓    | ✓     | ✓      | —     |
| `collector`   | ✓    | ✓     | —      | —     |
| `viewer`      | ✓    | —     | —      | —     |

---

## 12. Community Creation Limits

- `super_admin`: unlimited communities
- `admin`: max 10 communities (configurable via `ADMIN_COMMUNITY_LIMIT`)
- Enforced in the backend `communityLimit.ts` service

---

## 13. Invite Code Flow

1. Admin creates invitation via `/api/invitations` with email, role, expiry
2. System generates a 16-digit numeric code (e.g., `1234 5678 9012 3456`)
3. Admin shares code with the invitee
4. Invitee calls `/api/invitations/verify` with the code to join

---

## 14. PDF/Export Generation

Reports and invoices are generated server-side using:

- `pdfmake` for PDF (with Hind Siliguri Bangla font)
- `exceljs` for XLSX
- `@json2csv/plainjs` for CSV

Fonts are embedded in `api/src/assets/fonts/`.
