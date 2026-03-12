import { createClient } from '@supabase/supabase-js';
import appConfig from '@/config/appConfig';
import { MMKV } from 'react-native-mmkv';
const storage = new MMKV({ id: 'mahfil-supabase' });
const mmkvStorage = {
    getItem: (key) => {
        const value = storage.getString(key);
        return value ?? null;
    },
    setItem: (key, value) => {
        storage.set(key, value);
    },
    removeItem: (key) => {
        storage.delete(key);
    },
};
const hasSupabaseConfig = appConfig.supabase.url.trim().length > 0 &&
    appConfig.supabase.anonKey.trim().length > 0;
if (!hasSupabaseConfig) {
    console.warn('[supabase] SUPABASE_URL or SUPABASE_ANON_KEY missing; auth features are disabled for this build.');
}
const disabledSupabaseClient = {
    auth: {
        getSession: async () => ({ data: { session: null }, error: null }),
        signInWithPassword: async () => ({
            data: { user: null, session: null },
            error: new Error('Supabase is not configured'),
        }),
        signOut: async () => ({ error: null }),
    },
};
export const supabase = hasSupabaseConfig
    ? createClient(appConfig.supabase.url, appConfig.supabase.anonKey, {
        auth: {
            storage: mmkvStorage,
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: false,
        },
    })
    : disabledSupabaseClient;
