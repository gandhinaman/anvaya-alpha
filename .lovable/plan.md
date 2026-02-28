

## Make Anvaya Run as a True Native iOS App

### Problem
The app opens in a browser-like experience because:
- The PWA plugin generates service workers and manifest files that conflict with native Capacitor behavior
- PWA-specific meta tags in index.html tell iOS to treat the app as a web app
- The Capacitor service worker cleanup runs too late or not at all

### Changes

**1. Disable PWA plugin when building for Capacitor**
- Modify `vite.config.ts` to skip the `VitePWA` plugin entirely when an environment variable (e.g., `CAPACITOR_BUILD=true`) is set, or always skip it in production builds meant for native
- Simpler approach: check for a `CAPACITOR` env flag so you can run `CAPACITOR=true npm run build` before `npx cap sync`

**2. Conditionally remove PWA meta tags from index.html**
- Remove `apple-mobile-web-app-capable` and `apple-mobile-web-app-status-bar-style` since Capacitor handles these natively
- These tags cause iOS to apply PWA-specific behavior inside the WebView

**3. Strengthen service worker cleanup in main.tsx**
- Move the service worker unregistration to run unconditionally (not just when Capacitor is detected), or use a more reliable Capacitor detection that works with remote URLs
- Also clear all caches to prevent stale PWA content

**4. Update capacitor.config.ts for production**
- Add a comment explaining that `server.url` should be removed for production/App Store builds
- For production, Capacitor should load from the local `dist/` folder (no remote URL)

**5. Add a native-specific build script to package.json**
- Add a `build:native` script that sets the Capacitor flag and builds without PWA: `"build:native": "CAPACITOR=true vite build"`
- This gives a clean separation between web (PWA) and native (Capacitor) builds

### Technical Details

**vite.config.ts** changes:
```typescript
const isCapacitorBuild = process.env.CAPACITOR === 'true';

plugins: [
  react(),
  mode === "development" && componentTagger(),
  // Only include PWA for web builds, not native Capacitor
  !isCapacitorBuild && VitePWA({ ... }),
].filter(Boolean),
```

**index.html** changes:
- Remove the `apple-mobile-web-app-capable` meta tag (Capacitor sets this natively)
- Remove the `apple-mobile-web-app-status-bar-style` tag
- Keep the `apple-touch-icon` (harmless, useful for web)

**main.tsx** changes:
- Aggressively unregister ALL service workers and clear caches on startup regardless of Capacitor detection, since the detection may fail when loading remotely
- Use a safer fallback: check for Capacitor OR if there's no `manifest` link in the DOM

**package.json** new script:
```json
"build:native": "CAPACITOR=true vite build"
```

### Build workflow after changes
For native iOS builds:
1. `git pull` to get latest code
2. `npm run build:native` (builds without PWA)
3. `npx cap sync ios`
4. Open in Xcode and run

For development/hot-reload (current setup), the `server.url` in capacitor.config.ts continues to work as-is, but the service worker cleanup will be more aggressive.
