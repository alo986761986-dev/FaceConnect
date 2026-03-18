import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Heart, MessageCircle, Send, Bookmark, MoreHorizontal,
  Plus, X, ChevronLeft, ChevronRight, Volume2, VolumeX
} from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { useSettings } from "@/context/SettingsContext";
import { haptic } from "@/utils/mobile";
import BottomNav from "@/components/BottomNav";
import SwipeablePanels from "@/components/SwipeablePanels";

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Story Item Component
function StoryItem({ story, isOwn, hasNew, onClick }) {
  return (
    <button
      data-testid={`story-${story.id || 'add'}`}
      onClick={onClick}
      className="story-item"
    >
      <div className={`story-avatar-wrapper ${isOwn ? 'add-story' : hasNew ? '' : 'seen'}`}>
        <div className="story-avatar-inner">
          <img
            src={story.avatar ? `${API_URL}${story.avatar}` : '/default-avatar.png'}
            alt={story.username}
            className="story-avatar"
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }}
          />
          <div className="hidden w-full h-full bg-gradient-to-br from-[var(--primary)] to-[var(--accent-purple)] items-center justify-center text-white font-semibold">
            {story.username?.[0]?.toUpperCase() || '?'}
          </div>
        </div>
        {isOwn && (
          <div className="add-story-icon">
            <Plus className="w-3 h-3" />
          </div>
        )}
      </div>
      <span className="story-username">
        {isOwn ? 'Your story' : story.username}
      </span>
    </button>
  );
}

// Story Viewer Component
function StoryViewer({ stories, initialIndex, onClose, token, currentUserId }) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef(null);
  
  const currentStory = stories[currentIndex];
  const isVideo = currentStory?.media_type === 'video';
  const DURATION = 5000;

  useEffect(() => {
    if (isPaused || isVideo) return;
    
    const start = Date.now();
    const animate = () => {
      const elapsed = Date.now() - start;
      const newProgress = (elapsed / DURATION) * 100;
      
      if (newProgress >= 100) {
        goNext();
      } else {
        setProgress(newProgress);
        requestAnimationFrame(animate);
      }
    };
    
    const frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [currentIndex, isPaused, isVideo]);

  useEffect(() => {
    // Mark as viewed
    if (currentStory && token) {
      fetch(`${API_URL}/api/posts/${currentStory.id}/view?token=${token}`, { method: 'POST' });
    }
  }, [currentStory, token]);

  const goNext = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setProgress(0);
    } else {
      onClose();
    }
  };

  const goPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setProgress(0);
    }
  };

  const handleTap = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x < rect.width / 3) goPrev();
    else if (x > rect.width * 2 / 3) goNext();
  };

  if (!currentStory) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] bg-black"
      onClick={handleTap}
    >
      {/* Progress bars */}
      <div className="absolute top-2 left-2 right-2 z-20 flex gap-1 safe-top">
        {stories.map((_, i) => (
          <div key={i} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
            <div 
              className="h-full bg-white rounded-full"
              style={{ 
                width: i < currentIndex ? '100%' : i === currentIndex ? `${progress}%` : '0%',
                transition: 'width 0.1s linear'
              }}
            />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="absolute top-8 left-4 right-4 z-20 flex items-center justify-between safe-top">
        <div className="flex items-center gap-3">
          <Avatar className="w-8 h-8 ring-2 ring-white/20">
            <AvatarImage src={currentStory.avatar ? `${API_URL}${currentStory.avatar}` : undefined} />
            <AvatarFallback className="bg-gradient-to-br from-[var(--primary)] to-[var(--accent-purple)] text-white text-xs">
              {currentStory.username?.[0] || '?'}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-white text-sm font-semibold">{currentStory.username}</p>
            <p className="text-white/60 text-xs">{getTimeAgo(currentStory.created_at)}</p>
          </div>
        </div>
        <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="text-white p-2">
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Content */}
      <div className="w-full h-full flex items-center justify-center">
        {isVideo ? (
          <video
            ref={videoRef}
            src={`${API_URL}${currentStory.media_url}`}
            className="max-w-full max-h-full object-contain"
            autoPlay
            playsInline
            muted={isMuted}
            onEnded={goNext}
          />
        ) : currentStory.media_url ? (
          <img
            src={`${API_URL}${currentStory.media_url}`}
            alt="Story"
            className="max-w-full max-h-full object-contain"
          />
        ) : (
          <div className="p-8 text-center">
            <p className="text-white text-xl">{currentStory.content}</p>
          </div>
        )}
      </div>

      {/* Mute toggle for videos */}
      {isVideo && (
        <button
          onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }}
          className="absolute bottom-24 right-4 z-20 p-2 bg-black/50 rounded-full"
        >
          {isMuted ? <VolumeX className="w-5 h-5 text-white" /> : <Volume2 className="w-5 h-5 text-white" />}
        </button>
      )}
    </motion.div>
  );
}

