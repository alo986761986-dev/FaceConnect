/**
 * Real-time Notification Service for FaceConnect
 * Handles incoming message and call notifications using Local Notifications (no Firebase required)
 */
import { Capacitor } from '@capacitor/core';
import { toast } from 'sonner';

// Check if running on native platform
const isNative = () => Capacitor.isNativePlatform();
const getPlatform = () => Capacitor.getPlatform();

// Store for notification IDs to prevent duplicates
let notificationIdCounter = 1;
const shownNotifications = new Set();

// App state tracking
let isAppInForeground = true;

/**
 * Initialize the notification service
 * Should be called once when app starts
 */
export const initializeNotificationService = async () => {
  console.log('[NotificationService] Initializing...', { isNative: isNative(), platform: getPlatform() });
  
  try {
    // Request notification permission on native
    if (isNative()) {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      
      // Check permission
      const permStatus = await LocalNotifications.checkPermissions();
      console.log('[NotificationService] Permission status:', permStatus);
      
      if (permStatus.display !== 'granted') {
        const result = await LocalNotifications.requestPermissions();
        console.log('[NotificationService] Permission request result:', result);
      }
      
      // Set up notification click handler
      await LocalNotifications.addListener('localNotificationActionPerformed', (notification) => {
        console.log('[NotificationService] Notification clicked:', notification);
        handleNotificationClick(notification);
      });
      
      // Set up notification received handler (foreground)
      await LocalNotifications.addListener('localNotificationReceived', (notification) => {
        console.log('[NotificationService] Notification received:', notification);
      });
    }
    
    // Track app state using Capacitor App plugin
    if (isNative()) {
      try {
        const { App } = await import('@capacitor/app');
        
        await App.addListener('appStateChange', ({ isActive }) => {
          isAppInForeground = isActive;
          console.log('[NotificationService] App state changed:', isActive ? 'foreground' : 'background');
        });
      } catch (e) {
        console.log('[NotificationService] App plugin not available:', e.message);
      }
    }
    
    // Web Notification permission
    if (!isNative() && 'Notification' in window) {
      if (Notification.permission === 'default') {
        const result = await Notification.requestPermission();
        console.log('[NotificationService] Web notification permission:', result);
      }
    }
    
    console.log('[NotificationService] Initialized successfully');
    return true;
  } catch (error) {
    console.error('[NotificationService] Initialization error:', error);
    return false;
  }
};

/**
 * Show notification for incoming message
 */
export const showMessageNotification = async (messageData) => {
  const { sender_name, sender_avatar, content, conversation_id, message_id } = messageData;
  
  // Generate unique notification ID
  const notificationId = notificationIdCounter++;
  
  // Prevent duplicate notifications
  const notificationKey = `msg_${message_id || Date.now()}`;
  if (shownNotifications.has(notificationKey)) {
    return;
  }
  shownNotifications.add(notificationKey);
  
  // Clean old entries (keep last 100)
  if (shownNotifications.size > 100) {
    const entries = Array.from(shownNotifications);
    entries.slice(0, 50).forEach(key => shownNotifications.delete(key));
  }
  
  const title = sender_name || 'New Message';
  const body = content?.length > 100 ? content.substring(0, 100) + '...' : content || 'You have a new message';
  
  console.log('[NotificationService] Showing message notification:', { title, body, isAppInForeground });
  
  // If app is in foreground, show toast instead
  if (isAppInForeground && isNative()) {
    // On native in foreground, we can use toast
    toast.info(`${title}: ${body}`, {
      duration: 4000,
    });
    return;
  }
  
  // Show local notification
  if (isNative()) {
    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      
      await LocalNotifications.schedule({
        notifications: [{
          id: notificationId,
          title: title,
          body: body,
          sound: 'default',
          smallIcon: 'ic_stat_icon',
          largeIcon: sender_avatar || 'ic_launcher',
          iconColor: '#00a884',
          channelId: 'messages',
          extra: {
            type: 'message',
            conversation_id,
            message_id
          },
          schedule: { at: new Date(Date.now() + 100) }, // Immediate
        }]
      });
      
      console.log('[NotificationService] Message notification scheduled');
    } catch (error) {
      console.error('[NotificationService] Failed to show message notification:', error);
    }
  } else if ('Notification' in window && Notification.permission === 'granted') {
    // Web notification
    new Notification(title, {
      body,
      icon: sender_avatar || '/icons/icon-192x192.png',
      tag: notificationKey,
      renotify: true,
    });
  }
};

