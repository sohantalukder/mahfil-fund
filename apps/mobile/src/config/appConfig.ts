import { getApiBaseUrl } from '@/config/env';

const appConfig = {
  api: {
    businessService: getApiBaseUrl() || 'https://dummyjson.com/',
  },
};

export default appConfig;
