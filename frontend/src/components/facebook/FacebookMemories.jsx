/**
 * Facebook Memories Component for FaceConnect
 * "On This Day" feature showing past memories
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock, Calendar, ChevronLeft, ChevronRight, Heart, MessageCircle,
  Share2, X, Image as ImageIcon, Video, Bookmark, MoreHorizontal,
  Eye, EyeOff, Sparkles, Sun, Moon, Cloud, Star, Gift, Bell
} from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { haptic } from "@/utils/mobile";

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Sample Memories
const SAMPLE_MEMORIES = [
  {
    id: '1',
    type: 'post',
    year: 2023,
    yearsAgo: 2,
    date: 'January 15, 2023',
    content: 'Just landed in Paris! Can\'t believe I\'m finally here! 🗼✨',
    media: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800',
    mediaType: 'image',
    likes: 234,
    comments: 45,
    user: { name: 'You', avatar: null }
  },
  {
    id: '2',
    type: 'post',
    year: 2022,
    yearsAgo: 3,
    date: 'January 15, 2022',
    content: 'New year, new goals! Here\'s to an amazing 2022! 🎉',
    media: null,
    mediaType: null,
    likes: 156,
    comments: 23,
    user: { name: 'You', avatar: null }
  },
  {
    id: '3',
    type: 'friendship',
    year: 2021,
    yearsAgo: 4,
    date: 'January 15, 2021',
    content: null,
    friend: { name: 'Sarah Johnson', avatar: null },
    user: { name: 'You', avatar: null }
  },
  {
    id: '4',
    type: 'post',
    year: 2020,
    yearsAgo: 5,
    date: 'January 15, 2020',
    content: 'Throwback to the most amazing sunset I\'ve ever seen! 🌅',
    media: 'https://images.unsplash.com/photo-1507400492013-162706c8c05e?w=800',
    mediaType: 'image',
    likes: 567,
    comments: 89,
    user: { name: 'You', avatar: null }
  },
];

// Memory Card Component
function MemoryCard({ memory, isDark, onShare, onHide }) {
  const [liked, setLiked] = useState(false);
  const [hidden, setHidden] = useState(false);

  if (hidden) return null;

  const handleLike = () => {
    haptic.light();
    setLiked(!liked);
  };

  const handleHide = () => {
    haptic.medium();
    setHidden(true);
    onHide?.(memory.id);
    toast.success('Memory hidden');
  };

  const handleShare = () => {
    haptic.light();
    onShare?.(memory);
    toast.success('Shared to your timeline!');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={`${isDark ? 'bg-[#242526]' : 'bg-white'} rounded-xl overflow-hidden shadow-sm`}
    >
      {/* Header */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {memory.yearsAgo} {memory.yearsAgo === 1 ? 'year' : 'years'} ago
              </p>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                {memory.date}
              </p>
            </div>
          </div>
          <button
            onClick={handleHide}
            className={`p-2 rounded-full ${isDark ? 'hover:bg-[#3a3b3c]' : 'hover:bg-gray-100'}`}
          >
            <X className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
          </button>
        </div>

        {/* Friendship Anniversary */}
        {memory.type === 'friendship' && (
          <div className={`p-4 rounded-xl ${isDark ? 'bg-[#3a3b3c]' : 'bg-gradient-to-br from-purple-50 to-cyan-50'}`}>
            <div className="flex items-center justify-center gap-4">
              <Avatar className="w-16 h-16 ring-2 ring-purple-500/30">
                <AvatarFallback className="bg-gradient-to-br from-purple-500 to-cyan-400 text-white text-xl">
                  {memory.user.name[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col items-center">
                <Sparkles className="w-6 h-6 text-purple-500 mb-1" />
                <Heart className="w-4 h-4 text-pink-500" />
              </div>
              <Avatar className="w-16 h-16 ring-2 ring-purple-500/30">
                <AvatarFallback className="bg-gradient-to-br from-cyan-500 to-purple-400 text-white text-xl">
                  {memory.friend.name[0]}
                </AvatarFallback>
              </Avatar>
            </div>
            <p className={`text-center mt-4 font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              You and {memory.friend.name} became friends
            </p>
            <p className={`text-center text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              {memory.yearsAgo} years of friendship!
            </p>
          </div>
        )}

        {/* Post Memory */}
        {memory.type === 'post' && (
          <>
            {/* User Info */}
            <div className="flex items-center gap-3 mb-3">
              <Avatar className="w-10 h-10">
                <AvatarFallback className="bg-gradient-to-br from-purple-500 to-cyan-400 text-white">
                  {memory.user.name[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {memory.user.name}
                </p>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  {memory.date}
                </p>
              </div>
            </div>

            {/* Content */}
            {memory.content && (
              <p className={`mb-3 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                {memory.content}
              </p>
            )}

            {/* Media */}
            {memory.media && (
              <div className="-mx-4 mb-3">
                <img
                  src={memory.media}
                  alt="Memory"
                  className="w-full max-h-[300px] object-cover"
                />
              </div>
            )}

            {/* Stats */}
            <div className={`flex items-center justify-between text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              <div className="flex items-center gap-1">
                <div className="flex -space-x-1">
                  <span className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center text-[10px]">👍</span>
                  <span className="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center text-[10px]">❤️</span>
                </div>
                <span>{memory.likes}</span>
              </div>
              <span>{memory.comments} comments</span>
            </div>
          </>
        )}
      </div>

      {/* Actions */}
      <div className={`flex items-center justify-around py-2 border-t ${isDark ? 'border-[#3a3b3c]' : 'border-gray-100'}`}>
        <button
          onClick={handleLike}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
            isDark ? 'hover:bg-[#3a3b3c]' : 'hover:bg-gray-100'
          }`}
        >
          <Heart className={`w-5 h-5 ${liked ? 'text-pink-500 fill-pink-500' : isDark ? 'text-gray-400' : 'text-gray-500'}`} />
          <span className={`text-sm font-medium ${liked ? 'text-pink-500' : isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            Love
          </span>
        </button>
        <button
          onClick={handleShare}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
            isDark ? 'hover:bg-[#3a3b3c]' : 'hover:bg-gray-100'
          }`}
        >
          <Share2 className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
          <span className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            Share
          </span>
        </button>
      </div>
    </motion.div>
  );
}

// Main Memories Component
export default function FacebookMemories({ isDark }) {
  const { user } = useAuth();
  const [memories, setMemories] = useState(SAMPLE_MEMORIES);
  const [currentDate] = useState(new Date());

  const handleHide = (memoryId) => {
    setMemories(prev => prev.filter(m => m.id !== memoryId));
  };

  const handleShare = (memory) => {
    // In real app, would share to timeline
    console.log('Sharing memory:', memory);
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      month: 'long', 
      day: 'numeric' 
    });
  };

  return (
    <div className={`min-h-screen ${isDark ? 'bg-[#18191a]' : 'bg-gray-100'}`}>
      {/* Header */}
      <div className={`sticky top-0 z-40 ${isDark ? 'bg-[#242526]' : 'bg-white'} border-b ${isDark ? 'border-[#3a3b3c]' : 'border-gray-200'}`}>
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Memories
          </h1>
          <button className={`p-2 rounded-full ${isDark ? 'bg-[#3a3b3c]' : 'bg-gray-100'}`}>
            <MoreHorizontal className={`w-5 h-5 ${isDark ? 'text-gray-200' : 'text-gray-700'}`} />
          </button>
        </div>
      </div>

      <ScrollArea className="h-[calc(100vh-70px)]">
        <div className="p-4">
          {/* Today's Header */}
          <div className={`text-center mb-6 p-6 rounded-xl ${
            isDark 
              ? 'bg-gradient-to-br from-purple-900/50 to-cyan-900/50' 
              : 'bg-gradient-to-br from-purple-50 to-cyan-50'
          }`}>
            <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              On This Day
            </h2>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              {formatDate(currentDate)}
            </p>
          </div>

          {/* Memories List */}
          {memories.length > 0 ? (
            <div className="space-y-4">
              <AnimatePresence>
                {memories.map((memory) => (
                  <MemoryCard
                    key={memory.id}
                    memory={memory}
                    isDark={isDark}
                    onHide={handleHide}
                    onShare={handleShare}
                  />
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <div className="text-center py-12">
              <Clock className={`w-12 h-12 mx-auto mb-3 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
              <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>
                No memories from this day
              </p>
              <p className={`text-sm mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                Check back later for more memories!
              </p>
            </div>
          )}

          {/* Memory Preferences */}
          <div className={`mt-6 p-4 rounded-xl ${isDark ? 'bg-[#242526]' : 'bg-white'}`}>
            <h3 className={`font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Memory Preferences
            </h3>
            <div className="space-y-3">
              <button className={`w-full flex items-center justify-between p-3 rounded-lg ${
                isDark ? 'bg-[#3a3b3c]' : 'bg-gray-50'
              }`}>
                <div className="flex items-center gap-3">
                  <Bell className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                  <span className={isDark ? 'text-gray-200' : 'text-gray-700'}>
                    Notifications
                  </span>
                </div>
                <ChevronRight className={`w-5 h-5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
              </button>
              <button className={`w-full flex items-center justify-between p-3 rounded-lg ${
                isDark ? 'bg-[#3a3b3c]' : 'bg-gray-50'
              }`}>
                <div className="flex items-center gap-3">
                  <EyeOff className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                  <span className={isDark ? 'text-gray-200' : 'text-gray-700'}>
                    Hidden Memories
                  </span>
                </div>
                <ChevronRight className={`w-5 h-5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
              </button>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

export { MemoryCard };
