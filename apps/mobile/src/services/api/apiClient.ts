import { createApiClient } from '@mahfil/api-sdk';
import appConfig from '@/config/appConfig';
import DeviceInfo from 'react-native-device-info';
import localStore from '@/services/storage/localStore.service';

export const api = createApiClient({
  baseUrl: appConfig.api.baseUrl,
  getDeviceId: () => DeviceInfo.getUniqueIdSync?.() ?? null,
  getAccessToken: () => localStore.getApiToken(),
  getCommunityId: () => localStore.getActiveCommunityId(),
  onUnauthorizedRetry: async () => {
    const refreshToken = localStore.getRefreshToken();
    if (!refreshToken) return false;

    const response = await fetch(`${appConfig.api.baseUrl.replace(/\/+$/, '')}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Client': 'mahfil' },
      body: JSON.stringify({ refreshToken })
    });
    if (!response.ok) {
      localStore.clearAuthTokens();
      return false;
    }

    const payload = (await response.json()) as {
      success?: boolean;
      data?: { accessToken?: string; refreshToken?: string };
    };
    if (!payload.success || !payload.data?.accessToken || !payload.data.refreshToken) {
      localStore.clearAuthTokens();
      return false;
    }

    localStore.setApiToken(payload.data.accessToken);
    localStore.setRefreshToken(payload.data.refreshToken);
    return true;
  },
  onAuthFailure: () => {
    localStore.clearAuthTokens();
  },
});
