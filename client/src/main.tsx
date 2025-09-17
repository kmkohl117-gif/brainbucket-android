import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Prevent content from being jammed under the status bar
import { StatusBar } from "@capacitor/status-bar";
StatusBar.setOverlaysWebView({ overlay: false }).catch(() => {});

createRoot(document.getElementById("root")!).render(<App />);
