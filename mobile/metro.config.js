const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');

const defaultConfig = getDefaultConfig(__dirname);
const { assetExts, sourceExts } = defaultConfig.resolver;

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  resolver: {
    assetExts: assetExts.filter((extension) => extension !== 'svg'),
    sourceExts: [...sourceExts, 'svg'],
    // Fix for duplicate dependency resolution
    unstable_enablePackageExports: true,
    // pnpm links dependencies into this app's local node_modules/.pnpm store.
    unstable_enableSymlinks: true,
    // Metro does not consistently follow recyclerlistview's pnpm symlink.
    resolveRequest: (context, moduleName, platform) => {
      if (moduleName === 'ts-object-utils') {
        return {
          filePath: path.resolve(__dirname, 'src/shims/tsObjectUtils.ts'),
          type: 'sourceFile',
        };
      }

      return context.resolveRequest(context, moduleName, platform);
    },
    // Block problematic nested node_modules
    blockList: [
      // Block nested @react-native packages that cause conflicts
      /node_modules\/@react-native\/metro-config\/node_modules\/@react-native\/.*/,
    ],
  },
  transformer: {
    babelTransformerPath: require.resolve('react-native-svg-transformer'),
    unstable_allowRequireContext: true,
  },
};

module.exports = mergeConfig(defaultConfig, config);
