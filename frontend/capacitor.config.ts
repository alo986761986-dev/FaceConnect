import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.faceconnect.app',
  appName: 'FaceConnect',
  webDir: 'build',
  server: {
    // For production, use the bundled web app
    androidScheme: 'https',
    // Enable hardware acceleration
    allowNavigation: ['*'],
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
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
    CapacitorHttp: {
      enabled: true,
    },
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: true, // Enable for debugging crashes
    // Performance optimizations
    backgroundColor: '#0A0A0A',
    // Memory and performance settings
    overrideUserAgent: 'FaceConnect/2.5.0 Android',
    appendUserAgent: 'FaceConnect/2.5.0',
    // WebView optimizations
    useLegacyBridge: false,
  },
  ios: {
    contentInset: 'automatic',
    backgroundColor: '#0A0A0A',
    preferredContentMode: 'mobile',
  },
};

export default config;
