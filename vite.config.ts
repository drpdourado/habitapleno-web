import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Remover aliases problemáticos do Firebase
    }
  },
  server: {
    host: true,
    port: 5173,
    strictPort: false, // Permite que ele mude se estiver em uso, mas tentamos o 5173
    hmr: {
      protocol: 'ws',
      host: 'localhost',
    }
  }
})
