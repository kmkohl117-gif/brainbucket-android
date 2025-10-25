// vite.config.ts
import { defineConfig } from "file:///home/project/node_modules/vite/dist/node/index.js";
import react from "file:///home/project/node_modules/@vitejs/plugin-react/dist/index.js";
import { VitePWA } from "file:///home/project/node_modules/vite-plugin-pwa/dist/index.js";
var vite_config_default = defineConfig({
  base: "./",
  // 👈 this keeps relative paths for online hosting
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      // ✅ prevents popup loop
      injectRegister: "auto",
      workbox: {
        cleanupOutdatedCaches: true
      },
      devOptions: { enabled: false }
    })
  ],
  build: {
    sourcemap: true
    // 👈 this is what makes DevTools show actual .tsx filenames
  },
  optimizeDeps: {
    exclude: ["lucide-react"]
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvaG9tZS9wcm9qZWN0XCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvaG9tZS9wcm9qZWN0L3ZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9ob21lL3Byb2plY3Qvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJ1xuaW1wb3J0IHJlYWN0IGZyb20gJ0B2aXRlanMvcGx1Z2luLXJlYWN0J1xuaW1wb3J0IHsgVml0ZVBXQSB9IGZyb20gJ3ZpdGUtcGx1Z2luLXB3YSdcblxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcbiAgYmFzZTogJy4vJywgLy8gXHVEODNEXHVEQzQ4IHRoaXMga2VlcHMgcmVsYXRpdmUgcGF0aHMgZm9yIG9ubGluZSBob3N0aW5nXG4gIHBsdWdpbnM6IFtcbiAgICByZWFjdCgpLFxuVml0ZVBXQSh7XG4gIHJlZ2lzdGVyVHlwZTogJ2F1dG9VcGRhdGUnLCAvLyBcdTI3MDUgcHJldmVudHMgcG9wdXAgbG9vcFxuICBpbmplY3RSZWdpc3RlcjogJ2F1dG8nLFxuICB3b3JrYm94OiB7XG4gICAgY2xlYW51cE91dGRhdGVkQ2FjaGVzOiB0cnVlLFxuICB9LFxuICBkZXZPcHRpb25zOiB7IGVuYWJsZWQ6IGZhbHNlIH0sXG59KSxcblxuXG4gIF0sXG4gIGJ1aWxkOiB7XG4gICAgc291cmNlbWFwOiB0cnVlLCAvLyBcdUQ4M0RcdURDNDggdGhpcyBpcyB3aGF0IG1ha2VzIERldlRvb2xzIHNob3cgYWN0dWFsIC50c3ggZmlsZW5hbWVzXG4gIH0sXG4gIG9wdGltaXplRGVwczoge1xuICAgIGV4Y2x1ZGU6IFsnbHVjaWRlLXJlYWN0J10sXG4gIH0sXG59KVxuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUF5TixTQUFTLG9CQUFvQjtBQUN0UCxPQUFPLFdBQVc7QUFDbEIsU0FBUyxlQUFlO0FBRXhCLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQzFCLE1BQU07QUFBQTtBQUFBLEVBQ04sU0FBUztBQUFBLElBQ1AsTUFBTTtBQUFBLElBQ1YsUUFBUTtBQUFBLE1BQ04sY0FBYztBQUFBO0FBQUEsTUFDZCxnQkFBZ0I7QUFBQSxNQUNoQixTQUFTO0FBQUEsUUFDUCx1QkFBdUI7QUFBQSxNQUN6QjtBQUFBLE1BQ0EsWUFBWSxFQUFFLFNBQVMsTUFBTTtBQUFBLElBQy9CLENBQUM7QUFBQSxFQUdDO0FBQUEsRUFDQSxPQUFPO0FBQUEsSUFDTCxXQUFXO0FBQUE7QUFBQSxFQUNiO0FBQUEsRUFDQSxjQUFjO0FBQUEsSUFDWixTQUFTLENBQUMsY0FBYztBQUFBLEVBQzFCO0FBQ0YsQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
