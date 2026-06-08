import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: "/FitLog/",
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "apple-touch-icon.svg"],
      manifest: {
        id: "/FitLog/",
        name: "FitLog",
        short_name: "FitLog",
        description: "筋トレの種目、セット、重量、回数を記録できるトレーニングログアプリ",
        start_url: "/FitLog/",
        scope: "/FitLog/",
        display: "standalone",
        orientation: "portrait",
        background_color: "#0f1115",
        theme_color: "#ef2331",
        lang: "ja",
        icons: [
          {
            src: "/FitLog/pwa-192x192.svg",
            sizes: "192x192",
            type: "image/svg+xml",
            purpose: "any",
          },
          {
            src: "/FitLog/pwa-512x512.svg",
            sizes: "512x512",
            type: "image/svg+xml",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        navigateFallback: "/FitLog/index.html",
        globPatterns: ["**/*.{js,css,html,svg,png,ico}"],
      },
    }),
  ],
});
