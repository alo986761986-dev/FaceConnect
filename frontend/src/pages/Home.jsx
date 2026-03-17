import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Heart, MessageCircle, Share2, Bookmark, MoreHorizontal,
  Play, Volume2, VolumeX, X, Send, Loader2, Sparkles,
  ChevronRight, Bell, RefreshCw, Edit3, Star, Trash2,
  Radio, Eye, Users, ArrowUpDown, Clock, TrendingUp,
  Search, UserPlus, UserCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { useSettings } from "@/context/SettingsContext";
import { haptic } from "@/utils/mobile";
import BottomNav from "@/components/BottomNav";
import CreateMenu from "@/components/CreateMenu";
import ShareSheet from "@/components/ShareSheet";
import PostSettingsMenu from "@/components/PostSettingsMenu";
import UniversalSearch from "@/components/UniversalSearch";
import { AnimatedLikeButton, HeartBurst } from "@/components/LikeAnimation";
import { AppDownloadSection } from "@/components/AppDownloadSection";

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Story Circle Component
function StoryCircle({ story, onClick, isDark, isOwn, onDelete, currentUserId }) {
  const hasViewed = story.viewed;
  const isOwner = story.user_id === currentUserId;
  
  return (
    <motion.button
      data-testid={`story-${story.id}`}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="flex flex-col items-center gap-1 min-w-[72px] relative group"
    >
      <div className={`w-[68px] h-[68px] rounded-full p-[3px] ${
        hasViewed 
          ? isDark ? 'bg-gray-600' : 'bg-gray-300'
          : 'bg-gradient-to-tr from-[#FF3366] via-[#7000FF] to-[#00F0FF]'
      }`}>
        <div className={`w-full h-full rounded-full p-[2px] ${isDark ? 'bg-[#0A0A0A]' : 'bg-white'}`}>
          {story.avatar || story.media_url ? (
            <img 
              src={story.avatar ? `${API_URL}${story.avatar}` : `${API_URL}${story.media_url}`}
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
      {/* Delete button for owner */}
      {isOwner && onDelete && (
        <div
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            onDelete(story.id);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.stopPropagation();
              onDelete(story.id);
            }
          }}
          className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 cursor-pointer"
          data-testid={`delete-story-${story.id}`}
        >
          <X className="w-3 h-3" />
        </div>
      )}
      <span className={`text-[11px] truncate w-[68px] text-center font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
        {isOwn ? "Your Story" : story.display_name?.split(' ')[0] || story.username}
      </span>
    </motion.button>
  );
}

// Story Viewer Modal
function StoryViewer({ stories, initialIndex, onClose, isDark, token, onView }) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const currentStory = stories[currentIndex];

  useEffect(() => {
    if (currentStory && !currentStory.viewed) {
      onView(currentStory.id);
    }
  }, [currentStory, onView]);

  useEffect(() => {
    const duration = 5000;
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
      data-testid="story-viewer"
    >
      {/* Progress Bars */}
      <div className="absolute top-4 left-4 right-4 z-20 flex gap-1">
        {stories.map((_, idx) => (
          <div key={idx} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
            <div 
              className="h-full bg-white transition-all duration-100"
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
          <Avatar className="w-10 h-10 ring-2 ring-white/20">
            <AvatarImage src={currentStory?.avatar ? `${API_URL}${currentStory.avatar}` : undefined} />
            <AvatarFallback className="bg-gradient-to-br from-[#00F0FF] to-[#7000FF] text-white">
              {currentStory?.display_name?.[0] || "?"}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-white font-medium">{currentStory?.display_name || currentStory?.username}</p>
            <p className="text-white/60 text-xs">
              {currentStory?.created_at && new Date(currentStory.created_at).toLocaleTimeString()}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-white/10">
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
              playsInline
              muted
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
      <div className="absolute left-0 top-0 bottom-0 w-1/3 z-10" onClick={goPrev} />
      <div className="absolute right-0 top-0 bottom-0 w-1/3 z-10" onClick={goNext} />

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

// Reel Preview Card
function ReelPreviewCard({ reel, onClick, isDark, onDelete, currentUserId }) {
  const isOwner = reel.user_id === currentUserId;
  
  return (
    <motion.button
      data-testid={`reel-preview-${reel.id}`}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="relative min-w-[120px] h-[200px] rounded-xl overflow-hidden flex-shrink-0 group"
    >
      {reel.thumbnail_url ? (
        <img 
          src={`${API_URL}${reel.thumbnail_url}`}
          alt="Reel"
          className="w-full h-full object-cover"
        />
      ) : (
        <video
          src={`${API_URL}${reel.video_url}`}
          className="w-full h-full object-cover"
          muted
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
      <div className="absolute bottom-2 left-2 right-2">
        <div className="flex items-center gap-1 text-white text-xs">
          <Play className="w-3 h-3 fill-white" />
          <span>{reel.views_count || 0}</span>
        </div>
        <p className="text-white text-[10px] truncate mt-1">{reel.caption}</p>
      </div>
      <div className="absolute top-2 right-2">
        <div className="w-6 h-6 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
          <Play className="w-3 h-3 text-white fill-white" />
        </div>
      </div>
      {/* Delete button for owner */}
      {isOwner && onDelete && (
        <div
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            onDelete(reel.id);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.stopPropagation();
              onDelete(reel.id);
            }
          }}
          className="absolute top-2 left-2 w-6 h-6 rounded-full bg-red-500/90 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 cursor-pointer"
          data-testid={`delete-reel-preview-${reel.id}`}
        >
          <Trash2 className="w-3 h-3" />
        </div>
      )}
    </motion.button>
  );
}

// Live Stream Preview Card
function LiveStreamCard({ stream, onClick, isDark, onDelete, currentUserId }) {
  const isOwner = stream.user_id === currentUserId;
  
  return (
    <motion.button
      data-testid={`live-stream-${stream.id}`}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="relative min-w-[160px] h-[100px] rounded-xl overflow-hidden flex-shrink-0 group"
    >
      {/* Live background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#FF3366] via-[#7000FF] to-[#00F0FF] animate-pulse" />
      
      {stream.thumbnail ? (
        <img 
          src={`${API_URL}${stream.thumbnail}`}
          alt="Stream"
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <Radio className="w-10 h-10 text-white/50" />
        </div>
      )}
      
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
      
      {/* Live Badge */}
      <div className="absolute top-2 left-2 flex items-center gap-1 bg-red-500 text-white px-2 py-0.5 rounded-full text-[10px] font-bold">
        <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
        LIVE
      </div>
      
      {/* Viewer count */}
      <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/50 text-white px-2 py-0.5 rounded-full text-[10px]">
        <Eye className="w-3 h-3" />
        {stream.viewer_count || 0}
      </div>
      
      <div className="absolute bottom-2 left-2 right-2">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#00F0FF] to-[#7000FF] flex items-center justify-center">
            <span className="text-white text-[10px] font-bold">
              {stream.display_name?.[0] || stream.username?.[0] || "?"}
            </span>
          </div>
          <span className="text-white text-xs font-medium truncate flex-1">
            {stream.title || `${stream.display_name || stream.username}'s Live`}
          </span>
        </div>
      </div>
      
      {/* Delete button for owner */}
      {isOwner && onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(stream.id);
          }}
          className="absolute bottom-2 right-2 w-6 h-6 rounded-full bg-red-500/90 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
          data-testid={`delete-stream-${stream.id}`}
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </motion.button>
  );
}

