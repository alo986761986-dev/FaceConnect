import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Search, MoreVertical, MessageCircle, Users, Phone, Video,
  Settings, Archive, Star, Bell, BellOff, Pin, Trash2, X,
  Check, CheckCheck, Clock, Image, Paperclip, Mic, Send,
  Smile, Camera, File, MapPin, Contact, ChevronDown,
  Circle, Filter, Plus, RefreshCw, Moon, Sun, LogOut,
  ArrowLeft, Info, Lock, Download, Shield, Key, Smartphone, FileText, AlertTriangle,
  Radio, Tv, ImageIcon, Gamepad2, ExternalLink, Sparkles,
  UserCircle, CheckSquare, Heart, Flag, AlertOctagon, Eraser, Zap, Brain,
  Reply, Timer, Bot, Wand2, AudioWaveform, Chrome
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from "@/context/AuthContext";
import { useSettings } from "@/context/SettingsContext";
import { isElectron } from "@/utils/electron";
import DesktopSettings from "@/components/DesktopSettings";
import ElectronUpdateButton from "@/components/ElectronUpdateButton";
import BackButton from "@/components/BackButton";
import CallManager, { useCallManager } from "@/components/CallManager";
import AloVoiceAssistant from "@/components/AloVoiceAssistant";
import UpdateManager, { UpdateIndicator } from "@/components/UpdateManager";
import EmbeddedBrowser from "@/components/EmbeddedBrowser";
import { 
  VoiceRecorder, 
  VoiceMessagePlayer,
  TypingIndicator, 
  ReplyPreview, 
  QuotedMessage,
  DisappearingMessagesDialog, 
  DisappearingTimer,
  WallpaperPicker,
  getWallpaperStyle,
  EnhancedMessageBubble,
  ReactionPicker,
  MessageReactions
} from "@/components/ChatFeatures";
import { toast } from "sonner";

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Animation variants for fade and slide effects
const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.2 }
};

const slideUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 20 },
  transition: { duration: 0.3 }
};

const slideIn = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
  transition: { duration: 0.2 }
};

