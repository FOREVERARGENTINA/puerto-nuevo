import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import security from 'eslint-plugin-security'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  {
    linterOptions: {
      reportUnusedDisableDirectives: false,
    },
  },
  globalIgnores([
    'dist',
    'mapa/dist',
    'mapa/dist/**',
    'playwright-report',
    'playwright-report/**',
    'test-results',
    'test-results/**',
  ]),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]', argsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],
      'react-hooks/exhaustive-deps': 'off',
      'react-hooks/set-state-in-effect': 'off',
    },
  },
  {
    files: [
      'tests/**/*.{js,jsx}',
      'e2e/**/*.{js,jsx}',
      'vitest*.{js,cjs}',
      'playwright*.{js,cjs}',
    ],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
  },
  {
    files: ['functions/**/*.{js,jsx,cjs}', 'scripts/**/*.{js,cjs}'],
    plugins: { security },
    extends: [security.configs.recommended],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.node,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'commonjs',
      },
    },
    rules: {
      'react-hooks/rules-of-hooks': 'off',
      'react-hooks/exhaustive-deps': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'no-restricted-syntax': [
        'error',
        {
          selector: "Property[key.name='html'] > BinaryExpression",
          message: 'No concatenar strings en html:. Usa TemplateLiteral + helpers de sanitizacion.',
        },
        {
          selector: "CallExpression[callee.object.object.name='snapshot'][callee.object.property.name='ref'][callee.property.name='update']",
          message: 'No usar snapshot.ref.update(...) en paths criticos. Usa runTransaction con merge seguro.',
        },
      ],
    },
  },
  {
    files: ['functions/**/*.test.{js,jsx,cjs}', 'functions/**/__tests__/**/*.{js,jsx,cjs}'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
    },
  },
  {
    // Scripts de migración/utilidad: usan rutas de archivo como variables por diseño (argumento de CLI)
    files: ['scripts/**/*.{js,cjs}'],
    rules: {
      'security/detect-non-literal-fs-filename': 'off',
      'security/detect-non-literal-regexp': 'off',
      'security/detect-object-injection': 'off',
    },
  },
  {
    files: ['src/hooks/**/*.{js,jsx}'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
])
