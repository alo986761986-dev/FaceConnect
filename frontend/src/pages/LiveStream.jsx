import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useParams } from "react-router-dom";
import {
  Video, VideoOff, Mic, MicOff, Monitor, MonitorOff,
  MessageCircle, Heart, Flame, PartyPopper, Laugh, Star,
  Diamond, Rocket, Users, X, Send, Gift, Share2, MoreVertical,
  ArrowLeft, Radio, Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { useSettings } from "@/context/SettingsContext";
import { haptic } from "@/utils/mobile";

const API_URL = process.env.REACT_APP_BACKEND_URL;

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
  const { user, token } = useAuth();
  const { isDark, t } = useSettings();
  
  const [stream, setStream] = useState(null);
  const [isStreamer, setIsStreamer] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Video/Audio state
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  
  // Chat state
  const [chatMessage, setChatMessage] = useState("");
  const [chatMessages, setChatMessages] = useState([]);
  const [showChat, setShowChat] = useState(true);
  
  // Reactions & Gifts
  const [floatingReactions, setFloatingReactions] = useState([]);
  const [showGiftPanel, setShowGiftPanel] = useState(false);
  const [currentGift, setCurrentGift] = useState(null);
  
  // Media refs
  const videoRef = useRef(null);
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
        video: true,
        audio: true
      });
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      toast.error("Failed to access camera");
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
        
        if (videoRef.current) {
          videoRef.current.srcObject = screenStream;
        }
        
        // Notify backend
        await fetch(`${API_URL}/api/streams/${streamId}/screen-share?token=${token}&enabled=true`, {
          method: "POST"
        });
        
        setIsScreenSharing(true);
        haptic.success();
        
        // Handle when user stops sharing
        screenStream.getVideoTracks()[0].onended = () => {
          toggleScreenShare();
        };
      } else {
        // Switch back to camera
        if (mediaStreamRef.current && videoRef.current) {
          videoRef.current.srcObject = mediaStreamRef.current;
        }
        
        await fetch(`${API_URL}/api/streams/${streamId}/screen-share?token=${token}&enabled=false`, {
          method: "POST"
        });
        
        setIsScreenSharing(false);
        haptic.light();
      }
    } catch (error) {
      toast.error("Screen sharing failed");
    }
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
      
      // Stop all tracks
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
      
      toast.success("Stream ended");
      navigate("/");
    } catch (error) {
      toast.error("Failed to end stream");
    }
  };

  // Leave stream (viewer)
  const leaveStream = async () => {
    try {
      await fetch(`${API_URL}/api/streams/${streamId}/leave?token=${token}`, {
        method: "POST"
      });
      navigate("/");
    } catch (error) {
      navigate("/");
    }
  };

  // Start camera when streamer loads
  useEffect(() => {
    if (!loading && isStreamer) {
      startCamera();
    }
    
    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
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
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
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
            </div>
          </div>
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
              End Live
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
    </div>
  );
}
