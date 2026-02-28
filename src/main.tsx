import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Aggressively clean up any PWA service workers and caches.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    registrations.forEach(reg => reg.unregister());
  });
  if ('caches' in window) {
    caches.keys().then(names => names.forEach(name => caches.delete(name)));
  }
}

createRoot(document.getElementById("root")!).render(<App />);

// Configure status bar for native (after React has mounted)
requestAnimationFrame(() => {
  const isNativePlatform = !!(window as any).Capacitor?.isNativePlatform?.();
  if (isNativePlatform) {
    import('@capacitor/status-bar').then(({ StatusBar, Style }) => {
      StatusBar.setStyle({ style: Style.Dark });
      StatusBar.setBackgroundColor({ color: '#1A0F0A' }).catch(() => {});
    }).catch(() => {});
  }
});
