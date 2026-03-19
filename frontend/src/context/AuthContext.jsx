import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { 
  isPushSupported, 
  subscribeToPush, 
  unsubscribeFromPush, 
  isSubscribed,
  getPermissionStatus,
  requestPermission 
} from '@/utils/pushNotifications';

// Ensure API URL doesn't have trailing slash and is properly formatted
// For Electron production builds, provide a fallback URL if the env variable is not set
const FALLBACK_URL = 'https://profile-connector-3.preview.emergentagent.com';
const BACKEND_URL = (process.env.REACT_APP_BACKEND_URL || FALLBACK_URL).replace(/\/+$/, '');
const API = `${BACKEND_URL}/api`;
const WS_URL = BACKEND_URL?.replace('https://', 'wss://').replace('http://', 'ws://');

// Log API configuration for debugging
console.log('[AuthContext] API Configuration:', { 
  BACKEND_URL, 
  API,
  isElectron: typeof window !== 'undefined' && window.electronAPI?.isElectron 
});

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('auth_token'));
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushPermission, setPushPermission] = useState('default');
  const socketRef = useRef(null);

  // Check push notification status
  useEffect(() => {
    const checkPushStatus = async () => {
      if (isPushSupported()) {
        setPushPermission(getPermissionStatus());
        const subscribed = await isSubscribed();
        setPushEnabled(subscribed);
      }
    };
    checkPushStatus();
  }, []);

  // Load user on mount
  useEffect(() => {
    const loadUser = async () => {
      if (token) {
        try {
          const response = await axios.get(`${API}/auth/me?token=${token}`);
          setUser(response.data);
        } catch (err) {
          console.error('Failed to load user:', err);
          localStorage.removeItem('auth_token');
          setToken(null);
        }
      }
      setLoading(false);
    };

    loadUser();
  }, [token]);

  // WebSocket connection
  useEffect(() => {
    if (token && user && !socketRef.current) {
      const ws = new WebSocket(`${WS_URL}/ws/${token}`);
      
      ws.onopen = () => {
        console.log('WebSocket connected');
        socketRef.current = ws;
        setSocket(ws);
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleWebSocketMessage(data);
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        socketRef.current = null;
        setSocket(null);
        
        // Reconnect after 3 seconds
        setTimeout(() => {
          if (token && user) {
            // Trigger reconnection by updating state
            setSocket(null);
          }
        }, 3000);
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      return () => {
        ws.close();
        socketRef.current = null;
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, user]);

  const handleWebSocketMessage = useCallback((data) => {
    switch (data.type) {
      case 'new_message':
        // Add notification
        setNotifications(prev => [{
          id: Date.now(),
          type: 'message',
          data: data,
          read: false,
          timestamp: new Date()
        }, ...prev]);
        
        // Dispatch custom event for chat components
        window.dispatchEvent(new CustomEvent('chat_message', { detail: data }));
        break;
        
      case 'typing':
        window.dispatchEvent(new CustomEvent('chat_typing', { detail: data }));
        break;
        
      case 'read':
        window.dispatchEvent(new CustomEvent('chat_read', { detail: data }));
        break;
        
      case 'user_online':
      case 'user_offline':
        // Include type in detail for handlers to distinguish online/offline
        window.dispatchEvent(new CustomEvent('user_status', { 
          detail: {
            ...data,
            type: data.type
          }
        }));
        break;
      
      // Call-related events - dispatch for CallContext to handle
      case 'incoming_call':
      case 'call_answered':
      case 'call_rejected':
      case 'call_ended':
      case 'call_signal':
        window.dispatchEvent(new CustomEvent('call_event', { detail: data }));
        break;
        
      default:
        break;
    }
  }, []);

  const register = async (username, email, password, displayName) => {
    const response = await axios.post(`${API}/auth/register`, {
      username,
      email,
      password,
      display_name: displayName
    });
    
    const { token: newToken, user: newUser } = response.data;
    localStorage.setItem('auth_token', newToken);
    setToken(newToken);
    setUser(newUser);
    
    return response.data;
  };

  // Set user and token directly (for OAuth callbacks)
  const setUserAndToken = (newUser, newToken) => {
    localStorage.setItem('auth_token', newToken);
    setToken(newToken);
    setUser(newUser);
  };

  const login = async (email, password) => {
    try {
      console.log('Login attempt to:', `${API}/auth/login`);
      const response = await axios.post(`${API}/auth/login`, {
        email,
        password
      });
      
      const { token: newToken, user: newUser } = response.data;
      localStorage.setItem('auth_token', newToken);
      setToken(newToken);
      setUser(newUser);
      
      return response.data;
    } catch (error) {
      console.error('Login error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message,
        config: {
          url: error.config?.url,
          method: error.config?.method
        }
      });
      throw error;
    }
  };

  const logout = async () => {
    if (token) {
      try {
        const formData = new FormData();
        formData.append('token', token);
        await axios.post(`${API}/auth/logout`, formData);
      } catch (err) {
        console.error('Logout error:', err);
      }
    }
    
    localStorage.removeItem('auth_token');
    setToken(null);
    setUser(null);
    
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
  };

  const updateProfile = async (data) => {
    const response = await axios.put(`${API}/auth/profile?token=${token}`, data);
    setUser(response.data);
    return response.data;
  };

  const sendTyping = (conversationId, isTyping) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'typing',
        conversation_id: conversationId,
        is_typing: isTyping
      }));
    }
  };

  const sendReadReceipt = (conversationId) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'read',
        conversation_id: conversationId
      }));
    }
  };

  const clearNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  const markNotificationRead = (id) => {
    setNotifications(prev => prev.map(n => 
      n.id === id ? { ...n, read: true } : n
    ));
  };

  // Enable push notifications
  const enablePushNotifications = async () => {
    if (!token) return { success: false, reason: 'not_authenticated' };
    
    try {
      await subscribeToPush(token);
      setPushEnabled(true);
      setPushPermission('granted');
      return { success: true };
    } catch (error) {
      console.error('Failed to enable push notifications:', error);
      return { success: false, reason: error.message };
    }
  };

  // Disable push notifications
  const disablePushNotifications = async () => {
    if (!token) return;
    
    try {
      await unsubscribeFromPush(token);
      setPushEnabled(false);
    } catch (error) {
      console.error('Failed to disable push notifications:', error);
    }
  };

  // Request push permission only (without subscribing)
  const requestPushPermission = async () => {
    const result = await requestPermission();
    setPushPermission(result.permission);
    return result;
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      socket,
      notifications,
      unreadCount,
      pushEnabled,
      pushPermission,
      isPushSupported: isPushSupported(),
      register,
      login,
      logout,
      updateProfile,
      setUserAndToken,
      sendTyping,
      sendReadReceipt,
      clearNotification,
      clearAllNotifications,
      markNotificationRead,
      enablePushNotifications,
      disablePushNotifications,
      requestPushPermission,
      isAuthenticated: !!user
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
