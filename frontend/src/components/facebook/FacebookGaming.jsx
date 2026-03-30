/**
 * Facebook Gaming Component for FaceConnect
 * Gaming hub with streams, tournaments, and social gaming
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Gamepad2, Play, Radio, Users, Trophy, Star, Heart, MessageCircle,
  Share2, Bell, Search, Plus, ChevronRight, Flame, Zap, Crown,
  Clock, Eye, Volume2, VolumeX, Maximize, Gift, Target, Award
} from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { haptic } from "@/utils/mobile";

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Popular Games
const POPULAR_GAMES = [
  { id: '1', name: 'Fortnite', icon: '🎮', players: '2.3M', color: 'from-purple-500 to-pink-500' },
  { id: '2', name: 'Minecraft', icon: '⛏️', players: '1.8M', color: 'from-green-500 to-emerald-500' },
  { id: '3', name: 'League of Legends', icon: '⚔️', players: '1.5M', color: 'from-blue-500 to-cyan-500' },
  { id: '4', name: 'Call of Duty', icon: '🔫', players: '1.2M', color: 'from-red-500 to-orange-500' },
  { id: '5', name: 'FIFA 25', icon: '⚽', players: '890K', color: 'from-green-600 to-lime-500' },
  { id: '6', name: 'GTA V', icon: '🚗', players: '750K', color: 'from-yellow-500 to-amber-500' },
];

// Sample Live Streams
const SAMPLE_STREAMS = [
  {
    id: '1',
    title: 'LIVE: Fortnite Championship Finals!',
    thumbnail: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800',
    streamer: { name: 'NinjaGamer', avatar: null, verified: true, followers: '5.2M' },
    game: 'Fortnite',
    viewers: '125K',
    isLive: true,
    tags: ['Tournament', 'Pro Player', 'English']
  },
  {
    id: '2',
    title: 'Chill Minecraft Building Stream 🏠',
    thumbnail: 'https://images.unsplash.com/photo-1493711662062-fa541f7f3d24?w=800',
    streamer: { name: 'BuilderBob', avatar: null, verified: false, followers: '890K' },
    game: 'Minecraft',
    viewers: '45K',
    isLive: true,
    tags: ['Creative', 'Building', 'Relaxed']
  },
  {
    id: '3',
    title: 'Road to Diamond Ranked! 💎',
    thumbnail: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=800',
    streamer: { name: 'ProLeague', avatar: null, verified: true, followers: '2.1M' },
    game: 'League of Legends',
    viewers: '78K',
    isLive: true,
    tags: ['Ranked', 'Competitive', 'Tips']
  },
];

// Sample Tournaments
const SAMPLE_TOURNAMENTS = [
  {
    id: '1',
    name: 'FaceConnect Gaming Championship',
    game: 'Fortnite',
    prizePool: '$50,000',
    participants: 256,
    startDate: 'Jan 20, 2025',
    status: 'Registration Open',
    cover: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800'
  },
  {
    id: '2',
    name: 'Weekly FIFA Tournament',
    game: 'FIFA 25',
    prizePool: '$1,000',
    participants: 64,
    startDate: 'Jan 18, 2025',
    status: 'Starting Soon',
    cover: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800'
  },
  {
    id: '3',
    name: 'Minecraft Build Battle',
    game: 'Minecraft',
    prizePool: '$500',
    participants: 32,
    startDate: 'Jan 22, 2025',
    status: 'Registration Open',
    cover: 'https://images.unsplash.com/photo-1493711662062-fa541f7f3d24?w=800'
  },
];

// Stream Card
function StreamCard({ stream, isDark, onClick }) {
  return (
    <motion.button
      onClick={() => onClick?.(stream)}
      whileTap={{ scale: 0.98 }}
      className={`w-full rounded-xl overflow-hidden ${isDark ? 'bg-[#242526]' : 'bg-white'}`}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video">
        <img
          src={stream.thumbnail}
          alt={stream.title}
          className="w-full h-full object-cover"
        />
        
        {/* Live Badge */}
        {stream.isLive && (
          <div className="absolute top-2 left-2 px-2 py-0.5 bg-red-500 rounded text-xs font-bold text-white flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
            LIVE
          </div>
        )}
        
        {/* Viewers */}
        <div className="absolute top-2 right-2 px-2 py-0.5 bg-black/70 rounded text-xs text-white flex items-center gap-1">
          <Eye className="w-3 h-3" />
          {stream.viewers}
        </div>
        
        {/* Game Badge */}
        <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/70 rounded text-xs text-white">
          {stream.game}
        </div>
      </div>
      
      {/* Info */}
      <div className="p-3">
        <div className="flex gap-3">
          <Avatar className="w-9 h-9 flex-shrink-0">
            <AvatarImage src={stream.streamer.avatar} />
            <AvatarFallback className="bg-gradient-to-br from-purple-500 to-cyan-400 text-white text-sm">
              {stream.streamer.name[0]}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 text-left">
            <h3 className={`font-semibold line-clamp-1 text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {stream.title}
            </h3>
            <div className="flex items-center gap-1">
              <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                {stream.streamer.name}
              </span>
              {stream.streamer.verified && (
                <div className="w-3 h-3 rounded-full bg-blue-500 flex items-center justify-center">
                  <span className="text-white text-[8px]">✓</span>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Tags */}
        <div className="flex flex-wrap gap-1 mt-2">
          {stream.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className={`px-2 py-0.5 rounded text-xs ${
                isDark ? 'bg-[#3a3b3c] text-gray-300' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </motion.button>
  );
}

