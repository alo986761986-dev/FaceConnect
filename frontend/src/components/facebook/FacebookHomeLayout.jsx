import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Heart, MessageCircle, Send, Bookmark, MoreHorizontal,
  Plus, X, ChevronLeft, ChevronRight, Volume2, VolumeX, Share2,
  Menu, Search, Bell, Video, Users, ShoppingBag, Gamepad2,
  Calendar, Flag, Clock, Newspaper, Tv, Radio, MapPin,
  Image as ImageIcon, Smile, Camera, Mic, ThumbsUp, 
  MessageSquare, Share, Gift, Star, Zap, BookOpen, Heart as HeartIcon,
  Home as HomeIcon, User, Settings, HelpCircle, LogOut, Moon, Sun,
  ChevronDown, Globe, Lock, Eye, UserPlus, Bookmark as BookmarkIcon,
  PlayCircle, Film, Clapperboard, Sparkles
} from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { useSettings } from "@/context/SettingsContext";
import { haptic } from "@/utils/mobile";

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Facebook-style Header
function FacebookHeader({ user, isDark, onMenuClick, onSearchClick, onMessengerClick, onCreateClick, notificationCount = 0, messageCount = 0 }) {
  return (
    <header className={`sticky top-0 z-50 ${isDark ? 'bg-[#242526]' : 'bg-white'} border-b ${isDark ? 'border-[#3a3b3c]' : 'border-gray-200'} safe-area-top`}>
      <div className="flex items-center justify-between px-4 py-2">
        {/* Left: Menu & Logo */}
        <div className="flex items-center gap-3">
          <button 
            onClick={onMenuClick}
            className={`p-2 rounded-full ${isDark ? 'hover:bg-[#3a3b3c]' : 'hover:bg-gray-100'}`}
            data-testid="menu-btn"
          >
            <Menu className={`w-6 h-6 ${isDark ? 'text-gray-200' : 'text-gray-700'}`} />
          </button>
          <h1 className="text-2xl font-bold italic bg-gradient-to-r from-purple-500 to-cyan-400 bg-clip-text text-transparent">
            FaceConnect
          </h1>
        </div>
        
        {/* Right: Actions */}
        <div className="flex items-center gap-1">
          {/* Create */}
          <button 
            onClick={onCreateClick}
            className={`p-2.5 rounded-full ${isDark ? 'bg-[#3a3b3c] hover:bg-[#4a4b4c]' : 'bg-gray-100 hover:bg-gray-200'}`}
            data-testid="create-btn"
          >
            <Plus className={`w-5 h-5 ${isDark ? 'text-gray-200' : 'text-gray-700'}`} />
          </button>
          
          {/* Search */}
          <button 
            onClick={onSearchClick}
            className={`p-2.5 rounded-full ${isDark ? 'bg-[#3a3b3c] hover:bg-[#4a4b4c]' : 'bg-gray-100 hover:bg-gray-200'}`}
            data-testid="search-btn"
          >
            <Search className={`w-5 h-5 ${isDark ? 'text-gray-200' : 'text-gray-700'}`} />
          </button>
          
          {/* Messenger */}
          <button 
            onClick={onMessengerClick}
            className={`relative p-2.5 rounded-full ${isDark ? 'bg-[#3a3b3c] hover:bg-[#4a4b4c]' : 'bg-gray-100 hover:bg-gray-200'}`}
            data-testid="messenger-btn"
          >
            <MessageCircle className={`w-5 h-5 ${isDark ? 'text-gray-200' : 'text-gray-700'}`} />
            {messageCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                {messageCount > 9 ? '9+' : messageCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}

// Create Post Widget (Status Composer)
function StatusComposer({ user, isDark, onPostClick, onPhotoClick, onVideoClick, onLiveClick }) {
  const { t } = useSettings();
  
  return (
    <div className={`${isDark ? 'bg-[#242526]' : 'bg-white'} rounded-xl mx-3 my-2 p-3 shadow-sm`}>
      {/* Input Row */}
      <div className="flex items-center gap-3">
        <Avatar className="w-10 h-10 ring-2 ring-purple-500/30">
          <AvatarImage src={user?.avatar ? `${API_URL}${user.avatar}` : undefined} />
          <AvatarFallback className="bg-gradient-to-br from-purple-500 to-cyan-400 text-white">
            {user?.display_name?.[0] || user?.username?.[0] || '?'}
          </AvatarFallback>
        </Avatar>
        
        <button 
          onClick={onPostClick}
          className={`flex-1 text-left px-4 py-2.5 rounded-full ${
            isDark ? 'bg-[#3a3b3c] text-gray-400 hover:bg-[#4a4b4c]' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
          } transition-colors`}
          data-testid="status-input"
        >
          {t('whatAreYouThinking') || "What's on your mind?"}
        </button>
        
        {/* Photo Button */}
        <button 
          onClick={onPhotoClick}
          className={`p-2 rounded-full ${isDark ? 'hover:bg-[#3a3b3c]' : 'hover:bg-gray-100'}`}
          data-testid="photo-btn"
        >
          <ImageIcon className="w-6 h-6 text-green-500" />
        </button>
      </div>
      
      {/* Divider */}
      <div className={`my-3 border-t ${isDark ? 'border-[#3a3b3c]' : 'border-gray-200'}`} />
      
      {/* Action Buttons */}
      <div className="flex items-center justify-around">
        <button 
          onClick={onVideoClick}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg ${isDark ? 'hover:bg-[#3a3b3c]' : 'hover:bg-gray-100'}`}
        >
          <Video className="w-5 h-5 text-red-500" />
          <span className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Video</span>
        </button>
        
        <button 
          onClick={onPhotoClick}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg ${isDark ? 'hover:bg-[#3a3b3c]' : 'hover:bg-gray-100'}`}
        >
          <ImageIcon className="w-5 h-5 text-green-500" />
          <span className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Photo</span>
        </button>
        
        <button 
          onClick={onLiveClick}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg ${isDark ? 'hover:bg-[#3a3b3c]' : 'hover:bg-gray-100'}`}
        >
          <Radio className="w-5 h-5 text-purple-500" />
          <span className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Live</span>
        </button>
      </div>
    </div>
  );
}

// Stories Section (Facebook Style)
function StoriesSection({ stories, user, isDark, onStoryClick, onCreateStory }) {
  return (
    <div className={`${isDark ? 'bg-[#242526]' : 'bg-white'} py-3`}>
      <ScrollArea className="w-full">
        <div className="flex gap-2 px-3 pb-1">
          {/* Create Story Card */}
          <button 
            onClick={onCreateStory}
            className="flex-shrink-0 w-28 relative"
            data-testid="create-story"
          >
            <div className={`w-full aspect-[3/4] rounded-xl overflow-hidden ${isDark ? 'bg-[#3a3b3c]' : 'bg-gray-100'}`}>
              {/* User Avatar */}
              <div className="w-full h-3/4 relative">
                <img
                  src={user?.avatar ? `${API_URL}${user.avatar}` : '/default-avatar.png'}
                  alt="Your story"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.src = '/default-avatar.png';
                  }}
                />
              </div>
              
              {/* Create Button */}
              <div className={`absolute left-1/2 -translate-x-1/2 bottom-8 w-9 h-9 rounded-full border-4 ${
                isDark ? 'border-[#242526] bg-purple-500' : 'border-white bg-purple-500'
              } flex items-center justify-center`}>
                <Plus className="w-5 h-5 text-white" />
              </div>
              
              {/* Label */}
              <div className={`h-1/4 flex items-center justify-center ${isDark ? 'bg-[#3a3b3c]' : 'bg-white'}`}>
                <span className={`text-xs font-medium ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>
                  Create Story
                </span>
              </div>
            </div>
          </button>
          
          {/* Friend Stories */}
          {stories.map((story, index) => (
            <button
              key={story.id || index}
              onClick={() => onStoryClick(index)}
              className="flex-shrink-0 w-28 relative"
              data-testid={`story-${story.id}`}
            >
              <div className="w-full aspect-[3/4] rounded-xl overflow-hidden relative">
                {/* Story Image */}
                <img
                  src={story.media_url ? `${API_URL}${story.media_url}` : (story.avatar ? `${API_URL}${story.avatar}` : '/default-avatar.png')}
                  alt={story.username}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.src = '/default-avatar.png';
                  }}
                />
                
                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                
                {/* User Avatar with Ring */}
                <div className={`absolute top-2 left-2 w-10 h-10 rounded-full p-0.5 ${
                  story.has_new ? 'bg-gradient-to-br from-purple-500 to-cyan-400' : 'bg-gray-400'
                }`}>
                  <img
                    src={story.avatar ? `${API_URL}${story.avatar}` : '/default-avatar.png'}
                    alt={story.username}
                    className="w-full h-full rounded-full object-cover border-2 border-[#242526]"
                    onError={(e) => {
                      e.target.src = '/default-avatar.png';
                    }}
                  />
                </div>
                
                {/* Username */}
                <div className="absolute bottom-2 left-2 right-2">
                  <p className="text-white text-xs font-medium truncate drop-shadow-lg">
                    {story.display_name || story.username}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

// Post Card (Facebook Style)
function PostCard({ post, isDark, currentUserId, token, onLike, onComment, onShare, onSave, onHide, onReport }) {
  const [liked, setLiked] = useState(post.liked_by_user);
  const [likesCount, setLikesCount] = useState(post.likes_count || 0);
  const [saved, setSaved] = useState(post.saved_by_user);
  const [showMenu, setShowMenu] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [selectedReaction, setSelectedReaction] = useState(null);
  
  const reactions = [
    { emoji: '👍', name: 'Like', color: 'text-blue-500' },
    { emoji: '❤️', name: 'Love', color: 'text-red-500' },
    { emoji: '😂', name: 'Haha', color: 'text-yellow-500' },
    { emoji: '😮', name: 'Wow', color: 'text-yellow-500' },
    { emoji: '😢', name: 'Sad', color: 'text-yellow-500' },
    { emoji: '😡', name: 'Angry', color: 'text-orange-500' },
  ];
  
  const handleLike = async () => {
    haptic.light();
    const newLiked = !liked;
    setLiked(newLiked);
    setLikesCount(prev => newLiked ? prev + 1 : prev - 1);
    setSelectedReaction(newLiked ? reactions[0] : null);
    
    try {
      await fetch(`${API_URL}/api/posts/${post.id}/like?token=${token}`, {
        method: 'POST'
      });
    } catch (error) {
      // Revert on error
      setLiked(!newLiked);
      setLikesCount(prev => newLiked ? prev - 1 : prev + 1);
    }
  };
  
  const handleReaction = (reaction) => {
    haptic.medium();
    setSelectedReaction(reaction);
    setLiked(true);
    setLikesCount(prev => liked ? prev : prev + 1);
    setShowReactions(false);
  };
  
  const getTimeAgo = (date) => {
    const now = new Date();
    const then = new Date(date);
    const diffMs = now - then;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return then.toLocaleDateString();
  };

  return (
    <article className={`${isDark ? 'bg-[#242526]' : 'bg-white'} rounded-xl mx-3 my-2 shadow-sm overflow-hidden`}>
      {/* Post Header */}
      <div className="flex items-start justify-between p-3">
        <div className="flex items-center gap-3">
          {/* Avatar with Story Ring */}
          <div className="relative">
            <div className="w-10 h-10 rounded-full p-0.5 bg-gradient-to-br from-purple-500 to-cyan-400">
              <Avatar className="w-full h-full border-2 border-[#242526]">
                <AvatarImage src={post.avatar ? `${API_URL}${post.avatar}` : undefined} />
                <AvatarFallback className="bg-gradient-to-br from-purple-500 to-cyan-400 text-white text-sm">
                  {post.username?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>
          
          {/* User Info */}
          <div>
            <div className="flex items-center gap-1">
              <span className={`font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                {post.display_name || post.username}
              </span>
              {post.is_verified && (
                <svg className="w-4 h-4 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                </svg>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <span>{getTimeAgo(post.created_at)}</span>
              {post.location && (
                <>
                  <span>·</span>
                  <MapPin className="w-3 h-3" />
                  <span>{post.location}</span>
                </>
              )}
              <span>·</span>
              <Globe className="w-3 h-3" />
            </div>
          </div>
        </div>
        
        {/* Menu */}
        <div className="flex items-center gap-1">
          <button 
            onClick={() => setShowMenu(!showMenu)}
            className={`p-2 rounded-full ${isDark ? 'hover:bg-[#3a3b3c]' : 'hover:bg-gray-100'}`}
          >
            <MoreHorizontal className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
          </button>
          <button 
            onClick={() => onHide?.(post.id)}
            className={`p-2 rounded-full ${isDark ? 'hover:bg-[#3a3b3c]' : 'hover:bg-gray-100'}`}
          >
            <X className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
          </button>
        </div>
      </div>
      
      {/* Post Content */}
      {post.content && (
        <div className="px-3 pb-3">
          <p className={`${isDark ? 'text-gray-100' : 'text-gray-900'} whitespace-pre-wrap`}>
            {post.content}
          </p>
          {/* Hashtags */}
          {post.hashtags && post.hashtags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {post.hashtags.map((tag, i) => (
                <span key={i} className="text-purple-500 hover:underline cursor-pointer">
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
      
      {/* Post Media */}
      {post.media_url && (
        <div className="relative">
          {post.media_type === 'video' ? (
            <video
              src={`${API_URL}${post.media_url}`}
              className="w-full max-h-[500px] object-cover"
              controls
              playsInline
            />
          ) : (
            <img
              src={`${API_URL}${post.media_url}`}
              alt="Post media"
              className="w-full max-h-[500px] object-cover"
              loading="lazy"
            />
          )}
        </div>
      )}
      
      {/* Reactions & Stats */}
      <div className={`flex items-center justify-between px-3 py-2 border-b ${isDark ? 'border-[#3a3b3c]' : 'border-gray-200'}`}>
        <div className="flex items-center gap-1">
          {likesCount > 0 && (
            <>
              <div className="flex -space-x-1">
                <span className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-xs">👍</span>
                <span className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center text-xs">❤️</span>
              </div>
              <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                {likesCount}
              </span>
            </>
          )}
        </div>
        
        <div className={`flex items-center gap-3 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          {post.comments_count > 0 && (
            <span>{post.comments_count} comments</span>
          )}
          {post.shares_count > 0 && (
            <span>{post.shares_count} shares</span>
          )}
        </div>
      </div>
      
      {/* Action Buttons */}
      <div className="flex items-center justify-around py-1 px-2">
        {/* Like Button with Reactions */}
        <div className="relative flex-1">
          <button
            onMouseEnter={() => setShowReactions(true)}
            onMouseLeave={() => setShowReactions(false)}
            onClick={handleLike}
            className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg ${
              isDark ? 'hover:bg-[#3a3b3c]' : 'hover:bg-gray-100'
            } transition-colors`}
          >
            {selectedReaction ? (
              <span className="text-xl">{selectedReaction.emoji}</span>
            ) : (
              <ThumbsUp className={`w-5 h-5 ${liked ? 'text-blue-500 fill-blue-500' : isDark ? 'text-gray-400' : 'text-gray-500'}`} />
            )}
            <span className={`text-sm font-medium ${
              liked ? 'text-blue-500' : isDark ? 'text-gray-400' : 'text-gray-500'
            }`}>
              {selectedReaction?.name || 'Like'}
            </span>
          </button>
          
          {/* Reactions Popup */}
          <AnimatePresence>
            {showReactions && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.9 }}
                className={`absolute bottom-full left-0 mb-2 flex gap-1 p-2 rounded-full shadow-xl ${
                  isDark ? 'bg-[#3a3b3c]' : 'bg-white'
                }`}
                onMouseEnter={() => setShowReactions(true)}
                onMouseLeave={() => setShowReactions(false)}
              >
                {reactions.map((reaction) => (
                  <button
                    key={reaction.name}
                    onClick={() => handleReaction(reaction)}
                    className="text-2xl hover:scale-125 transition-transform p-1"
                  >
                    {reaction.emoji}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        {/* Comment Button */}
        <button
          onClick={() => onComment?.(post)}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg ${
            isDark ? 'hover:bg-[#3a3b3c]' : 'hover:bg-gray-100'
          } transition-colors`}
        >
          <MessageSquare className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
          <span className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            Comment
          </span>
        </button>
        
        {/* Share Button */}
        <button
          onClick={() => onShare?.(post)}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg ${
            isDark ? 'hover:bg-[#3a3b3c]' : 'hover:bg-gray-100'
          } transition-colors`}
        >
          <Share className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
          <span className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            Share
          </span>
        </button>
      </div>
      
      {/* Post Menu Dropdown */}
      <AnimatePresence>
        {showMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`absolute right-3 top-14 w-72 rounded-xl shadow-xl overflow-hidden z-10 ${
              isDark ? 'bg-[#3a3b3c]' : 'bg-white'
            }`}
          >
            {[
              { icon: Bookmark, label: saved ? 'Unsave post' : 'Save post', action: () => { setSaved(!saved); setShowMenu(false); } },
              { icon: Bell, label: 'Turn on notifications', action: () => setShowMenu(false) },
              { icon: Eye, label: 'Hide post', action: () => { onHide?.(post.id); setShowMenu(false); } },
              { icon: Clock, label: 'Snooze for 30 days', action: () => setShowMenu(false) },
              { icon: Flag, label: 'Report post', action: () => { onReport?.(post.id); setShowMenu(false); } },
            ].map((item, i) => (
              <button
                key={i}
                onClick={item.action}
                className={`w-full flex items-center gap-3 px-4 py-3 ${
                  isDark ? 'hover:bg-[#4a4b4c] text-gray-200' : 'hover:bg-gray-100 text-gray-700'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </article>
  );
}

// Side Menu (Facebook Hamburger Menu)
function SideMenu({ isOpen, onClose, user, isDark, onNavigate }) {
  const menuItems = [
    { icon: User, label: 'Profile', path: '/profile', color: 'text-blue-500' },
    { icon: Users, label: 'Friends', path: '/friends', color: 'text-cyan-500' },
    { icon: Clock, label: 'Memories', path: '/memories', color: 'text-purple-500' },
    { icon: Bookmark, label: 'Saved', path: '/saved', color: 'text-pink-500' },
    { icon: Users, label: 'Groups', path: '/groups', color: 'text-blue-500' },
    { icon: Video, label: 'Video', path: '/watch', color: 'text-cyan-500' },
    { icon: ShoppingBag, label: 'Marketplace', path: '/marketplace', color: 'text-green-500' },
    { icon: Calendar, label: 'Events', path: '/events', color: 'text-red-500' },
    { icon: Gamepad2, label: 'Gaming', path: '/gaming', color: 'text-purple-500' },
    { icon: HeartIcon, label: 'Dating', path: '/dating', color: 'text-pink-500' },
    { icon: Newspaper, label: 'News', path: '/news', color: 'text-blue-500' },
    { icon: Flag, label: 'Pages', path: '/pages', color: 'text-orange-500' },
    { icon: Sparkles, label: 'AI Assistant', path: '/assistant', color: 'text-purple-500' },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-[60]"
            onClick={onClose}
          />
          
          {/* Menu Panel */}
          <motion.div
            initial={{ x: -320 }}
            animate={{ x: 0 }}
            exit={{ x: -320 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={`fixed left-0 top-0 bottom-0 w-80 z-[70] ${
              isDark ? 'bg-[#18191a]' : 'bg-gray-100'
            } shadow-2xl safe-area-left`}
          >
            {/* Header */}
            <div className={`p-4 border-b ${isDark ? 'border-[#3a3b3c]' : 'border-gray-200'} safe-area-top`}>
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold bg-gradient-to-r from-purple-500 to-cyan-400 bg-clip-text text-transparent">
                  Menu
                </h2>
                <button 
                  onClick={onClose}
                  className={`p-2 rounded-full ${isDark ? 'hover:bg-[#3a3b3c]' : 'hover:bg-gray-200'}`}
                >
                  <X className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                </button>
              </div>
              
              {/* User Profile */}
              <button 
                onClick={() => { onNavigate('/profile'); onClose(); }}
                className={`w-full mt-4 flex items-center gap-3 p-3 rounded-xl ${
                  isDark ? 'bg-[#242526] hover:bg-[#3a3b3c]' : 'bg-white hover:bg-gray-50'
                } shadow-sm`}
              >
                <Avatar className="w-12 h-12 ring-2 ring-purple-500/30">
                  <AvatarImage src={user?.avatar ? `${API_URL}${user.avatar}` : undefined} />
                  <AvatarFallback className="bg-gradient-to-br from-purple-500 to-cyan-400 text-white">
                    {user?.display_name?.[0] || user?.username?.[0] || '?'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 text-left">
                  <p className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {user?.display_name || user?.username}
                  </p>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    See your profile
                  </p>
                </div>
                <ChevronRight className={`w-5 h-5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
              </button>
            </div>
            
            {/* Menu Items */}
            <ScrollArea className="flex-1 h-[calc(100vh-200px)]">
              <div className="p-2 space-y-1">
                {menuItems.map((item, index) => (
                  <button
                    key={index}
                    onClick={() => { onNavigate(item.path); onClose(); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl ${
                      isDark ? 'hover:bg-[#3a3b3c]' : 'hover:bg-white'
                    } transition-colors`}
                  >
                    <div className={`w-9 h-9 rounded-full ${isDark ? 'bg-[#3a3b3c]' : 'bg-gray-200'} flex items-center justify-center`}>
                      <item.icon className={`w-5 h-5 ${item.color}`} />
                    </div>
                    <span className={`font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                      {item.label}
                    </span>
                  </button>
                ))}
              </div>
              
              {/* Divider */}
              <div className={`mx-4 my-2 border-t ${isDark ? 'border-[#3a3b3c]' : 'border-gray-200'}`} />
              
              {/* Settings & Help */}
              <div className="p-2">
                <button
                  onClick={() => { onNavigate('/settings'); onClose(); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl ${
                    isDark ? 'hover:bg-[#3a3b3c]' : 'hover:bg-white'
                  }`}
                >
                  <Settings className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                  <span className={`font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                    Settings & Privacy
                  </span>
                </button>
                
                <button
                  onClick={() => { onNavigate('/help'); onClose(); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl ${
                    isDark ? 'hover:bg-[#3a3b3c]' : 'hover:bg-white'
                  }`}
                >
                  <HelpCircle className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                  <span className={`font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                    Help & Support
                  </span>
                </button>
              </div>
            </ScrollArea>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Bottom Navigation (Facebook Style) - Fixed at bottom, doesn't scroll
function FacebookBottomNav({ activeTab, isDark, onTabChange, notificationCount = 0, messageCount = 0 }) {
  const tabs = [
    { id: 'home', icon: HomeIcon, label: 'Home', filled: true },
    { id: 'video', icon: PlayCircle, label: 'Video', badge: messageCount },
    { id: 'groups', icon: Users, label: 'Groups' },
    { id: 'dating', icon: HeartIcon, label: 'Dating' },
    { id: 'notifications', icon: Bell, label: 'Alerts', badge: notificationCount },
    { id: 'menu', icon: Menu, label: 'Menu' },
  ];
  
  return (
    <nav 
      className={`fixed bottom-0 left-0 right-0 z-[100] ${
        isDark ? 'bg-[#242526] border-[#3a3b3c]' : 'bg-white border-gray-200'
      } border-t`}
      style={{
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <div className="flex items-center justify-around py-2">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`relative flex flex-col items-center py-1.5 px-4 min-w-[60px] ${
                isActive 
                  ? 'text-purple-500' 
                  : isDark ? 'text-gray-400' : 'text-gray-500'
              }`}
              data-testid={`nav-${tab.id}`}
            >
              {/* Active Indicator Line */}
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-10 h-1 bg-gradient-to-r from-purple-500 to-cyan-400 rounded-full"
                />
              )}
              
              <div className="relative">
                <Icon className={`w-6 h-6 ${isActive ? 'stroke-[2.5]' : ''}`} />
                
                {/* Notification Badge */}
                {tab.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-[20px] h-[20px] bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center px-1 shadow-lg">
                    {tab.badge > 99 ? '99+' : tab.badge}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

// Export the Facebook-style Home Layout
export { 
  FacebookHeader, 
  StatusComposer, 
  StoriesSection, 
  PostCard, 
  SideMenu, 
  FacebookBottomNav 
};
