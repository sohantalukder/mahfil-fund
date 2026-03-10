import { MMKV } from 'react-native-mmkv';
class LocalStoreService {
    constructor() {
        this.KEY_API_TOKEN = 'apiToken';
        this.KEY_THEME = 'theme';
        this.KEY_SYSTEM_LANGUAGE = 'systemLanguage';
        this.store = new MMKV();
    }
    static getInstance() {
        if (!LocalStoreService.instance) {
            LocalStoreService.instance = new LocalStoreService();
        }
        return LocalStoreService.instance;
    }
    // API Token methods
    setApiToken(token) {
        this.store.set(this.KEY_API_TOKEN, token);
    }
    getApiToken() {
        return this.store.getString(this.KEY_API_TOKEN) ?? null;
    }
    clearApiToken() {
        this.store.delete(this.KEY_API_TOKEN);
    }
    getTheme() {
        return this.store.getString(this.KEY_THEME) ?? 'system';
    }
    setTheme(theme) {
        this.store.set(this.KEY_THEME, theme);
    }
    getSystemLanguage() {
        return this.store.getString(this.KEY_SYSTEM_LANGUAGE) ?? 'en';
    }
    setSystemLanguage(language) {
        this.store.set(this.KEY_SYSTEM_LANGUAGE, language);
    }
    // Clear all data
    clearAll() {
        this.store.clearAll();
    }
}
const localStore = LocalStoreService.getInstance();
export default localStore;
