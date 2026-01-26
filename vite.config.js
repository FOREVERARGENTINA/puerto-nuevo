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
      manifest: {
        name: 'Montessori Puerto Nuevo',
        short_name: 'Puerto Nuevo',
        description: 'Plataforma Montessori Puerto Nuevo',
        theme_color: '#2C6B6F',
        background_color: '#F5F2ED',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: '/pwa/icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/pwa/icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: '/pwa/icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        navigateFallback: '/index.html',
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json,webmanifest}']
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
          ]
        }
      }
    },
    // Ajustar límite de warning (no subirlo por defecto)
    chunkSizeWarningLimit: 600
  }
})
