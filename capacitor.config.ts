import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.15f9b36f82154684988a0e68a6183ccd',
  appName: 'anvaya-alpha',
  webDir: 'dist',

  // DEV ONLY: Remove "server" block for production / App Store builds.
  // In production Capacitor loads from the local dist/ folder instead.
  server: {
    url: 'https://15f9b36f-8215-4684-988a-0e68a6183ccd.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
  ios: {
    contentInset: 'automatic',
    preferredContentMode: 'mobile',
    backgroundColor: '#1A0F0A',
  },
  android: {
    backgroundColor: '#1A0F0A',
  },
};

export default config;
