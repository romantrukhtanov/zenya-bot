// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import eslintPluginUnusedImports from 'eslint-plugin-unused-imports';
import eslintPluginImport from 'eslint-plugin-import';

export default tseslint.config(
  {
    ignores: ['eslint.config.mjs'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      ecmaVersion: 5,
      sourceType: 'module',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    plugins: {
      'unused-imports': eslintPluginUnusedImports,
      import: eslintPluginImport,
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      'no-console': [
        'error',
        {
          allow: ['info', 'warn', 'error'],
        },
      ],
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'warn',
        {
          vars: 'all',
          varsIgnorePattern: '^_',
          args: 'after-used',
          argsIgnorePattern: '^_',
        },
      ],
      'no-unused-vars': 'off',
      'import/order': [
        'warn',
        {
          groups: [
            'builtin', // Node.js встроенные модули
            'external', // внешние пакеты (например, 'telegraf')
            'internal', // алиасы проекта (например, '@/modules/**')
            'parent', // импорты из родительской директории ('../')
            'sibling', // импорты из текущей директории ('./constants', './texts')
            'index', // импорт из './' (основной индекс)
          ],
          'newlines-between': 'always',
          alphabetize: {
            order: 'asc', // Сортировка по возрастанию
            caseInsensitive: true,
          },
        },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          prefer: 'type-imports',
          fixStyle: 'separate-type-imports',
        },
      ],
      'prettier/prettier': [
        'error',
        {
          semi: true,
          singleQuote: true,
          printWidth: 140,
          bracketSpacing: true,
          bracketSameLine: false,
          useTabs: false,
          tabWidth: 2,
          trailingComma: 'all',
          endOfLine: 'lf',
          quoteProps: 'as-needed',
          arrowParens: 'avoid',
        },
      ],
    },
  },
);
