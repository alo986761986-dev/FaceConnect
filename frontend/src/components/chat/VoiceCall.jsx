import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Phone, PhoneOff, Video, VideoOff, Mic, MicOff, 
  Volume2, VolumeX, MoreHorizontal, UserPlus, Lock, Pin
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { haptic } from "@/utils/mobile";
import { requestMicrophonePermission, requestCameraPermission, isNative } from "@/utils/permissions";
import { Capacitor } from "@capacitor/core";

const API_URL = process.env.REACT_APP_BACKEND_URL;

// ICE servers configuration for WebRTC
const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
  ]
};

// WhatsApp doodle pattern SVG as background
const WhatsAppDoodleBackground = () => (
  <div 
    className="absolute inset-0 opacity-[0.06]"
    style={{
      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M20 10c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 4c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z'/%3E%3Cpath d='M45 25h-5v-5h-2v5h-5v2h5v5h2v-5h5zM80 35a5 5 0 100-10 5 5 0 000 10zm40 10l-6-6-1.5 1.5 6 6zm-5 20l8-8-1.5-1.5-8 8zm50-30c2.2 0 4-1.8 4-4s-1.8-4-4-4-4 1.8-4 4 1.8 4 4 4zm-30 50l5-10h-10zm-60 10c0-2.2-1.8-4-4-4s-4 1.8-4 4 1.8 4 4 4 4-1.8 4-4zm90-60a3 3 0 11-6 0 3 3 0 016 0zm-45 80l-3-6-3 6h6zm-55-20c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3z'/%3E%3Cpath d='M130 90h8v2h-8zm-20 30l4 4 4-4-4-4zm60 20a2 2 0 100-4 2 2 0 000 4zm-90-60c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm30 80a4 4 0 110-8 4 4 0 010 8z'/%3E%3Cpath d='M155 150l-5-8.66-5 8.66h10zm25-90c0 1.1.9 2 2 2s2-.9 2-2-.9-2-2-2-2 .9-2 2zm-150 40c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3zm80 60l-6 6 1.5 1.5 6-6z'/%3E%3C/g%3E%3C/svg%3E")`,
      backgroundRepeat: 'repeat',
    }}
  />
);

