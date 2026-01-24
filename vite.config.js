import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
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
