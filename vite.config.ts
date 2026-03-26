import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __filepath = fileURLToPath(import.meta.url)
const __dir = dirname(__filepath)

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'firebase/app': resolve(__dir, './src/firebase.ts'),
      'firebase/auth': resolve(__dir, './src/firebase.ts'),
      'firebase/firestore': resolve(__dir, './src/firebase.ts'),
      'firebase/storage': resolve(__dir, './src/firebase.ts'),
      'firebase': resolve(__dir, './src/firebase.ts'),
      // Adicionando fallback para o seletor legatário se necessário
      './firebase': resolve(__dir, './src/firebase.ts'),
      '../firebase': resolve(__dir, './src/firebase.ts'),
    }
  },
  optimizeDeps: {
    // Força o Vite a NÃO tentar pré-otimizar o Firebase como dependência externa,
    // garantindo que ele use o nosso shim local aliased acima.
    exclude: ['firebase', 'firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage']
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
