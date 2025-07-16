// ESLint configuration migrated for ESLint v9+
import { FlatCompat } from '@eslint/eslintrc';

const compat = new FlatCompat();

export default [
  ...compat.config({
    root: true,
    parser: '@typescript-eslint/parser',
    parserOptions: {
      ecmaVersion: 6,
      sourceType: 'module',
    },
    plugins: ['@typescript-eslint'],
    rules: {
      '@typescript-eslint/naming-convention': 'off',
      curly: 'error',
      eqeqeq: 'warn',
      'no-throw-literal': 'warn',
      semi: 'off',
    },
    ignorePatterns: ['out', 'dist', '**/*.d.ts'],
  }),
];