/**
 * Show notification for incoming call
 */
export const showCallNotification = async (callData) => {
  const { caller_name, caller_avatar, call_type, call_id } = callData;
  
  const notificationId = notificationIdCounter++;
  
  const title = `Incoming ${call_type === 'video' ? 'Video' : 'Voice'} Call`;
  const body = `${caller_name || 'Someone'} is calling you`;
  
  console.log('[NotificationService] Showing call notification:', { title, body });
  
  // Always show call notification (even in foreground on native)
  if (isNative()) {
    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      
      await LocalNotifications.schedule({
        notifications: [{
          id: notificationId,
          title: title,
          body: body,
          sound: 'default',
          smallIcon: 'ic_stat_icon',
          iconColor: '#00a884',
          channelId: 'calls',
          ongoing: true, // Keep notification until call ends
          autoCancel: false,
          extra: {
            type: 'call',
            call_id,
            call_type,
            caller_name
          },
          schedule: { at: new Date(Date.now() + 100) },
        }]
      });
      
      console.log('[NotificationService] Call notification scheduled');
      return notificationId;
    } catch (error) {
      console.error('[NotificationService] Failed to show call notification:', error);
    }
  } else if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, {
      body,
      icon: caller_avatar || '/icons/icon-192x192.png',
      tag: `call_${call_id}`,
      requireInteraction: true,
    });
  }
  
  return notificationId;
};

/**
 * Cancel a specific notification (e.g., when call ends)
 */
export const cancelNotification = async (notificationId) => {
  if (isNative() && notificationId) {
    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      await LocalNotifications.cancel({ notifications: [{ id: notificationId }] });
      console.log('[NotificationService] Notification cancelled:', notificationId);
    } catch (error) {
      console.error('[NotificationService] Failed to cancel notification:', error);
    }
  }
};

/**
 * Handle notification click
 */
const handleNotificationClick = (notification) => {
  const extra = notification.notification?.extra || {};
  
  if (extra.type === 'message' && extra.conversation_id) {
    // Navigate to conversation
    window.dispatchEvent(new CustomEvent('navigate_to_chat', { 
      detail: { conversation_id: extra.conversation_id }
    }));
  } else if (extra.type === 'call' && extra.call_id) {
    // Open call screen
    window.dispatchEvent(new CustomEvent('open_call', { 
      detail: { 
        call_id: extra.call_id,
        call_type: extra.call_type,
        caller_name: extra.caller_name
      }
    }));
  }
};

/**
 * Create notification channels (Android only)
 */
export const createNotificationChannels = async () => {
  if (isNative() && getPlatform() === 'android') {
    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      
      await LocalNotifications.createChannel({
        id: 'messages',
        name: 'Messages',
        description: 'Chat message notifications',
        importance: 4, // HIGH
        visibility: 0, // PRIVATE
        sound: 'default',
        vibration: true,
        lights: true,
        lightColor: '#00a884'
      });
      
      await LocalNotifications.createChannel({
        id: 'calls',
        name: 'Calls',
        description: 'Incoming call notifications',
        importance: 5, // MAX
        visibility: 1, // PUBLIC
        sound: 'default',
        vibration: true,
        lights: true,
        lightColor: '#00a884'
      });
      
      console.log('[NotificationService] Notification channels created');
    } catch (error) {
      console.error('[NotificationService] Failed to create channels:', error);
    }
  }
};

/**
 * Show typing indicator notification (optional, for active conversations)
 */
export const showTypingNotification = async (senderName) => {
  // This could show a subtle notification or update existing one
  // For now, just dispatch an event
  window.dispatchEvent(new CustomEvent('typing_indicator', { 
    detail: { sender_name: senderName }
  }));
};

export default {
  initializeNotificationService,
  showMessageNotification,
  showCallNotification,
  cancelNotification,
  createNotificationChannels,
  showTypingNotification
};
