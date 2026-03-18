import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Phone, PhoneOff, Video, VideoOff, Mic, MicOff, 
  Volume2, VolumeX, X, Maximize2, Minimize2, 
  RotateCcw, User, UserPlus, Monitor, MonitorOff,
  MessageCircle, Sparkles, Send, Image as ImageIcon
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

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={`fixed inset-0 z-[100] bg-black ${isFullscreen ? '' : 'p-4 flex items-center justify-center'}`}
      >
        <motion.div
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          className={`relative ${isFullscreen ? 'w-full h-full' : 'w-full max-w-md rounded-3xl overflow-hidden'} bg-gradient-to-b from-[#1A1A1A] to-[#0A0A0A]`}
        >
          {/* Remote Video / Avatar */}
          <div className="absolute inset-0 flex items-center justify-center">
            {callType === "video" && callState === "connected" ? (
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center">
                <motion.div
                  animate={callState === "ringing" ? { scale: [1, 1.1, 1] } : {}}
                  transition={{ duration: 1, repeat: Infinity }}
                >
                  <Avatar className="w-32 h-32 mb-6 ring-4 ring-white/20">
                    <AvatarImage src={remoteUser?.avatar} />
                    <AvatarFallback className="bg-gradient-to-br from-[#00F0FF] to-[#7000FF] text-white text-4xl">
                      {(remoteUser?.display_name || remoteUser?.username || "?")[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </motion.div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  {remoteUser?.display_name || remoteUser?.username}
                </h2>
                <p className="text-gray-400">
                  {callState === "ringing" && isIncoming && "Incoming call..."}
                  {callState === "ringing" && !isIncoming && "Ringing..."}
                  {callState === "calling" && "Calling..."}
                  {callState === "connecting" && "Connecting..."}
                  {callState === "connected" && formatDuration(duration)}
                  {callState === "ended" && "Call ended"}
                </p>
              </div>
            )}
          </div>

          {/* Local Video (PiP) */}
          {callType === "video" && callState === "connected" && isVideoEnabled && !isScreenSharing && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute top-4 right-4 w-32 h-48 rounded-2xl overflow-hidden border-2 border-white/20 bg-black"
              drag
              dragConstraints={{ left: -200, right: 0, top: 0, bottom: 400 }}
            >
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${facingMode === "user" ? "scale-x-[-1]" : ""}`}
              />
              {activeEffect && (
                <div className="absolute inset-0 pointer-events-none">
                  <span className="absolute top-2 left-2 text-2xl">{
                    activeEffect === "hearts" ? "❤️" :
                    activeEffect === "stars" ? "⭐" :
                    activeEffect === "sparkles" ? "✨" : ""
                  }</span>
                </div>
              )}
            </motion.div>
          )}

          {/* Top Controls */}
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
            {/* Call Type Badge */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur">
              {callType === "video" ? (
                <Video className="w-4 h-4 text-[#00F0FF]" />
              ) : (
                <Phone className="w-4 h-4 text-[#00F0FF]" />
              )}
              <span className="text-sm text-white">
                {isScreenSharing ? "Screen Sharing" : (callType === "video" ? "Video Call" : "Voice Call")}
              </span>
              {callState === "connected" && (
                <span className="text-sm text-[#00F0FF]">{formatDuration(duration)}</span>
              )}
            </div>

            {/* Top Right Buttons */}
            <div className="flex items-center gap-2">
              {/* PiP Button */}
              {callState === "connected" && callType === "video" && (
                <button
                  onClick={togglePiP}
                  className={`w-10 h-10 rounded-full backdrop-blur flex items-center justify-center text-white ${
                    isPiPMode ? 'bg-[#00F0FF]' : 'bg-white/10'
                  }`}
                  data-testid="pip-btn"
                >
                  <Minimize2 className="w-5 h-5" />
                </button>
              )}
              
              {/* Fullscreen Toggle */}
              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="w-10 h-10 rounded-full bg-white/10 backdrop-blur flex items-center justify-center text-white"
                data-testid="fullscreen-btn"
              >
                {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* In-Call Chat Panel */}
          <AnimatePresence>
            {showInCallChat && (
              <motion.div
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                className="absolute top-0 right-0 bottom-0 w-80 bg-[#121212]/95 backdrop-blur-xl border-l border-white/10 z-20 flex flex-col"
              >
                <div className="p-4 border-b border-white/10 flex items-center justify-between">
                  <h3 className="text-white font-semibold">In-Call Messages</h3>
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
                    <div key={msg.id} className="bg-white/5 rounded-lg p-3">
                      <p className="text-xs text-[#00F0FF] mb-1">{msg.sender}</p>
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
                      placeholder="Type a message..."
                      className="flex-1 bg-white/5 border-white/10 text-white"
                    />
                    <Button
                      size="icon"
                      onClick={sendInCallMessage}
                      disabled={!inCallMessage.trim()}
                      className="bg-[#00F0FF] hover:bg-[#00F0FF]/80"
                    >
                      <Send className="w-4 h-4 text-black" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Effects Panel */}
          <AnimatePresence>
            {showEffects && (
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                className="absolute bottom-24 left-0 right-0 bg-[#121212]/95 backdrop-blur-xl rounded-t-3xl p-4 z-20"
              >
                <h3 className="text-white font-semibold mb-4">Video Effects</h3>
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
                        activeEffect === effect.id ? 'bg-[#00F0FF]/20 border border-[#00F0FF]' : 'bg-white/5'
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

          {/* Controls */}
          <div className="absolute bottom-8 left-0 right-0 px-4">
            {/* Incoming call buttons */}
            {callState === "ringing" && isIncoming && (
              <div className="flex justify-center gap-8">
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={handleRejectCall}
                  className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center text-white shadow-lg shadow-red-500/30"
                  data-testid="reject-call-btn"
                >
                  <PhoneOff className="w-7 h-7" />
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={answerCall}
                  className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center text-white shadow-lg shadow-green-500/30"
                  data-testid="answer-call-btn"
                >
                  <Phone className="w-7 h-7" />
                </motion.button>
              </div>
            )}

            {/* Active call controls */}
            {(callState === "calling" || (callState === "ringing" && !isIncoming) || callState === "connecting" || callState === "connected") && (
              <div className="space-y-4">
                {/* Secondary Controls Row */}
                {callState === "connected" && (
                  <div className="flex justify-center gap-3 mb-4">
                    {/* Effects Button */}
                    {callType === "video" && (
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setShowEffects(!showEffects)}
                        className={`w-12 h-12 rounded-full flex items-center justify-center ${
                          showEffects ? 'bg-[#00F0FF] text-black' : 'bg-white/10 text-white'
                        }`}
                        data-testid="effects-btn"
                      >
                        <Sparkles className="w-5 h-5" />
                      </motion.button>
                    )}

                    {/* Add People */}
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={addPeopleToCall}
                      className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white"
                      data-testid="add-people-btn"
                    >
                      <UserPlus className="w-5 h-5" />
                    </motion.button>

                    {/* Screen Share */}
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={toggleScreenShare}
                      className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        isScreenSharing ? 'bg-[#00F0FF] text-black' : 'bg-white/10 text-white'
                      }`}
                      data-testid="screen-share-btn"
                    >
                      {isScreenSharing ? <MonitorOff className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
                    </motion.button>

                    {/* In-Call Chat */}
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setShowInCallChat(!showInCallChat)}
                      className={`w-12 h-12 rounded-full flex items-center justify-center relative ${
                        showInCallChat ? 'bg-[#00F0FF] text-black' : 'bg-white/10 text-white'
                      }`}
                      data-testid="in-call-chat-btn"
                    >
                      <MessageCircle className="w-5 h-5" />
                      {inCallMessages.length > 0 && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
                          {inCallMessages.length}
                        </span>
                      )}
                    </motion.button>
                  </div>
                )}

                {/* Main Controls Row */}
                <div className="flex justify-center gap-4">
                  {/* Mute */}
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={toggleMute}
                    className={`w-14 h-14 rounded-full flex items-center justify-center ${
                      isMuted ? 'bg-white text-black' : 'bg-white/20 text-white'
                    }`}
                    data-testid="mute-btn"
                  >
                    {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                  </motion.button>

                  {/* Video Toggle */}
                  {callType === "video" && (
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={toggleVideo}
                      className={`w-14 h-14 rounded-full flex items-center justify-center ${
                        !isVideoEnabled ? 'bg-white text-black' : 'bg-white/20 text-white'
                      }`}
                      data-testid="video-toggle-btn"
                    >
                      {isVideoEnabled ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
                    </motion.button>
                  )}

                  {/* Switch Camera (Rotate) */}
                  {callType === "video" && (
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={switchCamera}
                      className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center text-white"
                      data-testid="switch-camera-btn"
                    >
                      <RotateCcw className="w-6 h-6" />
                    </motion.button>
                  )}

                  {/* Speaker */}
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={toggleSpeaker}
                    className={`w-14 h-14 rounded-full flex items-center justify-center ${
                      !isSpeakerOn ? 'bg-white text-black' : 'bg-white/20 text-white'
                    }`}
                    data-testid="speaker-btn"
                  >
                    {isSpeakerOn ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}
                  </motion.button>

                  {/* End Call */}
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={handleEndCall}
                    className="w-14 h-14 rounded-full bg-red-500 flex items-center justify-center text-white shadow-lg shadow-red-500/30"
                    data-testid="end-call-btn"
                  >
                    <PhoneOff className="w-6 h-6" />
                  </motion.button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
