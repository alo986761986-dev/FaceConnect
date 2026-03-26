// Device permissions utility with Capacitor native support
import { Capacitor } from '@capacitor/core';

// Check if running on native platform
export const isNative = () => Capacitor.isNativePlatform();
export const getPlatform = () => Capacitor.getPlatform();

export const PERMISSIONS = {
  CAMERA: 'camera',
  MICROPHONE: 'microphone',
  LOCATION: 'geolocation',
  CONTACTS: 'contacts',
  GALLERY: 'photos',
  NOTIFICATIONS: 'notifications'
};

// Check if permission API is supported
export const isPermissionSupported = () => {
  return 'permissions' in navigator;
};

// Request camera permission
export const requestCameraPermission = async () => {
  try {
    // Try Capacitor Camera first
    if (isNative()) {
      const { Camera } = await import('@capacitor/camera');
      const status = await Camera.checkPermissions();
      
      if (status.camera !== 'granted' || status.photos !== 'granted') {
        const result = await Camera.requestPermissions({ permissions: ['camera', 'photos'] });
        return { 
          granted: result.camera === 'granted', 
          status: result.camera,
          photos: result.photos 
        };
      }
      return { granted: true, status: 'granted', photos: status.photos };
    }
    
    // Web fallback
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    stream.getTracks().forEach(track => track.stop());
    return { granted: true, status: 'granted' };
  } catch (error) {
    if (error.name === 'NotAllowedError') {
      return { granted: false, status: 'denied', error: 'Camera access denied' };
    }
    return { granted: false, status: 'error', error: error.message };
  }
};

// Request microphone permission
export const requestMicrophonePermission = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach(track => track.stop());
    return { granted: true, status: 'granted' };
  } catch (error) {
    if (error.name === 'NotAllowedError') {
      return { granted: false, status: 'denied', error: 'Microphone access denied' };
    }
    return { granted: false, status: 'error', error: error.message };
  }
};

// Request location permission
export const requestLocationPermission = async () => {
  try {
    // Try Capacitor Geolocation first
    if (isNative()) {
      const { Geolocation } = await import('@capacitor/geolocation');
      const status = await Geolocation.checkPermissions();
      
      if (status.location !== 'granted' && status.coarseLocation !== 'granted') {
        const result = await Geolocation.requestPermissions({ permissions: ['location', 'coarseLocation'] });
        return { 
          granted: result.location === 'granted' || result.coarseLocation === 'granted', 
          status: result.location 
        };
      }
      return { granted: true, status: 'granted' };
    }
    
    // Web fallback
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve({ granted: false, status: 'unsupported', error: 'Geolocation not supported' });
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({ 
            granted: true, 
            status: 'granted',
            position: {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude
            }
          });
        },
        (error) => {
          if (error.code === error.PERMISSION_DENIED) {
            resolve({ granted: false, status: 'denied', error: 'Location access denied' });
          } else {
            resolve({ granted: false, status: 'error', error: error.message });
          }
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  } catch (error) {
    return { granted: false, status: 'error', error: error.message };
  }
};

// Request push notification permission
export const requestNotificationPermission = async () => {
  try {
    // Try Capacitor PushNotifications first (if installed)
    if (isNative()) {
      try {
        // Dynamic import - will fail if plugin is not installed
        const pushModule = await import('@capacitor/push-notifications').catch(() => null);
        
        if (!pushModule) {
          console.warn('Push notifications plugin not installed - using local notifications only');
          // Fall back to local notifications
          return requestLocalNotificationPermission();
        }
        
        const { PushNotifications } = pushModule;
        
        let permStatus = await PushNotifications.checkPermissions();
        
        if (permStatus.receive !== 'granted') {
          permStatus = await PushNotifications.requestPermissions();
        }
        
        if (permStatus.receive === 'granted') {
          // Try to register for push notifications
          // This may fail if Firebase is not configured
          try {
            await PushNotifications.register();
            
            // Set up listeners
            PushNotifications.addListener('registration', (token) => {
              console.log('Push registration success, token:', token.value);
              localStorage.setItem('pushToken', token.value);
            });

            PushNotifications.addListener('registrationError', (error) => {
              console.error('Push registration error:', error);
              // Firebase not configured - this is expected if google-services.json is missing
            });

            PushNotifications.addListener('pushNotificationReceived', (notification) => {
              console.log('Push notification received:', notification);
            });

            PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
              console.log('Push notification action:', notification);
            });
          } catch (registerError) {
            // Firebase not initialized - google-services.json missing
            console.warn('Push notification registration skipped (Firebase not configured):', registerError.message);
            // Still return granted since permission was granted, just registration failed
            return { granted: true, status: 'granted', registered: false, note: 'Firebase not configured' };
          }
          
          return { granted: true, status: 'granted', registered: true };
        }
        
        return { granted: false, status: 'denied' };
      } catch (pushError) {
        // PushNotifications plugin error or not installed
        console.warn('Push notifications unavailable:', pushError.message);
        // Fall back to local notifications
        return requestLocalNotificationPermission();
      }
    }
    
    // Web fallback
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      return { granted: permission === 'granted', status: permission };
    }
    
    return { granted: false, status: 'unsupported' };
  } catch (error) {
    console.error('Notification permission error:', error);
    return { granted: false, status: 'error', error: error.message };
  }
};

// Request local notification permission
export const requestLocalNotificationPermission = async () => {
  try {
    if (isNative()) {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      
      const status = await LocalNotifications.checkPermissions();
      
      if (status.display !== 'granted') {
        const result = await LocalNotifications.requestPermissions();
        return { granted: result.display === 'granted', status: result.display };
      }
      
      return { granted: true, status: 'granted' };
    }
    
    // Web uses same permission as push notifications
    return requestNotificationPermission();
  } catch (error) {
    return { granted: false, status: 'error', error: error.message };
  }
};

