import axios from 'axios';
import * as Keychain from 'react-native-keychain';

jest.mock('axios', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn() },
}));
jest.mock('react-native-keychain', () => ({
  ACCESSIBLE: { WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'WhenUnlockedThisDeviceOnly' },
  getGenericPassword: jest.fn(),
  setGenericPassword: jest.fn(async () => true),
  resetGenericPassword: jest.fn(async () => true),
}));
jest.mock('../src/config/env', () => ({ getApiBaseUrl: () => 'https://api.test' }));

import { clearSession, refreshSession } from '../src/services/auth/session.service';

const mockedAxios = axios as jest.Mocked<typeof axios>;
const mockedKeychain = Keychain as jest.Mocked<typeof Keychain>;

describe('API-native mobile session coordinator', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await clearSession();
    mockedKeychain.getGenericPassword.mockResolvedValue({
      service: 'com.mahfilfund.auth',
      storage: 'keychain',
      username: 'mahfil-session',
      password: JSON.stringify({ accessToken: 'old-access', refreshToken: 'old-refresh' }),
    });
  });

  it('serializes parallel refresh attempts through one rotating request', async () => {
    mockedAxios.post.mockResolvedValue({
      data: { success: true, data: { accessToken: 'new-access', refreshToken: 'new-refresh' } },
    });
    mockedAxios.get.mockResolvedValue({
      data: { success: true, data: { user: { id: 'user-1', email: 'user@example.com', isSuperAdmin: false } } },
    });

    const [first, second] = await Promise.all([refreshSession(), refreshSession()]);
    expect(mockedAxios.post).toHaveBeenCalledTimes(1);
    expect(first?.accessToken).toBe('new-access');
    expect(second).toEqual(first);
    expect(mockedKeychain.setGenericPassword).toHaveBeenCalledTimes(1);
  });
});
