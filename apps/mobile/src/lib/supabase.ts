import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '@/config/env';
import { mmkvSupabaseAuthStorage } from '@/services/storage/localStore.service';

const { url, anonKey } = getSupabaseConfig();

export const supabase = createClient(url, anonKey, {
  auth: {
    storage: mmkvSupabaseAuthStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
