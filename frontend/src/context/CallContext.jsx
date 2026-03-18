import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';

const CallContext = createContext(null);

export function CallProvider({ children }) {
  const { ws, user } = useAuth();
  
  // Active call state
  const [activeCall, setActiveCall] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);
  const [callHistory, setCallHistory] = useState([]);
  
  // Ringtone
  const ringtoneRef = useRef(null);
  
  // Play ringtone for incoming calls
  const playRingtone = useCallback(() => {
    try {
      if (!ringtoneRef.current) {
        ringtoneRef.current = new Audio('/sounds/ringtone.wav');
        ringtoneRef.current.loop = true;
      }
      ringtoneRef.current.play().catch(e => console.log('Ringtone play failed:', e));
    } catch (e) {
      console.error('Ringtone error:', e);
    }
  }, []);
  
  const stopRingtone = useCallback(() => {
    if (ringtoneRef.current) {
      ringtoneRef.current.pause();
      ringtoneRef.current.currentTime = 0;
    }
  }, []);
  
  // Handle incoming call
  const handleIncomingCall = useCallback((data) => {
    // Don't show if already in a call
    if (activeCall) {
      // Send busy signal
      return;
    }
    
    setIncomingCall({
      callId: data.call_id,
      callerId: data.caller_id,
      callerName: data.caller_name,
      callerAvatar: data.caller_avatar,
      callType: data.call_type,
      receivedAt: new Date()
    });
    
    playRingtone();
    
    // Vibrate on mobile
    if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200, 100, 200]);
    }
  }, [activeCall, playRingtone]);
  
  // Answer call
  const answerCall = useCallback(() => {
    if (!incomingCall) return;
    
    stopRingtone();
    setActiveCall({
      ...incomingCall,
      isIncoming: true,
      status: 'connecting'
    });
    setIncomingCall(null);
    
    // Stop vibration
    if (navigator.vibrate) {
      navigator.vibrate(0);
    }
  }, [incomingCall, stopRingtone]);
  
  // Decline call
  const declineCall = useCallback(async () => {
    if (!incomingCall) return;
    
    stopRingtone();
    
    // Stop vibration
    if (navigator.vibrate) {
      navigator.vibrate(0);
    }
    
    setIncomingCall(null);
  }, [incomingCall, stopRingtone]);
  
  // Start outgoing call
  const startCall = useCallback((recipient, callType = 'video') => {
    if (activeCall) return;
    
    setActiveCall({
      recipientId: recipient.id,
      recipientName: recipient.display_name || recipient.username,
      recipientAvatar: recipient.avatar,
      callType,
      isIncoming: false,
      status: 'calling'
    });
  }, [activeCall]);
  
  // End call
  const endCall = useCallback(() => {
    stopRingtone();
    setActiveCall(null);
    setIncomingCall(null);
    
    // Stop vibration
    if (navigator.vibrate) {
      navigator.vibrate(0);
    }
  }, [stopRingtone]);
  
  // Listen for WebSocket call events
  useEffect(() => {
    if (!ws) return;
    
    const handleMessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
          case 'incoming_call':
            handleIncomingCall(data);
            break;
          case 'call_answered':
            if (activeCall) {
              setActiveCall(prev => ({ ...prev, status: 'connected' }));
            }
            break;
          case 'call_rejected':
            stopRingtone();
            setActiveCall(null);
            break;
          case 'call_ended':
            stopRingtone();
            setActiveCall(null);
            break;
          default:
            break;
        }
      } catch (e) {
        // Not JSON or parsing error
      }
    };
    
    ws.addEventListener('message', handleMessage);
    return () => ws.removeEventListener('message', handleMessage);
  }, [ws, activeCall, handleIncomingCall, stopRingtone]);
  
  // Auto-decline after 45 seconds
  useEffect(() => {
    if (!incomingCall) return;
    
    const timeout = setTimeout(() => {
      declineCall();
    }, 45000);
    
    return () => clearTimeout(timeout);
  }, [incomingCall, declineCall]);
  
  const value = {
    activeCall,
    incomingCall,
    callHistory,
    answerCall,
    declineCall,
    startCall,
    endCall,
    setActiveCall
  };
  
  return (
    <CallContext.Provider value={value}>
      {children}
    </CallContext.Provider>
  );
}

export function useCall() {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error('useCall must be used within a CallProvider');
  }
  return context;
}

export default CallContext;
