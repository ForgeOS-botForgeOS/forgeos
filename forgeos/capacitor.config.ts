import type { CapacitorConfig } from '@capacitor/cli';

// Native shell config. The web build in `dist` is bundled into the app, so the
// installable app runs fully offline while the PWA/website stays live too.
const config: CapacitorConfig = {
  appId: 'com.forgeos.app',
  appName: 'ForgeOS',
  webDir: 'dist',
  backgroundColor: '#0b0e14',
  android: {
    backgroundColor: '#0b0e14',
  },
};

export default config;
