import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: [
        'pwa/apple-touch-icon.png',
        'pwa/icon-192.png',
        'pwa/icon-512.png'
      ],
      // Manifest canonico en public/manifest.webmanifest para control total (iOS + locale)
      manifest: false,
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        navigateFallback: '/index.html',
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json,webmanifest}'],
        globIgnores: [
          '**/assets/heic2any-*.js',
          '**/assets/heic-converter-*.js'
        ],
        maximumFileSizeToCacheInBytes: 2 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: /\/assets\/(heic2any|heic-converter)-.*\.js$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'heic-chunks',
              expiration: {
                maxEntries: 5,
                maxAgeSeconds: 60 * 60 * 24 * 30
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    })
  ],
  optimizeDeps: {
    rolldownOptions: {
      external: []
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/react-router-dom')) {
            return 'vendor-react';
          }
          if (id.includes('node_modules/firebase/')) {
            return 'vendor-firebase';
          }
          if (id.includes('node_modules/heic2any')) {
            return 'heic-converter';
          }
        }
      }
    },
    // Ajustar limite de warning (no subirlo por defecto)
    chunkSizeWarningLimit: 600
  },
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.test.{js,jsx,ts,tsx}'],
  }
})

