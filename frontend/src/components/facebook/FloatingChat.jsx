import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  MessageCircle, X, Minus, Send, Image, Smile, 
  Phone, Video, Settings, Search, ChevronDown
} from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { TypingBubble } from "./TypingIndicator";
import { toast } from "sonner";
import { playSendSound, playReceiveSound } from "@/utils/sounds";

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Individual chat window component
function ChatWindow({ conversation, onClose, onMinimize, isMinimized }) {
  const { token, user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const otherUser = conversation?.participants?.find(p => p.id !== user?.id) || conversation;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchMessages = useCallback(async () => {
    if (!conversation?.id || !token) return;
    try {
      const response = await fetch(
        `${API_URL}/api/conversations/${conversation.id}/messages?token=${token}`
      );
      if (response.ok) {
        const data = await response.json();
        setMessages(data);
      }
    } catch (error) {
      console.error("Failed to fetch messages:", error);
    }
  }, [conversation?.id, token]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim() || !conversation?.id) return;

    const messageContent = newMessage.trim();
    setNewMessage("");
    
    // Play send sound
    playSendSound();

    // Optimistic update
    const tempMessage = {
      id: Date.now(),
      content: messageContent,
      sender_id: user?.id,
      created_at: new Date().toISOString(),
      is_temp: true
    };
    setMessages(prev => [...prev, tempMessage]);

    try {
      const response = await fetch(
        `${API_URL}/api/conversations/${conversation.id}/messages?token=${token}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: messageContent })
        }
      );
      if (response.ok) {
        const newMsg = await response.json();
        setMessages(prev => prev.map(m => m.is_temp ? newMsg : m));
      }
    } catch (error) {
      toast.error("Failed to send message");
      setMessages(prev => prev.filter(m => !m.is_temp));
    }
  };

  if (isMinimized) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-800 rounded-t-lg shadow-lg border border-gray-200 dark:border-gray-700 cursor-pointer"
        onClick={onMinimize}
      >
        <div className="flex items-center gap-2 p-2 pr-3">
          <div className="relative">
            <Avatar className="w-8 h-8">
              <AvatarImage src={otherUser?.avatar ? `${API_URL}${otherUser.avatar}` : undefined} />
              <AvatarFallback className="bg-blue-500 text-white text-sm">
                {otherUser?.username?.[0]?.toUpperCase() || "?"}
              </AvatarFallback>
            </Avatar>
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-800" />
          </div>
          <span className="font-medium text-sm text-gray-900 dark:text-white truncate max-w-[100px]">
            {otherUser?.username || "User"}
          </span>
          <button 
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            className="ml-auto p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 50, scale: 0.9 }}
      className="w-[328px] bg-white dark:bg-gray-800 rounded-t-lg shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col"
      style={{ height: 455 }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 p-2 border-b border-gray-200 dark:border-gray-700">
        <div className="relative">
          <Avatar className="w-8 h-8">
            <AvatarImage src={otherUser?.avatar ? `${API_URL}${otherUser.avatar}` : undefined} />
            <AvatarFallback className="bg-blue-500 text-white text-sm">
              {otherUser?.username?.[0]?.toUpperCase() || "?"}
            </AvatarFallback>
          </Avatar>
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white dark:border-gray-800" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm text-gray-900 dark:text-white truncate">
            {otherUser?.full_name || otherUser?.username || "User"}
          </div>
          <div className="text-xs text-green-500">Active now</div>
        </div>
        <div className="flex items-center gap-1">
          <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-blue-500">
            <Phone className="w-4 h-4" />
          </button>
          <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-blue-500">
            <Video className="w-4 h-4" />
          </button>
          <button 
            onClick={onMinimize}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-500"
          >
            <Minus className="w-4 h-4" />
          </button>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.map((message) => {
          const isOwn = message.sender_id === user?.id;
          return (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
            >
              {!isOwn && (
                <Avatar className="w-7 h-7 mr-2 flex-shrink-0">
                  <AvatarImage src={otherUser?.avatar ? `${API_URL}${otherUser.avatar}` : undefined} />
                  <AvatarFallback className="text-xs bg-gray-200 dark:bg-gray-600">
                    {otherUser?.username?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              )}
              <div
                className={`max-w-[70%] px-3 py-2 rounded-2xl ${
                  isOwn
                    ? "bg-blue-500 text-white rounded-br-md"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-bl-md"
                }`}
              >
                <p className="text-sm break-words">{message.content}</p>
              </div>
            </motion.div>
          );
        })}
        
        {isTyping && (
          <TypingBubble 
            username={otherUser?.username}
            avatar={otherUser?.avatar ? `${API_URL}${otherUser.avatar}` : null}
          />
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-2 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <button className="p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full">
            <Image className="w-5 h-5" />
          </button>
          <button className="p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full">
            <Smile className="w-5 h-5" />
          </button>
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Aa"
            className="flex-1 h-9 rounded-full bg-gray-100 dark:bg-gray-700 border-none text-sm"
          />
          <button 
            onClick={handleSend}
            disabled={!newMessage.trim()}
            className={`p-1.5 rounded-full ${
              newMessage.trim() 
                ? "text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20" 
                : "text-gray-400"
            }`}
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// Main floating chat container - DESKTOP ONLY (hidden on mobile)
export default function FloatingChat() {
  const { token, user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [activeChats, setActiveChats] = useState([]);
  const [minimizedChats, setMinimizedChats] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);

  // Hide on mobile screens
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const fetchConversations = useCallback(async () => {
    if (!token) return;
    try {
      const response = await fetch(`${API_URL}/api/conversations?token=${token}`);
      if (response.ok) {
        const data = await response.json();
        setConversations(data);
        // Count unread
        const unread = data.reduce((acc, c) => acc + (c.unread_count || 0), 0);
        setUnreadCount(unread);
      }
    } catch (error) {
      console.error("Failed to fetch conversations:", error);
    }
  }, [token]);

  useEffect(() => {
    fetchConversations();
    const interval = setInterval(fetchConversations, 30000);
    return () => clearInterval(interval);
  }, [fetchConversations]);

  const openChat = (conversation) => {
    // Remove from minimized if present
    setMinimizedChats(prev => prev.filter(c => c.id !== conversation.id));
    
    // Add to active if not already there
    if (!activeChats.find(c => c.id === conversation.id)) {
      setActiveChats(prev => {
        // Max 3 active chats
        const newChats = [...prev, conversation];
        if (newChats.length > 3) {
          setMinimizedChats(m => [...m, newChats[0]]);
          return newChats.slice(1);
        }
        return newChats;
      });
    }
    setIsOpen(false);
  };

  const closeChat = (conversationId) => {
    setActiveChats(prev => prev.filter(c => c.id !== conversationId));
    setMinimizedChats(prev => prev.filter(c => c.id !== conversationId));
  };

  const minimizeChat = (conversation) => {
    setActiveChats(prev => prev.filter(c => c.id !== conversation.id));
    if (!minimizedChats.find(c => c.id === conversation.id)) {
      setMinimizedChats(prev => [...prev, conversation]);
    }
  };

  const restoreChat = (conversation) => {
    setMinimizedChats(prev => prev.filter(c => c.id !== conversation.id));
    openChat(conversation);
  };

  const filteredConversations = conversations.filter(c => {
    const otherUser = c.participants?.find(p => p.id !== user?.id);
    return otherUser?.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
           otherUser?.full_name?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Don't render on mobile
  if (isMobile) return null;

  return (
    <div className="fixed bottom-0 right-4 z-50 flex items-end gap-2">
      {/* Active Chat Windows */}
      <AnimatePresence>
        {activeChats.map((conversation) => (
          <ChatWindow
            key={conversation.id}
            conversation={conversation}
            onClose={() => closeChat(conversation.id)}
            onMinimize={() => minimizeChat(conversation)}
            isMinimized={false}
          />
        ))}
      </AnimatePresence>

      {/* Minimized Chats */}
      <div className="flex gap-2">
        {minimizedChats.map((conversation) => (
          <ChatWindow
            key={conversation.id}
            conversation={conversation}
            onClose={() => closeChat(conversation.id)}
            onMinimize={() => restoreChat(conversation)}
            isMinimized={true}
          />
        ))}
      </div>

      {/* Chat List Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="w-[360px] h-[455px] bg-white dark:bg-gray-800 rounded-t-lg shadow-2xl border border-gray-200 dark:border-gray-700 mb-0 flex flex-col"
          >
            {/* Header */}
            <div className="p-3 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Chats</h2>
                <div className="flex items-center gap-1">
                  <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
                    <Settings className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search Messenger"
                  className="pl-9 h-9 rounded-full bg-gray-100 dark:bg-gray-700 border-none"
                />
              </div>
            </div>

            {/* Conversation List */}
            <div className="flex-1 overflow-y-auto">
              {filteredConversations.map((conversation) => {
                const otherUser = conversation.participants?.find(p => p.id !== user?.id);
                const lastMessage = conversation.last_message;
                
                return (
                  <motion.button
                    key={conversation.id}
                    whileHover={{ backgroundColor: "rgba(0,0,0,0.05)" }}
                    onClick={() => openChat(conversation)}
                    className="w-full flex items-center gap-3 p-2 px-3"
                  >
                    <div className="relative">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={otherUser?.avatar ? `${API_URL}${otherUser.avatar}` : undefined} />
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                          {otherUser?.username?.[0]?.toUpperCase() || "?"}
                        </AvatarFallback>
                      </Avatar>
                      {otherUser?.is_online && (
                        <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white dark:border-gray-800" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <div className="font-semibold text-gray-900 dark:text-white truncate">
                        {otherUser?.full_name || otherUser?.username || "User"}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 truncate flex items-center gap-1">
                        {lastMessage?.content || "Start a conversation"}
                        <span>·</span>
                        <span className="text-xs">1h</span>
                      </div>
                    </div>
                    {conversation.unread_count > 0 && (
                      <span className="w-5 h-5 bg-blue-500 rounded-full text-white text-xs flex items-center justify-center">
                        {conversation.unread_count}
                      </span>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messenger Toggle Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="relative w-12 h-12 bg-white dark:bg-gray-800 rounded-full shadow-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-blue-500 mb-4"
      >
        <MessageCircle className="w-6 h-6" />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </motion.span>
        )}
      </motion.button>
    </div>
  );
}
