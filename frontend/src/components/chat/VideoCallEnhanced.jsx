import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Phone, PhoneOff, Video, VideoOff, Mic, MicOff, 
  Volume2, VolumeX, X, Maximize2, Minimize2, 
  RotateCcw, User, UserPlus, Monitor, MonitorOff,
  MessageCircle, Sparkles, Send, Image as ImageIcon,
  Lock, MoreVertical
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { haptic } from "@/utils/mobile";

const API_URL = process.env.REACT_APP_BACKEND_URL;

// ICE servers configuration
const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ]
};

export default function VideoCall({ 
  isOpen, 
  onClose, 
  callType = "video", // "video" or "audio"
  remoteUser, // { id, username, display_name, avatar }
  isIncoming = false,
  callId: incomingCallId = null,
  onSendMessage, // Callback to send in-call message
}) {
  const { user, token, ws } = useAuth();
  
  const [callState, setCallState] = useState("idle"); // idle, calling, ringing, connected, ended
  const [callId, setCallId] = useState(incomingCallId);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(callType === "video");
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [connectionState, setConnectionState] = useState("new");
  
  // New states for enhanced features
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [showEffects, setShowEffects] = useState(false);
  const [showAddPeople, setShowAddPeople] = useState(false);
  const [showInCallChat, setShowInCallChat] = useState(false);
  const [inCallMessage, setInCallMessage] = useState("");
  const [inCallMessages, setInCallMessages] = useState([]);
  const [isPiPMode, setIsPiPMode] = useState(false);
  const [facingMode, setFacingMode] = useState("user");
  const [activeEffect, setActiveEffect] = useState(null);
  
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const durationIntervalRef = useRef(null);
  const ringtoneRef = useRef(null);
  const pipWindowRef = useRef(null);

  // Request camera permission explicitly
  const requestCameraPermission = async () => {
    try {
      const result = await navigator.permissions.query({ name: 'camera' });
      if (result.state === 'denied') {
        toast.error("Camera access is blocked. Please enable it in browser settings.");
        return false;
      }
      return true;
    } catch (e) {
      // Permissions API not supported, try to get media directly
      return true;
    }
  };

  // Initialize media stream with explicit permission request
  const initializeMedia = useCallback(async () => {
    // Request permission first
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) {
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
          autoGainControl: true
        },
        video: callType === "video" ? { 
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } : false
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;
      
      if (localVideoRef.current && callType === "video") {
        localVideoRef.current.srcObject = stream;
      }
      
      toast.success("Camera and microphone connected");
      return stream;
    } catch (error) {
      console.error("Failed to get media:", error);
      
      let errorMessage = "Failed to access camera/microphone";
      if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
        errorMessage = "Camera/microphone permission denied. Please allow access in your browser settings.";
      } else if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
        errorMessage = "No camera or microphone found on this device.";
      } else if (error.name === "NotReadableError" || error.name === "TrackStartError") {
        errorMessage = "Camera or microphone is already in use by another application.";
      }
      
      toast.error(errorMessage);
      
      setTimeout(() => {
        cleanup();
        onClose();
      }, 2000);
      
      return null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callType, facingMode, onClose]);

  // Create peer connection
  const createPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    
    pc.onicecandidate = (event) => {
      if (event.candidate && callId) {
        fetch(`${API_URL}/api/calls/${callId}/signal?token=${token}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            call_id: callId,
            signal_type: "ice-candidate",
            data: { candidate: event.candidate }
          })
        });
      }
    };
    
    pc.ontrack = (event) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };
    
    pc.onconnectionstatechange = () => {
      setConnectionState(pc.connectionState);
      if (pc.connectionState === "connected") {
        setCallState("connected");
        startDurationTimer();
        stopRingtone();
        haptic.success();
      } else if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
        handleEndCall();
      }
    };
    
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current);
      });
    }
    
    peerConnectionRef.current = pc;
    return pc;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callId, token]);

  // Start duration timer
  const startDurationTimer = () => {
    durationIntervalRef.current = setInterval(() => {
      setDuration(prev => prev + 1);
    }, 1000);
  };

  // Play ringtone
  const playRingtone = () => {
    try {
      ringtoneRef.current = new Audio('/sounds/ringtone.mp3');
      ringtoneRef.current.loop = true;
      ringtoneRef.current.play().catch(() => {});
    } catch (e) {}
  };

  // Stop ringtone
  const stopRingtone = () => {
    if (ringtoneRef.current) {
      ringtoneRef.current.pause();
      ringtoneRef.current = null;
    }
  };

  // Initiate outgoing call
  const initiateCall = async () => {
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
      
      if (!response.ok) throw new Error("Failed to initiate call");
      
      const data = await response.json();
      setCallId(data.call_id);
      setCallState("ringing");
      playRingtone();
      
      const pc = createPeerConnection();
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      await fetch(`${API_URL}/api/calls/${data.call_id}/signal?token=${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          call_id: data.call_id,
          signal_type: "offer",
          data: { sdp: offer }
        })
      });
      
    } catch (error) {
      console.error("Failed to initiate call:", error);
      toast.error("Failed to start call");
      setCallState("idle");
      cleanup();
    }
  };

  // Answer incoming call
  const answerCall = async () => {
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
      
      if (!response.ok) throw new Error("Failed to answer call");
      
      createPeerConnection();
      
    } catch (error) {
      console.error("Failed to answer call:", error);
      toast.error("Failed to answer call");
      cleanup();
    }
  };

  // Reject incoming call
  const handleRejectCall = async () => {
    haptic.warning();
    stopRingtone();
    
    try {
      await fetch(`${API_URL}/api/calls/${callId}/reject?token=${token}`, {
        method: "POST"
      });
    } catch (error) {
      console.error("Failed to reject call:", error);
    }
    
    cleanup();
    onClose();
  };

  // End call
  const handleEndCall = async () => {
    haptic.warning();
    stopRingtone();
    
    // Exit PiP if active
    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture();
    }
    
    if (callId && callState !== "idle") {
      try {
        await fetch(`${API_URL}/api/calls/${callId}/end?token=${token}`, {
          method: "POST"
        });
      } catch (error) {
        console.error("Failed to end call:", error);
      }
    }
    
    setCallState("ended");
    cleanup();
    
    setTimeout(() => {
      onClose();
    }, 1500);
  };

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
    }
  };

  // Toggle video
  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
        haptic.light();
      }
    }
  };

  // Toggle speaker
  const toggleSpeaker = () => {
    setIsSpeakerOn(!isSpeakerOn);
    haptic.light();
    
    // On mobile, this would switch between earpiece and speaker
    if (remoteVideoRef.current) {
      // This is a simplified approach - real implementation would use AudioContext
      toast.info(isSpeakerOn ? "Speaker off" : "Speaker on");
    }
  };

  // Switch camera (rotate)
  const switchCamera = async () => {
    if (!localStreamRef.current) return;
    
    const newFacingMode = facingMode === "user" ? "environment" : "user";
    
    try {
      // Stop current video track
      const oldVideoTrack = localStreamRef.current.getVideoTracks()[0];
      if (oldVideoTrack) {
        oldVideoTrack.stop();
      }
      
      // Get new stream with different facing mode
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: newFacingMode }
      });
      
      const newVideoTrack = newStream.getVideoTracks()[0];
      
      // Replace track in peer connection
      if (peerConnectionRef.current) {
        const sender = peerConnectionRef.current.getSenders().find(s => s.track?.kind === 'video');
        if (sender) {
          await sender.replaceTrack(newVideoTrack);
        }
      }
      
      // Update local stream
      localStreamRef.current.removeTrack(oldVideoTrack);
      localStreamRef.current.addTrack(newVideoTrack);
      
      // Update local video
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
      }
      
      setFacingMode(newFacingMode);
      haptic.light();
      toast.info(newFacingMode === "user" ? "Front camera" : "Rear camera");
    } catch (error) {
      console.error("Failed to switch camera:", error);
      toast.error("Failed to switch camera");
    }
  };

  // Toggle screen sharing
  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      // Stop screen share
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(track => track.stop());
        screenStreamRef.current = null;
      }
      
      // Restore camera
      if (peerConnectionRef.current && localStreamRef.current) {
        const videoTrack = localStreamRef.current.getVideoTracks()[0];
        const sender = peerConnectionRef.current.getSenders().find(s => s.track?.kind === 'video');
        if (sender && videoTrack) {
          await sender.replaceTrack(videoTrack);
        }
      }
      
      setIsScreenSharing(false);
      toast.info("Screen sharing stopped");
    } else {
      // Start screen share
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true
        });
        
        screenStreamRef.current = screenStream;
        
        // Replace video track with screen track
        if (peerConnectionRef.current) {
          const screenTrack = screenStream.getVideoTracks()[0];
          const sender = peerConnectionRef.current.getSenders().find(s => s.track?.kind === 'video');
          if (sender) {
            await sender.replaceTrack(screenTrack);
          }
          
          // Handle when user stops sharing via browser UI
          screenTrack.onended = () => {
            toggleScreenShare();
          };
        }
        
        setIsScreenSharing(true);
        haptic.success();
        toast.success("Screen sharing started");
      } catch (error) {
        console.error("Failed to share screen:", error);
        if (error.name !== "NotAllowedError") {
          toast.error("Failed to share screen");
        }
      }
    }
  };

  // Toggle Picture-in-Picture
  const togglePiP = async () => {
    if (!remoteVideoRef.current) return;
    
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        setIsPiPMode(false);
      } else if (document.pictureInPictureEnabled) {
        pipWindowRef.current = await remoteVideoRef.current.requestPictureInPicture();
        setIsPiPMode(true);
        
        pipWindowRef.current.onleavepictureinpicture = () => {
          setIsPiPMode(false);
        };
        
        haptic.success();
        toast.success("Picture-in-Picture enabled");
      }
    } catch (error) {
      console.error("PiP failed:", error);
      toast.error("Picture-in-Picture not supported");
    }
  };

  // Send in-call message
  const sendInCallMessage = () => {
    if (!inCallMessage.trim()) return;
    
    const newMessage = {
      id: Date.now(),
      content: inCallMessage,
      sender: user?.username,
      timestamp: new Date().toISOString()
    };
    
    setInCallMessages(prev => [...prev, newMessage]);
    setInCallMessage("");
    haptic.light();
    
    // Send via callback if provided
    onSendMessage?.(inCallMessage);
  };

  // Apply video effect (placeholder for real implementation)
  const applyEffect = (effectType) => {
    setActiveEffect(effectType === activeEffect ? null : effectType);
    haptic.medium();
    toast.info(effectType ? `Effect: ${effectType}` : "Effect removed");
    setShowEffects(false);
  };

  // Add people to call (placeholder)
  const addPeopleToCall = () => {
    toast.info("Add people feature coming soon");
    setShowAddPeople(false);
  };

  // Cleanup resources
  const cleanup = () => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
    }
    
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop());
      screenStreamRef.current = null;
    }
    
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    
    stopRingtone();
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
            await pc.setRemoteDescription(new RTCSessionDescription(data.data.sdp));
          } else if (data.signal_type === "ice-candidate") {
            await pc.addIceCandidate(new RTCIceCandidate(data.data.candidate));
          }
        } else if (data.type === "call_answered" && data.call_id === callId) {
          setCallState("connecting");
          stopRingtone();
        } else if (data.type === "call_rejected" && data.call_id === callId) {
          toast.info("Call was declined");
          setCallState("ended");
          cleanup();
          setTimeout(() => onClose(), 1500);
        } else if (data.type === "call_ended" && data.call_id === callId) {
          setCallState("ended");
          cleanup();
          setTimeout(() => onClose(), 1500);
        } else if (data.type === "call_message" && data.call_id === callId) {
          setInCallMessages(prev => [...prev, data.message]);
        }
      } catch (e) {}
    };
    
    ws.addEventListener("message", handleSignal);
    return () => ws.removeEventListener("message", handleSignal);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ws, callId, token, onClose]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Format duration
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  // WhatsApp-style background pattern
  const backgroundPattern = `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100]"
        style={{
          backgroundColor: '#0b141a',
          backgroundImage: backgroundPattern,
        }}
      >
        {/* WhatsApp-style Call Screen */}
        <div className="relative w-full h-full flex flex-col">
          
          {/* Top Header */}
          <div className="flex items-center justify-between px-4 py-3 safe-area-top">
            {/* Minimize Button */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => {
                haptic.light();
                setIsPiPMode(true);
                // Could trigger PiP mode here
              }}
              className="w-12 h-12 rounded-full bg-[#2a3942] flex items-center justify-center"
              data-testid="minimize-call-btn"
            >
              <Minimize2 className="w-5 h-5 text-white" />
            </motion.button>
            
            {/* Center - Name & Encryption */}
            <div className="flex-1 text-center">
              <h2 className="text-white font-semibold text-lg">
                {remoteUser?.display_name || remoteUser?.username}
              </h2>
              <div className="flex items-center justify-center gap-1.5 mt-0.5">
                <Lock className="w-3 h-3 text-gray-400" />
                <span className="text-gray-400 text-xs italic">
                  {callState === "connected" ? formatDuration(duration) : "End-to-end encrypted"}
                </span>
              </div>
            </div>
            
            {/* Add Participant Button */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => {
                haptic.medium();
                addPeopleToCall();
              }}
              className="w-12 h-12 rounded-full bg-[#2a3942] flex items-center justify-center"
              data-testid="add-participant-btn"
            >
              <UserPlus className="w-5 h-5 text-white" />
            </motion.button>
          </div>
          
          {/* Connection Status Indicator */}
          <div className="absolute top-20 right-4">
            <div className={`w-4 h-4 rounded-full ${
              callState === "connected" ? "bg-green-500 animate-pulse" :
              callState === "connecting" ? "bg-yellow-500 animate-pulse" :
              "bg-gray-500"
            }`} />
          </div>

          {/* Center Content - Avatar or Video */}
          <div className="flex-1 flex items-center justify-center">
            {callType === "video" && callState === "connected" && isVideoEnabled ? (
              // Remote video in full screen
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              // Avatar for voice call or when video is off
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", damping: 20 }}
              >
                <motion.div
                  animate={
                    callState === "ringing" || callState === "calling" 
                      ? { scale: [1, 1.05, 1], opacity: [1, 0.9, 1] }
                      : {}
                  }
                  transition={{ duration: 2, repeat: Infinity }}
                  className="relative"
                >
                  <Avatar className="w-48 h-48 ring-4 ring-white/10 shadow-2xl">
                    <AvatarImage src={remoteUser?.avatar} className="grayscale-[20%]" />
                    <AvatarFallback className="bg-gradient-to-br from-[#128C7E] to-[#075E54] text-white text-6xl font-light">
                      {(remoteUser?.display_name || remoteUser?.username || "?")[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  
                  {/* Pulse animation rings */}
                  {(callState === "ringing" || callState === "calling") && (
                    <>
                      <motion.div
                        className="absolute inset-0 rounded-full border-2 border-white/20"
                        animate={{ scale: [1, 1.3], opacity: [0.5, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      />
                      <motion.div
                        className="absolute inset-0 rounded-full border-2 border-white/20"
                        animate={{ scale: [1, 1.5], opacity: [0.3, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
                      />
                    </>
                  )}
                </motion.div>
              </motion.div>
            )}
          </div>

          {/* Local Video (PiP) - Only show when video call is connected */}
          {callType === "video" && callState === "connected" && isVideoEnabled && !isScreenSharing && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute top-24 right-4 w-28 h-40 rounded-2xl overflow-hidden border-2 border-white/20 bg-black shadow-xl"
              drag
              dragConstraints={{ left: -280, right: 0, top: 0, bottom: 400 }}
            >
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${facingMode === "user" ? "scale-x-[-1]" : ""}`}
              />
            </motion.div>
          )}

          {/* Call Status Text (below avatar) */}
          <div className="text-center pb-4">
            <p className="text-gray-400 text-sm">
              {callState === "ringing" && isIncoming && "Incoming call..."}
              {callState === "ringing" && !isIncoming && "Ringing..."}
              {callState === "calling" && "Calling..."}
              {callState === "connecting" && "Connecting..."}
              {callState === "ended" && "Call ended"}
            </p>
          </div>

          {/* Effects Panel */}
          <AnimatePresence>
            {showEffects && (
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                className="absolute bottom-32 left-0 right-0 bg-[#1a2429]/95 backdrop-blur-xl rounded-t-3xl p-4 z-20"
              >
                <h3 className="text-white font-semibold mb-4 text-center">Video Effects</h3>
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { id: null, name: "None", icon: "✕" },
                    { id: "hearts", name: "Hearts", icon: "❤️" },
                    { id: "stars", name: "Stars", icon: "⭐" },
                    { id: "sparkles", name: "Sparkles", icon: "✨" },
                    { id: "blur", name: "Blur BG", icon: "🌫️" },
                    { id: "beauty", name: "Beauty", icon: "💄" },
                    { id: "vintage", name: "Vintage", icon: "📷" },
                    { id: "cool", name: "Cool", icon: "❄️" },
                  ].map((effect) => (
                    <button
                      key={effect.id || "none"}
                      onClick={() => applyEffect(effect.id)}
                      className={`flex flex-col items-center gap-2 p-3 rounded-xl ${
                        activeEffect === effect.id ? 'bg-[#128C7E]/30 border border-[#128C7E]' : 'bg-white/5'
                      }`}
                    >
                      <span className="text-2xl">{effect.icon}</span>
                      <span className="text-xs text-white">{effect.name}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* In-Call Chat Panel */}
          <AnimatePresence>
            {showInCallChat && (
              <motion.div
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                className="absolute top-0 right-0 bottom-0 w-80 bg-[#111b21]/95 backdrop-blur-xl border-l border-white/10 z-20 flex flex-col"
              >
                <div className="p-4 border-b border-white/10 flex items-center justify-between">
                  <h3 className="text-white font-semibold">Messages</h3>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowInCallChat(false)}
                    className="text-gray-400"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {inCallMessages.map((msg) => (
                    <div key={msg.id} className="bg-[#202c33] rounded-lg p-3">
                      <p className="text-xs text-[#00a884] mb-1">{msg.sender}</p>
                      <p className="text-white text-sm">{msg.content}</p>
                    </div>
                  ))}
                </div>
                
                <div className="p-4 border-t border-white/10">
                  <div className="flex gap-2">
                    <Input
                      value={inCallMessage}
                      onChange={(e) => setInCallMessage(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && sendInCallMessage()}
                      placeholder="Message..."
                      className="flex-1 bg-[#2a3942] border-0 text-white rounded-full"
                    />
                    <Button
                      size="icon"
                      onClick={sendInCallMessage}
                      disabled={!inCallMessage.trim()}
                      className="bg-[#00a884] hover:bg-[#00a884]/80 rounded-full"
                    >
                      <Send className="w-4 h-4 text-white" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bottom Controls */}
          <div className="px-4 pb-8 safe-area-bottom">
            {/* Incoming call buttons */}
            {callState === "ringing" && isIncoming && (
              <div className="flex justify-center gap-16">
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => { haptic.warning(); handleRejectCall(); }}
                  className="w-16 h-16 rounded-full bg-[#f15c6d] flex items-center justify-center shadow-lg"
                  data-testid="reject-call-btn"
                >
                  <PhoneOff className="w-7 h-7 text-white" />
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => { haptic.success(); answerCall(); }}
                  className="w-16 h-16 rounded-full bg-[#00a884] flex items-center justify-center shadow-lg"
                  data-testid="answer-call-btn"
                >
                  <Phone className="w-7 h-7 text-white" />
                </motion.button>
              </div>
            )}

            {/* Active call controls - WhatsApp style */}
            {(callState === "calling" || (callState === "ringing" && !isIncoming) || callState === "connecting" || callState === "connected") && (
              <div className="flex justify-center items-center gap-3">
                {/* More Options Button (3 dots) */}
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => { 
                    haptic.light(); 
                    setShowEffects(!showEffects); 
                  }}
                  className="w-14 h-14 rounded-full bg-[#2a3942] flex items-center justify-center"
                  data-testid="more-options-btn"
                >
                  <MoreVertical className="w-6 h-6 text-white" />
                </motion.button>

                {/* Video Toggle */}
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => { haptic.light(); toggleVideo(); }}
                  className={`w-14 h-14 rounded-full flex items-center justify-center ${
                    !isVideoEnabled ? 'bg-white' : 'bg-[#2a3942]'
                  }`}
                  data-testid="video-toggle-btn"
                >
                  {isVideoEnabled ? (
                    <Video className="w-6 h-6 text-white" />
                  ) : (
                    <VideoOff className="w-6 h-6 text-[#2a3942]" />
                  )}
                </motion.button>

                {/* Speaker Toggle */}
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => { haptic.light(); toggleSpeaker(); }}
                  className={`w-14 h-14 rounded-full flex items-center justify-center ${
                    !isSpeakerOn ? 'bg-white' : 'bg-[#2a3942]'
                  }`}
                  data-testid="speaker-btn"
                >
                  {isSpeakerOn ? (
                    <Volume2 className="w-6 h-6 text-white" />
                  ) : (
                    <VolumeX className="w-6 h-6 text-[#2a3942]" />
                  )}
                </motion.button>

                {/* Mute Toggle */}
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => { haptic.light(); toggleMute(); }}
                  className={`w-14 h-14 rounded-full flex items-center justify-center ${
                    isMuted ? 'bg-white' : 'bg-[#2a3942]'
                  }`}
                  data-testid="mute-btn"
                >
                  {isMuted ? (
                    <MicOff className="w-6 h-6 text-[#2a3942]" />
                  ) : (
                    <Mic className="w-6 h-6 text-white" />
                  )}
                </motion.button>

                {/* End Call - Red */}
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => { haptic.warning(); handleEndCall(); }}
                  className="w-14 h-14 rounded-full bg-[#f15c6d] flex items-center justify-center shadow-lg"
                  data-testid="end-call-btn"
                >
                  <PhoneOff className="w-6 h-6 text-white" />
                </motion.button>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
