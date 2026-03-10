import { createApiClient } from '@mahfil/api-sdk';
import appConfig from '@/config/appConfig';
import { supabase } from '@/services/supabase/supabaseClient';
import DeviceInfo from 'react-native-device-info';

export const api = createApiClient({
  baseUrl: appConfig.api.baseUrl,
  getDeviceId: () => DeviceInfo.getUniqueIdSync?.() ?? null,
  getAccessToken: async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  },
});

