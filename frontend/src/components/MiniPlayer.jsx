import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Minimize2, Maximize2, X, Mic, MicOff, Video, VideoOff,
  PhoneOff, MessageCircle, Move, Expand, Shrink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { haptic } from "@/utils/mobile";

// PiP Window sizes
const PIP_SIZES = {
  small: { width: 120, height: 160 },
  medium: { width: 180, height: 240 },
  large: { width: 240, height: 320 },
};

export default function MiniPlayer({
  isOpen,
  onClose,
  onMaximize,
  type = "video", // "video" or "live"
  title = "",
  subtitle = "",
  videoRef,
  localVideoRef,
  isAudioEnabled = true,
  isVideoEnabled = true,
  onToggleAudio,
  onToggleVideo,
  onEndCall,
  children
}) {
  const [position, setPosition] = useState({ x: 20, y: 100 });
  const [size, setSize] = useState("medium");
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef(null);

  // Cycle through sizes
  const cycleSize = () => {
    haptic.light();
    const sizes = ["small", "medium", "large"];
    const currentIndex = sizes.indexOf(size);
    const nextIndex = (currentIndex + 1) % sizes.length;
    setSize(sizes[nextIndex]);
  };

  // Enable Picture-in-Picture API if available
  const enablePiP = async () => {
    if (videoRef?.current && document.pictureInPictureEnabled) {
      try {
        await videoRef.current.requestPictureInPicture();
        haptic.success();
      } catch (error) {
        console.error("PiP failed:", error);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        ref={containerRef}
        drag
        dragMomentum={false}
        dragElastic={0}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={(_, info) => {
          setIsDragging(false);
          setPosition({
            x: Math.max(0, Math.min(window.innerWidth - PIP_SIZES[size].width, position.x + info.offset.x)),
            y: Math.max(0, Math.min(window.innerHeight - PIP_SIZES[size].height, position.y + info.offset.y))
          });
        }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
        style={{
          position: "fixed",
          right: position.x,
          bottom: position.y,
          width: PIP_SIZES[size].width,
          height: PIP_SIZES[size].height,
          zIndex: 9999,
        }}
        className="rounded-2xl overflow-hidden shadow-2xl border border-white/20 bg-black"
      >
        {/* Video Content */}
        <div className="relative w-full h-full">
          {children || (
            <div className="w-full h-full bg-gradient-to-br from-[#1A1A1A] to-[#0A0A0A] flex items-center justify-center">
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#00F0FF] to-[#7000FF] flex items-center justify-center mx-auto">
                  <span className="text-white font-bold text-lg">
                    {title?.[0]?.toUpperCase() || "?"}
                  </span>
                </div>
                <p className="text-white text-xs mt-2 truncate px-2">{title}</p>
              </div>
            </div>
          )}

          {/* Drag Handle */}
          <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-black/60 to-transparent flex items-center justify-between px-2">
            <div className="flex items-center gap-1">
              <Move className="w-3 h-3 text-white/60" />
              <span className="text-white/80 text-[10px] truncate max-w-[60px]">{title}</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={cycleSize}
                className="p-1 rounded-full hover:bg-white/20"
              >
                {size === "small" ? (
                  <Expand className="w-3 h-3 text-white" />
                ) : size === "large" ? (
                  <Shrink className="w-3 h-3 text-white" />
                ) : (
                  <Expand className="w-3 h-3 text-white" />
                )}
              </button>
              <button
                onClick={onMaximize}
                className="p-1 rounded-full hover:bg-white/20"
              >
                <Maximize2 className="w-3 h-3 text-white" />
              </button>
              <button
                onClick={onClose}
                className="p-1 rounded-full hover:bg-white/20"
              >
                <X className="w-3 h-3 text-white" />
              </button>
            </div>
          </div>

          {/* Controls */}
          <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-black/80 to-transparent flex items-center justify-center gap-2 px-2">
            {type === "video" && (
              <>
                <button
                  onClick={onToggleAudio}
                  className={`p-1.5 rounded-full ${isAudioEnabled ? 'bg-white/20' : 'bg-red-500'}`}
                >
                  {isAudioEnabled ? (
                    <Mic className="w-3 h-3 text-white" />
                  ) : (
                    <MicOff className="w-3 h-3 text-white" />
                  )}
                </button>
                <button
                  onClick={onToggleVideo}
                  className={`p-1.5 rounded-full ${isVideoEnabled ? 'bg-white/20' : 'bg-red-500'}`}
                >
                  {isVideoEnabled ? (
                    <Video className="w-3 h-3 text-white" />
                  ) : (
                    <VideoOff className="w-3 h-3 text-white" />
                  )}
                </button>
                <button
                  onClick={onEndCall}
                  className="p-1.5 rounded-full bg-red-500"
                >
                  <PhoneOff className="w-3 h-3 text-white" />
                </button>
              </>
            )}
            {type === "live" && (
              <button
                onClick={enablePiP}
                className="p-1.5 rounded-full bg-[#00F0FF]/20"
              >
                <Minimize2 className="w-3 h-3 text-[#00F0FF]" />
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// Mini Chat Window Component
export function MiniChatWindow({
  isOpen,
  onClose,
  onMaximize,
  chatPartner,
  messages = [],
  onSendMessage,
  unreadCount = 0
}) {
  const [position, setPosition] = useState({ x: 20, y: 100 });
  const [size, setSize] = useState("medium");
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (inputValue.trim()) {
      onSendMessage?.(inputValue);
      setInputValue("");
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        drag
        dragMomentum={false}
        dragElastic={0}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
        style={{
          position: "fixed",
          right: position.x,
          bottom: position.y,
          width: 280,
          height: 380,
          zIndex: 9999,
        }}
        className="rounded-2xl overflow-hidden shadow-2xl border border-white/20 bg-[#0A0A0A] flex flex-col"
      >
        {/* Header */}
        <div className="h-12 bg-gradient-to-r from-[#00F0FF]/20 to-[#7000FF]/20 flex items-center justify-between px-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Move className="w-3 h-3 text-white/60 cursor-move" />
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#00F0FF] to-[#7000FF] flex items-center justify-center">
              <span className="text-white text-sm font-bold">
                {chatPartner?.display_name?.[0] || chatPartner?.username?.[0] || "?"}
              </span>
            </div>
            <span className="text-white text-sm font-medium truncate max-w-[120px]">
              {chatPartner?.display_name || chatPartner?.username}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={onMaximize} className="p-1.5 rounded-full hover:bg-white/10">
              <Maximize2 className="w-4 h-4 text-white" />
            </button>
            <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/10">
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {messages.slice(-10).map((msg, idx) => (
            <div
              key={msg.id || idx}
              className={`flex ${msg.is_sent ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${
                  msg.is_sent
                    ? 'bg-gradient-to-r from-[#00F0FF] to-[#7000FF] text-white'
                    : 'bg-white/10 text-white'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="h-14 border-t border-white/10 flex items-center gap-2 px-3">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSend()}
            placeholder="Message..."
            className="flex-1 bg-white/5 border border-white/10 rounded-full px-4 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-[#00F0FF]"
          />
          <button
            onClick={handleSend}
            disabled={!inputValue.trim()}
            className="w-8 h-8 rounded-full bg-[#00F0FF] flex items-center justify-center disabled:opacity-50"
          >
            <MessageCircle className="w-4 h-4 text-black" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
