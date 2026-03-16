// Mobile utilities for PWA features

// Haptic Feedback
export const haptic = {
  light: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  },
  medium: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(20);
    }
  },
  heavy: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate([30, 10, 30]);
    }
  },
  success: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate([10, 50, 20]);
    }
  },
  error: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate([50, 30, 50, 30, 50]);
    }
  },
  warning: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate([30, 20, 30, 20, 30]);
    }
  },
  notification: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate([100, 50, 100]);
    }
  }
};

// Share API
export const shareContent = async ({ title, text, url }) => {
  if (navigator.share) {
    try {
      await navigator.share({ title, text, url });
      return { success: true };
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Share failed:', err);
      }
      return { success: false, error: err };
    }
  }
  
  // Fallback: copy to clipboard
  try {
    await navigator.clipboard.writeText(url || text);
    return { success: true, fallback: 'clipboard' };
  } catch (err) {
    return { success: false, error: err };
  }
};

// Check if share is supported
export const canShare = () => {
  return 'share' in navigator;
};

// Wake Lock (keep screen on)
let wakeLock = null;

export const requestWakeLock = async () => {
  if ('wakeLock' in navigator) {
    try {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => {
        console.log('Wake lock released');
      });
      return true;
    } catch (err) {
      console.error('Wake lock error:', err);
      return false;
    }
  }
  return false;
};

export const releaseWakeLock = () => {
  if (wakeLock) {
    wakeLock.release();
    wakeLock = null;
  }
};

// Device orientation
export const getOrientation = () => {
  if (screen.orientation) {
    return screen.orientation.type;
  }
  return window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
};

export const lockOrientation = async (orientation = 'portrait') => {
  if (screen.orientation && screen.orientation.lock) {
    try {
      await screen.orientation.lock(orientation);
      return true;
    } catch (err) {
      console.error('Orientation lock error:', err);
      return false;
    }
  }
  return false;
};

// Network status
export const getNetworkStatus = () => {
  return {
    online: navigator.onLine,
    type: navigator.connection?.effectiveType || 'unknown',
    downlink: navigator.connection?.downlink || null,
    saveData: navigator.connection?.saveData || false
  };
};

// Battery status
export const getBatteryStatus = async () => {
  if ('getBattery' in navigator) {
    try {
      const battery = await navigator.getBattery();
      return {
        level: battery.level * 100,
        charging: battery.charging,
        chargingTime: battery.chargingTime,
        dischargingTime: battery.dischargingTime
      };
    } catch (err) {
      return null;
    }
  }
  return null;
};

// Storage estimate
export const getStorageEstimate = async () => {
  if (navigator.storage && navigator.storage.estimate) {
    const estimate = await navigator.storage.estimate();
    return {
      usage: estimate.usage,
      quota: estimate.quota,
      usagePercent: ((estimate.usage / estimate.quota) * 100).toFixed(2)
    };
  }
  return null;
};

// Request persistent storage
export const requestPersistentStorage = async () => {
  if (navigator.storage && navigator.storage.persist) {
    const isPersisted = await navigator.storage.persist();
    return isPersisted;
  }
  return false;
};

// Check if running as installed PWA
export const isInstalledPWA = () => {
  return window.matchMedia('(display-mode: standalone)').matches ||
         window.navigator.standalone === true;
};

// Get device info
export const getDeviceInfo = () => {
  const ua = navigator.userAgent;
  return {
    isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua),
    isIOS: /iPad|iPhone|iPod/.test(ua),
    isAndroid: /Android/.test(ua),
    isTouchDevice: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
    platform: navigator.platform,
    language: navigator.language,
    standalone: isInstalledPWA()
  };
};

// Request notification permission
export const requestNotificationPermission = async () => {
  if ('Notification' in window) {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  return false;
};

// Show local notification
export const showNotification = (title, options = {}) => {
  if ('Notification' in window && Notification.permission === 'granted') {
    const notification = new Notification(title, {
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      vibrate: [100, 50, 100],
      ...options
    });
    
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
    
    return notification;
  }
  return null;
};

// Subscribe to push notifications
export const subscribeToPush = async () => {
  if ('serviceWorker' in navigator && 'PushManager' in window) {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: null // Would need VAPID key for real push
      });
      return subscription;
    } catch (err) {
      console.error('Push subscription error:', err);
      return null;
    }
  }
  return null;
};
