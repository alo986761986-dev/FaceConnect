/**
 * Facebook Watch Component for FaceConnect
 * Complete video feed experience with reels, live, and video player
 */
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play, Pause, Volume2, VolumeX, Heart, MessageCircle, Share2,
  Bookmark, MoreHorizontal, ChevronUp, ChevronDown, Search, X,
  Tv, PlayCircle, Radio, Flame, Clock, Star, Users, Film,
  ThumbsUp, Sparkles, TrendingUp, Grid, List, Filter, Bell
} from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { haptic } from "@/utils/mobile";

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Sample Videos Data
const SAMPLE_VIDEOS = [
  {
    id: '1',
    title: 'Amazing Sunset Timelapse in Santorini',
    thumbnail: 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=800',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    creator: { name: 'Travel Vibes', avatar: null, followers: '2.3M', verified: true },
    views: '1.2M',
    duration: '3:45',
    likes: 45000,
    comments: 1200,
    shares: 890,
    category: 'Travel',
    isLive: false,
    createdAt: '2 days ago'
  },
  {
    id: '2',
    title: 'How to Make Perfect Italian Pasta',
    thumbnail: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=800',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    creator: { name: 'Chef Marco', avatar: null, followers: '890K', verified: true },
    views: '567K',
    duration: '12:30',
    likes: 23000,
    comments: 890,
    shares: 456,
    category: 'Food',
    isLive: false,
    createdAt: '5 days ago'
  },
  {
    id: '3',
    title: 'LIVE: Tech News & Q&A Session',
    thumbnail: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800',
    videoUrl: null,
    creator: { name: 'TechTalk', avatar: null, followers: '1.5M', verified: true },
    views: '15K watching',
    duration: 'LIVE',
    likes: 5600,
    comments: 234,
    shares: 89,
    category: 'Technology',
    isLive: true,
    createdAt: 'Now'
  },
  {
    id: '4',
    title: '10 Minute Full Body Workout - No Equipment',
    thumbnail: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    creator: { name: 'FitLife', avatar: null, followers: '3.1M', verified: true },
    views: '2.8M',
    duration: '10:15',
    likes: 89000,
    comments: 3400,
    shares: 1200,
    category: 'Fitness',
    isLive: false,
    createdAt: '1 week ago'
  },
  {
    id: '5',
    title: 'Relaxing Piano Music for Study',
    thumbnail: 'https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?w=800',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    creator: { name: 'Peaceful Melodies', avatar: null, followers: '670K', verified: false },
    views: '890K',
    duration: '1:00:00',
    likes: 34000,
    comments: 567,
    shares: 234,
    category: 'Music',
    isLive: false,
    createdAt: '3 days ago'
  },
];

// Video Categories
const VIDEO_CATEGORIES = [
  { id: 'all', label: 'For You', icon: Sparkles },
  { id: 'live', label: 'Live', icon: Radio },
  { id: 'gaming', label: 'Gaming', icon: PlayCircle },
  { id: 'music', label: 'Music', icon: Film },
  { id: 'sports', label: 'Sports', icon: Flame },
  { id: 'news', label: 'News', icon: Tv },
  { id: 'following', label: 'Following', icon: Users },
  { id: 'saved', label: 'Saved', icon: Bookmark },
];

