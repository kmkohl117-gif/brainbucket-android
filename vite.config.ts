import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: './', // 👈 this is the critical fix for online hosting
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
})
