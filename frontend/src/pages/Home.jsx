import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Heart, MessageCircle, Send, Bookmark, MoreHorizontal,
  Plus, X, ChevronLeft, ChevronRight, Volume2, VolumeX, Share2,
  Menu, Grid3X3, RefreshCw, Search
} from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { useSettings } from "@/context/SettingsContext";
import { haptic } from "@/utils/mobile";
import BottomNav from "@/components/BottomNav";
import SwipeablePanels, { usePanels } from "@/components/SwipeablePanels";
import { StoryHighlights } from "@/components/instagram/StoryHighlights";
import { CarouselPost } from "@/components/instagram/CarouselPost";
import { VerifiedBadge } from "@/components/PremiumGate";
// Facebook-style components
import FacebookReactions from "@/components/facebook/FacebookReactions";
import ProfileHoverCard from "@/components/facebook/ProfileHoverCard";
import ShareModal from "@/components/facebook/ShareModal";
import ScrollReveal from "@/components/facebook/ScrollReveal";
import { PostSkeleton, StorySkeleton } from "@/components/facebook/LoadingSkeleton";
import { LeftSidebar, RightSidebar } from "@/components/facebook/FacebookSidebar";
import { CreatePostWidget } from "@/components/facebook/CreatePostWidget";
import { HomeFeedSkeleton } from "@/components/skeletons";

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

  const goNext = useCallback(() => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setProgress(0);
    } else {
      onClose();
    }
  }, [currentIndex, stories.length, onClose]);

  // Progress animation
  useEffect(() => {
    if (!currentStory || isPaused || isVideo) return;
    
    const startTime = Date.now();
    const duration = 5000;
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const newProgress = Math.min((elapsed / duration) * 100, 100);
      
      if (newProgress >= 100) {
        goNext();
      } else {
        setProgress(newProgress);
        requestAnimationFrame(animate);
      }
    };
    
    const frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [currentIndex, isPaused, isVideo, currentStory, goNext]);

  useEffect(() => {
    // Mark as viewed
    if (currentStory && token) {
      fetch(`${API_URL}/api/posts/${currentStory.id}/view?token=${token}`, { method: 'POST' });
    }
  }, [currentStory, token]);

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