// Post Card Component
function PostCard({ post, token, currentUserId, onLike, onComment }) {
  const [liked, setLiked] = useState(post.is_liked || false);
  const [likeCount, setLikeCount] = useState(post.likes_count || 0);
  const [saved, setSaved] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [muted, setMuted] = useState(true);
  const lastTapRef = useRef(0);
  const [showHeart, setShowHeart] = useState(false);

  const handleLike = async () => {
    haptic.light();
    const newLiked = !liked;
    setLiked(newLiked);
    setLikeCount(prev => newLiked ? prev + 1 : prev - 1);
    
    try {
      await fetch(`${API_URL}/api/posts/${post.id}/like?token=${token}`, { method: 'POST' });
      onLike?.(post.id, newLiked);
    } catch (error) {
      setLiked(!newLiked);
      setLikeCount(prev => newLiked ? prev - 1 : prev + 1);
    }
  };

  const handleDoubleTap = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 300 && !liked) {
      setShowHeart(true);
      handleLike();
      setTimeout(() => setShowHeart(false), 1000);
    }
    lastTapRef.current = now;
  };

  const handleSave = () => {
    haptic.light();
    setSaved(!saved);
    toast.success(saved ? 'Removed from saved' : 'Saved');
  };

  return (
    <article className="post-card" data-testid={`post-${post.id}`}>
      {/* Header */}
      <div className="post-header">
        <Avatar className="w-8 h-8">
          <AvatarImage src={post.avatar ? `${API_URL}${post.avatar}` : undefined} />
          <AvatarFallback className="bg-gradient-to-br from-[var(--primary)] to-[var(--accent-purple)] text-white text-xs">
            {post.display_name?.[0] || post.username?.[0] || '?'}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{post.username}</p>
        </div>
        <button className="action-btn">
          <MoreHorizontal className="w-5 h-5" />
        </button>
      </div>

      {/* Media */}
      {post.media_url && (
        <div className="relative" onClick={handleDoubleTap}>
          {post.media_type === 'video' ? (
            <video
              src={`${API_URL}${post.media_url}`}
              className="post-media"
              loop
              muted={muted}
              autoPlay
              playsInline
              onClick={(e) => { e.stopPropagation(); setMuted(!muted); }}
            />
          ) : (
            <img
              src={`${API_URL}${post.media_url}`}
              alt=""
              className="post-media"
            />
          )}
          
          {/* Double tap heart */}
          <AnimatePresence>
            {showHeart && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                className="double-tap-heart"
              >
                <Heart className="w-24 h-24 text-white fill-white drop-shadow-lg" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Actions */}
      <div className="post-actions">
        <div className="flex items-center gap-4">
          <button 
            className={`action-btn ${liked ? 'liked' : ''}`}
            onClick={handleLike}
            data-testid={`like-btn-${post.id}`}
          >
            <Heart className={`w-6 h-6 ${liked ? 'fill-current' : ''}`} />
          </button>
          <button className="action-btn" onClick={() => setShowComments(!showComments)}>
            <MessageCircle className="w-6 h-6" />
          </button>
          <button className="action-btn">
            <Send className="w-6 h-6" />
          </button>
        </div>
        <button className={`action-btn ${saved ? 'text-[var(--primary)]' : ''}`} onClick={handleSave}>
          <Bookmark className={`w-6 h-6 ${saved ? 'fill-current' : ''}`} />
        </button>
      </div>

      {/* Content */}
      <div className="post-content">
        {likeCount > 0 && (
          <p className="font-semibold text-sm mb-1">{likeCount.toLocaleString()} likes</p>
        )}
        {post.content && (
          <p className="text-sm">
            <span className="font-semibold mr-1">{post.username}</span>
            {post.content}
          </p>
        )}
        {post.comments_count > 0 && (
          <button 
            className="text-sm text-[var(--text-muted)] mt-1"
            onClick={() => setShowComments(!showComments)}
          >
            View all {post.comments_count} comments
          </button>
        )}
        <p className="text-[10px] text-[var(--text-muted)] mt-1 uppercase">
          {getTimeAgo(post.created_at)}
        </p>
      </div>
    </article>
  );
}

// Main Home Component
export default function Home() {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const { isDark } = useSettings();
  
  const [loading, setLoading] = useState(true);
  const [stories, setStories] = useState([]);
  const [posts, setPosts] = useState([]);
  const [activeStoryIndex, setActiveStoryIndex] = useState(null);

  // Fetch feed data
  const fetchFeed = useCallback(async () => {
    if (!token) return;
    
    try {
      const response = await fetch(`${API_URL}/api/feed/home?token=${token}`);
      if (response.ok) {
        const data = await response.json();
        setStories(data.stories || []);
        setPosts(data.posts || []);
      }
    } catch (error) {
      console.error('Failed to fetch feed:', error);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  // Auto-refresh every 30s when visible
  useEffect(() => {
    let interval;
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchFeed();
      }
    };
    
    interval = setInterval(() => {
      if (document.visibilityState === 'visible') fetchFeed();
    }, 30000);
    
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [fetchFeed]);

  const handleLikeUpdate = (postId, liked) => {
    setPosts(prev => prev.map(p => 
      p.id === postId 
        ? { ...p, is_liked: liked, likes_count: liked ? p.likes_count + 1 : p.likes_count - 1 }
        : p
    ));
  };

  return (
    <SwipeablePanels>
      <div 
        className="min-h-screen"
        style={{ background: 'var(--background)' }}
        data-theme={isDark ? 'dark' : 'light'}
      >
        {/* Header */}
        <header className="app-header">
          <h1 className="app-logo">FaceConnect</h1>
          <div className="header-actions">
            <button className="header-icon" onClick={() => navigate('/chat')}>
              <Heart className="w-6 h-6" />
            </button>
            <button className="header-icon" onClick={() => navigate('/chat')}>
              <MessageCircle className="w-6 h-6" />
              <span className="notification-badge" />
            </button>
          </div>
        </header>

        {/* Main Feed */}
        <main className="feed-container">
          {/* Stories Bar */}
          <div className="stories-bar">
            {/* Add Story */}
            <StoryItem
              story={{ id: 'add', username: user?.username, avatar: user?.avatar }}
              isOwn={true}
              onClick={() => navigate('/profiles')}
            />
            
            {/* Other Stories */}
            {stories.map((story, index) => (
              <StoryItem
                key={story.id}
                story={story}
                hasNew={!story.viewed}
                onClick={() => setActiveStoryIndex(index)}
              />
            ))}
          </div>

          {/* Posts Feed */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-12 px-4">
              <p className="text-[var(--text-secondary)]">No posts yet</p>
              <p className="text-sm text-[var(--text-muted)] mt-1">
                Follow people to see their posts here
              </p>
            </div>
          ) : (
            posts.map(post => (
              <PostCard
                key={post.id}
                post={post}
                token={token}
                currentUserId={user?.id}
                onLike={handleLikeUpdate}
              />
            ))
          )}
        </main>

        {/* Story Viewer */}
        <AnimatePresence>
          {activeStoryIndex !== null && stories.length > 0 && (
            <StoryViewer
              stories={stories}
              initialIndex={activeStoryIndex}
              token={token}
              currentUserId={user?.id}
              onClose={() => setActiveStoryIndex(null)}
            />
          )}
        </AnimatePresence>

        {/* Bottom Navigation */}
        <BottomNav />
      </div>
    </SwipeablePanels>
  );
}

// Utility function
function getTimeAgo(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);
  
  if (seconds < 60) return 'now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`;
  return `${Math.floor(seconds / 604800)}w`;
}
