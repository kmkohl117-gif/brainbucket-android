import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: './', // 👈 this keeps relative paths for online hosting
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt', // prevent auto-refresh loop
      injectRegister: 'auto',
      workbox: { disable: true }, // completely disables caching
      devOptions: { enabled: false },
    }),
  ],
  build: {
    sourcemap: true, // 👈 this is what makes DevTools show actual .tsx filenames
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
})
