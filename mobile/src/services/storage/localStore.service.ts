import { MMKV } from 'react-native-mmkv';

class LocalStoreService {
  private store: MMKV;
  private static instance: LocalStoreService;

  private readonly KEY_THEME = 'theme';
  private readonly KEY_SYSTEM_LANGUAGE = 'systemLanguage';
  private readonly KEY_ACTIVE_COMMUNITY = 'mahfil_active_community';
  private readonly KEY_INSTALLATION_ID = 'mahfil_installation_id';

  private constructor() {
    this.store = new MMKV();
  }

  public static getInstance(): LocalStoreService {
    if (!LocalStoreService.instance) {
      LocalStoreService.instance = new LocalStoreService();
    }
    return LocalStoreService.instance;
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

  public clearAll(): void {
    this.store.clearAll();
  }

  public setActiveCommunityJson(json: string | null): void {
    if (json) this.store.set(this.KEY_ACTIVE_COMMUNITY, json);
    else this.store.delete(this.KEY_ACTIVE_COMMUNITY);
  }

  public getActiveCommunityJson(): string | null {
    return this.store.getString(this.KEY_ACTIVE_COMMUNITY) ?? null;
  }

  public getInstallationId(): string {
    const existing = this.store.getString(this.KEY_INSTALLATION_ID);
    if (existing) return existing;
    const bytes = Array.from({ length: 16 }, () => Math.floor(Math.random() * 256));
    bytes[6] = (bytes[6]! % 16) + 64;
    bytes[8] = (bytes[8]! % 64) + 128;
    const hex = bytes.map((value) => value.toString(16).padStart(2, '0')).join('');
    const generated = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    this.store.set(this.KEY_INSTALLATION_ID, generated);
    return generated;
  }
}

const localStore = LocalStoreService.getInstance();
export default localStore;
