import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.gestaup.cadernetas',
  appName: 'Cadernetas Digitais',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 3000,
      launchAutoHide: true,
      backgroundColor: "#1a3a2a",
      showSpinner: true,
      spinnerStyle: "large",
      spinnerColor: "#ffffff"
    },
    App: {
      statusBarStyle: 'LIGHT'
    },
    Network: {
      logRequests: false
    }
  }
};

export default config;
