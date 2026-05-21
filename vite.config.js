import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    // Проксирование API запросов к Spring Boot в dev-режиме.
    // Это позволяет избежать CORS-проблем при локальной разработке.
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
})
