import { motion } from "framer-motion";
import { ArrowLeft, Star } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

/**
 * StarredMessagesPanel - Panel showing starred/pinned messages
 * Extracted from WhatsAppDesktopLayout.jsx for maintainability
 */
export default function StarredMessagesPanel({
  isDark,
  starredMessages,
  onClose,
  onUnstarMessage,
}) {
  return (
    <motion.div
      initial={{ x: -400, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -400, opacity: 0 }}
      className={`absolute left-0 top-0 bottom-0 w-[400px] z-50 flex flex-col ${
        isDark ? 'bg-[#111b21]' : 'bg-white'
      }`}
      data-testid="starred-panel"
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
          data-testid="starred-back-btn"
        >
          <ArrowLeft className="w-6 h-6" />
        </Button>
        <h2 className="text-xl font-medium text-white">
          Starred Messages ({starredMessages.length})
        </h2>
      </div>
      
      <ScrollArea className="flex-1">
        {starredMessages.length === 0 ? (
          <div className={`flex flex-col items-center justify-center h-64 ${
            isDark ? 'text-gray-400' : 'text-gray-500'
          }`}>
            <Star className="w-16 h-16 mb-4 opacity-50" />
            <p className="text-lg font-medium">No starred messages</p>
            <p className="text-sm text-center px-8 mt-2">
              Tap and hold on any message to star it, so you can easily find it later
            </p>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {starredMessages.map(msg => (
              <div 
                key={msg.id}
                className={`p-4 rounded-xl transition-colors ${
                  isDark 
                    ? 'bg-[#202c33] hover:bg-[#2a3942]' 
                    : 'bg-gray-50 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={msg.sender_avatar} />
                    <AvatarFallback className="bg-[#00a884] text-white text-xs">
                      {msg.from?.charAt(0)?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <span className={`text-sm font-medium ${
                      isDark ? 'text-white' : 'text-gray-900'
                    }`}>
                      {msg.from}
                    </span>
                    <p className={`text-xs ${
                      isDark ? 'text-gray-500' : 'text-gray-400'
                    }`}>
                      {msg.date 
                        ? new Date(msg.date).toLocaleDateString([], { 
                            month: 'short', 
                            day: 'numeric', 
                            year: 'numeric' 
                          }) 
                        : ''
                      }
                    </p>
                  </div>
                  <button 
                    onClick={() => onUnstarMessage(msg.id)}
                    className="p-1 hover:bg-white/10 rounded-full"
                    title="Unstar message"
                    data-testid={`unstar-${msg.id}`}
                  >
                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                  </button>
                </div>
                <p className={`text-sm ${
                  isDark ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  {msg.text}
                </p>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </motion.div>
  );
}
