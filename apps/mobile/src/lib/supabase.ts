import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '@/config/env';
import { mmkvSupabaseAuthStorage } from '@/services/storage/localStore.service';

const { url, anonKey } = getSupabaseConfig();

if (!url || !anonKey) {
  throw new Error(
    '[Mahfil] Supabase is not configured. ' +
      'Set SUPABASE_URL and SUPABASE_ANON_KEY in apps/mobile/.env, ' +
      'then restart Metro with: npx react-native start --reset-cache',
  );
}

export const supabase = createClient(url, anonKey, {
  auth: {
    storage: mmkvSupabaseAuthStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
