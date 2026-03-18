import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Heart, MessageCircle, Send, Bookmark, Music2, 
  MoreHorizontal, Play, Pause, Volume2, VolumeX,
  Share2, UserPlus, Flag
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import BottomNav from "@/components/BottomNav";

const API = process.env.REACT_APP_BACKEND_URL;

export default function ReelsVertical() {
  const { user, token } = useAuth();
  const [reels, setReels] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const containerRef = useRef(null);
  const observerRef = useRef(null);

  useEffect(() => {
    fetchReels();
  }, []);

  const fetchReels = async () => {
    try {
      const response = await fetch(
        `${API}/api/reels-enhanced/feed?user_id=${user?.id || ""}&limit=20`
      );
      if (response.ok) {
        const data = await response.json();
        setReels(data);
      }
    } catch (error) {
      console.error("Error fetching reels:", error);
    } finally {
      setLoading(false);
    }
  };

  // Intersection observer for auto-play
  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const video = entry.target.querySelector("video");
          if (video) {
            if (entry.isIntersecting) {
              video.play().catch(() => {});
            } else {
              video.pause();
            }
          }
        });
      },
      { threshold: 0.7 }
    );

    return () => observerRef.current?.disconnect();
  }, []);

  // Handle scroll snap
  const handleScroll = useCallback((e) => {
    const container = e.target;
    const scrollTop = container.scrollTop;
    const height = container.clientHeight;
    const newIndex = Math.round(scrollTop / height);
    
    if (newIndex !== currentIndex) {
      setCurrentIndex(newIndex);
      recordView(reels[newIndex]?.id);
    }
  }, [currentIndex, reels]);

  const recordView = async (reelId) => {
    if (!reelId || !user?.id) return;
    try {
      await fetch(`${API}/api/reels-enhanced/reels/${reelId}/view`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.id, watch_time: 0 })
      });
    } catch (error) {
      // Silent fail
    }
  };

  if (loading) {
    return (
      <div className="h-screen bg-black flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen bg-black">
      {/* Reels Container */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="h-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
      >
        {reels.map((reel, index) => (
          <ReelItem
            key={reel.id}
            reel={reel}
            isActive={index === currentIndex}
            isMuted={isMuted}
            onToggleMute={() => setIsMuted(!isMuted)}
            user={user}
            token={token}
            observerRef={observerRef}
          />
        ))}

        {reels.length === 0 && (
          <div className="h-screen flex items-center justify-center">
            <p className="text-white/60">No reels to show</p>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
}

function ReelItem({ reel, isActive, isMuted, onToggleMute, user, token, observerRef }) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [liked, setLiked] = useState(reel.liked_by?.includes(user?.id));
  const [likesCount, setLikesCount] = useState(reel.likes_count || 0);
  const [saved, setSaved] = useState(false);
  const [showComments, setShowComments] = useState(false);

  useEffect(() => {
    if (containerRef.current && observerRef.current) {
      observerRef.current.observe(containerRef.current);
    }
    return () => {
      if (containerRef.current && observerRef.current) {
        observerRef.current.unobserve(containerRef.current);
      }
    };
  }, [observerRef]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
    }
  }, [isMuted]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleLike = async () => {
    if (!user) return;
    
    const newLiked = !liked;
    setLiked(newLiked);
    setLikesCount(prev => newLiked ? prev + 1 : prev - 1);

    try {
      await fetch(`${API}/api/reels/${reel.id}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token })
      });
    } catch (error) {
      // Revert on error
      setLiked(!newLiked);
      setLikesCount(prev => newLiked ? prev - 1 : prev + 1);
    }
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: reel.caption || "Check out this reel!",
          url: `${window.location.origin}/reels/${reel.id}`
        });
      } else {
        await navigator.clipboard.writeText(`${window.location.origin}/reels/${reel.id}`);
        toast.success("Link copied!");
      }
      
      await fetch(`${API}/api/reels-enhanced/reels/${reel.id}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user?.id, share_type: "external" })
      });
    } catch (error) {
      // Silent fail
    }
  };

  const handleDoubleTap = () => {
    if (!liked) {
      handleLike();
    }
  };

  return (
    <div
      ref={containerRef}
      className="h-screen w-full snap-start relative flex items-center justify-center"
      onDoubleClick={handleDoubleTap}
    >
      {/* Video */}
      <video
        ref={videoRef}
        src={reel.video_url}
        className="h-full w-full object-cover"
        loop
        playsInline
        muted={isMuted}
        poster={reel.thumbnail_url}
        onClick={togglePlay}
      />

      {/* Play/Pause overlay */}
      <AnimatePresence>
        {!isPlaying && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none"
          >
            <Play className="w-20 h-20 text-white/80" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top gradient */}
      <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />

      {/* Bottom gradient */}
      <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />

      {/* Right side actions */}
      <div className="absolute right-4 bottom-32 flex flex-col items-center gap-6">
        {/* Like */}
        <button onClick={handleLike} className="flex flex-col items-center">
          <div className={`w-12 h-12 rounded-full ${liked ? "text-red-500" : "text-white"} flex items-center justify-center`}>
            <Heart className={`w-7 h-7 ${liked ? "fill-red-500" : ""}`} />
          </div>
          <span className="text-white text-xs mt-1">{formatCount(likesCount)}</span>
        </button>

        {/* Comments */}
        <button onClick={() => setShowComments(true)} className="flex flex-col items-center">
          <div className="w-12 h-12 rounded-full text-white flex items-center justify-center">
            <MessageCircle className="w-7 h-7" />
          </div>
          <span className="text-white text-xs mt-1">{formatCount(reel.comments_count || 0)}</span>
        </button>

        {/* Share */}
        <button onClick={handleShare} className="flex flex-col items-center">
          <div className="w-12 h-12 rounded-full text-white flex items-center justify-center">
            <Send className="w-7 h-7" />
          </div>
          <span className="text-white text-xs mt-1">Share</span>
        </button>

        {/* Save */}
        <button onClick={() => setSaved(!saved)} className="flex flex-col items-center">
          <div className="w-12 h-12 rounded-full text-white flex items-center justify-center">
            <Bookmark className={`w-7 h-7 ${saved ? "fill-white" : ""}`} />
          </div>
        </button>

        {/* Audio (if available) */}
        {reel.audio_id && (
          <button className="w-10 h-10 rounded-lg border-2 border-white overflow-hidden animate-spin-slow">
            <img src={reel.audio?.cover_url || "/audio-cover.jpg"} alt="" className="w-full h-full object-cover" />
          </button>
        )}
      </div>

      {/* Bottom info */}
      <div className="absolute bottom-20 left-4 right-20">
        {/* User info */}
        <div className="flex items-center gap-3 mb-3">
          <img
            src={reel.user?.avatar_url || "/default-avatar.png"}
            alt=""
            className="w-10 h-10 rounded-full object-cover border-2 border-white"
          />
          <span className="text-white font-semibold">@{reel.user?.username}</span>
          <button className="px-3 py-1 border border-white rounded-lg text-white text-sm">
            Follow
          </button>
        </div>

        {/* Caption */}
        {reel.caption && (
          <p className="text-white text-sm mb-2 line-clamp-2">
            {reel.caption}
          </p>
        )}

        {/* Audio info */}
        {reel.audio_id && (
          <div className="flex items-center gap-2">
            <Music2 className="w-4 h-4 text-white" />
            <marquee className="text-white text-sm max-w-[200px]">
              {reel.audio?.title} - {reel.audio?.artist}
            </marquee>
          </div>
        )}
      </div>

      {/* Mute toggle */}
      <button
        onClick={onToggleMute}
        className="absolute top-16 right-4 w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center"
      >
        {isMuted ? (
          <VolumeX className="w-5 h-5 text-white" />
        ) : (
          <Volume2 className="w-5 h-5 text-white" />
        )}
      </button>
    </div>
  );
}

function formatCount(count) {
  if (count >= 1000000) {
    return (count / 1000000).toFixed(1) + "M";
  }
  if (count >= 1000) {
    return (count / 1000).toFixed(1) + "K";
  }
  return count.toString();
}
