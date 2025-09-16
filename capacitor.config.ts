import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.brainbucket.app',
  appName: 'BrainBucket',
  webDir: 'dist/public',
  // Production server config for bundled assets
  server: {
    androidScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0
    },
    LocalNotifications: {
      // Use default Android notification icon instead of non-existent resource
      iconColor: "#488AFF",
      // Remove invalid sound reference - use system default
    }
  }
};

export default config;
