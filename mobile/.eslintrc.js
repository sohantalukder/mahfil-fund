module.exports = {
  root: true,
  env: {
    'react-native/react-native': true,
    es2020: true,
  },

  /* Base Configuration Extensions */
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
    'plugin:react-native/all',
    '@react-native',
  ],

  /* Ignored Paths */
  ignorePatterns: [
    'dist',
    '.eslintrc.js',
    'libs',
    '**/*.html',
    'android',
    'ios',
    'vendor',
  ],

  /* Parser and Plugins */
  parser: '@typescript-eslint/parser',
  plugins: ['react', 'react-native', '@typescript-eslint', 'react-hooks'],
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
    ecmaVersion: 2020,
    sourceType: 'module',
  },

  /* Settings */
  settings: {
    react: {
      version: 'detect',
    },
  },

  /* Custom Rule Overrides */
  rules: {
    /* React Native Specific Rules */
    'react-native/no-unused-styles': 'off',
    'react-native/split-platform-components': 'error',
    'react-native/no-inline-styles': 'off',
    'react-native/no-color-literals': 'off',
    'react-native/no-raw-text': 'off',
    'react-native/no-single-element-style-arrays': 'off',
    'react-native/sort-styles': 'off',

    /* Formatting and Style */
    indent: 'off',
    'implicit-arrow-linebreak': 'off',
    'linebreak-style': ['error', 'unix'],
    'object-curly-newline': 'off',
    'max-len': 'off',
    'function-paren-newline': 'off',
    'react/jsx-one-expression-per-line': 'off',
    'no-console': ['error', { allow: ['warn', 'error'] }],
    'no-confusing-arrow': 'off',
    'comma-dangle': 'off',
    quotes: [
      'error',
      'single',
      {
        avoidEscape: true,
        allowTemplateLiterals: true,
      },
    ],
    'no-trailing-spaces': [
      'error',
      { skipBlankLines: true, ignoreComments: true },
    ],
    'eol-last': ['error', 'always'],

    /* React and JSX Rules */
    'react/jsx-props-no-spreading': 'off',
    'react/jsx-uses-react': 'off',
    'react/jsx-wrap-multilines': 'off',
    'react/prop-types': 'off',
    'react/react-in-jsx-scope': 'off',
    'react/require-default-props': 'off',

    /* TypeScript Rules */
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        vars: 'all',
        destructuredArrayIgnorePattern: '^_',
        argsIgnorePattern: '^_',
      },
    ],

    /* Common JavaScript Rules */
    'no-dupe-keys': 'error',
    'no-param-reassign': [
      'error',
      {
        props: true,
        ignorePropertyModificationsFor: ['state', 'params', 'value'],
      },
    ],

    /* React Hooks Rules */
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'off',

    /* ESLint Rules */
    curly: 'off',
    'no-void': 'off',
  },
  overrides: [
    {
      files: ['*.config.js', '*.config.cjs', '__tests__/**/*.{js,ts,tsx}'],
      rules: {
        '@typescript-eslint/no-require-imports': 'off',
      },
    },
  ],
};
