module.exports = {
  preset: 'react-native',
  setupFilesAfterEnv: ['react-native-gesture-handler/jestSetup.js'],
  // pnpm stores packages below node_modules/.pnpm before linking them into the
  // app. React Native publishes Flow syntax that must still pass through
  // Babel, so both the store path and the linked package path are allow-listed.
  transformIgnorePatterns: [
    'node_modules/(?!\\.pnpm/|((jest-)?react-native|react-native-.*|@react-native(-community)?|@react-navigation|@gorhom|@shopify|@d11)/)',
  ],
};
