import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Search, MoreVertical, MessageCircle, Users, Phone, Video,
  Settings, Archive, Star, Bell, BellOff, Pin, Trash2, X,
  Check, CheckCheck, Clock, Image, Paperclip, Mic, Send,
  Smile, Camera, File, MapPin, Contact, ChevronDown,
  Circle, Filter, Plus, RefreshCw, Moon, Sun, LogOut,
  ArrowLeft, Info, Lock, Download
} from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/context/AuthContext";
import { useSettings } from "@/context/SettingsContext";
import { isElectron } from "@/utils/electron";
import DesktopSettings from "@/components/DesktopSettings";
import ElectronUpdateButton from "@/components/ElectronUpdateButton";
import BackButton from "@/components/BackButton";
import CallManager, { useCallManager } from "@/components/CallManager";

const API_URL = process.env.REACT_APP_BACKEND_URL;

// WhatsApp-style Chat List Item
function ChatListItem({ chat, isActive, onClick, isDark }) {
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

// WhatsApp-style Message Bubble
function MessageBubble({ message, isMe, isDark, showAvatar }) {
  const getStatusIcon = (status) => {
    switch (status) {
      case 'sent': return <Check className="w-3 h-3" />;
      case 'delivered': return <CheckCheck className="w-3 h-3" />;
      case 'read': return <CheckCheck className="w-3 h-3 text-[#53bdeb]" />;
      default: return <Clock className="w-3 h-3" />;
    }
  };

  return (
    <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-1`}>
      <div
        className={`relative max-w-[65%] px-3 py-2 rounded-lg ${
          isMe
            ? 'bg-[#005c4b] text-white rounded-tr-none'
            : isDark
              ? 'bg-[#202c33] text-white rounded-tl-none'
              : 'bg-white text-gray-900 rounded-tl-none shadow-sm'
        }`}
      >
        {/* Tail */}
        <div
          className={`absolute top-0 w-3 h-3 ${
            isMe
              ? 'right-[-8px] border-l-[8px] border-l-[#005c4b] border-t-[8px] border-t-transparent'
              : `left-[-8px] border-r-[8px] ${isDark ? 'border-r-[#202c33]' : 'border-r-white'} border-t-[8px] border-t-transparent`
          }`}
        />
        
        {message.image && (
          <img 
            src={message.image} 
            alt="" 
            className="rounded-lg mb-2 max-w-full"
          />
        )}
        
        <p className="text-sm whitespace-pre-wrap break-words">{message.text}</p>
        
        <div className={`flex items-center justify-end gap-1 mt-1 ${isMe ? 'text-white/70' : 'text-gray-400'}`}>
          <span className="text-[10px]">{message.time}</span>
          {isMe && getStatusIcon(message.status)}
        </div>
      </div>
    </div>
  );
}

// Main WhatsApp Desktop Layout
export default function WhatsAppDesktopLayout({ children }) {
  const { user, token, logout } = useAuth();
  const { isDark, setTheme } = useSettings();
  const navigate = useNavigate();
  
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [messageInput, setMessageInput] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [filter, setFilter] = useState("all"); // all, unread, groups
  const [loading, setLoading] = useState(true);
  
  const messagesEndRef = useRef(null);
  
  // Call manager hook
  const { isOpen: isCallOpen, callType, contact: callContact, isIncoming, incomingCallId, startCall, endCall, receiveCall } = useCallManager();

  // Handle video call
  const handleVideoCall = () => {
    if (activeChat) {
      startCall(activeChat, 'video');
    }
  };

  // Handle voice call
  const handleVoiceCall = () => {
    if (activeChat) {
      startCall(activeChat, 'voice');
    }
  };

  // Fetch conversations
  useEffect(() => {
    const fetchChats = async () => {
      if (!token) return;
      
      try {
        const res = await fetch(`${API_URL}/api/conversations?token=${token}`);
        if (res.ok) {
          const data = await res.json();
          const formattedChats = data.map(conv => ({
            id: conv.id || conv._id,
            name: conv.name || conv.other_user?.display_name || "User",
            avatar: conv.avatar || conv.other_user?.avatar,
            lastMessage: conv.last_message?.content || "No messages yet",
            time: formatTime(conv.last_message?.created_at),
            unread: conv.unread_count || 0,
            online: conv.other_user?.is_online,
            typing: false,
            pinned: conv.pinned,
            muted: conv.muted,
            isMe: conv.last_message?.sender_id === user?.id,
            status: conv.last_message?.status || 'sent',
            isGroup: conv.is_group
          }));
          setChats(formattedChats);
        }
      } catch (err) {
        console.error("Failed to fetch chats:", err);
        // Set demo chats for display
        setChats(generateDemoChats());
      } finally {
        setLoading(false);
      }
    };

    fetchChats();
  }, [token, user]);

  // Fetch messages for active chat
  useEffect(() => {
    const fetchMessages = async () => {
      if (!activeChat || !token) return;
      
      try {
        const res = await fetch(`${API_URL}/api/conversations/${activeChat.id}/messages?token=${token}`);
        if (res.ok) {
          const data = await res.json();
          setMessages(data.map(msg => ({
            id: msg.id || msg._id,
            text: msg.content,
            time: formatTime(msg.created_at),
            isMe: msg.sender_id === user?.id,
            status: msg.status || 'read',
            image: msg.image
          })));
        }
      } catch (err) {
        console.error("Failed to fetch messages:", err);
        setMessages(generateDemoMessages());
      }
    };

    fetchMessages();
  }, [activeChat, token, user]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const formatTime = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return "Yesterday";
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const generateDemoChats = () => [
    { id: '1', name: 'John Doe', lastMessage: 'Hey, how are you?', time: '10:30 AM', unread: 2, online: true, status: 'read', isMe: false },
    { id: '2', name: 'Family Group', lastMessage: 'Mom: Dinner at 7?', time: '9:45 AM', unread: 0, isGroup: true, status: 'delivered', isMe: false },
    { id: '3', name: 'Sarah Wilson', lastMessage: 'See you tomorrow!', time: 'Yesterday', unread: 0, online: false, pinned: true, status: 'read', isMe: true },
    { id: '4', name: 'Work Team', lastMessage: 'Meeting at 3pm', time: 'Yesterday', unread: 5, isGroup: true, muted: true, status: 'sent', isMe: false },
    { id: '5', name: 'Mike Johnson', lastMessage: 'Thanks!', time: 'Monday', unread: 0, online: true, status: 'read', isMe: true },
  ];

  const generateDemoMessages = () => [
    { id: '1', text: 'Hey! How are you doing?', time: '10:00 AM', isMe: false, status: 'read' },
    { id: '2', text: "I'm good, thanks! How about you?", time: '10:02 AM', isMe: true, status: 'read' },
    { id: '3', text: 'Great! Did you see the news today?', time: '10:05 AM', isMe: false, status: 'read' },
    { id: '4', text: 'No, what happened?', time: '10:06 AM', isMe: true, status: 'read' },
    { id: '5', text: 'Check this out!', time: '10:08 AM', isMe: false, status: 'read', image: 'https://picsum.photos/300/200' },
    { id: '6', text: 'Wow, that looks amazing! 🎉', time: '10:10 AM', isMe: true, status: 'delivered' },
  ];

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !activeChat) return;
    
    const newMessage = {
      id: Date.now().toString(),
      text: messageInput,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isMe: true,
      status: 'sent'
    };
    
    setMessages(prev => [...prev, newMessage]);
    setMessageInput("");
    
    // Send to API
    try {
      await fetch(`${API_URL}/api/conversations/${activeChat.id}/messages?token=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: messageInput })
      });
    } catch (err) {
      console.error("Failed to send message:", err);
    }
  };

  const filteredChats = chats.filter(chat => {
    if (searchQuery) {
      return chat.name.toLowerCase().includes(searchQuery.toLowerCase());
    }
    if (filter === 'unread') return chat.unread > 0;
    if (filter === 'groups') return chat.isGroup;
    return true;
  });

  // Only render for Electron
  if (!isElectron()) {
    return children;
  }

  return (
    <div className={`h-screen flex ${isDark ? 'bg-[#111b21]' : 'bg-[#f0f2f5]'}`}>
      {/* Left Panel - Chat List */}
      <div className={`w-[400px] flex flex-col border-r ${isDark ? 'bg-[#111b21] border-[#2a2a2a]' : 'bg-white border-gray-200'}`}>
        {/* Header */}
        <div className={`flex items-center justify-between px-4 py-3 ${isDark ? 'bg-[#202c33]' : 'bg-[#f0f2f5]'}`}>
          <Avatar className="w-10 h-10 cursor-pointer" onClick={() => navigate('/profile')}>
            <AvatarImage src={user?.avatar} />
            <AvatarFallback className="bg-[#00a884] text-white">
              {user?.display_name?.charAt(0)?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="rounded-full" onClick={() => navigate('/stories')}>
              <Circle className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" className="rounded-full" onClick={() => navigate('/chat/new')}>
              <MessageCircle className="w-5 h-5" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <MoreVertical className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className={isDark ? 'bg-[#233138] border-[#2a2a2a]' : ''}>
                <DropdownMenuItem onClick={() => navigate('/chat/new')}>
                  <Users className="w-4 h-4 mr-2" /> New group
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowArchived(true)}>
                  <Archive className="w-4 h-4 mr-2" /> Archived
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/starred')}>
                  <Star className="w-4 h-4 mr-2" /> Starred messages
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setShowSettings(true)}>
                  <Settings className="w-4 h-4 mr-2" /> Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme(isDark ? 'light' : 'dark')}>
                  {isDark ? <Sun className="w-4 h-4 mr-2" /> : <Moon className="w-4 h-4 mr-2" />}
                  {isDark ? 'Light mode' : 'Dark mode'}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Download className="w-4 h-4 mr-2" />
                  <ElectronUpdateButton variant="ghost" size="sm" showLabel={true} />
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="text-red-500">
                  <LogOut className="w-4 h-4 mr-2" /> Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Search */}
        <div className={`px-3 py-2 ${isDark ? 'bg-[#111b21]' : 'bg-white'}`}>
          <div className={`flex items-center gap-3 px-4 py-2 rounded-lg ${isDark ? 'bg-[#202c33]' : 'bg-[#f0f2f5]'}`}>
            <Search className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
            <Input
              placeholder="Search or start new chat"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`border-0 bg-transparent focus-visible:ring-0 px-0 ${isDark ? 'text-white placeholder:text-gray-400' : ''}`}
            />
          </div>
        </div>

        {/* Filter Tabs */}
        <div className={`flex items-center gap-2 px-3 py-2 ${isDark ? 'bg-[#111b21]' : 'bg-white'}`}>
          {['all', 'unread', 'groups'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-full text-sm ${
                filter === f
                  ? 'bg-[#00a884] text-white'
                  : isDark
                    ? 'bg-[#202c33] text-gray-300 hover:bg-[#2a3942]'
                    : 'bg-[#f0f2f5] text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Chat List */}
        <ScrollArea className="flex-1">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <RefreshCw className="w-6 h-6 animate-spin text-[#00a884]" />
            </div>
          ) : filteredChats.length === 0 ? (
            <div className={`text-center py-10 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              No chats found
            </div>
          ) : (
            filteredChats.map(chat => (
              <ChatListItem
                key={chat.id}
                chat={chat}
                isActive={activeChat?.id === chat.id}
                onClick={() => setActiveChat(chat)}
                isDark={isDark}
              />
            ))
          )}
        </ScrollArea>

        {/* Encryption Notice */}
        <div className={`px-4 py-3 text-center text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
          <Lock className="w-3 h-3 inline mr-1" />
          Your personal messages are end-to-end encrypted
        </div>
      </div>

      {/* Right Panel - Chat View */}
      <div className="flex-1 flex flex-col">
        {activeChat ? (
          <>
            {/* Chat Header */}
            <div className={`flex items-center justify-between px-4 py-2 ${isDark ? 'bg-[#202c33]' : 'bg-[#f0f2f5]'}`}>
              <div className="flex items-center gap-3">
                {/* Back Button - closes the chat on mobile/desktop */}
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="rounded-full hover:bg-white/10"
                  onClick={() => setActiveChat(null)}
                  data-testid="back-button"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <Avatar className="w-10 h-10">
                  <AvatarImage src={activeChat.avatar} />
                  <AvatarFallback className="bg-[#00a884] text-white">
                    {activeChat.name?.charAt(0)?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {activeChat.name}
                  </h3>
                  <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {activeChat.online ? 'online' : activeChat.typing ? 'typing...' : 'last seen today'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="rounded-full" onClick={handleVideoCall} title="Video call">
                  <Video className="w-5 h-5" />
                </Button>
                <Button variant="ghost" size="icon" className="rounded-full" onClick={handleVoiceCall} title="Voice call">
                  <Phone className="w-5 h-5" />
                </Button>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Search className="w-5 h-5" />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="rounded-full">
                      <MoreVertical className="w-5 h-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className={isDark ? 'bg-[#233138] border-[#2a2a2a]' : ''}>
                    <DropdownMenuItem><Info className="w-4 h-4 mr-2" /> Contact info</DropdownMenuItem>
                    <DropdownMenuItem><Star className="w-4 h-4 mr-2" /> Starred messages</DropdownMenuItem>
                    <DropdownMenuItem><BellOff className="w-4 h-4 mr-2" /> Mute notifications</DropdownMenuItem>
                    <DropdownMenuItem><Archive className="w-4 h-4 mr-2" /> Archive chat</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-red-500"><Trash2 className="w-4 h-4 mr-2" /> Delete chat</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea 
              className="flex-1 px-16 py-4"
              style={{
                backgroundImage: isDark 
                  ? 'url("data:image/svg+xml,%3Csvg width="100" height="100" xmlns="http://www.w3.org/2000/svg"%3E%3Cpath d="M0 0h100v100H0z" fill="%230b141a"/%3E%3Cpath d="M20 20h2v2h-2zM40 40h2v2h-2zM60 60h2v2h-2zM80 80h2v2h-2z" fill="%23182229" opacity=".5"/%3E%3C/svg%3E")'
                  : 'url("data:image/svg+xml,%3Csvg width="100" height="100" xmlns="http://www.w3.org/2000/svg"%3E%3Cpath d="M0 0h100v100H0z" fill="%23efeae2"/%3E%3Cpath d="M20 20h2v2h-2zM40 40h2v2h-2zM60 60h2v2h-2zM80 80h2v2h-2z" fill="%23d1d7db" opacity=".3"/%3E%3C/svg%3E")',
                backgroundColor: isDark ? '#0b141a' : '#efeae2'
              }}
            >
              {messages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  isMe={message.isMe}
                  isDark={isDark}
                />
              ))}
              <div ref={messagesEndRef} />
            </ScrollArea>

            {/* Message Input */}
            <div className={`flex items-center gap-2 px-4 py-3 ${isDark ? 'bg-[#202c33]' : 'bg-[#f0f2f5]'}`}>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Smile className="w-6 h-6 text-gray-500" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <Paperclip className="w-6 h-6 text-gray-500" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className={isDark ? 'bg-[#233138] border-[#2a2a2a]' : ''}>
                  <DropdownMenuItem><Image className="w-4 h-4 mr-2 text-purple-500" /> Photos & Videos</DropdownMenuItem>
                  <DropdownMenuItem><Camera className="w-4 h-4 mr-2 text-pink-500" /> Camera</DropdownMenuItem>
                  <DropdownMenuItem><File className="w-4 h-4 mr-2 text-blue-500" /> Document</DropdownMenuItem>
                  <DropdownMenuItem><Contact className="w-4 h-4 mr-2 text-cyan-500" /> Contact</DropdownMenuItem>
                  <DropdownMenuItem><MapPin className="w-4 h-4 mr-2 text-green-500" /> Location</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
              <div className={`flex-1 flex items-center rounded-lg px-4 py-2 ${isDark ? 'bg-[#2a3942]' : 'bg-white'}`}>
                <Input
                  placeholder="Type a message"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                  className={`border-0 bg-transparent focus-visible:ring-0 ${isDark ? 'text-white placeholder:text-gray-400' : ''}`}
                />
              </div>
              
              {messageInput.trim() ? (
                <Button 
                  size="icon" 
                  className="rounded-full bg-[#00a884] hover:bg-[#00a884]/90"
                  onClick={handleSendMessage}
                >
                  <Send className="w-5 h-5 text-white" />
                </Button>
              ) : (
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Mic className="w-6 h-6 text-gray-500" />
                </Button>
              )}
            </div>
          </>
        ) : (
          /* Empty State */
          <div className={`flex-1 flex flex-col items-center justify-center ${isDark ? 'bg-[#222e35]' : 'bg-[#f0f2f5]'}`}>
            <div className="w-96 text-center">
              {/* Logo */}
              <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-[#00a884] to-[#0088cc] flex items-center justify-center">
                <span className="text-3xl font-bold text-white">FC</span>
              </div>
              
              <h2 className={`text-3xl font-light mb-3 ${isDark ? 'text-white' : 'text-gray-800'}`}>
                FaceConnect Desktop
              </h2>
              <p className={`text-sm mb-6 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Send and receive messages without keeping your phone online.
                <br />
                Use FaceConnect on up to 4 linked devices and 1 phone at the same time.
              </p>
              
              <div className={`flex items-center justify-center gap-2 text-xs mb-8 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                <Lock className="w-3 h-3" />
                End-to-end encrypted
              </div>

              {/* Mobile App Download Links */}
              <div className={`p-4 rounded-xl ${isDark ? 'bg-[#111b21]' : 'bg-white'} border ${isDark ? 'border-[#2a2a2a]' : 'border-gray-200'}`}>
                <p className={`text-sm mb-3 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Download the mobile app
                </p>
                <div className="flex gap-3 justify-center">
                  <a 
                    href="https://play.google.com/store/apps/details?id=com.faceconnect.app" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${isDark ? 'bg-[#202c33] hover:bg-[#2a3942]' : 'bg-gray-100 hover:bg-gray-200'}`}
                  >
                    <svg viewBox="0 0 24 24" className="w-5 h-5" fill={isDark ? '#fff' : '#000'}>
                      <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z"/>
                    </svg>
                    <div className="text-left">
                      <div className={`text-[10px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>GET IT ON</div>
                      <div className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Google Play</div>
                    </div>
                  </a>
                  <a 
                    href="https://apps.apple.com/app/faceconnect" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${isDark ? 'bg-[#202c33] hover:bg-[#2a3942]' : 'bg-gray-100 hover:bg-gray-200'}`}
                  >
                    <svg viewBox="0 0 24 24" className="w-5 h-5" fill={isDark ? '#fff' : '#000'}>
                      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                    </svg>
                    <div className="text-left">
                      <div className={`text-[10px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Download on the</div>
                      <div className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>App Store</div>
                    </div>
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Settings Dialog */}
      <DesktopSettings isOpen={showSettings} onClose={() => setShowSettings(false)} />
      
      {/* Call Manager */}
      <CallManager
        isOpen={isCallOpen}
        onClose={endCall}
        callType={callType}
        contact={callContact}
        isIncoming={isIncoming}
        incomingCallId={incomingCallId}
      />
    </div>
  );
}
