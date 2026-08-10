import type { CapacitorConfig } from '@capacitor/cli';
import { KeyboardResize, KeyboardStyle } from '@capacitor/keyboard';

const config: CapacitorConfig = {
  appId: 'com.keiya.smithnote',
  appName: 'SmithNote',
  webDir: 'dist',
  backgroundColor: '#0f1115',
  plugins: {
    Keyboard: {
      resize: KeyboardResize.None,
      style: KeyboardStyle.Dark,
      autoBackdropColor: 'auto',
    },
  },
  ios: {
    scheme: 'SmithNote',
  },
};

export default config;
