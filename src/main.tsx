import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { isNative } from "./lib/platform";

// Aggressively clean up any PWA service workers and caches.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    registrations.forEach(reg => reg.unregister());
  });
  if ('caches' in window) {
    caches.keys().then(names => names.forEach(name => caches.delete(name)));
  }
}

// Configure status bar for native iOS/Android
if (isNative()) {
  import('@capacitor/status-bar').then(({ StatusBar, Style }) => {
    StatusBar.setStyle({ style: Style.Dark });
    StatusBar.setBackgroundColor({ color: '#1A0F0A' }).catch(() => {});
  }).catch(() => {});
}

createRoot(document.getElementById("root")!).render(<App />);
