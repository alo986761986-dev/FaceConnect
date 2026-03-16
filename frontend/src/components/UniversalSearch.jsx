import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Search, X, User, Image, Film, Radio, FileText, Hash,
  Clock, TrendingUp, ArrowRight, Play, Heart, Eye, Loader2
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { haptic } from "@/utils/mobile";
import { debounce } from "lodash";

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Search result type icons
const TYPE_ICONS = {
  user: User,
  post: FileText,
  story: Image,
  reel: Film,
  live: Radio,
  photo: Image,
  video: Play,
  hashtag: Hash,
};

// Search categories
const SEARCH_CATEGORIES = [
  { id: "all", name: "All", icon: Search },
  { id: "users", name: "People", icon: User },
  { id: "posts", name: "Posts", icon: FileText },
  { id: "reels", name: "Reels", icon: Film },
  { id: "stories", name: "Stories", icon: Image },
  { id: "live", name: "Live", icon: Radio },
  { id: "hashtags", name: "Tags", icon: Hash },
];

export default function UniversalSearch({
  isOpen,
  onClose,
  token,
  isDark = true
}) {
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [results, setResults] = useState({
    users: [],
    posts: [],
    reels: [],
    stories: [],
    live: [],
    hashtags: [],
  });
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);
  const [trendingSearches, setTrendingSearches] = useState([
    { query: "sunset", count: 1234 },
    { query: "food", count: 987 },
    { query: "travel", count: 856 },
    { query: "music", count: 743 },
    { query: "fitness", count: 621 },
  ]);

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("recent_searches");
    if (saved) {
      setRecentSearches(JSON.parse(saved));
    }
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Debounced search function
  const performSearch = useCallback(
    debounce(async (searchQuery) => {
      if (!searchQuery.trim() || searchQuery.length < 2) {
        setResults({ users: [], posts: [], reels: [], stories: [], live: [], hashtags: [] });
        return;
      }

      setLoading(true);
      try {
        const response = await fetch(
          `${API_URL}/api/search/universal?token=${token}&q=${encodeURIComponent(searchQuery)}&category=${activeCategory}`,
          { method: "GET" }
        );

        if (response.ok) {
          const data = await response.json();
          setResults(data);
        }
      } catch (error) {
        console.error("Search failed:", error);
      } finally {
        setLoading(false);
      }
    }, 300),
    [token, activeCategory]
  );

  // Handle query change
  useEffect(() => {
    performSearch(query);
  }, [query, performSearch]);

  // Save to recent searches
  const saveRecentSearch = (searchQuery) => {
    const updated = [
      searchQuery,
      ...recentSearches.filter((s) => s !== searchQuery),
    ].slice(0, 10);
    setRecentSearches(updated);
    localStorage.setItem("recent_searches", JSON.stringify(updated));
  };

  // Handle result click
  const handleResultClick = (result) => {
    haptic.light();
    saveRecentSearch(query);
    onClose();

    switch (result.type) {
      case "user":
        navigate(`/profile/${result.id}`);
        break;
      case "post":
        navigate(`/posts/${result.id}`);
        break;
      case "reel":
        navigate(`/reels?id=${result.id}`);
        break;
      case "story":
        navigate(`/stories/${result.id}`);
        break;
      case "live":
        navigate(`/live/${result.id}`);
        break;
      case "hashtag":
        navigate(`/explore/tags/${result.tag}`);
        break;
      default:
        break;
    }
  };

  // Clear recent searches
  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem("recent_searches");
    haptic.light();
  };

  // Get all results combined
  const getAllResults = () => {
    const all = [];
    Object.entries(results).forEach(([type, items]) => {
      items.forEach((item) => all.push({ ...item, type: type.slice(0, -1) }));
    });
    return all.slice(0, 20);
  };

  // Render result item
  const ResultItem = ({ result }) => {
    const Icon = TYPE_ICONS[result.type] || FileText;

    return (
      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={() => handleResultClick(result)}
        className={`w-full flex items-center gap-3 p-3 rounded-xl ${
          isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50'
        }`}
      >
        {result.type === "user" ? (
          <Avatar className="w-12 h-12">
            <AvatarImage src={result.avatar ? `${API_URL}${result.avatar}` : undefined} />
            <AvatarFallback className="bg-gradient-to-br from-[#00F0FF] to-[#7000FF] text-white">
              {result.display_name?.[0] || result.username?.[0] || "?"}
            </AvatarFallback>
          </Avatar>
        ) : result.thumbnail ? (
          <div className="w-12 h-12 rounded-lg overflow-hidden bg-black">
            <img src={`${API_URL}${result.thumbnail}`} alt="" className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
            isDark ? 'bg-white/10' : 'bg-gray-100'
          }`}>
            <Icon className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
          </div>
        )}

        <div className="flex-1 text-left">
          <p className={`font-medium truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {result.display_name || result.username || result.title || result.content?.slice(0, 30)}
          </p>
          <div className="flex items-center gap-2">
            <span className={`text-xs capitalize ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              {result.type}
            </span>
            {result.likes_count > 0 && (
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <Heart className="w-3 h-3" />
                {result.likes_count}
              </span>
            )}
            {result.views_count > 0 && (
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <Eye className="w-3 h-3" />
                {result.views_count}
              </span>
            )}
          </div>
        </div>

        <ArrowRight className={`w-4 h-4 ${isDark ? 'text-gray-600' : 'text-gray-400'}`} />
      </motion.button>
    );
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl"
      >
        <div className={`h-full flex flex-col ${isDark ? 'bg-[#0A0A0A]' : 'bg-white'}`}>
          {/* Search Header */}
          <div className="p-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className={`w-5 h-5 ${isDark ? 'text-white' : 'text-gray-900'}`} />
              </Button>
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  ref={inputRef}
                  type="text"
                  placeholder="Search people, posts, reels, live..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className={`pl-10 pr-10 py-3 rounded-full ${
                    isDark 
                      ? 'bg-white/5 border-white/10 text-white placeholder:text-gray-500' 
                      : 'bg-gray-100 border-gray-200'
                  }`}
                />
                {query && (
                  <button
                    onClick={() => setQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                  >
                    <X className="w-4 h-4 text-gray-400" />
                  </button>
                )}
              </div>
            </div>

            {/* Category Tabs */}
            <ScrollArea className="mt-3">
              <div className="flex gap-2 pb-2">
                {SEARCH_CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  return (
                    <Button
                      key={cat.id}
                      size="sm"
                      variant="ghost"
                      onClick={() => setActiveCategory(cat.id)}
                      className={`rounded-full whitespace-nowrap ${
                        activeCategory === cat.id
                          ? 'bg-[#00F0FF]/20 text-[#00F0FF]'
                          : isDark ? 'text-gray-400' : 'text-gray-600'
                      }`}
                    >
                      <Icon className="w-4 h-4 mr-2" />
                      {cat.name}
                    </Button>
                  );
                })}
              </div>
            </ScrollArea>
          </div>

          {/* Search Results */}
          <ScrollArea className="flex-1">
            <div className="p-4">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-[#00F0FF]" />
                </div>
              ) : query.length > 1 ? (
                <div className="space-y-2">
                  {activeCategory === "all" ? (
                    getAllResults().length > 0 ? (
                      getAllResults().map((result, idx) => (
                        <ResultItem key={`${result.type}-${result.id || idx}`} result={result} />
                      ))
                    ) : (
                      <div className="text-center py-12">
                        <Search className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                        <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>
                          No results for "{query}"
                        </p>
                      </div>
                    )
                  ) : (
                    results[activeCategory]?.length > 0 ? (
                      results[activeCategory].map((result, idx) => (
                        <ResultItem
                          key={result.id || idx}
                          result={{ ...result, type: activeCategory.slice(0, -1) }}
                        />
                      ))
                    ) : (
                      <div className="text-center py-12">
                        <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>
                          No {activeCategory} found
                        </p>
                      </div>
                    )
                  )}
                </div>
              ) : (
                // Empty state: Show recent & trending
                <div className="space-y-6">
                  {/* Recent Searches */}
                  {recentSearches.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          Recent Searches
                        </h3>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={clearRecentSearches}
                          className="text-[#00F0FF]"
                        >
                          Clear
                        </Button>
                      </div>
                      <div className="space-y-1">
                        {recentSearches.map((search, idx) => (
                          <button
                            key={idx}
                            onClick={() => setQuery(search)}
                            className={`w-full flex items-center gap-3 p-3 rounded-xl ${
                              isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50'
                            }`}
                          >
                            <Clock className="w-4 h-4 text-gray-500" />
                            <span className={isDark ? 'text-white' : 'text-gray-900'}>{search}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Trending Searches */}
                  <div>
                    <h3 className={`font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      Trending
                    </h3>
                    <div className="space-y-1">
                      {trendingSearches.map((item, idx) => (
                        <button
                          key={idx}
                          onClick={() => setQuery(item.query)}
                          className={`w-full flex items-center gap-3 p-3 rounded-xl ${
                            isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50'
                          }`}
                        >
                          <div className="w-8 h-8 rounded-full bg-[#00F0FF]/20 flex items-center justify-center">
                            <TrendingUp className="w-4 h-4 text-[#00F0FF]" />
                          </div>
                          <div className="flex-1 text-left">
                            <p className={isDark ? 'text-white' : 'text-gray-900'}>#{item.query}</p>
                            <p className="text-xs text-gray-500">{item.count.toLocaleString()} posts</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
