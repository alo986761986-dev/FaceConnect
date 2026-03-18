import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useParams } from "react-router-dom";
import {
  Video, VideoOff, Mic, MicOff, Monitor, MonitorOff,
  MessageCircle, Heart, Flame, PartyPopper, Laugh, Star,
  Diamond, Rocket, Users, X, Send, Gift, Share2, MoreVertical,
  ArrowLeft, Radio, Eye, PhoneOff, SwitchCamera, Camera, AlertCircle,
  FlipHorizontal, Pause, Play, VolumeX, Volume2, Sparkles, Wand2,
  RotateCcw, Settings2, Maximize2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { useSettings } from "@/context/SettingsContext";
import { haptic } from "@/utils/mobile";
import ShareSheet from "@/components/ShareSheet";
import LiveEffectsPanel from "@/components/live/LiveEffectsPanel";
import LiveGiftPanel, { GiftAnimation } from "@/components/live/LiveGiftPanel";
import { requestLiveStreamPermissions } from "@/utils/permissions";

const API_URL = process.env.REACT_APP_BACKEND_URL;

// ICE servers for WebRTC
const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
  ]
};

// Reaction icons mapping
const REACTIONS = [
  { type: "heart", icon: Heart, color: "#FF3366" },
  { type: "fire", icon: Flame, color: "#FF9500" },
  { type: "clap", icon: PartyPopper, color: "#FFD700" },
  { type: "laugh", icon: Laugh, color: "#00FF88" },
  { type: "wow", icon: Star, color: "#00F0FF" }
];

// Gift types
const GIFTS = [
  { type: "heart", icon: Heart, value: 1, color: "#FF3366" },
  { type: "star", icon: Star, value: 5, color: "#FFD700" },
  { type: "fire", icon: Flame, value: 10, color: "#FF9500" },
  { type: "diamond", icon: Diamond, value: 20, color: "#00F0FF" },
  { type: "rocket", icon: Rocket, value: 50, color: "#7000FF" }
];

// Floating Reaction Animation
function FloatingReaction({ reaction, onComplete }) {
  const Icon = REACTIONS.find(r => r.type === reaction.type)?.icon || Heart;
  const color = REACTIONS.find(r => r.type === reaction.type)?.color || "#FF3366";
  
  return (
    <motion.div
      initial={{ opacity: 1, y: 0, x: Math.random() * 100 - 50 }}
      animate={{ opacity: 0, y: -200 }}
      transition={{ duration: 2 }}
      onAnimationComplete={onComplete}
      className="absolute bottom-20 right-4 pointer-events-none"
    >
      <Icon className="w-8 h-8" style={{ color }} />
    </motion.div>
  );
}

