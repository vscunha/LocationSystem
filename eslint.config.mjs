import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';

export default [
  // 1) Global ignores
  {
    ignores: ['**/node_modules/**']
  },

  // 2) CLIENT-APP CONFIG (React + ES Modules + Browser)
  {
    ...js.configs.recommended,
    ...prettier,
    
    files: ['client-app/**/*.{js,jsx}'],
    
    plugins: {
      react,
      'react-hooks': reactHooks,
    },

    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: {
          jsx: true
        }
      },
      globals: {
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
      },
    },

    settings: {
      react: {
        version: 'detect'
      }
    },

    rules: {
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'warn',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn'
    }
  },

  // 3) SERVER-APP CONFIG (unchanged)
  {
    ...js.configs.recommended,
    ...prettier,

    files: ['server-app/**/*.js'],

    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'commonjs',
      globals: {
        require: 'readonly',
        module: 'readonly',
        process: 'readonly',
        __dirname: 'readonly',
      },
    },
  }
];