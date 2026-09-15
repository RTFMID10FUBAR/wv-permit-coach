import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'WV Permit Coach',
        short_name: 'Permit Coach',
        description:
          "Offline study coach for the West Virginia Driver's Licensing Handbook. Unofficial study aid.",
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#f7f8fa',
        theme_color: '#10457e',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // App shell and all study content are precached, so the app works fully offline.
        // The 16 MB handbook PDF is deliberately NOT precached -- it would treble install
        // size on a phone. The searchable handbook TEXT is bundled and always offline; the
        // PDF is cached at runtime the first time it is opened.
        globPatterns: ['**/*.{js,css,html,svg,png,json,woff2}'],
        globIgnores: ['**/handbook/*.pdf'],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: /handbook\/.*\.pdf$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'handbook-pdf',
              expiration: { maxEntries: 2 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },
      devOptions: { enabled: false },
    }),
  ],
})
