/**
 * Environment configuration for Mahfil Mobile.
 *
 * babel-plugin-inline-dotenv replaces `process.env.X` with literal string
 * values from mobile/.env at bundle time. The `|| 'fallback'` below
 * guards against the edge case where the plugin cache is stale or the build
 * is run without --reset-cache.
 *
 * SUPABASE_ANON_KEY is a Supabase *publishable* key — safe to ship in the bundle.
 * API_URL defaults to the Android-emulator loopback alias (10.0.2.2) for
 * local development; override in .env for physical devices or staging.
 */
const _API_URL: string = (process.env.API_URL as string | undefined) || '';
const _SUPABASE_URL: string =
  (process.env.SUPABASE_URL as string | undefined) || '';
const _SUPABASE_ANON_KEY: string =
  (process.env.SUPABASE_ANON_KEY as string | undefined) || '';

export function getApiBaseUrl(): string {
  if (!_API_URL) {
    if (__DEV__) {
      console.warn(
        '[Mahfil] API_URL is not set. Add it to mobile/.env ' +
          '(e.g. API_URL=http://10.0.2.2:4000) and restart Metro with --reset-cache.',
      );
    }
    // Android emulator → host machine loopback
    return 'http://10.0.2.2:4000';
  }
  return _API_URL.replace(/\/+$/, '');
}

export function getSupabaseConfig(): { url: string; anonKey: string } {
  if (!_SUPABASE_URL || !_SUPABASE_ANON_KEY) {
    throw new Error(
      'SUPABASE_URL and SUPABASE_ANON_KEY must be configured in mobile/.env',
    );
  }
  return { url: _SUPABASE_URL, anonKey: _SUPABASE_ANON_KEY };
}

/** True when both public Supabase credentials were supplied at build time. */
export function isEnvConfigured(): boolean {
  return Boolean(_SUPABASE_URL && _SUPABASE_ANON_KEY);
}
