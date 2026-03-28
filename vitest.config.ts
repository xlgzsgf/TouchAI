import { resolve } from 'node:path'

import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  test: {
    globals: true,
    include: ['tests/**/*.{test,spec}.{ts,js}', 'src/**/*.{test,spec}.{ts,js}'],
    exclude: ['node_modules', 'dist', '.idea', '.git', '.cache'],
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@components': resolve(__dirname, './src/components'),
      '@assets': resolve(__dirname, './src/assets'),
      '@composables': resolve(__dirname, './src/composables'),
      '@services': resolve(__dirname, './src/services'),
      '@database': resolve(__dirname, './src/database'),
      '@utils': resolve(__dirname, './src/utils'),
      '@types': resolve(__dirname, './src/types'),
      '@styles': resolve(__dirname, './src/styles'),
    },
  },
  optimizeDeps: {
    include: ['parse5']
  }
})
