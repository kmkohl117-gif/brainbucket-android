import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/', // ✅ online build must use '/'
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
})

