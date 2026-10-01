/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

jest.mock('../src/assets/getAssetsContext', () => ({
  getAssetsContext: () => Object.assign(() => null, { keys: () => [] }),
  getIconsContext: () => () => ({ default: () => null }),
}));

jest.mock('react-native-webview', () => {
  const ReactModule = require('react');
  const { View } = require('react-native');
  return { WebView: (props: object) => ReactModule.createElement(View, props) };
});

jest.mock('@react-native-clipboard/clipboard', () => ({
  getString: jest.fn(async () => ''),
  setString: jest.fn(),
}));

jest.mock('@react-native-community/netinfo', () =>
  require('@react-native-community/netinfo/jest/netinfo-mock'),
);

jest.mock('react-native-device-info', () => ({
  getApplicationName: jest.fn(async () => 'Mahfil Fund'),
  getBuildNumber: jest.fn(() => '1'),
  getBundleId: jest.fn(() => 'com.mahfilfund'),
  getModel: jest.fn(() => 'Jest'),
  getSystemVersion: jest.fn(() => '1'),
  getUniqueIdSync: jest.fn(() => 'jest-device'),
  getVersion: jest.fn(() => '1.0.0'),
  isEmulator: jest.fn(async () => true),
}));

jest.mock('react-native-fs', () => ({
  CachesDirectoryPath: '/tmp',
  writeFile: jest.fn(async () => undefined),
}));

jest.mock('react-native-image-picker', () => ({
  launchCamera: jest.fn(async () => ({ assets: [] })),
  launchImageLibrary: jest.fn(async () => ({ assets: [] })),
}));

jest.mock('react-native-permissions', () => ({
  check: jest.fn(async () => 'granted'),
  request: jest.fn(async () => 'granted'),
  PERMISSIONS: {
    ANDROID: { CAMERA: 'android.camera', READ_MEDIA_IMAGES: 'android.read-images' },
    IOS: { CAMERA: 'ios.camera', PHOTO_LIBRARY: 'ios.photos' },
  },
  RESULTS: { BLOCKED: 'blocked', DENIED: 'denied', GRANTED: 'granted' },
}));

jest.mock('react-native-keychain', () => ({
  ACCESSIBLE: { WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'WhenUnlockedThisDeviceOnly' },
  getGenericPassword: jest.fn(async () => false),
  setGenericPassword: jest.fn(async () => true),
  resetGenericPassword: jest.fn(async () => true),
}));

import App from '../src/';

describe('App', () => {
  test('renders correctly', async () => {
    await ReactTestRenderer.act(() => {
      ReactTestRenderer.create(<App />);
    });
  });
});
