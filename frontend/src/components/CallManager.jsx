import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Phone, PhoneOff, Video, VideoOff, Mic, MicOff,
  Volume2, VolumeX, Monitor, MoreVertical, Minimize2,
  Maximize2, Users, MessageCircle, Settings, X,
  PhoneIncoming, PhoneOutgoing, Clock
} from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { playSound } from "@/utils/sounds";

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Call States
const CALL_STATES = {
  IDLE: 'idle',
  CALLING: 'calling',
  RINGING: 'ringing',
  CONNECTED: 'connected',
  ENDED: 'ended'
};

export default function CallManager({ 
  isOpen, 
  onClose, 
  callType = 'video', // 'video' or 'voice'
  contact,
  isIncoming = false
}) {
  const { user, token } = useAuth();
  const [callState, setCallState] = useState(isIncoming ? CALL_STATES.RINGING : CALL_STATES.CALLING);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(callType === 'voice');
  const [isSpeakerOff, setIsSpeakerOff] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const timerRef = useRef(null);
  const ringtoneRef = useRef(null);

  // Format duration as MM:SS
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Initialize media stream
  const initializeMedia = useCallback(async () => {
    try {
      const constraints = {
        audio: true,
        video: callType === 'video' ? { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        } : false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;

      if (localVideoRef.current && callType === 'video') {
        localVideoRef.current.srcObject = stream;
      }

      return stream;
    } catch (error) {
      console.error('Error accessing media devices:', error);
      toast.error('Could not access camera/microphone');
      return null;
    }
  }, [callType]);

  // Start call
  const startCall = useCallback(async () => {
    playSound('call_outgoing');
    
    const stream = await initializeMedia();
    if (!stream) {
      handleEndCall();
      return;
    }

    // Simulate connection after 2-3 seconds
    setTimeout(() => {
      if (callState === CALL_STATES.CALLING) {
        setCallState(CALL_STATES.CONNECTED);
        playSound('call_connect');
        
        // Start duration timer
        timerRef.current = setInterval(() => {
          setDuration(prev => prev + 1);
        }, 1000);
      }
    }, 2000 + Math.random() * 1000);

    // Log call to API
    try {
      await fetch(`${API_URL}/api/calls/start?token=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient_id: contact?.id,
          call_type: callType
        })
      });
    } catch (e) {
      console.log('Call logging failed:', e);
    }
  }, [callType, contact, token, initializeMedia, callState]);

  // Answer incoming call
  const answerCall = useCallback(async () => {
    playSound('call_connect');
    
    const stream = await initializeMedia();
    if (!stream) {
      handleEndCall();
      return;
    }

    setCallState(CALL_STATES.CONNECTED);
    
    // Start duration timer
    timerRef.current = setInterval(() => {
      setDuration(prev => prev + 1);
    }, 1000);
  }, [initializeMedia]);

  // End call
  const handleEndCall = useCallback(() => {
    // Stop all tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }

    // Clear timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Stop ringtone
    if (ringtoneRef.current) {
      ringtoneRef.current.pause();
      ringtoneRef.current = null;
    }

    playSound('call_end');
    setCallState(CALL_STATES.ENDED);

    // Log call end to API
    try {
      fetch(`${API_URL}/api/calls/end?token=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient_id: contact?.id,
          duration: duration
        })
      });
    } catch (e) {
      console.log('Call end logging failed:', e);
    }

    setTimeout(() => {
      onClose();
    }, 1000);
  }, [contact, duration, token, onClose]);

  // Decline incoming call
  const declineCall = useCallback(() => {
    playSound('call_end');
    onClose();
  }, [onClose]);

  // Toggle mute
  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  // Toggle video
  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  // Toggle speaker
  const toggleSpeaker = () => {
    setIsSpeakerOff(!isSpeakerOff);
    if (remoteVideoRef.current) {
      remoteVideoRef.current.muted = !isSpeakerOff;
    }
  };

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Initialize call on mount
  useEffect(() => {
    if (isOpen) {
      if (isIncoming) {
        // Play ringtone for incoming call
        playSound('call_incoming');
      } else {
        startCall();
      }
    }

    return () => {
      // Cleanup on unmount
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isOpen, isIncoming, startCall]);

  if (!isOpen) return null;

  // Minimized view
  if (isMinimized) {
    return (
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="fixed bottom-4 right-4 z-50"
      >
        <div className="bg-[#202c33] rounded-2xl shadow-2xl p-4 flex items-center gap-3 border border-white/10">
          <Avatar className="w-12 h-12">
            <AvatarImage src={contact?.avatar} />
            <AvatarFallback className="bg-[#00a884] text-white">
              {contact?.name?.charAt(0)?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-white font-medium">{contact?.name || 'Unknown'}</p>
            <p className="text-[#00a884] text-sm">{formatDuration(duration)}</p>
          </div>
          <div className="flex gap-2 ml-4">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setIsMinimized(false)}
              className="rounded-full hover:bg-white/10"
            >
              <Maximize2 className="w-4 h-4 text-white" />
            </Button>
            <Button
              size="icon"
              onClick={handleEndCall}
              className="rounded-full bg-red-500 hover:bg-red-600"
            >
              <PhoneOff className="w-4 h-4 text-white" />
            </Button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-[#111b21] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            {callType === 'video' ? (
              <Video className="w-5 h-5 text-[#00a884]" />
            ) : (
              <Phone className="w-5 h-5 text-[#00a884]" />
            )}
            <span className="text-white font-medium">
              {callType === 'video' ? 'Video Call' : 'Voice Call'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setIsMinimized(true)}
              className="rounded-full hover:bg-white/10"
            >
              <Minimize2 className="w-5 h-5 text-white" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={toggleFullscreen}
              className="rounded-full hover:bg-white/10"
            >
              <Maximize2 className="w-5 h-5 text-white" />
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex items-center justify-center relative">
          {/* Remote Video (or avatar for voice call) */}
          {callType === 'video' && callState === CALL_STATES.CONNECTED ? (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
              poster="https://picsum.photos/1920/1080?blur=5"
            />
          ) : (
            <div className="text-center">
              <motion.div
                animate={callState === CALL_STATES.CALLING || callState === CALL_STATES.RINGING ? {
                  scale: [1, 1.1, 1],
                } : {}}
                transition={{ repeat: Infinity, duration: 2 }}
              >
                <Avatar className="w-32 h-32 mx-auto mb-6 ring-4 ring-[#00a884]/30">
                  <AvatarImage src={contact?.avatar} />
                  <AvatarFallback className="bg-[#00a884] text-white text-4xl">
                    {contact?.name?.charAt(0)?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
              </motion.div>
              
              <h2 className="text-2xl font-semibold text-white mb-2">
                {contact?.name || 'Unknown'}
              </h2>
              
              <p className="text-gray-400 flex items-center justify-center gap-2">
                {callState === CALL_STATES.CALLING && (
                  <>
                    <PhoneOutgoing className="w-4 h-4" />
                    Calling...
                  </>
                )}
                {callState === CALL_STATES.RINGING && (
                  <>
                    <PhoneIncoming className="w-4 h-4" />
                    Incoming {callType} call...
                  </>
                )}
                {callState === CALL_STATES.CONNECTED && (
                  <>
                    <Clock className="w-4 h-4" />
                    {formatDuration(duration)}
                  </>
                )}
                {callState === CALL_STATES.ENDED && (
                  <>Call ended</>
                )}
              </p>
            </div>
          )}

          {/* Local Video Preview (Picture-in-Picture) */}
          {callType === 'video' && !isVideoOff && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="absolute bottom-24 right-6 w-48 h-36 rounded-xl overflow-hidden shadow-2xl border-2 border-white/20"
            >
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover mirror"
                style={{ transform: 'scaleX(-1)' }}
              />
            </motion.div>
          )}
        </div>

        {/* Controls */}
        <div className="px-6 py-8">
          {callState === CALL_STATES.RINGING && isIncoming ? (
            /* Incoming call controls */
            <div className="flex items-center justify-center gap-8">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={declineCall}
                className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-lg"
              >
                <PhoneOff className="w-7 h-7 text-white" />
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={answerCall}
                className="w-16 h-16 rounded-full bg-[#00a884] hover:bg-[#00a884]/90 flex items-center justify-center shadow-lg"
              >
                {callType === 'video' ? (
                  <Video className="w-7 h-7 text-white" />
                ) : (
                  <Phone className="w-7 h-7 text-white" />
                )}
              </motion.button>
            </div>
          ) : (
            /* Active/Outgoing call controls */
            <div className="flex items-center justify-center gap-4">
              {/* Mute */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={toggleMute}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
                  isMuted ? 'bg-white text-gray-900' : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
              </motion.button>

              {/* Video Toggle (only for video calls) */}
              {callType === 'video' && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={toggleVideo}
                  className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
                    isVideoOff ? 'bg-white text-gray-900' : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  {isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
                </motion.button>
              )}

              {/* Speaker */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={toggleSpeaker}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
                  isSpeakerOff ? 'bg-white text-gray-900' : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                {isSpeakerOff ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
              </motion.button>

              {/* End Call */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleEndCall}
                className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center"
              >
                <PhoneOff className="w-6 h-6 text-white" />
              </motion.button>

              {/* Screen Share (video only) */}
              {callType === 'video' && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-14 h-14 rounded-full bg-white/10 text-white hover:bg-white/20 flex items-center justify-center"
                >
                  <Monitor className="w-6 h-6" />
                </motion.button>
              )}

              {/* More Options */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="w-14 h-14 rounded-full bg-white/10 text-white hover:bg-white/20 flex items-center justify-center"
              >
                <MoreVertical className="w-6 h-6" />
              </motion.button>
            </div>
          )}
        </div>

        {/* End-to-end encrypted notice */}
        <div className="text-center pb-4">
          <p className="text-gray-500 text-xs flex items-center justify-center gap-1">
            <svg viewBox="0 0 24 24" className="w-3 h-3" fill="currentColor">
              <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/>
            </svg>
            End-to-end encrypted
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// Hook to manage calls
export function useCallManager() {
  const [callState, setCallState] = useState({
    isOpen: false,
    callType: 'video',
    contact: null,
    isIncoming: false
  });

  const startCall = (contact, type = 'video') => {
    setCallState({
      isOpen: true,
      callType: type,
      contact,
      isIncoming: false
    });
  };

  const receiveCall = (contact, type = 'video') => {
    setCallState({
      isOpen: true,
      callType: type,
      contact,
      isIncoming: true
    });
  };

  const endCall = () => {
    setCallState({
      isOpen: false,
      callType: 'video',
      contact: null,
      isIncoming: false
    });
  };

  return {
    ...callState,
    startCall,
    receiveCall,
    endCall
  };
}
