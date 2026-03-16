// Native Capacitor Plugin Wrapper
// This file provides a unified interface for native mobile features

import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Geolocation } from '@capacitor/geolocation';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Share } from '@capacitor/share';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { PushNotifications } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Browser } from '@capacitor/browser';

// Check if running on native platform
export const isNative = Capacitor.isNativePlatform();
export const platform = Capacitor.getPlatform(); // 'web', 'ios', 'android'

// ============== CAMERA ==============
export const nativeCamera = {
  // Take a photo
  async takePhoto() {
    if (!isNative) {
      // Fallback to web API
      return null;
    }
    
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Camera,
        saveToGallery: true,
      });
      
      return {
        base64: image.base64String,
        format: image.format,
        webPath: image.webPath,
      };
    } catch (error) {
      console.error('Camera error:', error);
      return null;
    }
  },
  
  // Pick from gallery
  async pickFromGallery() {
    if (!isNative) return null;
    
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Photos,
      });
      
      return {
        base64: image.base64String,
        format: image.format,
        webPath: image.webPath,
      };
    } catch (error) {
      console.error('Gallery error:', error);
      return null;
    }
  },
  
  // Check permissions
  async checkPermissions() {
    if (!isNative) return { camera: 'granted', photos: 'granted' };
    return await Camera.checkPermissions();
  },
  
  // Request permissions
  async requestPermissions() {
    if (!isNative) return { camera: 'granted', photos: 'granted' };
    return await Camera.requestPermissions();
  },
};

// ============== GEOLOCATION ==============
export const nativeGeolocation = {
  async getCurrentPosition() {
    if (!isNative) {
      // Fallback to web API
      return new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          }),
          (err) => reject(err)
        );
      });
    }
    
    try {
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000,
      });
      
      return {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
      };
    } catch (error) {
      console.error('Geolocation error:', error);
      throw error;
    }
  },
  
  async checkPermissions() {
    if (!isNative) return { location: 'granted' };
    return await Geolocation.checkPermissions();
  },
  
  async requestPermissions() {
    if (!isNative) return { location: 'granted' };
    return await Geolocation.requestPermissions();
  },
};

// ============== HAPTICS ==============
export const nativeHaptics = {
  // Light impact
  light() {
    if (!isNative) {
      if ('vibrate' in navigator) navigator.vibrate(10);
      return;
    }
    Haptics.impact({ style: ImpactStyle.Light });
  },
  
  // Medium impact
  medium() {
    if (!isNative) {
      if ('vibrate' in navigator) navigator.vibrate(20);
      return;
    }
    Haptics.impact({ style: ImpactStyle.Medium });
  },
  
  // Heavy impact
  heavy() {
    if (!isNative) {
      if ('vibrate' in navigator) navigator.vibrate(40);
      return;
    }
    Haptics.impact({ style: ImpactStyle.Heavy });
  },
  
  // Success notification
  success() {
    if (!isNative) {
      if ('vibrate' in navigator) navigator.vibrate([10, 50, 10]);
      return;
    }
    Haptics.notification({ type: NotificationType.Success });
  },
  
  // Warning notification
  warning() {
    if (!isNative) {
      if ('vibrate' in navigator) navigator.vibrate([20, 50, 20]);
      return;
    }
    Haptics.notification({ type: NotificationType.Warning });
  },
  
  // Error notification
  error() {
    if (!isNative) {
      if ('vibrate' in navigator) navigator.vibrate([30, 50, 30, 50, 30]);
      return;
    }
    Haptics.notification({ type: NotificationType.Error });
  },
  
  // Vibrate for duration
  vibrate(duration = 100) {
    if (!isNative) {
      if ('vibrate' in navigator) navigator.vibrate(duration);
      return;
    }
    Haptics.vibrate({ duration });
  },
};

// ============== SHARE ==============
export const nativeShare = {
  async share({ title, text, url, files }) {
    if (!isNative) {
      // Fallback to Web Share API
      if (navigator.share) {
        try {
          await navigator.share({ title, text, url });
          return { shared: true };
        } catch (e) {
          return { shared: false };
        }
      }
      return { shared: false };
    }
    
    try {
      await Share.share({
        title,
        text,
        url,
        dialogTitle: 'Share with friends',
      });
      return { shared: true };
    } catch (error) {
      console.error('Share error:', error);
      return { shared: false };
    }
  },
  
  async canShare() {
    if (!isNative) return !!navigator.share;
    return true;
  },
};

