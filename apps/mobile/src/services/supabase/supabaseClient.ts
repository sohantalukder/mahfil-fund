import { createClient } from '@supabase/supabase-js';
import appConfig from '@/config/appConfig';
import { MMKV } from 'react-native-mmkv';

const storage = new MMKV({ id: 'mahfil-supabase' });

const mmkvStorage = {
  getItem: (key: string) => {
    const value = storage.getString(key);
    return value ?? null;
  },
  setItem: (key: string, value: string) => {
    storage.set(key, value);
  },
  removeItem: (key: string) => {
    storage.delete(key);
  },
};

export const supabase = createClient(
  appConfig.supabase.url,
  appConfig.supabase.anonKey,
  {
    auth: {
      storage:
        mmkvStorage as unknown as import('@supabase/supabase-js').SupportedStorage,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  }
);
