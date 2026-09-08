import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.rapidclearsolutions.marketplace",
  appName: "Rapid Clear Solutions",
  webDir: "public",
  server: {
    url: "https://rcs-marketplace.vercel.app",
    cleartext: false,
  },
};

export default config;