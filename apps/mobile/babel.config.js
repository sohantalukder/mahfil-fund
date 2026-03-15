const path = require('path');

module.exports = {
  plugins: [
    [
      'module-resolver',
      {
        alias: {
          '@': './src',
        },
        extensions: ['.js', '.json'],
        root: ['./src'],
      },
    ],
    ['inline-dotenv', { path: path.resolve(__dirname, '.env') }],
    'react-native-reanimated/plugin', // needs to be last
  ],
  presets: ['module:@react-native/babel-preset'],
};
