// eslint.config.js
import js from '@eslint/js';
import prettier from 'eslint-config-prettier';

export default [
  // 1) Global ignores (e.g. node_modules)
  {
    ignores: [
      '**/node_modules/**',
    ],
  },

  // 2) CLIENT-APP CONFIG (ES Modules + Browser)
  {
    // Merge ESLint recommended + Prettier overrides
    ...js.configs.recommended,
    ...prettier, // ensures ESLint doesn't conflict with Prettier

    files: ['client-app/**/*.js'],

    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module', // ESM
      globals: {
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        // other browser globals if needed
      },
    },
    rules: {
      // Your custom rules or overrides for client code
      // For example: 'semi': ['error', 'always']
    },
  },

  // 3) SERVER-APP CONFIG (CommonJS + Node)
  {
    ...js.configs.recommended,
    ...prettier,

    files: ['server-app/**/*.js'],

    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'commonjs', // CommonJS
      globals: {
        require: 'readonly',
        module: 'readonly',
        process: 'readonly',
        __dirname: 'readonly',
        // other Node globals if needed
      },
    },
    rules: {
      // Your custom rules or overrides for server code
    },
  },
];
