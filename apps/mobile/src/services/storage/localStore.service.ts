import { MMKV } from 'react-native-mmkv';

/**
 * Supabase auth persistence (same API as AsyncStorage; backed by MMKV).
 * Dedicated id so app `clearAll()` on the main store does not wipe session unless you clear this too.
 */
const supabaseMmkv = new MMKV({ id: 'mahfil-supabase-auth' });

export const mmkvSupabaseAuthStorage = {
  getItem: (key: string): Promise<string | null> =>
    Promise.resolve(supabaseMmkv.getString(key) ?? null),
  setItem: (key: string, value: string): Promise<void> => {
    supabaseMmkv.set(key, value);
    return Promise.resolve();
  },
  removeItem: (key: string): Promise<void> => {
    supabaseMmkv.delete(key);
    return Promise.resolve();
  },
};

class LocalStoreService {
  private store: MMKV;
  private static instance: LocalStoreService;

  private readonly KEY_API_TOKEN = 'apiToken';
  private readonly KEY_THEME = 'theme';
  private readonly KEY_SYSTEM_LANGUAGE = 'systemLanguage';
  private readonly KEY_ACTIVE_COMMUNITY = 'mahfil_active_community';

  private constructor() {
    this.store = new MMKV();
  }

  public static getInstance(): LocalStoreService {
    if (!LocalStoreService.instance) {
      LocalStoreService.instance = new LocalStoreService();
    }
    return LocalStoreService.instance;
  }

  // API Token methods
  public setApiToken(token: string): void {
    this.store.set(this.KEY_API_TOKEN, token);
  }

  public getApiToken(): string | null {
    return this.store.getString(this.KEY_API_TOKEN) ?? null;
  }

  public clearApiToken(): void {
    this.store.delete(this.KEY_API_TOKEN);
  }

  public getTheme(): string {
    return this.store.getString(this.KEY_THEME) ?? 'system';
  }

  public setTheme(theme: string): void {
    this.store.set(this.KEY_THEME, theme);
  }

  public getSystemLanguage(): string {
    return this.store.getString(this.KEY_SYSTEM_LANGUAGE) ?? 'en';
  }

  public setSystemLanguage(language: string): void {
    this.store.set(this.KEY_SYSTEM_LANGUAGE, language);
  }

  // Clear all data (app prefs only; Supabase session lives in mmkvSupabaseAuthStorage)
  public clearAll(): void {
    this.store.clearAll();
  }

  /** Wipe persisted Supabase session (e.g. full logout / reset) */
  public clearSupabaseAuthStorage(): void {
    supabaseMmkv.clearAll();
  }

  public setActiveCommunityJson(json: string | null): void {
    if (json) this.store.set(this.KEY_ACTIVE_COMMUNITY, json);
    else this.store.delete(this.KEY_ACTIVE_COMMUNITY);
  }

  public getActiveCommunityJson(): string | null {
    return this.store.getString(this.KEY_ACTIVE_COMMUNITY) ?? null;
  }
}

const localStore = LocalStoreService.getInstance();
export default localStore;
