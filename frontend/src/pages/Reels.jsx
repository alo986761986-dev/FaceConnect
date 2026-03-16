import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { toast } from "sonner";
import { 
  Heart, MessageCircle, Share2, Play, Pause, 
  Volume2, VolumeX, Plus, MoreVertical, Music,
  ChevronUp, ChevronDown, Loader2, Trash2, Archive,
  EyeOff, MessageSquareOff, Edit3, UserPlus, UserCheck,
  Settings2, Minimize2, Maximize2, RotateCcw, X, Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Slider } from "@/components/ui/slider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { haptic } from "@/utils/mobile";
import BottomNav from "@/components/BottomNav";
import ReelComments from "@/components/reels/ReelComments";
import UploadReel from "@/components/reels/UploadReel";
import ShareSheet from "@/components/ShareSheet";
import { HeartBurst, FloatingHearts, AnimatedLikeButton } from "@/components/LikeAnimation";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Playback speeds
const PLAYBACK_SPEEDS = [0.5, 1.0, 1.5, 2.0];

export default function Reels() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [reels, setReels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [selectedReel, setSelectedReel] = useState(null);
  const [showShareSheet, setShowShareSheet] = useState(false);
  const [shareReel, setShareReel] = useState(null);
  
  // New states for enhanced features
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [autoScroll, setAutoScroll] = useState(false);
  const [showMiniPlayer, setShowMiniPlayer] = useState(false);
  const [miniPlayerReel, setMiniPlayerReel] = useState(null);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  
  const containerRef = useRef(null);
  const autoScrollTimerRef = useRef(null);

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

  const handleShare = (reel) => {
    haptic.medium();
    setShareReel(reel);
    setShowShareSheet(true);
  };

  // Follow/Unfollow user
  const handleFollow = async (userId, isFollowing) => {
    haptic.medium();
    try {
      const endpoint = isFollowing 
        ? `${API}/friends/${userId}/remove?token=${token}` 
        : `${API}/friends/request?token=${token}&to_user_id=${userId}`;
      
      await axios.post(endpoint);
      
      setReels(prev => prev.map(reel => 
        reel.user_id === userId 
          ? { ...reel, is_following: !isFollowing }
          : reel
      ));
      
      toast.success(isFollowing ? "Unfollowed" : "Follow request sent");
    } catch (error) {
      toast.error("Failed to update follow status");
    }
  };

  // Navigate to profile
  const handleProfileClick = (userId) => {
    haptic.light();
    navigate(`/profile/${userId}`);
  };

  // Speed control
  const handleSpeedChange = (speed) => {
    setPlaybackSpeed(speed);
    setShowSpeedMenu(false);
    haptic.light();
    toast.success(`Speed: ${speed}x`);
  };

  // Auto scroll toggle
  const toggleAutoScroll = () => {
    setAutoScroll(!autoScroll);
    haptic.medium();
    toast.info(autoScroll ? "Auto-scroll off" : "Auto-scroll on");
  };

  // Auto scroll effect
  useEffect(() => {
    if (autoScroll && reels.length > 0) {
      autoScrollTimerRef.current = setInterval(() => {
        setCurrentIndex(prev => (prev + 1) % reels.length);
      }, 10000); // 10 seconds per reel
    } else {
      clearInterval(autoScrollTimerRef.current);
    }
    
    return () => clearInterval(autoScrollTimerRef.current);
  }, [autoScroll, reels.length]);

  // Picture-in-Picture
  const enablePiP = async (reel, videoElement) => {
    if (document.pictureInPictureEnabled && videoElement) {
      try {
        await videoElement.requestPictureInPicture();
        setMiniPlayerReel(reel);
        setShowMiniPlayer(true);
        haptic.success();
      } catch (error) {
        toast.error("PiP not supported");
      }
    } else {
      // Fallback mini player
      setMiniPlayerReel(reel);
      setShowMiniPlayer(true);
    }
  };

  // Scroll to specific reel
  const scrollToReel = (index) => {
    setCurrentIndex(index);
    haptic.light();
  };

  // Handle scroll
  const handleScroll = useCallback((direction) => {
    if (direction === "up" && currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    } else if (direction === "down" && currentIndex < reels.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
    haptic.light();
  }, [currentIndex, reels.length]);

  const handleDeleteReel = async (reelId) => {
    if (!window.confirm("Are you sure you want to delete this reel?")) return;
    haptic.warning();
    
    try {
      const response = await axios.delete(`${API}/reels/${reelId}?token=${token}`);
      if (response.data) {
        setReels(prev => prev.filter(r => r.id !== reelId));
        toast.success("Reel deleted");
        // Adjust current index if needed
        if (currentIndex >= reels.length - 1 && currentIndex > 0) {
          setCurrentIndex(prev => prev - 1);
        }
      }
    } catch (error) {
      toast.error("Failed to delete reel");
    }
  };

  const handleShareComplete = (reel) => {
    setReels(prev => prev.map(r => 
      r.id === reel.id ? { ...r, shares_count: (r.shares_count || 0) + 1 } : r
    ));
  };

  const handleOpenComments = (reel) => {
    setSelectedReel(reel);
    setShowComments(true);
    haptic.light();
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
        <div className="flex items-center gap-2">
          {/* Speed Control */}
          <DropdownMenu open={showSpeedMenu} onOpenChange={setShowSpeedMenu}>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                className="text-white hover:bg-white/10 px-2"
              >
                {playbackSpeed}x
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-[#1A1A1A] border-white/10">
              {PLAYBACK_SPEEDS.map((speed) => (
                <DropdownMenuItem
                  key={speed}
                  onClick={() => handleSpeedChange(speed)}
                  className={`text-white hover:bg-white/10 cursor-pointer ${
                    playbackSpeed === speed ? 'bg-[#00F0FF]/20' : ''
                  }`}
                >
                  {speed}x
                  {playbackSpeed === speed && <Check className="w-4 h-4 ml-2" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          
          {/* Auto Scroll Toggle */}
          <Button
            size="icon"
            variant="ghost"
            onClick={toggleAutoScroll}
            className={`text-white hover:bg-white/10 ${autoScroll ? 'bg-[#00F0FF]/20' : ''}`}
            title={autoScroll ? "Auto-scroll On" : "Auto-scroll Off"}
          >
            <RotateCcw className={`w-5 h-5 ${autoScroll ? 'animate-spin' : ''}`} style={{ animationDuration: '3s' }} />
          </Button>
          
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
              onDelete={() => handleDeleteReel(reel.id)}
              onFollow={(userId, isFollowing) => handleFollow(userId, isFollowing)}
              onProfileClick={handleProfileClick}
              onEnablePiP={enablePiP}
              formatCount={formatCount}
              currentUserId={user?.id}
              playbackSpeed={playbackSpeed}
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

      {/* Share Sheet */}
      <ShareSheet
        isOpen={showShareSheet}
        onClose={() => {
          setShowShareSheet(false);
          setShareReel(null);
        }}
        contentType="reel"
        contentId={shareReel?.id}
        title="Share Reel"
        shareText={shareReel?.caption || `Check out this reel by ${shareReel?.user?.display_name || shareReel?.user?.username}!`}
        mediaUrl={shareReel?.video_url ? `${process.env.REACT_APP_BACKEND_URL}${shareReel.video_url}` : null}
      />
    </div>
  );
}

// Individual Reel Card Component
function ReelCard({ reel, isActive, onLike, onComment, onShare, onDelete, onArchive, onSettingsChange, onFollow, onProfileClick, onEnablePiP, formatCount, currentUserId, playbackSpeed = 1.0 }) {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [showHeartBurst, setShowHeartBurst] = useState(false);
  const [showFloatingHearts, setShowFloatingHearts] = useState(false);
  const [isFollowing, setIsFollowing] = useState(reel.is_following || false);
  const [settings, setSettings] = useState({
    hideLikes: reel.hide_likes || false,
    hideShares: reel.hide_shares || false,
    disableComments: reel.disable_comments || false
  });
  const isOwner = reel.user_id === currentUserId;
  const lastTapRef = useRef(0);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackSpeed;
      if (isActive) {
        videoRef.current.play().catch(() => {});
        setIsPlaying(true);
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  }, [isActive, playbackSpeed]);

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
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      if (!reel.is_liked) {
        setShowHeartBurst(true);
        setShowFloatingHearts(true);
        onLike();
      }
    } else {
      togglePlay();
    }
    lastTapRef.current = now;
  };

  const handleLikeClick = (e) => {
    e.stopPropagation();
    if (!reel.is_liked) {
      setShowFloatingHearts(true);
    }
    haptic.medium();
    onLike();
  };

  const handleFollowClick = (e) => {
    e.stopPropagation();
    setIsFollowing(!isFollowing);
    onFollow?.(reel.user_id, isFollowing);
  };

  const handlePiP = (e) => {
    e.stopPropagation();
    onEnablePiP?.(reel, videoRef.current);
  };

  const handleSettingToggle = async (key) => {
    const newValue = !settings[key];
    setSettings(prev => ({ ...prev, [key]: newValue }));
    haptic.light();
    
    try {
      await axios.patch(`${API}/reels/${reel.id}/settings?token=${localStorage.getItem('auth_token')}`, {
        [key]: newValue
      });
      onSettingsChange?.(reel.id, { [key]: newValue });
    } catch (error) {
      setSettings(prev => ({ ...prev, [key]: !newValue }));
      toast.error("Failed to update setting");
    }
  };

  const fullVideoUrl = reel.video_url?.startsWith("http") 
    ? reel.video_url 
    : `${process.env.REACT_APP_BACKEND_URL}${reel.video_url}`;

  return (
    <div 
      className="h-screen w-full snap-start relative flex items-center justify-center bg-black"
      onClick={handleDoubleTap}
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

      {/* Heart Burst Animation (center) */}
      <HeartBurst show={showHeartBurst} onComplete={() => setShowHeartBurst(false)} />
      
      {/* Floating Hearts Animation */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <FloatingHearts 
          trigger={showFloatingHearts} 
          onComplete={() => setShowFloatingHearts(false)} 
        />
      </div>

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
          onClick={handleLikeClick}
          className="flex flex-col items-center gap-1"
        >
          <motion.div
            whileTap={{ scale: 1.2 }}
            animate={reel.is_liked ? { scale: [1, 1.3, 1] } : {}}
            className={`w-12 h-12 rounded-full ${
              reel.is_liked ? "bg-red-500" : "bg-white/20"
            } flex items-center justify-center`}
          >
            <Heart 
              className={`w-6 h-6 ${reel.is_liked ? "text-white fill-white" : "text-white"}`} 
            />
          </motion.div>
          {!settings.hideLikes && (
            <span className="text-white text-xs font-medium">{formatCount(reel.likes_count)}</span>
          )}
        </button>

        {/* Comments */}
        {!settings.disableComments && (
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
        )}

        {/* Share */}
        <button
          data-testid={`share-btn-${reel.id}`}
          onClick={(e) => { e.stopPropagation(); onShare(); }}
          className="flex flex-col items-center gap-1"
        >
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
            <Share2 className="w-6 h-6 text-white" />
          </div>
          {!settings.hideShares && (
            <span className="text-white text-xs font-medium">{formatCount(reel.shares_count)}</span>
          )}
        </button>

        {/* More Options */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              data-testid={`more-btn-${reel.id}`}
              onClick={(e) => e.stopPropagation()}
              className="flex flex-col items-center gap-1"
            >
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                <MoreVertical className="w-6 h-6 text-white" />
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-[#1A1A1A] border-white/10 w-56">
            {isOwner && (
              <>
                <DropdownMenuItem
                  onClick={(e) => { e.stopPropagation(); handleSettingToggle('hideLikes'); }}
                  className="text-white hover:bg-white/10 cursor-pointer"
                >
                  <EyeOff className="w-4 h-4 mr-3" />
                  {settings.hideLikes ? 'Show like count' : 'Hide like count'}
                </DropdownMenuItem>
                
                <DropdownMenuItem
                  onClick={(e) => { e.stopPropagation(); handleSettingToggle('hideShares'); }}
                  className="text-white hover:bg-white/10 cursor-pointer"
                >
                  <Share2 className="w-4 h-4 mr-3" />
                  {settings.hideShares ? 'Show share count' : 'Hide share count'}
                </DropdownMenuItem>
                
                <DropdownMenuItem
                  onClick={(e) => { e.stopPropagation(); handleSettingToggle('disableComments'); }}
                  className="text-white hover:bg-white/10 cursor-pointer"
                >
                  <MessageSquareOff className="w-4 h-4 mr-3" />
                  {settings.disableComments ? 'Turn on comments' : 'Turn off comments'}
                </DropdownMenuItem>
                
                <DropdownMenuItem
                  onClick={(e) => { e.stopPropagation(); onArchive?.(); }}
                  className="text-white hover:bg-white/10 cursor-pointer"
                >
                  <Archive className="w-4 h-4 mr-3" />
                  Archive
                </DropdownMenuItem>
                
                <DropdownMenuSeparator className="bg-white/10" />
                
                <DropdownMenuItem
                  data-testid={`delete-reel-${reel.id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                  className="text-red-500 hover:bg-white/10 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4 mr-3" />
                  Delete Reel
                </DropdownMenuItem>
              </>
            )}
            
            {!isOwner && (
              <>
                <DropdownMenuItem
                  onClick={(e) => { e.stopPropagation(); handlePiP(e); }}
                  className="text-white hover:bg-white/10 cursor-pointer"
                >
                  <Minimize2 className="w-4 h-4 mr-3" />
                  Picture-in-Picture
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem
                  onClick={(e) => { e.stopPropagation(); toast.info("Reel reported"); }}
                  className="text-white hover:bg-white/10 cursor-pointer"
                >
                  Report
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Avatar with Follow Button */}
        <div className="relative">
          <button onClick={(e) => { e.stopPropagation(); onProfileClick?.(reel.user_id); }}>
            <Avatar className="w-12 h-12 ring-2 ring-white">
              <AvatarImage src={reel.user?.avatar} />
              <AvatarFallback className="bg-gradient-to-br from-[#00F0FF] to-[#7000FF] text-white">
                {(reel.user?.display_name || reel.user?.username || "?")[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </button>
          {/* Follow Button */}
          {!isOwner && (
            <button
              onClick={handleFollowClick}
              className={`absolute -bottom-1 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full flex items-center justify-center ${
                isFollowing 
                  ? 'bg-white text-black' 
                  : 'bg-gradient-to-r from-[#00F0FF] to-[#7000FF]'
              }`}
            >
              {isFollowing ? (
                <UserCheck className="w-3 h-3" />
              ) : (
                <UserPlus className="w-3 h-3 text-white" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Bottom Info */}
      <div className="absolute bottom-24 left-4 right-20">
        <button 
          onClick={(e) => { e.stopPropagation(); onProfileClick?.(reel.user_id); }}
          className="flex items-center gap-2 mb-2"
        >
          <span className="text-white font-semibold hover:underline">
            @{reel.user?.username || "user"}
          </span>
          {!isOwner && (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleFollowClick}
              className={`h-7 text-xs rounded-full ${
                isFollowing 
                  ? 'bg-white/20 text-white' 
                  : 'bg-white text-black hover:bg-white/90'
              }`}
            >
              {isFollowing ? 'Following' : 'Follow'}
            </Button>
          )}
        </button>
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
