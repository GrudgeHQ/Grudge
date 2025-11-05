import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.yourdomain.grudgeapp', // TODO: Change this to your actual domain
  appName: 'Grudge App',
  webDir: 'out',
  server: {
    // Production configuration
    androidScheme: 'https',
    iosScheme: 'https',
    
    // For development, uncomment these lines and comment out production config:
    // url: 'http://localhost:3000',
    // cleartext: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#000000',
      showSpinner: false,
      androidSplashResourceName: 'splash',
      iosSplashResourceName: 'Splash',
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#000000',
    },
    Keyboard: {
      resize: 'body',
      style: 'dark',
    },
  },
};

export default config;
