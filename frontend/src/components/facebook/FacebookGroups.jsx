/**
 * Facebook Groups Component for FaceConnect
 * Complete groups experience with discovery, posts, and management
 */
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Search, Plus, X, ChevronRight, ChevronDown, Users, Globe, Lock,
  Bell, BellOff, Settings, Shield, Star, MessageCircle, ThumbsUp,
  Share, MoreHorizontal, Image as ImageIcon, Video, Calendar,
  MapPin, Link, Clock, Eye, UserPlus, Check, Crown, Sparkles,
  Flame, TrendingUp, Hash, Heart, Bookmark, Flag
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

// Sample Groups Data
const SAMPLE_GROUPS = [
  {
    id: '1',
    name: 'FaceConnect Developers',
    cover: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800',
    icon: null,
    members: 45230,
    newPosts: 23,
    privacy: 'public',
    joined: true,
    description: 'A community for developers building on the FaceConnect platform. Share tips, get help, and connect with fellow devs!',
    rules: ['Be respectful', 'No spam', 'Stay on topic'],
    admins: [{ name: 'Admin User', avatar: null }],
    category: 'Technology',
    activity: 'Very Active',
    created: '2023-01-15'
  },
  {
    id: '2',
    name: 'Travel Photography',
    cover: 'https://images.unsplash.com/photo-1488085061387-422e29b40080?w=800',
    icon: null,
    members: 128500,
    newPosts: 156,
    privacy: 'public',
    joined: true,
    description: 'Share your travel photos from around the world! Tips, locations, and inspiration for wanderlust photographers.',
    rules: ['Original content only', 'Include location info', 'Constructive feedback'],
    admins: [{ name: 'Photo Admin', avatar: null }],
    category: 'Photography',
    activity: 'Very Active',
    created: '2022-06-20'
  },
  {
    id: '3',
    name: 'Fitness & Motivation',
    cover: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800',
    icon: null,
    members: 89000,
    newPosts: 45,
    privacy: 'public',
    joined: false,
    description: 'Your daily dose of fitness motivation. Workout tips, nutrition advice, and progress sharing.',
    rules: ['No selling supplements', 'Support each other', 'Science-based advice'],
    admins: [{ name: 'Fitness Coach', avatar: null }],
    category: 'Health & Fitness',
    activity: 'Active',
    created: '2023-03-10'
  },
  {
    id: '4',
    name: 'Crypto Trading Signals',
    cover: 'https://images.unsplash.com/photo-1518546305927-5a555bb7020d?w=800',
    icon: null,
    members: 34500,
    newPosts: 89,
    privacy: 'private',
    joined: false,
    description: 'Premium crypto trading signals and market analysis. Join to get exclusive insights.',
    rules: ['Not financial advice', 'No guaranteed returns claims', 'DYOR'],
    admins: [{ name: 'Crypto Analyst', avatar: null }],
    category: 'Finance',
    activity: 'Very Active',
    created: '2023-07-01'
  },
  {
    id: '5',
    name: 'Plant Parents',
    cover: 'https://images.unsplash.com/photo-1463320726281-696a485928c7?w=800',
    icon: null,
    members: 67800,
    newPosts: 32,
    privacy: 'public',
    joined: true,
    description: 'For everyone who loves houseplants! Share your collection, get care tips, and trade cuttings.',
    rules: ['No selling without approval', 'ID requests welcome', 'Be kind'],
    admins: [{ name: 'Plant Mom', avatar: null }],
    category: 'Hobbies',
    activity: 'Active',
    created: '2022-09-15'
  },
];

