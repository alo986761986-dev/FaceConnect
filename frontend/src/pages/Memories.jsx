import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Clock, Heart, MessageCircle, Share2, ChevronLeft,
  ChevronRight, Calendar, X, Sparkles
} from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import BottomNav from "@/components/BottomNav";

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function Memories() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [memories, setMemories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedMemory, setSelectedMemory] = useState(null);

  const fetchMemories = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/memories?date=${selectedDate.toISOString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMemories(data.memories || data || []);
      }
    } catch (err) {
      console.error("Failed to fetch memories:", err);
      setMemories(generateMockMemories());
    } finally {
      setLoading(false);
    }
  }, [token, selectedDate]);

  useEffect(() => {
    fetchMemories();
  }, [fetchMemories]);

  const generateMockMemories = () => {
    const years = [1, 2, 3, 4, 5];
    return years.map(yearsAgo => {
      const date = new Date();
      date.setFullYear(date.getFullYear() - yearsAgo);
      
      return {
        id: `memory-${yearsAgo}`,
        years_ago: yearsAgo,
        date: date.toISOString(),
        posts: Array.from({ length: Math.floor(Math.random() * 3) + 1 }, (_, i) => ({
          id: `post-${yearsAgo}-${i}`,
          content: [
            "What an amazing day! 🎉",
            "Throwback to this incredible moment ✨",
            "Good times with great people 💫",
            "Can't believe this was already so long ago!",
            "Life is beautiful 🌟"
          ][Math.floor(Math.random() * 5)],
          image: Math.random() > 0.3 ? `https://picsum.photos/600/600?random=${yearsAgo}${i}` : null,
          likes: Math.floor(Math.random() * 500) + 50,
          comments: Math.floor(Math.random() * 100) + 10,
          created_at: date.toISOString()
        }))
      };
    }).filter(m => m.posts.length > 0);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const goToPreviousDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 1);
    setSelectedDate(newDate);
  };

  const goToNextDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 1);
    if (newDate <= new Date()) {
      setSelectedDate(newDate);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[var(--bg-primary)]/95 backdrop-blur-lg border-b border-white/5">
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Memories</h1>
          <Button variant="ghost" size="icon" className="rounded-full">
            <Calendar className="w-5 h-5" />
          </Button>
        </div>

        {/* Date Navigator */}
        <div className="flex items-center justify-between px-4 pb-3">
          <button 
            onClick={goToPreviousDay}
            className="p-2 hover:bg-white/10 rounded-full"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="text-center">
            <p className="text-[var(--text-primary)] font-semibold">On This Day</p>
            <p className="text-sm text-[var(--text-muted)]">
              {selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
            </p>
          </div>
          <button 
            onClick={goToNextDay}
            className="p-2 hover:bg-white/10 rounded-full disabled:opacity-30"
            disabled={selectedDate.toDateString() === new Date().toDateString()}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="p-4">
        {loading ? (
          <div className="space-y-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-6 bg-white/10 rounded w-1/3 mb-4" />
                <div className="aspect-square bg-white/10 rounded-xl" />
              </div>
            ))}
          </div>
        ) : memories.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 mx-auto bg-white/5 rounded-full flex items-center justify-center mb-4">
              <Clock className="w-10 h-10 text-[var(--text-muted)]" />
            </div>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">No memories for this day</h2>
            <p className="text-[var(--text-muted)] mt-2">
              You don't have any posts from previous years on this day.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {memories.map((memory) => (
              <MemorySection
                key={memory.id}
                memory={memory}
                onSelectPost={(post) => setSelectedMemory({ ...memory, selectedPost: post })}
              />
            ))}
          </div>
        )}
      </div>

      {/* Memory Detail Modal */}
      <AnimatePresence>
        {selectedMemory && (
          <MemoryDetail
            memory={selectedMemory}
            onClose={() => setSelectedMemory(null)}
            formatDate={formatDate}
          />
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
}

function MemorySection({ memory, onSelectPost }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Year Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--accent-purple)] flex items-center justify-center">
          <Sparkles className="w-6 h-6 text-white" />
        </div>
        <div>
          <p className="font-semibold text-[var(--text-primary)]">
            {memory.years_ago} {memory.years_ago === 1 ? 'year' : 'years'} ago
          </p>
          <p className="text-sm text-[var(--text-muted)]">
            {new Date(memory.date).toLocaleDateString('en-US', { 
              month: 'long', 
              day: 'numeric', 
              year: 'numeric' 
            })}
          </p>
        </div>
      </div>

      {/* Posts Grid */}
      <div className={`grid gap-2 ${memory.posts.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
        {memory.posts.map((post) => (
          <motion.div
            key={post.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="relative aspect-square rounded-xl overflow-hidden cursor-pointer bg-white/5"
            onClick={() => onSelectPost(post)}
          >
            {post.image ? (
              <img src={post.image} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center p-4 bg-gradient-to-br from-[var(--primary)]/20 to-[var(--accent-purple)]/20">
                <p className="text-[var(--text-primary)] text-center line-clamp-4">{post.content}</p>
              </div>
            )}
            
            {/* Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 hover:opacity-100 transition-opacity flex items-end p-3">
              <div className="flex items-center gap-4 text-white text-sm">
                <span className="flex items-center gap-1">
                  <Heart className="w-4 h-4" />
                  {post.likes}
                </span>
                <span className="flex items-center gap-1">
                  <MessageCircle className="w-4 h-4" />
                  {post.comments}
                </span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Share Memory Button */}
      <Button 
        variant="outline" 
        className="w-full mt-4 border-white/10 hover:bg-white/5"
      >
        <Share2 className="w-4 h-4 mr-2" />
        Share This Memory
      </Button>
    </motion.div>
  );
}

function MemoryDetail({ memory, onClose, formatDate }) {
  const post = memory.selectedPost;
  const [isLiked, setIsLiked] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 left-4 p-2 rounded-full bg-white/10 hover:bg-white/20 z-10"
      >
        <X className="w-6 h-6 text-white" />
      </button>

      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="w-full max-w-lg mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[var(--bg-secondary)] rounded-t-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--accent-purple)] flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-[var(--text-primary)]">
              {memory.years_ago} {memory.years_ago === 1 ? 'year' : 'years'} ago today
            </p>
            <p className="text-sm text-[var(--text-muted)]">{formatDate(post.created_at)}</p>
          </div>
        </div>

        {/* Content */}
        <div className="bg-[var(--bg-secondary)]">
          {post.image && (
            <img src={post.image} alt="" className="w-full aspect-square object-cover" />
          )}
          {post.content && (
            <p className="p-4 text-[var(--text-primary)]">{post.content}</p>
          )}
        </div>

        {/* Actions */}
        <div className="bg-[var(--bg-secondary)] rounded-b-2xl p-4 flex items-center justify-between border-t border-white/5">
          <div className="flex items-center gap-6">
            <button 
              onClick={() => setIsLiked(!isLiked)}
              className="flex items-center gap-2"
            >
              <Heart className={`w-6 h-6 ${isLiked ? 'fill-red-500 text-red-500' : 'text-[var(--text-muted)]'}`} />
              <span className="text-[var(--text-muted)]">{post.likes}</span>
            </button>
            <button className="flex items-center gap-2">
              <MessageCircle className="w-6 h-6 text-[var(--text-muted)]" />
              <span className="text-[var(--text-muted)]">{post.comments}</span>
            </button>
          </div>
          <Button className="bg-[var(--primary)]">
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
