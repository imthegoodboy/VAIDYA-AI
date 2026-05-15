import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "ai.vaidya.mobile",
  appName: "Vaidya AI",
  webDir: "dist",
  server: {
    androidScheme: "https",
  },
};

export default config;
