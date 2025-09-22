import { createRoot } from "react-dom/client"
import App from "./App"
import "./index.css"

import { ErrorBoundary } from "./ErrorBoundary"
import {
  ensureSeeded,
  forceReseed,
  listBuckets,
  listTemplates,
  snapshot,
} from "./lib/db"

import { StatusBar } from "@capacitor/status-bar"
import { Workbox } from "workbox-window"

// API base if your app reads it
;(window as any).__API_BASE_URL__ = "https://brain-bucket-kmkohl117.replit.app"

// Avoid content under the mobile status bar (no-op on web)
StatusBar.setOverlaysWebView({ overlay: false }).catch(() => {})

async function mount() {
  // 1) Seed defaults if missing
  try {
    await ensureSeeded()
  } catch (e) {
    console.error("Seeding failed:", e)
  }

  // 2) Render app
  const rootEl = document.getElementById("root")!
  createRoot(rootEl).render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  )

  // 3) Register PWA SW
  if ("serviceWorker" in navigator) {
    const wb = new Workbox("/sw.js", { type: "module" })
    wb.addEventListener("waiting", () => wb.messageSkipWaiting())
    wb.register()
  }

  // 4) Lightweight debug panel (open the site with ?debug=1 to show)
  const url = new URL(window.location.href)
  if (url.searchParams.get("debug") === "1") {
    attachDebugPanel()
  }

  // Log a quick snapshot so we can see state without hunting for tabs
  console.log("DB_SNAPSHOT", await snapshot())
}

mount()

function attachDebugPanel() {
  const el = document.createElement("div")
  el.style.cssText =
    "position:fixed;bottom:12px;right:12px;z-index:99999;background:#111;color:#fff;padding:10px;border-radius:10px;font:12px system-ui;box-shadow:0 6px 24px rgba(0,0,0,.25)"
  el.innerHTML = `
    <div style="margin-bottom:6px">🛠️ Debug</div>
    <button id="dbg-dump" style="margin-right:6px">Dump</button>
    <button id="dbg-seed">Force Seed</button>
    <div id="dbg-out" style="max-width:320px;max-height:180px;overflow:auto;margin-top:8px;background:#000;padding:6px;border-radius:6px"></div>
  `
  document.body.appendChild(el)

  const out = el.querySelector<HTMLDivElement>("#dbg-out")!
  const write = (v: unknown) => (out.textContent = typeof v === "string" ? v : JSON.stringify(v, null, 2))

  el.querySelector("#dbg-dump")!.addEventListener("click", async () => {
    const [t, b] = await Promise.all([listTemplates(), listBuckets()])
    write({ templates: t.length, buckets: b.length })
    console.log("TEMPLATES", t)
    console.log("BUCKETS", b)
  })
  el.querySelector("#dbg-seed")!.addEventListener("click", async () => {
    await forceReseed()
    const [t, b] = await Promise.all([listTemplates(), listBuckets()])
    write({ reseeded: true, templates: t.length, buckets: b.length })
  })
}

