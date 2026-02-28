
# iOS Layout and Scaling Fix

## Problem
The app has several layout issues on iOS devices:
1. **Conflicting `#root` styles** -- `src/App.css` sets `max-width: 1280px`, `padding: 2rem`, `margin: 0 auto`, and `text-align: center` on `#root`, which conflicts with the full-screen layouts in `src/index.css` and the app pages
2. **Double safe-area handling** -- `#root` in `index.css` adds `padding-top/bottom` for safe area insets, but the SathiScreen uses `minHeight: 100vh` instead of accounting for this padding, causing content overflow or visible gaps
3. **`100vh` vs `100dvh` inconsistency** -- SathiScreen uses `minHeight: "100vh"` (line 1029) which on iOS Safari includes the address bar height, causing content to overflow. Some pages use `100dvh` correctly, others don't
4. **No safe-area-aware content padding** -- The SathiScreen's top bar (language toggle, profile button) has a fixed `marginTop: 14` which doesn't account for the iOS notch/dynamic island

## Solution

### 1. Remove conflicting `src/App.css` styles
Delete or empty `src/App.css` -- it contains Vite boilerplate styles (`max-width: 1280px`, `padding: 2rem`) that break the full-screen app layout on all devices.

### 2. Fix `#root` safe area in `src/index.css`
- Remove `padding-top/bottom` from `#root` (this creates visible gaps above the app content on iOS)
- Instead, expose CSS variables for safe area insets so individual screens can use them where needed

### 3. Fix SathiScreen layout (AnvayaApp.jsx)
- Change `minHeight: "100vh"` to `minHeight: "100dvh"` and add `height: "100dvh"` for proper iOS sizing
- Add safe-area-aware padding to the top bar area using `env(safe-area-inset-top)` via the CSS variable
- Add safe-area-aware padding to the bottom area for home indicator

### 4. Fix ParentApp.tsx wrapper
- Change `minHeight: "100dvh"` to also set `height: "100dvh"` and `overflow: "hidden"` to prevent scroll bounce on iOS

### 5. Fix GuardianDashboard (guardian/GuardianDashboard.jsx)
- Ensure the guardian layout also respects safe areas with proper top/bottom inset padding

### 6. Add iOS-specific CSS resets in `index.css`
- Add `-webkit-overflow-scrolling: touch` for smooth scrolling
- Add `overscroll-behavior: none` to prevent rubber-banding
- Use `position: fixed` + `100dvh` pattern for full-screen iOS layouts

---

## Technical Details

### Files to modify:
1. **`src/App.css`** -- Remove all boilerplate content (the file is unused/harmful)
2. **`src/index.css`** -- Update `#root` to remove padding, add iOS-specific resets, expose safe area CSS vars
3. **`src/components/AnvayaApp.jsx`** -- Fix SathiScreen wrap style to use `100dvh`, add safe area padding to top/bottom UI
4. **`src/pages/ParentApp.tsx`** -- Add `overflow: "hidden"`, ensure proper height
5. **`src/pages/ChildApp.tsx`** -- Ensure safe area padding is applied
6. **`src/pages/Login.tsx`** -- Ensure login page uses `100dvh` and safe areas
7. **`src/pages/Onboarding.tsx`** -- Same treatment for onboarding

### Key CSS changes:
```text
#root {
  min-height: 100dvh;
  /* NO padding for safe areas here -- let each screen handle it */
}

html, body {
  overscroll-behavior: none;          /* prevent iOS rubber-band */
  -webkit-text-size-adjust: 100%;     /* prevent text zoom */
}

/* Safe area utility classes */
.safe-top    { padding-top: env(safe-area-inset-top, 0px); }
.safe-bottom { padding-bottom: env(safe-area-inset-bottom, 0px); }
```

### SathiScreen wrap style fix:
```text
Before: { width:"100%", minHeight:"100vh", ... }
After:  { width:"100%", height:"100dvh", maxHeight:"100dvh", overflow:"hidden", paddingTop:"env(safe-area-inset-top)", paddingBottom:"env(safe-area-inset-bottom)", ... }
```
