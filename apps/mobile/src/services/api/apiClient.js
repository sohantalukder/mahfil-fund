import { createApiClient } from '@mahfil/api-sdk';
import appConfig from '@/config/appConfig';
import DeviceInfo from 'react-native-device-info';
import localStore from '@/services/storage/localStore.service';
import { authAxios } from './authHttp';

export const api = createApiClient({
  baseUrl: appConfig.api.baseUrl,
  getDeviceId: () => DeviceInfo.getUniqueIdSync?.() ?? null,
  getAccessToken: () => localStore.getApiToken(),
  getCommunityId: () => localStore.getActiveCommunityId(),
  onUnauthorizedRetry: async () => {
    const refreshToken = localStore.getRefreshToken();
    if (!refreshToken) return false;
    const { data, status } = await authAxios.post('/auth/refresh', { refreshToken });
    if (status < 200 || status >= 300 || !data?.success || !data.data?.accessToken || !data.data?.refreshToken) {
      localStore.clearAuthTokens();
      return false;
    }
    localStore.setApiToken(data.data.accessToken);
    localStore.setRefreshToken(data.data.refreshToken);
    return true;
  },
  onAuthFailure: () => {
    localStore.clearAuthTokens();
  },
});
