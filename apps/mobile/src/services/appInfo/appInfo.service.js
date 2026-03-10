import DeviceInfo from 'react-native-device-info';
export class AppInfoService {
    constructor() {
        this.cachedInfo = null;
        this.appName = null;
    }
    static getInstance() {
        if (!AppInfoService.instance) {
            AppInfoService.instance = new AppInfoService();
        }
        return AppInfoService.instance;
    }
    async getAppInfo() {
        if (this.cachedInfo) {
            return this.cachedInfo;
        }
        try {
            const [appName, version, buildNumber, bundleId, deviceModel, systemVersion, isEmulator,] = await Promise.all([
                this.getAppName(),
                DeviceInfo.getVersion(),
                DeviceInfo.getBuildNumber(),
                DeviceInfo.getBundleId(),
                DeviceInfo.getModel(),
                DeviceInfo.getSystemVersion(),
                DeviceInfo.isEmulator(),
            ]);
            this.cachedInfo = {
                appName,
                version,
                buildNumber,
                bundleId,
                deviceModel,
                systemVersion,
                isEmulator,
            };
            return this.cachedInfo;
        }
        catch (error) {
            if (__DEV__) {
                console.error('❌ Failed to get app info:', error);
            }
            return {
                appName: 'React Native Template',
                version: '1.0.0',
                buildNumber: '1',
                bundleId: 'com.reactnativetemplate.app',
                deviceModel: 'Unknown',
                systemVersion: 'Unknown',
                isEmulator: false,
            };
        }
    }
    async getAppName() {
        if (this.appName) {
            return this.appName;
        }
        try {
            this.appName = await DeviceInfo.getApplicationName();
            return this.appName;
        }
        catch (error) {
            if (__DEV__) {
                console.error('❌ Failed to get app name:', error);
            }
            return 'React Native Template';
        }
    }
    async getFormattedVersion() {
        try {
            const { version, buildNumber } = await this.getAppInfo();
            return `v${version} (${buildNumber})`;
        }
        catch (error) {
            if (__DEV__) {
                console.error('❌ Failed to get formatted version:', error);
            }
            return 'v1.0.0 (1)';
        }
    }
    clearCache() {
        this.cachedInfo = null;
        this.appName = null;
    }
}
export const appInfoService = AppInfoService.getInstance();
