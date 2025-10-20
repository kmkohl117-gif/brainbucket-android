import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: './', // 👈 this keeps relative paths for online hosting
  plugins: [react()],
  build: {
    sourcemap: true, // 👈 this is what makes DevTools show actual .tsx filenames
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
})
