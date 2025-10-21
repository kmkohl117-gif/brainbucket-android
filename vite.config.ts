import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: './', // 👈 this keeps relative paths for online hosting
  plugins: [
    react(),
VitePWA({
  registerType: 'autoUpdate', // ✅ prevents popup loop
  injectRegister: 'auto',
  workbox: {
    cleanupOutdatedCaches: true,
  },
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
