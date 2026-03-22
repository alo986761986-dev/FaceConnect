import { motion, AnimatePresence } from "framer-motion";
import { 
  MessageCircle, Phone, Circle, Radio, Users, ImageIcon, 
  Gamepad2, Sparkles, Brain, Settings, Moon, Sun, LogOut, Languages 
} from "lucide-react";
import { 
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
  onOpenPopup // New prop for opening popups
}) {
  const sidebarItems = getSidebarItems(unreadCount);

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
    </motion.div>
  );
}