const scaleIn = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
  transition: { duration: 0.2 }
};

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
  const [showStarred, setShowStarred] = useState(false);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [showAccount, setShowAccount] = useState(false);
  const [filter, setFilter] = useState("all"); // all, unread, groups
  const [loading, setLoading] = useState(true);
  const [activeSidebarTab, setActiveSidebarTab] = useState("chat"); // chat, calls, status, channels, community, media, games, ai
  
  // New group state
  const [groupName, setGroupName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState([]);
  
  // Archived and starred messages
  const [archivedChats, setArchivedChats] = useState([]);
  const [starredMessages, setStarredMessages] = useState([]);
  
  // Search states for different tabs
  const [channelSearch, setChannelSearch] = useState("");
  const [communitySearch, setCommunitySearch] = useState("");
  const [gameSearch, setGameSearch] = useState("");
  
  // AI Chat state
  const [aiMessages, setAiMessages] = useState([
    { id: 1, text: "Hello! I'm your FaceConnect AI assistant. I can help you with writing messages, translations, summaries, and more. How can I assist you today?", isAi: true }
  ]);
  const [aiInput, setAiInput] = useState("");
  
  // Media files state
  const [mediaFiles, setMediaFiles] = useState([]);
  const fileInputRef = useRef(null);
  
  // ALO Voice Assistant state
  const [showAlo, setShowAlo] = useState(false);
  
  // Universal Search state
  const [searchType, setSearchType] = useState("chats"); // chats, users, media, web
  const [searchResults, setSearchResults] = useState({ users: [], media: [], chats: [] });
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  
  // Chat menu states
  const [showChatMenu, setShowChatMenu] = useState(false);
  const [showContactInfo, setShowContactInfo] = useState(false);
  const [selectingMessages, setSelectingMessages] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState([]);
  const [chatNotificationsMuted, setChatNotificationsMuted] = useState({});
  const [favoriteChats, setFavoriteChats] = useState([]);
  
  // Voice recording state
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  
  // Reply/Quote state
  const [replyToMessage, setReplyToMessage] = useState(null);
  
  // Typing indicator state
  const [typingUsers, setTypingUsers] = useState({}); // { chatId: { userId: timestamp } }
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef(null);
  
  // Disappearing messages state
  const [showDisappearingDialog, setShowDisappearingDialog] = useState(false);
  const [disappearingSettings, setDisappearingSettings] = useState({}); // { chatId: 'off' | '24h' | '7d' | '90d' }
  
  // Wallpaper state
  const [showWallpaperPicker, setShowWallpaperPicker] = useState(false);
  const [chatWallpapers, setChatWallpapers] = useState({}); // { chatId: wallpaperObject }
  
  // Reaction picker state
  const [showReactionPicker, setShowReactionPicker] = useState(null); // messageId or null
  
  // Social media popup state
  const [showSocialPopup, setShowSocialPopup] = useState(false);
  
  // Embedded browser state
  const [showBrowser, setShowBrowser] = useState(false);
  const [browserUrl, setBrowserUrl] = useState('https://www.google.com');
  
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

  // Fetch archived conversations when panel opens
  useEffect(() => {
    const fetchArchived = async () => {
      if (!showArchived || !token) return;
      
      try {
        const res = await fetch(`${API_URL}/api/chat/archived?token=${token}`);
        if (res.ok) {
          const data = await res.json();
          setArchivedChats(data.conversations || []);
        }
      } catch (err) {
        console.error("Failed to fetch archived:", err);
      }
    };

    fetchArchived();
  }, [showArchived, token]);

  // Fetch starred messages when panel opens
  useEffect(() => {
    const fetchStarred = async () => {
      if (!showStarred || !token) return;
      
      try {
        const res = await fetch(`${API_URL}/api/chat/starred?token=${token}`);
        if (res.ok) {
          const data = await res.json();
          setStarredMessages(data.messages || []);
        }
      } catch (err) {
        console.error("Failed to fetch starred:", err);
      }
    };

    fetchStarred();
  }, [showStarred, token]);

  // Create group function
  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedMembers.length === 0 || !token) return;
    
    try {
      const res = await fetch(`${API_URL}/api/conversations?token=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participant_ids: selectedMembers,
          name: groupName,
          is_group: true
        })
      });
      
      if (res.ok) {
        const newGroup = await res.json();
        setChats(prev => [{
          id: newGroup.id,
          name: newGroup.name,
          lastMessage: "Group created",
          time: "Just now",
          unread: 0,
          isGroup: true,
          status: 'sent'
        }, ...prev]);
        setShowNewGroup(false);
        setGroupName("");
        setSelectedMembers([]);
      }
    } catch (err) {
      console.error("Failed to create group:", err);
    }
  };

  // Archive a conversation
  const handleArchiveChat = async (conversationId) => {
    if (!token) return;
    
    try {
      const res = await fetch(`${API_URL}/api/chat/archive?token=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversation_id: conversationId })
      });
      
      if (res.ok) {
        setChats(prev => prev.filter(c => c.id !== conversationId));
        if (activeChat?.id === conversationId) {
          setActiveChat(null);
        }
      }
    } catch (err) {
      console.error("Failed to archive chat:", err);
    }
  };

  // Unarchive a conversation
  const handleUnarchiveChat = async (conversationId) => {
    if (!token) return;
    
    try {
      const res = await fetch(`${API_URL}/api/chat/unarchive?token=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversation_id: conversationId })
      });
      
      if (res.ok) {
        const unarchived = archivedChats.find(c => c.id === conversationId);
        if (unarchived) {
          setArchivedChats(prev => prev.filter(c => c.id !== conversationId));
          setChats(prev => [{
            ...unarchived,
            time: formatTime(unarchived.last_message?.created_at)
          }, ...prev]);
        }
      }
    } catch (err) {
      console.error("Failed to unarchive chat:", err);
    }
  };

  // Star/unstar message
  const handleToggleStarMessage = async (messageId, isStarred) => {
    if (!token) return;
    
    const endpoint = isStarred ? 'unstar' : 'star';
    try {
      const res = await fetch(`${API_URL}/api/chat/${endpoint}?token=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message_id: messageId })
      });
      
      if (res.ok) {
        if (isStarred) {
          setStarredMessages(prev => prev.filter(m => m.id !== messageId));
        }
        // If we're in starred view and unstarred, remove from list
        // Otherwise the user will need to refetch
      }
    } catch (err) {
      console.error("Failed to toggle star:", err);
    }
  };

  // Handle AI message send
  const handleSendAiMessage = () => {
    if (!aiInput.trim()) return;
    
    const userMessage = {
      id: Date.now(),
      text: aiInput,
      isAi: false
    };
    
    setAiMessages(prev => [...prev, userMessage]);
    setAiInput("");
    
    // Simulate AI response
    setTimeout(() => {
      const responses = [
        "I understand! Let me help you with that. Could you provide more details?",
        "That's a great question! Here's what I think...",
        "I'd be happy to assist you with that. Here are some suggestions:",
        "Based on what you've shared, I recommend the following approach:",
        "Let me analyze that for you. Here's my response:"
      ];
      const aiResponse = {
        id: Date.now() + 1,
        text: responses[Math.floor(Math.random() * responses.length)] + "\n\nIs there anything else I can help you with?",
        isAi: true
      };
      setAiMessages(prev => [...prev, aiResponse]);
    }, 1000);
  };

  // Handle media file upload
  const handleMediaUpload = (event) => {
    const files = Array.from(event.target.files);
    const newFiles = files.map(file => ({
      id: Date.now() + Math.random(),
      name: file.name,
      type: file.type,
      size: file.size,
      url: URL.createObjectURL(file),
      uploadedAt: new Date().toISOString()
    }));
    setMediaFiles(prev => [...newFiles, ...prev]);
  };

  // Start a call with a contact
  const handleStartCall = (contact, type = 'audio') => {
    if (contact) {
      startCall(contact, type);
    } else if (chats.length > 0) {
      // Use first available contact
      const firstContact = chats.find(c => !c.isGroup);
      if (firstContact) {
        startCall({ id: firstContact.id, name: firstContact.name, avatar: firstContact.avatar }, type);
      }
    }
  };

  // Universal Search Function
  const handleUniversalSearch = async (query) => {
    if (!query.trim()) {
      setShowSearchResults(false);
      setSearchResults({ users: [], media: [], chats: [] });
      return;
    }
    
    setIsSearching(true);
    setShowSearchResults(true);
    
    const lowerQuery = query.toLowerCase();
    
    // Search chats
    const chatResults = chats.filter(chat => 
      chat.name?.toLowerCase().includes(lowerQuery) ||
      chat.lastMessage?.toLowerCase().includes(lowerQuery)
    );
    
    // Search users from API
    let userResults = [];
    try {
      const res = await fetch(`${API_URL}/api/users/search?q=${encodeURIComponent(query)}&token=${token}`);
      if (res.ok) {
        const data = await res.json();
        userResults = data.users || [];
      }
    } catch (err) {
      console.error("User search error:", err);
    }
    
    // Search media files
    const mediaResults = mediaFiles.filter(file =>
      file.name?.toLowerCase().includes(lowerQuery)
    );
    
    setSearchResults({
      users: userResults,
      media: mediaResults,
      chats: chatResults
    });
    
    setIsSearching(false);
  };

  // Open Google Search
  const openGoogleSearch = (query) => {
    const url = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    if (window.electronAPI?.openExternal) {
      window.electronAPI.openExternal(url);
    } else {
      window.open(url, '_blank');
    }
  };

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim()) {
        handleUniversalSearch(searchQuery);
      } else {
        setShowSearchResults(false);
      }
    }, 300);
    
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Chat Menu Actions
  const handleToggleNotifications = () => {
    if (!activeChat) return;
    setChatNotificationsMuted(prev => ({
      ...prev,
      [activeChat.id]: !prev[activeChat.id]
    }));
    toast.success(chatNotificationsMuted[activeChat?.id] ? 'Notifications enabled' : 'Notifications muted');
    setShowChatMenu(false);
  };

  const handleAddToFavorites = () => {
    if (!activeChat) return;
    if (favoriteChats.includes(activeChat.id)) {
      setFavoriteChats(prev => prev.filter(id => id !== activeChat.id));
      toast.success('Removed from favorites');
    } else {
      setFavoriteChats(prev => [...prev, activeChat.id]);
      toast.success('Added to favorites');
    }
    setShowChatMenu(false);
  };

  const handleCloseChat = () => {
    setActiveChat(null);
    setShowChatMenu(false);
    toast.info('Chat closed');
  };

  const handleEmptyChat = async () => {
    if (!activeChat || !token) return;
    try {
      await fetch(`${API_URL}/api/conversations/${activeChat.id}/messages?token=${token}`, {
        method: 'DELETE'
      });
      setMessages([]);
      toast.success('Chat emptied');
    } catch (err) {
      toast.error('Failed to empty chat');
    }
    setShowChatMenu(false);
  };

  const handleDeleteChat = async () => {
    if (!activeChat || !token) return;
    try {
      await fetch(`${API_URL}/api/conversations/${activeChat.id}?token=${token}`, {
        method: 'DELETE'
      });
      setChats(prev => prev.filter(c => c.id !== activeChat.id));
      setActiveChat(null);
      toast.success('Chat deleted');
    } catch (err) {
      toast.error('Failed to delete chat');
    }
    setShowChatMenu(false);
  };

  const handleReportBlock = async () => {
    if (!activeChat || !token) return;
    // For group chats, just report. For individual, block.
    if (!activeChat.isGroup) {
      try {
        await fetch(`${API_URL}/api/chat/block?token=${token}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: activeChat.id })
        });
        toast.success('User blocked and reported');
      } catch (err) {
        toast.error('Failed to block user');
      }
    } else {
      toast.success('Group reported');
    }
    setShowChatMenu(false);
  };

  const handleSelectMessages = () => {
    setSelectingMessages(true);
    setSelectedMessageIds([]);
    setShowChatMenu(false);
  };

  const handleCancelSelection = () => {
    setSelectingMessages(false);
    setSelectedMessageIds([]);
  };

  const toggleMessageSelection = (msgId) => {
    setSelectedMessageIds(prev => 
      prev.includes(msgId) 
        ? prev.filter(id => id !== msgId)
        : [...prev, msgId]
    );
  };

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
    
    // Calculate expiry time if disappearing messages is enabled
    const disappearingSetting = disappearingSettings[activeChat.id];
    let expiresAt = null;
    if (disappearingSetting && disappearingSetting !== 'off') {
      const now = new Date();
      switch (disappearingSetting) {
        case '24h': expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(); break;
        case '7d': expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(); break;
        case '90d': expiresAt = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString(); break;
      }
    }
    
    const newMessage = {
      id: Date.now().toString(),
      text: messageInput,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isMe: true,
      status: 'sent',
      reactions: [],
      quotedMessage: replyToMessage ? { 
        id: replyToMessage.id, 
        text: replyToMessage.text, 
        isMe: replyToMessage.isMe,
        senderName: replyToMessage.isMe ? 'You' : activeChat.name
      } : null,
      expiresAt
    };
    
    setMessages(prev => [...prev, newMessage]);
    setMessageInput("");
    setReplyToMessage(null);
    
    // Send to API
    try {
      await fetch(`${API_URL}/api/conversations/${activeChat.id}/messages?token=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          content: messageInput,
          reply_to: replyToMessage?.id,
          expires_at: expiresAt
        })
      });
    } catch (err) {
      console.error("Failed to send message:", err);
    }
  };

  // Handle sending voice message
  const handleSendVoiceMessage = async (audioBlob, duration) => {
    if (!activeChat) return;
    
    const audioUrl = URL.createObjectURL(audioBlob);
    
    const newMessage = {
      id: Date.now().toString(),
      text: '',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isMe: true,
      status: 'sent',
      isVoice: true,
      audioUrl,
      duration,
      reactions: []
    };
    
    setMessages(prev => [...prev, newMessage]);
    setIsRecordingVoice(false);
    
    // In production, upload the audio blob to the server
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'voice_message.webm');
      formData.append('duration', duration);
      
      await fetch(`${API_URL}/api/conversations/${activeChat.id}/voice?token=${token}`, {
        method: 'POST',
        body: formData
      });
    } catch (err) {
      console.error("Failed to send voice message:", err);
    }
  };

  // Handle message reaction
  const handleReaction = (messageId, emoji) => {
    setMessages(prev => prev.map(msg => {
      if (msg.id === messageId) {
        const existingReactionIndex = msg.reactions?.findIndex(r => r.userId === user?.id && r.emoji === emoji);
        let newReactions = [...(msg.reactions || [])];
        
        if (existingReactionIndex >= 0) {
          // Remove reaction if already exists
          newReactions.splice(existingReactionIndex, 1);
        } else {
          // Add new reaction
          newReactions.push({ userId: user?.id, emoji, timestamp: new Date().toISOString() });
        }
        
        return { ...msg, reactions: newReactions };
      }
      return msg;
    }));
    setShowReactionPicker(null);
    
    // Send reaction to API
    try {
      fetch(`${API_URL}/api/chat/reaction?token=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message_id: messageId, emoji })
      });
    } catch (err) {
      console.error("Failed to add reaction:", err);
    }
  };

  // Handle typing indicator
  const handleTyping = useCallback(() => {
    if (!isTyping) {
      setIsTyping(true);
      // Notify server that user started typing
      try {
        fetch(`${API_URL}/api/chat/typing?token=${token}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ conversation_id: activeChat?.id, is_typing: true })
        });
      } catch (err) {}
    }
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set new timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      try {
        fetch(`${API_URL}/api/chat/typing?token=${token}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ conversation_id: activeChat?.id, is_typing: false })
        });
      } catch (err) {}
    }, 3000);
  }, [activeChat?.id, isTyping, token]);

  // Handle disappearing messages setting
  const handleSaveDisappearing = (setting) => {
    if (!activeChat) return;
    setDisappearingSettings(prev => ({ ...prev, [activeChat.id]: setting }));
    toast.success(`Disappearing messages ${setting === 'off' ? 'turned off' : `set to ${setting}`}`);
  };

  // Handle wallpaper change
  const handleSaveWallpaper = (wallpaper) => {
    if (!activeChat) return;
    setChatWallpapers(prev => ({ ...prev, [activeChat.id]: wallpaper }));
    toast.success('Wallpaper updated');
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

  // Social media links
  const socialLinks = [
    { name: 'Facebook', url: 'https://www.facebook.com', color: '#1877F2', icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    )},
    { name: 'Instagram', url: 'https://www.instagram.com', color: '#E4405F', icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
      </svg>
    )},
    { name: 'TikTok', url: 'https://www.tiktok.com', color: '#000000', icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
      </svg>
    )},
    { name: 'Telegram', url: 'https://web.telegram.org/a/', color: '#0088cc', icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
      </svg>
    )},
    { name: 'WhatsApp', url: 'https://web.whatsapp.com', color: '#25D366', icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
      </svg>
    )},
    { name: 'YouTube', url: 'https://www.youtube.com', color: '#FF0000', icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
      </svg>
    )},
  ];

  // Sidebar items
  const sidebarItems = [
    { id: 'chat', icon: MessageCircle, label: 'Chats', tooltip: 'View and start conversations', badge: chats.reduce((acc, c) => acc + (c.unread || 0), 0) },
    { id: 'calls', icon: Phone, label: 'Calls', tooltip: 'Make voice and video calls' },
    { id: 'status', icon: Circle, label: 'Status', tooltip: 'View status updates from contacts' },
    { id: 'channels', icon: Radio, label: 'Channels', tooltip: 'Discover and follow channels' },
    { id: 'community', icon: Users, label: 'Community', tooltip: 'Join and create communities' },
    { id: 'media', icon: ImageIcon, label: 'Media', tooltip: 'Browse shared media files' },
    { id: 'games', icon: Gamepad2, label: 'Games', tooltip: 'Play online games' },
    { id: 'ai', icon: Brain, label: 'AI', tooltip: 'Chat with AI Assistant' },
  ];

  // Open external link - uses embedded browser in Electron
  const openExternalLink = (url) => {
    // For Electron, open in embedded browser
    if (window.electronAPI) {
      setBrowserUrl(url);
      setShowBrowser(true);
      toast.success(
        <div className="flex items-center gap-2">
          <Chrome className="w-4 h-4" />
          <span>Opening: {new URL(url).hostname}</span>
        </div>,
        { duration: 2000 }
      );
    } else {
      window.open(url, '_blank', 'noopener,noreferrer');
      toast.info(`Opening: ${new URL(url).hostname}`);
    }
  };
  
  // Open in system Chrome browser (external)
  const openInSystemBrowser = (url) => {
    if (window.electronAPI?.openExternal) {
      window.electronAPI.openExternal(url);
      toast.success(
        <div className="flex items-center gap-2">
          <Chrome className="w-4 h-4" />
          <span>Opening in Chrome: {new URL(url).hostname}</span>
        </div>,
        { duration: 2000 }
      );
    } else {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <TooltipProvider delayDuration={300}>
    <div className={`h-screen flex ${isDark ? 'bg-[#111b21]' : 'bg-[#f0f2f5]'}`}>
      {/* Fixed Left Sidebar */}
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
        
        {/* Divider */}
        <div className={`mx-3 my-2 border-t ${isDark ? 'border-[#2a2a2a]' : 'border-gray-300'}`} />
        
        {/* Social Links - Opens in Chrome */}
        <div className="py-2 px-2 space-y-1">
          <p className={`text-[8px] uppercase font-bold text-center mb-1 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
            Open in Chrome
          </p>
          {socialLinks.map((social) => (
            <Tooltip key={social.name}>
              <TooltipTrigger asChild>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => openExternalLink(social.url)}
                  className={`w-full p-2 rounded-lg flex items-center justify-center transition-all group relative ${
                    isDark 
                      ? 'text-gray-400 hover:bg-[#2a3942]' 
                      : 'text-gray-500 hover:bg-gray-200'
                  }`}
                  data-testid={`social-${social.name.toLowerCase()}`}
                >
                  <span className="transition-transform" style={{ color: social.color }}>
                    {social.icon}
                  </span>
                  {/* Chrome indicator on hover */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0 }}
                    whileHover={{ opacity: 1, scale: 1 }}
                    className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full shadow-sm flex items-center justify-center"
                  >
                    <Chrome className="w-2 h-2 text-blue-500" />
                  </motion.div>
                </motion.button>
              </TooltipTrigger>
              <TooltipContent side="right" className="bg-gray-900 text-white">
                <p className="font-medium flex items-center gap-2">
                  {social.name}
                  <Chrome className="w-3 h-3 text-blue-400" />
                </p>
                <p className="text-xs text-gray-400">Opens in Chrome browser</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
        
        {/* Settings at bottom */}
        <div className="p-2 mb-2 space-y-1">
          {/* ALO Voice Assistant Button - Enhanced */}
          <Tooltip>
            <TooltipTrigger asChild>
              <motion.button
                onClick={() => setShowAlo(true)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`w-full p-3 rounded-xl flex flex-col items-center gap-1 transition-all group relative overflow-hidden ${
                  isDark 
                    ? 'bg-gradient-to-br from-[#001a00] via-[#002200] to-[#003300] text-[#00ff00]' 
                    : 'bg-gradient-to-br from-emerald-50 via-green-100 to-teal-100 text-emerald-600'
                }`}
                data-testid="sidebar-alo"
              >
                {/* Animated Matrix-style background */}
                <div className="absolute inset-0 overflow-hidden">
                  <motion.div 
                    className="absolute inset-0 opacity-30"
                    animate={{ 
                      backgroundPosition: ['0% 0%', '0% 100%'],
                    }}
                    transition={{ 
                      duration: 3, 
                      repeat: Infinity, 
                      ease: "linear" 
                    }}
                    style={{
                      backgroundImage: isDark 
                        ? 'linear-gradient(180deg, transparent 0%, rgba(0,255,0,0.3) 50%, transparent 100%)'
                        : 'linear-gradient(180deg, transparent 0%, rgba(16,185,129,0.2) 50%, transparent 100%)',
                      backgroundSize: '100% 200%'
                    }}
                  />
                  {/* Pulsing glow effect */}
                  <motion.div
                    className="absolute inset-0 rounded-xl"
                    animate={{ 
                      boxShadow: isDark 
                        ? ['inset 0 0 20px rgba(0,255,0,0)', 'inset 0 0 20px rgba(0,255,0,0.3)', 'inset 0 0 20px rgba(0,255,0,0)']
                        : ['inset 0 0 20px rgba(16,185,129,0)', 'inset 0 0 20px rgba(16,185,129,0.2)', 'inset 0 0 20px rgba(16,185,129,0)']
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                </div>
                {/* Modern AI waveform icon */}
                <motion.div
                  animate={{ 
                    scale: [1, 1.1, 1],
                    rotate: [0, 5, -5, 0]
                  }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  className="relative z-10"
                >
                  <AudioWaveform className="w-6 h-6" />
                </motion.div>
                <span className="text-[10px] font-bold tracking-widest relative z-10">ALO</span>
                {/* Active indicator dot */}
                <motion.div
                  className={`absolute top-2 right-2 w-2 h-2 rounded-full ${isDark ? 'bg-[#00ff00]' : 'bg-emerald-500'}`}
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
              </motion.button>
            </TooltipTrigger>
            <TooltipContent side="right" className="bg-gray-900 text-white">
              <p className="font-medium">ALO Voice Assistant</p>
              <p className="text-xs text-gray-400">Say "ALO" or click to activate</p>
            </TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setShowSettings(true)}
                className={`w-full p-3 rounded-xl flex items-center justify-center transition-all ${
                  isDark 
                    ? 'text-gray-400 hover:bg-[#2a3942] hover:text-white' 
                    : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'
                }`}
                data-testid="sidebar-settings"
              >
                <Settings className="w-5 h-5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="bg-gray-900 text-white">
              <p className="font-medium">Settings</p>
              <p className="text-xs text-gray-400">Customize your experience</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Left Panel - Chat List */}
      <div className={`w-[350px] flex flex-col border-r ${isDark ? 'bg-[#111b21] border-[#2a2a2a]' : 'bg-white border-gray-200'}`}>
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <MoreVertical className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className={isDark ? 'bg-[#233138] border-[#2a2a2a]' : ''}>
                <DropdownMenuItem onClick={() => setShowNewGroup(true)}>
                  <Users className="w-4 h-4 mr-2" /> New group
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowArchived(true)}>
                  <Archive className="w-4 h-4 mr-2" /> Archived
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowStarred(true)}>
                  <Star className="w-4 h-4 mr-2" /> Starred messages
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setShowAccount(true)}>
                  <Settings className="w-4 h-4 mr-2" /> Account
                </DropdownMenuItem>
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
              placeholder="Search users, media, or web..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchQuery && setShowSearchResults(true)}
              className={`border-0 bg-transparent focus-visible:ring-0 px-0 ${isDark ? 'text-white placeholder:text-gray-400' : ''}`}
              data-testid="universal-search-input"
            />
            {searchQuery && (
              <button 
                onClick={() => { setSearchQuery(""); setShowSearchResults(false); }}
                className={`p-1 rounded-full ${isDark ? 'hover:bg-[#374045]' : 'hover:bg-gray-300'}`}
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            )}
          </div>
          
          {/* Search Type Tabs */}
          {showSearchResults && (
            <div className="flex gap-1 mt-2">
              {[
                { id: 'chats', label: 'Chats', icon: MessageCircle },
                { id: 'users', label: 'Users', icon: Users },
                { id: 'media', label: 'Media', icon: ImageIcon },
                { id: 'web', label: 'Google', icon: ExternalLink },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setSearchType(tab.id)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    searchType === tab.id
                      ? 'bg-[#00a884] text-white'
                      : isDark
                        ? 'bg-[#202c33] text-gray-300 hover:bg-[#2a3942]'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <tab.icon className="w-3 h-3" />
                  {tab.label}
                </button>
              ))}
            </div>
          )}
        </div>
        
        {/* Search Results */}
        {showSearchResults && searchQuery && (
          <div className={`flex-1 overflow-hidden ${isDark ? 'bg-[#111b21]' : 'bg-white'}`}>
            <ScrollArea className="h-full">
              {isSearching ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-6 h-6 animate-spin text-[#00a884]" />
                </div>
              ) : (
                <div className="p-3">
                  {/* Google Web Search */}
                  {searchType === 'web' && (
                    <div>
                      <button
                        onClick={() => openGoogleSearch(searchQuery)}
                        className={`w-full flex items-center gap-3 p-4 rounded-xl transition-colors ${
                          isDark ? 'bg-[#202c33] hover:bg-[#2a3942]' : 'bg-gray-100 hover:bg-gray-200'
                        }`}
                      >
                        <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center">
                          <svg viewBox="0 0 24 24" className="w-7 h-7">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                          </svg>
                        </div>
                        <div className="flex-1 text-left">
                          <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            Search Google for "{searchQuery}"
                          </p>
                          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            Opens in your browser
                          </p>
                        </div>
                        <ExternalLink className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                      </button>
                      
                      {/* Quick search suggestions */}
                      <div className="mt-4">
                        <p className={`text-xs uppercase font-medium mb-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                          Quick Searches
                        </p>
                        <div className="space-y-1">
                          {[
                            `${searchQuery} news`,
                            `${searchQuery} images`,
                            `${searchQuery} videos`,
                            `${searchQuery} maps`,
                          ].map((suggestion, idx) => (
                            <button
                              key={idx}
                              onClick={() => openGoogleSearch(suggestion)}
                              className={`w-full flex items-center gap-3 p-2 rounded-lg text-left ${
                                isDark ? 'hover:bg-[#202c33]' : 'hover:bg-gray-100'
                              }`}
                            >
                              <Search className={`w-4 h-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                              <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{suggestion}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Chat Results */}
                  {searchType === 'chats' && (
                    <div>
                      <p className={`text-xs uppercase font-medium mb-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                        Chats ({searchResults.chats.length})
                      </p>
                      {searchResults.chats.length === 0 ? (
                        <p className={`text-sm text-center py-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                          No chats found
                        </p>
                      ) : (
                        searchResults.chats.map(chat => (
                          <div
                            key={chat.id}
                            onClick={() => { setActiveChat(chat); setShowSearchResults(false); setSearchQuery(""); }}
                            className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer ${
                              isDark ? 'hover:bg-[#202c33]' : 'hover:bg-gray-100'
                            }`}
                          >
                            <Avatar className="w-10 h-10">
                              <AvatarImage src={chat.avatar} />
                              <AvatarFallback className="bg-[#00a884] text-white">{chat.name?.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className={`font-medium truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{chat.name}</p>
                              <p className={`text-sm truncate ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{chat.lastMessage}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                  
                  {/* User Results */}
                  {searchType === 'users' && (
                    <div>
                      <p className={`text-xs uppercase font-medium mb-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                        Users ({searchResults.users.length})
                      </p>
                      {searchResults.users.length === 0 ? (
                        <p className={`text-sm text-center py-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                          No users found
                        </p>
                      ) : (
                        searchResults.users.map(user => (
                          <div
                            key={user.id}
                            className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer ${
                              isDark ? 'hover:bg-[#202c33]' : 'hover:bg-gray-100'
                            }`}
                          >
                            <Avatar className="w-10 h-10">
                              <AvatarImage src={user.avatar} />
                              <AvatarFallback className="bg-[#00a884] text-white">{user.display_name?.charAt(0) || user.username?.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className={`font-medium truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{user.display_name || user.username}</p>
                              <p className={`text-sm truncate ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>@{user.username}</p>
                            </div>
                            <Button size="sm" variant="outline" className="h-8 text-[#00a884] border-[#00a884]">
                              <MessageCircle className="w-3 h-3 mr-1" /> Chat
                            </Button>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                  
                  {/* Media Results */}
                  {searchType === 'media' && (
                    <div>
                      <p className={`text-xs uppercase font-medium mb-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                        Media Files ({searchResults.media.length})
                      </p>
                      {searchResults.media.length === 0 ? (
                        <p className={`text-sm text-center py-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                          No media found
                        </p>
                      ) : (
                        <div className="grid grid-cols-3 gap-2">
                          {searchResults.media.map(file => (
                            <div
                              key={file.id}
                              className={`aspect-square rounded-lg overflow-hidden ${isDark ? 'bg-[#202c33]' : 'bg-gray-100'}`}
                            >
                              {file.type?.startsWith('image/') ? (
                                <img src={file.url} alt={file.name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center p-2">
                                  <File className={`w-6 h-6 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                                  <span className={`text-xs truncate w-full text-center mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                    {file.name}
                                  </span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>
          </div>
        )}

        {/* Content based on active sidebar tab - only show when not searching */}
        {!showSearchResults && activeSidebarTab === 'chat' && (
          <>
            {/* Header with New Chat button */}
            <div className={`flex items-center justify-between px-3 py-2 ${isDark ? 'bg-[#111b21]' : 'bg-white'}`}>
              <div className="flex items-center gap-2">
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
              <Button 
                size="sm" 
                className="bg-[#00a884] hover:bg-[#00a884]/90 h-8"
                onClick={() => setShowNewGroup(true)}
                data-testid="new-chat-btn"
              >
                <Plus className="w-4 h-4 mr-1" /> New
              </Button>
            </div>

            {/* Chat List */}
            <ScrollArea className="flex-1">
              {loading ? (
                <div className="flex items-center justify-center h-40">
                  <RefreshCw className="w-6 h-6 animate-spin text-[#00a884]" />
                </div>
              ) : filteredChats.length === 0 ? (
                <div className={`flex flex-col items-center justify-center h-64 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  <MessageCircle className="w-16 h-16 mb-4 opacity-30" />
                  <p className="text-lg font-medium">No chats yet</p>
                  <p className="text-sm mt-2">Start a conversation</p>
                  <Button 
                    className="mt-4 bg-[#00a884] hover:bg-[#00a884]/90"
                    onClick={() => setShowNewGroup(true)}
                  >
                    <Plus className="w-4 h-4 mr-2" /> Start New Chat
                  </Button>
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
          </>
        )}

        {activeSidebarTab === 'calls' && (
          <ScrollArea className="flex-1">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Calls</h3>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setActiveSidebarTab('chat')}
                  className="text-[#00a884]"
                >
                  <ArrowLeft className="w-4 h-4 mr-1" /> Back
                </Button>
              </div>
              
              {/* Call Actions */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <Button 
                  className="h-20 flex-col gap-2 bg-[#00a884] hover:bg-[#00a884]/90"
                  onClick={() => handleStartCall(null, 'audio')}
                >
                  <Phone className="w-6 h-6" />
                  <span>Voice Call</span>
                </Button>
                <Button 
                  className="h-20 flex-col gap-2 bg-[#0088cc] hover:bg-[#0088cc]/90"
                  onClick={() => handleStartCall(null, 'video')}
                >
                  <Video className="w-6 h-6" />
                  <span>Video Call</span>
                </Button>
              </div>
              
              {/* Contact List for Calls */}
              <p className={`text-xs uppercase font-medium mb-3 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Select Contact to Call</p>
              <div className="space-y-2">
                {chats.filter(c => !c.isGroup).slice(0, 8).map(contact => (
                  <div 
                    key={contact.id}
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer ${isDark ? 'hover:bg-[#202c33]' : 'hover:bg-gray-100'}`}
                  >
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={contact.avatar} />
                      <AvatarFallback className="bg-[#00a884] text-white">{contact.name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{contact.name}</p>
                      {contact.online && <span className="text-xs text-[#00a884]">Online</span>}
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-9 w-9 text-[#00a884]"
                        onClick={() => handleStartCall({ id: contact.id, name: contact.name, avatar: contact.avatar }, 'audio')}
                      >
                        <Phone className="w-4 h-4" />
                      </Button>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-9 w-9 text-[#0088cc]"
                        onClick={() => handleStartCall({ id: contact.id, name: contact.name, avatar: contact.avatar }, 'video')}
                      >
                        <Video className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </ScrollArea>
        )}

        {activeSidebarTab === 'status' && (
          <ScrollArea className="flex-1">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Status Updates</h3>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setActiveSidebarTab('chat')}
                  className="text-[#00a884]"
                >
                  <ArrowLeft className="w-4 h-4 mr-1" /> Back
                </Button>
              </div>
              
              {/* My Status */}
              <div className={`flex items-center gap-3 p-3 rounded-lg mb-4 cursor-pointer ${isDark ? 'hover:bg-[#202c33]' : 'hover:bg-gray-100'}`}>
                <div className="relative">
                  <Avatar className="w-14 h-14">
                    <AvatarImage src={user?.avatar} />
                    <AvatarFallback className="bg-[#00a884] text-white">{user?.display_name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="absolute bottom-0 right-0 w-6 h-6 bg-[#00a884] rounded-full flex items-center justify-center border-2 border-white dark:border-[#111b21]">
                    <Plus className="w-4 h-4 text-white" />
                  </div>
                </div>
                <div>
                  <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>My Status</p>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Tap to add status update</p>
                </div>
              </div>
              
              <p className={`text-xs uppercase font-medium mb-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Recent updates</p>
              <div className={`text-center py-8 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                <p className="text-sm">No recent updates from your contacts</p>
              </div>
            </div>
          </ScrollArea>
        )}

        {activeSidebarTab === 'channels' && (
          <ScrollArea className="flex-1">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Channels</h3>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setActiveSidebarTab('chat')}
                  className="text-[#00a884]"
                >
                  <ArrowLeft className="w-4 h-4 mr-1" /> Back
                </Button>
              </div>
              
              {/* Search Bar */}
              <div className={`flex items-center gap-2 p-2 rounded-lg mb-4 ${isDark ? 'bg-[#202c33]' : 'bg-gray-100'}`}>
                <Search className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                <Input 
                  placeholder="Search channels..."
                  value={channelSearch}
                  onChange={(e) => setChannelSearch(e.target.value)}
                  className={`border-0 bg-transparent focus-visible:ring-0 h-8 ${isDark ? 'text-white placeholder:text-gray-500' : ''}`}
                />
              </div>
              
              {/* Popular Channels */}
              <p className={`text-xs uppercase font-medium mb-3 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Popular Channels</p>
              <div className="space-y-2">
                {[
                  { name: 'BBC News', category: 'News', followers: '12M', icon: '📰', color: '#BB1919' },
                  { name: 'CNN', category: 'News', followers: '9.5M', icon: '🌐', color: '#CC0000' },
                  { name: 'TechCrunch', category: 'Technology', followers: '5.2M', icon: '💻', color: '#0A9E01' },
                  { name: 'ESPN', category: 'Sports', followers: '8.1M', icon: '⚽', color: '#D00000' },
                  { name: 'National Geographic', category: 'Science', followers: '15M', icon: '🦁', color: '#FFCC00' },
                  { name: 'NASA', category: 'Science', followers: '7.8M', icon: '🚀', color: '#0B3D91' },
                  { name: 'The Verge', category: 'Technology', followers: '3.2M', icon: '📱', color: '#E5127D' },
                  { name: 'Bloomberg', category: 'Finance', followers: '6.4M', icon: '💹', color: '#2800D7' },
                  { name: 'Netflix', category: 'Entertainment', followers: '18M', icon: '🎬', color: '#E50914' },
                  { name: 'Spotify', category: 'Music', followers: '14M', icon: '🎵', color: '#1DB954' },
                ].filter(ch => ch.name.toLowerCase().includes(channelSearch.toLowerCase()) || ch.category.toLowerCase().includes(channelSearch.toLowerCase()))
                .map(channel => (
                  <div 
                    key={channel.name}
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${isDark ? 'hover:bg-[#202c33]' : 'hover:bg-gray-100'}`}
                  >
                    <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl" style={{ backgroundColor: channel.color + '20' }}>
                      {channel.icon}
                    </div>
                    <div className="flex-1">
                      <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{channel.name}</p>
                      <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{channel.category} • {channel.followers} followers</p>
                    </div>
                    <Button size="sm" variant="outline" className="h-8 text-[#00a884] border-[#00a884]">Follow</Button>
                  </div>
                ))}
              </div>
            </div>
          </ScrollArea>
        )}

        {activeSidebarTab === 'community' && (
          <ScrollArea className="flex-1">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Communities</h3>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setActiveSidebarTab('chat')}
                  className="text-[#00a884]"
                >
                  <ArrowLeft className="w-4 h-4 mr-1" /> Back
                </Button>
              </div>
              
              {/* Search Bar */}
              <div className={`flex items-center gap-2 p-2 rounded-lg mb-4 ${isDark ? 'bg-[#202c33]' : 'bg-gray-100'}`}>
                <Search className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                <Input 
                  placeholder="Search communities..."
                  value={communitySearch}
                  onChange={(e) => setCommunitySearch(e.target.value)}
                  className={`border-0 bg-transparent focus-visible:ring-0 h-8 ${isDark ? 'text-white placeholder:text-gray-500' : ''}`}
                />
              </div>
              
              {/* Create Community Button */}
              <Button className="w-full mb-4 bg-[#00a884] hover:bg-[#00a884]/90">
                <Plus className="w-4 h-4 mr-2" /> Create New Community
              </Button>
              
              {/* Popular Communities */}
              <p className={`text-xs uppercase font-medium mb-3 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Discover Communities</p>
              <div className="space-y-2">
                {[
                  { name: 'React Developers', category: 'Technology', members: '125K', icon: '⚛️' },
                  { name: 'Photography Enthusiasts', category: 'Art', members: '89K', icon: '📷' },
                  { name: 'Fitness & Wellness', category: 'Health', members: '210K', icon: '💪' },
                  { name: 'Startup Founders', category: 'Business', members: '67K', icon: '🚀' },
                  { name: 'Gaming Community', category: 'Gaming', members: '345K', icon: '🎮' },
                  { name: 'Music Production', category: 'Music', members: '78K', icon: '🎹' },
                  { name: 'AI & Machine Learning', category: 'Technology', members: '156K', icon: '🤖' },
                  { name: 'Travel Adventures', category: 'Lifestyle', members: '198K', icon: '✈️' },
                  { name: 'Crypto & Web3', category: 'Finance', members: '234K', icon: '🪙' },
                  { name: 'Book Club', category: 'Education', members: '45K', icon: '📚' },
                ].filter(c => c.name.toLowerCase().includes(communitySearch.toLowerCase()) || c.category.toLowerCase().includes(communitySearch.toLowerCase()))
                .map(community => (
                  <div 
                    key={community.name}
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${isDark ? 'hover:bg-[#202c33]' : 'hover:bg-gray-100'}`}
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${isDark ? 'bg-[#2a3942]' : 'bg-gray-200'}`}>
                      {community.icon}
                    </div>
                    <div className="flex-1">
                      <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{community.name}</p>
                      <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{community.category} • {community.members} members</p>
                    </div>
                    <Button size="sm" variant="outline" className="h-8 text-[#00a884] border-[#00a884]">Join</Button>
                  </div>
                ))}
              </div>
            </div>
          </ScrollArea>
        )}

        {activeSidebarTab === 'media' && (
          <ScrollArea className="flex-1">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Media Files</h3>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setActiveSidebarTab('chat')}
                  className="text-[#00a884]"
                >
                  <ArrowLeft className="w-4 h-4 mr-1" /> Back
                </Button>
              </div>
              
              {/* Upload Button */}
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleMediaUpload} 
                multiple 
                accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx"
                className="hidden" 
              />
              <Button 
                className="w-full mb-4 bg-[#00a884] hover:bg-[#00a884]/90"
                onClick={() => fileInputRef.current?.click()}
              >
                <Plus className="w-4 h-4 mr-2" /> Upload Media from Computer
              </Button>
              
              <div className="flex gap-2 mb-4">
                {['All', 'Photos', 'Videos', 'Documents'].map(tab => (
                  <button
                    key={tab}
                    className={`px-3 py-1 rounded-full text-sm ${isDark ? 'bg-[#202c33] text-gray-300 hover:bg-[#2a3942]' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
              
              {/* Uploaded Files */}
              {mediaFiles.length > 0 ? (
                <div className="grid grid-cols-3 gap-2">
                  {mediaFiles.map(file => (
                    <div 
                      key={file.id}
                      className={`aspect-square rounded-lg overflow-hidden relative group ${isDark ? 'bg-[#202c33]' : 'bg-gray-100'}`}
                    >
                      {file.type.startsWith('image/') ? (
                        <img src={file.url} alt={file.name} className="w-full h-full object-cover" />
                      ) : file.type.startsWith('video/') ? (
                        <div className="w-full h-full flex items-center justify-center">
                          <Video className={`w-8 h-8 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                        </div>
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center p-2">
                          <File className={`w-8 h-8 mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                          <span className={`text-xs truncate w-full text-center ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{file.name}</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Button size="sm" variant="ghost" className="text-white" onClick={() => setMediaFiles(prev => prev.filter(f => f.id !== file.id))}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={`text-center py-12 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  <ImageIcon className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p className="text-lg font-medium">No media yet</p>
                  <p className="text-sm mt-2">Upload photos, videos and documents to see them here</p>
                </div>
              )}
            </div>
          </ScrollArea>
        )}

        {activeSidebarTab === 'games' && (
          <ScrollArea className="flex-1">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Games</h3>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setActiveSidebarTab('chat')}
                  className="text-[#00a884]"
                >
                  <ArrowLeft className="w-4 h-4 mr-1" /> Back
                </Button>
              </div>
              
              {/* Search Bar */}
              <div className={`flex items-center gap-2 p-2 rounded-lg mb-4 ${isDark ? 'bg-[#202c33]' : 'bg-gray-100'}`}>
                <Search className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                <Input 
                  placeholder="Search games..."
                  value={gameSearch}
                  onChange={(e) => setGameSearch(e.target.value)}
                  className={`border-0 bg-transparent focus-visible:ring-0 h-8 ${isDark ? 'text-white placeholder:text-gray-500' : ''}`}
                />
              </div>
              
              {/* Featured Games */}
              <p className={`text-xs uppercase font-medium mb-3 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Gaming Platforms</p>
              <div className="grid grid-cols-2 gap-3 mb-6">
                {[
                  { name: 'Poki Games', icon: '🎮', color: 'from-purple-500 to-pink-500', url: 'https://poki.com/' },
                  { name: 'CrazyGames', icon: '🎯', color: 'from-blue-500 to-cyan-500', url: 'https://www.crazygames.com/' },
                  { name: 'Miniclip', icon: '🏆', color: 'from-yellow-500 to-orange-500', url: 'https://www.miniclip.com/' },
                  { name: 'Armor Games', icon: '⚔️', color: 'from-red-500 to-pink-500', url: 'https://armorgames.com/' },
                  { name: 'Kongregate', icon: '👾', color: 'from-green-500 to-emerald-500', url: 'https://www.kongregate.com/' },
                  { name: 'Games.co.id', icon: '🎲', color: 'from-indigo-500 to-purple-500', url: 'https://www.games.co.id/' },
                  { name: 'Y8 Games', icon: '🕹️', color: 'from-teal-500 to-cyan-500', url: 'https://www.y8.com/' },
                  { name: 'Friv', icon: '🎪', color: 'from-orange-500 to-red-500', url: 'https://www.friv.com/' },
                ].filter(g => g.name.toLowerCase().includes(gameSearch.toLowerCase()))
                .map(game => (
                  <motion.div
                    key={game.name}
                    whileHover={{ scale: 1.05, y: -4 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => openExternalLink(game.url)}
                    className={`p-4 rounded-xl cursor-pointer transition-shadow hover:shadow-xl bg-gradient-to-br ${game.color} relative overflow-hidden group`}
                    data-testid={`game-${game.name.toLowerCase().replace(/\s/g, '-')}`}
                  >
                    {/* Shine effect on hover */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                    
                    <span className="text-3xl mb-2 block">{game.icon}</span>
                    <p className="text-white font-medium text-sm">{game.name}</p>
                    <div className="flex items-center gap-1 mt-2">
                      <Chrome className="w-3 h-3 text-white/80" />
                      <span className="text-white/80 text-xs font-medium">Play in Chrome</span>
                      <ExternalLink className="w-3 h-3 text-white/80 ml-auto" />
                    </div>
                  </motion.div>
                ))}
              </div>
              
              {/* More Game Sites */}
              <p className={`text-xs uppercase font-medium mb-3 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>More Gaming Sites</p>
              <div className="space-y-2">
                {[
                  { name: 'Newgrounds', url: 'https://www.newgrounds.com/games', desc: 'Indie games and animations', icon: '🎨' },
                  { name: 'Itch.io', url: 'https://itch.io/', desc: 'Indie game marketplace', icon: '🎁' },
                  { name: 'GameJolt', url: 'https://gamejolt.com/', desc: 'Free games community', icon: '⚡' },
                  { name: 'Addicting Games', url: 'https://www.addictinggames.com/', desc: 'Classic flash-style games', icon: '🔥' },
                  { name: 'Kizi', url: 'https://kizi.com/', desc: 'Fun games for everyone', icon: '🌟' },
                  { name: 'Silvergames', url: 'https://www.silvergames.com/', desc: 'Free online games', icon: '🥈' },
                  { name: 'GameDistribution', url: 'https://gamedistribution.com/', desc: 'HTML5 games platform', icon: '🌐' },
                  { name: 'Games.lol', url: 'https://games.lol/', desc: 'Play PC games online', icon: '💻' },
                ].filter(s => s.name.toLowerCase().includes(gameSearch.toLowerCase()))
                .map(site => (
                  <motion.button
                    key={site.name}
                    whileHover={{ x: 4 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => openExternalLink(site.url)}
                    className={`w-full p-3 rounded-lg text-left transition-colors flex items-center gap-3 ${
                      isDark ? 'bg-[#202c33] hover:bg-[#2a3942]' : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                  >
                    <span className="text-xl">{site.icon}</span>
                    <div className="flex-1">
                      <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{site.name}</p>
                      <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{site.desc}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Chrome className={`w-3 h-3 ${isDark ? 'text-blue-400' : 'text-blue-500'}`} />
                      <ExternalLink className={`w-4 h-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>
          </ScrollArea>
        )}

        {activeSidebarTab === 'ai' && (
          <div className="flex-1 flex flex-col">
            {/* AI Header with Back Button */}
            <div className={`flex items-center justify-between p-4 border-b ${isDark ? 'border-[#2a2a2a]' : 'border-gray-200'}`}>
              <div className="flex items-center gap-3">
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => setActiveSidebarTab('chat')}
                  className={`rounded-full ${isDark ? 'hover:bg-[#2a3942]' : 'hover:bg-gray-100'}`}
                  data-testid="ai-back-btn"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00a884] to-[#0088cc] flex items-center justify-center">
                  <Bot className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>FaceConnect AI</h3>
                  <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Always here to help</p>
                </div>
              </div>
            </div>
            
            {/* AI Chat Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {aiMessages.map((msg) => (
                  <div 
                    key={msg.id}
                    className={`flex ${msg.isAi ? 'justify-start' : 'justify-end'}`}
                  >
                    <div className={`p-3 rounded-2xl max-w-[85%] ${
                      msg.isAi 
                        ? (isDark ? 'bg-[#202c33]' : 'bg-gray-100')
                        : 'bg-[#00a884] text-white'
                    }`}>
                      {msg.isAi && (
                        <div className="flex items-center gap-2 mb-2">
                          <Bot className="w-4 h-4 text-[#00a884]" />
                          <span className={`text-xs font-medium ${isDark ? 'text-[#00a884]' : 'text-[#00a884]'}`}>AI Assistant</span>
                        </div>
                      )}
                      <p className={`text-sm whitespace-pre-wrap ${msg.isAi ? (isDark ? 'text-gray-200' : 'text-gray-800') : ''}`}>
                        {msg.text}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Quick Actions (only show if no user messages yet) */}
              {aiMessages.length === 1 && (
                <div className="mt-4 space-y-2">
                  <p className={`text-xs uppercase font-medium mb-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Quick Actions</p>
                  {[
                    { text: 'Help me write a message', icon: '✍️' },
                    { text: 'Translate to another language', icon: '🌐' },
                    { text: 'Summarize my conversations', icon: '📝' },
                    { text: 'Generate creative ideas', icon: '💡' },
                  ].map((action, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setAiInput(action.text);
                        handleSendAiMessage();
                      }}
                      className={`w-full p-3 rounded-xl text-left text-sm transition-all flex items-center gap-3 ${
                        isDark 
                          ? 'bg-[#202c33] text-gray-300 hover:bg-[#2a3942]' 
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <span className="text-xl">{action.icon}</span>
                      {action.text}
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
            
            {/* AI Input */}
            <div className={`p-4 border-t ${isDark ? 'border-[#2a2a2a]' : 'border-gray-200'}`}>
              <div className={`flex items-center gap-2 p-2 rounded-full ${isDark ? 'bg-[#202c33]' : 'bg-gray-100'}`}>
                <Input 
                  placeholder="Ask FaceConnect AI anything..."
                  value={aiInput}
                  onChange={(e) => setAiInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendAiMessage()}
                  className={`flex-1 border-0 bg-transparent focus-visible:ring-0 ${isDark ? 'text-white placeholder:text-gray-500' : ''}`}
                />
                <Button 
                  size="icon" 
                  className="rounded-full bg-[#00a884] hover:bg-[#00a884]/90 h-9 w-9"
                  onClick={handleSendAiMessage}
                  disabled={!aiInput.trim()}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
              <p className={`text-xs text-center mt-2 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                AI responses are generated and may not always be accurate
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Right Panel - Chat View */}
      <motion.div 
        className="flex-1 flex flex-col min-w-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <AnimatePresence mode="wait">
          {activeChat ? (
            <motion.div
              key={activeChat.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
              className="flex-1 flex flex-col"
            >
              {/* Chat Header */}
              <motion.div 
                className={`flex items-center justify-between px-4 py-2 ${isDark ? 'bg-[#202c33]' : 'bg-[#f0f2f5]'}`}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: 0.1 }}
              >
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
                  <Avatar 
                    className="w-10 h-10 cursor-pointer transition-transform hover:scale-105"
                    onClick={() => setShowContactInfo(true)}
                  >
                    <AvatarImage src={activeChat.avatar} />
                    <AvatarFallback className="bg-[#00a884] text-white">
                      {activeChat.name?.charAt(0)?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="cursor-pointer" onClick={() => setShowContactInfo(true)}>
                    <h3 className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {activeChat.name}
                      {favoriteChats.includes(activeChat.id) && (
                        <Heart className="w-3 h-3 inline ml-1 text-red-500 fill-red-500" />
                      )}
                    </h3>
                    <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      {activeChat.online ? 'online' : activeChat.typing ? 'typing...' : 'last seen today'}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-1">
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
                        onClick={handleCancelSelection}
                        className="text-red-500"
                      >
                        Cancel
                      </Button>
                    </motion.div>
                  )}
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="rounded-full transition-all hover:scale-110" 
                    onClick={handleVideoCall} 
                    title="Video call"
                  >
                    <Video className="w-5 h-5" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="rounded-full transition-all hover:scale-110" 
                    onClick={handleVoiceCall} 
                    title="Voice call"
                  >
                    <Phone className="w-5 h-5" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="rounded-full transition-all hover:scale-110"
                    title="Search in chat"
                  >
                    <Search className="w-5 h-5" />
                  </Button>
                  
                  {/* Chat Menu Button */}
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
                          onClick={() => { setShowContactInfo(true); setShowChatMenu(false); }}
                          className="cursor-pointer"
                        >
                          <UserCircle className="w-4 h-4 mr-3 text-blue-500" /> Contact info
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={handleSelectMessages}
                          className="cursor-pointer"
                        >
                          <CheckSquare className="w-4 h-4 mr-3 text-green-500" /> Select messages
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={handleToggleNotifications}
                          className="cursor-pointer"
                        >
                          {chatNotificationsMuted[activeChat?.id] ? (
                            <><Bell className="w-4 h-4 mr-3 text-yellow-500" /> Turn on notifications</>
                          ) : (
                            <><BellOff className="w-4 h-4 mr-3 text-yellow-500" /> Turn off notifications</>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => { setShowStarred(true); setShowChatMenu(false); }}
                          className="cursor-pointer"
                        >
                          <Pin className="w-4 h-4 mr-3 text-purple-500" /> Pinned messages
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={handleAddToFavorites}
                          className="cursor-pointer"
                        >
                          <Heart className={`w-4 h-4 mr-3 ${favoriteChats.includes(activeChat?.id) ? 'text-red-500 fill-red-500' : 'text-red-500'}`} /> 
                          {favoriteChats.includes(activeChat?.id) ? 'Remove from favorites' : 'Add to favorites'}
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={handleCloseChat}
                          className="cursor-pointer"
                        >
                          <X className="w-4 h-4 mr-3 text-gray-500" /> Close chat
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => { setShowDisappearingDialog(true); setShowChatMenu(false); }}
                          className="cursor-pointer"
                        >
                          <Timer className="w-4 h-4 mr-3 text-cyan-500" /> 
                          Disappearing messages
                          {disappearingSettings[activeChat?.id] && disappearingSettings[activeChat?.id] !== 'off' && (
                            <span className="ml-auto text-xs text-[#00a884]">{disappearingSettings[activeChat?.id]}</span>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => { setShowWallpaperPicker(true); setShowChatMenu(false); }}
                          className="cursor-pointer"
                        >
                          <ImageIcon className="w-4 h-4 mr-3 text-pink-500" /> Wallpaper
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={handleReportBlock}
                          className="cursor-pointer text-orange-500"
                        >
                          <Flag className="w-4 h-4 mr-3" /> Report & Block
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={handleEmptyChat}
                          className="cursor-pointer text-amber-500"
                        >
                          <Eraser className="w-4 h-4 mr-3" /> Empty chat
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={handleDeleteChat}
                          className="cursor-pointer text-red-500"
                        >
                          <Trash2 className="w-4 h-4 mr-3" /> Delete chat
                        </DropdownMenuItem>
                      </motion.div>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </motion.div>

              {/* Messages */}
              <ScrollArea 
                className="flex-1 px-4 sm:px-8 md:px-12 lg:px-16 py-4"
                style={getWallpaperStyle(chatWallpapers[activeChat?.id], isDark)}
              >
                <AnimatePresence>
                  {messages.map((message, index) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 20, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.2, delay: index * 0.03 }}
                      onClick={() => selectingMessages && toggleMessageSelection(message.id)}
                      className={`relative ${selectingMessages ? 'cursor-pointer' : ''}`}
                    >
                      {selectingMessages && (
                        <div className={`absolute left-0 top-1/2 -translate-y-1/2 -translate-x-8 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                          selectedMessageIds.includes(message.id) 
                            ? 'bg-[#00a884] border-[#00a884]' 
                            : isDark ? 'border-gray-500' : 'border-gray-400'
                        }`}>
                          {selectedMessageIds.includes(message.id) && <Check className="w-3 h-3 text-white" />}
                        </div>
                      )}
                      <EnhancedMessageBubble
                        message={message}
                        isMe={message.isMe}
                        isDark={isDark}
                        onReply={(msg) => setReplyToMessage(msg)}
                        onReact={handleReaction}
                        showReactionPicker={showReactionPicker}
                        setShowReactionPicker={setShowReactionPicker}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
                
                {/* Typing Indicator */}
                <AnimatePresence>
                  {activeChat?.typing && (
                    <TypingIndicator isDark={isDark} userName={activeChat.name} />
                  )}
                </AnimatePresence>
                
                <div ref={messagesEndRef} />
              </ScrollArea>

              {/* Reply Preview */}
              <AnimatePresence>
                {replyToMessage && (
                  <ReplyPreview 
                    replyTo={replyToMessage} 
                    onCancel={() => setReplyToMessage(null)} 
                    isDark={isDark}
                  />
                )}
              </AnimatePresence>

            {/* Message Input - Voice Recording Mode */}
            <AnimatePresence>
              {isRecordingVoice ? (
                <VoiceRecorder 
                  onSend={handleSendVoiceMessage}
                  onCancel={() => setIsRecordingVoice(false)}
                  isDark={isDark}
                />
              ) : (
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
                      placeholder={replyToMessage ? `Reply to ${replyToMessage.isMe ? 'yourself' : activeChat?.name}...` : "Type a message"}
                      value={messageInput}
                      onChange={(e) => {
                        setMessageInput(e.target.value);
                        handleTyping();
                      }}
                      onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                      className={`border-0 bg-transparent focus-visible:ring-0 ${isDark ? 'text-white placeholder:text-gray-400' : ''}`}
                    />
                  </div>
                  
                  {messageInput.trim() ? (
                    <Button 
                      size="icon" 
                      className="rounded-full bg-[#00a884] hover:bg-[#00a884]/90"
                      onClick={handleSendMessage}
                      data-testid="send-message-btn"
                    >
                      <Send className="w-5 h-5 text-white" />
                    </Button>
                  ) : (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="rounded-full hover:bg-[#00a884]/20"
                      onClick={() => setIsRecordingVoice(true)}
                      data-testid="voice-message-btn"
                    >
                      <Mic className="w-6 h-6 text-gray-500 hover:text-[#00a884]" />
                    </Button>
                  )}
                </div>
              )}
            </AnimatePresence>
            </motion.div>
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
        </AnimatePresence>
      </motion.div>
      
      {/* Contact Info Panel */}
      <AnimatePresence>
        {showContactInfo && activeChat && (
          <motion.div
            initial={{ x: 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 400, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className={`absolute right-0 top-0 bottom-0 w-[320px] z-50 flex flex-col border-l ${isDark ? 'bg-[#111b21] border-[#2a2a2a]' : 'bg-white border-gray-200'}`}
            data-testid="contact-info-panel"
          >
            {/* Header */}
            <div className={`flex items-center gap-4 px-4 py-3 border-b ${isDark ? 'bg-[#202c33] border-[#2a2a2a]' : 'bg-[#f0f2f5] border-gray-200'}`}>
              <Button 
                variant="ghost" 
                size="icon" 
                className="rounded-full"
                onClick={() => setShowContactInfo(false)}
              >
                <X className="w-5 h-5" />
              </Button>
              <h2 className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Contact info</h2>
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
              </div>
              
              {/* About */}
              <div className={`mx-4 p-4 rounded-xl mb-4 ${isDark ? 'bg-[#202c33]' : 'bg-gray-50'}`}>
                <p className={`text-xs font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>About</p>
                <p className={isDark ? 'text-white' : 'text-gray-900'}>Hey there! I'm using FaceConnect.</p>
              </div>
              
              {/* Media */}
              <div className={`mx-4 p-4 rounded-xl mb-4 ${isDark ? 'bg-[#202c33]' : 'bg-gray-50'}`}>
                <div className="flex items-center justify-between mb-3">
                  <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Media, links and docs</p>
                  <ChevronDown className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                </div>
                <div className="grid grid-cols-3 gap-1">
                  {[1,2,3].map(i => (
                    <div key={i} className={`aspect-square rounded ${isDark ? 'bg-[#2a3942]' : 'bg-gray-200'}`} />
                  ))}
                </div>
              </div>
              
              {/* Actions */}
              <div className="px-4 pb-4 space-y-1">
                <button className={`w-full flex items-center gap-3 p-3 rounded-lg ${isDark ? 'hover:bg-[#202c33]' : 'hover:bg-gray-100'}`}>
                  <Star className="w-5 h-5 text-[#00a884]" />
                  <span className={isDark ? 'text-white' : 'text-gray-900'}>Starred messages</span>
                </button>
                <button className={`w-full flex items-center gap-3 p-3 rounded-lg ${isDark ? 'hover:bg-[#202c33]' : 'hover:bg-gray-100'}`}>
                  <Bell className="w-5 h-5 text-[#00a884]" />
                  <span className={isDark ? 'text-white' : 'text-gray-900'}>Mute notifications</span>
                </button>
                <button className={`w-full flex items-center gap-3 p-3 rounded-lg text-red-500`} onClick={handleReportBlock}>
                  <AlertOctagon className="w-5 h-5" />
                  <span>Block {activeChat.name}</span>
                </button>
                <button className={`w-full flex items-center gap-3 p-3 rounded-lg text-red-500`} onClick={handleDeleteChat}>
                  <Trash2 className="w-5 h-5" />
                  <span>Delete chat</span>
                </button>
              </div>
            </ScrollArea>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Settings Dialog */}
      <DesktopSettings isOpen={showSettings} onClose={() => setShowSettings(false)} />
      
      {/* Account Panel */}
      <AnimatePresence>
        {showAccount && (
          <motion.div
            initial={{ x: -400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -400, opacity: 0 }}
            className={`absolute left-0 top-0 bottom-0 w-[400px] z-50 flex flex-col ${isDark ? 'bg-[#111b21]' : 'bg-white'}`}
            data-testid="account-panel"
          >
            {/* Account Header */}
            <div className={`flex items-center gap-6 px-6 py-4 ${isDark ? 'bg-[#202c33]' : 'bg-[#00a884]'}`}>
              <Button 
                variant="ghost" 
                size="icon" 
                className="rounded-full text-white hover:bg-white/10"
                onClick={() => setShowAccount(false)}
                data-testid="account-back-btn"
              >
                <ArrowLeft className="w-6 h-6" />
              </Button>
              <h2 className="text-xl font-medium text-white">Account</h2>
            </div>
            
            <ScrollArea className="flex-1">
              {/* Profile Section */}
              <div className="text-center py-8 px-6">
                <div className="relative inline-block">
                  <Avatar className="w-32 h-32 mx-auto mb-4 ring-4 ring-[#00a884]/20">
                    <AvatarImage src={user?.avatar} />
                    <AvatarFallback className="bg-[#00a884] text-white text-4xl">
                      {user?.display_name?.charAt(0)?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <button className={`absolute bottom-4 right-0 p-2 rounded-full ${isDark ? 'bg-[#00a884]' : 'bg-[#00a884]'}`}>
                    <Camera className="w-4 h-4 text-white" />
                  </button>
                </div>
                <h3 className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {user?.display_name || user?.username}
                </h3>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  @{user?.username}
                </p>
                <p className={`text-sm mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                  {user?.email}
                </p>
              </div>

              {/* Status */}
              <div className={`mx-4 p-4 rounded-xl mb-4 ${isDark ? 'bg-[#202c33]' : 'bg-gray-50'}`}>
                <p className={`text-xs font-medium mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>About</p>
                <p className={isDark ? 'text-white' : 'text-gray-900'}>
                  {user?.status || "Hey, I'm using FaceConnect!"}
                </p>
              </div>
              
              {/* Account Options */}
              <div className="px-4 pb-6">
                <p className={`text-xs font-medium mb-3 px-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Settings</p>
                <div className="space-y-1">
                  {[
                    { label: 'Privacy', description: 'Last seen, profile photo, about', icon: Lock, onClick: () => navigate('/settings/privacy') },
                    { label: 'Security', description: 'Security notifications, linked devices', icon: Shield, onClick: () => navigate('/settings/security') },
                    { label: 'Two-step verification', description: 'Add extra security to your account', icon: Key },
                    { label: 'Change number', description: 'Change your phone number', icon: Smartphone },
                    { label: 'Request account info', description: 'Download your account data', icon: FileText },
                    { label: 'Delete account', description: 'Permanently delete your account', icon: Trash2, danger: true },
                  ].map((item) => (
                    <button
                      key={item.label}
                      onClick={item.onClick}
                      className={`w-full flex items-center gap-4 px-4 py-3 rounded-lg transition-colors text-left ${
                        isDark 
                          ? 'hover:bg-[#202c33]' 
                          : 'hover:bg-gray-100'
                      }`}
                    >
                      <div className={`p-2 rounded-full ${item.danger ? 'bg-red-500/10' : (isDark ? 'bg-[#00a884]/10' : 'bg-[#00a884]/10')}`}>
                        <item.icon className={`w-5 h-5 ${item.danger ? 'text-red-500' : 'text-[#00a884]'}`} />
                      </div>
                      <div className="flex-1">
                        <span className={`block ${item.danger ? 'text-red-500' : (isDark ? 'text-white' : 'text-gray-900')}`}>
                          {item.label}
                        </span>
                        <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                          {item.description}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </ScrollArea>
          </motion.div>
        )}
      </AnimatePresence>

      {/* New Group Panel */}
      <AnimatePresence>
        {showNewGroup && (
          <motion.div
            initial={{ x: -400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -400, opacity: 0 }}
            className={`absolute left-0 top-0 bottom-0 w-[400px] z-50 flex flex-col ${isDark ? 'bg-[#111b21]' : 'bg-white'}`}
            data-testid="new-group-panel"
          >
            {/* Header */}
            <div className={`flex items-center gap-6 px-6 py-4 ${isDark ? 'bg-[#202c33]' : 'bg-[#00a884]'}`}>
              <Button 
                variant="ghost" 
                size="icon" 
                className="rounded-full text-white hover:bg-white/10"
                onClick={() => setShowNewGroup(false)}
                data-testid="new-group-back-btn"
              >
                <ArrowLeft className="w-6 h-6" />
              </Button>
              <h2 className="text-xl font-medium text-white">New Group</h2>
            </div>
            
            <div className="p-4 flex-1 flex flex-col">
              {/* Selected Members Preview */}
              {selectedMembers.length > 0 && (
                <div className={`flex flex-wrap gap-2 p-3 rounded-lg mb-4 ${isDark ? 'bg-[#202c33]' : 'bg-gray-100'}`}>
                  {selectedMembers.map(memberId => {
                    const member = chats.find(c => c.id === memberId);
                    return member ? (
                      <div 
                        key={memberId}
                        className="flex items-center gap-2 bg-[#00a884]/20 text-[#00a884] px-2 py-1 rounded-full text-sm"
                      >
                        <span>{member.name}</span>
                        <button 
                          onClick={() => setSelectedMembers(prev => prev.filter(id => id !== memberId))}
                          className="hover:bg-[#00a884]/30 rounded-full p-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : null;
                  })}
                </div>
              )}

              {/* Group Name Input */}
              <div className={`flex items-center gap-4 p-4 rounded-lg mb-4 ${isDark ? 'bg-[#202c33]' : 'bg-gray-100'}`}>
                <div className={`w-12 h-12 rounded-full flex items-center justify-center cursor-pointer hover:opacity-80 ${isDark ? 'bg-[#2a3942]' : 'bg-gray-200'}`}>
                  <Camera className={`w-6 h-6 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                </div>
                <Input
                  placeholder="Group name (required)"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className={`border-0 bg-transparent focus-visible:ring-0 ${isDark ? 'text-white placeholder:text-gray-400' : ''}`}
                  data-testid="group-name-input"
                />
              </div>
              
              {/* Search Members */}
              <div className={`flex items-center gap-3 px-4 py-2 rounded-lg mb-4 ${isDark ? 'bg-[#202c33]' : 'bg-gray-100'}`}>
                <Search className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                <Input
                  placeholder="Search contacts"
                  className={`border-0 bg-transparent focus-visible:ring-0 ${isDark ? 'text-white placeholder:text-gray-400' : ''}`}
                />
              </div>
              
              {/* Contact List */}
              <p className={`text-xs font-medium uppercase mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Contacts ({chats.filter(c => !c.isGroup).length})
              </p>
              <ScrollArea className="flex-1 min-h-0">
                {chats.filter(c => !c.isGroup).map((contact) => (
                  <div
                    key={contact.id}
                    onClick={() => {
                      if (selectedMembers.includes(contact.id)) {
                        setSelectedMembers(prev => prev.filter(id => id !== contact.id));
                      } else {
                        setSelectedMembers(prev => [...prev, contact.id]);
                      }
                    }}
                    className={`flex items-center gap-3 px-3 py-2 cursor-pointer rounded-lg transition-colors ${
                      selectedMembers.includes(contact.id) 
                        ? (isDark ? 'bg-[#00a884]/20' : 'bg-[#00a884]/10')
                        : (isDark ? 'hover:bg-[#202c33]' : 'hover:bg-gray-100')
                    }`}
                    data-testid={`contact-${contact.id}`}
                  >
                    <div className="relative">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={contact.avatar} />
                        <AvatarFallback className="bg-[#00a884] text-white">
                          {contact.name?.charAt(0)?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {selectedMembers.includes(contact.id) && (
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#00a884] rounded-full flex items-center justify-center">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <span className={isDark ? 'text-white' : 'text-gray-900'}>{contact.name}</span>
                      {contact.online && (
                        <span className="text-xs text-[#00a884] ml-2">online</span>
                      )}
                    </div>
                  </div>
                ))}
                {chats.filter(c => !c.isGroup).length === 0 && (
                  <div className={`text-center py-8 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                    <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No contacts yet</p>
                  </div>
                )}
              </ScrollArea>
              
              {/* Create Button */}
              <Button 
                className="w-full mt-4 bg-[#00a884] hover:bg-[#00a884]/90 disabled:opacity-50"
                onClick={handleCreateGroup}
                disabled={!groupName.trim() || selectedMembers.length === 0}
                data-testid="create-group-btn"
              >
                <Users className="w-4 h-4 mr-2" />
                Create Group {selectedMembers.length > 0 && `(${selectedMembers.length} members)`}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Archived Chats Panel */}
      <AnimatePresence>
        {showArchived && (
          <motion.div
            initial={{ x: -400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -400, opacity: 0 }}
            className={`absolute left-0 top-0 bottom-0 w-[400px] z-50 flex flex-col ${isDark ? 'bg-[#111b21]' : 'bg-white'}`}
            data-testid="archived-panel"
          >
            {/* Header */}
            <div className={`flex items-center gap-6 px-6 py-4 ${isDark ? 'bg-[#202c33]' : 'bg-[#00a884]'}`}>
              <Button 
                variant="ghost" 
                size="icon" 
                className="rounded-full text-white hover:bg-white/10"
                onClick={() => setShowArchived(false)}
                data-testid="archived-back-btn"
              >
                <ArrowLeft className="w-6 h-6" />
              </Button>
              <h2 className="text-xl font-medium text-white">Archived ({archivedChats.length})</h2>
            </div>
            
            <ScrollArea className="flex-1">
              {archivedChats.length === 0 ? (
                <div className={`flex flex-col items-center justify-center h-64 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
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
                    className={`flex items-center gap-3 px-4 py-3 cursor-pointer border-b ${isDark ? 'border-[#2a2a2a] hover:bg-[#202c33]' : 'border-gray-100 hover:bg-gray-50'}`}
                  >
                    <Avatar className="w-12 h-12" onClick={() => { setActiveChat(chat); setShowArchived(false); }}>
                      <AvatarImage src={chat.avatar} />
                      <AvatarFallback className="bg-[#00a884] text-white">
                        {chat.name?.charAt(0)?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0" onClick={() => { setActiveChat(chat); setShowArchived(false); }}>
                      <p className={`font-medium truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{chat.name}</p>
                      <p className={`text-sm truncate ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        {chat.last_message?.content || "Archived chat"}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-full"
                      onClick={(e) => { e.stopPropagation(); handleUnarchiveChat(chat.id); }}
                      title="Unarchive"
                    >
                      <Archive className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                    </Button>
                  </div>
                ))
              )}
            </ScrollArea>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Starred Messages Panel */}
      <AnimatePresence>
        {showStarred && (
          <motion.div
            initial={{ x: -400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -400, opacity: 0 }}
            className={`absolute left-0 top-0 bottom-0 w-[400px] z-50 flex flex-col ${isDark ? 'bg-[#111b21]' : 'bg-white'}`}
            data-testid="starred-panel"
          >
            {/* Header */}
            <div className={`flex items-center gap-6 px-6 py-4 ${isDark ? 'bg-[#202c33]' : 'bg-[#00a884]'}`}>
              <Button 
                variant="ghost" 
                size="icon" 
                className="rounded-full text-white hover:bg-white/10"
                onClick={() => setShowStarred(false)}
                data-testid="starred-back-btn"
              >
                <ArrowLeft className="w-6 h-6" />
              </Button>
              <h2 className="text-xl font-medium text-white">Starred Messages ({starredMessages.length})</h2>
            </div>
            
            <ScrollArea className="flex-1">
              {starredMessages.length === 0 ? (
                <div className={`flex flex-col items-center justify-center h-64 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
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
                      className={`p-4 rounded-xl ${isDark ? 'bg-[#202c33]' : 'bg-gray-50'} transition-colors hover:${isDark ? 'bg-[#2a3942]' : 'bg-gray-100'}`}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={msg.sender_avatar} />
                          <AvatarFallback className="bg-[#00a884] text-white text-xs">
                            {msg.from?.charAt(0)?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            {msg.from}
                          </span>
                          <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                            {msg.date ? new Date(msg.date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                          </p>
                        </div>
                        <button 
                          onClick={() => handleToggleStarMessage(msg.id, true)}
                          className="p-1 hover:bg-white/10 rounded-full"
                          title="Unstar message"
                        >
                          <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        </button>
                      </div>
                      <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        {msg.text}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Call Manager */}
      <CallManager
        isOpen={isCallOpen}
        onClose={endCall}
        callType={callType}
        contact={callContact}
        isIncoming={isIncoming}
        incomingCallId={incomingCallId}
      />
      
      {/* ALO Voice Assistant */}
      <AloVoiceAssistant 
        isOpen={showAlo} 
        onClose={() => setShowAlo(false)} 
        isDark={isDark}
      />
      
      {/* Disappearing Messages Dialog */}
      <DisappearingMessagesDialog
        open={showDisappearingDialog}
        onClose={() => setShowDisappearingDialog(false)}
        currentSetting={activeChat ? disappearingSettings[activeChat.id] : 'off'}
        onSave={handleSaveDisappearing}
        isDark={isDark}
      />
      
      {/* Wallpaper Picker Dialog */}
      <WallpaperPicker
        open={showWallpaperPicker}
        onClose={() => setShowWallpaperPicker(false)}
        currentWallpaper={activeChat ? chatWallpapers[activeChat.id] : null}
        onSave={handleSaveWallpaper}
        isDark={isDark}
      />
      
      {/* Floating Social Media Popup Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <AnimatePresence>
          {showSocialPopup && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 20 }}
              transition={{ type: "spring", damping: 20, stiffness: 300 }}
              className={`absolute bottom-16 right-0 rounded-2xl shadow-2xl overflow-hidden ${
                isDark ? 'bg-[#233138] border border-[#2a3942]' : 'bg-white border border-gray-200'
              }`}
              style={{ minWidth: '240px' }}
            >
              {/* Header with Back Button */}
              <div className={`flex items-center gap-2 px-3 py-2.5 border-b ${
                isDark ? 'bg-[#1a2328] border-[#2a3942]' : 'bg-gray-50 border-gray-200'
              }`}>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowSocialPopup(false)}
                  className={`h-7 w-7 rounded-full ${isDark ? 'hover:bg-[#2a3942]' : 'hover:bg-gray-200'}`}
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <h4 className={`flex-1 text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Social Media
                </h4>
                <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-blue-500/10">
                  <Chrome className="w-3 h-3 text-blue-500" />
                  <span className="text-[10px] text-blue-500 font-medium">Browser</span>
                </div>
              </div>
              
              <div className="p-2 space-y-1">
                {[
                  { name: 'Facebook', url: 'https://www.facebook.com', color: '#1877F2', icon: (
                    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                  )},
                  { name: 'Instagram', url: 'https://www.instagram.com', color: '#E4405F', icon: (
                    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                    </svg>
                  )},
                  { name: 'TikTok', url: 'https://www.tiktok.com', color: '#000000', icon: (
                    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
                    </svg>
                  )},
                  { name: 'Telegram', url: 'https://web.telegram.org/a/', color: '#0088cc', icon: (
                    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                    </svg>
                  )},
                  { name: 'WhatsApp', url: 'https://web.whatsapp.com', color: '#25D366', icon: (
                    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                  )},
                  { name: 'YouTube', url: 'https://www.youtube.com', color: '#FF0000', icon: (
                    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                    </svg>
                  )},
                ].map((social) => (
                  <motion.button
                    key={social.name}
                    whileHover={{ x: 4, backgroundColor: isDark ? 'rgba(42,57,66,0.8)' : 'rgba(243,244,246,1)' }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      openExternalLink(social.url);
                      setShowSocialPopup(false);
                    }}
                    className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-colors ${
                      isDark ? 'hover:bg-[#2a3942]' : 'hover:bg-gray-100'
                    }`}
                  >
                    <span style={{ color: social.color }}>{social.icon}</span>
                    <span className={`flex-1 text-left text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {social.name}
                    </span>
                    <ExternalLink className={`w-3.5 h-3.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                  </motion.button>
                ))}
              </div>
              
              {/* Arrow pointer */}
              <div className={`absolute -bottom-2 right-6 w-4 h-4 rotate-45 ${
                isDark ? 'bg-[#233138] border-r border-b border-[#2a3942]' : 'bg-white border-r border-b border-gray-200'
              }`} />
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Floating Buttons Container - Only Social Button */}
        <div className="flex items-center gap-3">
          {/* Social Media Popup Button */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowSocialPopup(!showSocialPopup)}
            className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all ${
              showSocialPopup
                ? 'bg-red-500 hover:bg-red-600'
                : 'bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 hover:from-blue-600 hover:via-purple-600 hover:to-pink-600'
            }`}
            data-testid="social-popup-btn"
          >
            <AnimatePresence mode="wait">
              {showSocialPopup ? (
                <motion.div
                  key="close"
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <X className="w-6 h-6 text-white" />
                </motion.div>
              ) : (
                <motion.div
                  key="social"
                  initial={{ rotate: 90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: -90, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center justify-center"
                >
                  <Users className="w-6 h-6 text-white" />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
        </div>
        
        {/* Tooltips */}
        {!showSocialPopup && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`absolute -top-10 right-0 flex gap-8 text-xs font-medium ${
              isDark ? 'text-gray-400' : 'text-gray-500'
            }`}
          >
            <span>Chat</span>
            <span>Social</span>
          </motion.div>
        )}
      </div>
      
      {/* Auto Update Manager - Shows notifications when updates are available */}
      <UpdateManager isDark={isDark} />
      
      {/* Embedded Browser */}
      <EmbeddedBrowser
        isOpen={showBrowser}
        onClose={() => setShowBrowser(false)}
        initialUrl={browserUrl}
        isDark={isDark}
      />
    </div>
    </TooltipProvider>
  );
}