// Tournament Card
function TournamentCard({ tournament, isDark, onClick }) {
  const statusColors = {
    'Registration Open': 'text-green-500 bg-green-500/20',
    'Starting Soon': 'text-yellow-500 bg-yellow-500/20',
    'In Progress': 'text-red-500 bg-red-500/20',
    'Completed': 'text-gray-500 bg-gray-500/20'
  };

  return (
    <motion.button
      onClick={() => onClick?.(tournament)}
      whileTap={{ scale: 0.98 }}
      className={`w-full rounded-xl overflow-hidden ${isDark ? 'bg-[#242526]' : 'bg-white'}`}
    >
      {/* Cover */}
      <div className="relative h-32">
        <img
          src={tournament.cover}
          alt={tournament.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
        
        {/* Prize Pool */}
        <div className="absolute bottom-2 left-2 flex items-center gap-1">
          <Trophy className="w-4 h-4 text-yellow-500" />
          <span className="text-white font-bold">{tournament.prizePool}</span>
        </div>
        
        {/* Status */}
        <div className={`absolute top-2 right-2 px-2 py-0.5 rounded text-xs font-medium ${statusColors[tournament.status]}`}>
          {tournament.status}
        </div>
      </div>
      
      {/* Info */}
      <div className="p-3 text-left">
        <h3 className={`font-semibold line-clamp-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          {tournament.name}
        </h3>
        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          {tournament.game}
        </p>
        <div className="flex items-center gap-3 mt-2">
          <div className="flex items-center gap-1">
            <Users className={`w-4 h-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
            <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              {tournament.participants} players
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className={`w-4 h-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
            <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              {tournament.startDate}
            </span>
          </div>
        </div>
      </div>
    </motion.button>
  );
}

// Game Card
function GameCard({ game, isDark, onClick }) {
  return (
    <motion.button
      onClick={() => onClick?.(game)}
      whileTap={{ scale: 0.95 }}
      className="flex flex-col items-center"
    >
      <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${game.color} flex items-center justify-center text-2xl shadow-lg`}>
        {game.icon}
      </div>
      <p className={`text-xs mt-1.5 font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
        {game.name}
      </p>
      <p className={`text-[10px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
        {game.players} playing
      </p>
    </motion.button>
  );
}

// Main Gaming Component
export default function FacebookGaming({ isDark }) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('live');
  const [streams] = useState(SAMPLE_STREAMS);
  const [tournaments] = useState(SAMPLE_TOURNAMENTS);

  return (
    <div className={`min-h-screen ${isDark ? 'bg-[#18191a]' : 'bg-gray-100'}`}>
      {/* Header */}
      <div className={`sticky top-0 z-40 ${isDark ? 'bg-[#242526]' : 'bg-white'} border-b ${isDark ? 'border-[#3a3b3c]' : 'border-gray-200'}`}>
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Gamepad2 className="w-6 h-6 text-purple-500" />
            <h1 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Gaming
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button className={`p-2 rounded-full ${isDark ? 'bg-[#3a3b3c]' : 'bg-gray-100'}`}>
              <Search className={`w-5 h-5 ${isDark ? 'text-gray-200' : 'text-gray-700'}`} />
            </button>
            <button className={`p-2 rounded-full ${isDark ? 'bg-[#3a3b3c]' : 'bg-gray-100'}`}>
              <Bell className={`w-5 h-5 ${isDark ? 'text-gray-200' : 'text-gray-700'}`} />
            </button>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="flex px-4 gap-2 pb-3">
          {[
            { id: 'live', label: 'Live', icon: Radio },
            { id: 'games', label: 'Games', icon: Gamepad2 },
            { id: 'tournaments', label: 'Tournaments', icon: Trophy },
            { id: 'following', label: 'Following', icon: Heart },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-purple-600 to-cyan-500 text-white'
                  : isDark ? 'bg-[#3a3b3c] text-gray-200' : 'bg-gray-100 text-gray-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <ScrollArea className="h-[calc(100vh-140px)]">
        {activeTab === 'live' && (
          <div className="p-4">
            {/* Popular Games */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Popular Games
                </h2>
                <button className="text-purple-500 text-sm font-medium flex items-center gap-1">
                  See All
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <ScrollArea className="w-full">
                <div className="flex gap-4">
                  {POPULAR_GAMES.map((game) => (
                    <GameCard
                      key={game.id}
                      game={game}
                      isDark={isDark}
                      onClick={() => {}}
                    />
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Live Streams */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className={`text-lg font-semibold flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  <Radio className="w-5 h-5 text-red-500" />
                  Live Now
                </h2>
              </div>
              <div className="grid grid-cols-1 gap-4">
                {streams.map((stream) => (
                  <StreamCard
                    key={stream.id}
                    stream={stream}
                    isDark={isDark}
                    onClick={() => {}}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'games' && (
          <div className="p-4">
            <h2 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              All Games
            </h2>
            <div className="grid grid-cols-4 gap-4">
              {POPULAR_GAMES.map((game) => (
                <GameCard
                  key={game.id}
                  game={game}
                  isDark={isDark}
                  onClick={() => {}}
                />
              ))}
            </div>
          </div>
        )}

        {activeTab === 'tournaments' && (
          <div className="p-4">
            {/* Featured Tournament */}
            <div className="mb-6">
              <h2 className={`text-lg font-semibold mb-3 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                <Flame className="w-5 h-5 text-orange-500" />
                Featured Tournament
              </h2>
              <TournamentCard
                tournament={tournaments[0]}
                isDark={isDark}
                onClick={() => {}}
              />
            </div>

            {/* All Tournaments */}
            <div>
              <h2 className={`text-lg font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Upcoming Tournaments
              </h2>
              <div className="space-y-4">
                {tournaments.slice(1).map((tournament) => (
                  <TournamentCard
                    key={tournament.id}
                    tournament={tournament}
                    isDark={isDark}
                    onClick={() => {}}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'following' && (
          <div className="p-4">
            <div className="text-center py-12">
              <Heart className={`w-12 h-12 mx-auto mb-3 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
              <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>
                Follow streamers to see them here
              </p>
              <Button
                onClick={() => setActiveTab('live')}
                className="mt-4 bg-gradient-to-r from-purple-600 to-cyan-500 text-white"
              >
                Discover Streamers
              </Button>
            </div>
          </div>
        )}
      </ScrollArea>

      {/* Go Live FAB */}
      <div className="fixed bottom-24 right-4 z-50">
        <Button className="rounded-full px-6 h-14 bg-gradient-to-r from-red-500 to-pink-500 shadow-lg flex items-center gap-2">
          <Radio className="w-5 h-5 text-white" />
          <span className="font-semibold text-white">Go Live</span>
        </Button>
      </div>
    </div>
  );
}

export { StreamCard, TournamentCard, GameCard, POPULAR_GAMES };
