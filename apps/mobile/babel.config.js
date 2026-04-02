const path = require('path');

module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      'module-resolver',
      {
        root: ['./src'],
        alias: {
          '@': './src',
        },
        // Include all extensions that can be imported via the @/ alias
        extensions: ['.ts', '.tsx', '.js', '.jsx', '.json', '.native'],
      },
    ],
    // Reads .env and inlines process.env.X values at bundle time.
    // Run `npx react-native start --reset-cache` after editing .env.
    ['inline-dotenv', { path: path.resolve(__dirname, '.env'), systemVar: 'overwrite' }],
    // Must be last
    'react-native-reanimated/plugin',
  ],
};