// Post Card Component with Facebook-style features
function PostCard({ post, token, currentUserId, onLike, onComment }) {
  const navigate = useNavigate();
  const [liked, setLiked] = useState(post.is_liked || false);
  const [likeCount, setLikeCount] = useState(post.likes_count || 0);
  const [saved, setSaved] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [muted, setMuted] = useState(true);
  const lastTapRef = useRef(0);
  const [showHeart, setShowHeart] = useState(false);
  const [currentReaction, setCurrentReaction] = useState(post.user_reaction || null);
  const [reactionCounts, setReactionCounts] = useState(post.reaction_counts || { like: post.likes_count || 0 });
  const [isContentExpanded, setIsContentExpanded] = useState(false);

  const handleReaction = async (reactionType) => {
    haptic.light();
    const prevReaction = currentReaction;
    const wasLiked = liked;
    
    setCurrentReaction(reactionType);
    setLiked(!!reactionType);
    
    // Update counts
    setReactionCounts(prev => {
      const newCounts = { ...prev };
      if (prevReaction) {
        newCounts[prevReaction] = Math.max(0, (newCounts[prevReaction] || 0) - 1);
      }
      if (reactionType) {
        newCounts[reactionType] = (newCounts[reactionType] || 0) + 1;
      }
      return newCounts;
    });
    setLikeCount(prev => {
      if (!wasLiked && reactionType) return prev + 1;
      if (wasLiked && !reactionType) return prev - 1;
      return prev;
    });
    
    try {
      await fetch(`${API_URL}/api/posts/${post.id}/react?token=${token}`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reaction: reactionType || 'like' })
      });
      onLike?.(post.id, !!reactionType);
    } catch (error) {
      setCurrentReaction(prevReaction);
      setLiked(wasLiked);
    }
  };

  const handleDoubleTap = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 300 && !liked) {
      setShowHeart(true);
      handleReaction('love');
      setTimeout(() => setShowHeart(false), 1000);
    }
    lastTapRef.current = now;
  };

  const handleSave = () => {
    haptic.light();
    setSaved(!saved);
    toast.success(saved ? 'Removed from saved' : 'Saved');
  };

  // Truncate content for "See more"
  const maxContentLength = 150;
  const shouldTruncate = post.content && post.content.length > maxContentLength;
  const displayContent = shouldTruncate && !isContentExpanded 
    ? post.content.slice(0, maxContentLength) + "..."
    : post.content;

  return (
    <ScrollReveal variant="fadeUp" className="mb-4">
      <article className="post-card" data-testid={`post-${post.id}`}>
        {/* Header with Profile Hover Card */}
        <div className="post-header">
          <ProfileHoverCard userId={post.user_id} username={post.username}>
            <Avatar 
              className="w-10 h-10 cursor-pointer ring-2 ring-transparent hover:ring-blue-500/50 transition-all"
              onClick={() => navigate(`/profile/${post.user_id}`)}
            >
              <AvatarImage src={post.avatar ? `${API_URL}${post.avatar}` : undefined} />
              <AvatarFallback className="bg-gradient-to-br from-[var(--primary)] to-[var(--accent-purple)] text-white text-sm">
                {post.display_name?.[0] || post.username?.[0] || '?'}
              </AvatarFallback>
            </Avatar>
          </ProfileHoverCard>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1">
              <ProfileHoverCard userId={post.user_id} username={post.username}>
                <button 
                  className="font-semibold text-sm truncate hover:underline"
                  onClick={() => navigate(`/profile/${post.user_id}`)}
                >
                  {post.username}
                </button>
              </ProfileHoverCard>
              {post.user_is_premium && <VerifiedBadge size="sm" />}
            </div>
            <div className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
              {post.location && (
                <>
                  <span className="truncate">{post.location.name}</span>
                  <span>•</span>
                </>
              )}
              <span>{formatTimeAgo(post.created_at)}</span>
            </div>
          </div>
          <button className="action-btn hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full p-2">
            <MoreHorizontal className="w-5 h-5" />
          </button>
        </div>

      {/* Media - Support for carousel posts */}
      {(post.media_url || post.media_items) && (
        <div className="relative" onClick={handleDoubleTap}>
          {post.type === 'carousel' && post.media_items ? (
            <CarouselPost 
              mediaItems={post.media_items.map(item => ({
                ...item,
                url: item.url.startsWith('http') ? item.url : `${API_URL}${item.url}`
              }))} 
            />
          ) : post.media_type === 'video' ? (
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
              src={post.media_url?.startsWith('http') ? post.media_url : `${API_URL}${post.media_url}`}
              alt=""
              className="post-media"
              style={{ filter: post.filter_applied || '' }}
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

      {/* Facebook-style Reactions & Actions */}
      <div className="post-actions border-t border-gray-100 dark:border-gray-800 pt-2 mt-2">
        <div className="flex items-center justify-between py-1 px-2">
          {/* Facebook Reactions */}
          <FacebookReactions
            currentReaction={currentReaction}
            onReact={handleReaction}
            reactionCounts={reactionCounts}
            size="default"
          />
          
          {/* Comment Button */}
          <button 
            className="flex items-center gap-1.5 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
            onClick={() => setShowComments(!showComments)}
          >
            <MessageCircle className="w-5 h-5" />
            <span>Comment</span>
          </button>
          
          {/* Share Button */}
          <button 
            className="flex items-center gap-1.5 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
            onClick={() => setShowShareModal(true)}
          >
            <Share2 className="w-5 h-5" />
            <span>Share</span>
          </button>
        </div>
        
        {/* Save button */}
        <div className="flex justify-end px-2 pb-1">
          <button 
            className={`p-1.5 rounded-full transition-colors ${saved ? 'text-[var(--primary)] bg-blue-50 dark:bg-blue-900/20' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`} 
            onClick={handleSave}
          >
            <Bookmark className={`w-5 h-5 ${saved ? 'fill-current' : ''}`} />
          </button>
        </div>
      </div>

      {/* Content with "See more" */}
      <div className="post-content">
        {post.content && (
          <p className="text-sm leading-relaxed">
            <span className="font-semibold mr-1">{post.username}</span>
            {displayContent}
            {shouldTruncate && !isContentExpanded && (
              <button 
                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 ml-1 font-medium"
                onClick={() => setIsContentExpanded(true)}
              >
                See more
              </button>
            )}
          </p>
        )}
        {post.comments_count > 0 && (
          <button 
            className="text-sm text-[var(--text-muted)] mt-2 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            onClick={() => setShowComments(!showComments)}
          >
            View all {post.comments_count} comments
          </button>
        )}
        <p className="text-[10px] text-[var(--text-muted)] mt-2 uppercase tracking-wide">
          {getTimeAgo(post.created_at)}
        </p>
      </div>

      {/* Share Modal */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        post={post}
      />
    </article>
    </ScrollReveal>
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
  const [activeUserStories, setActiveUserStories] = useState([]);
  
  // Infinite scroll states
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadMoreRef = useRef(null);
  const POSTS_PER_PAGE = 10;

  // Pull-to-refresh states
  const [refreshing, setRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const pullStartY = useRef(0);
  const feedContainerRef = useRef(null);
  const PULL_THRESHOLD = 80;

  // Pull-to-refresh handlers
  const handlePullStart = (e) => {
    if (feedContainerRef.current?.scrollTop === 0) {
      pullStartY.current = e.touches ? e.touches[0].clientY : e.clientY;
    }
  };

  const handlePullMove = (e) => {
    if (pullStartY.current === 0 || refreshing) return;
    
    const currentY = e.touches ? e.touches[0].clientY : e.clientY;
    const diff = currentY - pullStartY.current;
    
    if (diff > 0 && feedContainerRef.current?.scrollTop === 0) {
      e.preventDefault();
      setPullDistance(Math.min(diff * 0.5, 120));
    }
  };

  const handlePullEnd = async () => {
    if (pullDistance >= PULL_THRESHOLD && !refreshing) {
      setRefreshing(true);
      haptic.medium();
      await handleRefresh();
      setRefreshing(false);
    }
    setPullDistance(0);
    pullStartY.current = 0;
  };

  const handleRefresh = async () => {
    try {
      const [storiesRes, postsRes] = await Promise.all([
        fetch(`${API_URL}/api/stories/feed?token=${token}`),
        fetch(`${API_URL}/api/feed/home?token=${token}&page=1&limit=${POSTS_PER_PAGE}`)
      ]);
      
      if (storiesRes.ok) {
        const storiesData = await storiesRes.json();
        setStories(storiesData.stories || []);
      }
      
      if (postsRes.ok) {
        const postsData = await postsRes.json();
        const newPosts = postsData.posts || [];
        setPosts(newPosts);
        setPage(1);
        setHasMore(newPosts.length >= POSTS_PER_PAGE);
        toast.success('Feed refreshed');
      }
    } catch (error) {
      console.error('Refresh failed:', error);
      toast.error('Failed to refresh');
    }
  };

  // Fetch initial feed data
  const fetchFeed = useCallback(async () => {
    if (!token) return;
    
    try {
      // Fetch stories and posts in parallel
      const [storiesRes, postsRes] = await Promise.all([
        fetch(`${API_URL}/api/stories/feed?token=${token}`),
        fetch(`${API_URL}/api/feed/home?token=${token}&page=1&limit=${POSTS_PER_PAGE}`)
      ]);
      
      if (storiesRes.ok) {
        const storiesData = await storiesRes.json();
        setStories(storiesData.stories || []);
      }
      
      if (postsRes.ok) {
        const postsData = await postsRes.json();
        const newPosts = postsData.posts || [];
        setPosts(newPosts);
        setPage(1);
        setHasMore(newPosts.length >= POSTS_PER_PAGE);
      }
    } catch (error) {
      console.error('Failed to fetch feed:', error);
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Load more posts for infinite scroll
  const loadMorePosts = useCallback(async () => {
    if (!token || loadingMore || !hasMore) return;
    
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const res = await fetch(`${API_URL}/api/feed/home?token=${token}&page=${nextPage}&limit=${POSTS_PER_PAGE}`);
      
      if (res.ok) {
        const data = await res.json();
        const newPosts = data.posts || [];
        
        if (newPosts.length > 0) {
          setPosts(prev => {
            // Filter out duplicates based on post ID
            const existingIds = new Set(prev.map(p => p.id));
            const uniqueNewPosts = newPosts.filter(p => !existingIds.has(p.id));
            return [...prev, ...uniqueNewPosts];
          });
          setPage(nextPage);
          setHasMore(newPosts.length >= POSTS_PER_PAGE);
        } else {
          setHasMore(false);
        }
      }
    } catch (error) {
      console.error('Failed to load more posts:', error);
    } finally {
      setLoadingMore(false);
    }
  }, [token, page, loadingMore, hasMore]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && hasMore && !loadingMore && !loading) {
          loadMorePosts();
        }
      },
      { 
        root: null, 
        rootMargin: '200px', // Start loading before user reaches the end
        threshold: 0.1 
      }
    );

    const currentRef = loadMoreRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [hasMore, loadingMore, loading, loadMorePosts]);

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
      <HomeContent 
        isDark={isDark}
        navigate={navigate}
        user={user}
        token={token}
        loading={loading}
        stories={stories}
        posts={posts}
        hasMore={hasMore}
        loadingMore={loadingMore}
        loadMoreRef={loadMoreRef}
        refreshing={refreshing}
        pullDistance={pullDistance}
        feedContainerRef={feedContainerRef}
        handlePullStart={handlePullStart}
        handlePullMove={handlePullMove}
        handlePullEnd={handlePullEnd}
        handleRefresh={handleRefresh}
        handleLikeUpdate={handleLikeUpdate}
        activeStoryIndex={activeStoryIndex}
        setActiveStoryIndex={setActiveStoryIndex}
        activeUserStories={activeUserStories}
        setActiveUserStories={setActiveUserStories}
        PULL_THRESHOLD={PULL_THRESHOLD}
      />
    </SwipeablePanels>
  );
}

// Separate component to access panel context
function HomeContent({
  isDark, navigate, user, token, loading, stories, posts, hasMore, loadingMore,
  loadMoreRef, refreshing, pullDistance, feedContainerRef, handlePullStart,
  handlePullMove, handlePullEnd, handleRefresh, handleLikeUpdate,
  activeStoryIndex, setActiveStoryIndex, activeUserStories, setActiveUserStories,
  PULL_THRESHOLD
}) {
  const panels = usePanels();

  return (
    <div 
      className="min-h-screen mobile-scroll-container"
      style={{ background: 'var(--background)' }}
      data-theme={isDark ? 'dark' : 'light'}
    >
      {/* Header with Horizontal Scrolling */}
      <header className="app-header sticky top-0 z-40">
        <div className="flex items-center w-full overflow-x-auto scrollbar-hide" style={{ WebkitOverflowScrolling: 'touch' }}>
          {/* Left Panel Button - Mobile Only */}
          <button 
            className="header-icon sm:hidden flex-shrink-0"
            onClick={() => panels?.openLeftPanel()}
            data-testid="open-left-panel-btn"
          >
            <Menu className="w-6 h-6" />
          </button>
          
          {/* App Logo Icon */}
          <div className="flex items-center gap-2 flex-shrink-0 px-2">
            <img 
              src="/icons/icon-48x48.png" 
              alt="FaceConnect" 
              className="w-8 h-8 rounded-lg"
            />
          </div>
          
          {/* Scrollable Header Actions */}
          <div className="flex items-center gap-1 ml-auto flex-shrink-0">
            <button className="header-icon flex-shrink-0" onClick={() => navigate('/activity')}>
              <Heart className="w-6 h-6" />
            </button>
            <button className="header-icon flex-shrink-0" onClick={() => navigate('/chat')}>
              <MessageCircle className="w-6 h-6" />
              <span className="notification-badge" />
            </button>
            <button className="header-icon flex-shrink-0" onClick={() => navigate('/explore')}>
              <Search className="w-6 h-6" />
            </button>
            {/* Right Panel Button - Mobile Only */}
            <button 
              className="header-icon sm:hidden flex-shrink-0"
              onClick={() => panels?.openRightPanel()}
              data-testid="open-right-panel-btn"
            >
              <Grid3X3 className="w-6 h-6" />
            </button>
          </div>
        </div>
      </header>

      {/* Pull-to-Refresh Indicator */}
      <div 
        className="fixed top-14 left-1/2 -translate-x-1/2 z-50 sm:hidden"
        style={{
          opacity: pullDistance > 20 ? 1 : 0,
          transform: `translateY(${Math.min(pullDistance - 20, 60)}px)`,
          transition: pullDistance === 0 ? 'all 0.3s ease' : 'none'
        }}
      >
        <div className={`flex items-center gap-2 px-4 py-2 rounded-full shadow-lg ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
          <RefreshCw 
            className={`w-5 h-5 text-[var(--primary)] ${refreshing ? 'animate-spin' : ''}`}
            style={{ 
              transform: `rotate(${pullDistance * 2}deg)`,
              transition: refreshing ? 'none' : 'transform 0.1s'
            }}
          />
          <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {refreshing ? 'Refreshing...' : pullDistance >= PULL_THRESHOLD ? 'Release to refresh' : 'Pull to refresh'}
          </span>
        </div>
      </div>

      {/* Three-Column Layout for Desktop */}
      <div 
        className="flex justify-center main-layout"
        ref={feedContainerRef}
        onTouchStart={handlePullStart}
        onTouchMove={handlePullMove}
        onTouchEnd={handlePullEnd}
      >
        {/* Left Sidebar - Desktop Only */}
        <LeftSidebar className="flex-shrink-0 left-sidebar" />

          {/* Main Feed */}
          <main className="feed-container flex-1">
            {/* Create Post Widget - Facebook Style */}
            <CreatePostWidget />

            {/* Stories Bar */}
            <div className="stories-bar">
              {/* Add Story */}
              <StoryItem
                story={{ id: 'add', username: user?.username, avatar: user?.avatar }}
                isOwn={true}
                onClick={() => navigate('/profiles')}
              />
              
              {/* Other Stories - now from /api/stories/feed */}
              {stories.map((userStory, index) => (
                <StoryItem
                  key={userStory.user_id}
                  story={{
                    id: userStory.user_id,
                    username: userStory.username,
                    avatar: userStory.avatar
                  }}
                  hasNew={userStory.has_unviewed}
                  onClick={() => {
                    setActiveUserStories(userStory.stories);
                    setActiveStoryIndex(0);
                  }}
                />
              ))}
            </div>

            {/* Posts Feed */}
            {loading ? (
              <HomeFeedSkeleton />
            ) : posts.length === 0 ? (
              <div className="text-center py-12 px-4">
                <p className="text-[var(--text-secondary)]">No posts yet</p>
                <p className="text-sm text-[var(--text-muted)] mt-1">
                  Follow people to see their posts here
                </p>
              </div>
            ) : (
              <>
                {posts.map(post => (
                  <PostCard
                    key={post.id}
                    post={post}
                    token={token}
                    currentUserId={user?.id}
                    onLike={handleLikeUpdate}
                  />
                ))}
                
                {/* Infinite Scroll Trigger */}
                <div 
                  ref={loadMoreRef} 
                  className="w-full py-8 flex justify-center"
                  data-testid="infinite-scroll-trigger"
                >
                  {loadingMore && (
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-8 h-8 border-3 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
                      <p className="text-sm text-[var(--text-muted)]">Loading more posts...</p>
                    </div>
                  )}
                  {!hasMore && posts.length > 0 && (
                    <div className="text-center py-4">
                      <p className="text-sm text-[var(--text-muted)]">You've seen all posts</p>
                      <p className="text-xs text-[var(--text-muted)] mt-1">Follow more people to see more content</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </main>

          {/* Right Sidebar - Desktop Only */}
          <RightSidebar className="flex-shrink-0 right-sidebar" />
        </div>

        {/* Story Viewer */}
        <AnimatePresence>
          {activeStoryIndex !== null && activeUserStories.length > 0 && (
            <StoryViewer
              stories={activeUserStories}
              initialIndex={activeStoryIndex}
              token={token}
              currentUserId={user?.id}
              onClose={() => {
                setActiveStoryIndex(null);
                setActiveUserStories([]);
              }}
            />
          )}
        </AnimatePresence>

        {/* Bottom Navigation */}
        <BottomNav />
      </div>
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

// Format time ago with more detail (for post header)
function formatTimeAgo(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);
  
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hr`;
  if (seconds < 172800) return 'Yesterday';
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} days`;
  return date.toLocaleDateString();
}
