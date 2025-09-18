import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

(window as any).__API_BASE_URL__ = 'https://2d6b8952-57b8-4a6c-a041-fd01d3d89cf1-00-1l33vlsqoz733.riker.replit.dev/';

// Prevent content from being jammed under the status bar
import { StatusBar } from "@capacitor/status-bar";
StatusBar.setOverlaysWebView({ overlay: false }).catch(() => {});

createRoot(document.getElementById("root")!).render(<App />);
