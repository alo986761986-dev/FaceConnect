import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Play, Pause, Volume2, VolumeX, Heart, MessageCircle,
  Share2, Bookmark, MoreHorizontal, Search, Filter,
  TrendingUp, Clock, Users, Tv, Film, Music, Gamepad2,
  ChevronLeft, ChevronRight, X
} from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { useSettings } from "@/context/SettingsContext";
import BottomNav from "@/components/BottomNav";
import FacebookWatch from "@/components/facebook/FacebookWatch";
import { WatchSkeleton } from "@/components/skeletons";

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Watch Page - uses the comprehensive FacebookWatch component
export default function Watch() {
  const { user, token } = useAuth();
  const { isDark } = useSettings();

  return (
    <div className="min-h-screen pb-20">
      <FacebookWatch isDark={isDark} />
      <BottomNav />
    </div>
  );
}

// Keep legacy code below for reference
const VIDEO_CATEGORIES = [
  { id: "for-you", label: "For You", icon: TrendingUp },
  { id: "live", label: "Live", icon: Tv },
  { id: "reels", label: "Reels", icon: Film },
  { id: "music", label: "Music", icon: Music },
  { id: "gaming", label: "Gaming", icon: Gamepad2 },
  { id: "following", label: "Following", icon: Users },
  { id: "saved", label: "Saved", icon: Bookmark },
];

