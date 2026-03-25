import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, PhoneOff, Video, X, User } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useCall } from '@/context/CallContext';
import { useAuth } from '@/context/AuthContext';
import VideoCall from '@/components/chat/VideoCallEnhanced';

export default function IncomingCallOverlay() {
  const { incomingCall, activeCall, answerCall, declineCall, endCall } = useCall();
  const { token } = useAuth();
  const [showVideoCall, setShowVideoCall] = useState(false);
  
  // When call is answered, show the video call component
  useEffect(() => {
    if (activeCall?.isIncoming && activeCall?.status === 'connecting') {
      setShowVideoCall(true);
    }
  }, [activeCall]);
  
  // Handle answer
  const handleAnswer = () => {
    answerCall();
    setShowVideoCall(true);
  };
  
  // Handle decline
  const handleDecline = async () => {
    if (!incomingCall) return;
    
    try {
      const API_URL = process.env.REACT_APP_BACKEND_URL;
      await fetch(`${API_URL}/api/calls/${incomingCall.callId}/reject?token=${token}`, {
        method: 'POST'
      });
    } catch (e) {
      console.error('Failed to reject call:', e);
    }
    
    declineCall();
  };
  
  // Handle call end
  const handleCallEnd = () => {
    setShowVideoCall(false);
    endCall();
  };
  
  // Show VideoCall component when in active call
  if (showVideoCall && activeCall) {
    return (
      <VideoCall
        isOpen={true}
        onClose={handleCallEnd}
        callType={activeCall.callType}
        remoteUser={{
          id: activeCall.callerId || activeCall.recipientId,
          display_name: activeCall.callerName || activeCall.recipientName,
          avatar: activeCall.callerAvatar || activeCall.recipientAvatar
        }}
        isIncoming={activeCall.isIncoming}
        callId={activeCall.callId}
      />
    );
  }
  
  // No incoming call
  if (!incomingCall) return null;
  
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -100 }}
        className="fixed inset-x-0 top-0 z-[100] p-4 safe-area-inset-top"
        data-testid="incoming-call-overlay"
      >
        <motion.div
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          className="mx-auto max-w-md rounded-3xl overflow-hidden shadow-2xl"
          style={{
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
            border: '1px solid rgba(255,255,255,0.1)'
          }}
        >
          {/* Animated background pulse */}
          <div className="absolute inset-0 overflow-hidden">
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.3, 0.1, 0.3]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="absolute inset-0 bg-gradient-to-r from-green-500/20 to-blue-500/20 rounded-full blur-3xl"
            />
          </div>
          
          <div className="relative p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                {incomingCall.callType === 'video' ? (
                  <Video className="w-5 h-5 text-[#00F0FF]" />
                ) : (
                  <Phone className="w-5 h-5 text-green-400" />
                )}
                <span className="text-sm text-gray-400">
                  Incoming {incomingCall.callType === 'video' ? 'Video' : 'Voice'} Call
                </span>
              </div>
              <motion.div
                animate={{ opacity: [1, 0.5, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="w-2 h-2 rounded-full bg-green-500"
              />
            </div>
            
            {/* Caller Info */}
            <div className="flex items-center gap-4 mb-6">
              <div className="relative">
                <Avatar className="w-16 h-16 ring-2 ring-white/20">
                  <AvatarImage src={incomingCall.callerAvatar} />
                  <AvatarFallback className="bg-gradient-to-br from-[#00F0FF] to-[#7000FF] text-white text-xl">
                    {(incomingCall.callerName || 'U')[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <motion.div
                  animate={{ scale: [1, 1.3, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center"
                >
                  <Phone className="w-3 h-3 text-white" />
                </motion.div>
              </div>
              
              <div className="flex-1 min-w-0">
                <h3 className="text-xl font-semibold text-white truncate">
                  {incomingCall.callerName || 'Unknown'}
                </h3>
                <p className="text-sm text-gray-400">
                  {incomingCall.callType === 'video' ? 'Video calling you...' : 'Calling you...'}
                </p>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center justify-center gap-8">
              {/* Decline Button */}
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleDecline}
                className="relative"
                data-testid="decline-incoming-call"
              >
                <div className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center shadow-lg shadow-red-500/30">
                  <PhoneOff className="w-7 h-7 text-white" />
                </div>
                <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs text-gray-400 whitespace-nowrap">
                  Decline
                </span>
              </motion.button>
              
              {/* Answer Button */}
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleAnswer}
                className="relative"
                data-testid="answer-incoming-call"
              >
                <motion.div
                  animate={{ boxShadow: ['0 0 0 0 rgba(34, 197, 94, 0.4)', '0 0 0 20px rgba(34, 197, 94, 0)', '0 0 0 0 rgba(34, 197, 94, 0)'] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center"
                >
                  {incomingCall.callType === 'video' ? (
                    <Video className="w-7 h-7 text-white" />
                  ) : (
                    <Phone className="w-7 h-7 text-white" />
                  )}
                </motion.div>
                <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs text-gray-400 whitespace-nowrap">
                  Answer
                </span>
              </motion.button>
            </div>
            
            {/* Slide to answer hint - mobile friendly */}
            <div className="mt-8 text-center">
              <motion.p
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="text-xs text-gray-500"
              >
                Tap to answer or decline
              </motion.p>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
