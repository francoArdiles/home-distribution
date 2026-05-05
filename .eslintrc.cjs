module.exports = {
  env: { browser: true, es2020: true },
  extends: ['eslint:recommended', 'plugin:react/recommended'],
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  plugins: ['react', 'react-hooks'],
  settings: { react: { version: 'detect' } },
  rules: {
    'react/prop-types': 'off',
    'react/react-in-jsx-scope': 'off',
    'react/display-name': 'off',
    // while(true) with explicit break is valid
    'no-constant-condition': ['error', { checkLoops: false }],
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
    // Konva uses custom props not in the HTML spec
    'react/no-unknown-property': ['error', { ignore: ['onDragMove', 'onDragStart', 'onDragEnd', 'onTap', 'onDblTap', 'perfectDrawEnabled', 'shadowForStrokeEnabled', 'hitStrokeWidth'] }],
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
  },
  overrides: [
    {
      files: ['**/__tests__/**', '**/*.test.*'],
      env: { node: true },
      globals: { global: 'readonly', vi: 'readonly', describe: 'readonly', test: 'readonly', expect: 'readonly', beforeEach: 'readonly', afterEach: 'readonly', it: 'readonly' },
    },
    {
      files: ['.eslintrc.cjs'],
      env: { node: true },
    },
  ],
};
