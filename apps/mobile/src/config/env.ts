/**
 * Injected by babel-plugin-inline-dotenv from apps/mobile/.env
 */
const API_URL = process.env.API_URL ?? '';
const SUPABASE_URL = process.env.SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY ?? '';

export function getApiBaseUrl(): string {
  if (!API_URL) {
    console.warn('Mahfil Mobile: API_URL missing; set in apps/mobile/.env');
  }
  return API_URL.replace(/\/+$/, '');
}

export function getSupabaseConfig(): { url: string; anonKey: string } {
  return { url: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY };
}

export function isEnvConfigured(): boolean {
  return Boolean(API_URL && SUPABASE_URL && SUPABASE_ANON_KEY);
}