export default function VoiceCall({ 
  isOpen, 
  onClose, 
  callType = "audio", // "video" or "audio"
  remoteUser, // { id, username, display_name, avatar }
  isIncoming = false,
  callId: incomingCallId = null,
}) {
  const { user, token, ws } = useAuth();
  
  // Call states
  const [callState, setCallState] = useState("idle"); // idle, calling, ringing, connecting, connected, ended
  const [callId, setCallId] = useState(incomingCallId);
  const [duration, setDuration] = useState(0);
  
  // Control states
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  
  // Refs
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const durationIntervalRef = useRef(null);
  const ringtoneRef = useRef(null);
  const handleEndCallRef = useRef(null);

  // Stop ringtone helper
  const stopRingtone = useCallback(() => {
    if (ringtoneRef.current) {
      ringtoneRef.current.pause();
      ringtoneRef.current.currentTime = 0;
      ringtoneRef.current = null;
    }
  }, []);

  // Cleanup function
  const cleanup = useCallback(() => {
    console.log('[VoiceCall] Cleaning up resources...');
    
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log('[VoiceCall] Stopped track:', track.kind);
      });
      localStreamRef.current = null;
    }
    
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    
    stopRingtone();
  }, [stopRingtone]);

  // Request microphone permission with native support
  const requestMicPermission = async () => {
    console.log('[VoiceCall] Requesting microphone permission...');
    
    // On native, use Capacitor permissions
    if (isNative()) {
      try {
        // For Android WebView, we need to ensure permission is granted
        const result = await requestMicrophonePermission();
        console.log('[VoiceCall] Native mic permission result:', result);
        return result.granted;
      } catch (e) {
        console.error('[VoiceCall] Native permission error:', e);
        // Fall through to web API
      }
    }
    
    // Web permission request
    try {
      const status = await navigator.permissions.query({ name: 'microphone' });
      console.log('[VoiceCall] Microphone permission status:', status.state);
      
      if (status.state === 'denied') {
        toast.error("Microphone access is blocked. Please enable it in your device settings.");
        return false;
      }
      return true;
    } catch (e) {
      // Permissions API not supported, will try direct access
      return true;
    }
  };

  // Initialize media stream (audio only for voice call)
  const initializeMedia = useCallback(async () => {
    console.log('[VoiceCall] Initializing media...', { callType, isVideoEnabled });
    
    // Request permissions first
    const hasPermission = await requestMicPermission();
    if (!hasPermission) {
      toast.error("Microphone permission required for calls");
      setTimeout(() => {
        cleanup();
        onClose();
      }, 2000);
      return null;
    }

    try {
      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
        },
        video: isVideoEnabled ? { 
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } : false
      };
      
      console.log('[VoiceCall] Getting user media with constraints:', constraints);
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;
      
      console.log('[VoiceCall] Got media stream:', {
        audioTracks: stream.getAudioTracks().length,
        videoTracks: stream.getVideoTracks().length
      });
      
      // Attach video if enabled
      if (localVideoRef.current && isVideoEnabled) {
        localVideoRef.current.srcObject = stream;
      }
      
      toast.success("Microphone connected");
      haptic.success();
      return stream;
    } catch (error) {
      console.error("[VoiceCall] Failed to get media:", error);
      
      let errorMessage = "Failed to access microphone";
      if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
        errorMessage = "Microphone permission denied. Please allow access in your settings.";
      } else if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
        errorMessage = "No microphone found on this device.";
      } else if (error.name === "NotReadableError" || error.name === "TrackStartError") {
        errorMessage = "Microphone is already in use by another application.";
      } else if (error.name === "OverconstrainedError") {
        errorMessage = "Could not satisfy audio constraints.";
      }
      
      toast.error(errorMessage);
      
      setTimeout(() => {
        cleanup();
        onClose();
      }, 2500);
      
      return null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVideoEnabled, onClose, cleanup]);

  // Create peer connection for WebRTC
  const createPeerConnection = useCallback(() => {
    console.log('[VoiceCall] Creating peer connection...');
    
    const pc = new RTCPeerConnection(ICE_SERVERS);
    
    pc.onicecandidate = (event) => {
      if (event.candidate && callId) {
        console.log('[VoiceCall] Sending ICE candidate');
        fetch(`${API_URL}/api/calls/${callId}/signal?token=${token}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            call_id: callId,
            signal_type: "ice-candidate",
            data: { candidate: event.candidate }
          })
        }).catch(e => console.error('[VoiceCall] Failed to send ICE candidate:', e));
      }
    };
    
    pc.ontrack = (event) => {
      console.log('[VoiceCall] Received remote track:', event.track.kind);
      
      if (event.track.kind === 'audio' && remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = event.streams[0];
        remoteAudioRef.current.play().catch(e => console.error('[VoiceCall] Audio play error:', e));
      }
      
      if (event.track.kind === 'video' && remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };
    
    pc.onconnectionstatechange = () => {
      console.log('[VoiceCall] Connection state:', pc.connectionState);
      
      if (pc.connectionState === "connected") {
        setCallState("connected");
        startDurationTimer();
        stopRingtone();
        haptic.success();
        toast.success("Call connected");
      } else if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
        console.log('[VoiceCall] Connection lost');
        if (handleEndCallRef.current) {
          handleEndCallRef.current();
        }
      }
    };
    
    pc.oniceconnectionstatechange = () => {
      console.log('[VoiceCall] ICE connection state:', pc.iceConnectionState);
    };
    
    // Add local tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        console.log('[VoiceCall] Adding track to peer connection:', track.kind);
        pc.addTrack(track, localStreamRef.current);
      });
    }
    
    peerConnectionRef.current = pc;
    return pc;
  }, [callId, token, stopRingtone]);

  // Start call duration timer
  const startDurationTimer = () => {
    if (durationIntervalRef.current) return;
    
    durationIntervalRef.current = setInterval(() => {
      setDuration(prev => prev + 1);
    }, 1000);
  };

  // Play ringtone
  const playRingtone = () => {
    try {
      ringtoneRef.current = new Audio('/sounds/ringtone.mp3');
      ringtoneRef.current.loop = true;
      ringtoneRef.current.volume = 0.7;
      ringtoneRef.current.play().catch(e => {
        console.log('[VoiceCall] Ringtone play failed:', e);
      });
    } catch (e) {
      console.log('[VoiceCall] Ringtone error:', e);
    }
  };

  // Initiate outgoing call
  const initiateCall = async () => {
    console.log('[VoiceCall] Initiating call to:', remoteUser?.username);
    setCallState("calling");
    haptic.medium();
    
    const stream = await initializeMedia();
    if (!stream) {
      setCallState("idle");
      return;
    }
    
    try {
      const response = await fetch(`${API_URL}/api/calls/initiate?token=${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient_id: remoteUser.id,
          call_type: callType
        })
      });
      
      if (!response.ok) {
        throw new Error("Failed to initiate call");
      }
      
      const data = await response.json();
      console.log('[VoiceCall] Call initiated:', data);
      setCallId(data.call_id);
      setCallState("ringing");
      playRingtone();
      
      // Create WebRTC offer
      const pc = createPeerConnection();
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: isVideoEnabled
      });
      await pc.setLocalDescription(offer);
      
      // Send offer to recipient via signaling server
      await fetch(`${API_URL}/api/calls/${data.call_id}/signal?token=${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          call_id: data.call_id,
          signal_type: "offer",
          data: { sdp: offer }
        })
      });
      
      console.log('[VoiceCall] Offer sent');
      
    } catch (error) {
      console.error("[VoiceCall] Failed to initiate call:", error);
      toast.error("Failed to start call. Please try again.");
      setCallState("idle");
      cleanup();
    }
  };

  // Answer incoming call
  const answerCall = async () => {
    console.log('[VoiceCall] Answering call:', callId);
    setCallState("connecting");
    haptic.medium();
    stopRingtone();
    
    const stream = await initializeMedia();
    if (!stream) {
      handleRejectCall();
      return;
    }
    
    try {
      const response = await fetch(`${API_URL}/api/calls/${callId}/answer?token=${token}`, {
        method: "POST"
      });
      
      if (!response.ok) {
        throw new Error("Failed to answer call");
      }
      
      createPeerConnection();
      console.log('[VoiceCall] Call answered');
      
    } catch (error) {
      console.error("[VoiceCall] Failed to answer call:", error);
      toast.error("Failed to answer call");
      cleanup();
    }
  };

  // Reject incoming call
  const handleRejectCall = async () => {
    console.log('[VoiceCall] Rejecting call:', callId);
    haptic.warning();
    stopRingtone();
    
    try {
      await fetch(`${API_URL}/api/calls/${callId}/reject?token=${token}`, {
        method: "POST"
      });
    } catch (error) {
      console.error("[VoiceCall] Failed to reject call:", error);
    }
    
    cleanup();
    onClose();
  };

  // End call
  const handleEndCall = useCallback(async () => {
    console.log('[VoiceCall] Ending call:', callId);
    haptic.warning();
    stopRingtone();
    
    if (callId && callState !== "idle") {
      try {
        await fetch(`${API_URL}/api/calls/${callId}/end?token=${token}`, {
          method: "POST"
        });
      } catch (error) {
        console.error("[VoiceCall] Failed to end call:", error);
      }
    }
    
    setCallState("ended");
    cleanup();
    
    setTimeout(() => {
      onClose();
    }, 1500);
  }, [callId, callState, token, stopRingtone, cleanup, onClose]);

  // Keep ref updated with latest handleEndCall
  useEffect(() => {
    handleEndCallRef.current = handleEndCall;
  }, [handleEndCall]);

  // Toggle mute
  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
        haptic.light();
        toast.info(audioTrack.enabled ? "Microphone unmuted" : "Microphone muted");
      }
    } else {
      toast.error("No microphone stream available");
    }
  };

  // Toggle speaker
  const toggleSpeaker = () => {
    setIsSpeakerOn(!isSpeakerOn);
    haptic.light();
    
    // On mobile, this switches between earpiece and speaker
    // In web, we can only show a toast
    toast.info(isSpeakerOn ? "Speaker off (earpiece)" : "Speaker on");
    
    // If we have the remote audio element, we can adjust volume as a workaround
    if (remoteAudioRef.current) {
      remoteAudioRef.current.volume = isSpeakerOn ? 0.5 : 1.0;
    }
  };

  // Toggle video (upgrade call to video)
  const toggleVideo = async () => {
    haptic.light();
    
    if (!isVideoEnabled) {
      // Enable video
      try {
        const videoStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" }
        });
        
        const videoTrack = videoStream.getVideoTracks()[0];
        
        // Add to local stream
        if (localStreamRef.current) {
          localStreamRef.current.addTrack(videoTrack);
        }
        
        // Add to peer connection
        if (peerConnectionRef.current) {
          peerConnectionRef.current.addTrack(videoTrack, localStreamRef.current);
        }
        
        // Update local video
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = localStreamRef.current;
        }
        
        setIsVideoEnabled(true);
        toast.success("Video enabled");
      } catch (error) {
        console.error('[VoiceCall] Failed to enable video:', error);
        toast.error("Failed to enable camera");
      }
    } else {
      // Disable video
      if (localStreamRef.current) {
        const videoTrack = localStreamRef.current.getVideoTracks()[0];
        if (videoTrack) {
          videoTrack.stop();
          localStreamRef.current.removeTrack(videoTrack);
        }
      }
      setIsVideoEnabled(false);
      toast.info("Video disabled");
    }
  };

  // Add participant (placeholder)
  const handleAddParticipant = () => {
    haptic.medium();
    toast.info("Add participant feature coming soon");
  };

  // More options menu items
  const handleMoreOption = (option) => {
    setShowMoreMenu(false);
    haptic.light();
    
    switch (option) {
      case 'record':
        toast.info("Call recording not available");
        break;
      case 'hold':
        toast.info("Call hold feature coming soon");
        break;
      case 'message':
        toast.info("In-call messaging coming soon");
        break;
      default:
        break;
    }
  };

  // Handle WebSocket signals
  useEffect(() => {
    if (!ws) return;
    
    const handleSignal = async (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === "call_signal" && data.call_id === callId) {
          const pc = peerConnectionRef.current;
          if (!pc) return;
          
          if (data.signal_type === "offer") {
            console.log('[VoiceCall] Received offer');
            await pc.setRemoteDescription(new RTCSessionDescription(data.data.sdp));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            
            await fetch(`${API_URL}/api/calls/${callId}/signal?token=${token}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                call_id: callId,
                signal_type: "answer",
                data: { sdp: answer }
              })
            });
          } else if (data.signal_type === "answer") {
            console.log('[VoiceCall] Received answer');
            await pc.setRemoteDescription(new RTCSessionDescription(data.data.sdp));
          } else if (data.signal_type === "ice-candidate") {
            console.log('[VoiceCall] Received ICE candidate');
            await pc.addIceCandidate(new RTCIceCandidate(data.data.candidate));
          }
        } else if (data.type === "call_answered" && data.call_id === callId) {
          console.log('[VoiceCall] Call answered by remote');
          setCallState("connecting");
          stopRingtone();
        } else if (data.type === "call_rejected" && data.call_id === callId) {
          console.log('[VoiceCall] Call rejected');
          toast.info("Call was declined");
          setCallState("ended");
          cleanup();
          setTimeout(() => onClose(), 1500);
        } else if (data.type === "call_ended" && data.call_id === callId) {
          console.log('[VoiceCall] Call ended by remote');
          setCallState("ended");
          cleanup();
          setTimeout(() => onClose(), 1500);
        }
      } catch (e) {
        console.error('[VoiceCall] Signal handling error:', e);
      }
    };
    
    ws.addEventListener("message", handleSignal);
    return () => ws.removeEventListener("message", handleSignal);
  }, [ws, callId, token, onClose, cleanup, stopRingtone]);

  // Auto-start outgoing call
  useEffect(() => {
    if (isOpen && !isIncoming && callState === "idle") {
      initiateCall();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, isIncoming]);

  // Handle incoming call
  useEffect(() => {
    if (isOpen && isIncoming && incomingCallId) {
      setCallId(incomingCallId);
      setCallState("ringing");
      playRingtone();
    }
  }, [isOpen, isIncoming, incomingCallId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  // Format duration MM:SS
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100]"
        data-testid="voice-call-screen"
      >
        {/* WhatsApp Dark Background */}
        <div className="absolute inset-0 bg-[#0b141a]">
          <WhatsAppDoodleBackground />
        </div>

        {/* Remote Audio Element (hidden) */}
        <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />

        {/* Main Content */}
        <div className="relative w-full h-full flex flex-col safe-area-inset">
          
          {/* Top Header */}
          <div className="relative z-10 flex items-center justify-between px-4 pt-12 pb-4">
            {/* Left: Minimize/Pin Button */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => { 
                haptic.light();
                toast.info("Minimize feature coming soon");
              }}
              className="w-12 h-12 rounded-full bg-[#3b4a54]/80 flex items-center justify-center"
              data-testid="minimize-btn"
            >
              <Pin className="w-5 h-5 text-white" />
            </motion.button>

            {/* Center: Name and Encryption */}
            <div className="flex-1 text-center px-4">
              <h2 className="text-white font-semibold text-lg italic">
                {remoteUser?.display_name || remoteUser?.username || "Unknown"}
              </h2>
              <div className="flex items-center justify-center gap-1.5 mt-0.5">
                <Lock className="w-3 h-3 text-gray-400" />
                <span className="text-gray-400 text-xs italic">
                  Crittografata end-to-end
                </span>
              </div>
            </div>

            {/* Right: Add Participant */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handleAddParticipant}
              className="w-12 h-12 rounded-full bg-[#3b4a54]/80 flex items-center justify-center"
              data-testid="add-participant-btn"
            >
              <UserPlus className="w-5 h-5 text-white" />
            </motion.button>
          </div>

          {/* Center: Avatar with status */}
          <div className="flex-1 flex flex-col items-center justify-center px-4">
            {/* Large Profile Picture */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", damping: 20 }}
            >
              <motion.div
                animate={
                  (callState === "ringing" || callState === "calling") 
                    ? { scale: [1, 1.05, 1] }
                    : {}
                }
                transition={{ duration: 2, repeat: Infinity }}
                className="relative"
              >
                <Avatar className="w-44 h-44 ring-4 ring-white/5 shadow-2xl">
                  <AvatarImage 
                    src={remoteUser?.avatar} 
                    className="object-cover"
                  />
                  <AvatarFallback className="bg-gradient-to-br from-[#00a884] to-[#075e54] text-white text-6xl font-light">
                    {(remoteUser?.display_name || remoteUser?.username || "?")[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                
                {/* Pulse rings during calling/ringing */}
                {(callState === "ringing" || callState === "calling") && (
                  <>
                    <motion.div
                      className="absolute inset-0 rounded-full border-2 border-[#00a884]/30"
                      animate={{ scale: [1, 1.4], opacity: [0.6, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    />
                    <motion.div
                      className="absolute inset-0 rounded-full border-2 border-[#00a884]/20"
                      animate={{ scale: [1, 1.6], opacity: [0.4, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
                    />
                  </>
                )}
              </motion.div>
            </motion.div>

            {/* Call Status Text */}
            <div className="mt-6 text-center">
              <p className="text-gray-400 text-base">
                {callState === "idle" && "Preparing call..."}
                {callState === "calling" && "Calling..."}
                {callState === "ringing" && isIncoming && "Incoming call..."}
                {callState === "ringing" && !isIncoming && "Ringing..."}
                {callState === "connecting" && "Connecting..."}
                {callState === "connected" && formatDuration(duration)}
                {callState === "ended" && "Call ended"}
              </p>
            </div>

            {/* Local Video Preview (when video enabled) */}
            {isVideoEnabled && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute top-32 right-4 w-28 h-40 rounded-2xl overflow-hidden border-2 border-white/20 bg-black shadow-xl"
              >
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover scale-x-[-1]"
                />
              </motion.div>
            )}

            {/* Remote Video (when video enabled) */}
            {isVideoEnabled && (
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="absolute inset-0 w-full h-full object-cover -z-10"
              />
            )}
          </div>

          {/* More Options Menu */}
          <AnimatePresence>
            {showMoreMenu && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="absolute bottom-36 left-4 bg-[#233138] rounded-xl shadow-xl overflow-hidden z-20"
              >
                {[
                  { id: 'record', label: 'Record call' },
                  { id: 'hold', label: 'Hold' },
                  { id: 'message', label: 'Send message' },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleMoreOption(item.id)}
                    className="w-full px-6 py-3.5 text-left text-white hover:bg-white/5 transition-colors"
                  >
                    {item.label}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bottom Controls */}
          <div className="relative z-10 px-4 pb-8 safe-area-bottom">
            
            {/* Incoming Call Buttons */}
            {callState === "ringing" && isIncoming && (
              <div className="flex justify-center gap-16 mb-4">
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={handleRejectCall}
                  className="w-16 h-16 rounded-full bg-[#f15c6d] flex items-center justify-center shadow-lg"
                  data-testid="reject-call-btn"
                >
                  <PhoneOff className="w-7 h-7 text-white" />
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={answerCall}
                  className="w-16 h-16 rounded-full bg-[#00a884] flex items-center justify-center shadow-lg"
                  data-testid="answer-call-btn"
                >
                  <Phone className="w-7 h-7 text-white" />
                </motion.button>
              </div>
            )}

            {/* Active Call Controls - WhatsApp Pill Bar */}
            {(callState === "calling" || (callState === "ringing" && !isIncoming) || callState === "connecting" || callState === "connected") && (
              <motion.div 
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="bg-[#1f2c34] rounded-full p-2 flex justify-center items-center gap-2 shadow-2xl mx-auto max-w-md"
              >
                {/* More Options (•••) */}
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => { 
                    haptic.light(); 
                    setShowMoreMenu(!showMoreMenu);
                  }}
                  className={`w-14 h-14 rounded-full flex items-center justify-center ${
                    showMoreMenu ? 'bg-white' : 'bg-[#3b4a54]'
                  }`}
                  data-testid="more-options-btn"
                >
                  <MoreHorizontal className={`w-6 h-6 ${showMoreMenu ? 'text-[#3b4a54]' : 'text-white'}`} />
                </motion.button>

                {/* Video Toggle */}
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={toggleVideo}
                  className={`w-14 h-14 rounded-full flex items-center justify-center ${
                    isVideoEnabled ? 'bg-white' : 'bg-[#3b4a54]'
                  }`}
                  data-testid="video-toggle-btn"
                >
                  {isVideoEnabled ? (
                    <Video className="w-6 h-6 text-[#3b4a54]" />
                  ) : (
                    <VideoOff className="w-6 h-6 text-white" />
                  )}
                </motion.button>

                {/* Speaker Toggle */}
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={toggleSpeaker}
                  className={`w-14 h-14 rounded-full flex items-center justify-center ${
                    isSpeakerOn ? 'bg-white' : 'bg-[#3b4a54]'
                  }`}
                  data-testid="speaker-btn"
                >
                  {isSpeakerOn ? (
                    <Volume2 className="w-6 h-6 text-[#3b4a54]" />
                  ) : (
                    <VolumeX className="w-6 h-6 text-white" />
                  )}
                </motion.button>

                {/* Mute Toggle */}
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={toggleMute}
                  className={`w-14 h-14 rounded-full flex items-center justify-center ${
                    isMuted ? 'bg-white' : 'bg-[#3b4a54]'
                  }`}
                  data-testid="mute-btn"
                >
                  {isMuted ? (
                    <MicOff className="w-6 h-6 text-[#3b4a54]" />
                  ) : (
                    <Mic className="w-6 h-6 text-white" />
                  )}
                </motion.button>

                {/* End Call - Red */}
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={handleEndCall}
                  className="w-14 h-14 rounded-full bg-[#f15c6d] flex items-center justify-center"
                  data-testid="end-call-btn"
                >
                  <PhoneOff className="w-6 h-6 text-white" />
                </motion.button>
              </motion.div>
            )}

            {/* Call Ended State */}
            {callState === "ended" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center"
              >
                <p className="text-gray-400 mb-4">Call ended</p>
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
