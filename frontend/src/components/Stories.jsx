import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, ChevronLeft, ChevronRight, Pause, Play, Volume2, VolumeX } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { haptic } from "@/utils/mobile";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Stories Bar Component
export function StoriesBar({ onAddStory, onViewStory }) {
  const { user, token } = useAuth();
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStories();
  }, [token]);

  const fetchStories = async () => {
    if (!token) return;
    try {
      const response = await fetch(`${API}/stories/feed?token=${token}`);
      const data = await response.json();
      setStories(data);
    } catch (error) {
      console.error("Failed to fetch stories:", error);
    } finally {
      setLoading(false);
    }
  };

  // Group stories by user
  const groupedStories = stories.reduce((acc, story) => {
    if (!acc[story.user_id]) {
      acc[story.user_id] = {
        user: story.user,
        stories: [],
        hasUnviewed: false
      };
    }
    acc[story.user_id].stories.push(story);
    if (!story.viewed_by?.includes(user?.id)) {
      acc[story.user_id].hasUnviewed = true;
    }
    return acc;
  }, {});

  const storyUsers = Object.values(groupedStories);

  return (
    <div className="stories-bar">
      {/* Add Story */}
      <button 
        onClick={() => { haptic.light(); onAddStory?.(); }}
        className="story-item"
        data-testid="add-story-btn"
      >
        <div className="story-avatar-wrapper add-story">
          <div className="story-avatar-inner">
            <Avatar className="story-avatar">
              <AvatarImage src={user?.avatar} />
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500">
                {user?.username?.[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>
          <div className="add-story-icon">
            <Plus className="w-3 h-3" />
          </div>
        </div>
        <span className="story-username">Your story</span>
      </button>

      {/* Loading Skeleton */}
      {loading && (
        <>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="story-item">
              <div className="w-[66px] h-[66px] rounded-full bg-gray-200 dark:bg-gray-800 animate-pulse" />
              <div className="w-12 h-2 bg-gray-200 dark:bg-gray-800 rounded animate-pulse mt-1" />
            </div>
          ))}
        </>
      )}

      {/* User Stories */}
      {storyUsers.map((storyGroup) => (
        <button
          key={storyGroup.user.id}
          onClick={() => { haptic.light(); onViewStory?.(storyGroup); }}
          className="story-item"
          data-testid={`story-${storyGroup.user.id}`}
        >
          <div className={`story-avatar-wrapper ${storyGroup.hasUnviewed ? '' : 'seen'}`}>
            <div className="story-avatar-inner">
              <Avatar className="story-avatar">
                <AvatarImage src={storyGroup.user.avatar} />
                <AvatarFallback className="bg-gradient-to-br from-orange-500 to-pink-500">
                  {storyGroup.user.username?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>
          <span className="story-username">{storyGroup.user.username}</span>
        </button>
      ))}
    </div>
  );
}

// Story Viewer Component
export function StoryViewer({ storyGroup, onClose, onNext, onPrev }) {
  const { token, user } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const videoRef = useRef(null);
  const timerRef = useRef(null);

  const stories = storyGroup?.stories || [];
  const currentStory = stories[currentIndex];
  const isVideo = currentStory?.media_type === 'video';
  const STORY_DURATION = isVideo ? null : 5000; // 5 seconds for images

  useEffect(() => {
    if (!currentStory || isPaused) return;

    if (isVideo && videoRef.current) {
      videoRef.current.play();
      return;
    }

    // Progress for images
    const startTime = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const newProgress = Math.min((elapsed / STORY_DURATION) * 100, 100);
      setProgress(newProgress);

      if (newProgress < 100) {
        timerRef.current = requestAnimationFrame(animate);
      } else {
        goToNext();
      }
    };
    timerRef.current = requestAnimationFrame(animate);

    return () => {
      if (timerRef.current) {
        cancelAnimationFrame(timerRef.current);
      }
    };
  }, [currentIndex, isPaused, currentStory]);

  useEffect(() => {
    // Mark story as viewed
    if (currentStory && token) {
      fetch(`${API}/stories/${currentStory.id}/view?token=${token}`, { method: 'POST' });
    }
  }, [currentStory, token]);

  const goToNext = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setProgress(0);
    } else {
      onNext?.();
    }
  };

  const goToPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setProgress(0);
    } else {
      onPrev?.();
    }
  };

  const handleTouchStart = (e) => {
    setIsPaused(true);
  };

  const handleTouchEnd = (e) => {
    setIsPaused(false);
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.changedTouches?.[0]?.clientX || e.clientX;
    const relativeX = x - rect.left;
    
    if (relativeX < rect.width / 3) {
      goToPrev();
    } else if (relativeX > rect.width * 2 / 3) {
      goToNext();
    }
  };

  const handleVideoEnded = () => {
    goToNext();
  };

  const handleVideoTimeUpdate = () => {
    if (videoRef.current) {
      const percent = (videoRef.current.currentTime / videoRef.current.duration) * 100;
      setProgress(percent);
    }
  };

  if (!currentStory) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black z-[300]"
    >
      {/* Progress Bars */}
      <div className="absolute top-0 left-0 right-0 z-10 flex gap-1 p-2 pt-[calc(8px+env(safe-area-inset-top))]">
        {stories.map((_, i) => (
          <div key={i} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-100"
              style={{
                width: i < currentIndex ? '100%' : i === currentIndex ? `${progress}%` : '0%'
              }}
            />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center gap-3 p-4 pt-[calc(24px+env(safe-area-inset-top))]">
        <Avatar className="w-8 h-8 ring-2 ring-white">
          <AvatarImage src={storyGroup.user.avatar} />
          <AvatarFallback>{storyGroup.user.username?.[0]}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <p className="text-white text-sm font-semibold">{storyGroup.user.username}</p>
          <p className="text-white/60 text-xs">{getTimeAgo(currentStory.created_at)}</p>
        </div>
        <div className="flex gap-4">
          {isVideo && (
            <button onClick={() => setIsMuted(!isMuted)} className="text-white">
              {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
            </button>
          )}
          <button onClick={onClose} className="text-white">
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Story Content */}
      <div
        className="w-full h-full flex items-center justify-center"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleTouchStart}
        onMouseUp={handleTouchEnd}
      >
        {isVideo ? (
          <video
            ref={videoRef}
            src={currentStory.media_url}
            className="w-full h-full object-contain"
            muted={isMuted}
            playsInline
            onEnded={handleVideoEnded}
            onTimeUpdate={handleVideoTimeUpdate}
          />
        ) : (
          <img
            src={currentStory.media_url}
            alt="Story"
            className="w-full h-full object-contain"
          />
        )}
      </div>

      {/* Navigation Areas */}
      <button
        onClick={goToPrev}
        className="absolute left-0 top-1/4 bottom-1/4 w-1/4"
        aria-label="Previous"
      />
      <button
        onClick={goToNext}
        className="absolute right-0 top-1/4 bottom-1/4 w-1/4"
        aria-label="Next"
      />
    </motion.div>
  );
}

// Helper function
function getTimeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);
  
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export default StoriesBar;
