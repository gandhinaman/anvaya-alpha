import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.lovable.anvayaalpha.app",
  appName: "anvaya-alpha",
  webDir: "dist",

  // To enable dev hot-reload, uncomment the server block below:
  // server: {
  //   url: 'https://15f9b36f-8215-4684-988a-0e68a6183ccd.lovableproject.com?forceHideBadge=true',
  //   cleartext: true,
  //   allowNavigation: ['*.lovableproject.com', '*.supabase.co', '*.lovable.app'],
  // },
  ios: {
    contentInset: "automatic",
    preferredContentMode: "mobile",
    backgroundColor: "#1A0F0A",
    allowsLinkPreview: false,
  },
  android: {
    backgroundColor: "#1A0F0A",
  },
};

export default config;
