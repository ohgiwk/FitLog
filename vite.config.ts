import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const isCapacitorBuild = mode === 'capacitor';

  return {
    base: isCapacitorBuild ? './' : '/FitLog/',
    plugins: [
      react(),
      VitePWA({
        disable: isCapacitorBuild,
        registerType: 'prompt',
        includeAssets: ['favicon.png', 'apple-touch-icon.png', 'splash.png'],
        manifest: {
          id: '/FitLog/',
          name: 'SmithNote',
          short_name: 'SmithNote',
          description: '筋トレの種目、セット、重量、回数を記録できるトレーニングログアプリ',
          start_url: '/FitLog/',
          scope: '/FitLog/',
          display: 'standalone',
          orientation: 'portrait',
          background_color: '#0f1115',
          theme_color: '#ef2331',
          lang: 'ja',
          icons: [
            {
              src: '/FitLog/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/FitLog/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable',
            },
          ],
        },
        workbox: {
          navigateFallback: '/FitLog/index.html',
          globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
        },
      }),
    ],
  };
});
