import { MMKV } from 'react-native-mmkv';

class LocalStoreService {
  private store: MMKV;
  private static instance: LocalStoreService;

  private readonly KEY_API_TOKEN = 'apiToken';
  private readonly KEY_REFRESH_TOKEN = 'refreshToken';
  private readonly KEY_THEME = 'theme';
  private readonly KEY_SYSTEM_LANGUAGE = 'systemLanguage';
  private readonly KEY_ACTIVE_COMMUNITY_ID = 'activeCommunityId';
  private readonly KEY_ACTIVE_COMMUNITY_JSON = 'activeCommunityJson';

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

  public setRefreshToken(token: string): void {
    this.store.set(this.KEY_REFRESH_TOKEN, token);
  }

  public getRefreshToken(): string | null {
    return this.store.getString(this.KEY_REFRESH_TOKEN) ?? null;
  }

  public clearRefreshToken(): void {
    this.store.delete(this.KEY_REFRESH_TOKEN);
  }

  public clearAuthTokens(): void {
    this.clearApiToken();
    this.clearRefreshToken();
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

  public getActiveCommunityId(): string | null {
    return this.store.getString(this.KEY_ACTIVE_COMMUNITY_ID) ?? null;
  }

  public setActiveCommunityId(id: string): void {
    this.store.set(this.KEY_ACTIVE_COMMUNITY_ID, id);
  }

  public clearActiveCommunityId(): void {
    this.store.delete(this.KEY_ACTIVE_COMMUNITY_ID);
    this.store.delete(this.KEY_ACTIVE_COMMUNITY_JSON);
  }

  public getActiveCommunity(): { id: string; name: string; slug: string; role?: string } | null {
    const json = this.store.getString(this.KEY_ACTIVE_COMMUNITY_JSON);
    if (!json) return null;
    try {
      return JSON.parse(json) as { id: string; name: string; slug: string; role?: string };
    } catch {
      return null;
    }
  }

  public setActiveCommunity(community: { id: string; name: string; slug: string; role?: string }): void {
    this.store.set(this.KEY_ACTIVE_COMMUNITY_ID, community.id);
    this.store.set(this.KEY_ACTIVE_COMMUNITY_JSON, JSON.stringify(community));
  }

  // Clear all data
  public clearAll(): void {
    this.store.clearAll();
  }
}

const localStore = LocalStoreService.getInstance();
export default localStore;