// Video Card Component
function VideoCard({ video, isDark, onClick, viewMode = 'grid' }) {
  const [isHovered, setIsHovered] = useState(false);

  if (viewMode === 'list') {
    return (
      <motion.button
        onClick={() => onClick?.(video)}
        whileTap={{ scale: 0.98 }}
        className={`w-full flex gap-3 p-3 rounded-xl ${isDark ? 'bg-[#242526]' : 'bg-white'}`}
      >
        {/* Thumbnail */}
        <div className="relative w-40 aspect-video rounded-lg overflow-hidden flex-shrink-0">
          <img
            src={video.thumbnail}
            alt={video.title}
            className="w-full h-full object-cover"
          />
          {video.isLive ? (
            <div className="absolute top-2 left-2 px-2 py-0.5 bg-red-500 rounded text-xs font-bold text-white flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
              LIVE
            </div>
          ) : (
            <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/80 rounded text-xs text-white">
              {video.duration}
            </div>
          )}
        </div>
        
        {/* Info */}
        <div className="flex-1 text-left">
          <h3 className={`font-semibold line-clamp-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {video.title}
          </h3>
          <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            {video.creator.name} {video.creator.verified && '✓'}
          </p>
          <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            {video.views} views · {video.createdAt}
          </p>
        </div>
      </motion.button>
    );
  }

  return (
    <motion.button
      onClick={() => onClick?.(video)}
      whileTap={{ scale: 0.98 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`w-full rounded-xl overflow-hidden ${isDark ? 'bg-[#242526]' : 'bg-white'}`}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video">
        <img
          src={video.thumbnail}
          alt={video.title}
          className="w-full h-full object-cover"
        />
        
        {/* Overlay on Hover */}
        <AnimatePresence>
          {isHovered && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/30 flex items-center justify-center"
            >
              <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center">
                <Play className="w-8 h-8 text-gray-900 ml-1" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Live Badge */}
        {video.isLive && (
          <div className="absolute top-2 left-2 px-2 py-0.5 bg-red-500 rounded text-xs font-bold text-white flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
            LIVE
          </div>
        )}
        
        {/* Duration */}
        {!video.isLive && (
          <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/80 rounded text-xs text-white">
            {video.duration}
          </div>
        )}
        
        {/* Watch Later */}
        <button className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
          <Clock className="w-4 h-4 text-white" />
        </button>
      </div>
      
      {/* Info */}
      <div className="p-3">
        <div className="flex gap-3">
          <Avatar className="w-9 h-9 flex-shrink-0">
            <AvatarImage src={video.creator.avatar} />
            <AvatarFallback className="bg-gradient-to-br from-purple-500 to-cyan-400 text-white text-sm">
              {video.creator.name[0]}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 text-left">
            <h3 className={`font-semibold line-clamp-2 text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {video.title}
            </h3>
            <p className={`text-xs mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              {video.creator.name} {video.creator.verified && '✓'}
            </p>
            <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              {video.views} views · {video.createdAt}
            </p>
          </div>
        </div>
      </div>
    </motion.button>
  );
}

// Video Player Modal
function VideoPlayerModal({ video, isOpen, onClose, isDark }) {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (isOpen && videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  }, [isOpen]);

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const progress = (videoRef.current.currentTime / videoRef.current.duration) * 100;
      setProgress(progress);
    }
  };

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

  if (!isOpen || !video) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black"
    >
      {/* Video */}
      <div className="relative w-full h-full flex items-center justify-center" onClick={togglePlay}>
        {video.videoUrl ? (
          <video
            ref={videoRef}
            src={video.videoUrl}
            className="max-w-full max-h-full"
            playsInline
            muted={isMuted}
            onTimeUpdate={handleTimeUpdate}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          />
        ) : (
          <div className="relative w-full h-full">
            <img
              src={video.thumbnail}
              alt={video.title}
              className="w-full h-full object-cover opacity-50"
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="px-4 py-2 bg-red-500 rounded text-white font-bold flex items-center gap-2 mb-4">
                <div className="w-3 h-3 rounded-full bg-white animate-pulse" />
                LIVE
              </div>
              <p className="text-white text-lg">{video.views}</p>
            </div>
          </div>
        )}
        
        {/* Play/Pause Overlay */}
        <AnimatePresence>
          {!isPlaying && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
            >
              <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                <Play className="w-10 h-10 text-white ml-1" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {/* Progress Bar */}
      <div className="absolute bottom-24 left-0 right-0 h-1 bg-white/30">
        <div
          className="h-full bg-purple-500"
          style={{ width: `${progress}%` }}
        />
      </div>
      
      {/* Controls Overlay */}
      <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/60 to-transparent">
        <div className="flex items-center justify-between">
          <button onClick={onClose}>
            <X className="w-6 h-6 text-white" />
          </button>
          <div className="flex items-center gap-2">
            <button onClick={() => setIsMuted(!isMuted)}>
              {isMuted ? (
                <VolumeX className="w-6 h-6 text-white" />
              ) : (
                <Volume2 className="w-6 h-6 text-white" />
              )}
            </button>
          </div>
        </div>
      </div>
      
      {/* Video Info & Actions */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
        <div className="flex items-end gap-4">
          {/* Video Info */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Avatar className="w-10 h-10">
                <AvatarImage src={video.creator.avatar} />
                <AvatarFallback className="bg-gradient-to-br from-purple-500 to-cyan-400 text-white">
                  {video.creator.name[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-1">
                  <span className="text-white font-semibold">{video.creator.name}</span>
                  {video.creator.verified && (
                    <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
                      <span className="text-white text-xs">✓</span>
                    </div>
                  )}
                </div>
                <span className="text-white/70 text-sm">{video.creator.followers} followers</span>
              </div>
            </div>
            <h3 className="text-white font-semibold">{video.title}</h3>
            <p className="text-white/70 text-sm">{video.views} views</p>
          </div>
          
          {/* Actions */}
          <div className="flex flex-col items-center gap-4">
            <button
              onClick={() => { haptic.light(); setLiked(!liked); }}
              className="flex flex-col items-center"
            >
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${liked ? 'bg-red-500' : 'bg-white/20'}`}>
                <Heart className={`w-6 h-6 ${liked ? 'text-white fill-white' : 'text-white'}`} />
              </div>
              <span className="text-white text-xs mt-1">{video.likes}</span>
            </button>
            
            <button className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                <MessageCircle className="w-6 h-6 text-white" />
              </div>
              <span className="text-white text-xs mt-1">{video.comments}</span>
            </button>
            
            <button className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                <Share2 className="w-6 h-6 text-white" />
              </div>
              <span className="text-white text-xs mt-1">{video.shares}</span>
            </button>
            
            <button
              onClick={() => { haptic.light(); setSaved(!saved); }}
              className="flex flex-col items-center"
            >
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${saved ? 'bg-purple-500' : 'bg-white/20'}`}>
                <Bookmark className={`w-6 h-6 ${saved ? 'text-white fill-white' : 'text-white'}`} />
              </div>
              <span className="text-white text-xs mt-1">Save</span>
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// Main Watch Component
export default function FacebookWatch({ isDark }) {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [viewMode, setViewMode] = useState('grid');
  const [videos, setVideos] = useState(SAMPLE_VIDEOS);
  const [selectedVideo, setSelectedVideo] = useState(null);

  const filteredVideos = videos.filter(video => {
    const matchesSearch = video.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === 'all' || 
      (activeCategory === 'live' && video.isLive) ||
      video.category.toLowerCase() === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className={`min-h-screen ${isDark ? 'bg-[#18191a]' : 'bg-gray-100'}`}>
      {/* Header */}
      <div className={`sticky top-0 z-40 ${isDark ? 'bg-[#242526]' : 'bg-white'} border-b ${isDark ? 'border-[#3a3b3c]' : 'border-gray-200'}`}>
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Watch
          </h1>
          <div className="flex items-center gap-2">
            <button className={`p-2 rounded-full ${isDark ? 'bg-[#3a3b3c]' : 'bg-gray-100'}`}>
              <Search className={`w-5 h-5 ${isDark ? 'text-gray-200' : 'text-gray-700'}`} />
            </button>
            <button
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              className={`p-2 rounded-full ${isDark ? 'bg-[#3a3b3c]' : 'bg-gray-100'}`}
            >
              {viewMode === 'grid' ? (
                <List className={`w-5 h-5 ${isDark ? 'text-gray-200' : 'text-gray-700'}`} />
              ) : (
                <Grid className={`w-5 h-5 ${isDark ? 'text-gray-200' : 'text-gray-700'}`} />
              )}
            </button>
          </div>
        </div>
        
        {/* Categories */}
        <ScrollArea className="w-full">
          <div className="flex gap-2 px-4 pb-3">
            {VIDEO_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${
                  activeCategory === cat.id
                    ? 'bg-gradient-to-r from-purple-600 to-cyan-500 text-white'
                    : isDark ? 'bg-[#3a3b3c] text-gray-200' : 'bg-gray-100 text-gray-700'
                }`}
              >
                <cat.icon className="w-4 h-4" />
                {cat.label}
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      <ScrollArea className="h-[calc(100vh-140px)]">
        <div className="p-4">
          {/* Live Now Section */}
          {activeCategory === 'all' && videos.some(v => v.isLive) && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className={`text-lg font-semibold flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  <Radio className="w-5 h-5 text-red-500" />
                  Live Now
                </h2>
                <button className="text-purple-500 text-sm font-medium">See All</button>
              </div>
              <ScrollArea className="w-full">
                <div className="flex gap-3">
                  {videos.filter(v => v.isLive).map(video => (
                    <div key={video.id} className="flex-shrink-0 w-64">
                      <VideoCard
                        video={video}
                        isDark={isDark}
                        onClick={setSelectedVideo}
                        viewMode="grid"
                      />
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Video Grid */}
          <h2 className={`text-lg font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {activeCategory === 'all' ? 'For You' : VIDEO_CATEGORIES.find(c => c.id === activeCategory)?.label}
          </h2>
          
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-2 gap-3">
              {filteredVideos.filter(v => !v.isLive || activeCategory !== 'all').map(video => (
                <VideoCard
                  key={video.id}
                  video={video}
                  isDark={isDark}
                  onClick={setSelectedVideo}
                  viewMode="grid"
                />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredVideos.map(video => (
                <VideoCard
                  key={video.id}
                  video={video}
                  isDark={isDark}
                  onClick={setSelectedVideo}
                  viewMode="list"
                />
              ))}
            </div>
          )}

          {filteredVideos.length === 0 && (
            <div className="text-center py-12">
              <PlayCircle className={`w-12 h-12 mx-auto mb-3 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
              <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>
                No videos found
              </p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Video Player Modal */}
      <AnimatePresence>
        {selectedVideo && (
          <VideoPlayerModal
            video={selectedVideo}
            isOpen={!!selectedVideo}
            onClose={() => setSelectedVideo(null)}
            isDark={isDark}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export { VideoCard, VideoPlayerModal, VIDEO_CATEGORIES };
