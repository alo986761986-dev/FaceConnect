import { useState } from "react";
import { motion } from "framer-motion";
import { X, Star, Bell, AlertOctagon, Trash2, ChevronDown, UserPlus, UserCheck, Clock, MessageCircle } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { useSettings } from "@/context/SettingsContext";
import { haptic } from "@/utils/mobile";

const API_URL = process.env.REACT_APP_BACKEND_URL;

/**
 * ContactInfoPanel - Displays contact/chat information in a side panel
 * Shows "Friend Request" button for FaceConnect users only
 */
export default function ContactInfoPanel({ 
  activeChat, 
  isDark, 
  onClose, 
  onReportBlock, 
  onDeleteChat,
  token,
}) {
  const { t } = useSettings();
  const [friendStatus, setFriendStatus] = useState(activeChat?.is_friend ? 'friends' : activeChat?.request_sent ? 'pending' : 'none');
  const [loading, setLoading] = useState(false);

  if (!activeChat) return null;

  // Check if user is a FaceConnect registered user (has user_id)
  const isFaceConnectUser = activeChat.is_faceconnect_user || activeChat.user_id || activeChat.participant_ids;

  // Send friend request
  const handleSendFriendRequest = async () => {
    if (!token || !activeChat.user_id) {
      toast.error("Cannot send friend request");
      return;
    }

    setLoading(true);
    haptic.medium();

    try {
      const response = await fetch(`${API_URL}/api/friends/request?token=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: activeChat.user_id })
      });

      if (response.ok) {
        setFriendStatus('pending');
        toast.success(t('friendRequestSent'));
      } else {
        const error = await response.json();
        toast.error(error.detail || "Failed to send request");
      }
    } catch (error) {
      console.error("Friend request error:", error);
      toast.error("Failed to send friend request");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ x: 400, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 400, opacity: 0 }}
      transition={{ duration: 0.3 }}
      className={`absolute right-0 top-0 bottom-0 w-[320px] z-50 flex flex-col border-l ${
        isDark ? 'bg-[#111b21] border-[#2a2a2a]' : 'bg-white border-gray-200'
      }`}
      data-testid="contact-info-panel"
    >
      {/* Header */}
      <div className={`flex items-center gap-4 px-4 py-3 border-b ${
        isDark ? 'bg-[#202c33] border-[#2a2a2a]' : 'bg-[#f0f2f5] border-gray-200'
      }`}>
        <Button 
          variant="ghost" 
          size="icon" 
          className="rounded-full"
          onClick={onClose}
          data-testid="contact-info-close-btn"
        >
          <X className="w-5 h-5" />
        </Button>
        <h2 className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Contact info
        </h2>
      </div>
      
      <ScrollArea className="flex-1">
        {/* Profile */}
        <div className="text-center py-6">
          <Avatar className="w-24 h-24 mx-auto mb-4">
            <AvatarImage src={activeChat.avatar} />
            <AvatarFallback className="bg-[#00a884] text-white text-3xl">
              {activeChat.name?.charAt(0)?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <h3 className={`text-xl font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {activeChat.name}
          </h3>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            {activeChat.online ? 'online' : 'last seen today'}
          </p>
          
          {/* FaceConnect User Badge */}
          {isFaceConnectUser && (
            <span className="inline-flex items-center gap-1 mt-2 px-2 py-1 text-xs font-medium rounded-full bg-gradient-to-r from-purple-500/20 to-cyan-500/20 text-cyan-400">
              <MessageCircle className="w-3 h-3" />
              {t('faceConnectUser')}
            </span>
          )}
        </div>
        
        {/* Friend Request Button - Only for FaceConnect users */}
        {isFaceConnectUser && (
          <div className="px-4 mb-4">
            {friendStatus === 'friends' ? (
              <div className="flex items-center justify-center gap-2 p-3 rounded-xl bg-green-500/10 text-green-500">
                <UserCheck className="w-5 h-5" />
                <span className="font-medium">{t('friends')}</span>
              </div>
            ) : friendStatus === 'pending' ? (
              <div className="flex items-center justify-center gap-2 p-3 rounded-xl bg-yellow-500/10 text-yellow-500">
                <Clock className="w-5 h-5" />
                <span className="font-medium">{t('pending')}</span>
              </div>
            ) : (
              <Button
                onClick={handleSendFriendRequest}
                disabled={loading}
                className="w-full bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-700 hover:to-cyan-600 text-white font-medium"
                data-testid="send-friend-request-btn"
              >
                <UserPlus className="w-5 h-5 mr-2" />
                {t('sendFriendRequest')}
              </Button>
            )}
          </div>
        )}
        
        {/* About */}
        <div className={`mx-4 p-4 rounded-xl mb-4 ${isDark ? 'bg-[#202c33]' : 'bg-gray-50'}`}>
          <p className={`text-xs font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            About
          </p>
          <p className={isDark ? 'text-white' : 'text-gray-900'}>
            Hey there! I'm using FaceConnect.
          </p>
        </div>
        
        {/* Media */}
        <div className={`mx-4 p-4 rounded-xl mb-4 ${isDark ? 'bg-[#202c33]' : 'bg-gray-50'}`}>
          <div className="flex items-center justify-between mb-3">
            <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Media, links and docs
            </p>
            <ChevronDown className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
          </div>
          <div className="grid grid-cols-3 gap-1">
            {[1, 2, 3].map(i => (
              <div 
                key={i} 
                className={`aspect-square rounded ${isDark ? 'bg-[#2a3942]' : 'bg-gray-200'}`} 
              />
            ))}
          </div>
        </div>
        
        {/* Actions */}
        <div className="px-4 pb-4 space-y-1">
          <button 
            className={`w-full flex items-center gap-3 p-3 rounded-lg ${
              isDark ? 'hover:bg-[#202c33]' : 'hover:bg-gray-100'
            }`}
            data-testid="starred-messages-btn"
          >
            <Star className="w-5 h-5 text-[#00a884]" />
            <span className={isDark ? 'text-white' : 'text-gray-900'}>Starred messages</span>
          </button>
          
          <button 
            className={`w-full flex items-center gap-3 p-3 rounded-lg ${
              isDark ? 'hover:bg-[#202c33]' : 'hover:bg-gray-100'
            }`}
            data-testid="mute-notifications-btn"
          >
            <Bell className="w-5 h-5 text-[#00a884]" />
            <span className={isDark ? 'text-white' : 'text-gray-900'}>Mute notifications</span>
          </button>
          
          <button 
            className="w-full flex items-center gap-3 p-3 rounded-lg text-red-500"
            onClick={onReportBlock}
            data-testid="block-contact-btn"
          >
            <AlertOctagon className="w-5 h-5" />
            <span>Block {activeChat.name}</span>
          </button>
          
          <button 
            className="w-full flex items-center gap-3 p-3 rounded-lg text-red-500"
            onClick={onDeleteChat}
            data-testid="delete-chat-btn"
          >
            <Trash2 className="w-5 h-5" />
            <span>Delete chat</span>
          </button>
        </div>
      </ScrollArea>
    </motion.div>
  );
}
