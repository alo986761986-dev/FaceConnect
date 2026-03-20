import { motion } from "framer-motion";
import { 
  MessageCircle, Phone, Circle, Radio, Users, ImageIcon, 
  Gamepad2, Sparkles, Brain, Settings, Moon, Sun, LogOut, Languages 
} from "lucide-react";
import { 
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Sidebar item configuration
export const getSidebarItems = (unreadCount) => [
  { id: 'chat', icon: MessageCircle, label: 'Chats', tooltip: 'View and start conversations', badge: unreadCount },
  { id: 'calls', icon: Phone, label: 'Calls', tooltip: 'Make voice and video calls' },
  { id: 'status', icon: Circle, label: 'Status', tooltip: 'View status updates from contacts' },
  { id: 'channels', icon: Radio, label: 'Channels', tooltip: 'Discover and follow channels' },
  { id: 'community', icon: Users, label: 'Community', tooltip: 'Join and create communities' },
  { id: 'media', icon: ImageIcon, label: 'Media', tooltip: 'Browse shared media files' },
  { id: 'games', icon: Gamepad2, label: 'Games', tooltip: 'Play online games' },
  { id: 'translate', icon: Languages, label: 'Translate', tooltip: 'Instant translation & dictionary' },
  { id: 'copilot', icon: Sparkles, label: 'Copilot', tooltip: 'Microsoft Copilot AI Assistant' },
  { id: 'ai', icon: Brain, label: 'AI', tooltip: 'Chat with AI Assistant' },
];

export default function DesktopSidebar({ 
  isDark, 
  activeSidebarTab, 
  setActiveSidebarTab,
  unreadCount,
  onAloClick,
  showAlo,
  setShowSettings,
  showSettings,
  toggleTheme,
  logout
}) {
  const sidebarItems = getSidebarItems(unreadCount);

  return (
    <div className={`w-[72px] flex flex-col border-r ${isDark ? 'bg-[#202c33] border-[#2a2a2a]' : 'bg-[#f0f2f5] border-gray-200'}`}>
      {/* App Logo */}
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="p-3 flex justify-center cursor-pointer">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00a884] to-[#0088cc] flex items-center justify-center hover:scale-105 transition-transform">
              <span className="text-white font-bold text-lg">FC</span>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="right" className="bg-gray-900 text-white">
          <p>FaceConnect - Your Social Hub</p>
        </TooltipContent>
      </Tooltip>
      
      {/* Main Navigation */}
      <div className="flex-1 py-2">
        <div className="space-y-1 px-2">
          {sidebarItems.map((item) => (
            <Tooltip key={item.id}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setActiveSidebarTab(item.id)}
                  className={`w-full p-3 rounded-xl flex flex-col items-center gap-1 transition-all relative group ${
                    activeSidebarTab === item.id
                      ? 'bg-[#00a884] text-white'
                      : isDark 
                        ? 'text-gray-400 hover:bg-[#2a3942] hover:text-white' 
                        : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'
                  }`}
                  data-testid={`sidebar-${item.id}`}
                >
                  <item.icon className="w-5 h-5" />
                  {item.badge > 0 && (
                    <span className="absolute top-1 right-1 w-5 h-5 bg-[#25d366] text-white text-xs font-bold rounded-full flex items-center justify-center">
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                  <span className="text-[10px] font-medium truncate w-full text-center">{item.label}</span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="bg-gray-900 text-white">
                <p className="font-medium">{item.label}</p>
                <p className="text-xs text-gray-400">{item.tooltip}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </div>
      
      {/* Settings at bottom */}
      <div className="p-2 space-y-2">
        {/* ALO Voice Assistant Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <motion.button
              onClick={onAloClick}
              className={`w-full p-2 rounded-xl flex flex-col items-center gap-1 transition-all relative overflow-hidden group ${
                showAlo
                  ? 'bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/30'
                  : isDark 
                    ? 'text-gray-400 hover:text-white' 
                    : 'text-gray-600 hover:text-gray-900'
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              data-testid="alo-button"
            >
              {/* 3D Icon Image */}
              <div className="relative w-8 h-8 flex items-center justify-center">
                <img 
                  src="/alo-icon-3d.png" 
                  alt="ALO"
                  className={`w-8 h-8 object-contain transition-all duration-500 ${
                    showAlo ? 'drop-shadow-lg scale-110' : 'opacity-80 group-hover:opacity-100'
                  }`}
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
                <div 
                  className="hidden w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 items-center justify-center"
                >
                  <span className="text-white text-xs font-bold">ALO</span>
                </div>
              </div>
              
              {/* ALO Text */}
              <span className="text-[10px] font-medium">ALO</span>
              
              {/* Active indicator */}
              {showAlo && (
                <motion.div 
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 bg-white rounded-full"
                  animate={{ scale: [1, 1.5, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                />
              )}
            </motion.button>
          </TooltipTrigger>
          <TooltipContent side="right" className="bg-gray-900 text-white">
            <p className="font-medium">ALO Voice Assistant</p>
            <p className="text-xs text-gray-400">Gemini & Copilot powered AI assistant</p>
          </TooltipContent>
        </Tooltip>

        {/* Settings Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`w-full p-3 rounded-xl flex flex-col items-center gap-1 transition-all ${
                showSettings
                  ? 'bg-[#00a884] text-white'
                  : isDark 
                    ? 'text-gray-400 hover:bg-[#2a3942] hover:text-white' 
                    : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'
              }`}
              data-testid="sidebar-settings"
            >
              <Settings className="w-5 h-5" />
              <span className="text-[10px] font-medium">Settings</span>
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="bg-gray-900 text-white">
            <p className="font-medium">Settings</p>
            <p className="text-xs text-gray-400">Configure your preferences</p>
          </TooltipContent>
        </Tooltip>

        {/* Theme Toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={toggleTheme}
              className={`w-full p-3 rounded-xl flex flex-col items-center gap-1 transition-all ${
                isDark 
                  ? 'text-gray-400 hover:bg-[#2a3942] hover:text-white' 
                  : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'
              }`}
              data-testid="theme-toggle"
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              <span className="text-[10px] font-medium">{isDark ? 'Light' : 'Dark'}</span>
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="bg-gray-900 text-white">
            <p className="font-medium">Toggle Theme</p>
            <p className="text-xs text-gray-400">Switch between light and dark mode</p>
          </TooltipContent>
        </Tooltip>

        {/* Logout Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={logout}
              className={`w-full p-3 rounded-xl flex flex-col items-center gap-1 transition-all ${
                isDark 
                  ? 'text-gray-400 hover:bg-red-500/20 hover:text-red-400' 
                  : 'text-gray-600 hover:bg-red-50 hover:text-red-500'
              }`}
              data-testid="logout-button"
            >
              <LogOut className="w-5 h-5" />
              <span className="text-[10px] font-medium">Logout</span>
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="bg-gray-900 text-white">
            <p className="font-medium">Logout</p>
            <p className="text-xs text-gray-400">Sign out of your account</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