// Sample Group Posts
const SAMPLE_GROUP_POSTS = [
  {
    id: '1',
    groupId: '1',
    author: { name: 'John Developer', avatar: null, role: 'Admin' },
    content: 'Just shipped a new feature using the FaceConnect API! Check out the real-time notifications integration. Happy to answer any questions! 🚀',
    media: null,
    likes: 234,
    comments: 45,
    shares: 12,
    time: '2 hours ago',
    pinned: true
  },
  {
    id: '2',
    groupId: '1',
    author: { name: 'Sarah Coder', avatar: null, role: null },
    content: 'Has anyone figured out how to implement WebRTC video calls? Struggling with the signaling server setup.',
    media: null,
    likes: 56,
    comments: 23,
    shares: 3,
    time: '4 hours ago',
    pinned: false
  },
  {
    id: '3',
    groupId: '2',
    author: { name: 'Photo Enthusiast', avatar: null, role: 'Moderator' },
    content: 'Golden hour at Santorini! 📸 Shot on Sony A7IV with 24-70mm f/2.8',
    media: 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=800',
    likes: 1234,
    comments: 89,
    shares: 45,
    time: '6 hours ago',
    pinned: false
  },
];

// Group Card
function GroupCard({ group, isDark, onJoin, onClick }) {
  const formatMembers = (count) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count;
  };

  return (
    <motion.button
      onClick={() => onClick?.(group)}
      whileTap={{ scale: 0.98 }}
      className={`w-full rounded-xl overflow-hidden ${isDark ? 'bg-[#242526]' : 'bg-white'} shadow-sm`}
    >
      {/* Cover */}
      <div className="relative h-24">
        <img
          src={group.cover}
          alt={group.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        
        {/* Privacy Badge */}
        <div className={`absolute top-2 right-2 px-2 py-0.5 rounded text-xs font-medium flex items-center gap-1 ${
          group.privacy === 'private' ? 'bg-yellow-500/90 text-yellow-900' : 'bg-green-500/90 text-white'
        }`}>
          {group.privacy === 'private' ? <Lock className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
          {group.privacy === 'private' ? 'Private' : 'Public'}
        </div>
      </div>
      
      {/* Content */}
      <div className="p-3 text-left">
        <h3 className={`font-semibold truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
          {group.name}
        </h3>
        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          {formatMembers(group.members)} members · {group.newPosts} new posts
        </p>
        
        {/* Join Button or Joined Badge */}
        <div className="mt-3">
          {group.joined ? (
            <div className="flex items-center justify-between">
              <span className={`text-sm font-medium flex items-center gap-1 ${isDark ? 'text-green-400' : 'text-green-600'}`}>
                <Check className="w-4 h-4" />
                Joined
              </span>
              <button className={`p-1.5 rounded-full ${isDark ? 'hover:bg-[#3a3b3c]' : 'hover:bg-gray-100'}`}>
                <Bell className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
              </button>
            </div>
          ) : (
            <Button
              onClick={(e) => { e.stopPropagation(); onJoin?.(group.id); }}
              className="w-full bg-gradient-to-r from-purple-600 to-cyan-500 text-white text-sm"
              size="sm"
            >
              <UserPlus className="w-4 h-4 mr-1" />
              Join Group
            </Button>
          )}
        </div>
      </div>
    </motion.button>
  );
}

// Group Post Card
function GroupPostCard({ post, isDark, groupName }) {
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(post.likes);

  const handleLike = () => {
    haptic.light();
    setLiked(!liked);
    setLikesCount(prev => liked ? prev - 1 : prev + 1);
  };

  return (
    <div className={`${isDark ? 'bg-[#242526]' : 'bg-white'} rounded-xl p-4 mb-3`}>
      {/* Pinned Badge */}
      {post.pinned && (
        <div className="flex items-center gap-1 mb-3 text-purple-500">
          <Star className="w-4 h-4 fill-current" />
          <span className="text-sm font-medium">Pinned Post</span>
        </div>
      )}
      
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <Avatar className="w-10 h-10">
          <AvatarImage src={post.author.avatar} />
          <AvatarFallback className="bg-gradient-to-br from-purple-500 to-cyan-400 text-white">
            {post.author.name[0]}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {post.author.name}
            </span>
            {post.author.role && (
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                post.author.role === 'Admin' 
                  ? 'bg-purple-500/20 text-purple-500' 
                  : 'bg-blue-500/20 text-blue-500'
              }`}>
                {post.author.role}
              </span>
            )}
          </div>
          <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            {post.time}
          </p>
        </div>
        <button className={`p-2 rounded-full ${isDark ? 'hover:bg-[#3a3b3c]' : 'hover:bg-gray-100'}`}>
          <MoreHorizontal className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
        </button>
      </div>
      
      {/* Content */}
      <p className={`mb-3 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
        {post.content}
      </p>
      
      {/* Media */}
      {post.media && (
        <div className="mb-3 -mx-4">
          <img
            src={post.media}
            alt=""
            className="w-full max-h-[400px] object-cover"
          />
        </div>
      )}
      
      {/* Stats */}
      <div className={`flex items-center justify-between py-2 border-y ${isDark ? 'border-[#3a3b3c]' : 'border-gray-100'}`}>
        <div className="flex items-center gap-1">
          <div className="flex -space-x-1">
            <span className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-xs">👍</span>
            <span className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center text-xs">❤️</span>
          </div>
          <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            {likesCount}
          </span>
        </div>
        <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          {post.comments} comments · {post.shares} shares
        </div>
      </div>
      
      {/* Actions */}
      <div className="flex items-center justify-around pt-2">
        <button
          onClick={handleLike}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
            isDark ? 'hover:bg-[#3a3b3c]' : 'hover:bg-gray-100'
          }`}
        >
          <ThumbsUp className={`w-5 h-5 ${liked ? 'text-blue-500 fill-blue-500' : isDark ? 'text-gray-400' : 'text-gray-500'}`} />
          <span className={`text-sm font-medium ${liked ? 'text-blue-500' : isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            Like
          </span>
        </button>
        <button className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
          isDark ? 'hover:bg-[#3a3b3c]' : 'hover:bg-gray-100'
        }`}>
          <MessageCircle className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
          <span className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            Comment
          </span>
        </button>
        <button className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
          isDark ? 'hover:bg-[#3a3b3c]' : 'hover:bg-gray-100'
        }`}>
          <Share className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
          <span className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            Share
          </span>
        </button>
      </div>
    </div>
  );
}

// Group Detail View
function GroupDetailView({ group, isDark, onBack, onLeave }) {
  const posts = SAMPLE_GROUP_POSTS.filter(p => p.groupId === group.id);
  
  const formatMembers = (count) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count;
  };

  return (
    <div className={`min-h-screen ${isDark ? 'bg-[#18191a]' : 'bg-gray-100'}`}>
      {/* Cover */}
      <div className="relative h-48">
        <img
          src={group.cover}
          alt={group.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        
        {/* Back Button */}
        <button
          onClick={onBack}
          className="absolute top-4 left-4 p-2 rounded-full bg-black/50"
        >
          <X className="w-5 h-5 text-white" />
        </button>
        
        {/* Settings */}
        <button className="absolute top-4 right-4 p-2 rounded-full bg-black/50">
          <Settings className="w-5 h-5 text-white" />
        </button>
      </div>
      
      {/* Group Info */}
      <div className={`${isDark ? 'bg-[#242526]' : 'bg-white'} p-4 -mt-8 relative z-10 mx-4 rounded-xl shadow-lg`}>
        <h1 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
          {group.name}
        </h1>
        
        <div className="flex items-center gap-4 mt-2">
          <div className="flex items-center gap-1">
            {group.privacy === 'private' ? (
              <Lock className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
            ) : (
              <Globe className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
            )}
            <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              {group.privacy === 'private' ? 'Private' : 'Public'}
            </span>
          </div>
          <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            {formatMembers(group.members)} members
          </span>
          <span className={`text-sm ${isDark ? 'text-green-400' : 'text-green-600'}`}>
            {group.activity}
          </span>
        </div>
        
        <p className={`mt-3 text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
          {group.description}
        </p>
        
        {/* Action Buttons */}
        <div className="flex gap-2 mt-4">
          {group.joined ? (
            <>
              <Button className="flex-1 bg-gradient-to-r from-purple-600 to-cyan-500 text-white">
                <Plus className="w-4 h-4 mr-2" />
                Create Post
              </Button>
              <Button variant="outline" size="icon">
                <Bell className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="icon">
                <Share className="w-4 h-4" />
              </Button>
            </>
          ) : (
            <Button className="flex-1 bg-gradient-to-r from-purple-600 to-cyan-500 text-white">
              <UserPlus className="w-4 h-4 mr-2" />
              Join Group
            </Button>
          )}
        </div>
      </div>
      
      {/* Tabs */}
      <div className={`sticky top-0 z-30 ${isDark ? 'bg-[#242526]' : 'bg-white'} mt-4 border-b ${isDark ? 'border-[#3a3b3c]' : 'border-gray-200'}`}>
        <div className="flex px-4">
          {['Discussion', 'Featured', 'Members', 'Events', 'Files'].map((tab, i) => (
            <button
              key={tab}
              className={`px-4 py-3 text-sm font-medium border-b-2 ${
                i === 0
                  ? 'border-purple-500 text-purple-500'
                  : `border-transparent ${isDark ? 'text-gray-400' : 'text-gray-500'}`
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>
      
      {/* Posts */}
      <ScrollArea className="p-4">
        {/* Create Post Widget */}
        <div className={`${isDark ? 'bg-[#242526]' : 'bg-white'} rounded-xl p-4 mb-4`}>
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10">
              <AvatarFallback className="bg-gradient-to-br from-purple-500 to-cyan-400 text-white">
                U
              </AvatarFallback>
            </Avatar>
            <button className={`flex-1 text-left px-4 py-2.5 rounded-full ${
              isDark ? 'bg-[#3a3b3c] text-gray-400' : 'bg-gray-100 text-gray-500'
            }`}>
              Write something...
            </button>
          </div>
          <div className={`flex items-center justify-around mt-3 pt-3 border-t ${isDark ? 'border-[#3a3b3c]' : 'border-gray-200'}`}>
            <button className="flex items-center gap-2 text-sm">
              <ImageIcon className="w-5 h-5 text-green-500" />
              <span className={isDark ? 'text-gray-300' : 'text-gray-600'}>Photo</span>
            </button>
            <button className="flex items-center gap-2 text-sm">
              <Video className="w-5 h-5 text-red-500" />
              <span className={isDark ? 'text-gray-300' : 'text-gray-600'}>Video</span>
            </button>
            <button className="flex items-center gap-2 text-sm">
              <Calendar className="w-5 h-5 text-purple-500" />
              <span className={isDark ? 'text-gray-300' : 'text-gray-600'}>Event</span>
            </button>
          </div>
        </div>
        
        {/* Posts Feed */}
        {posts.length > 0 ? (
          posts.map(post => (
            <GroupPostCard
              key={post.id}
              post={post}
              isDark={isDark}
              groupName={group.name}
            />
          ))
        ) : (
          <div className="text-center py-12">
            <MessageCircle className={`w-12 h-12 mx-auto mb-3 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
            <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>
              No posts yet. Be the first to share!
            </p>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

// Main Groups Component
export default function FacebookGroups({ isDark }) {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('your');
  const [groups, setGroups] = useState(SAMPLE_GROUPS);
  const [selectedGroup, setSelectedGroup] = useState(null);

  const yourGroups = groups.filter(g => g.joined);
  const suggestedGroups = groups.filter(g => !g.joined);

  const handleJoinGroup = (groupId) => {
    haptic.medium();
    setGroups(prev => prev.map(g => 
      g.id === groupId ? { ...g, joined: true } : g
    ));
    toast.success('Joined group!');
  };

  const handleLeaveGroup = (groupId) => {
    setGroups(prev => prev.map(g => 
      g.id === groupId ? { ...g, joined: false } : g
    ));
    toast.success('Left group');
  };

  if (selectedGroup) {
    return (
      <GroupDetailView
        group={selectedGroup}
        isDark={isDark}
        onBack={() => setSelectedGroup(null)}
        onLeave={() => {
          handleLeaveGroup(selectedGroup.id);
          setSelectedGroup(null);
        }}
      />
    );
  }

  return (
    <div className={`min-h-screen ${isDark ? 'bg-[#18191a]' : 'bg-gray-100'}`}>
      {/* Header */}
      <div className={`sticky top-0 z-40 ${isDark ? 'bg-[#242526]' : 'bg-white'} border-b ${isDark ? 'border-[#3a3b3c]' : 'border-gray-200'}`}>
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Groups
          </h1>
          <div className="flex items-center gap-2">
            <button className={`p-2 rounded-full ${isDark ? 'bg-[#3a3b3c]' : 'bg-gray-100'}`}>
              <Search className={`w-5 h-5 ${isDark ? 'text-gray-200' : 'text-gray-700'}`} />
            </button>
            <button className={`p-2 rounded-full ${isDark ? 'bg-[#3a3b3c]' : 'bg-gray-100'}`}>
              <Plus className={`w-5 h-5 ${isDark ? 'text-gray-200' : 'text-gray-700'}`} />
            </button>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="flex px-4 gap-2 pb-3">
          {[
            { id: 'your', label: 'Your Groups' },
            { id: 'discover', label: 'Discover' },
            { id: 'feed', label: 'Feed' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-purple-600 to-cyan-500 text-white'
                  : isDark ? 'bg-[#3a3b3c] text-gray-200' : 'bg-gray-100 text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <ScrollArea className="h-[calc(100vh-140px)]">
        {activeTab === 'your' && (
          <div className="p-4">
            {/* Your Groups */}
            {yourGroups.length > 0 ? (
              <>
                <h2 className={`text-lg font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Groups you've joined
                </h2>
                <div className="grid grid-cols-2 gap-3">
                  {yourGroups.map((group) => (
                    <GroupCard
                      key={group.id}
                      group={group}
                      isDark={isDark}
                      onJoin={handleJoinGroup}
                      onClick={setSelectedGroup}
                    />
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <Users className={`w-12 h-12 mx-auto mb-3 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
                <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>
                  You haven't joined any groups yet
                </p>
                <Button
                  onClick={() => setActiveTab('discover')}
                  className="mt-4 bg-gradient-to-r from-purple-600 to-cyan-500 text-white"
                >
                  Discover Groups
                </Button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'discover' && (
          <div className="p-4">
            {/* Suggested Groups */}
            <h2 className={`text-lg font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Suggested for you
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {suggestedGroups.map((group) => (
                <GroupCard
                  key={group.id}
                  group={group}
                  isDark={isDark}
                  onJoin={handleJoinGroup}
                  onClick={setSelectedGroup}
                />
              ))}
            </div>
            
            {/* Categories */}
            <h2 className={`text-lg font-semibold mt-6 mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Browse by Category
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {['Technology', 'Photography', 'Health & Fitness', 'Finance', 'Hobbies', 'Gaming', 'Music', 'Art'].map((cat) => (
                <button
                  key={cat}
                  className={`p-4 rounded-xl text-left ${isDark ? 'bg-[#242526]' : 'bg-white'}`}
                >
                  <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {cat}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'feed' && (
          <div className="p-4">
            <h2 className={`text-lg font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Recent from your groups
            </h2>
            {SAMPLE_GROUP_POSTS.map(post => (
              <GroupPostCard
                key={post.id}
                post={post}
                isDark={isDark}
              />
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Create Group FAB */}
      <div className="fixed bottom-24 right-4 z-50">
        <Button className="rounded-full w-14 h-14 bg-gradient-to-r from-purple-600 to-cyan-500 shadow-lg">
          <Plus className="w-6 h-6 text-white" />
        </Button>
      </div>
    </div>
  );
}

export { GroupCard, GroupPostCard, GroupDetailView };
