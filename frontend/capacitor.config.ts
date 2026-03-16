import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.faceconnect.app',
  appName: 'FaceConnect',
  webDir: 'build',
  server: {
    // For development, use the live server
    // url: 'https://profile-connector-3.preview.emergentagent.com',
    // cleartext: true,
    
    // For production, use the bundled web app
    androidScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#0A0A0A',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: true,
      spinnerColor: '#00F0FF',
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0A0A0A',
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    Camera: {
      // Camera permissions are handled in AndroidManifest
    },
    Geolocation: {
      // Geolocation permissions are handled in AndroidManifest
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_icon',
      iconColor: '#00F0FF',
    },
    Haptics: {
      // Haptics enabled by default
    },
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: true,
  },
};

export default config;
