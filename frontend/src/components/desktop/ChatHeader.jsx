import { motion } from "framer-motion";
import { 
  Phone, Video, Search, MoreVertical, X, UserCircle, CheckSquare,
  Bell, BellOff, Pin, Heart, Timer, Image as ImageIcon, Flag, Eraser, Trash2
} from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * ChatHeader - Header component for active chat view
 * Shows contact info, call buttons, and chat menu
 */
export default function ChatHeader({
  activeChat,
  isDark,
  selectingMessages,
  selectedMessageIds,
  showChatMenu,
  setShowChatMenu,
  chatNotificationsMuted,
  favoriteChats,
  disappearingSettings,
  onVideoCall,
  onVoiceCall,
  onCancelSelection,
  onToggleNotifications,
  onAddToFavorites,
  onCloseChat,
  onShowContactInfo,
  onSelectMessages,
  onShowStarred,
  onShowDisappearing,
  onShowWallpaper,
  onReportBlock,
  onEmptyChat,
  onDeleteChat,
}) {
  if (!activeChat) return null;

  return (
    <motion.div
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className={`flex items-center justify-between px-4 py-3 border-b ${
        isDark ? 'bg-[#202c33] border-[#2a2a2a]' : 'bg-[#f0f2f5] border-gray-200'
      }`}
      data-testid="chat-header"
    >
      <div 
        className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity flex-1 min-w-0"
        onClick={onShowContactInfo}
      >
        <Avatar className="w-10 h-10 ring-2 ring-[#00a884]/20">
          <AvatarImage src={activeChat.avatar} />
          <AvatarFallback className="bg-[#00a884] text-white font-medium">
            {activeChat.name?.charAt(0)?.toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <h3 className={`font-medium truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {activeChat.name}
          </h3>
          <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            {activeChat.online ? 'online' : activeChat.typing ? 'typing...' : 'last seen today'}
          </p>
        </div>
      </div>
      
      <div className="flex items-center gap-1">
        {/* Selection Mode Controls */}
        {selectingMessages && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-2 mr-2"
          >
            <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              {selectedMessageIds.length} selected
            </span>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onCancelSelection}
              className="text-red-500"
            >
              Cancel
            </Button>
          </motion.div>
        )}
        
        {/* Action Buttons */}
        <Button 
          variant="ghost" 
          size="icon" 
          className="rounded-full transition-all hover:scale-110" 
          onClick={onVideoCall} 
          title="Video call"
          data-testid="video-call-btn"
        >
          <Video className="w-5 h-5" />
        </Button>
        <Button 
          variant="ghost" 
          size="icon" 
          className="rounded-full transition-all hover:scale-110" 
          onClick={onVoiceCall} 
          title="Voice call"
          data-testid="voice-call-btn"
        >
          <Phone className="w-5 h-5" />
        </Button>
        <Button 
          variant="ghost" 
          size="icon" 
          className="rounded-full transition-all hover:scale-110"
          title="Search in chat"
          data-testid="search-chat-btn"
        >
          <Search className="w-5 h-5" />
        </Button>
        
        {/* Chat Menu */}
        <DropdownMenu open={showChatMenu} onOpenChange={setShowChatMenu}>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className="rounded-full transition-all hover:scale-110"
              data-testid="chat-menu-button"
            >
              <MoreVertical className="w-5 h-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent 
            align="end" 
            className={`w-56 ${isDark ? 'bg-[#233138] border-[#2a2a2a] text-white' : 'bg-white'}`}
            sideOffset={5}
          >
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15 }}
            >
              <DropdownMenuItem 
                onClick={() => { onShowContactInfo(); setShowChatMenu(false); }}
                className="cursor-pointer"
              >
                <UserCircle className="w-4 h-4 mr-3 text-blue-500" /> Contact info
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={onSelectMessages}
                className="cursor-pointer"
              >
                <CheckSquare className="w-4 h-4 mr-3 text-green-500" /> Select messages
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={onToggleNotifications}
                className="cursor-pointer"
              >
                {chatNotificationsMuted[activeChat?.id] ? (
                  <><Bell className="w-4 h-4 mr-3 text-yellow-500" /> Turn on notifications</>
                ) : (
                  <><BellOff className="w-4 h-4 mr-3 text-yellow-500" /> Turn off notifications</>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => { onShowStarred(); setShowChatMenu(false); }}
                className="cursor-pointer"
              >
                <Pin className="w-4 h-4 mr-3 text-purple-500" /> Pinned messages
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={onAddToFavorites}
                className="cursor-pointer"
              >
                <Heart className={`w-4 h-4 mr-3 ${favoriteChats.includes(activeChat?.id) ? 'text-red-500 fill-red-500' : 'text-red-500'}`} /> 
                {favoriteChats.includes(activeChat?.id) ? 'Remove from favorites' : 'Add to favorites'}
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={onCloseChat}
                className="cursor-pointer"
              >
                <X className="w-4 h-4 mr-3 text-gray-500" /> Close chat
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => { onShowDisappearing(); setShowChatMenu(false); }}
                className="cursor-pointer"
              >
                <Timer className="w-4 h-4 mr-3 text-cyan-500" /> 
                Disappearing messages
                {disappearingSettings[activeChat?.id] && disappearingSettings[activeChat?.id] !== 'off' && (
                  <span className="ml-auto text-xs text-[#00a884]">{disappearingSettings[activeChat?.id]}</span>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => { onShowWallpaper(); setShowChatMenu(false); }}
                className="cursor-pointer"
              >
                <ImageIcon className="w-4 h-4 mr-3 text-pink-500" /> Wallpaper
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={onReportBlock}
                className="cursor-pointer text-orange-500"
              >
                <Flag className="w-4 h-4 mr-3" /> Report & Block
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={onEmptyChat}
                className="cursor-pointer text-amber-500"
              >
                <Eraser className="w-4 h-4 mr-3" /> Empty chat
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={onDeleteChat}
                className="cursor-pointer text-red-500"
              >
                <Trash2 className="w-4 h-4 mr-3" /> Delete chat
              </DropdownMenuItem>
            </motion.div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.div>
  );
}
