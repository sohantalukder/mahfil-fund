# Mahfil mobile

## Env

Copy `.env.example` to `.env` in `apps/mobile`:

- `API_URL` — same base as `NEXT_PUBLIC_API_URL` (no trailing slash required).
- `SUPABASE_URL` / `SUPABASE_ANON_KEY` — same Supabase project as web.

Magic link redirect: add scheme `mahfil://` in iOS URL types and Android intent filter; set Supabase redirect URL accordingly.

## Native

After install: `cd apps/mobile && npx pod-install` (iOS) for `react-native-fs` and other native deps.
