import { defineConfig } from 'vitest/config';

/**
 * テスト専用の設定。
 * vite.config.ts の PWA プラグインを読み込まないよう独立した設定にしている。
 * localStorage を使うため jsdom 環境で実行する
 */
export default defineConfig({
  test: {
    environment: 'jsdom',
    environmentOptions: {
      jsdom: {
        url: 'http://localhost/FitLog/',
      },
    },
    include: ['src/**/*.test.ts'],
    setupFiles: ['src/test/setup.ts'],
  },
});
