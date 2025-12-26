import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      // Use source files instead of compiled bundle to avoid React version mismatch
      '@nis2shield/react-guard': path.resolve(__dirname, '../src'),
      // Ensure the demo app's React instance is used everywhere
      'react': path.resolve(__dirname, 'node_modules/react'),
      'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
    }
  },
  optimizeDeps: {
    include: ['react', 'react-dom'],
  }
})
