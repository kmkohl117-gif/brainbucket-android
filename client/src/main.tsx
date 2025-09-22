// client/src/main.tsx
import { createRoot } from "react-dom/client"
import App from "./App"
import "./index.css"

import { ensureSeeded } from "./lib/db"
import { ErrorBoundary } from "./ErrorBoundary"   // <-- make sure this file exists (I gave you the code earlier)
import { StatusBar } from "@capacitor/status-bar"
import { Workbox } from "workbox-window"

// Set your API base first (if your app reads it on boot)
;(window as any).__API_BASE_URL__ = "https://brain-bucket-kmkohl117.replit.app"

// Avoid content under status bar (no-op on web)
StatusBar.setOverlaysWebView({ overlay: false }).catch(() => {})

async function mount() {
  try {
    await ensureSeeded()
  } catch (e) {
    console.error("Seeding failed:", e)
  }

  const rootEl = document.getElementById("root")!
  createRoot(rootEl).render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  )

  // Register the PWA service worker AFTER initial render
  if ("serviceWorker" in navigator) {
    const wb = new Workbox("/sw.js", { type: "module" })
    wb.addEventListener("waiting", () => wb.messageSkipWaiting())
    wb.register()
  }
}

mount()

