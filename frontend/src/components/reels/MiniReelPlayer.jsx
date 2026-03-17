import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Play, Pause, Volume2, VolumeX, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { haptic } from "@/utils/mobile";

const API = process.env.REACT_APP_BACKEND_URL;

export default function MiniReelPlayer({
  isOpen,
  onClose,
  reel,
  onExpand
}) {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [position, setPosition] = useState({ x: 16, y: 100 });
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (isOpen && videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  }, [isOpen, reel]);

  const togglePlay = () => {
    haptic.light();
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    haptic.light();
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleExpand = () => {
    haptic.medium();
    onExpand?.(reel);
    onClose();
  };

  if (!isOpen || !reel) return null;

  return (
    <AnimatePresence>
      <motion.div
        data-testid="mini-reel-player"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        drag
        dragMomentum={false}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={(e, info) => {
          setIsDragging(false);
          setPosition({
            x: position.x + info.offset.x,
            y: position.y + info.offset.y
          });
        }}
        style={{ x: position.x, y: position.y }}
        className="fixed z-[90] w-40 rounded-2xl overflow-hidden shadow-2xl shadow-black/50 bg-black border border-white/20"
      >
        {/* Video */}
        <div className="relative aspect-[9/16]">
          <video
            ref={videoRef}
            src={reel.video_url?.startsWith('http') ? reel.video_url : `${API}${reel.video_url}`}
            className="w-full h-full object-cover"
            loop
            muted={isMuted}
            playsInline
            autoPlay
          />
          
          {/* Overlay controls */}
          <div className="absolute inset-0 flex flex-col justify-between p-2">
            {/* Top bar */}
            <div className="flex justify-between">
              <Button
                variant="ghost"
                size="icon"
                className="w-6 h-6 bg-black/50 rounded-full"
                onClick={handleExpand}
              >
                <Maximize2 className="w-3 h-3 text-white" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="w-6 h-6 bg-black/50 rounded-full"
                onClick={onClose}
              >
                <X className="w-3 h-3 text-white" />
              </Button>
            </div>
            
            {/* Bottom bar */}
            <div className="flex justify-between">
              <Button
                variant="ghost"
                size="icon"
                className="w-6 h-6 bg-black/50 rounded-full"
                onClick={togglePlay}
              >
                {isPlaying ? (
                  <Pause className="w-3 h-3 text-white" />
                ) : (
                  <Play className="w-3 h-3 text-white fill-white" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="w-6 h-6 bg-black/50 rounded-full"
                onClick={toggleMute}
              >
                {isMuted ? (
                  <VolumeX className="w-3 h-3 text-white" />
                ) : (
                  <Volume2 className="w-3 h-3 text-white" />
                )}
              </Button>
            </div>
          </div>
          
          {/* User info */}
          <div className="absolute bottom-8 left-2 right-2">
            <p className="text-[10px] text-white font-medium truncate drop-shadow-lg">
              @{reel.user?.username || 'user'}
            </p>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
