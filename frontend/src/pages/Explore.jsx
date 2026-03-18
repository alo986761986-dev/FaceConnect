import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Search, Grid3X3, Film, Image, TrendingUp, X, Heart,
  MessageCircle, Bookmark, Play
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/context/AuthContext";
import { useSettings } from "@/context/SettingsContext";
import { haptic } from "@/utils/mobile";
import BottomNav from "@/components/BottomNav";
import { ExploreSkeleton } from "@/components/skeletons";

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Category tabs
const CATEGORIES = [
  { id: "all", label: "For You", icon: TrendingUp },
  { id: "photos", label: "Photos", icon: Image },
  { id: "videos", label: "Videos", icon: Film },
  { id: "reels", label: "Reels", icon: Play }
];

// Explore Grid Item
function ExploreItem({ post, onClick }) {
  const isVideo = post.media_type === "video" || post.type === "reel";
  
  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="relative aspect-square overflow-hidden rounded-sm bg-[var(--muted)]"
      data-testid={`explore-item-${post.id}`}
    >
      {post.media_url ? (
        <img
          src={`${API_URL}${post.media_url}`}
          alt=""
          className="w-full h-full object-cover"
          loading="lazy"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center p-2">
          <p className="text-xs text-center text-[var(--text-secondary)] line-clamp-3">
            {post.content}
          </p>
        </div>
      )}
      
      {/* Video indicator */}
      {isVideo && (
        <div className="absolute top-2 right-2">
          <Film className="w-4 h-4 text-white drop-shadow-lg" />
        </div>
      )}
      
      {/* Engagement overlay on hover */}
      <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
        <span className="flex items-center gap-1 text-white text-sm font-semibold">
          <Heart className="w-4 h-4 fill-white" />
          {post.likes_count || 0}
        </span>
        <span className="flex items-center gap-1 text-white text-sm font-semibold">
          <MessageCircle className="w-4 h-4 fill-white" />
          {post.comments_count || 0}
        </span>
      </div>
    </motion.button>
  );
}

