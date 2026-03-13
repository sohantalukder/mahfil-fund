# Mahfil Fund — Deployment Guide

## Overview

Mahfil Fund is a multi-tenant, SaaS-ready donation and community fund management platform. This document covers environment setup, database migration, seeding, and deployment for all apps.

---

## Prerequisites

- Node.js 20+
- pnpm 9+
- PostgreSQL (via Supabase)
- Supabase project with Storage enabled
- Expo EAS CLI (for mobile builds)

---

## Monorepo Structure

```
apps/
  api/       → Fastify REST API (Node.js, TypeScript)
  web/       → Next.js user portal
  admin/     → Next.js admin portal
  mobile/    → React Native (Expo) mobile app

packages/
  types/     → Shared TypeScript types
  schemas/   → Zod validation schemas
  i18n/      → Translations (en, bn)
  theme/     → Design tokens and fonts
  api-sdk/   → HTTP client used by all frontends
  ui/        → Shared UI components
  config/    → Shared config
  utils/     → Shared utilities
```

---

## 1. Install Dependencies

```bash
pnpm install
```

---

## 2. Environment Variables

### `apps/api/.env`

```env
DATABASE_URL="postgresql://USER:PASS@HOST:5432/mahfil_fund"

JWT_SECRET="your-very-long-secret-here"
JWT_REFRESH_SECRET="another-very-long-secret-here"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

SUPABASE_URL="https://xxxxx.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
SUPABASE_STORAGE_BUCKET="mahfil-uploads"

ADMIN_COMMUNITY_LIMIT=10

PORT=4000
NODE_ENV=production
```

### `apps/web/.env.local`

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### `apps/admin/.env.local`

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### `apps/mobile/.env`

```env
API_BASE_URL=http://localhost:4000
```

---

## 3. Database Migration

```bash
# From workspace root
pnpm --filter api prisma migrate dev --name init

# After adding communityId to existing tables:
pnpm --filter api prisma migrate dev --name add_community_tenant
```

---

## 4. Seed Data

The seed creates:
- A default community (for existing data backfill)
- A super admin user (`super@mahfil.fund` / `SuperAdmin@123`)
- A sample community and community admin
- All UserRole records

```bash
pnpm --filter api prisma db seed
```

---

## 5. Storage Setup (Supabase)

1. Create a bucket named `mahfil-uploads` in Supabase Storage
2. Set bucket policy to **private** (access via signed URLs only)
3. Enable RLS if needed

---

## 6. Development

```bash
# Start all services
pnpm dev

# Or start individually
pnpm --filter api dev          # API on :4000
pnpm --filter web dev          # Web portal on :3001
pnpm --filter admin dev        # Admin portal on :3000
pnpm --filter mobile start     # Metro bundler
```

---

## 7. Production Build

```bash
# Build all packages first
pnpm build:packages

# Build apps
pnpm --filter api build
pnpm --filter web build
pnpm --filter admin build
```

### Mobile Production Build (EAS)

```bash
cd apps/mobile
eas build --platform android --profile production
eas build --platform ios --profile production
```

---

## 8. API Deployment

The API is a Node.js/Fastify app. Deploy via:
- **Railway** / **Render** / **Fly.io**: Point to `apps/api`, set `start` command to `node dist/server.js`
- **Docker**: `docker build -f apps/api/Dockerfile .`

---

## 9. Frontend Deployment

Both `apps/web` and `apps/admin` are Next.js apps. Deploy via:
- **Vercel**: Link repo, set root to `apps/web` or `apps/admin`, add env vars
- **Netlify**: Similar setup with `next build` command

---

## 10. Multi-Tenancy Notes

- Every API request to tenant-scoped endpoints must include `X-Community-Id` header
- The `tenantGuard` plugin validates membership automatically
- Super admins bypass tenant checks
- Each community is fully isolated — data never leaks across tenants

---

## 11. User Roles

| Role | Read | Write | Delete | Admin |
|------|------|-------|--------|-------|
| `super_admin` | ✓ | ✓ | ✓ | ✓ |
| `admin` | ✓ | ✓ | ✓ | — |
| `collector` | ✓ | ✓ | — | — |
| `viewer` | ✓ | — | — | — |

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

## 14. Offline Sync (Mobile)

1. All mutations (create/update/delete) are stored locally in WatermelonDB
2. On reconnect, `runSync()` pushes pending operations to `/sync/push`
3. The API applies changes atomically and returns results
4. Local records are updated with server IDs and sync status

---

## 15. PDF/Export Generation

Reports and invoices are generated server-side using:
- `pdfmake` for PDF (with Hind Siliguri Bangla font)
- `exceljs` for XLSX
- `@json2csv/plainjs` for CSV

Fonts are embedded in `apps/api/src/assets/fonts/`.
