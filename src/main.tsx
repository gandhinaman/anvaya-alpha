import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Aggressively clean up any PWA service workers and caches.
// This runs unconditionally so that Capacitor WebView (even loading a remote URL)
// never gets stuck with stale PWA artefacts.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    registrations.forEach(reg => reg.unregister());
  });
  // Clear all caches left by workbox / service workers
  if ('caches' in window) {
    caches.keys().then(names => names.forEach(name => caches.delete(name)));
  }
}

createRoot(document.getElementById("root")!).render(<App />);
