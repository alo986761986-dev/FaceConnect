import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Archive } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

/**
 * ArchivedChatsPanel - Panel showing archived conversations
 * Extracted from WhatsAppDesktopLayout.jsx for maintainability
 */
export default function ArchivedChatsPanel({
  isDark,
  archivedChats,
  onClose,
  onSelectChat,
  onUnarchiveChat,
}) {
  return (
    <motion.div
      initial={{ x: -400, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -400, opacity: 0 }}
      className={`absolute left-0 top-0 bottom-0 w-[400px] z-50 flex flex-col ${
        isDark ? 'bg-[#111b21]' : 'bg-white'
      }`}
      data-testid="archived-panel"
    >
      {/* Header */}
      <div className={`flex items-center gap-6 px-6 py-4 ${
        isDark ? 'bg-[#202c33]' : 'bg-[#00a884]'
      }`}>
        <Button 
          variant="ghost" 
          size="icon" 
          className="rounded-full text-white hover:bg-white/10"
          onClick={onClose}
          data-testid="archived-back-btn"
        >
          <ArrowLeft className="w-6 h-6" />
        </Button>
        <h2 className="text-xl font-medium text-white">
          Archived ({archivedChats.length})
        </h2>
      </div>
      
      <ScrollArea className="flex-1">
        {archivedChats.length === 0 ? (
          <div className={`flex flex-col items-center justify-center h-64 ${
            isDark ? 'text-gray-400' : 'text-gray-500'
          }`}>
            <Archive className="w-16 h-16 mb-4 opacity-50" />
            <p className="text-lg font-medium">No archived chats</p>
            <p className="text-sm text-center px-8 mt-2">
              Archive chats to hide them from your chat list without deleting them
            </p>
          </div>
        ) : (
          archivedChats.map(chat => (
            <div 
              key={chat.id}
              className={`flex items-center gap-3 px-4 py-3 cursor-pointer border-b ${
                isDark 
                  ? 'border-[#2a2a2a] hover:bg-[#202c33]' 
                  : 'border-gray-100 hover:bg-gray-50'
              }`}
            >
              <Avatar 
                className="w-12 h-12" 
                onClick={() => onSelectChat(chat)}
              >
                <AvatarImage src={chat.avatar} />
                <AvatarFallback className="bg-[#00a884] text-white">
                  {chat.name?.charAt(0)?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div 
                className="flex-1 min-w-0" 
                onClick={() => onSelectChat(chat)}
              >
                <p className={`font-medium truncate ${
                  isDark ? 'text-white' : 'text-gray-900'
                }`}>
                  {chat.name}
                </p>
                <p className={`text-sm truncate ${
                  isDark ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  {chat.last_message?.content || "Archived chat"}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full"
                onClick={(e) => { 
                  e.stopPropagation(); 
                  onUnarchiveChat(chat.id); 
                }}
                title="Unarchive"
                data-testid={`unarchive-${chat.id}`}
              >
                <Archive className={`w-4 h-4 ${
                  isDark ? 'text-gray-400' : 'text-gray-500'
                }`} />
              </Button>
            </div>
          ))
        )}
      </ScrollArea>
    </motion.div>
  );
}