// Request contacts permission (Contact Picker API)
export const requestContactsPermission = async () => {
  if (!('contacts' in navigator && 'ContactsManager' in window)) {
    return { granted: false, status: 'unsupported', error: 'Contacts API not supported' };
  }

  try {
    const props = ['name', 'tel', 'email'];
    const opts = { multiple: true };
    const contacts = await navigator.contacts.select(props, opts);
    return { granted: true, status: 'granted', contacts };
  } catch (error) {
    if (error.name === 'NotAllowedError') {
      return { granted: false, status: 'denied', error: 'Contacts access denied' };
    }
    return { granted: false, status: 'error', error: error.message };
  }
};

// Check permission status
export const checkPermission = async (permissionName) => {
  if (!isPermissionSupported()) {
    return 'unknown';
  }

  try {
    const result = await navigator.permissions.query({ name: permissionName });
    return result.state; // 'granted', 'denied', or 'prompt'
  } catch (error) {
    return 'unknown';
  }
};

// Check all permissions status
export const checkAllPermissions = async () => {
  const permissions = {
    camera: await checkPermission('camera'),
    microphone: await checkPermission('microphone'),
    geolocation: await checkPermission('geolocation'),
    notifications: await checkPermission('notifications'),
    contacts: 'contacts' in navigator ? 'prompt' : 'unsupported',
    gallery: 'prompt' // Always prompt as there's no direct API
  };
  
  return permissions;
};

// Request camera and microphone together for live streaming
export const requestLiveStreamPermissions = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: { 
        facingMode: 'user',
        width: { ideal: 1280 },
        height: { ideal: 720 }
      }, 
      audio: true 
    });
    
    return { 
      granted: true, 
      status: 'granted',
      stream,
      hasVideo: stream.getVideoTracks().length > 0,
      hasAudio: stream.getAudioTracks().length > 0
    };
  } catch (error) {
    // Stop any partial stream
    if (error.name === 'NotAllowedError') {
      return { 
        granted: false, 
        status: 'denied', 
        error: 'Camera and microphone access denied. Please allow access in your browser settings.',
        stream: null
      };
    }
    if (error.name === 'NotFoundError') {
      return { 
        granted: false, 
        status: 'not_found', 
        error: 'No camera or microphone found on this device.',
        stream: null
      };
    }
    if (error.name === 'NotReadableError') {
      return { 
        granted: false, 
        status: 'in_use', 
        error: 'Camera or microphone is already in use by another application.',
        stream: null
      };
    }
    return { 
      granted: false, 
      status: 'error', 
      error: error.message,
      stream: null
    };
  }
};

// Request ALL permissions at app startup
export const requestAllPermissions = async (onProgress) => {
  console.log('🔐 Requesting all permissions...');
  const results = {};
  
  onProgress?.('Requesting camera access...');
  results.camera = await requestCameraPermission();
  console.log('Camera permission:', results.camera);
  
  onProgress?.('Requesting microphone access...');
  results.microphone = await requestMicrophonePermission();
  console.log('Microphone permission:', results.microphone);
  
  onProgress?.('Requesting location access...');
  results.location = await requestLocationPermission();
  console.log('Location permission:', results.location);
  
  onProgress?.('Requesting notification access...');
  results.notifications = await requestNotificationPermission();
  console.log('Notification permission:', results.notifications);
  
  onProgress?.('Requesting local notification access...');
  results.localNotifications = await requestLocalNotificationPermission();
  console.log('Local notification permission:', results.localNotifications);
  
  // Store that we've requested permissions
  localStorage.setItem('permissionsRequested', 'true');
  localStorage.setItem('permissionResults', JSON.stringify(results));
  localStorage.setItem('permissionRequestTime', Date.now().toString());
  
  console.log('✅ All permissions requested:', results);
  return results;
};

// Check if permissions have been requested
export const hasRequestedPermissions = () => {
  return localStorage.getItem('permissionsRequested') === 'true';
};

// Get stored permission results
export const getStoredPermissionResults = () => {
  const stored = localStorage.getItem('permissionResults');
  return stored ? JSON.parse(stored) : null;
};

// Open gallery (file picker)
export const openGallery = (accept = 'image/*,video/*') => {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.multiple = true;
    
    input.onchange = (e) => {
      const files = Array.from(e.target.files || []);
      resolve({ granted: true, files });
    };
    
    input.oncancel = () => {
      resolve({ granted: false, files: [] });
    };
    
    input.click();
  });
};

// Schedule a local notification
export const scheduleLocalNotification = async (title, body, id = 1) => {
  try {
    if (isNative()) {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      await LocalNotifications.schedule({
        notifications: [
          {
            title,
            body,
            id,
            schedule: { at: new Date(Date.now() + 1000) },
            sound: 'default',
            smallIcon: 'ic_stat_icon',
            iconColor: '#00F0FF',
          },
        ],
      });
    } else if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body, icon: '/icons/icon-192x192.png' });
    }
  } catch (error) {
    console.error('Error scheduling notification:', error);
  }
};

// Export default object for convenience
export default {
  isNative,
  getPlatform,
  PERMISSIONS,
  requestAllPermissions,
  requestCameraPermission,
  requestMicrophonePermission,
  requestLocationPermission,
  requestNotificationPermission,
  requestLocalNotificationPermission,
  requestContactsPermission,
  requestLiveStreamPermissions,
  checkPermission,
  checkAllPermissions,
  hasRequestedPermissions,
  getStoredPermissionResults,
  openGallery,
  scheduleLocalNotification,
};
