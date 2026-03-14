import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { toast } from "sonner";
import { 
  Heart, MessageCircle, Share2, Play, Pause, 
  Volume2, VolumeX, Plus, MoreVertical, Music,
  ChevronUp, ChevronDown, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/context/AuthContext";
import { haptic } from "@/utils/mobile";
import BottomNav from "@/components/BottomNav";
import ReelComments from "@/components/reels/ReelComments";
import UploadReel from "@/components/reels/UploadReel";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Reels() {
  const { user, token } = useAuth();
  const [reels, setReels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [selectedReel, setSelectedReel] = useState(null);
  
  const containerRef = useRef(null);

  const fetchReels = useCallback(async () => {
    if (!token) return;
    
    try {
      const response = await axios.get(`${API}/reels?token=${token}`);
      setReels(response.data);
    } catch (error) {
      console.error("Failed to fetch reels:", error);
      toast.error("Failed to load reels");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchReels();
  }, [fetchReels]);

  const handleLike = async (reelId, index) => {
    haptic.light();
    
    try {
      const response = await axios.post(`${API}/reels/${reelId}/like?token=${token}`);
      
      setReels(prev => prev.map((reel, i) => 
        i === index ? { 
          ...reel, 
          is_liked: response.data.liked, 
          likes_count: response.data.likes_count 
        } : reel
      ));
    } catch (error) {
      toast.error("Failed to like reel");
    }
  };

  const handleShare = async (reel) => {
    haptic.medium();
    
    // Use Web Share API if available
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Reel by ${reel.user?.display_name || reel.user?.username}`,
          text: reel.caption || "Check out this reel!",
          url: `${window.location.origin}/reels/${reel.id}`
        });
        
        // Track share
        await axios.post(`${API}/reels/${reel.id}/share?token=${token}`);
        
        setReels(prev => prev.map(r => 
          r.id === reel.id ? { ...r, shares_count: r.shares_count + 1 } : r
        ));
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error("Share failed:", error);
        }
      }
    } else {
      // Fallback: copy link
      navigator.clipboard.writeText(`${window.location.origin}/reels/${reel.id}`);
      toast.success("Link copied to clipboard!");
      
      await axios.post(`${API}/reels/${reel.id}/share?token=${token}`);
      setReels(prev => prev.map(r => 
        r.id === reel.id ? { ...r, shares_count: r.shares_count + 1 } : r
      ));
    }
  };

  const handleOpenComments = (reel) => {
    setSelectedReel(reel);
    setShowComments(true);
    haptic.light();
  };

  const handleScroll = (direction) => {
    if (direction === 'up' && currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    } else if (direction === 'down' && currentIndex < reels.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handleUploadSuccess = (newReel) => {
    setReels(prev => [newReel, ...prev]);
    setShowUpload(false);
    toast.success("Reel uploaded!");
  };

  const formatCount = (count) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black relative">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/80 to-transparent">
        <h1 className="text-xl font-bold text-white font-['Outfit']">Reels</h1>
        <Button
          data-testid="upload-reel-btn"
          onClick={() => setShowUpload(true)}
          size="icon"
          variant="ghost"
          className="text-white hover:bg-white/10"
        >
          <Plus className="w-6 h-6" />
        </Button>
      </div>

      {/* Reels Container */}
      <div 
        ref={containerRef}
        className="h-screen overflow-hidden snap-y snap-mandatory"
      >
        {reels.length === 0 ? (
          <div className="h-screen flex flex-col items-center justify-center text-center px-4">
            <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center mb-4">
              <Play className="w-10 h-10 text-white/50" />
            </div>
            <h3 className="text-xl font-medium text-white mb-2">No reels yet</h3>
            <p className="text-gray-500 mb-4">Be the first to upload a reel!</p>
            <Button
              onClick={() => setShowUpload(true)}
              className="bg-gradient-to-r from-[#00F0FF] to-[#7000FF] hover:opacity-90"
            >
              <Plus className="w-4 h-4 mr-2" />
              Upload Reel
            </Button>
          </div>
        ) : (
          reels.map((reel, index) => (
            <ReelCard
              key={reel.id}
              reel={reel}
              isActive={index === currentIndex}
              onLike={() => handleLike(reel.id, index)}
              onComment={() => handleOpenComments(reel)}
              onShare={() => handleShare(reel)}
              formatCount={formatCount}
            />
          ))
        )}
      </div>

      {/* Navigation Arrows */}
      {reels.length > 1 && (
        <div className="fixed right-4 top-1/2 -translate-y-1/2 z-40 flex flex-col gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleScroll('up')}
            disabled={currentIndex === 0}
            className="text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-30"
          >
            <ChevronUp className="w-6 h-6" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleScroll('down')}
            disabled={currentIndex === reels.length - 1}
            className="text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-30"
          >
            <ChevronDown className="w-6 h-6" />
          </Button>
        </div>
      )}

      {/* Bottom Nav */}
      <BottomNav />

      {/* Comments Sheet */}
      <AnimatePresence>
        {showComments && selectedReel && (
          <ReelComments
            reel={selectedReel}
            onClose={() => {
              setShowComments(false);
              setSelectedReel(null);
            }}
            onCommentsUpdate={(count) => {
              setReels(prev => prev.map(r => 
                r.id === selectedReel.id ? { ...r, comments_count: count } : r
              ));
            }}
          />
        )}
      </AnimatePresence>

      {/* Upload Modal */}
      <AnimatePresence>
        {showUpload && (
          <UploadReel
            onClose={() => setShowUpload(false)}
            onSuccess={handleUploadSuccess}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// Individual Reel Card Component
function ReelCard({ reel, isActive, onLike, onComment, onShare, formatCount }) {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [showControls, setShowControls] = useState(false);

  useEffect(() => {
    if (videoRef.current) {
      if (isActive) {
        videoRef.current.play().catch(() => {});
        setIsPlaying(true);
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  }, [isActive]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = (e) => {
    e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleDoubleTap = () => {
    onLike();
    haptic.success();
  };

  const fullVideoUrl = reel.video_url?.startsWith("http") 
    ? reel.video_url 
    : `${process.env.REACT_APP_BACKEND_URL}${reel.video_url}`;

  return (
    <div 
      className="h-screen w-full snap-start relative flex items-center justify-center bg-black"
      onClick={togglePlay}
      onDoubleClick={handleDoubleTap}
    >
      {/* Video */}
      <video
        ref={videoRef}
        src={fullVideoUrl}
        className="h-full w-full object-contain"
        loop
        muted={isMuted}
        playsInline
        poster={reel.thumbnail_url}
      />

      {/* Play/Pause Indicator */}
      <AnimatePresence>
        {!isPlaying && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute inset-0 flex items-center justify-center bg-black/30"
          >
            <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
              <Play className="w-10 h-10 text-white ml-1" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mute Button */}
      <button
        onClick={toggleMute}
        className="absolute top-20 right-4 w-10 h-10 rounded-full bg-black/50 flex items-center justify-center"
      >
        {isMuted ? (
          <VolumeX className="w-5 h-5 text-white" />
        ) : (
          <Volume2 className="w-5 h-5 text-white" />
        )}
      </button>

      {/* Right Side Actions */}
      <div className="absolute right-4 bottom-32 flex flex-col items-center gap-6">
        {/* Like */}
        <button
          data-testid={`like-btn-${reel.id}`}
          onClick={(e) => { e.stopPropagation(); onLike(); }}
          className="flex flex-col items-center gap-1"
        >
          <motion.div
            whileTap={{ scale: 1.2 }}
            className={`w-12 h-12 rounded-full ${
              reel.is_liked ? "bg-red-500" : "bg-white/20"
            } flex items-center justify-center`}
          >
            <Heart 
              className={`w-6 h-6 ${reel.is_liked ? "text-white fill-white" : "text-white"}`} 
            />
          </motion.div>
          <span className="text-white text-xs font-medium">{formatCount(reel.likes_count)}</span>
        </button>

        {/* Comments */}
        <button
          data-testid={`comment-btn-${reel.id}`}
          onClick={(e) => { e.stopPropagation(); onComment(); }}
          className="flex flex-col items-center gap-1"
        >
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
            <MessageCircle className="w-6 h-6 text-white" />
          </div>
          <span className="text-white text-xs font-medium">{formatCount(reel.comments_count)}</span>
        </button>

        {/* Share */}
        <button
          data-testid={`share-btn-${reel.id}`}
          onClick={(e) => { e.stopPropagation(); onShare(); }}
          className="flex flex-col items-center gap-1"
        >
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
            <Share2 className="w-6 h-6 text-white" />
          </div>
          <span className="text-white text-xs font-medium">{formatCount(reel.shares_count)}</span>
        </button>

        {/* User Avatar */}
        <Avatar className="w-12 h-12 ring-2 ring-white">
          <AvatarImage src={reel.user?.avatar} />
          <AvatarFallback className="bg-gradient-to-br from-[#00F0FF] to-[#7000FF] text-white">
            {(reel.user?.display_name || reel.user?.username || "?")[0].toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </div>

      {/* Bottom Info */}
      <div className="absolute bottom-24 left-4 right-20">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-white font-semibold">
            @{reel.user?.username || "user"}
          </span>
        </div>
        {reel.caption && (
          <p className="text-white text-sm line-clamp-2">{reel.caption}</p>
        )}
        
        {/* Music indicator (placeholder) */}
        <div className="flex items-center gap-2 mt-3">
          <Music className="w-4 h-4 text-white" />
          <span className="text-white text-xs">Original Audio</span>
        </div>
      </div>
    </div>
  );
}