// Chat Message Component
function ChatMessage({ message, isDark }) {
  return (
    <div className="flex items-start gap-2 py-1">
      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#00F0FF] to-[#7000FF] flex items-center justify-center flex-shrink-0">
        <span className="text-xs text-white font-bold">
          {message.username?.[0]?.toUpperCase()}
        </span>
      </div>
      <div>
        <span className="text-xs font-medium text-[#00F0FF]">{message.username}</span>
        <span className={`text-sm ml-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
          {message.message}
        </span>
      </div>
    </div>
  );
}

// Gift Animation - Now imported from LiveGiftPanel

export default function LiveStream() {
  const { streamId } = useParams();
  const navigate = useNavigate();
  const { user, token, ws } = useAuth();
  const { isDark, t } = useSettings();
  
  const [stream, setStream] = useState(null);
  const [isStreamer, setIsStreamer] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Video/Audio state
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [facingMode, setFacingMode] = useState("user");
  const [isMirrored, setIsMirrored] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [noiseReduction, setNoiseReduction] = useState(true);
  
  // Chat state
  const [chatMessage, setChatMessage] = useState("");
  const [chatMessages, setChatMessages] = useState([]);
  const [showChat, setShowChat] = useState(true);
  
  // Reactions & Gifts
  const [floatingReactions, setFloatingReactions] = useState([]);
  const [showGiftPanel, setShowGiftPanel] = useState(false);
  const [currentGift, setCurrentGift] = useState(null);
  
  // Effects
  const [showEffectsPanel, setShowEffectsPanel] = useState(false);
  const [activeEffects, setActiveEffects] = useState({});
  const [activeStickers, setActiveStickers] = useState([]);
  const [voiceEffect, setVoiceEffect] = useState("normal");
  const [virtualBackground, setVirtualBackground] = useState("none");
  
  // Settings
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  
  // WebRTC state
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("connecting");
  const [showShareSheet, setShowShareSheet] = useState(false);
  const [showPermissionDialog, setShowPermissionDialog] = useState(false);
  const [permissionError, setPermissionError] = useState(null);
  const [permissionRequested, setPermissionRequested] = useState(false);
  const peerConnectionsRef = useRef({}); // For streamer: map of viewer_id -> RTCPeerConnection
  const peerConnectionRef = useRef(null); // For viewer: single connection to streamer
  
  // Media refs
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const chatScrollRef = useRef(null);
  const audioContextRef = useRef(null);
  const noiseFilterRef = useRef(null);

  // Fetch stream data
  useEffect(() => {
    if (streamId && token) {
      fetchStream();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streamId, token]);

  // Auto-scroll chat
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // WebSocket message handler for WebRTC signaling
  useEffect(() => {
    if (!ws) return;
    
    const handleMessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === "webrtc_signal") {
          handleWebRTCSignal(data);
        } else if (data.type === "viewer_joined") {
          // Streamer: new viewer joined, send offer
          if (isStreamer && mediaStreamRef.current) {
            createPeerConnectionForViewer(data.user.id);
          }
        } else if (data.type === "stream_chat") {
          setChatMessages(prev => [...prev, data.message]);
        } else if (data.type === "stream_reaction") {
          const id = Date.now();
          setFloatingReactions(prev => [...prev, { id, type: data.reaction }]);
        } else if (data.type === "stream_gift") {
          setCurrentGift(data.gift);
        } else if (data.type === "stream_ended") {
          toast.info("Stream has ended");
          navigate("/live");
        }
      } catch (e) {
        // Not JSON or error parsing
      }
    };
    
    ws.addEventListener("message", handleMessage);
    return () => ws.removeEventListener("message", handleMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ws, isStreamer, navigate]);

  // Handle incoming WebRTC signals
  const handleWebRTCSignal = async (data) => {
    const { signal_type, from_user_id, data: signalData } = data;
    
    if (signal_type === "offer" && !isStreamer) {
      // Viewer receives offer from streamer
      await handleOffer(signalData, from_user_id);
    } else if (signal_type === "answer" && isStreamer) {
      // Streamer receives answer from viewer
      await handleAnswer(signalData, from_user_id);
    } else if (signal_type === "ice-candidate") {
      // Handle ICE candidate
      await handleIceCandidate(signalData, from_user_id);
    }
  };

  // Create peer connection for viewer (streamer side)
  const createPeerConnectionForViewer = async (viewerId) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnectionsRef.current[viewerId] = pc;
    
    // Add local stream tracks
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, mediaStreamRef.current);
      });
    }
    
    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignal("ice-candidate", { candidate: event.candidate }, viewerId);
      }
    };
    
    pc.onconnectionstatechange = () => {
      console.log(`Connection to ${viewerId}:`, pc.connectionState);
    };
    
    // Create and send offer
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    sendSignal("offer", { sdp: pc.localDescription }, viewerId);
  };

  // Handle offer (viewer side)
  const handleOffer = async (signalData, streamerId) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnectionRef.current = pc;
    
    // Handle incoming tracks
    pc.ontrack = (event) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
      setIsConnected(true);
      setConnectionStatus("connected");
    };
    
    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignal("ice-candidate", { candidate: event.candidate });
      }
    };
    
    pc.onconnectionstatechange = () => {
      console.log("Connection state:", pc.connectionState);
      if (pc.connectionState === "connected") {
        setIsConnected(true);
        setConnectionStatus("connected");
      } else if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
        setIsConnected(false);
        setConnectionStatus("reconnecting");
      }
    };
    
    // Set remote description and create answer
    await pc.setRemoteDescription(new RTCSessionDescription(signalData.sdp));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    sendSignal("answer", { sdp: pc.localDescription });
  };

  // Handle answer (streamer side)
  const handleAnswer = async (signalData, viewerId) => {
    const pc = peerConnectionsRef.current[viewerId];
    if (pc) {
      await pc.setRemoteDescription(new RTCSessionDescription(signalData.sdp));
    }
  };

  // Handle ICE candidate
  const handleIceCandidate = async (signalData, fromUserId) => {
    if (isStreamer) {
      const pc = peerConnectionsRef.current[fromUserId];
      if (pc) {
        await pc.addIceCandidate(new RTCIceCandidate(signalData.candidate));
      }
    } else {
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(signalData.candidate));
      }
    }
  };

  // Send WebRTC signal
  const sendSignal = async (signalType, data, targetUserId = null) => {
    try {
      await fetch(`${API_URL}/api/streams/${streamId}/signal?token=${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stream_id: streamId,
          signal_type: signalType,
          data,
          target_user_id: targetUserId
        })
      });
    } catch (error) {
      console.error("Failed to send signal:", error);
    }
  };

  const fetchStream = async () => {
    try {
      const response = await fetch(`${API_URL}/api/streams/${streamId}?token=${token}`);
      if (!response.ok) throw new Error("Stream not found");
      
      const data = await response.json();
      setStream(data);
      setIsStreamer(data.user_id === user?.id);
      setChatMessages(data.chat_messages || []);
      setLoading(false);
      
      if (data.user_id !== user?.id) {
        // Join as viewer
        await fetch(`${API_URL}/api/streams/${streamId}/join?token=${token}`, {
          method: "POST"
        });
      }
    } catch (error) {
      toast.error("Failed to load stream");
      navigate("/");
    }
  };

  // Start camera for streamer
  const startCamera = async () => {
    // Show permission dialog first if not already requested
    if (!permissionRequested) {
      setShowPermissionDialog(true);
      return;
    }
    
    try {
      const result = await requestLiveStreamPermissions();
      
      if (!result.granted) {
        setPermissionError(result.error);
        toast.error(result.error);
        return;
      }
      
      mediaStreamRef.current = result.stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = result.stream;
      }
      setConnectionStatus("broadcasting");
      setPermissionError(null);
      
      // If viewers are already connected, create peer connections
      if (isStreamer && result.stream) {
        // Refresh stream to get current viewers
        const response = await fetch(`${API_URL}/api/streams/${streamId}?token=${token}`);
        if (response.ok) {
          const data = await response.json();
          data.viewers?.forEach(viewerId => {
            createPeerConnectionForViewer(viewerId);
          });
        }
      }
    } catch (error) {
      setPermissionError("Failed to access camera: " + error.message);
      toast.error("Failed to access camera");
      console.error("Camera error:", error);
    }
  };

  // Handle permission request from dialog
  const handlePermissionRequest = async () => {
    setPermissionRequested(true);
    setShowPermissionDialog(false);
    haptic.medium();
    
    const result = await requestLiveStreamPermissions();
    
    if (!result.granted) {
      setPermissionError(result.error);
      toast.error(result.error);
      return;
    }
    
    mediaStreamRef.current = result.stream;
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = result.stream;
    }
    setConnectionStatus("broadcasting");
    setPermissionError(null);
    toast.success("Camera and microphone ready!");
    
    // Create peer connections for existing viewers
    if (isStreamer && result.stream) {
      const response = await fetch(`${API_URL}/api/streams/${streamId}?token=${token}`);
      if (response.ok) {
        const data = await response.json();
        data.viewers?.forEach(viewerId => {
          createPeerConnectionForViewer(viewerId);
        });
      }
    }
  };

  // Switch camera (front/back)
  const switchCameraFacing = async () => {
    const newFacingMode = facingMode === "user" ? "environment" : "user";
    
    // Stop current tracks
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
    }
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: newFacingMode, width: 1280, height: 720 },
        audio: true
      });
      
      mediaStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      
      // Update peer connections with new stream
      Object.values(peerConnectionsRef.current).forEach(pc => {
        const senders = pc.getSenders();
        stream.getTracks().forEach(track => {
          const sender = senders.find(s => s.track?.kind === track.kind);
          if (sender) {
            sender.replaceTrack(track);
          }
        });
      });
      
      setFacingMode(newFacingMode);
      haptic.light();
    } catch (error) {
      toast.error("Failed to switch camera");
    }
  };

  // Toggle video
  const toggleVideo = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getVideoTracks().forEach(track => {
        track.enabled = !videoEnabled;
      });
      setVideoEnabled(!videoEnabled);
      haptic.light();
    }
  };

  // Toggle audio
  const toggleAudio = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !audioEnabled;
      });
      setAudioEnabled(!audioEnabled);
      haptic.light();
    }
  };

  // Mirror video
  const toggleMirror = () => {
    setIsMirrored(!isMirrored);
    haptic.light();
    toast.success(isMirrored ? "Mirror off" : "Mirror on");
  };

  // Pause/Resume stream
  const togglePause = () => {
    if (mediaStreamRef.current) {
      const newPaused = !isPaused;
      mediaStreamRef.current.getTracks().forEach(track => {
        track.enabled = !newPaused;
      });
      setIsPaused(newPaused);
      haptic.medium();
      toast.info(newPaused ? "Stream paused" : "Stream resumed");
    }
  };

  // Toggle noise reduction
  const toggleNoiseReduction = async () => {
    const newState = !noiseReduction;
    setNoiseReduction(newState);
    haptic.light();
    
    if (mediaStreamRef.current) {
      const audioTrack = mediaStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        try {
          await audioTrack.applyConstraints({
            noiseSuppression: newState,
            echoCancellation: newState,
            autoGainControl: newState
          });
          toast.success(newState ? "Noise reduction enabled" : "Noise reduction disabled");
        } catch (error) {
          console.error("Failed to apply audio constraints:", error);
        }
      }
    }
  };

  // Rotate camera (for mobile)
  const rotateCamera = async () => {
    haptic.medium();
    await switchCameraFacing();
  };

  // Apply effects
  const handleApplyEffects = (effects) => {
    setActiveEffects(effects);
    // In a real implementation, you would apply these effects to the video stream
    // using WebGL, Canvas filters, or a library like TensorFlow.js
    console.log("Applied effects:", effects);
  };

  // Apply sticker
  const handleApplySticker = (sticker) => {
    setActiveStickers(prev => [...prev, { id: Date.now(), emoji: sticker, x: 50, y: 50 }]);
  };

  // Apply voice effect
  const handleApplyVoiceEffect = (effect) => {
    setVoiceEffect(effect.id);
    // In a real implementation, you would apply audio processing
    console.log("Applied voice effect:", effect);
  };

  // Apply sound effect
  const handleApplySoundEffect = (effect) => {
    // In a real implementation, you would play the sound effect
    console.log("Playing sound effect:", effect);
    toast.success(`Playing: ${effect.name}`);
  };

  // Apply virtual background
  const handleApplyBackground = (bg) => {
    setVirtualBackground(bg.id);
    // In a real implementation, you would use a library like @mediapipe/selfie_segmentation
    console.log("Applied background:", bg);
  };

  // Send gift
  const handleSendGift = async (giftData) => {
    try {
      const response = await fetch(`${API_URL}/api/streams/${streamId}/gift?token=${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gift_type: giftData.gift.id,
          quantity: giftData.quantity,
          gift_name: giftData.gift.name,
          gift_color: giftData.gift.color
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setCurrentGift({
          ...giftData.gift,
          quantity: giftData.quantity,
          from_username: user?.display_name || user?.username
        });
      }
    } catch (error) {
      throw error;
    }
  };

  // Toggle screen sharing
  const toggleScreenShare = async () => {
    try {
      if (!isScreenSharing) {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true
        });
        
        // Update local video preview
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }
        
        // Update peer connections with screen share
        Object.values(peerConnectionsRef.current).forEach(pc => {
          const senders = pc.getSenders();
          screenStream.getTracks().forEach(track => {
            const sender = senders.find(s => s.track?.kind === track.kind);
            if (sender) {
              sender.replaceTrack(track);
            }
          });
        });
        
        // Notify backend
        await fetch(`${API_URL}/api/streams/${streamId}/screen-share?token=${token}&enabled=true`, {
          method: "POST"
        });
        
        setIsScreenSharing(true);
        haptic.success();
        
        // Handle when user stops sharing
        screenStream.getVideoTracks()[0].onended = () => {
          stopScreenShare();
        };
      } else {
        await stopScreenShare();
      }
    } catch (error) {
      toast.error("Screen sharing failed");
    }
  };

  const stopScreenShare = async () => {
    // Switch back to camera
    if (mediaStreamRef.current && localVideoRef.current) {
      localVideoRef.current.srcObject = mediaStreamRef.current;
      
      // Update peer connections back to camera
      Object.values(peerConnectionsRef.current).forEach(pc => {
        const senders = pc.getSenders();
        mediaStreamRef.current.getTracks().forEach(track => {
          const sender = senders.find(s => s.track?.kind === track.kind);
          if (sender) {
            sender.replaceTrack(track);
          }
        });
      });
    }
    
    await fetch(`${API_URL}/api/streams/${streamId}/screen-share?token=${token}&enabled=false`, {
      method: "POST"
    });
    
    setIsScreenSharing(false);
    haptic.light();
  };

  // Send chat message
  const sendChatMessage = async () => {
    if (!chatMessage.trim()) return;
    
    try {
      const response = await fetch(`${API_URL}/api/streams/${streamId}/chat?token=${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: chatMessage })
      });
      
      if (response.ok) {
        const data = await response.json();
        setChatMessages(prev => [...prev, data.message]);
        setChatMessage("");
        haptic.light();
      }
    } catch (error) {
      toast.error("Failed to send message");
    }
  };

  // Send reaction
  const sendReaction = async (reactionType) => {
    haptic.medium();
    
    // Add floating animation
    const id = Date.now();
    setFloatingReactions(prev => [...prev, { id, type: reactionType }]);
    
    try {
      await fetch(`${API_URL}/api/streams/${streamId}/react?token=${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reaction_type: reactionType })
      });
    } catch (error) {
      // Silent fail for reactions
    }
  };

  // Send gift
  const sendGift = async (giftType) => {
    haptic.success();
    setShowGiftPanel(false);
    
    try {
      const response = await fetch(`${API_URL}/api/streams/${streamId}/gift?token=${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gift_type: giftType, quantity: 1 })
      });
      
      if (response.ok) {
        const data = await response.json();
        setCurrentGift(data.gift);
        toast.success("Gift sent!");
      }
    } catch (error) {
      toast.error("Failed to send gift");
    }
  };

  // End stream
  const endStream = async () => {
    try {
      await fetch(`${API_URL}/api/streams/${streamId}/end?token=${token}`, {
        method: "POST"
      });
      
      // Close all peer connections
      Object.values(peerConnectionsRef.current).forEach(pc => pc.close());
      peerConnectionsRef.current = {};
      
      // Stop all tracks
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
      
      toast.success("Stream ended");
      navigate("/live");
    } catch (error) {
      toast.error("Failed to end stream");
    }
  };

  // Leave stream (viewer)
  const leaveStream = async () => {
    try {
      // Close peer connection
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
      
      await fetch(`${API_URL}/api/streams/${streamId}/leave?token=${token}`, {
        method: "POST"
      });
      navigate("/live");
    } catch (error) {
      navigate("/live");
    }
  };

  // Start camera when streamer loads
  useEffect(() => {
    if (!loading && isStreamer) {
      startCamera();
    }
    
    return () => {
      // Cleanup
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
      
      // Close all peer connections
      Object.values(peerConnectionsRef.current).forEach(pc => pc.close());
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, isStreamer]);

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-[#0A0A0A]' : 'bg-gray-50'}`}>
        <div className="w-8 h-8 border-2 border-[#00F0FF] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDark ? 'bg-black' : 'bg-gray-900'} relative overflow-hidden`}>
      {/* Video Area */}
      <div className="absolute inset-0">
        {isStreamer ? (
          // Streamer sees their own video
          <>
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${isMirrored && facingMode === "user" && !isScreenSharing ? "scale-x-[-1]" : ""}`}
            />
            {/* Pause Overlay */}
            {isPaused && (
              <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
                <div className="text-center">
                  <Pause className="w-16 h-16 text-white mx-auto mb-4" />
                  <p className="text-white text-xl font-bold">Stream Paused</p>
                  <p className="text-gray-400">Viewers see a frozen frame</p>
                </div>
              </div>
            )}
            {/* Active Stickers */}
            {activeStickers.map((sticker) => (
              <motion.div
                key={sticker.id}
                drag
                dragMomentum={false}
                className="absolute text-4xl cursor-move"
                style={{ left: `${sticker.x}%`, top: `${sticker.y}%` }}
                onDragEnd={(_, info) => {
                  // Update sticker position
                }}
              >
                {sticker.emoji}
              </motion.div>
            ))}
          </>
        ) : (
          // Viewer sees remote stream
          <>
            {isConnected ? (
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-[#1A1A1A] to-[#0A0A0A] flex items-center justify-center">
                <div className="text-center">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#00F0FF] to-[#7000FF] flex items-center justify-center mx-auto mb-4">
                    <span className="text-4xl text-white font-bold">
                      {stream?.display_name?.[0]?.toUpperCase() || "?"}
                    </span>
                  </div>
                  <p className="text-white text-xl font-bold">{stream?.display_name}</p>
                  <p className="text-gray-400">@{stream?.username}</p>
                  <p className="text-[#00F0FF] text-sm mt-4">
                    {connectionStatus === "connecting" && "Connecting to stream..."}
                    {connectionStatus === "reconnecting" && "Reconnecting..."}
                  </p>
                </div>
              </div>
            )}
          </>
        )}
        
        {/* Video overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 pointer-events-none" />
      </div>

      {/* Top Header */}
      <div className="absolute top-0 left-0 right-0 z-10 p-4">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={isStreamer ? endStream : leaveStream}
            className="text-white bg-black/40 backdrop-blur-lg rounded-full"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          
          <div className="flex items-center gap-2">
            {/* Live Badge */}
            <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-red-500">
              <Radio className="w-4 h-4 text-white animate-pulse" />
              <span className="text-white text-sm font-bold">LIVE</span>
            </div>
            
            {/* Viewer Count */}
            <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-black/40 backdrop-blur-lg">
              <Eye className="w-4 h-4 text-white" />
              <span className="text-white text-sm font-medium">{stream?.viewer_count || 0}</span>
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="icon"
            className="text-white bg-black/40 backdrop-blur-lg rounded-full"
          >
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className="p-2">
                  <MoreVertical className="w-5 h-5" />
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-[#1A1A1A] border-white/10 w-56">
                {isStreamer && (
                  <>
                    <DropdownMenuItem
                      onClick={() => setShowSettingsDialog(true)}
                      className="text-white hover:bg-white/10 cursor-pointer"
                    >
                      <Settings2 className="w-4 h-4 mr-3" />
                      Stream Settings
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={toggleNoiseReduction}
                      className="text-white hover:bg-white/10 cursor-pointer"
                    >
                      <VolumeX className="w-4 h-4 mr-3" />
                      {noiseReduction ? "Disable" : "Enable"} Noise Reduction
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={toggleMirror}
                      className="text-white hover:bg-white/10 cursor-pointer"
                    >
                      <FlipHorizontal className="w-4 h-4 mr-3" />
                      {isMirrored ? "Disable" : "Enable"} Mirror
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-white/10" />
                  </>
                )}
                <DropdownMenuItem
                  onClick={() => setShowShareSheet(true)}
                  className="text-white hover:bg-white/10 cursor-pointer"
                >
                  <Share2 className="w-4 h-4 mr-3" />
                  Share Stream
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    const el = document.documentElement;
                    if (el.requestFullscreen) el.requestFullscreen();
                  }}
                  className="text-white hover:bg-white/10 cursor-pointer"
                >
                  <Maximize2 className="w-4 h-4 mr-3" />
                  Fullscreen
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </Button>
        </div>
        
        {/* Stream Title */}
        <div className="mt-4">
          <h1 className="text-white text-xl font-bold">{stream?.title}</h1>
          <p className="text-gray-300 text-sm">{stream?.display_name} @{stream?.username}</p>
        </div>
      </div>

      {/* Floating Reactions */}
      <AnimatePresence>
        {floatingReactions.map(reaction => (
          <FloatingReaction
            key={reaction.id}
            reaction={reaction}
            onComplete={() => setFloatingReactions(prev => prev.filter(r => r.id !== reaction.id))}
          />
        ))}
      </AnimatePresence>

      {/* Gift Animation */}
      <AnimatePresence>
        {currentGift && (
          <GiftAnimation
            gift={currentGift}
            onComplete={() => setCurrentGift(null)}
          />
        )}
      </AnimatePresence>

      {/* Chat Area */}
      <AnimatePresence>
        {showChat && (
          <motion.div
            initial={{ opacity: 0, x: -100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            className="absolute bottom-32 left-4 right-20 z-10"
          >
            <ScrollArea className="h-48" ref={chatScrollRef}>
              <div className="space-y-1 p-2 bg-black/40 backdrop-blur-lg rounded-xl">
                {chatMessages.map((msg, idx) => (
                  <ChatMessage key={msg.id || idx} message={msg} isDark={true} />
                ))}
              </div>
            </ScrollArea>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reaction Buttons (Right Side) */}
      <div className="absolute right-4 bottom-32 z-10 flex flex-col gap-2">
        {REACTIONS.map(({ type, icon: Icon, color }) => (
          <motion.button
            key={type}
            whileTap={{ scale: 0.9 }}
            onClick={() => sendReaction(type)}
            className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-lg flex items-center justify-center"
          >
            <Icon className="w-6 h-6" style={{ color }} />
          </motion.button>
        ))}
        
        {/* Gift Button */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setShowGiftPanel(true)}
          className="w-12 h-12 rounded-full bg-gradient-to-br from-[#FFD700] to-[#FF9500] flex items-center justify-center"
        >
          <Gift className="w-6 h-6 text-white" />
        </motion.button>

        {/* Share Button */}
        <motion.button
          data-testid="share-live-btn"
          whileTap={{ scale: 0.9 }}
          onClick={() => setShowShareSheet(true)}
          className="w-12 h-12 rounded-full bg-gradient-to-br from-[#00F0FF] to-[#7000FF] flex items-center justify-center"
        >
          <Share2 className="w-6 h-6 text-white" />
        </motion.button>
      </div>

      {/* Bottom Controls */}
      <div className="absolute bottom-0 left-0 right-0 z-10 p-4">
        {/* Chat Input */}
        <div className="flex items-center gap-2 mb-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowChat(!showChat)}
            className="text-white bg-black/40 backdrop-blur-lg rounded-full flex-shrink-0"
          >
            <MessageCircle className="w-5 h-5" />
          </Button>
          
          <div className="flex-1 relative">
            <Input
              placeholder="Say something..."
              value={chatMessage}
              onChange={(e) => setChatMessage(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && sendChatMessage()}
              className="w-full bg-black/40 backdrop-blur-lg border-white/10 text-white placeholder:text-gray-400 pr-12 rounded-full"
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={sendChatMessage}
              className="absolute right-1 top-1/2 -translate-y-1/2 text-[#00F0FF]"
            >
              <Send className="w-5 h-5" />
            </Button>
          </div>
        </div>
        
        {/* Streamer Controls */}
        {isStreamer && (
          <div className="flex flex-col gap-4">
            {/* Top Row - Effects & Enhance */}
            <div className="flex items-center justify-center gap-3">
              <Button
                variant="ghost"
                onClick={() => setShowEffectsPanel(true)}
                className="rounded-full bg-gradient-to-r from-[#FF3366] to-[#7000FF] hover:opacity-90"
                data-testid="effects-btn"
              >
                <Sparkles className="w-5 h-5 text-white mr-2" />
                <span className="text-white">Effects</span>
              </Button>
              
              <Button
                variant="ghost"
                onClick={() => {
                  haptic.success();
                  toast.success("AI Enhancement applied!");
                }}
                className="rounded-full bg-gradient-to-r from-[#00F0FF] to-[#7000FF] hover:opacity-90"
                data-testid="enhance-btn"
              >
                <Wand2 className="w-5 h-5 text-white mr-2" />
                <span className="text-white">Enhance</span>
              </Button>
            </div>
            
            {/* Bottom Row - Camera Controls */}
            <div className="flex items-center justify-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={rotateCamera}
                className="w-12 h-12 rounded-full bg-white/20"
                title="Rotate Camera"
              >
                <RotateCcw className="w-5 h-5 text-white" />
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleMirror}
                className={`w-12 h-12 rounded-full ${isMirrored ? 'bg-[#00F0FF]' : 'bg-white/20'}`}
                title="Mirror"
              >
                <FlipHorizontal className={`w-5 h-5 ${isMirrored ? 'text-black' : 'text-white'}`} />
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleVideo}
                className={`w-14 h-14 rounded-full ${videoEnabled ? 'bg-white/20' : 'bg-red-500'}`}
              >
                {videoEnabled ? <Video className="w-6 h-6 text-white" /> : <VideoOff className="w-6 h-6 text-white" />}
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleAudio}
                className={`w-14 h-14 rounded-full ${audioEnabled ? 'bg-white/20' : 'bg-red-500'}`}
              >
                {audioEnabled ? <Mic className="w-6 h-6 text-white" /> : <MicOff className="w-6 h-6 text-white" />}
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={togglePause}
                className={`w-12 h-12 rounded-full ${isPaused ? 'bg-[#FFD700]' : 'bg-white/20'}`}
                title="Pause Stream"
              >
                {isPaused ? <Play className={`w-5 h-5 text-black`} /> : <Pause className="w-5 h-5 text-white" />}
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleScreenShare}
                className={`w-12 h-12 rounded-full ${isScreenSharing ? 'bg-[#00F0FF]' : 'bg-white/20'}`}
              >
                {isScreenSharing ? <Monitor className="w-5 h-5 text-black" /> : <MonitorOff className="w-5 h-5 text-white" />}
              </Button>
              
              <Button
                onClick={endStream}
                className="px-6 h-12 rounded-full bg-red-500 hover:bg-red-600 text-white font-bold"
              >
                <PhoneOff className="w-5 h-5 mr-2" />
                End
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Gift Panel */}
      <LiveGiftPanel
        isOpen={showGiftPanel}
        onClose={() => setShowGiftPanel(false)}
        onSendGift={handleSendGift}
        userCoins={1000}
      />

      {/* Effects Panel */}
      <LiveEffectsPanel
        isOpen={showEffectsPanel}
        onClose={() => setShowEffectsPanel(false)}
        onApplyEffect={handleApplyEffects}
        onApplySticker={handleApplySticker}
        onApplyVoiceEffect={handleApplyVoiceEffect}
        onApplySoundEffect={handleApplySoundEffect}
        onApplyBackground={handleApplyBackground}
      />

      {/* Gift Animation */}
      <AnimatePresence>
        {currentGift && (
          <GiftAnimation
            gift={currentGift}
            quantity={currentGift.quantity || 1}
            fromUsername={currentGift.from_username || "Anonymous"}
            onComplete={() => setCurrentGift(null)}
          />
        )}
      </AnimatePresence>

      {/* Share Sheet */}
      <ShareSheet
        isOpen={showShareSheet}
        onClose={() => setShowShareSheet(false)}
        contentType="live"
        contentId={streamId}
        title="Share Live Stream"
        shareText={`${stream?.display_name || stream?.username} is live on FaceConnect! ${stream?.title || 'Join now!'}`}
        onShareComplete={() => {
          fetchStream(); // Refresh viewer count
        }}
      />

      {/* Stream Settings Dialog */}
      <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
        <DialogContent className="bg-[#1A1A1A] border-white/10 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Stream Settings</DialogTitle>
            <DialogDescription>
              Configure your live stream settings for optimal quality
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Noise Reduction */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-white font-medium">Background Noise Reduction</p>
                <p className="text-gray-500 text-sm">Remove background noise from your audio</p>
              </div>
              <Switch
                checked={noiseReduction}
                onCheckedChange={toggleNoiseReduction}
              />
            </div>
            
            {/* Mirror Video */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-white font-medium">Mirror Video</p>
                <p className="text-gray-500 text-sm">Flip your video horizontally</p>
              </div>
              <Switch
                checked={isMirrored}
                onCheckedChange={() => toggleMirror()}
              />
            </div>
            
            {/* Camera Selection */}
            <div className="space-y-2">
              <p className="text-white font-medium">Camera</p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => { setFacingMode("user"); switchCameraFacing(); }}
                  className={`flex-1 ${facingMode === "user" ? 'border-[#00F0FF] bg-[#00F0FF]/10' : 'border-white/10'}`}
                >
                  Front Camera
                </Button>
                <Button
                  variant="outline"
                  onClick={() => { setFacingMode("environment"); switchCameraFacing(); }}
                  className={`flex-1 ${facingMode === "environment" ? 'border-[#00F0FF] bg-[#00F0FF]/10' : 'border-white/10'}`}
                >
                  Rear Camera
                </Button>
              </div>
            </div>
            
            {/* Stream Quality */}
            <div className="space-y-2">
              <p className="text-white font-medium">Stream Quality</p>
              <p className="text-gray-500 text-sm">Higher quality uses more bandwidth</p>
              <div className="flex gap-2">
                {["720p", "1080p", "4K"].map((quality) => (
                  <Button
                    key={quality}
                    variant="outline"
                    className="flex-1 border-white/10"
                  >
                    {quality}
                  </Button>
                ))}
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              onClick={() => setShowSettingsDialog(false)}
              className="bg-gradient-to-r from-[#00F0FF] to-[#7000FF]"
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Permission Dialog */}
      <Dialog open={showPermissionDialog} onOpenChange={setShowPermissionDialog}>
        <DialogContent className="bg-[#1A1A1A] border-white/10 max-w-sm">
          <DialogHeader>
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#00F0FF] to-[#7000FF] flex items-center justify-center">
                <Camera className="w-8 h-8 text-white" />
              </div>
            </div>
            <DialogTitle className="text-white text-center text-xl">Camera & Microphone Access</DialogTitle>
            <DialogDescription className="text-gray-400 text-center">
              To start your live stream, FaceConnect needs access to your camera and microphone. 
              Your audience will be able to see and hear you in real-time.
            </DialogDescription>
          </DialogHeader>
          
          {permissionError && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <p className="text-red-500 text-sm">{permissionError}</p>
            </div>
          )}
          
          <div className="space-y-2 text-sm text-gray-400">
            <div className="flex items-center gap-2">
              <Video className="w-4 h-4 text-[#00F0FF]" />
              <span>Camera will broadcast your video</span>
            </div>
            <div className="flex items-center gap-2">
              <Mic className="w-4 h-4 text-[#00F0FF]" />
              <span>Microphone will broadcast your audio</span>
            </div>
          </div>
          
          <DialogFooter className="flex gap-3">
            <Button 
              variant="ghost" 
              onClick={() => {
                setShowPermissionDialog(false);
                navigate(-1);
              }}
              className="flex-1 text-gray-400"
            >
              Cancel
            </Button>
            <Button 
              onClick={handlePermissionRequest}
              className="flex-1 bg-gradient-to-r from-[#00F0FF] to-[#7000FF]"
              data-testid="allow-camera-btn"
            >
              <Camera className="w-4 h-4 mr-2" />
              Allow Access
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
