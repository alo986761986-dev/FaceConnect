import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Gamepad2, Play, Users, Trophy, Star, Clock, Search,
  TrendingUp, Twitch, ChevronRight, MoreHorizontal, X,
  Heart, MessageCircle, Share2, Zap
} from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { useSettings } from "@/context/SettingsContext";
import BottomNav from "@/components/BottomNav";
import FacebookGaming from "@/components/facebook/FacebookGaming";
import { GamingSkeleton } from "@/components/skeletons";

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Gaming Page - uses the comprehensive FacebookGaming component
export default function Gaming() {
  const { user, token } = useAuth();
  const { isDark } = useSettings();

  return (
    <div className="min-h-screen pb-20">
      <FacebookGaming isDark={isDark} />
      <BottomNav />
    </div>
  );
}

// Keep legacy code below for reference
const GAME_CATEGORIES = [
  "All Games", "Action", "Adventure", "Puzzle", "Sports", 
  "Racing", "Strategy", "Arcade", "Multiplayer"
];

function GamingLegacy() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("play");
  const [games, setGames] = useState([]);
  const [streams, setStreams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedGame, setSelectedGame] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchGamingData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Fetch games from API
        const gamesRes = await fetch(`${API_URL}/api/gaming/discover?token=${token}`);
        if (gamesRes.ok) {
          const gamesData = await gamesRes.json();
          setGames(gamesData.games || []);
        } else {
          throw new Error('Failed to fetch games');
        }

        // Fetch streams from API
        const streamsRes = await fetch(`${API_URL}/api/gaming/streams?token=${token}`);
        if (streamsRes.ok) {
          const streamsData = await streamsRes.json();
          setStreams(streamsData.streams || []);
        } else {
          throw new Error('Failed to fetch streams');
        }
      } catch (err) {
        console.error("Failed to fetch gaming data:", err);
        setError(err.message);
        // Fallback to mock data
        setGames(generateMockGames());
        setStreams(generateMockStreams());
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchGamingData();
    }
  }, [token]);

  const generateMockGames = () => {
    const gameNames = [
      "Cosmic Runner", "Puzzle Quest", "Battle Arena", "Speed Racer",
      "Word Master", "Chess Pro", "Trivia Time", "Candy Crush Clone"
    ];
    
    return gameNames.map((name, i) => ({
      id: `game-${i}`,
      name,
      description: "An exciting game that will keep you entertained for hours!",
      thumbnail: `https://picsum.photos/400/300?random=${i + 50}`,
      players: Math.floor(Math.random() * 100000) + 10000,
      rating: (Math.random() * 2 + 3).toFixed(1),
      category: GAME_CATEGORIES[Math.floor(Math.random() * (GAME_CATEGORIES.length - 1)) + 1],
      is_instant: true
    }));
  };

  const generateMockStreams = () => {
    return Array.from({ length: 6 }, (_, i) => ({
      id: `stream-${i}`,
      title: `Epic Gaming Session #${i + 1}`,
      game: `Game ${i + 1}`,
      thumbnail: `https://picsum.photos/400/225?random=${i + 60}`,
      streamer: {
        username: `gamer${i}`,
        display_name: `Pro Gamer ${i + 1}`,
        avatar: null
      },
      viewers: Math.floor(Math.random() * 10000) + 100,
      is_live: true
    }));
  };

  const formatNumber = (num) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[var(--bg-primary)]/95 backdrop-blur-lg border-b border-white/5">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Gamepad2 className="w-6 h-6 text-[var(--primary)]" />
            <h1 className="text-xl font-bold text-[var(--text-primary)]">Gaming</h1>
          </div>
          <Button variant="ghost" size="icon" className="rounded-full">
            <Search className="w-5 h-5" />
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-4 pb-3">
          {[
            { id: "play", label: "Play", icon: Play },
            { id: "watch", label: "Watch", icon: Twitch },
            { id: "tournaments", label: "Tournaments", icon: Trophy },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 flex-1 py-2 px-4 rounded-full text-sm font-medium transition-all justify-center ${
                activeTab === tab.id
                  ? "bg-[var(--primary)] text-white"
                  : "bg-white/5 text-[var(--text-secondary)] hover:bg-white/10"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      {/* Content */}
      <div className="p-4">
        {loading ? (
          <GamingSkeleton />
        ) : activeTab === "play" && (
          <div className="space-y-6">
            {/* Featured Game */}
            {games[0] && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative h-48 rounded-2xl overflow-hidden"
              >
                <img 
                  src={games[0].thumbnail} 
                  alt={games[0].name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="w-4 h-4 text-yellow-400" />
                    <span className="text-xs text-yellow-400 font-semibold">FEATURED</span>
                  </div>
                  <h2 className="text-xl font-bold text-white">{games[0].name}</h2>
                  <div className="flex items-center gap-4 mt-2">
                    <span className="flex items-center gap-1 text-sm text-white/80">
                      <Users className="w-4 h-4" />
                      {formatNumber(games[0].players)} playing
                    </span>
                    <span className="flex items-center gap-1 text-sm text-white/80">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      {games[0].rating}
                    </span>
                  </div>
                  <Button className="mt-3 bg-[var(--primary)]">
                    <Play className="w-4 h-4 mr-2" fill="white" />
                    Play Now
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Categories */}
            <div className="flex gap-2 overflow-x-auto scrollbar-hide">
              {GAME_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  className="px-4 py-2 bg-white/5 rounded-full text-sm text-[var(--text-secondary)] hover:bg-white/10 whitespace-nowrap"
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Games Grid */}
            <div>
              <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Instant Games</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {games.slice(1).map((game) => (
                  <GameCard
                    key={game.id}
                    game={game}
                    formatNumber={formatNumber}
                    onClick={() => setSelectedGame(game)}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {!loading && activeTab === "watch" && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">Live Streams</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {streams.map((stream) => (
                <StreamCard
                  key={stream.id}
                  stream={stream}
                  formatNumber={formatNumber}
                />
              ))}
            </div>
          </div>
        )}

        {!loading && activeTab === "tournaments" && (
          <div className="space-y-4">
            <div className="text-center py-12">
              <Trophy className="w-16 h-16 mx-auto text-[var(--text-muted)] mb-4" />
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Tournaments Coming Soon</h2>
              <p className="text-[var(--text-muted)] mt-2">
                Compete with friends and win amazing prizes!
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Game Detail Modal */}
      <AnimatePresence>
        {selectedGame && (
          <GameDetail
            game={selectedGame}
            onClose={() => setSelectedGame(null)}
            formatNumber={formatNumber}
          />
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
}

function GameCard({ game, formatNumber, onClick }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="cursor-pointer group"
      onClick={onClick}
    >
      <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-white/5">
        <img 
          src={game.thumbnail} 
          alt={game.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-[var(--primary)] flex items-center justify-center">
            <Play className="w-5 h-5 text-white ml-0.5" fill="white" />
          </div>
        </div>
        {game.is_instant && (
          <div className="absolute top-2 right-2 px-2 py-0.5 bg-[var(--primary)] rounded-full">
            <span className="text-[10px] font-bold text-white">INSTANT</span>
          </div>
        )}
      </div>
      <div className="mt-2">
        <h4 className="font-semibold text-[var(--text-primary)] truncate">{game.name}</h4>
        <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
          <span className="flex items-center gap-1">
            <Users className="w-3 h-3" />
            {formatNumber(game.players)}
          </span>
          <span className="flex items-center gap-1">
            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
            {game.rating}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

function StreamCard({ stream, formatNumber }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/5 rounded-xl overflow-hidden hover:bg-white/10 transition-colors cursor-pointer"
    >
      <div className="relative aspect-video">
        <img 
          src={stream.thumbnail} 
          alt={stream.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute top-2 left-2 px-2 py-1 bg-red-500 rounded flex items-center gap-1">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
          <span className="text-xs font-bold text-white">LIVE</span>
        </div>
        <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/70 rounded">
          <span className="text-xs text-white">{formatNumber(stream.viewers)} watching</span>
        </div>
      </div>
      <div className="p-3">
        <div className="flex items-start gap-3">
          <Avatar className="w-10 h-10">
            <AvatarFallback className="bg-gradient-to-br from-[var(--primary)] to-[var(--accent-purple)] text-white text-sm">
              {stream.streamer.username?.[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-[var(--text-primary)] truncate">{stream.title}</h4>
            <p className="text-sm text-[var(--text-muted)]">{stream.streamer.display_name}</p>
            <p className="text-sm text-[var(--text-muted)]">{stream.game}</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function GameDetail({ game, onClose, formatNumber }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/80 flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        className="w-full max-w-lg bg-[var(--bg-primary)] rounded-t-3xl sm:rounded-3xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Image */}
        <div className="relative h-48">
          <img src={game.thumbnail} alt={game.name} className="w-full h-full object-cover" />
          <button
            onClick={onClose}
            className="absolute top-4 left-4 p-2 rounded-full bg-black/50"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Info */}
        <div className="p-4">
          <h2 className="text-xl font-bold text-[var(--text-primary)]">{game.name}</h2>
          <p className="text-sm text-[var(--text-muted)] mt-1">{game.category}</p>

          <div className="flex items-center gap-6 mt-4">
            <div className="text-center">
              <p className="text-lg font-bold text-[var(--text-primary)]">{formatNumber(game.players)}</p>
              <p className="text-xs text-[var(--text-muted)]">Players</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1">
                <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                <span className="text-lg font-bold text-[var(--text-primary)]">{game.rating}</span>
              </div>
              <p className="text-xs text-[var(--text-muted)]">Rating</p>
            </div>
          </div>

          <p className="text-[var(--text-secondary)] mt-4">{game.description}</p>

          <Button className="w-full mt-6 bg-[var(--primary)] py-6">
            <Play className="w-5 h-5 mr-2" fill="white" />
            Play Now
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
