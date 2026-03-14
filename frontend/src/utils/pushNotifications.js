// Push notification utilities
const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Check if push notifications are supported
export const isPushSupported = () => {
  return 'serviceWorker' in navigator && 
         'PushManager' in window && 
         'Notification' in window;
};

// Get current permission status
export const getPermissionStatus = () => {
  if (!isPushSupported()) return 'unsupported';
  return Notification.permission;
};

// Request notification permission
export const requestPermission = async () => {
  if (!isPushSupported()) {
    return { granted: false, reason: 'unsupported' };
  }
  
  const permission = await Notification.requestPermission();
  return { 
    granted: permission === 'granted',
    permission 
  };
};

// Convert VAPID key from base64 to Uint8Array
const urlBase64ToUint8Array = (base64String) => {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

// Get VAPID public key from server
export const getVapidPublicKey = async () => {
  try {
    const response = await fetch(`${API}/push/vapid-public-key`);
    const data = await response.json();
    return data.publicKey;
  } catch (error) {
    console.error('Failed to get VAPID public key:', error);
    return null;
  }
};

// Subscribe to push notifications
export const subscribeToPush = async (token) => {
  if (!isPushSupported()) {
    throw new Error('Push notifications not supported');
  }
  
  // Request permission first
  const { granted } = await requestPermission();
  if (!granted) {
    throw new Error('Permission denied');
  }
  
  // Get service worker registration
  const registration = await navigator.serviceWorker.ready;
  
  // Check if already subscribed
  let subscription = await registration.pushManager.getSubscription();
  
  if (!subscription) {
    // Get VAPID public key
    const vapidPublicKey = await getVapidPublicKey();
    if (!vapidPublicKey) {
      throw new Error('Failed to get VAPID public key');
    }
    
    // Subscribe
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
    });
  }
  
  // Send subscription to server
  const response = await fetch(`${API}/push/subscribe?token=${token}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      subscription: {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('p256dh')))),
          auth: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('auth'))))
        }
      }
    })
  });
  
  if (!response.ok) {
    throw new Error('Failed to save subscription');
  }
  
  return subscription;
};

// Unsubscribe from push notifications
export const unsubscribeFromPush = async (token) => {
  if (!isPushSupported()) return;
  
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  
  if (subscription) {
    // Unsubscribe locally
    await subscription.unsubscribe();
    
    // Remove from server
    await fetch(`${API}/push/unsubscribe?token=${token}&endpoint=${encodeURIComponent(subscription.endpoint)}`, {
      method: 'DELETE'
    });
  }
};

// Check if user is subscribed
export const isSubscribed = async () => {
  if (!isPushSupported()) return false;
  
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return !!subscription;
  } catch {
    return false;
  }
};

// Show a local notification (for in-app use)
export const showLocalNotification = (title, options = {}) => {
  if (!isPushSupported() || Notification.permission !== 'granted') {
    return null;
  }
  
  return new Notification(title, {
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    ...options
  });
};
