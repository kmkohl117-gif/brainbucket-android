import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

(window as any).__API_BASE_URL__ = 'https://brain-bucket-kmkohl117.replit.app';

// Prevent content from being jammed under the status bar
import { StatusBar } from "@capacitor/status-bar";
StatusBar.setOverlaysWebView({ overlay: false }).catch(() => {});

createRoot(document.getElementById("root")!).render(<App />);