// Highlighted Post Card
function HighlightedPostCard({ post, onClick, isDark }) {
  return (
    <motion.button
      data-testid={`highlighted-${post.id}`}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`relative min-w-[280px] h-[160px] rounded-2xl overflow-hidden flex-shrink-0 ${
        isDark ? 'bg-[#1A1A1A]' : 'bg-gray-100'
      }`}
    >
      {post.media_url ? (
        <img 
          src={`${API_URL}${post.media_url}`}
          alt="Post"
          className="w-full h-full object-cover"
        />
      ) : (
        <div className={`w-full h-full flex items-center justify-center p-4 ${
          isDark ? 'bg-gradient-to-br from-[#1A1A1A] to-[#2A2A2A]' : 'bg-gradient-to-br from-gray-100 to-gray-200'
        }`}>
          <p className={`text-sm line-clamp-3 ${isDark ? 'text-white' : 'text-gray-800'}`}>
            {post.content}
          </p>
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
      
      {/* Highlighted Badge */}
      <div className="absolute top-2 left-2 flex items-center gap-1 bg-[#FFD700]/90 text-black px-2 py-1 rounded-full text-[10px] font-semibold">
        <Sparkles className="w-3 h-3" />
        Featured
      </div>
      
      <div className="absolute bottom-3 left-3 right-3">
        <div className="flex items-center gap-2 mb-1">
          <Avatar className="w-6 h-6">
            <AvatarFallback className="bg-gradient-to-br from-[#00F0FF] to-[#7000FF] text-white text-xs">
              {post.display_name?.[0] || "?"}
            </AvatarFallback>
          </Avatar>
          <span className="text-white text-xs font-medium">{post.display_name || post.username}</span>
        </div>
        <div className="flex items-center gap-3 text-white/80 text-xs">
          <span className="flex items-center gap-1">
            <Heart className="w-3 h-3 fill-red-500 text-red-500" /> {post.likes_count}
          </span>
          <span className="flex items-center gap-1">
            <MessageCircle className="w-3 h-3" /> {post.comments_count}
          </span>
        </div>
      </div>
    </motion.button>
  );
}

// Post Card Component
function PostCard({ post, isDark, token, currentUserId, onLikeUpdate, onShare, onEdit, onDelete, onHighlight, onRefresh }) {
  const [liked, setLiked] = useState(post.is_liked || false);
  const [likeCount, setLikeCount] = useState(post.likes_count || 0);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [comments, setComments] = useState(post.comments || []);
  const [muted, setMuted] = useState(true);
  const [saved, setSaved] = useState(false);
  const [isHighlighted, setIsHighlighted] = useState(post.is_highlighted || false);
  const [showHeartBurst, setShowHeartBurst] = useState(false);
  const [settings, setSettings] = useState({
    hideLikes: post.hide_likes || false,
    hideShares: post.hide_shares || false,
    disableComments: post.disable_comments || false
  });

  const isOwner = post.user_id === currentUserId;
  const lastTapRef = useRef(0);

  const handleLike = async () => {
    haptic.medium();
    const newLiked = !liked;
    const newCount = newLiked ? likeCount + 1 : likeCount - 1;
    
    setLiked(newLiked);
    setLikeCount(newCount);
    
    try {
      await fetch(`${API_URL}/api/posts/${post.id}/like?token=${token}`, { method: "POST" });
      onLikeUpdate?.(post.id, newLiked, newCount);
    } catch (error) {
      setLiked(!newLiked);
      setLikeCount(likeCount);
    }
  };

  const handleDoubleTap = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      if (!liked) {
        setShowHeartBurst(true);
        handleLike();
      }
    }
    lastTapRef.current = now;
  };

  const handleComment = async () => {
    if (!commentText.trim() || settings.disableComments) return;
    
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

  const handleShareClick = () => {
    haptic.medium();
    onShare?.(post);
  };

  const handleSettingsChange = (postId, newSettings) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  const timeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    if (seconds < 60) return "Just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    return `${Math.floor(seconds / 86400)}d`;
  };

  return (
    <div 
      data-testid={`post-${post.id}`} 
      className={`border-b ${isDark ? 'border-white/5' : 'border-gray-100'} ${isHighlighted ? 'bg-gradient-to-r from-[#FFD700]/5 to-transparent' : ''}`}
    >
      {/* Highlighted Badge */}
      {isHighlighted && (
        <div className="flex items-center gap-1 px-4 pt-3">
          <Star className="w-4 h-4 text-[#FFD700] fill-[#FFD700]" />
          <span className="text-xs text-[#FFD700] font-medium">Highlighted Post</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <Avatar className="w-10 h-10">
            <AvatarImage src={post.avatar ? `${API_URL}${post.avatar}` : undefined} />
            <AvatarFallback className="bg-gradient-to-br from-[#00F0FF] to-[#7000FF] text-white">
              {post.display_name?.[0] || post.username?.[0] || "?"}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {post.display_name || post.username}
              </p>
              {post.edited_at && (
                <span className={`text-[10px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>(edited)</span>
              )}
            </div>
            <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              {timeAgo(post.created_at)}
            </p>
          </div>
        </div>
        
        {/* Post Menu */}
        <PostSettingsMenu
          post={post}
          isOwner={isOwner}
          token={token}
          isDark={isDark}
          onEdit={onEdit}
          onDelete={onDelete}
          onHighlight={(postId, highlighted) => {
            setIsHighlighted(highlighted);
            onHighlight?.(postId, highlighted);
          }}
          onShare={onShare}
          onSettingsChange={handleSettingsChange}
          onRefresh={onRefresh}
        />
      </div>

      {/* Media */}
      {post.media_url && (
        <div className="relative aspect-square bg-black" onClick={handleDoubleTap}>
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
                onClick={(e) => { e.stopPropagation(); setMuted(!muted); }}
                className="absolute bottom-4 right-4 w-8 h-8 rounded-full bg-black/60 flex items-center justify-center"
              >
                {muted ? <VolumeX className="w-4 h-4 text-white" /> : <Volume2 className="w-4 h-4 text-white" />}
              </button>
            </>
          ) : (
            <img src={`${API_URL}${post.media_url}`} alt="Post" className="w-full h-full object-cover" />
          )}
          
          {/* Heart Burst Animation */}
          <HeartBurst show={showHeartBurst} onComplete={() => setShowHeartBurst(false)} />
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-4">
          {/* Animated Like Button */}
          <AnimatedLikeButton
            isLiked={liked}
            likeCount={settings.hideLikes ? 0 : likeCount}
            onLike={handleLike}
            showCount={!settings.hideLikes}
            isDark={isDark}
          />
          
          {/* Comments */}
          {!settings.disableComments && (
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
          )}
          
          {/* Share */}
          <motion.button whileTap={{ scale: 0.9 }} onClick={handleShareClick}>
            <Share2 className={`w-6 h-6 ${isDark ? 'text-white' : 'text-gray-900'}`} />
          </motion.button>
        </div>
        
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => { setSaved(!saved); haptic.light(); }}>
          <Bookmark className={`w-6 h-6 transition-colors ${saved ? 'fill-[#00F0FF] text-[#00F0FF]' : isDark ? 'text-white' : 'text-gray-900'}`} />
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
        {showComments && !settings.disableComments && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className={`border-t overflow-hidden ${isDark ? 'border-white/5' : 'border-gray-100'}`}
          >
            <div className="p-4 space-y-3">
              {comments.slice(-3).map((comment, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-gradient-to-br from-[#00F0FF] to-[#7000FF] text-white text-xs">
                      {comment.username?.[0] || "?"}
                    </AvatarFallback>
                  </Avatar>
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

// Main Home Component
export default function Home() {
  const navigate = useNavigate();
  const { user, token, ws } = useAuth();
  const { isDark, t } = useSettings();
  
  const [feedData, setFeedData] = useState({
    live_streams: [],
    stories: [],
    highlighted_posts: [],
    reels_preview: [],
    posts: []
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeStoryIndex, setActiveStoryIndex] = useState(null);
  const [newContentCount, setNewContentCount] = useState(0);
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [showShareSheet, setShowShareSheet] = useState(false);
  const [shareContent, setShareContent] = useState(null);
  const [shareContentType, setShareContentType] = useState("post");
  const [sortBy, setSortBy] = useState("recent"); // "recent" or "popular"
  const [showSearch, setShowSearch] = useState(false);
  const [friendRequests, setFriendRequests] = useState([]);
  const [showFriendRequests, setShowFriendRequests] = useState(false);

  const fetchFeed = useCallback(async () => {
    if (!token) return;
    
    try {
      const response = await fetch(`${API_URL}/api/feed/home?token=${token}&sort_by=${sortBy}`);
      if (response.ok) {
        const data = await response.json();
        setFeedData(data);
      }
    } catch (error) {
      console.error("Failed to fetch feed:", error);
      toast.error("Failed to load feed");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, sortBy]);

  // Fetch friend requests
  const fetchFriendRequests = useCallback(async () => {
    if (!token) return;
    
    try {
      const response = await fetch(`${API_URL}/api/friends/requests?token=${token}`);
      if (response.ok) {
        const data = await response.json();
        setFriendRequests(data.filter(r => r.status === "pending"));
      }
    } catch (error) {
      console.error("Failed to fetch friend requests:", error);
    }
  }, [token]);

  useEffect(() => {
    fetchFeed();
    fetchFriendRequests();
  }, [fetchFeed, fetchFriendRequests]);

  // Handle friend request response
  const handleFriendRequest = async (requestId, action) => {
    haptic.medium();
    try {
      const response = await fetch(`${API_URL}/api/friends/requests/${requestId}/${action}?token=${token}`, {
        method: "POST"
      });
      
      if (response.ok) {
        setFriendRequests(prev => prev.filter(r => r.id !== requestId));
        toast.success(action === "accept" ? "Friend request accepted!" : "Friend request declined");
      }
    } catch (error) {
      toast.error("Failed to respond to friend request");
    }
  };

  // WebSocket real-time updates
  useEffect(() => {
    if (!ws) return;
    
    const handleMessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === "new_post") {
          setNewContentCount(prev => prev + 1);
          // Optionally add to feed
          if (data.post.type === "story") {
            setFeedData(prev => ({
              ...prev,
              stories: [data.post, ...prev.stories]
            }));
          }
        } else if (data.type === "new_reel") {
          setNewContentCount(prev => prev + 1);
        } else if (data.type === "post_liked") {
          setFeedData(prev => ({
            ...prev,
            posts: prev.posts.map(p => 
              p.id === data.post_id 
                ? { ...p, likes_count: data.likes_count, is_liked: data.liked_by === user?.id ? true : p.is_liked }
                : p
            )
          }));
        }
      } catch (e) {}
    };
    
    ws.addEventListener("message", handleMessage);
    return () => ws.removeEventListener("message", handleMessage);
  }, [ws, user?.id]);

  // Auto-refresh feed every 30 seconds when tab is visible
  useEffect(() => {
    let refreshInterval;
    let lastRefresh = Date.now();
    const AUTO_REFRESH_INTERVAL = 30000; // 30 seconds

    const autoRefresh = () => {
      if (document.visibilityState === 'visible' && !refreshing) {
        fetchFeed();
        lastRefresh = Date.now();
      }
    };

    // Set up interval for auto-refresh
    refreshInterval = setInterval(autoRefresh, AUTO_REFRESH_INTERVAL);

    // Refresh when tab becomes visible if enough time has passed
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const timeSinceLastRefresh = Date.now() - lastRefresh;
        if (timeSinceLastRefresh > AUTO_REFRESH_INTERVAL / 2) {
          fetchFeed();
          lastRefresh = Date.now();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(refreshInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchFeed, refreshing]);

  const handleRefresh = async () => {
    setRefreshing(true);
    setNewContentCount(0);
    haptic.medium();
    await fetchFeed();
    haptic.success();
  };

  const handleViewStory = async (storyId) => {
    try {
      await fetch(`${API_URL}/api/posts/${storyId}/view?token=${token}`, { method: "POST" });
      setFeedData(prev => ({
        ...prev,
        stories: prev.stories.map(s => s.id === storyId ? { ...s, viewed: true } : s)
      }));
    } catch (e) {}
  };

  const handleLikeUpdate = (postId, liked, count) => {
    setFeedData(prev => ({
      ...prev,
      posts: prev.posts.map(p => p.id === postId ? { ...p, is_liked: liked, likes_count: count } : p),
      highlighted_posts: prev.highlighted_posts.map(p => p.id === postId ? { ...p, is_liked: liked, likes_count: count } : p)
    }));
  };

  // Delete handlers
  const handleDeleteStory = async (storyId) => {
    if (!window.confirm("Delete this story?")) return;
    haptic.warning();
    
    try {
      const response = await fetch(`${API_URL}/api/stories/${storyId}?token=${token}`, {
        method: "DELETE"
      });
      if (response.ok) {
        setFeedData(prev => ({
          ...prev,
          stories: prev.stories.filter(s => s.id !== storyId)
        }));
        toast.success("Story deleted");
      }
    } catch (error) {
      toast.error("Failed to delete story");
    }
  };

  const handleDeleteReel = async (reelId) => {
    if (!window.confirm("Delete this reel?")) return;
    haptic.warning();
    
    try {
      const response = await fetch(`${API_URL}/api/reels/${reelId}?token=${token}`, {
        method: "DELETE"
      });
      if (response.ok) {
        setFeedData(prev => ({
          ...prev,
          reels_preview: prev.reels_preview.filter(r => r.id !== reelId)
        }));
        toast.success("Reel deleted");
      }
    } catch (error) {
      toast.error("Failed to delete reel");
    }
  };

  const handleDeleteStream = async (streamId) => {
    if (!window.confirm("End and delete this live stream?")) return;
    haptic.warning();
    
    try {
      const response = await fetch(`${API_URL}/api/streams/${streamId}?token=${token}`, {
        method: "DELETE"
      });
      if (response.ok) {
        setFeedData(prev => ({
          ...prev,
          live_streams: prev.live_streams.filter(s => s.id !== streamId)
        }));
        toast.success("Stream ended");
      }
    } catch (error) {
      toast.error("Failed to end stream");
    }
  };

  const toggleSort = () => {
    setSortBy(prev => prev === "recent" ? "popular" : "recent");
    haptic.light();
  };

  return (
    <div className={`min-h-screen pb-20 ${isDark ? 'bg-[#0A0A0A]' : 'bg-white'}`}>
      {/* Header */}
      <div className={`sticky top-0 z-40 px-4 py-3 backdrop-blur-lg border-b ${isDark ? 'bg-[#0A0A0A]/95 border-white/5' : 'bg-white/95 border-gray-100'}`}>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold font-['Outfit'] bg-gradient-to-r from-[#00F0FF] to-[#7000FF] bg-clip-text text-transparent">
            {t('faceConnect') || 'FaceConnect'}
          </h1>
          <div className="flex items-center gap-2">
            {newContentCount > 0 && (
              <Button
                data-testid="new-content-btn"
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                className="text-[#00F0FF] gap-1"
              >
                <Bell className="w-4 h-4" />
                {newContentCount} {t('newContent') || 'new'}
              </Button>
            )}
            
            {/* Search Button */}
            <Button
              data-testid="search-btn"
              variant="ghost"
              size="icon"
              onClick={() => setShowSearch(true)}
              className={isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-black'}
            >
              <Search className="w-5 h-5" />
            </Button>
            
            {/* Friend Requests Button */}
            <Button
              data-testid="friend-requests-btn"
              variant="ghost"
              size="icon"
              onClick={() => setShowFriendRequests(true)}
              className={`relative ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-black'}`}
            >
              <UserPlus className="w-5 h-5" />
              {friendRequests.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 text-[10px] flex items-center justify-center rounded-full bg-red-500 text-white font-bold">
                  {friendRequests.length > 9 ? '9+' : friendRequests.length}
                </span>
              )}
            </Button>
            
            {/* Sort Toggle */}
            <Button
              data-testid="sort-toggle-btn"
              variant="ghost"
              size="icon"
              onClick={toggleSort}
              className={`${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-black'} ${sortBy === 'popular' ? 'text-[#00F0FF]' : ''}`}
              title={sortBy === 'recent' ? 'Sort by recent' : 'Sort by popular'}
            >
              {sortBy === 'recent' ? <Clock className="w-5 h-5" /> : <TrendingUp className="w-5 h-5" />}
            </Button>
            <Button
              data-testid="refresh-btn"
              variant="ghost"
              size="icon"
              onClick={handleRefresh}
              disabled={refreshing}
              className={isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-black'}
            >
              <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-[#00F0FF] animate-spin" />
        </div>
      ) : (
        <div className="space-y-1">
          {/* Live Streams Section - Priority at top */}
          {feedData.live_streams && feedData.live_streams.length > 0 && (
            <div className={`py-4 border-b ${isDark ? 'border-white/5' : 'border-gray-100'}`}>
              <div className="flex items-center justify-between px-4 mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  <h2 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{t('liveNow') || 'Live Now'}</h2>
                </div>
                <Button
                  data-testid="see-all-live-btn"
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/live')}
                  className="text-red-500 gap-1"
                >
                  {t('seeAll') || 'See all'} <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
              <ScrollArea className="w-full">
                <div className="flex gap-3 px-4">
                  {feedData.live_streams.map(stream => (
                    <LiveStreamCard
                      key={stream.id}
                      stream={stream}
                      isDark={isDark}
                      currentUserId={user?.id}
                      onClick={() => navigate(`/live/${stream.id}`)}
                      onDelete={handleDeleteStream}
                    />
                  ))}
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </div>
          )}

          {/* Stories Row */}
          <div className={`py-4 border-b ${isDark ? 'border-white/5' : 'border-gray-100'}`}>
            <ScrollArea className="w-full">
              <div className="flex gap-3 px-4">
                {/* Add Story Button */}
                <motion.button
                  data-testid="add-story-btn"
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowCreateMenu(true)}
                  className="flex flex-col items-center gap-1 min-w-[72px]"
                >
                  <div className={`w-[68px] h-[68px] rounded-full border-2 border-dashed flex items-center justify-center ${isDark ? 'border-white/20' : 'border-gray-300'}`}>
                    <span className={`text-3xl ${isDark ? 'text-white/40' : 'text-gray-400'}`}>+</span>
                  </div>
                  <span className={`text-[11px] ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{t('add') || 'Add'}</span>
                </motion.button>
                
                {feedData.stories.map((story, index) => (
                  <StoryCircle
                    key={story.id}
                    story={story}
                    isDark={isDark}
                    isOwn={story.user_id === user?.id}
                    currentUserId={user?.id}
                    onClick={() => setActiveStoryIndex(index)}
                    onDelete={handleDeleteStory}
                  />
                ))}
                
                {feedData.stories.length === 0 && (
                  <div className={`flex items-center justify-center h-[80px] px-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                    <p className="text-sm">{t('noStoriesYet') || 'No stories yet. Be the first!'}</p>
                  </div>
                )}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </div>

          {/* Reels Preview Section */}
          {feedData.reels_preview.length > 0 && (
            <div className={`py-4 border-b ${isDark ? 'border-white/5' : 'border-gray-100'}`}>
              <div className="flex items-center justify-between px-4 mb-3">
                <h2 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{t('reels') || 'Reels'}</h2>
                <Button
                  data-testid="see-all-reels-btn"
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/reels')}
                  className="text-[#00F0FF] gap-1"
                >
                  {t('seeAll') || 'See all'} <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
              <ScrollArea className="w-full">
                <div className="flex gap-3 px-4">
                  {feedData.reels_preview.map(reel => (
                    <ReelPreviewCard
                      key={reel.id}
                      reel={reel}
                      isDark={isDark}
                      currentUserId={user?.id}
                      onClick={() => navigate('/reels')}
                      onDelete={handleDeleteReel}
                    />
                  ))}
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </div>
          )}

          {/* App Download Section */}
          <AppDownloadSection isDark={isDark} />

          {/* Highlighted Posts Section */}
          {feedData.highlighted_posts.length > 0 && (
            <div className={`py-4 border-b ${isDark ? 'border-white/5' : 'border-gray-100'}`}>
              <div className="flex items-center gap-2 px-4 mb-3">
                <Sparkles className="w-5 h-5 text-[#FFD700]" />
                <h2 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{t('featuredPosts') || 'Featured Posts'}</h2>
              </div>
              <ScrollArea className="w-full">
                <div className="flex gap-3 px-4">
                  {feedData.highlighted_posts.map(post => (
                    <HighlightedPostCard
                      key={post.id}
                      post={post}
                      isDark={isDark}
                      onClick={() => {}}
                    />
                  ))}
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </div>
          )}

          {/* Regular Posts Feed */}
          <div>
            <div className="flex items-center justify-between px-4 py-3">
              <h2 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{t('posts') || 'Posts'}</h2>
            </div>
            
            {feedData.posts.length === 0 ? (
              <div className="text-center py-12 px-4">
                <p className={`text-lg ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{t('noPostsYet') || 'No posts yet'}</p>
                <p className={`text-sm mt-1 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                  {t('beFirstToShare') || 'Be the first to share something!'}
                </p>
                <Button
                  data-testid="create-first-post-btn"
                  onClick={() => setShowCreateMenu(true)}
                  className="mt-4 bg-gradient-to-r from-[#00F0FF] to-[#7000FF]"
                >
                  {t('createPost') || 'Create Post'}
                </Button>
              </div>
            ) : (
              feedData.posts.map(post => (
                <PostCard
                  key={post.id}
                  post={post}
                  isDark={isDark}
                  token={token}
                  currentUserId={user?.id}
                  onLikeUpdate={handleLikeUpdate}
                  onShare={(p) => {
                    setShareContent(p);
                    setShareContentType("post");
                    setShowShareSheet(true);
                  }}
                  onEdit={(postId, updatedPost) => {
                    setFeedData(prev => ({
                      ...prev,
                      posts: prev.posts.map(p => p.id === postId ? { ...p, ...updatedPost } : p)
                    }));
                  }}
                  onDelete={(postId) => {
                    setFeedData(prev => ({
                      ...prev,
                      posts: prev.posts.filter(p => p.id !== postId)
                    }));
                  }}
                  onHighlight={(postId, isHighlighted) => {
                    setFeedData(prev => ({
                      ...prev,
                      posts: prev.posts.map(p => p.id === postId ? { ...p, is_highlighted: isHighlighted } : p)
                    }));
                  }}
                />
              ))
            )}
          </div>
        </div>
      )}

      {/* Story Viewer */}
      <AnimatePresence>
        {activeStoryIndex !== null && feedData.stories.length > 0 && (
          <StoryViewer
            stories={feedData.stories}
            initialIndex={activeStoryIndex}
            isDark={isDark}
            token={token}
            onView={handleViewStory}
            onClose={() => setActiveStoryIndex(null)}
          />
        )}
      </AnimatePresence>

      {/* Create Menu */}
      <CreateMenu
        isOpen={showCreateMenu}
        onClose={() => setShowCreateMenu(false)}
      />

      {/* Share Sheet */}
      <ShareSheet
        isOpen={showShareSheet}
        onClose={() => {
          setShowShareSheet(false);
          setShareContent(null);
        }}
        contentType={shareContentType}
        contentId={shareContent?.id}
        title={`Share ${shareContentType === "story" ? "Story" : "Post"}`}
        shareText={shareContent?.content || `Check out this ${shareContentType} on FaceConnect!`}
        mediaUrl={shareContent?.media_url ? `${API_URL}${shareContent.media_url}` : null}
        onShareComplete={() => {
          // Auto-refresh feed after sharing
          fetchFeed();
          toast.success("Shared! Feed updated.");
        }}
      />

      {/* Universal Search */}
      <UniversalSearch
        isOpen={showSearch}
        onClose={() => setShowSearch(false)}
        token={token}
        isDark={isDark}
      />

      {/* Friend Requests Dialog */}
      <Dialog open={showFriendRequests} onOpenChange={setShowFriendRequests}>
        <DialogContent className={`max-w-md ${isDark ? 'bg-[#1A1A1A] border-white/10' : 'bg-white'}`}>
          <DialogHeader>
            <DialogTitle className={isDark ? 'text-white' : ''}>
              Friend Requests
              {friendRequests.length > 0 && (
                <span className="ml-2 text-sm font-normal text-gray-500">
                  ({friendRequests.length})
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {friendRequests.length === 0 ? (
              <div className="text-center py-8">
                <UserPlus className={`w-12 h-12 mx-auto mb-3 ${isDark ? 'text-gray-600' : 'text-gray-400'}`} />
                <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>
                  No pending friend requests
                </p>
              </div>
            ) : (
              friendRequests.map((request) => (
                <div
                  key={request.id}
                  className={`flex items-center gap-3 p-3 rounded-xl ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}
                >
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={request.from_user?.avatar ? `${API_URL}${request.from_user.avatar}` : undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-[#00F0FF] to-[#7000FF] text-white">
                      {request.from_user?.display_name?.[0] || request.from_user?.username?.[0] || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {request.from_user?.display_name || request.from_user?.username}
                    </p>
                    <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                      @{request.from_user?.username}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleFriendRequest(request.id, "accept")}
                      className="bg-[#00F0FF] hover:bg-[#00F0FF]/80 text-black"
                    >
                      <UserCheck className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleFriendRequest(request.id, "decline")}
                      className={isDark ? 'text-gray-400' : 'text-gray-600'}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
}