// ============== STATUS BAR ==============
export const nativeStatusBar = {
  async setDarkContent() {
    if (!isNative) return;
    await StatusBar.setStyle({ style: Style.Dark });
  },
  
  async setLightContent() {
    if (!isNative) return;
    await StatusBar.setStyle({ style: Style.Light });
  },
  
  async setBackgroundColor(color) {
    if (!isNative) return;
    await StatusBar.setBackgroundColor({ color });
  },
  
  async hide() {
    if (!isNative) return;
    await StatusBar.hide();
  },
  
  async show() {
    if (!isNative) return;
    await StatusBar.show();
  },
};

// ============== SPLASH SCREEN ==============
export const nativeSplash = {
  async hide() {
    if (!isNative) return;
    await SplashScreen.hide();
  },
  
  async show() {
    if (!isNative) return;
    await SplashScreen.show({
      autoHide: false,
    });
  },
};

// ============== PUSH NOTIFICATIONS ==============
export const nativePush = {
  async register() {
    if (!isNative) return null;
    
    try {
      // Request permission
      const permStatus = await PushNotifications.requestPermissions();
      
      if (permStatus.receive === 'granted') {
        // Register for push notifications
        await PushNotifications.register();
      }
      
      return permStatus;
    } catch (error) {
      console.error('Push registration error:', error);
      return null;
    }
  },
  
  addListeners({ onRegistration, onNotification, onAction }) {
    if (!isNative) return () => {};
    
    const registrationListener = PushNotifications.addListener('registration', onRegistration);
    const notificationListener = PushNotifications.addListener('pushNotificationReceived', onNotification);
    const actionListener = PushNotifications.addListener('pushNotificationActionPerformed', onAction);
    
    // Return cleanup function
    return async () => {
      (await registrationListener).remove();
      (await notificationListener).remove();
      (await actionListener).remove();
    };
  },
};

// ============== LOCAL NOTIFICATIONS ==============
export const nativeLocalNotifications = {
  async schedule({ id, title, body, schedule }) {
    if (!isNative) {
      // Fallback to web notifications
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, { body });
      }
      return;
    }
    
    await LocalNotifications.schedule({
      notifications: [{
        id,
        title,
        body,
        schedule,
        sound: 'default',
        smallIcon: 'ic_stat_icon',
      }],
    });
  },
  
  async cancel(id) {
    if (!isNative) return;
    await LocalNotifications.cancel({ notifications: [{ id }] });
  },
  
  async checkPermissions() {
    if (!isNative) return { display: 'granted' };
    return await LocalNotifications.checkPermissions();
  },
  
  async requestPermissions() {
    if (!isNative) return { display: 'granted' };
    return await LocalNotifications.requestPermissions();
  },
};

// ============== BROWSER ==============
export const nativeBrowser = {
  async open(url) {
    if (!isNative) {
      window.open(url, '_blank');
      return;
    }
    
    await Browser.open({
      url,
      toolbarColor: '#0A0A0A',
      presentationStyle: 'popover',
    });
  },
  
  async close() {
    if (!isNative) return;
    await Browser.close();
  },
};

// ============== FILESYSTEM ==============
export const nativeFilesystem = {
  async writeFile(path, data, directory = Directory.Documents) {
    if (!isNative) {
      // Fallback: trigger download
      const blob = new Blob([data]);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = path;
      a.click();
      URL.revokeObjectURL(url);
      return;
    }
    
    await Filesystem.writeFile({
      path,
      data,
      directory,
    });
  },
  
  async readFile(path, directory = Directory.Documents) {
    if (!isNative) return null;
    
    const result = await Filesystem.readFile({
      path,
      directory,
    });
    
    return result.data;
  },
  
  async deleteFile(path, directory = Directory.Documents) {
    if (!isNative) return;
    
    await Filesystem.deleteFile({
      path,
      directory,
    });
  },
};

// Initialize native features on app start
export async function initializeNativeFeatures() {
  if (!isNative) {
    console.log('Running in web mode');
    return;
  }
  
  console.log(`Running on ${platform}`);
  
  // Hide splash screen after a delay
  setTimeout(() => {
    nativeSplash.hide();
  }, 1500);
  
  // Set status bar style
  nativeStatusBar.setDarkContent();
  nativeStatusBar.setBackgroundColor('#0A0A0A');
  
  // Register for push notifications
  nativePush.register();
}

export default {
  isNative,
  platform,
  camera: nativeCamera,
  geolocation: nativeGeolocation,
  haptics: nativeHaptics,
  share: nativeShare,
  statusBar: nativeStatusBar,
  splash: nativeSplash,
  push: nativePush,
  localNotifications: nativeLocalNotifications,
  browser: nativeBrowser,
  filesystem: nativeFilesystem,
  initialize: initializeNativeFeatures,
};