function WatchLegacy() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState("for-you");
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeVideo, setActiveVideo] = useState(null);

  const fetchVideos = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch videos from Watch API
      const res = await fetch(`${API_URL}/api/watch/feed?token=${token}&category=${activeCategory}&page=1&limit=20`);
      if (res.ok) {
        const data = await res.json();
        const videoData = data.videos || [];
        // Use mock data if API returns empty
        setVideos(videoData.length > 0 ? videoData : generateMockVideos());
      } else {
        // API error - use mock data
        setVideos(generateMockVideos());
      }
    } catch (err) {
      console.error("Failed to fetch videos:", err);
      // Mock data for demo
      setVideos(generateMockVideos());
    } finally {
      setLoading(false);
    }
  }, [token, activeCategory]);

  // Fetch categories from API
  const [categories, setCategories] = useState(VIDEO_CATEGORIES);
  
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch(`${API_URL}/api/watch/categories?token=${token}`);
        if (res.ok) {
          const data = await res.json();
          if (data.categories?.length > 0) {
            const iconMap = {
              sparkles: TrendingUp,
              radio: Tv,
              "gamepad-2": Gamepad2,
              music: Music,
              trophy: Users,
              newspaper: Clock,
              clapperboard: Film,
              "graduation-cap": Bookmark,
            };
            setCategories(data.categories.map(cat => ({
              id: cat.id,
              label: cat.name,
              icon: iconMap[cat.icon] || TrendingUp
            })));
          }
        }
      } catch (err) {
        console.error("Failed to fetch categories:", err);
      }
    };
    if (token) fetchCategories();
  }, [token]);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  const generateMockVideos = () => {
    return Array.from({ length: 12 }, (_, i) => ({
      id: `video-${i}`,
      title: `Amazing Video ${i + 1}`,
      description: "Check out this incredible content! #trending #viral",
      thumbnail: `https://picsum.photos/400/300?random=${i}`,
      duration: Math.floor(Math.random() * 300) + 30,
      views: Math.floor(Math.random() * 1000000),
      likes: Math.floor(Math.random() * 50000),
      comments: Math.floor(Math.random() * 5000),
      user: {
        username: `creator${i}`,
        display_name: `Content Creator ${i}`,
        avatar: null,
        is_verified: Math.random() > 0.7
      },
      created_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString()
    }));
  };

  const formatViews = (views) => {
    if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
    if (views >= 1000) return `${(views / 1000).toFixed(1)}K`;
    return views.toString();
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[var(--bg-primary)]/95 backdrop-blur-lg border-b border-white/5">
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Watch</h1>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="rounded-full">
              <Search className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            <Input
              placeholder="Search videos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white/5 border-white/10 rounded-full"
            />
          </div>
        </div>

        {/* Categories */}
        <div className="flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-hide">
          {VIDEO_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all ${
                activeCategory === cat.id
                  ? "bg-[var(--primary)] text-white"
                  : "bg-white/5 text-[var(--text-secondary)] hover:bg-white/10"
              }`}
            >
              <cat.icon className="w-4 h-4" />
              <span className="text-sm font-medium">{cat.label}</span>
            </button>
          ))}
        </div>
      </header>

      {/* Video Grid */}
      <div className="p-4">
        {loading ? (
          <WatchSkeleton />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {videos.map((video) => (
              <VideoCard
                key={video.id}
                video={video}
                onClick={() => setActiveVideo(video)}
                formatViews={formatViews}
                formatDuration={formatDuration}
              />
            ))}
          </div>
        )}
      </div>

      {/* Video Player Modal */}
      <AnimatePresence>
        {activeVideo && (
          <VideoPlayer
            video={activeVideo}
            onClose={() => setActiveVideo(null)}
            formatViews={formatViews}
          />
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
}

function VideoCard({ video, onClick, formatViews, formatDuration }) {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="group cursor-pointer"
      onClick={onClick}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video rounded-xl overflow-hidden bg-white/5">
        <img
          src={video.thumbnail}
          alt={video.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/80 rounded text-xs text-white font-medium">
          {formatDuration(video.duration)}
        </div>
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center">
            <Play className="w-6 h-6 text-black ml-1" fill="black" />
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="mt-3 flex gap-3">
        <button onClick={(e) => { e.stopPropagation(); navigate(`/profile/${video.user.username}`); }}>
          <Avatar className="w-10 h-10">
            <AvatarImage src={video.user.avatar ? `${API_URL}${video.user.avatar}` : undefined} />
            <AvatarFallback className="bg-gradient-to-br from-[var(--primary)] to-[var(--accent-purple)] text-white text-sm">
              {video.user.username?.[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </button>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-[var(--text-primary)] line-clamp-2 group-hover:text-[var(--primary)] transition-colors">
            {video.title}
          </h3>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            {video.user.display_name || video.user.username}
            {video.user.is_verified && <span className="ml-1 text-[var(--primary)]">✓</span>}
          </p>
          <p className="text-sm text-[var(--text-muted)]">
            {formatViews(video.views)} views • {getTimeAgo(video.created_at)}
          </p>
        </div>
        <button 
          onClick={(e) => e.stopPropagation()}
          className="p-2 hover:bg-white/10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <MoreHorizontal className="w-5 h-5 text-[var(--text-muted)]" />
        </button>
      </div>
    </motion.div>
  );
}

function VideoPlayer({ video, onClose, formatViews }) {
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black"
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 left-4 z-10 p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
      >
        <X className="w-6 h-6 text-white" />
      </button>

      {/* Video */}
      <div className="w-full h-full flex items-center justify-center">
        <img
          src={video.thumbnail}
          alt={video.title}
          className="max-w-full max-h-full object-contain"
        />
        
        {/* Play/Pause overlay */}
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className="absolute inset-0 flex items-center justify-center"
        >
          <AnimatePresence>
            {!isPlaying && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="w-20 h-20 rounded-full bg-black/50 flex items-center justify-center"
              >
                <Play className="w-10 h-10 text-white ml-1" fill="white" />
              </motion.div>
            )}
          </AnimatePresence>
        </button>
      </div>

      {/* Controls */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
        <div className="flex items-end justify-between">
          {/* Video Info */}
          <div className="flex-1 mr-4">
            <div className="flex items-center gap-3 mb-2">
              <Avatar className="w-10 h-10 border-2 border-white">
                <AvatarFallback className="bg-gradient-to-br from-[var(--primary)] to-[var(--accent-purple)] text-white">
                  {video.user.username?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold text-white">{video.user.display_name}</p>
                <p className="text-sm text-white/70">@{video.user.username}</p>
              </div>
              <Button size="sm" className="ml-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)]">
                Follow
              </Button>
            </div>
            <p className="text-white text-sm line-clamp-2">{video.description}</p>
            <p className="text-white/50 text-xs mt-1">{formatViews(video.views)} views</p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col items-center gap-4">
            <button 
              onClick={() => setIsLiked(!isLiked)}
              className="flex flex-col items-center"
            >
              <div className={`p-3 rounded-full ${isLiked ? 'bg-red-500' : 'bg-white/10'}`}>
                <Heart className={`w-6 h-6 ${isLiked ? 'text-white fill-white' : 'text-white'}`} />
              </div>
              <span className="text-white text-xs mt-1">{formatViews(video.likes)}</span>
            </button>
            
            <button className="flex flex-col items-center">
              <div className="p-3 rounded-full bg-white/10">
                <MessageCircle className="w-6 h-6 text-white" />
              </div>
              <span className="text-white text-xs mt-1">{formatViews(video.comments)}</span>
            </button>
            
            <button className="flex flex-col items-center">
              <div className="p-3 rounded-full bg-white/10">
                <Share2 className="w-6 h-6 text-white" />
              </div>
              <span className="text-white text-xs mt-1">Share</span>
            </button>
            
            <button 
              onClick={() => setIsSaved(!isSaved)}
              className="flex flex-col items-center"
            >
              <div className={`p-3 rounded-full ${isSaved ? 'bg-[var(--primary)]' : 'bg-white/10'}`}>
                <Bookmark className={`w-6 h-6 text-white ${isSaved ? 'fill-white' : ''}`} />
              </div>
              <span className="text-white text-xs mt-1">Save</span>
            </button>

            <button onClick={() => setIsMuted(!isMuted)}>
              <div className="p-3 rounded-full bg-white/10">
                {isMuted ? <VolumeX className="w-6 h-6 text-white" /> : <Volume2 className="w-6 h-6 text-white" />}
              </div>
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function getTimeAgo(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  if (seconds < 2592000) return `${Math.floor(seconds / 604800)}w ago`;
  return `${Math.floor(seconds / 2592000)}mo ago`;
}
