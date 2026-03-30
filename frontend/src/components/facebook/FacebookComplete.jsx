/**
 * Complete Facebook Clone Components for FaceConnect
 * All Facebook features replicated with FaceConnect purple/cyan theme
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  // Icons - Complete set
  Home, Search, Bell, MessageCircle, Menu, Plus, X, ChevronRight, ChevronDown, ChevronLeft,
  User, Users, Video, PlayCircle, ShoppingBag, Calendar, Gamepad2, Heart, Bookmark,
  Clock, Flag, Newspaper, Star, Gift, Zap, Radio, Tv, MapPin, Camera, Image as ImageIcon,
  Mic, Smile, ThumbsUp, MessageSquare, Share, Share2, MoreHorizontal, Globe, Lock, Eye,
  EyeOff, Settings, HelpCircle, Moon, Sun, LogOut, Edit, Trash2, Download, Upload,
  Link, Copy, QrCode, Wifi, WifiOff, Volume2, VolumeX, Phone, PhoneCall, VideoIcon,
  Send, Paperclip, AtSign, Hash, DollarSign, TrendingUp, BarChart2, PieChart,
  Activity, Award, Target, Briefcase, GraduationCap, Building, Store, Truck,
  Package, CreditCard, Wallet, Receipt, FileText, FolderOpen, Archive, Layers,
  Grid, List, Filter, SortAsc, SortDesc, RefreshCw, RotateCcw, Maximize, Minimize,
  ZoomIn, ZoomOut, Move, Crop, Palette, Type, Bold, Italic, Underline, AlignLeft,
  AlignCenter, AlignRight, CheckCircle, XCircle, AlertCircle, Info, AlertTriangle,
  Shield, Key, Fingerprint, Scan, CloudUpload, CloudDownload, Cloud, Database,
  Server, Code, Terminal, Bug, Cpu, HardDrive, Monitor, Smartphone, Tablet, Watch,
  Headphones, Speaker, Music, Film, Clapperboard, Sparkles, Wand2, Lightbulb,
  Rocket, Plane, Car, Bus, Train, Ship, Bike, Footprints, Coffee, Pizza, Utensils,
  Wine, Beer, IceCream, Cake, Cookie, Apple, Banana, Cherry, Grape, Carrot,
  Sunrise, Sunset, Sun as SunIcon, Moon as MoonIcon, Cloud as CloudIcon, CloudRain,
  CloudSnow, Wind, Umbrella, Thermometer, Droplet, Flame, Snowflake, Leaf, Tree,
  Flower, Mountain, Waves, Fish, Bird, Cat, Dog, Rabbit, PawPrint, Bug as BugIcon,
  Glasses, Shirt, Watch as WatchIcon, Crown, Diamond, Gem, Ring, Coins, Banknote,
  PiggyBank, LineChart, Percent, Calculator, Scale, Ruler, Compass, Map, Navigation,
  Crosshair, Target as TargetIcon, Flag as FlagIcon, Bookmark as BookmarkIcon,
  Tag, Tags, Folder, File, Files, Clipboard, ClipboardList, ClipboardCheck,
  CheckSquare, Square, Circle, Triangle, Hexagon, Octagon, Pentagon, Star as StarIcon,
  Heart as HeartIcon, Skull, Ghost, Alien, Bot, Smile as SmileIcon, Frown, Meh, Angry,
  Laugh, PartyPopper, Confetti, Balloon, Gift as GiftIcon, Box, Boxes, Truck as TruckIcon
} from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { useSettings } from "@/context/SettingsContext";
import { haptic } from "@/utils/mobile";

const API_URL = process.env.REACT_APP_BACKEND_URL;

// ==================== FACEBOOK REACTIONS ====================
const REACTIONS = [
  { id: 'like', emoji: '👍', label: 'Like', color: '#2078f4' },
  { id: 'love', emoji: '❤️', label: 'Love', color: '#f33e58' },
  { id: 'care', emoji: '🥰', label: 'Care', color: '#f7b125' },
  { id: 'haha', emoji: '😂', label: 'Haha', color: '#f7b125' },
  { id: 'wow', emoji: '😮', label: 'Wow', color: '#f7b125' },
  { id: 'sad', emoji: '😢', label: 'Sad', color: '#f7b125' },
  { id: 'angry', emoji: '😡', label: 'Angry', color: '#e9710f' },
];

// ==================== FULL SIDE MENU (ALL FACEBOOK SHORTCUTS) ====================
export const FACEBOOK_MENU_ITEMS = [
  // Main
  { id: 'profile', icon: User, label: 'Profile', path: '/profile', color: 'from-blue-500 to-blue-600' },
  { id: 'friends', icon: Users, label: 'Friends', path: '/friends', color: 'from-cyan-500 to-cyan-600', badge: 5 },
  { id: 'memories', icon: Clock, label: 'Memories', path: '/memories', color: 'from-purple-500 to-purple-600' },
  { id: 'saved', icon: Bookmark, label: 'Saved', path: '/saved', color: 'from-pink-500 to-pink-600' },
  { id: 'groups', icon: Users, label: 'Groups', path: '/groups', color: 'from-blue-500 to-blue-600' },
  { id: 'video', icon: PlayCircle, label: 'Video', path: '/watch', color: 'from-cyan-500 to-cyan-600' },
  { id: 'reels', icon: Film, label: 'Reels', path: '/reels', color: 'from-pink-500 to-red-500' },
  { id: 'marketplace', icon: Store, label: 'Marketplace', path: '/marketplace', color: 'from-green-500 to-green-600' },
  { id: 'feeds', icon: Newspaper, label: 'Feeds', path: '/feeds', color: 'from-blue-500 to-blue-600' },
  { id: 'events', icon: Calendar, label: 'Events', path: '/events', color: 'from-red-500 to-red-600' },
  // Social
  { id: 'dating', icon: Heart, label: 'Dating', path: '/dating', color: 'from-pink-500 to-pink-600' },
  { id: 'pages', icon: Flag, label: 'Pages', path: '/pages', color: 'from-orange-500 to-orange-600' },
  { id: 'gaming', icon: Gamepad2, label: 'Gaming', path: '/gaming', color: 'from-purple-500 to-purple-600' },
  { id: 'live', icon: Radio, label: 'Live Videos', path: '/live', color: 'from-red-500 to-red-600' },
  { id: 'watch-party', icon: Tv, label: 'Watch Party', path: '/watch-party', color: 'from-blue-500 to-blue-600' },
  // Services
  { id: 'fundraisers', icon: Heart, label: 'Fundraisers', path: '/fundraisers', color: 'from-teal-500 to-teal-600' },
  { id: 'blood-donations', icon: Droplet, label: 'Blood Donations', path: '/blood', color: 'from-red-500 to-red-600' },
  { id: 'crisis-response', icon: AlertTriangle, label: 'Crisis Response', path: '/crisis', color: 'from-orange-500 to-orange-600' },
  { id: 'weather', icon: CloudIcon, label: 'Weather', path: '/weather', color: 'from-sky-500 to-sky-600' },
  { id: 'jobs', icon: Briefcase, label: 'Jobs', path: '/jobs', color: 'from-blue-500 to-blue-600' },
  // Entertainment
  { id: 'music', icon: Music, label: 'Music', path: '/music', color: 'from-green-500 to-green-600' },
  { id: 'movies', icon: Clapperboard, label: 'Movies & TV', path: '/movies', color: 'from-purple-500 to-purple-600' },
  { id: 'sports', icon: Activity, label: 'Sports', path: '/sports', color: 'from-green-500 to-green-600' },
  // AI Features
  { id: 'ai-assistant', icon: Sparkles, label: 'AI Assistant', path: '/assistant', color: 'from-purple-500 to-cyan-500' },
  { id: 'ai-avatar', icon: Wand2, label: 'AI Avatars', path: '/ai-avatars', color: 'from-pink-500 to-purple-500' },
  // Professional
  { id: 'professional', icon: Briefcase, label: 'Professional Mode', path: '/professional', color: 'from-blue-600 to-blue-700' },
  { id: 'ads-manager', icon: BarChart2, label: 'Ads Manager', path: '/ads', color: 'from-blue-500 to-blue-600' },
  { id: 'creator-studio', icon: Video, label: 'Creator Studio', path: '/creator', color: 'from-purple-500 to-purple-600' },
  // Utilities
  { id: 'activity-log', icon: FileText, label: 'Activity Log', path: '/activity-log', color: 'from-gray-500 to-gray-600' },
  { id: 'support-inbox', icon: HelpCircle, label: 'Support Inbox', path: '/support', color: 'from-blue-500 to-blue-600' },
  { id: 'recent-ad-activity', icon: Eye, label: 'Recent Ad Activity', path: '/ad-activity', color: 'from-gray-500 to-gray-600' },
];

// ==================== COMPLETE FACEBOOK HEADER ====================
export function FacebookCompleteHeader({ 
  user, 
  isDark, 
  onMenuClick, 
  onSearchClick, 
  onMessengerClick, 
  onNotificationsClick,
  onCreateClick,
  notificationCount = 0, 
  messageCount = 0,
  friendRequestCount = 0 
}) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  return (
    <>
      <header 
        className={`sticky top-0 z-[60] ${isDark ? 'bg-[#242526]' : 'bg-white'} border-b ${isDark ? 'border-[#3a3b3c]' : 'border-gray-200'}`}
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <div className="flex items-center justify-between px-3 py-2 h-14">
          {/* Left: Logo */}
          <div className="flex items-center gap-2">
            <button 
              onClick={onMenuClick}
              className={`p-2 rounded-full lg:hidden ${isDark ? 'hover:bg-[#3a3b3c]' : 'hover:bg-gray-100'}`}
            >
              <Menu className={`w-6 h-6 ${isDark ? 'text-gray-200' : 'text-gray-700'}`} />
            </button>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-500 to-cyan-400 bg-clip-text text-transparent italic">
              FaceConnect
            </h1>
          </div>
          
          {/* Center: Search (Desktop) */}
          <div className="hidden md:flex flex-1 max-w-md mx-4">
            <div className={`flex items-center gap-2 w-full px-4 py-2 rounded-full ${
              isDark ? 'bg-[#3a3b3c]' : 'bg-gray-100'
            }`}>
              <Search className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
              <input
                type="text"
                placeholder="Search FaceConnect"
                className={`flex-1 bg-transparent outline-none ${isDark ? 'text-white placeholder-gray-400' : 'text-gray-900 placeholder-gray-500'}`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
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
            
            {/* Search (Mobile) */}
            <button 
              onClick={onSearchClick}
              className={`p-2.5 rounded-full md:hidden ${isDark ? 'bg-[#3a3b3c] hover:bg-[#4a4b4c]' : 'bg-gray-100 hover:bg-gray-200'}`}
            >
              <Search className={`w-5 h-5 ${isDark ? 'text-gray-200' : 'text-gray-700'}`} />
            </button>
            
            {/* Messenger */}
            <button 
              onClick={onMessengerClick}
              className={`relative p-2.5 rounded-full ${isDark ? 'bg-[#3a3b3c] hover:bg-[#4a4b4c]' : 'bg-gray-100 hover:bg-gray-200'}`}
            >
              <MessageCircle className={`w-5 h-5 ${isDark ? 'text-gray-200' : 'text-gray-700'}`} />
              {messageCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {messageCount > 9 ? '9+' : messageCount}
                </span>
              )}
            </button>
            
            {/* Notifications */}
            <button 
              onClick={onNotificationsClick}
              className={`relative p-2.5 rounded-full ${isDark ? 'bg-[#3a3b3c] hover:bg-[#4a4b4c]' : 'bg-gray-100 hover:bg-gray-200'}`}
            >
              <Bell className={`w-5 h-5 ${isDark ? 'text-gray-200' : 'text-gray-700'}`} />
              {notificationCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {notificationCount > 9 ? '9+' : notificationCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>
    </>
  );
}

