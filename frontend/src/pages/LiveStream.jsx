import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useParams } from "react-router-dom";
import {
  Video, VideoOff, Mic, MicOff, Monitor, MonitorOff,
  MessageCircle, Heart, Flame, PartyPopper, Laugh, Star,
  Diamond, Rocket, Users, X, Send, Gift, Share2, MoreVertical,
  ArrowLeft, Radio, Eye, PhoneOff, SwitchCamera
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { useSettings } from "@/context/SettingsContext";
import { haptic } from "@/utils/mobile";
import ShareSheet from "@/components/ShareSheet";

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

// Gift Animation
function GiftAnimation({ gift, onComplete }) {
  const GiftIcon = GIFTS.find(g => g.type === gift.gift_type)?.icon || Star;
  const color = GIFTS.find(g => g.type === gift.gift_type)?.color || "#FFD700";
  
  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ duration: 0.5 }}
      onAnimationComplete={() => setTimeout(onComplete, 2000)}
      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50"
    >
      <div className="flex flex-col items-center gap-2 p-6 rounded-2xl bg-black/80 backdrop-blur-lg border border-white/20">
        <motion.div
          animate={{ rotate: [0, 15, -15, 0], scale: [1, 1.2, 1] }}
          transition={{ duration: 0.5, repeat: 2 }}
        >
          <GiftIcon className="w-16 h-16" style={{ color }} />
        </motion.div>
        <p className="text-white font-bold">{gift.from_username}</p>
        <p className="text-gray-400 text-sm">sent x{gift.quantity}</p>
      </div>
    </motion.div>
  );
}

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
  
  // Chat state
  const [chatMessage, setChatMessage] = useState("");
  const [chatMessages, setChatMessages] = useState([]);
  const [showChat, setShowChat] = useState(true);
  
  // Reactions & Gifts
  const [floatingReactions, setFloatingReactions] = useState([]);
  const [showGiftPanel, setShowGiftPanel] = useState(false);
  const [currentGift, setCurrentGift] = useState(null);
  
  // WebRTC state
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("connecting");
  const [showShareSheet, setShowShareSheet] = useState(false);
  const peerConnectionsRef = useRef({}); // For streamer: map of viewer_id -> RTCPeerConnection
  const peerConnectionRef = useRef(null); // For viewer: single connection to streamer
  
  // Media refs
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const chatScrollRef = useRef(null);

  // Fetch stream data
  useEffect(() => {
    if (streamId && token) {
      fetchStream();
    }
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
  }, [ws, isStreamer]);

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
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facingMode, width: 1280, height: 720 },
        audio: true
      });
      mediaStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      setConnectionStatus("broadcasting");
      
      // If viewers are already connected, create peer connections
      if (isStreamer && stream) {
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
      toast.error("Failed to access camera");
      console.error("Camera error:", error);
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
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover ${facingMode === "user" && !isScreenSharing ? "scale-x-[-1]" : ""}`}
          />
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
            <MoreVertical className="w-5 h-5" />
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
          <div className="flex items-center justify-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={switchCameraFacing}
              className="w-14 h-14 rounded-full bg-white/20"
            >
              <SwitchCamera className="w-6 h-6 text-white" />
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
              onClick={toggleScreenShare}
              className={`w-14 h-14 rounded-full ${isScreenSharing ? 'bg-[#00F0FF]' : 'bg-white/20'}`}
            >
              {isScreenSharing ? <Monitor className="w-6 h-6 text-black" /> : <MonitorOff className="w-6 h-6 text-white" />}
            </Button>
            
            <Button
              onClick={endStream}
              className="px-6 h-14 rounded-full bg-red-500 hover:bg-red-600 text-white font-bold"
            >
              <PhoneOff className="w-5 h-5 mr-2" />
              End
            </Button>
          </div>
        )}
      </div>

      {/* Gift Panel */}
      <AnimatePresence>
        {showGiftPanel && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowGiftPanel(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              onClick={(e) => e.stopPropagation()}
              className="absolute bottom-0 left-0 right-0 bg-[#121212] rounded-t-3xl p-6"
            >
              <div className="w-12 h-1 bg-gray-600 rounded-full mx-auto mb-6" />
              <h3 className="text-white text-lg font-bold mb-4">Send a Gift</h3>
              
              <div className="grid grid-cols-5 gap-4">
                {GIFTS.map(({ type, icon: Icon, value, color }) => (
                  <motion.button
                    key={type}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => sendGift(type)}
                    className="flex flex-col items-center gap-2 p-3 rounded-xl bg-white/5 hover:bg-white/10"
                  >
                    <Icon className="w-8 h-8" style={{ color }} />
                    <span className="text-white text-xs font-bold">{value}</span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </motion.div>
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
      />
    </div>
  );
}
