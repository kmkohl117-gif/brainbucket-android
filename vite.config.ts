import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// 👇 your frontend lives here
const appRoot = resolve(__dirname, 'client')

export default defineConfig({
  root: appRoot,
  build: {
    outDir: resolve(appRoot, 'dist'),
    emptyOutDir: true
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['robots.txt', 'favicon.svg'],
      manifest: {
        name: 'Your App Name',
        short_name: 'YourApp',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#0f172a',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            urlPattern: ({ request }) =>
              ['document','script','style','worker'].includes(request.destination),
            handler: 'StaleWhileRevalidate'
          },
          {
            urlPattern: ({ request }) =>
              ['image','font'].includes(request.destination),
            handler: 'CacheFirst',
            options: { cacheName: 'assets', expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 } }
          }
        ]
      }
    })
  ]
})
