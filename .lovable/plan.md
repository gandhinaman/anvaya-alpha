

# Fix iOS Native App: Scrolling, Keyboard, and Permissions

## Problems Identified

1. **No scrolling**: The main SathiScreen wrapper uses `overflow: "hidden"` with fixed `height: "100dvh"` -- nothing can scroll.
2. **Keyboard pushes content off-screen**: No Capacitor Keyboard plugin is installed. When the iOS keyboard opens, the WebView resizes but `overflow: hidden` prevents the input from staying visible. The chat input bar gets hidden behind the keyboard.
3. **Mic/Camera permissions**: The app uses `getUserMedia()` for audio/video recording, which requires native permission declarations in `Info.plist`. These are configured at the Xcode project level, but Capacitor can be configured to set them. Additionally, no Capacitor permission-requesting plugins are installed.

## Solution

### 1. Install Capacitor Keyboard Plugin

Add `@capacitor/keyboard` to handle iOS keyboard behavior properly:
- Configure `resize: "body"` in `capacitor.config.ts` so the WebView body resizes when the keyboard appears
- Set `scroll` to enable auto-scrolling to the focused input

**capacitor.config.ts changes:**
```text
plugins: {
  Keyboard: {
    resize: "body",
    scrollAssist: true,
    scrollPadding: false,
  },
}
```

### 2. Fix Overflow on Main Containers

**SathiScreen wrapper** (AnvayaApp.jsx line 1029): Change `overflow: "hidden"` to allow vertical scrolling within child containers. The wrapper itself should clip horizontally but the content areas (chat, home cards) need their own scroll contexts.

**SathiChat** (SathiChat.jsx): The chat is `position: fixed` with `inset: 0` -- this is fine, but the input bar at the bottom needs to respond to the keyboard. Add a listener for Capacitor Keyboard events to adjust the bottom padding when the keyboard opens/closes.

**ParentApp.tsx**: Same issue -- `overflow: "hidden"` prevents any scrolling.

### 3. Add Keyboard-Aware Input Handling

In `src/main.tsx`, after detecting the native platform, import `@capacitor/keyboard` and listen for `keyboardWillShow`/`keyboardWillHide` events. Set a CSS custom property `--keyboard-height` on `document.documentElement` that components can use to adjust their bottom padding.

Components with bottom input bars (SathiChat, Login) will use this variable:
```text
paddingBottom: "calc(var(--keyboard-height, 0px) + env(safe-area-inset-bottom, 0px))"
```

### 4. Add Native Permission Descriptions

Update `capacitor.config.ts` to include iOS permission usage descriptions so the system permission dialogs appear correctly:

```text
ios: {
  ...existing config,
  // These go into Info.plist via Capacitor
}
```

Note: The actual `NSMicrophoneUsageDescription`, `NSCameraUsageDescription`, and `NSSpeechRecognitionUsageDescription` strings must be added to the iOS project's `Info.plist` file. Since this is done at the native layer, I will:
- Document the required plist entries for the user to add in Xcode
- These cannot be set from the web codebase alone

### 5. Fix Login Page Scroll

The Login page uses `minHeight: "100dvh"` which is correct, but it also doesn't scroll if content overflows (signup form is tall). Ensure the login container allows vertical scroll.

---

## Files to Modify

1. **`capacitor.config.ts`** -- Add Keyboard plugin config
2. **`package.json`** -- Add `@capacitor/keyboard` dependency
3. **`src/main.tsx`** -- Add Keyboard event listeners to set `--keyboard-height` CSS variable
4. **`src/components/AnvayaApp.jsx`** -- Change SathiScreen wrapper from `overflow: hidden` to allow child scrolling
5. **`src/components/sathi/SathiChat.jsx`** -- Make input bar keyboard-aware using `--keyboard-height`
6. **`src/pages/ParentApp.tsx`** -- Allow overflow for content scrolling
7. **`src/pages/Login.tsx`** -- Allow vertical scroll on the login form
8. **`src/components/guardian/GuardianDashboard.jsx`** -- Ensure scrollable content area

## Post-Implementation Steps

After these code changes, the user will need to:
1. Git pull the updated code
2. Run `npm install` (for the new keyboard package)
3. Run `npx cap sync` to sync the plugin to the iOS project
4. In Xcode, add these to `Info.plist`:
   - `NSMicrophoneUsageDescription`: "Anvaya needs microphone access for voice chat and memory recording"
   - `NSCameraUsageDescription`: "Anvaya needs camera access for video memory recording"
   - `NSSpeechRecognitionUsageDescription`: "Anvaya uses speech recognition for voice input"
5. Rebuild and run on device

