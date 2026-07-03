import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.keiya.fitlog',
  appName: 'SmithNote',
  webDir: 'dist',
  ios: {
    scheme: 'FitLog',
  },
};

export default config;
