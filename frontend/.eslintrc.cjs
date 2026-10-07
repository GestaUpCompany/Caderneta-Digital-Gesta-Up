module.exports = {
  root: true,
  env: { browser: true, es2022: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', 'dev-dist', 'node_modules', 'android', 'ios', 'scripts', '*.cjs', '*.js', 'vite.config.ts', 'vitest.config.ts'],
  parser: '@typescript-eslint/parser',
  rules: {
    '@typescript-eslint/ban-ts-comment': 'warn',
    'no-empty': 'warn',
    'no-self-assign': 'warn',
    'no-useless-escape': 'warn',
    'no-case-declarations': 'warn',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
  },
}
