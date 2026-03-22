import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  MessageCircle, Phone, Circle, Radio, Users, ImageIcon, 
  Gamepad2, Sparkles, Brain, Settings, Moon, Sun, LogOut, Languages,
  Share2, ExternalLink, ArrowLeft, X, Chrome, Music, Maximize2, Minimize2
} from "lucide-react";
import { 
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";

// Social media links
const socialLinks = [
  { name: 'Facebook', url: 'https://www.facebook.com', color: '#1877F2', icon: (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  )},
  { name: 'Instagram', url: 'https://www.instagram.com', color: '#E4405F', icon: (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
    </svg>
  )},
  { name: 'TikTok', url: 'https://www.tiktok.com', color: '#000000', icon: (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
    </svg>
  )},
  { name: 'WhatsApp', url: 'https://web.whatsapp.com', color: '#25D366', icon: (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  )},
  { name: 'YouTube', url: 'https://www.youtube.com', color: '#FF0000', icon: (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
    </svg>
  )},
  { name: 'Telegram', url: 'https://web.telegram.org', color: '#0088cc', icon: (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
    </svg>
  )},
];

// Spotify Icon SVG
const SpotifyIcon = ({ className = "w-6 h-6" }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
  </svg>
);

// Sidebar item configuration with badges
export const getSidebarItems = (unreadCount = 0) => [
  { id: 'chat', icon: MessageCircle, label: 'Chats', tooltip: 'View and start conversations', badge: unreadCount },
  { id: 'calls', icon: Phone, label: 'Calls', tooltip: 'Make voice and video calls', badge: 2 },
  { id: 'status', icon: Circle, label: 'Status', tooltip: 'View status updates', badge: 5 },
  { id: 'channels', icon: Radio, label: 'Channels', tooltip: 'Discover channels', badge: 3 },
  { id: 'community', icon: Users, label: 'Community', tooltip: 'Join communities', badge: 1 },
  { id: 'media', icon: ImageIcon, label: 'Media', tooltip: 'Browse media files', badge: 0 },
  { id: 'games', icon: Gamepad2, label: 'Games', tooltip: 'Play games', badge: 2 },
  { id: 'translate', icon: Languages, label: 'Translate', tooltip: 'Translation & dictionary', badge: 0 },
  { id: 'copilot', icon: Sparkles, label: 'Copilot', tooltip: 'Microsoft Copilot AI', badge: 1 },
  { id: 'ai', icon: Brain, label: 'AI', tooltip: 'AI Assistant', badge: 0 },
];

// 3D Button Animation Variants
const buttonVariants = {
  initial: { 
    opacity: 0, 
    x: -20,
    rotateY: -15,
    scale: 0.9
  },
  animate: (i) => ({ 
    opacity: 1, 
    x: 0,
    rotateY: 0,
    scale: 1,
    transition: { 
      delay: i * 0.05,
      duration: 0.4,
      ease: [0.25, 0.46, 0.45, 0.94]
    }
  }),
  hover: { 
    scale: 1.08,
    rotateY: 8,
    z: 20,
    transition: { 
      duration: 0.2,
      ease: "easeOut"
    }
  },
  tap: { 
    scale: 0.95,
    rotateY: 0,
  }
};

export default function DesktopSidebar({ 
  isDark, 
  activeSidebarTab, 
  setActiveSidebarTab,
  unreadCount = 0,
  onAloClick,
  showAlo,
  setShowSettings,
  showSettings,
  toggleTheme,
  logout,
  onOpenPopup,
  openExternalLink // For opening external links
}) {
  const sidebarItems = getSidebarItems(unreadCount);
  const [showSocialPopup, setShowSocialPopup] = useState(false);
  const [showSpotifyPopup, setShowSpotifyPopup] = useState(false);
  const [isSpotifyMaximized, setIsSpotifyMaximized] = useState(false);

  const handleItemClick = (itemId) => {
    // All items open as popups in the main window
    if (onOpenPopup) {
      onOpenPopup(itemId);
    }
    setActiveSidebarTab(itemId);
  };

  return (
    <motion.div 
      className={`w-[72px] flex flex-col border-r ${isDark ? 'bg-[#202c33] border-[#2a2a2a]' : 'bg-[#f0f2f5] border-gray-200'}`}
      initial={{ x: -72, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      style={{ perspective: 1000 }}
    >
      {/* App Logo with 3D effect */}
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.div 
            className="p-3 flex justify-center cursor-pointer"
            initial={{ opacity: 0, scale: 0.5, rotateY: -90 }}
            animate={{ opacity: 1, scale: 1, rotateY: 0 }}
            transition={{ delay: 0.2, duration: 0.5, ease: "easeOut" }}
          >
            <motion.div 
              className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#00a884] via-[#00d4aa] to-[#0088cc] flex items-center justify-center shadow-lg"
              whileHover={{ 
                scale: 1.1, 
                rotateY: 15,
                boxShadow: '0 10px 30px rgba(0, 168, 132, 0.4)'
              }}
              whileTap={{ scale: 0.95 }}
              style={{ transformStyle: 'preserve-3d' }}
            >
              <span className="text-white font-bold text-lg">FC</span>
              {/* Shine effect */}
              <motion.div
                className="absolute inset-0 rounded-xl bg-gradient-to-tr from-transparent via-white/20 to-transparent"
                animate={{ x: ['-100%', '200%'] }}
                transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 2 }}
              />
            </motion.div>
          </motion.div>
        </TooltipTrigger>
        <TooltipContent side="right" className="bg-gray-900 text-white">
          <p>FaceConnect</p>
        </TooltipContent>
      </Tooltip>
      
      {/* Large Social Media Button */}
      <div className="px-2 py-3">
        <Tooltip>
          <TooltipTrigger asChild>
            <motion.button
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, duration: 0.4 }}
              whileHover={{ 
                scale: 1.05, 
                rotateY: 8,
                boxShadow: '0 15px 40px rgba(236, 72, 153, 0.4)'
              }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowSocialPopup(true)}
              className={`w-full p-4 rounded-2xl flex flex-col items-center gap-2 transition-all relative overflow-hidden ${
                isDark 
                  ? 'bg-gradient-to-br from-pink-600/30 via-purple-600/30 to-blue-600/30 border border-pink-500/30' 
                  : 'bg-gradient-to-br from-pink-100 via-purple-100 to-blue-100 border border-pink-200'
              }`}
              style={{ transformStyle: 'preserve-3d' }}
              data-testid="social-media-btn"
            >
              {/* Animated gradient background */}
              <motion.div
                className="absolute inset-0 opacity-50"
                animate={{
                  background: [
                    'linear-gradient(45deg, rgba(236,72,153,0.3), rgba(139,92,246,0.3), rgba(59,130,246,0.3))',
                    'linear-gradient(90deg, rgba(139,92,246,0.3), rgba(59,130,246,0.3), rgba(236,72,153,0.3))',
                    'linear-gradient(135deg, rgba(59,130,246,0.3), rgba(236,72,153,0.3), rgba(139,92,246,0.3))',
                    'linear-gradient(45deg, rgba(236,72,153,0.3), rgba(139,92,246,0.3), rgba(59,130,246,0.3))',
                  ]
                }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
              />
              
              {/* Icon with glow */}
              <motion.div
                className="relative z-10"
                animate={{ 
                  textShadow: [
                    '0 0 10px rgba(236,72,153,0.5)',
                    '0 0 20px rgba(139,92,246,0.5)',
                    '0 0 10px rgba(59,130,246,0.5)',
                    '0 0 10px rgba(236,72,153,0.5)',
                  ]
                }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Share2 className={`w-7 h-7 ${isDark ? 'text-pink-400' : 'text-pink-600'}`} />
              </motion.div>
              
              <span className={`text-xs font-bold relative z-10 ${isDark ? 'text-white' : 'text-gray-800'}`}>
                Social
              </span>
              
              {/* Shine effect */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent"
                animate={{ x: ['-100%', '200%'] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              />
            </motion.button>
          </TooltipTrigger>
          <TooltipContent side="right" className="bg-gray-900 text-white">
            <p className="font-medium text-pink-400">Social Media</p>
            <p className="text-xs text-gray-400">Connect with social platforms</p>
          </TooltipContent>
        </Tooltip>
      </div>
      
      {/* Spotify Button */}
      <div className="px-2 pb-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <motion.button
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.35, duration: 0.4 }}
              whileHover={{ 
                scale: 1.05, 
                rotateY: 8,
                boxShadow: '0 15px 40px rgba(30, 215, 96, 0.4)'
              }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowSpotifyPopup(true)}
              className={`w-full p-4 rounded-2xl flex flex-col items-center gap-2 transition-all relative overflow-hidden ${
                isDark 
                  ? 'bg-gradient-to-br from-[#1DB954]/30 via-[#191414]/50 to-[#1DB954]/20 border border-[#1DB954]/40' 
                  : 'bg-gradient-to-br from-[#1DB954]/20 via-white to-[#1DB954]/10 border border-[#1DB954]/30'
              }`}
              style={{ transformStyle: 'preserve-3d' }}
              data-testid="spotify-btn"
            >
              {/* Animated pulse background */}
              <motion.div
                className="absolute inset-0 opacity-30"
                animate={{
                  background: [
                    'radial-gradient(circle at 30% 30%, rgba(30,215,96,0.4), transparent 60%)',
                    'radial-gradient(circle at 70% 70%, rgba(30,215,96,0.4), transparent 60%)',
                    'radial-gradient(circle at 30% 70%, rgba(30,215,96,0.4), transparent 60%)',
                    'radial-gradient(circle at 30% 30%, rgba(30,215,96,0.4), transparent 60%)',
                  ]
                }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              />
              
              {/* Spotify Icon */}
              <motion.div
                className="relative z-10"
                animate={{ 
                  filter: [
                    'drop-shadow(0 0 8px rgba(30,215,96,0.5))',
                    'drop-shadow(0 0 15px rgba(30,215,96,0.8))',
                    'drop-shadow(0 0 8px rgba(30,215,96,0.5))',
                  ]
                }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <SpotifyIcon className={`w-7 h-7 ${isDark ? 'text-[#1DB954]' : 'text-[#1DB954]'}`} />
              </motion.div>
              
              <span className={`text-xs font-bold relative z-10 ${isDark ? 'text-white' : 'text-gray-800'}`}>
                Spotify
              </span>
              
              {/* Shine effect */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-tr from-transparent via-[#1DB954]/20 to-transparent"
                animate={{ x: ['-100%', '200%'] }}
                transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 2 }}
              />
            </motion.button>
          </TooltipTrigger>
          <TooltipContent side="right" className="bg-gray-900 text-white">
            <p className="font-medium text-[#1DB954]">Spotify</p>
            <p className="text-xs text-gray-400">Open Spotify Web Player</p>
          </TooltipContent>
        </Tooltip>
      </div>
      
      {/* Main Navigation with 3D animations */}
      <div className="flex-1 py-2 overflow-hidden">
        <div className="space-y-1 px-2" style={{ perspective: 800 }}>
          {sidebarItems.map((item, index) => (
            <Tooltip key={item.id}>
              <TooltipTrigger asChild>
                <motion.button
                  custom={index}
                  variants={buttonVariants}
                  initial="initial"
                  animate="animate"
                  whileHover="hover"
                  whileTap="tap"
                  onClick={() => handleItemClick(item.id)}
                  className={`w-full p-3 rounded-xl flex flex-col items-center gap-1 transition-colors relative group ${
                    activeSidebarTab === item.id
                      ? 'bg-[#00a884] text-white shadow-lg'
                      : isDark 
                        ? 'text-gray-400 hover:bg-[#2a3942] hover:text-white' 
                        : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'
                  }`}
                  style={{ transformStyle: 'preserve-3d' }}
                  data-testid={`sidebar-${item.id}`}
                >
                  {/* Icon with glow effect on active */}
                  <motion.div
                    animate={activeSidebarTab === item.id ? {
                      textShadow: ['0 0 8px rgba(255,255,255,0.5)', '0 0 15px rgba(255,255,255,0.8)', '0 0 8px rgba(255,255,255,0.5)']
                    } : {}}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <item.icon className="w-5 h-5" />
                  </motion.div>
                  
                  {/* Badge with pop animation */}
                  <AnimatePresence>
                    {item.badge > 0 && (
                      <motion.span 
                        className="absolute top-1 right-1 w-5 h-5 bg-[#25d366] text-white text-xs font-bold rounded-full flex items-center justify-center shadow-md"
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 500, damping: 25 }}
                      >
                        {item.badge > 99 ? '99+' : item.badge}
                      </motion.span>
                    )}
                  </AnimatePresence>
                  
                  <span className="text-[10px] font-medium truncate w-full text-center">
                    {item.label}
                  </span>
                  
                  {/* Active indicator */}
                  {activeSidebarTab === item.id && (
                    <motion.div
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full"
                      layoutId="activeIndicator"
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  )}
                </motion.button>
              </TooltipTrigger>
              <TooltipContent side="right" className="bg-gray-900 text-white">
                <p>{item.tooltip}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </div>
      
      {/* Bottom Actions with 3D effects */}
      <div className="p-2 space-y-1 border-t border-[#2a2a2a]/50">
        {/* Settings */}
        <Tooltip>
          <TooltipTrigger asChild>
            <motion.button
              whileHover={{ scale: 1.1, rotateY: 10 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowSettings?.(true)}
              className={`w-full p-3 rounded-xl flex flex-col items-center gap-1 transition-all ${
                showSettings 
                  ? 'bg-[#00a884] text-white' 
                  : isDark 
                    ? 'text-gray-400 hover:bg-[#2a3942] hover:text-white' 
                    : 'text-gray-600 hover:bg-gray-200'
              }`}
              style={{ transformStyle: 'preserve-3d' }}
              data-testid="sidebar-settings"
            >
              <motion.div
                animate={{ rotate: showSettings ? 180 : 0 }}
                transition={{ duration: 0.3 }}
              >
                <Settings className="w-5 h-5" />
              </motion.div>
              <span className="text-[10px]">Settings</span>
            </motion.button>
          </TooltipTrigger>
          <TooltipContent side="right" className="bg-gray-900 text-white">
            <p>Settings & Preferences</p>
          </TooltipContent>
        </Tooltip>
        
        {/* Theme Toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <motion.button
              whileHover={{ scale: 1.1, rotateY: 10 }}
              whileTap={{ scale: 0.95 }}
              onClick={toggleTheme}
              className={`w-full p-3 rounded-xl flex flex-col items-center gap-1 transition-all ${
                isDark 
                  ? 'text-gray-400 hover:bg-[#2a3942] hover:text-yellow-400' 
                  : 'text-gray-600 hover:bg-gray-200 hover:text-blue-600'
              }`}
              style={{ transformStyle: 'preserve-3d' }}
              data-testid="sidebar-theme"
            >
              <motion.div
                animate={{ rotate: isDark ? 0 : 180 }}
                transition={{ duration: 0.5 }}
              >
                {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </motion.div>
              <span className="text-[10px]">{isDark ? 'Light' : 'Dark'}</span>
            </motion.button>
          </TooltipTrigger>
          <TooltipContent side="right" className="bg-gray-900 text-white">
            <p>Toggle {isDark ? 'Light' : 'Dark'} Mode</p>
          </TooltipContent>
        </Tooltip>
        
        {/* Logout */}
        <Tooltip>
          <TooltipTrigger asChild>
            <motion.button
              whileHover={{ scale: 1.1, rotateY: 10, color: '#ef4444' }}
              whileTap={{ scale: 0.95 }}
              onClick={logout}
              className={`w-full p-3 rounded-xl flex flex-col items-center gap-1 transition-all ${
                isDark 
                  ? 'text-gray-400 hover:bg-red-500/20' 
                  : 'text-gray-600 hover:bg-red-50'
              }`}
              style={{ transformStyle: 'preserve-3d' }}
              data-testid="sidebar-logout"
            >
              <LogOut className="w-5 h-5" />
              <span className="text-[10px]">Logout</span>
            </motion.button>
          </TooltipTrigger>
          <TooltipContent side="right" className="bg-gray-900 text-white">
            <p>Sign Out</p>
          </TooltipContent>
        </Tooltip>
      </div>
      
      {/* Social Media Popup */}
      <AnimatePresence>
        {showSocialPopup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center"
            onClick={() => setShowSocialPopup(false)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 30 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className={`w-96 rounded-3xl shadow-2xl overflow-hidden ${
                isDark ? 'bg-[#1a2328] border border-[#2a3942]' : 'bg-white border border-gray-200'
              }`}
            >
              {/* Header */}
              <div className={`flex items-center justify-between px-5 py-4 border-b ${
                isDark ? 'bg-gradient-to-r from-pink-600/20 via-purple-600/20 to-blue-600/20 border-[#2a3942]' : 'bg-gradient-to-r from-pink-50 via-purple-50 to-blue-50 border-gray-200'
              }`}>
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowSocialPopup(false)}
                    className={`h-9 w-9 rounded-full ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-200'}`}
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </Button>
                  <h4 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Social Media
                  </h4>
                </div>
                <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-blue-500/20">
                  <Chrome className="w-4 h-4 text-blue-400" />
                  <span className="text-xs text-blue-400 font-medium">Browser</span>
                </div>
              </div>
              
              {/* Social Links Grid */}
              <div className="p-4 grid grid-cols-3 gap-3">
                {socialLinks.map((social, index) => (
                  <motion.button
                    key={social.name}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ 
                      scale: 1.08, 
                      y: -5,
                      boxShadow: `0 10px 30px ${social.color}40`
                    }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      if (openExternalLink) openExternalLink(social.url);
                      else window.open(social.url, '_blank');
                      setShowSocialPopup(false);
                    }}
                    className={`flex flex-col items-center gap-2 p-4 rounded-2xl transition-all ${
                      isDark ? 'bg-[#233138] hover:bg-[#2a3942]' : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                    style={{ transformStyle: 'preserve-3d' }}
                  >
                    <span style={{ color: social.color }}>{social.icon}</span>
                    <span className={`text-xs font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {social.name}
                    </span>
                  </motion.button>
                ))}
              </div>

              {/* Close Button */}
              <div className={`px-4 py-4 border-t ${isDark ? 'border-[#2a3942]' : 'border-gray-200'}`}>
                <Button
                  variant="outline"
                  className={`w-full rounded-xl h-11 ${isDark ? 'border-gray-600 hover:bg-white/10' : ''}`}
                  onClick={() => setShowSocialPopup(false)}
                >
                  <X className="w-4 h-4 mr-2" />
                  Close
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Spotify Popup Window */}
      <AnimatePresence>
        {showSpotifyPopup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-md z-[100] flex items-center justify-center p-4"
            onClick={() => setShowSpotifyPopup(false)}
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0, y: 50, rotateX: -15 }}
              animate={{ 
                scale: isSpotifyMaximized ? 1 : 0.95, 
                opacity: 1, 
                y: 0, 
                rotateX: 0,
                width: isSpotifyMaximized ? '100%' : '90%',
                height: isSpotifyMaximized ? '100%' : '85%',
              }}
              exit={{ scale: 0.5, opacity: 0, y: 50, rotateX: 15 }}
              transition={{ 
                type: "spring", 
                damping: 25, 
                stiffness: 300,
                duration: 0.4 
              }}
              onClick={(e) => e.stopPropagation()}
              className={`relative rounded-3xl shadow-2xl overflow-hidden flex flex-col ${
                isDark ? 'bg-[#121212]' : 'bg-[#121212]'
              }`}
              style={{ 
                maxWidth: isSpotifyMaximized ? '100%' : '1200px',
                maxHeight: isSpotifyMaximized ? '100%' : '800px',
                transformStyle: 'preserve-3d',
                perspective: 1000
              }}
            >
              {/* Spotify Header Bar */}
              <motion.div 
                className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-[#1DB954] via-[#1ed760] to-[#1DB954]"
                initial={{ y: -50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.3 }}
              >
                <div className="flex items-center gap-3">
                  <motion.div
                    animate={{ rotate: [0, 360] }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                  >
                    <SpotifyIcon className="w-7 h-7 text-white" />
                  </motion.div>
                  <div>
                    <h4 className="text-white font-bold text-lg">Spotify</h4>
                    <p className="text-white/70 text-xs">Web Player - FaceConnect</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {/* Maximize/Minimize Button */}
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setIsSpotifyMaximized(!isSpotifyMaximized)}
                    className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
                    title={isSpotifyMaximized ? "Restore" : "Maximize"}
                  >
                    {isSpotifyMaximized ? (
                      <Minimize2 className="w-4 h-4" />
                    ) : (
                      <Maximize2 className="w-4 h-4" />
                    )}
                  </motion.button>
                  
                  {/* Open in Browser */}
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => {
                      if (openExternalLink) openExternalLink('https://open.spotify.com');
                      else window.open('https://open.spotify.com', '_blank');
                    }}
                    className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
                    title="Open in Browser"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </motion.button>
                  
                  {/* Close Button */}
                  <motion.button
                    whileHover={{ scale: 1.1, backgroundColor: 'rgba(255,255,255,0.3)' }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setShowSpotifyPopup(false)}
                    className="p-2 rounded-full bg-white/20 hover:bg-red-500 text-white transition-colors"
                    title="Close"
                  >
                    <X className="w-4 h-4" />
                  </motion.button>
                </div>
              </motion.div>
              
              {/* Spotify Web Player iframe */}
              <motion.div 
                className="flex-1 bg-[#121212] relative"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.5 }}
              >
                {/* Loading animation */}
                <motion.div
                  className="absolute inset-0 flex items-center justify-center bg-[#121212] z-10"
                  initial={{ opacity: 1 }}
                  animate={{ opacity: 0 }}
                  transition={{ delay: 1.5, duration: 0.5 }}
                  style={{ pointerEvents: 'none' }}
                >
                  <div className="flex flex-col items-center gap-4">
                    <motion.div
                      animate={{ 
                        scale: [1, 1.2, 1],
                        rotate: [0, 180, 360]
                      }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    >
                      <SpotifyIcon className="w-16 h-16 text-[#1DB954]" />
                    </motion.div>
                    <motion.div
                      className="flex gap-1"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5 }}
                    >
                      {[0, 1, 2].map((i) => (
                        <motion.div
                          key={i}
                          className="w-2 h-2 bg-[#1DB954] rounded-full"
                          animate={{ y: [0, -10, 0] }}
                          transition={{ 
                            duration: 0.6, 
                            repeat: Infinity, 
                            delay: i * 0.15 
                          }}
                        />
                      ))}
                    </motion.div>
                    <p className="text-white/60 text-sm">Loading Spotify...</p>
                  </div>
                </motion.div>
                
                <iframe
                  src="https://open.spotify.com"
                  className="w-full h-full border-0"
                  title="Spotify Web Player"
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  loading="lazy"
                />
              </motion.div>
              
              {/* Bottom glow effect */}
              <motion.div
                className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-[#1DB954] via-[#1ed760] to-[#1DB954]"
                animate={{
                  opacity: [0.5, 1, 0.5],
                  scaleX: [0.8, 1, 0.8]
                }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
