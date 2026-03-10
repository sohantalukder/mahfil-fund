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
export const supabase = createClient(appConfig.supabase.url, appConfig.supabase.anonKey, {
    auth: {
        storage: mmkvStorage,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
    },
});
