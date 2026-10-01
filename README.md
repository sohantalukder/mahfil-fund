# Mahfil Fund

Multi-platform donation management system for annual Mahfil / Iftar fund collection in Bangladesh.

## Applications

Each deployable application has an explicit top-level boundary:

- `api`: Fastify REST API, Prisma, and server-only integrations
- `web`: unified Next.js portal; customer routes live at `/` and administration routes at `/admin`
- `mobile`: React Native application

Each application owns its contracts, validation, API client, dependencies, lockfile,
and runtime code. There is no root package, root `node_modules`, workspace package,
or Turborepo dependency.

## Install and run

Run commands from the application you are working on:

```bash
cd api && pnpm install && pnpm check
cd web && pnpm install && pnpm check
cd mobile && pnpm install && pnpm check
```

## Local setup (quick)

### API

- Copy [`api/.env.example`](api/.env.example) to `api/.env` and fill in PostgreSQL, JWT, mail, and server-only Supabase Storage values.
- Generate Prisma client:
  - `cd api && pnpm prisma:generate`
- After the database is reachable, run migrations and seed the initial platform account:
  - `cd api && pnpm prisma:migrate`
  - `cd api && pnpm exec prisma db seed`

### Web

- Set `API_INTERNAL_URL` in `web/.env.local`; browser requests always use the same-origin `/backend` proxy.
- Run `cd web && pnpm dev`, then use `/` for the customer portal or `/admin` for administration.

### Mobile

- Copy [`mobile/.env.example`](mobile/.env.example) to `mobile/.env` and set only the API URL.
- Run:
  - `cd mobile && pnpm ios` or `cd mobile && pnpm android`
