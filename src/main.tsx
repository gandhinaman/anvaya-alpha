import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Disable PWA service worker when running inside Capacitor native shell
const isCapacitor = !!(window as any).Capacitor?.isNativePlatform?.() || !!(window as any).Capacitor?.isPluginAvailable;

if (isCapacitor) {
  // Unregister any existing service workers to avoid PWA conflicts in native app
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(registrations => {
      registrations.forEach(reg => reg.unregister());
    });
  }
}

createRoot(document.getElementById("root")!).render(<App />);
