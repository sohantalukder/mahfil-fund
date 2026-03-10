# Mahfil Fund

Multi-platform donation management system for annual Mahfil / Iftar fund collection in Bangladesh.

## Workspace

- `apps/api`: Node.js (Fastify) REST API, TypeScript, Prisma, Supabase Postgres/Auth
- `apps/web`: Next.js web app
- `apps/admin`: Next.js admin portal
- `apps/mobile`: React Native mobile app (offline-first)
- `packages/*`: shared types, schemas, sdk, i18n, theme, utils

## Scripts

- `npx pnpm install`
- `npx pnpm dev`
- `npx pnpm build`
- `npx pnpm lint`
- `npx pnpm typecheck`

## Local setup (quick)

### API

- Copy `[apps/api/.env.example](apps/api/.env.example)` to `apps/api/.env` and fill in Supabase + Postgres values.
- Generate Prisma client:
  - `npx pnpm --filter @mahfil/api run prisma:generate`
- (After DB is reachable) run migrations + seed roles:
  - `npx pnpm --filter @mahfil/api run prisma:migrate`
  - `npx pnpm --filter @mahfil/api exec prisma db seed`

### Web/Admin

- Set env vars:
  - `apps/web/.env.local`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_API_URL`
  - `apps/admin/.env.local`: same as above

### Mobile

- Copy `[apps/mobile/.env.example](apps/mobile/.env.example)` to `apps/mobile/.env` and set API + Supabase values.
- Run:
  - `npx pnpm --filter @mahfil/mobile run ios` or `npx pnpm --filter @mahfil/mobile run android`

