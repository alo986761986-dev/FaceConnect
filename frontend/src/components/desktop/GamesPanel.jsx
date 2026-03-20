import { useState } from "react";
import { motion } from "framer-motion";
import { Search, ArrowLeft, Chrome, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

const GAMING_PLATFORMS = [
  { name: 'Poki Games', icon: '🎮', color: 'from-purple-500 to-pink-500', url: 'https://poki.com/' },
  { name: 'CrazyGames', icon: '🎯', color: 'from-blue-500 to-cyan-500', url: 'https://www.crazygames.com/' },
  { name: 'Miniclip', icon: '🏆', color: 'from-yellow-500 to-orange-500', url: 'https://www.miniclip.com/' },
  { name: 'Armor Games', icon: '⚔️', color: 'from-red-500 to-pink-500', url: 'https://armorgames.com/' },
  { name: 'Kongregate', icon: '👾', color: 'from-green-500 to-emerald-500', url: 'https://www.kongregate.com/' },
  { name: 'Games.co.id', icon: '🎲', color: 'from-indigo-500 to-purple-500', url: 'https://www.games.co.id/' },
  { name: 'Y8 Games', icon: '🕹️', color: 'from-teal-500 to-cyan-500', url: 'https://www.y8.com/' },
  { name: 'Friv', icon: '🎪', color: 'from-orange-500 to-red-500', url: 'https://www.friv.com/' },
];

const MORE_GAME_SITES = [
  { name: 'Newgrounds', url: 'https://www.newgrounds.com/games', desc: 'Indie games and animations', icon: '🎨' },
  { name: 'Itch.io', url: 'https://itch.io/', desc: 'Indie game marketplace', icon: '🎁' },
  { name: 'GameJolt', url: 'https://gamejolt.com/', desc: 'Free games community', icon: '⚡' },
  { name: 'Addicting Games', url: 'https://www.addictinggames.com/', desc: 'Classic flash-style games', icon: '🔥' },
  { name: 'Kizi', url: 'https://kizi.com/', desc: 'Fun games for everyone', icon: '🌟' },
  { name: 'Silvergames', url: 'https://www.silvergames.com/', desc: 'Free online games', icon: '🥈' },
  { name: 'GameDistribution', url: 'https://gamedistribution.com/', desc: 'HTML5 games platform', icon: '🌐' },
  { name: 'Games.lol', url: 'https://games.lol/', desc: 'Play PC games online', icon: '💻' },
];

export default function GamesPanel({ isDark, onBack, openExternalLink }) {
  const [gameSearch, setGameSearch] = useState("");

  const filteredPlatforms = GAMING_PLATFORMS.filter(g => 
    g.name.toLowerCase().includes(gameSearch.toLowerCase())
  );
  
  const filteredSites = MORE_GAME_SITES.filter(s => 
    s.name.toLowerCase().includes(gameSearch.toLowerCase())
  );

  return (
    <ScrollArea className="flex-1" data-testid="games-panel">
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Games</h3>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={onBack}
            className="text-[#00a884]"
            data-testid="games-back-btn"
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
        </div>
        
        {/* Search Bar */}
        <div className={`flex items-center gap-2 p-2 rounded-lg mb-4 ${isDark ? 'bg-[#202c33]' : 'bg-gray-100'}`}>
          <Search className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
          <Input 
            placeholder="Search games..."
            value={gameSearch}
            onChange={(e) => setGameSearch(e.target.value)}
            className={`border-0 bg-transparent focus-visible:ring-0 h-8 ${isDark ? 'text-white placeholder:text-gray-500' : ''}`}
            data-testid="games-search"
          />
        </div>
        
        {/* Featured Games */}
        <p className={`text-xs uppercase font-medium mb-3 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Gaming Platforms</p>
        <div className="grid grid-cols-2 gap-3 mb-6">
          {filteredPlatforms.map(game => (
            <motion.div
              key={game.name}
              whileHover={{ scale: 1.05, y: -4 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => openExternalLink(game.url)}
              className={`p-4 rounded-xl cursor-pointer transition-shadow hover:shadow-xl bg-gradient-to-br ${game.color} relative overflow-hidden group`}
              data-testid={`game-${game.name.toLowerCase().replace(/\s/g, '-')}`}
            >
              {/* Shine effect on hover */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              
              <span className="text-3xl mb-2 block">{game.icon}</span>
              <p className="text-white font-medium text-sm">{game.name}</p>
              <div className="flex items-center gap-1 mt-2">
                <Chrome className="w-3 h-3 text-white/80" />
                <span className="text-white/80 text-xs font-medium">Play in Chrome</span>
                <ExternalLink className="w-3 h-3 text-white/80 ml-auto" />
              </div>
            </motion.div>
          ))}
        </div>
        
        {/* More Game Sites */}
        <p className={`text-xs uppercase font-medium mb-3 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>More Gaming Sites</p>
        <div className="space-y-2">
          {filteredSites.map(site => (
            <motion.button
              key={site.name}
              whileHover={{ x: 4 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => openExternalLink(site.url)}
              className={`w-full p-3 rounded-lg text-left transition-colors flex items-center gap-3 ${
                isDark ? 'bg-[#202c33] hover:bg-[#2a3942]' : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              <span className="text-xl">{site.icon}</span>
              <div className="flex-1">
                <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{site.name}</p>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{site.desc}</p>
              </div>
              <div className="flex items-center gap-1">
                <Chrome className={`w-3 h-3 ${isDark ? 'text-blue-400' : 'text-blue-500'}`} />
                <ExternalLink className={`w-4 h-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </ScrollArea>
  );
}