// Search Results
function SearchResults({ results, onUserClick, onPostClick, onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="absolute top-full left-0 right-0 mt-2 bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-xl z-50 max-h-[60vh] overflow-y-auto"
    >
      {/* Users */}
      {results.users?.length > 0 && (
        <div className="p-3 border-b border-[var(--border)]">
          <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase mb-2">Users</h3>
          {results.users.slice(0, 5).map(user => (
            <button
              key={user.id}
              onClick={() => onUserClick(user)}
              className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--muted)] transition-colors"
            >
              <Avatar className="w-10 h-10">
                <AvatarImage src={user.avatar ? `${API_URL}${user.avatar}` : undefined} />
                <AvatarFallback className="bg-gradient-to-br from-[var(--primary)] to-[var(--accent-purple)] text-white text-sm">
                  {user.username?.[0]?.toUpperCase() || "?"}
                </AvatarFallback>
              </Avatar>
              <div className="text-left">
                <p className="font-semibold text-sm">{user.username}</p>
                {user.display_name && (
                  <p className="text-xs text-[var(--text-muted)]">{user.display_name}</p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
      
      {/* Hashtags */}
      {results.hashtags?.length > 0 && (
        <div className="p-3 border-b border-[var(--border)]">
          <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase mb-2">Hashtags</h3>
          <div className="flex flex-wrap gap-2">
            {results.hashtags.slice(0, 8).map(tag => (
              <button
                key={tag.tag}
                className="px-3 py-1.5 bg-[var(--muted)] rounded-full text-sm hover:bg-[var(--primary)] hover:text-white transition-colors"
              >
                #{tag.tag}
                <span className="ml-1 text-xs text-[var(--text-muted)]">{tag.post_count}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      
      {/* Posts */}
      {results.posts?.length > 0 && (
        <div className="p-3">
          <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase mb-2">Posts</h3>
          <div className="grid grid-cols-3 gap-1">
            {results.posts.slice(0, 6).map(post => (
              <ExploreItem key={post.id} post={post} onClick={() => onPostClick(post)} />
            ))}
          </div>
        </div>
      )}
      
      {/* No results */}
      {!results.users?.length && !results.hashtags?.length && !results.posts?.length && (
        <div className="p-6 text-center text-[var(--text-muted)]">
          No results found
        </div>
      )}
    </motion.div>
  );
}

// Post Detail Modal
function PostDetailModal({ post, token, onClose }) {
  const [liked, setLiked] = useState(post.is_liked);
  const [saved, setSaved] = useState(post.is_saved);
  const [likeCount, setLikeCount] = useState(post.likes_count || 0);

  const handleLike = async () => {
    haptic.light();
    setLiked(!liked);
    setLikeCount(prev => liked ? prev - 1 : prev + 1);
    
    try {
      await fetch(`${API_URL}/api/posts/${post.id}/like?token=${token}`, { method: 'POST' });
    } catch (error) {
      setLiked(liked);
      setLikeCount(post.likes_count || 0);
    }
  };

  const handleSave = async () => {
    haptic.light();
    setSaved(!saved);
    
    try {
      await fetch(`${API_URL}/api/saved/posts/${post.id}?token=${token}`, { method: 'POST' });
    } catch (error) {
      setSaved(saved);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-[var(--card)] rounded-xl overflow-hidden max-w-lg w-full max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-[var(--border)]">
          <Avatar className="w-10 h-10">
            <AvatarImage src={post.avatar ? `${API_URL}${post.avatar}` : undefined} />
            <AvatarFallback className="bg-gradient-to-br from-[var(--primary)] to-[var(--accent-purple)] text-white">
              {post.username?.[0]?.toUpperCase() || "?"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="font-semibold">{post.username}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[var(--muted)] rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Media */}
        {post.media_url && (
          <div className="aspect-square bg-black">
            {post.media_type === "video" ? (
              <video
                src={`${API_URL}${post.media_url}`}
                className="w-full h-full object-contain"
                controls
                autoPlay
                loop
              />
            ) : (
              <img
                src={`${API_URL}${post.media_url}`}
                alt=""
                className="w-full h-full object-contain"
              />
            )}
          </div>
        )}

        {/* Actions */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-4">
              <button onClick={handleLike} className={liked ? 'text-red-500' : ''}>
                <Heart className={`w-6 h-6 ${liked ? 'fill-current' : ''}`} />
              </button>
              <button>
                <MessageCircle className="w-6 h-6" />
              </button>
            </div>
            <button onClick={handleSave} className={saved ? 'text-[var(--primary)]' : ''}>
              <Bookmark className={`w-6 h-6 ${saved ? 'fill-current' : ''}`} />
            </button>
          </div>
          
          {likeCount > 0 && (
            <p className="font-semibold text-sm mb-2">{likeCount.toLocaleString()} likes</p>
          )}
          
          {post.content && (
            <p className="text-sm">
              <span className="font-semibold mr-1">{post.username}</span>
              {post.content}
            </p>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function Explore() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const { isDark } = useSettings();
  
  const [activeCategory, setActiveCategory] = useState("all");
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState(null);
  const [searchFocused, setSearchFocused] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);

  // Fetch explore content
  const fetchExplore = useCallback(async () => {
    if (!token) return;
    
    setLoading(true);
    try {
      const endpoint = activeCategory === "all" 
        ? `${API_URL}/api/explore/for-you?token=${token}`
        : `${API_URL}/api/explore?token=${token}&category=${activeCategory}`;
      
      const response = await fetch(endpoint);
      if (response.ok) {
        const data = await response.json();
        setPosts(data.posts || []);
      }
    } catch (error) {
      console.error('Failed to fetch explore:', error);
    } finally {
      setLoading(false);
    }
  }, [token, activeCategory]);

  useEffect(() => {
    fetchExplore();
  }, [fetchExplore]);

  // Search
  const handleSearch = async (query) => {
    setSearchQuery(query);
    
    if (query.length < 2) {
      setSearchResults(null);
      return;
    }
    
    try {
      const response = await fetch(`${API_URL}/api/explore/search?token=${token}&q=${encodeURIComponent(query)}`);
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data);
      }
    } catch (error) {
      console.error('Search failed:', error);
    }
  };

  return (
    <div 
      className="min-h-screen pb-20"
      style={{ background: 'var(--background)' }}
      data-theme={isDark ? 'dark' : 'light'}
    >
      {/* Search Header */}
      <header className="sticky top-0 z-40 bg-[var(--background)] border-b border-[var(--border)] safe-top">
        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
            <Input
              data-testid="explore-search"
              placeholder="Search users, posts, hashtags..."
              value={searchQuery}
              onChange={e => handleSearch(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              className="pl-10 h-10 bg-[var(--muted)] border-none rounded-xl"
            />
            {searchQuery && (
              <button
                onClick={() => { setSearchQuery(''); setSearchResults(null); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
              >
                <X className="w-4 h-4 text-[var(--text-muted)]" />
              </button>
            )}
            
            {/* Search Results Dropdown */}
            <AnimatePresence>
              {searchFocused && searchResults && (
                <SearchResults
                  results={searchResults}
                  onUserClick={(user) => {
                    setSearchFocused(false);
                    navigate(`/profile/${user.id}`);
                  }}
                  onPostClick={(post) => {
                    setSearchFocused(false);
                    setSelectedPost(post);
                  }}
                  onClose={() => setSearchFocused(false)}
                />
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex px-4 pb-3 gap-2 overflow-x-auto scrollbar-hide">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => {
                haptic.light();
                setActiveCategory(cat.id);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                activeCategory === cat.id
                  ? 'bg-[var(--text-primary)] text-[var(--background)]'
                  : 'bg-[var(--muted)] text-[var(--text-secondary)]'
              }`}
              data-testid={`category-${cat.id}`}
            >
              <cat.icon className="w-4 h-4" />
              {cat.label}
            </button>
          ))}
        </div>
      </header>

      {/* Explore Grid */}
      <main className="p-1">
        {loading ? (
          <ExploreSkeleton />
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Grid3X3 className="w-16 h-16 text-[var(--text-muted)] mb-4" />
            <p className="text-[var(--text-secondary)]">No content to explore yet</p>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              Check back later for trending posts
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1">
            {posts.map(post => (
              <ExploreItem
                key={post.id}
                post={post}
                onClick={() => setSelectedPost(post)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Post Detail Modal */}
      <AnimatePresence>
        {selectedPost && (
          <PostDetailModal
            post={selectedPost}
            token={token}
            onClose={() => setSelectedPost(null)}
          />
        )}
      </AnimatePresence>

      {/* Click outside to close search */}
      {searchFocused && (
        <div 
          className="fixed inset-0 z-30" 
          onClick={() => setSearchFocused(false)}
        />
      )}

      <BottomNav />
    </div>
  );
}
