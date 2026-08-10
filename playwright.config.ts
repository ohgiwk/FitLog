import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:5184',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run dev:app -- --host 127.0.0.1 --port 5184 --strictPort',
    url: 'http://127.0.0.1:5184/',
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    {
      name: 'mobile-chrome',
      use: {
        ...devices['Pixel 5'],
        viewport: { width: 390, height: 844 },
      },
    },
  ],
});