// ==================== COMPLETE CREATE POST MODAL ====================
export function CreatePostModal({ isOpen, onClose, user, isDark, token, onPostCreated }) {
  const [content, setContent] = useState('');
  const [feeling, setFeeling] = useState(null);
  const [location, setLocation] = useState('');
  const [taggedPeople, setTaggedPeople] = useState([]);
  const [privacy, setPrivacy] = useState('public');
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('text');
  const fileInputRef = useRef(null);

  const FEELINGS = [
    { emoji: '😊', label: 'happy' },
    { emoji: '🥰', label: 'loved' },
    { emoji: '😢', label: 'sad' },
    { emoji: '😤', label: 'angry' },
    { emoji: '🤔', label: 'thoughtful' },
    { emoji: '😴', label: 'tired' },
    { emoji: '🎉', label: 'celebrating' },
    { emoji: '🙏', label: 'blessed' },
    { emoji: '💪', label: 'motivated' },
    { emoji: '😎', label: 'cool' },
    { emoji: '🤩', label: 'excited' },
    { emoji: '😋', label: 'hungry' },
  ];

  const POST_OPTIONS = [
    { id: 'photo', icon: ImageIcon, label: 'Photo/Video', color: 'text-green-500' },
    { id: 'tag', icon: User, label: 'Tag People', color: 'text-blue-500' },
    { id: 'feeling', icon: SmileIcon, label: 'Feeling/Activity', color: 'text-yellow-500' },
    { id: 'checkin', icon: MapPin, label: 'Check In', color: 'text-red-500' },
    { id: 'live', icon: Radio, label: 'Live Video', color: 'text-red-500' },
    { id: 'gif', icon: Gift, label: 'GIF', color: 'text-purple-500' },
    { id: 'poll', icon: BarChart2, label: 'Poll', color: 'text-cyan-500' },
    { id: 'event', icon: Calendar, label: 'Life Event', color: 'text-teal-500' },
  ];

  const handleSubmit = async () => {
    if (!content.trim() && media.length === 0) {
      toast.error('Please add some content');
      return;
    }

    setLoading(true);
    haptic.medium();

    try {
      const formData = new FormData();
      formData.append('content', content);
      formData.append('privacy', privacy);
      if (feeling) formData.append('feeling', JSON.stringify(feeling));
      if (location) formData.append('location', location);
      if (taggedPeople.length > 0) formData.append('tagged_people', JSON.stringify(taggedPeople));
      media.forEach((file, i) => formData.append(`media_${i}`, file));

      const response = await fetch(`${API_URL}/api/posts?token=${token}`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        toast.success('Post created!');
        haptic.success();
        onPostCreated?.();
        onClose();
        setContent('');
        setMedia([]);
        setFeeling(null);
        setLocation('');
      } else {
        toast.error('Failed to create post');
      }
    } catch (error) {
      console.error('Post error:', error);
      toast.error('Failed to create post');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className={`w-full max-w-lg rounded-xl overflow-hidden shadow-2xl ${
            isDark ? 'bg-[#242526]' : 'bg-white'
          }`}
        >
          {/* Header */}
          <div className={`flex items-center justify-between p-4 border-b ${isDark ? 'border-[#3a3b3c]' : 'border-gray-200'}`}>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10">
              <X className={`w-5 h-5 ${isDark ? 'text-gray-300' : 'text-gray-600'}`} />
            </button>
            <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Create Post
            </h2>
            <Button
              onClick={handleSubmit}
              disabled={loading || (!content.trim() && media.length === 0)}
              className="bg-gradient-to-r from-purple-600 to-cyan-500 text-white px-4"
            >
              {loading ? 'Posting...' : 'Post'}
            </Button>
          </div>

          {/* User Info */}
          <div className="flex items-center gap-3 p-4">
            <Avatar className="w-12 h-12 ring-2 ring-purple-500/30">
              <AvatarImage src={user?.avatar ? `${API_URL}${user.avatar}` : undefined} />
              <AvatarFallback className="bg-gradient-to-br from-purple-500 to-cyan-400 text-white">
                {user?.display_name?.[0] || user?.username?.[0] || '?'}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {user?.display_name || user?.username}
                {feeling && (
                  <span className="font-normal text-gray-400">
                    {' '}is feeling {feeling.emoji} {feeling.label}
                  </span>
                )}
              </p>
              <button className={`flex items-center gap-1 text-xs px-2 py-1 rounded ${
                isDark ? 'bg-[#3a3b3c] text-gray-300' : 'bg-gray-100 text-gray-600'
              }`}>
                <Globe className="w-3 h-3" />
                {privacy === 'public' ? 'Public' : privacy === 'friends' ? 'Friends' : 'Only Me'}
                <ChevronDown className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="px-4">
            <Textarea
              placeholder={`What's on your mind, ${user?.display_name?.split(' ')[0] || user?.username}?`}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className={`w-full min-h-[120px] border-0 resize-none text-lg ${
                isDark ? 'bg-transparent text-white placeholder-gray-400' : 'bg-transparent text-gray-900 placeholder-gray-500'
              }`}
            />

            {/* Media Preview */}
            {media.length > 0 && (
              <div className="grid grid-cols-2 gap-2 mb-4">
                {media.map((file, i) => (
                  <div key={i} className="relative aspect-square rounded-lg overflow-hidden">
                    <img
                      src={URL.createObjectURL(file)}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={() => setMedia(media.filter((_, idx) => idx !== i))}
                      className="absolute top-2 right-2 p-1 bg-black/50 rounded-full"
                    >
                      <X className="w-4 h-4 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Feelings Selector */}
            {activeTab === 'feeling' && (
              <div className="grid grid-cols-4 gap-2 mb-4">
                {FEELINGS.map((f) => (
                  <button
                    key={f.label}
                    onClick={() => setFeeling(feeling?.label === f.label ? null : f)}
                    className={`flex items-center gap-2 p-2 rounded-lg ${
                      feeling?.label === f.label
                        ? 'bg-purple-500/20 border border-purple-500'
                        : isDark ? 'bg-[#3a3b3c]' : 'bg-gray-100'
                    }`}
                  >
                    <span className="text-xl">{f.emoji}</span>
                    <span className={`text-xs ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{f.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Add to Post */}
          <div className={`m-4 p-3 rounded-xl border ${isDark ? 'border-[#3a3b3c]' : 'border-gray-200'}`}>
            <div className="flex items-center justify-between">
              <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Add to your post
              </span>
              <div className="flex items-center gap-1">
                {POST_OPTIONS.slice(0, 5).map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => {
                      if (opt.id === 'photo') fileInputRef.current?.click();
                      else if (opt.id === 'feeling') setActiveTab(activeTab === 'feeling' ? 'text' : 'feeling');
                    }}
                    className={`p-2 rounded-full hover:bg-white/10`}
                  >
                    <opt.icon className={`w-5 h-5 ${opt.color}`} />
                  </button>
                ))}
              </div>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            className="hidden"
            onChange={(e) => setMedia([...media, ...Array.from(e.target.files || [])])}
          />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ==================== COMPLETE COMMENTS SECTION ====================
export function CommentsSection({ postId, isDark, token, user, commentsCount = 0 }) {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const inputRef = useRef(null);

  const fetchComments = async () => {
    try {
      const response = await fetch(`${API_URL}/api/posts/${postId}/comments?token=${token}`);
      if (response.ok) {
        const data = await response.json();
        setComments(data.comments || []);
      }
    } catch (error) {
      console.error('Failed to fetch comments:', error);
    }
  };

  const handleSubmit = async () => {
    if (!newComment.trim()) return;

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/posts/${postId}/comments?token=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newComment }),
      });

      if (response.ok) {
        const data = await response.json();
        setComments([...comments, data.comment]);
        setNewComment('');
        haptic.light();
      }
    } catch (error) {
      toast.error('Failed to post comment');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (expanded) fetchComments();
  }, [expanded]);

  return (
    <div className={`px-3 pb-3 ${isDark ? 'bg-[#242526]' : 'bg-white'}`}>
      {/* Comment Input */}
      <div className="flex items-center gap-2 mt-2">
        <Avatar className="w-8 h-8">
          <AvatarImage src={user?.avatar ? `${API_URL}${user.avatar}` : undefined} />
          <AvatarFallback className="bg-gradient-to-br from-purple-500 to-cyan-400 text-white text-xs">
            {user?.display_name?.[0] || '?'}
          </AvatarFallback>
        </Avatar>
        <div className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-full ${
          isDark ? 'bg-[#3a3b3c]' : 'bg-gray-100'
        }`}>
          <input
            ref={inputRef}
            type="text"
            placeholder="Write a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
            className={`flex-1 bg-transparent outline-none text-sm ${
              isDark ? 'text-white placeholder-gray-400' : 'text-gray-900 placeholder-gray-500'
            }`}
          />
          <button className="p-1"><SmileIcon className="w-4 h-4 text-gray-400" /></button>
          <button className="p-1"><Camera className="w-4 h-4 text-gray-400" /></button>
          <button className="p-1"><Gift className="w-4 h-4 text-gray-400" /></button>
          {newComment.trim() && (
            <button onClick={handleSubmit} disabled={loading}>
              <Send className="w-4 h-4 text-purple-500" />
            </button>
          )}
        </div>
      </div>

      {/* View Comments Link */}
      {commentsCount > 0 && !expanded && (
        <button
          onClick={() => setExpanded(true)}
          className={`text-sm mt-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}
        >
          View all {commentsCount} comments
        </button>
      )}

      {/* Comments List */}
      {expanded && (
        <div className="mt-3 space-y-3">
          {comments.map((comment) => (
            <div key={comment.id} className="flex gap-2">
              <Avatar className="w-8 h-8">
                <AvatarImage src={comment.avatar ? `${API_URL}${comment.avatar}` : undefined} />
                <AvatarFallback className="bg-gradient-to-br from-purple-500 to-cyan-400 text-white text-xs">
                  {comment.username?.[0] || '?'}
                </AvatarFallback>
              </Avatar>
              <div className={`flex-1 px-3 py-2 rounded-2xl ${isDark ? 'bg-[#3a3b3c]' : 'bg-gray-100'}`}>
                <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {comment.display_name || comment.username}
                </p>
                <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  {comment.content}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ==================== SHARE MODAL ====================
export function SharePostModal({ isOpen, onClose, post, isDark, user }) {
  const SHARE_OPTIONS = [
    { id: 'share-now', icon: Share2, label: 'Share Now', description: 'Instantly share to your timeline' },
    { id: 'share-feed', icon: Newspaper, label: 'Share to Feed', description: 'Write something about this' },
    { id: 'share-story', icon: Plus, label: 'Share to Story', description: 'Add to your story' },
    { id: 'send-message', icon: Send, label: 'Send in Messenger', description: 'Share with friends' },
    { id: 'share-group', icon: Users, label: 'Share to a Group', description: 'Share in a group' },
    { id: 'share-page', icon: Flag, label: 'Share on a Page', description: 'Share on a page you manage' },
    { id: 'copy-link', icon: Link, label: 'Copy Link', description: 'Copy link to clipboard' },
    { id: 'more-options', icon: MoreHorizontal, label: 'More Options', description: 'WhatsApp, Twitter, etc.' },
  ];

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ y: 300 }}
          animate={{ y: 0 }}
          exit={{ y: 300 }}
          className={`w-full max-w-lg rounded-t-3xl overflow-hidden shadow-2xl ${
            isDark ? 'bg-[#242526]' : 'bg-white'
          }`}
        >
          {/* Handle */}
          <div className="flex justify-center py-3">
            <div className={`w-10 h-1 rounded-full ${isDark ? 'bg-gray-600' : 'bg-gray-300'}`} />
          </div>

          {/* Header */}
          <div className={`px-4 pb-3 border-b ${isDark ? 'border-[#3a3b3c]' : 'border-gray-200'}`}>
            <h3 className={`text-lg font-semibold text-center ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Share
            </h3>
          </div>

          {/* Share Options */}
          <div className="p-4 space-y-2 max-h-[60vh] overflow-y-auto">
            {SHARE_OPTIONS.map((option) => (
              <button
                key={option.id}
                onClick={() => {
                  if (option.id === 'copy-link') {
                    navigator.clipboard.writeText(`${window.location.origin}/post/${post?.id}`);
                    toast.success('Link copied!');
                  }
                  haptic.light();
                  onClose();
                }}
                className={`w-full flex items-center gap-4 p-3 rounded-xl ${
                  isDark ? 'hover:bg-[#3a3b3c]' : 'hover:bg-gray-100'
                } transition-colors`}
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  isDark ? 'bg-[#3a3b3c]' : 'bg-gray-100'
                }`}>
                  <option.icon className={`w-6 h-6 ${isDark ? 'text-gray-200' : 'text-gray-700'}`} />
                </div>
                <div className="flex-1 text-left">
                  <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {option.label}
                  </p>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {option.description}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ==================== COMPLETE NOTIFICATIONS PANEL ====================
export function NotificationsPanel({ isOpen, onClose, isDark, notifications = [] }) {
  const SAMPLE_NOTIFICATIONS = [
    { id: 1, type: 'like', user: 'Mario Rossi', content: 'liked your post', time: '2m', avatar: null, read: false },
    { id: 2, type: 'comment', user: 'Anna Bianchi', content: 'commented on your photo', time: '15m', avatar: null, read: false },
    { id: 3, type: 'friend', user: 'Luca Verdi', content: 'accepted your friend request', time: '1h', avatar: null, read: true },
    { id: 4, type: 'mention', user: 'Sofia Neri', content: 'mentioned you in a comment', time: '2h', avatar: null, read: true },
    { id: 5, type: 'birthday', user: 'Marco Gialli', content: 'has a birthday today!', time: 'Today', avatar: null, read: true },
    { id: 6, type: 'memory', user: 'Memories', content: 'You have memories to look back on today', time: 'Today', avatar: null, read: true },
    { id: 7, type: 'live', user: 'Giulia Blu', content: 'started a live video', time: '3h', avatar: null, read: true },
    { id: 8, type: 'group', user: 'Tech Italia', content: 'New post in your group', time: '5h', avatar: null, read: true },
  ];

  const allNotifications = notifications.length > 0 ? notifications : SAMPLE_NOTIFICATIONS;

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0, x: 300 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 300 }}
      className={`fixed right-0 top-0 bottom-0 w-full max-w-md z-[80] ${
        isDark ? 'bg-[#18191a]' : 'bg-gray-50'
      } shadow-2xl`}
    >
      {/* Header */}
      <div className={`flex items-center justify-between p-4 border-b ${
        isDark ? 'border-[#3a3b3c]' : 'border-gray-200'
      }`} style={{ paddingTop: 'calc(env(safe-area-inset-top) + 16px)' }}>
        <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Notifications
        </h2>
        <button
          onClick={onClose}
          className={`p-2 rounded-full ${isDark ? 'hover:bg-[#3a3b3c]' : 'hover:bg-gray-200'}`}
        >
          <X className={`w-5 h-5 ${isDark ? 'text-gray-300' : 'text-gray-600'}`} />
        </button>
      </div>

      {/* Notifications List */}
      <ScrollArea className="flex-1 h-[calc(100vh-80px)]">
        <div className="p-2">
          {/* New */}
          <div className="mb-4">
            <h3 className={`text-sm font-semibold px-3 py-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              New
            </h3>
            {allNotifications.filter(n => !n.read).map((notif) => (
              <NotificationItem key={notif.id} notification={notif} isDark={isDark} />
            ))}
          </div>

          {/* Earlier */}
          <div>
            <h3 className={`text-sm font-semibold px-3 py-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Earlier
            </h3>
            {allNotifications.filter(n => n.read).map((notif) => (
              <NotificationItem key={notif.id} notification={notif} isDark={isDark} />
            ))}
          </div>
        </div>
      </ScrollArea>
    </motion.div>
  );
}

function NotificationItem({ notification, isDark }) {
  const getIcon = () => {
    switch (notification.type) {
      case 'like': return <ThumbsUp className="w-4 h-4 text-blue-500" />;
      case 'comment': return <MessageSquare className="w-4 h-4 text-green-500" />;
      case 'friend': return <Users className="w-4 h-4 text-cyan-500" />;
      case 'mention': return <AtSign className="w-4 h-4 text-purple-500" />;
      case 'birthday': return <Cake className="w-4 h-4 text-pink-500" />;
      case 'memory': return <Clock className="w-4 h-4 text-blue-500" />;
      case 'live': return <Radio className="w-4 h-4 text-red-500" />;
      case 'group': return <Users className="w-4 h-4 text-blue-500" />;
      default: return <Bell className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <button className={`w-full flex items-start gap-3 p-3 rounded-xl ${
      notification.read 
        ? isDark ? 'hover:bg-[#242526]' : 'hover:bg-white'
        : isDark ? 'bg-[#242526] hover:bg-[#3a3b3c]' : 'bg-white hover:bg-gray-50'
    } transition-colors`}>
      <div className="relative">
        <Avatar className="w-14 h-14">
          <AvatarImage src={notification.avatar} />
          <AvatarFallback className="bg-gradient-to-br from-purple-500 to-cyan-400 text-white">
            {notification.user?.[0] || '?'}
          </AvatarFallback>
        </Avatar>
        <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center ${
          isDark ? 'bg-[#242526]' : 'bg-white'
        }`}>
          {getIcon()}
        </div>
      </div>
      <div className="flex-1 text-left">
        <p className={`text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
          <span className="font-semibold">{notification.user}</span> {notification.content}
        </p>
        <p className={`text-xs ${notification.read ? 'text-gray-500' : 'text-purple-500'}`}>
          {notification.time}
        </p>
      </div>
      {!notification.read && (
        <div className="w-3 h-3 rounded-full bg-purple-500" />
      )}
    </button>
  );
}

// ==================== FACEBOOK NEWS FEED POST ====================
export function FacebookPost({ post, isDark, token, user, onLike, onComment, onShare }) {
  const [liked, setLiked] = useState(post.liked_by_user || false);
  const [likesCount, setLikesCount] = useState(post.likes_count || 0);
  const [showReactions, setShowReactions] = useState(false);
  const [selectedReaction, setSelectedReaction] = useState(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showComments, setShowComments] = useState(false);

  const handleReaction = async (reaction) => {
    haptic.light();
    const prevLiked = liked;
    const prevReaction = selectedReaction;
    
    setSelectedReaction(reaction);
    setLiked(true);
    setLikesCount(prev => prevLiked ? prev : prev + 1);
    setShowReactions(false);
    
    try {
      await fetch(`${API_URL}/api/posts/${post.id}/react?token=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reaction: reaction.id }),
      });
    } catch (error) {
      setLiked(prevLiked);
      setSelectedReaction(prevReaction);
    }
  };

  const handleLike = () => {
    if (liked) {
      setLiked(false);
      setSelectedReaction(null);
      setLikesCount(prev => prev - 1);
    } else {
      handleReaction(REACTIONS[0]);
    }
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
    <article className={`${isDark ? 'bg-[#242526]' : 'bg-white'} rounded-xl shadow-sm overflow-hidden`}>
      {/* Post Header */}
      <div className="flex items-start justify-between p-3">
        <div className="flex items-center gap-3">
          <Avatar className="w-10 h-10 ring-2 ring-purple-500/20">
            <AvatarImage src={post.avatar ? `${API_URL}${post.avatar}` : undefined} />
            <AvatarFallback className="bg-gradient-to-br from-purple-500 to-cyan-400 text-white text-sm">
              {post.display_name?.[0] || post.username?.[0] || '?'}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-1">
              <span className={`font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                {post.display_name || post.username}
              </span>
              {post.feeling && (
                <span className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  is feeling {post.feeling.emoji} {post.feeling.label}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>
                {getTimeAgo(post.created_at)}
              </span>
              <span className={isDark ? 'text-gray-500' : 'text-gray-400'}>·</span>
              <Globe className={`w-3 h-3 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
            </div>
          </div>
        </div>
        <button className={`p-2 rounded-full ${isDark ? 'hover:bg-[#3a3b3c]' : 'hover:bg-gray-100'}`}>
          <MoreHorizontal className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
        </button>
      </div>

      {/* Post Content */}
      {post.content && (
        <div className="px-3 pb-3">
          <p className={`${isDark ? 'text-gray-100' : 'text-gray-900'} whitespace-pre-wrap`}>
            {post.content}
          </p>
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
          {post.comments_count > 0 && <span>{post.comments_count} comments</span>}
          {post.shares_count > 0 && <span>{post.shares_count} shares</span>}
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
              {selectedReaction?.label || 'Like'}
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
                {REACTIONS.map((reaction) => (
                  <button
                    key={reaction.id}
                    onClick={() => handleReaction(reaction)}
                    className="text-2xl hover:scale-125 transition-transform p-1"
                    title={reaction.label}
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
          onClick={() => setShowComments(!showComments)}
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
          onClick={() => setShowShareModal(true)}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg ${
            isDark ? 'hover:bg-[#3a3b3c]' : 'hover:bg-gray-100'
          } transition-colors`}
        >
          <Share2 className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
          <span className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            Share
          </span>
        </button>
      </div>

      {/* Comments Section */}
      {showComments && (
        <CommentsSection
          postId={post.id}
          isDark={isDark}
          token={token}
          user={user}
          commentsCount={post.comments_count}
        />
      )}

      {/* Share Modal */}
      <SharePostModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        post={post}
        isDark={isDark}
        user={user}
      />
    </article>
  );
}

// ==================== FACEBOOK STORIES ROW ====================
export function FacebookStoriesRow({ stories = [], user, isDark, onStoryClick, onCreateStory }) {
  const DEMO_STORIES = stories.length > 0 ? stories : [
    { id: '1', username: 'Maria', avatar: null, has_new: true },
    { id: '2', username: 'Giovanni', avatar: null, has_new: true },
    { id: '3', username: 'Anna', avatar: null, has_new: false },
    { id: '4', username: 'Marco', avatar: null, has_new: true },
    { id: '5', username: 'Sofia', avatar: null, has_new: false },
  ];

  return (
    <div className={`${isDark ? 'bg-[#242526]' : 'bg-white'} rounded-xl p-3`}>
      <ScrollArea className="w-full">
        <div className="flex gap-2">
          {/* Create Story */}
          <button
            onClick={onCreateStory}
            className="flex-shrink-0 w-28 relative"
            data-testid="create-story-btn"
          >
            <div className={`w-full aspect-[9/16] rounded-xl overflow-hidden ${isDark ? 'bg-[#3a3b3c]' : 'bg-gray-100'} relative`}>
              <div className="absolute inset-0 flex items-center justify-center">
                <Avatar className="w-16 h-16">
                  <AvatarImage src={user?.avatar ? `${API_URL}${user.avatar}` : undefined} />
                  <AvatarFallback className="bg-gradient-to-br from-purple-500 to-cyan-400 text-white text-xl">
                    {user?.display_name?.[0] || user?.username?.[0] || '?'}
                  </AvatarFallback>
                </Avatar>
              </div>
              <div className={`absolute bottom-0 left-0 right-0 h-1/3 ${isDark ? 'bg-[#242526]' : 'bg-white'} flex flex-col items-center justify-center pt-4`}>
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-600 to-cyan-500 flex items-center justify-center -mt-6 border-4 border-white dark:border-[#242526]">
                  <Plus className="w-5 h-5 text-white" />
                </div>
                <span className={`text-xs font-medium mt-1 ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>
                  Create Story
                </span>
              </div>
            </div>
          </button>

          {/* Stories */}
          {DEMO_STORIES.map((story, index) => (
            <button
              key={story.id}
              onClick={() => onStoryClick?.(index)}
              className="flex-shrink-0 w-28"
              data-testid={`story-${story.id}`}
            >
              <div className="w-full aspect-[9/16] rounded-xl overflow-hidden relative">
                <div className={`absolute inset-0 bg-gradient-to-br ${
                  ['from-pink-500 to-purple-600', 'from-cyan-500 to-blue-600', 'from-green-500 to-teal-600', 'from-orange-500 to-red-600', 'from-purple-500 to-indigo-600'][index % 5]
                }`} />
                <div className={`absolute top-2 left-2 w-10 h-10 rounded-full p-0.5 ${
                  story.has_new ? 'bg-gradient-to-br from-purple-500 to-cyan-400' : 'bg-gray-400'
                }`}>
                  <Avatar className="w-full h-full border-2 border-[#242526]">
                    <AvatarImage src={story.avatar ? `${API_URL}${story.avatar}` : undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-purple-500 to-cyan-400 text-white text-sm">
                      {story.username?.[0] || '?'}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <div className="absolute bottom-2 left-2 right-2">
                  <p className="text-white text-xs font-medium truncate drop-shadow-lg">
                    {story.username}
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

// ==================== COMPLETE SIDE MENU ====================
export function FacebookSideMenu({ isOpen, onClose, user, isDark, onNavigate }) {
  const navigate = useNavigate();

  const handleNav = (path) => {
    haptic.light();
    if (onNavigate) {
      onNavigate(path);
    } else {
      navigate(path);
    }
    onClose();
  };

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
            } shadow-2xl`}
            style={{ paddingTop: 'env(safe-area-inset-top)' }}
          >
            {/* Header */}
            <div className={`p-4 border-b ${isDark ? 'border-[#3a3b3c]' : 'border-gray-200'}`}>
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

              {/* User Profile Card */}
              <button
                onClick={() => handleNav('/profile')}
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
              <div className="p-2">
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {FACEBOOK_MENU_ITEMS.slice(0, 6).map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleNav(item.path)}
                      className={`flex flex-col items-start p-3 rounded-xl ${
                        isDark ? 'bg-[#242526] hover:bg-[#3a3b3c]' : 'bg-white hover:bg-gray-50'
                      } shadow-sm`}
                    >
                      <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${item.color} flex items-center justify-center mb-2`}>
                        <item.icon className="w-5 h-5 text-white" />
                      </div>
                      <span className={`text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                        {item.label}
                      </span>
                      {item.badge && (
                        <span className="absolute top-2 right-2 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                {/* More Menu Items */}
                <div className="space-y-1">
                  {FACEBOOK_MENU_ITEMS.slice(6).map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleNav(item.path)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl ${
                        isDark ? 'hover:bg-[#3a3b3c]' : 'hover:bg-white'
                      } transition-colors`}
                    >
                      <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${item.color} flex items-center justify-center`}>
                        <item.icon className="w-5 h-5 text-white" />
                      </div>
                      <span className={`font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                        {item.label}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Settings & Logout */}
                <div className={`mt-4 pt-4 border-t ${isDark ? 'border-[#3a3b3c]' : 'border-gray-200'}`}>
                  <button
                    onClick={() => handleNav('/settings')}
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
                    onClick={() => handleNav('/help')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl ${
                      isDark ? 'hover:bg-[#3a3b3c]' : 'hover:bg-white'
                    }`}
                  >
                    <HelpCircle className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                    <span className={`font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                      Help & Support
                    </span>
                  </button>
                  <button
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl ${
                      isDark ? 'hover:bg-[#3a3b3c]' : 'hover:bg-white'
                    }`}
                  >
                    <LogOut className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                    <span className={`font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                      Log Out
                    </span>
                  </button>
                </div>
              </div>
            </ScrollArea>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Export everything
export {
  REACTIONS,
  FACEBOOK_MENU_ITEMS,
};
