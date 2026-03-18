import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Phone, PhoneOff, Video, VideoOff, Mic, MicOff, 
  Volume2, VolumeX, X, Maximize2, Minimize2, 
  RotateCcw, User
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
  callId: incomingCallId = null
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
  
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
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
    }
  }, []);

  // Cleanup function - defined first to be available for other hooks
  const cleanup = useCallback(() => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
    }
    
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    
    stopRingtone();
  }, [stopRingtone]);

  // Initialize media stream
  const initializeMedia = useCallback(async () => {
    try {
      const constraints = {
        audio: true,
        video: callType === "video" ? { facingMode: "user" } : false
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;
      
      if (localVideoRef.current && callType === "video") {
        localVideoRef.current.srcObject = stream;
      }
      
      return stream;
    } catch (error) {
      console.error("Failed to get media:", error);
      
      // Handle permission denied or not available
      let errorMessage = "Failed to access camera/microphone";
      if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
        errorMessage = "Camera/microphone permission denied. Please allow access in your browser settings.";
      } else if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
        errorMessage = "No camera or microphone found on this device.";
      } else if (error.name === "NotReadableError" || error.name === "TrackStartError") {
        errorMessage = "Camera or microphone is already in use by another application.";
      }
      
      toast.error(errorMessage);
      
      // Auto-close the call dialog after showing error
      setTimeout(() => {
        cleanup();
        onClose();
      }, 2000);
      
      return null;
    }
  }, [callType, onClose, cleanup]);

  // Create peer connection
  const createPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    
    pc.onicecandidate = (event) => {
      if (event.candidate && callId) {
        // Send ICE candidate to the other peer
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
        // Use ref to avoid circular dependency
        if (handleEndCallRef.current) {
          handleEndCallRef.current();
        }
      }
    };
    
    // Add local tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current);
      });
    }
    
    peerConnectionRef.current = pc;
    return pc;
  }, [callId, token, stopRingtone]);

  // Start duration timer
  const startDurationTimer = () => {
    durationIntervalRef.current = setInterval(() => {
      setDuration(prev => prev + 1);
    }, 1000);
  };

  // Play ringtone
  const playRingtone = () => {
    try {
      ringtoneRef.current = new Audio('/sounds/ringtone.wav');
      ringtoneRef.current.loop = true;
      ringtoneRef.current.play().catch(() => {});
    } catch (e) {}
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
      
      // Create offer
      const pc = createPeerConnection();
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      // Send offer to recipient
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

  // End call - use useCallback and assign to ref
  const handleEndCall = useCallback(async () => {
    haptic.warning();
    stopRingtone();
    
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

  // Switch camera
  const switchCamera = async () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        const constraints = videoTrack.getConstraints();
        const newFacingMode = constraints.facingMode === "user" ? "environment" : "user";
        
        try {
          await videoTrack.applyConstraints({
            ...constraints,
            facingMode: newFacingMode
          });
          haptic.light();
        } catch (error) {
          console.error("Failed to switch camera:", error);
        }
      }
    }
  };

  // Handle WebSocket signals
  useEffect(() => {
    if (!ws) return;
    
    const handleSignal = async (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === "call_signal" && data.call_id === callId) {
        const pc = peerConnectionRef.current;
        if (!pc) return;
        
        if (data.signal_type === "offer") {
          await pc.setRemoteDescription(new RTCSessionDescription(data.data.sdp));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          
          // Send answer back
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
        className={`fixed inset-0 z-50 bg-black ${isFullscreen ? '' : 'p-4 flex items-center justify-center'}`}
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
                <Avatar className="w-32 h-32 mb-6 ring-4 ring-white/20">
                  <AvatarImage src={remoteUser?.avatar} />
                  <AvatarFallback className="bg-gradient-to-br from-[#00F0FF] to-[#7000FF] text-white text-4xl">
                    {(remoteUser?.display_name || remoteUser?.username || "?")[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
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
          {callType === "video" && callState === "connected" && isVideoEnabled && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute top-4 right-4 w-32 h-48 rounded-2xl overflow-hidden border-2 border-white/20 bg-black"
              drag
              dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
            >
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover transform scale-x-[-1]"
              />
            </motion.div>
          )}

          {/* Call Type Badge */}
          <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur">
            {callType === "video" ? (
              <Video className="w-4 h-4 text-[#00F0FF]" />
            ) : (
              <Phone className="w-4 h-4 text-[#00F0FF]" />
            )}
            <span className="text-sm text-white">
              {callType === "video" ? "Video Call" : "Voice Call"}
            </span>
          </div>

          {/* Fullscreen Toggle */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 backdrop-blur flex items-center justify-center text-white"
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>

          {/* Controls */}
          <div className="absolute bottom-8 left-0 right-0 px-6">
            {/* Incoming call buttons */}
            {callState === "ringing" && isIncoming && (
              <div className="flex justify-center gap-8">
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={handleRejectCall}
                  className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center text-white"
                  data-testid="reject-call-btn"
                >
                  <PhoneOff className="w-7 h-7" />
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={answerCall}
                  className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center text-white"
                  data-testid="answer-call-btn"
                >
                  <Phone className="w-7 h-7" />
                </motion.button>
              </div>
            )}

            {/* Active call controls */}
            {(callState === "calling" || callState === "ringing" && !isIncoming || callState === "connecting" || callState === "connected") && (
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

                {/* Video Toggle (only for video calls) */}
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

                {/* Switch Camera (only for video calls) */}
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
                  onClick={() => setIsSpeakerOn(!isSpeakerOn)}
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
                  className="w-14 h-14 rounded-full bg-red-500 flex items-center justify-center text-white"
                  data-testid="end-call-btn"
                >
                  <PhoneOff className="w-6 h-6" />
                </motion.button>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
