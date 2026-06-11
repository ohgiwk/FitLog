import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';

/**
 * FitLog 用の ESLint Flat Config。
 * 型情報を使う recommendedTypeChecked をベースに、
 * React Hooks と Vite (react-refresh) のルールを追加する。
 * フォーマット系のルールは Prettier に任せるため、
 * eslint-config-prettier を最後に適用して競合を無効化する。
 */
export default tseslint.config(
  {
    /**
     * 生成物や依存はリント対象から除外する。
     */
    ignores: ['dist', 'dev-dist', 'node_modules'],
  },
  {
    /**
     * 型情報を使うリントは src 配下の TypeScript のみに適用する。
     */
    files: ['src/**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      ecmaVersion: 2021,
      globals: globals.browser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      /**
       * react-hooks v7 の recommended は React Compiler 前提の
       * 厳しい新ルールを多数含むため、ここでは定番の2ルールだけを使う。
       * 将来 React Compiler を導入する場合は recommended-latest への
       * 切り替えを検討する。
       */
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      /**
       * 表示用に全角スペース (U+3000) を JSX テキストへ意図的に使うため、
       * JSX テキスト内の全角スペースは許可する。
       */
      'no-irregular-whitespace': [
        'error',
        { skipStrings: true, skipTemplates: true, skipJSXText: true },
      ],
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
  /**
   * Prettier と競合するフォーマット系ルールを無効化する。
   * 必ず最後に置くこと。
   */
  eslintConfigPrettier,
);
