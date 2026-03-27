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
import { requestVideoCallPermissions, stopMediaStream, switchCamera as switchCameraUtil } from "@/utils/mediaPermissions";
import { 
  playRingtone, 
  stopRingtone, 
  playDialingTone, 
  stopDialingTone, 
  playEndCallSound,
  playConnectedSound,
  stopAllCallAudio 
} from "@/utils/callAudio";

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
  const pipWindowRef = useRef(null);

  // Initialize media stream with explicit permission request
  const initializeMedia = useCallback(async () => {
    console.log('[VideoCall] Initializing media for video call...');
    
    // Request permissions using the unified utility
    const result = await requestVideoCallPermissions();
    
    if (!result.granted) {
      console.error('[VideoCall] Permission denied:', result.error);
      setTimeout(() => {
        cleanup();
        onClose();
      }, 2000);
      return null;
    }
    
    // Store the stream
    localStreamRef.current = result.stream;
    
    // Attach to local video element
    if (localVideoRef.current && callType === "video") {
      localVideoRef.current.srcObject = result.stream;
      console.log('[VideoCall] Local video attached');
    }
    
    toast.success("Camera and microphone connected");
    haptic.success();
    return result.stream;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callType, onClose]);

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
        stopAllCallAudio(); // Stop ringtone/dialing
        playConnectedSound(); // Play connected sound
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

  // Initiate outgoing call
  const initiateCall = async () => {
    setCallState("calling");
    haptic.medium();
    
    // Play dialing tone for outgoing call
    playDialingTone();
    
    const stream = await initializeMedia();
    if (!stream) {
      setCallState("idle");
      stopDialingTone();
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
      // Keep dialing tone until connected
      
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
    stopRingtone(); // Stop incoming ringtone
    
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
    stopAllCallAudio(); // Stop all sounds
    
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
    stopAllCallAudio(); // Stop all sounds
    playEndCallSound(); // Play end call sound
    
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
    
    haptic.light();
    
    const result = await switchCameraUtil(localStreamRef.current, facingMode);
    
    if (result) {
      const { videoTrack, facingMode: newFacingMode } = result;
      
      // Replace track in peer connection
      if (peerConnectionRef.current) {
        const sender = peerConnectionRef.current.getSenders().find(s => s.track?.kind === 'video');
        if (sender) {
          await sender.replaceTrack(videoTrack);
        }
      }
      
      // Update local stream - remove old track, add new
      const oldVideoTrack = localStreamRef.current.getVideoTracks()[0];
      if (oldVideoTrack) {
        localStreamRef.current.removeTrack(oldVideoTrack);
      }
      localStreamRef.current.addTrack(videoTrack);
      
      // Update local video display
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
      }
      
      setFacingMode(newFacingMode);
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
    console.log('[VideoCall] Cleaning up resources...');
    
    // Stop all call audio
    stopAllCallAudio();
    
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    
    // Use utility to stop streams
    stopMediaStream(localStreamRef.current);
    localStreamRef.current = null;
    
    stopMediaStream(screenStreamRef.current);
    screenStreamRef.current = null;
    
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
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
          stopDialingTone(); // Stop dialing tone when answered
        } else if (data.type === "call_rejected" && data.call_id === callId) {
          toast.info("Call was declined");
          stopAllCallAudio();
          playEndCallSound();
          setCallState("ended");
          cleanup();
          setTimeout(() => onClose(), 1500);
        } else if (data.type === "call_ended" && data.call_id === callId) {
          stopAllCallAudio();
          playEndCallSound();
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

  // Handle incoming call - play ringtone
  useEffect(() => {
    if (isOpen && isIncoming && incomingCallId) {
      setCallId(incomingCallId);
      setCallState("ringing");
      playRingtone(); // Play ringtone for incoming call
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
        className="fixed inset-0 z-[100] bg-black"
      >
        {/* Video Call Screen - WhatsApp Style */}
        <div className="relative w-full h-full flex flex-col">
          
          {/* Remote Video (Full Screen Background) */}
          <div className="absolute inset-0 bg-black">
            {callType === "video" && callState === "connected" && (
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
            )}
          </div>

          {/* Top Header - Name & Status */}
          <div className="relative z-10 pt-12 px-4 text-center safe-area-top">
            <h2 className="text-white font-semibold text-xl">
              {remoteUser?.display_name || remoteUser?.username}
            </h2>
            <p className="text-gray-400 text-sm mt-1">
              {callState === "ringing" && isIncoming && "Incoming video call..."}
              {callState === "ringing" && !isIncoming && "Ringing..."}
              {callState === "calling" && "Calling..."}
              {callState === "connecting" && "Connecting..."}
              {callState === "connected" && formatDuration(duration)}
              {callState === "ended" && "Call ended"}
            </p>
          </div>

          {/* Right Side Buttons (WhatsApp style) */}
          <div className="absolute right-4 top-24 flex flex-col gap-4 z-10">
            {/* Add Participant */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => {
                haptic.medium();
                addPeopleToCall();
              }}
              className="w-14 h-14 rounded-full bg-[#3b4a54] flex items-center justify-center shadow-lg"
              data-testid="add-participant-btn"
            >
              <UserPlus className="w-6 h-6 text-white" />
            </motion.button>

            {/* Switch Camera */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => {
                haptic.light();
                switchCamera();
              }}
              className="w-14 h-14 rounded-full bg-[#3b4a54] flex items-center justify-center shadow-lg"
              data-testid="switch-camera-btn"
            >
              <RotateCcw className="w-6 h-6 text-white" />
            </motion.button>

            {/* Effects */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => {
                haptic.light();
                setShowEffects(!showEffects);
              }}
              className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg ${
                showEffects ? 'bg-white' : 'bg-[#3b4a54]'
              }`}
              data-testid="effects-btn"
            >
              <Sparkles className={`w-6 h-6 ${showEffects ? 'text-[#3b4a54]' : 'text-white'}`} />
            </motion.button>
          </div>

          {/* Local Video (PiP) */}
          {callType === "video" && callState === "connected" && isVideoEnabled && !isScreenSharing && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute top-24 left-4 w-28 h-40 rounded-2xl overflow-hidden border-2 border-white/20 bg-[#1a1a1a] shadow-xl z-10"
              drag
              dragConstraints={{ left: 0, right: 250, top: 0, bottom: 450 }}
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

          {/* Center Avatar (shown when no video) */}
          {!(callType === "video" && callState === "connected" && isVideoEnabled) && (
            <div className="flex-1 flex items-center justify-center z-10">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", damping: 20 }}
              >
                <motion.div
                  animate={
                    callState === "ringing" || callState === "calling" 
                      ? { scale: [1, 1.05, 1] }
                      : {}
                  }
                  transition={{ duration: 2, repeat: Infinity }}
                  className="relative"
                >
                  <Avatar className="w-40 h-40 ring-4 ring-white/10 shadow-2xl">
                    <AvatarImage src={remoteUser?.avatar} />
                    <AvatarFallback className="bg-gradient-to-br from-[#128C7E] to-[#075E54] text-white text-5xl font-light">
                      {(remoteUser?.display_name || remoteUser?.username || "?")[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  
                  {/* Pulse rings during calling */}
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
            </div>
          )}

          {/* Effects Panel */}
          <AnimatePresence>
            {showEffects && (
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                className="absolute bottom-36 left-4 right-4 bg-[#1f2c34]/95 backdrop-blur-xl rounded-3xl p-4 z-20"
              >
                <h3 className="text-white font-semibold mb-4 text-center">Effects</h3>
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { id: null, name: "None", icon: "✕" },
                    { id: "blur", name: "Blur", icon: "🌫️" },
                    { id: "beauty", name: "Beauty", icon: "✨" },
                    { id: "hearts", name: "Hearts", icon: "❤️" },
                  ].map((effect) => (
                    <button
                      key={effect.id || "none"}
                      onClick={() => { applyEffect(effect.id); haptic.light(); }}
                      className={`flex flex-col items-center gap-2 p-3 rounded-xl ${
                        activeEffect === effect.id ? 'bg-white/20 ring-2 ring-white' : 'bg-white/5'
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

          {/* Bottom Controls - WhatsApp Pill Style */}
          <div className="relative z-10 px-4 pb-8 safe-area-bottom">
            {/* Incoming call buttons */}
            {callState === "ringing" && isIncoming && (
              <div className="flex justify-center gap-16 mb-4">
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
                  {callType === "video" ? (
                    <Video className="w-7 h-7 text-white" />
                  ) : (
                    <Phone className="w-7 h-7 text-white" />
                  )}
                </motion.button>
              </div>
            )}

            {/* Active call controls - WhatsApp pill bar */}
            {(callState === "calling" || (callState === "ringing" && !isIncoming) || callState === "connecting" || callState === "connected") && (
              <motion.div 
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="bg-[#1f2c34] rounded-full p-2 flex justify-center items-center gap-2 shadow-2xl mx-auto max-w-md"
              >
                {/* More Options Button (•••) */}
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => { 
                    haptic.light(); 
                    setShowInCallChat(!showInCallChat);
                  }}
                  className="w-14 h-14 rounded-full bg-[#3b4a54] flex items-center justify-center"
                  data-testid="more-options-btn"
                >
                  <MoreVertical className="w-6 h-6 text-white" />
                </motion.button>

                {/* Video Toggle */}
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => { haptic.light(); toggleVideo(); }}
                  className={`w-14 h-14 rounded-full flex items-center justify-center ${
                    !isVideoEnabled ? 'bg-white' : 'bg-[#3b4a54]'
                  }`}
                  data-testid="video-toggle-btn"
                >
                  {isVideoEnabled ? (
                    <Video className="w-6 h-6 text-white" />
                  ) : (
                    <VideoOff className="w-6 h-6 text-[#3b4a54]" />
                  )}
                </motion.button>

                {/* Speaker Toggle */}
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => { haptic.light(); toggleSpeaker(); }}
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
                  onClick={() => { haptic.light(); toggleMute(); }}
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
                  onClick={() => { haptic.warning(); handleEndCall(); }}
                  className="w-14 h-14 rounded-full bg-[#f15c6d] flex items-center justify-center"
                  data-testid="end-call-btn"
                >
                  <PhoneOff className="w-6 h-6 text-white" />
                </motion.button>
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
