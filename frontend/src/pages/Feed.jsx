import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Heart, MessageCircle, Share2, Bookmark, MoreHorizontal,
  Play, Volume2, VolumeX, Clock, ChevronLeft, ChevronRight,
  X, Send, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { useSettings } from "@/context/SettingsContext";
import { haptic } from "@/utils/mobile";
import BottomNav from "@/components/BottomNav";

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Story Circle Component
function StoryCircle({ story, onClick, isDark, isOwn }) {
  const hasViewed = story.viewed;
  
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="flex flex-col items-center gap-1 min-w-[70px]"
    >
      <div className={`w-16 h-16 rounded-full p-[2px] ${
        hasViewed 
          ? 'bg-gray-400' 
          : 'bg-gradient-to-tr from-[#FF3366] via-[#7000FF] to-[#00F0FF]'
      }`}>
        <div className={`w-full h-full rounded-full p-[2px] ${isDark ? 'bg-[#0A0A0A]' : 'bg-white'}`}>
          {story.media_url ? (
            <img 
              src={`${API_URL}${story.media_url}`} 
              alt={story.username}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            <div className="w-full h-full rounded-full bg-gradient-to-br from-[#00F0FF] to-[#7000FF] flex items-center justify-center">
              <span className="text-white font-bold text-lg">
                {story.display_name?.[0] || story.username?.[0] || "?"}
              </span>
            </div>
          )}
        </div>
      </div>
      <span className={`text-xs truncate w-16 text-center ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
        {isOwn ? "Your Story" : story.display_name || story.username}
      </span>
    </motion.button>
  );
}

// Story Viewer Modal
function StoryViewer({ stories, initialIndex, onClose, isDark }) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const currentStory = stories[currentIndex];

  useEffect(() => {
    const duration = 5000; // 5 seconds per story
    const interval = 50;
    let elapsed = 0;
    
    const timer = setInterval(() => {
      elapsed += interval;
      setProgress((elapsed / duration) * 100);
      
      if (elapsed >= duration) {
        if (currentIndex < stories.length - 1) {
          setCurrentIndex(prev => prev + 1);
          elapsed = 0;
          setProgress(0);
        } else {
          onClose();
        }
      }
    }, interval);
    
    return () => clearInterval(timer);
  }, [currentIndex, stories.length, onClose]);

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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] bg-black"
    >
      {/* Progress Bars */}
      <div className="absolute top-4 left-4 right-4 z-20 flex gap-1">
        {stories.map((_, idx) => (
          <div key={idx} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
            <div 
              className="h-full bg-white transition-all"
              style={{ 
                width: idx < currentIndex ? '100%' : idx === currentIndex ? `${progress}%` : '0%'
              }}
            />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="absolute top-8 left-4 right-4 z-20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00F0FF] to-[#7000FF] flex items-center justify-center">
            <span className="text-white font-bold">
              {currentStory?.display_name?.[0] || "?"}
            </span>
          </div>
          <div>
            <p className="text-white font-medium">{currentStory?.display_name}</p>
            <p className="text-white/60 text-xs">
              {new Date(currentStory?.created_at).toLocaleTimeString()}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="text-white"
        >
          <X className="w-6 h-6" />
        </Button>
      </div>

      {/* Story Content */}
      <div className="w-full h-full flex items-center justify-center">
        {currentStory?.media_url ? (
          currentStory.media_type === "video" ? (
            <video
              src={`${API_URL}${currentStory.media_url}`}
              autoPlay
              className="max-w-full max-h-full object-contain"
            />
          ) : (
            <img
              src={`${API_URL}${currentStory.media_url}`}
              alt="Story"
              className="max-w-full max-h-full object-contain"
            />
          )
        ) : (
          <div className="text-center p-8">
            <p className="text-white text-xl">{currentStory?.content}</p>
          </div>
        )}
      </div>

      {/* Navigation Areas */}
      <div 
        className="absolute left-0 top-0 bottom-0 w-1/3 z-10"
        onClick={goPrev}
      />
      <div 
        className="absolute right-0 top-0 bottom-0 w-1/3 z-10"
        onClick={goNext}
      />

      {/* Story Text Overlay */}
      {currentStory?.content && currentStory?.media_url && (
        <div className="absolute bottom-20 left-4 right-4 z-20">
          <p className="text-white text-lg text-center bg-black/40 backdrop-blur-sm p-3 rounded-xl">
            {currentStory.content}
          </p>
        </div>
      )}
    </motion.div>
  );
}

// Post Card Component
function PostCard({ post, onLike, onComment, onShare, isDark }) {
  const [liked, setLiked] = useState(post.liked || false);
  const [likeCount, setLikeCount] = useState(post.likes_count || 0);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [comments, setComments] = useState(post.comments || []);
  const [muted, setMuted] = useState(true);
  const { token } = useAuth();

  const handleLike = async () => {
    haptic.medium();
    setLiked(!liked);
    setLikeCount(prev => liked ? prev - 1 : prev + 1);
    
    try {
      await fetch(`${API_URL}/api/posts/${post.id}/like?token=${token}`, {
        method: "POST"
      });
    } catch (error) {
      // Revert on error
      setLiked(liked);
      setLikeCount(prev => liked ? prev + 1 : prev - 1);
    }
  };

  const handleComment = async () => {
    if (!commentText.trim()) return;
    
    haptic.light();
    try {
      const response = await fetch(`${API_URL}/api/posts/${post.id}/comment?token=${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: commentText })
      });
      
      if (response.ok) {
        const newComment = await response.json();
        setComments(prev => [...prev, newComment]);
        setCommentText("");
      }
    } catch (error) {
      toast.error("Failed to add comment");
    }
  };

  const timeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    if (seconds < 60) return "Just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    return `${Math.floor(seconds / 86400)}d`;
  };

  return (
    <div className={`border-b ${isDark ? 'border-white/5' : 'border-gray-100'}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00F0FF] to-[#7000FF] flex items-center justify-center">
            <span className="text-white font-bold">
              {post.display_name?.[0] || post.username?.[0] || "?"}
            </span>
          </div>
          <div>
            <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {post.display_name || post.username}
            </p>
            <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              {timeAgo(post.created_at)}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="icon" className={isDark ? 'text-gray-400' : 'text-gray-600'}>
          <MoreHorizontal className="w-5 h-5" />
        </Button>
      </div>

      {/* Media */}
      {post.media_url && (
        <div className="relative aspect-square bg-black">
          {post.media_type === "video" ? (
            <>
              <video
                src={`${API_URL}${post.media_url}`}
                className="w-full h-full object-cover"
                loop
                muted={muted}
                autoPlay
                playsInline
              />
              <button
                onClick={() => setMuted(!muted)}
                className="absolute bottom-4 right-4 w-8 h-8 rounded-full bg-black/60 flex items-center justify-center"
              >
                {muted ? (
                  <VolumeX className="w-4 h-4 text-white" />
                ) : (
                  <Volume2 className="w-4 h-4 text-white" />
                )}
              </button>
            </>
          ) : (
            <img
              src={`${API_URL}${post.media_url}`}
              alt="Post"
              className="w-full h-full object-cover"
            />
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-4">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleLike}
            className="flex items-center gap-1"
          >
            <Heart 
              className={`w-6 h-6 ${liked ? 'fill-red-500 text-red-500' : isDark ? 'text-white' : 'text-gray-900'}`} 
            />
            {likeCount > 0 && (
              <span className={`text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>{likeCount}</span>
            )}
          </motion.button>
          
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowComments(!showComments)}
            className="flex items-center gap-1"
          >
            <MessageCircle className={`w-6 h-6 ${isDark ? 'text-white' : 'text-gray-900'}`} />
            {comments.length > 0 && (
              <span className={`text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>{comments.length}</span>
            )}
          </motion.button>
          
          <motion.button whileTap={{ scale: 0.9 }} onClick={onShare}>
            <Share2 className={`w-6 h-6 ${isDark ? 'text-white' : 'text-gray-900'}`} />
          </motion.button>
        </div>
        
        <motion.button whileTap={{ scale: 0.9 }}>
          <Bookmark className={`w-6 h-6 ${isDark ? 'text-white' : 'text-gray-900'}`} />
        </motion.button>
      </div>

      {/* Caption */}
      {post.content && (
        <div className="px-4 pb-3">
          <p className={isDark ? 'text-white' : 'text-gray-900'}>
            <span className="font-medium">{post.username}</span>{" "}
            {post.content}
          </p>
        </div>
      )}

      {/* Comments */}
      <AnimatePresence>
        {showComments && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className={`border-t ${isDark ? 'border-white/5' : 'border-gray-100'}`}
          >
            <div className="p-4 space-y-3">
              {comments.slice(-3).map((comment, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#00F0FF] to-[#7000FF] flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs font-bold">
                      {comment.username?.[0] || "?"}
                    </span>
                  </div>
                  <div>
                    <span className={`font-medium text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {comment.username}
                    </span>
                    <span className={`text-sm ml-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      {comment.content}
                    </span>
                  </div>
                </div>
              ))}
              
              {/* Add Comment */}
              <div className="flex items-center gap-2 pt-2">
                <Input
                  placeholder="Add a comment..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleComment()}
                  className={`flex-1 ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-gray-50 border-gray-200'}`}
                />
                <Button
                  size="icon"
                  onClick={handleComment}
                  disabled={!commentText.trim()}
                  className="bg-[#00F0FF] hover:bg-[#00F0FF]/80"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Feed() {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const { isDark } = useSettings();
  
  const [posts, setPosts] = useState([]);
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeStoryIndex, setActiveStoryIndex] = useState(null);

  const fetchFeed = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch posts
      const postsResponse = await fetch(`${API_URL}/api/posts?token=${token}&type=post`);
      if (postsResponse.ok) {
        const postsData = await postsResponse.json();
        setPosts(postsData);
      }
      
      // Fetch stories
      const storiesResponse = await fetch(`${API_URL}/api/posts?token=${token}&type=story`);
      if (storiesResponse.ok) {
        const storiesData = await storiesResponse.json();
        setStories(storiesData);
      }
    } catch (error) {
      console.error("Failed to fetch feed:", error);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchFeed();
    }
  }, [token, fetchFeed]);

  const handleShare = async (post) => {
    haptic.medium();
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Check out this post on FaceConnect",
          text: post.content || "Amazing post!",
          url: window.location.origin
        });
      } catch (e) {
        // User cancelled
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied!");
    }
  };

  return (
    <div className={`min-h-screen pb-20 ${isDark ? 'bg-[#0A0A0A]' : 'bg-white'}`}>
      {/* Header */}
      <div className={`sticky top-0 z-40 px-4 py-3 backdrop-blur-lg border-b ${isDark ? 'bg-[#0A0A0A]/95 border-white/5' : 'bg-white/95 border-gray-100'}`}>
        <h1 className="text-2xl font-bold font-['Outfit'] bg-gradient-to-r from-[#00F0FF] to-[#7000FF] bg-clip-text text-transparent">
          FaceConnect
        </h1>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-[#00F0FF] animate-spin" />
        </div>
      ) : (
        <>
          {/* Stories Row */}
          {stories.length > 0 && (
            <div className={`border-b ${isDark ? 'border-white/5' : 'border-gray-100'}`}>
              <ScrollArea className="w-full">
                <div className="flex gap-3 p-4">
                  {/* Add Story Button */}
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => navigate("/")}
                    className="flex flex-col items-center gap-1 min-w-[70px]"
                  >
                    <div className={`w-16 h-16 rounded-full border-2 border-dashed flex items-center justify-center ${isDark ? 'border-white/20' : 'border-gray-300'}`}>
                      <span className={`text-2xl ${isDark ? 'text-white/40' : 'text-gray-400'}`}>+</span>
                    </div>
                    <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Add</span>
                  </motion.button>
                  
                  {stories.map((story, index) => (
                    <StoryCircle
                      key={story.id}
                      story={story}
                      isDark={isDark}
                      isOwn={story.user_id === user?.id}
                      onClick={() => setActiveStoryIndex(index)}
                    />
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Posts Feed */}
          {posts.length === 0 ? (
            <div className="text-center py-20">
              <p className={`text-lg ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>No posts yet</p>
              <p className={`text-sm mt-1 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                Be the first to share something!
              </p>
            </div>
          ) : (
            <div>
              {posts.map(post => (
                <PostCard
                  key={post.id}
                  post={post}
                  isDark={isDark}
                  onShare={() => handleShare(post)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Story Viewer */}
      <AnimatePresence>
        {activeStoryIndex !== null && (
          <StoryViewer
            stories={stories}
            initialIndex={activeStoryIndex}
            isDark={isDark}
            onClose={() => setActiveStoryIndex(null)}
          />
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
}
