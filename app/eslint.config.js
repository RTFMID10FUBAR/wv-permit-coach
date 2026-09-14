import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';

export default [
  { ignores: ['dist/**', 'dev-dist/**', 'node_modules/**', 'src/content/data/**'] },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2023,
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
      globals: {
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        indexedDB: 'readonly',
        Storage: 'readonly',
        Blob: 'readonly',
        URL: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        HashChangeEvent: 'readonly',
        IDBRequest: 'readonly',
        IDBDatabase: 'readonly',
        IDBTransactionMode: 'readonly',
        IDBObjectStore: 'readonly',
        SpeechSynthesisUtterance: 'readonly',
      },
    },
    plugins: { '@typescript-eslint': tsPlugin },
    rules: {
      // TypeScript already resolves types, identifiers and unused symbols.
      'no-undef': 'off',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-empty': ['error', { allowEmptyCatch: true }],
      eqeqeq: ['error', 'smart'],
      'prefer-const': 'error',
    },
  },
  {
    files: ['scripts/**/*.mjs', '*.config.{ts,js}'],
    languageOptions: {
      globals: { console: 'readonly', process: 'readonly', Buffer: 'readonly' },
    },
  },
];
