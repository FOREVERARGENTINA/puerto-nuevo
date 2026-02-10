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
  esbuild: {
    loader: 'jsx',
    include: /src\/.*\.jsx?$/,
    exclude: []
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        '.js': 'jsx'
      }
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Dependencias React core
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // Firebase separado
          'vendor-firebase': [
            'firebase/app',
            'firebase/auth',
            'firebase/firestore',
            'firebase/storage',
            'firebase/functions'
          ],
          // Aislar convertidor HEIC para control de cache en PWA
          'heic-converter': ['heic2any']
        }
      }
    },
    // Ajustar limite de warning (no subirlo por defecto)
    chunkSizeWarningLimit: 600
  }
})

