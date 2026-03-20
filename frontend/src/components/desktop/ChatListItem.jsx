import { motion } from "framer-motion";
import { Check, CheckCheck, Clock, Pin, BellOff } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

// WhatsApp-style Chat List Item
export default function ChatListItem({ chat, isActive, onClick, isDark }) {
  const getStatusIcon = (status) => {
    switch (status) {
      case 'sent': return <Check className="w-4 h-4 text-gray-400" />;
      case 'delivered': return <CheckCheck className="w-4 h-4 text-gray-400" />;
      case 'read': return <CheckCheck className="w-4 h-4 text-[#53bdeb]" />;
      default: return <Clock className="w-3 h-3 text-gray-400" />;
    }
  };

  return (
    <motion.div
      whileHover={{ backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-3 cursor-pointer border-b ${
        isDark ? 'border-[#2a2a2a]' : 'border-gray-100'
      } ${isActive ? (isDark ? 'bg-[#2a3942]' : 'bg-[#f0f2f5]') : ''}`}
      data-testid={`chat-item-${chat.id}`}
    >
      <div className="relative">
        <Avatar className="w-12 h-12">
          <AvatarImage src={chat.avatar} />
          <AvatarFallback className={`${isDark ? 'bg-[#2a3942] text-white' : 'bg-gray-200'}`}>
            {chat.name?.charAt(0)?.toUpperCase()}
          </AvatarFallback>
        </Avatar>
        {chat.online && (
          <div className="absolute bottom-0 right-0 w-3 h-3 bg-[#25d366] rounded-full border-2 border-white" />
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className={`font-medium truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {chat.name}
          </span>
          <span className={`text-xs ${chat.unread > 0 ? 'text-[#25d366]' : (isDark ? 'text-gray-500' : 'text-gray-400')}`}>
            {chat.time}
          </span>
        </div>
        <div className="flex items-center justify-between mt-0.5">
          <div className="flex items-center gap-1 flex-1 min-w-0">
            {chat.isMe && getStatusIcon(chat.status)}
            <span className={`text-sm truncate ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              {chat.typing ? (
                <span className="text-[#25d366]">typing...</span>
              ) : (
                chat.lastMessage
              )}
            </span>
          </div>
          {chat.unread > 0 && (
            <span className="ml-2 px-2 py-0.5 text-xs font-medium text-white bg-[#25d366] rounded-full">
              {chat.unread}
            </span>
          )}
          {chat.pinned && !chat.unread && (
            <Pin className="w-4 h-4 text-gray-400 ml-2" />
          )}
          {chat.muted && (
            <BellOff className="w-4 h-4 text-gray-400 ml-1" />
          )}
        </div>
      </div>
    </motion.div>
  );
}
