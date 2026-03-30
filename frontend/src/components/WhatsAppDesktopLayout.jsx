import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Search, MoreVertical, MessageCircle, Users, Phone, Video,
  Settings, Archive, Star, Bell, BellOff, Pin, Trash2, X,
  Check, CheckCheck, Clock, Image, Paperclip, Mic, Send,
  Smile, Camera, File, MapPin, Contact, ChevronDown,
  Circle, Filter, Plus, RefreshCw, Moon, Sun, LogOut,
  ArrowLeft, ArrowRight, Info, Lock, Download, Shield, Key, Smartphone, FileText, AlertTriangle,
  Radio, Tv, ImageIcon, Gamepad2, ExternalLink, Sparkles,
  UserCircle, CheckSquare, Heart, Flag, AlertOctagon, Eraser, Zap, Brain,
  Reply, Timer, Bot, Wand2, AudioWaveform, Chrome, UserPlus, UserCheck, Mail, Globe, BookUser
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
import { useLanguage } from "@/context/LanguageContext";
import { isElectron } from "@/utils/electron";
import DesktopSettings from "@/components/DesktopSettings";
import ElectronUpdateButton from "@/components/ElectronUpdateButton";
import BackButton from "@/components/BackButton";
import CallManager, { useCallManager } from "@/components/CallManager";
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

// Import refactored components
import { 
  ChatListItem, 
  CopilotPanel, 
  AIPanel, 
  DesktopSidebar,
  GamesPanel,
  MediaPanel,
  TranslationPanel,
  DictionaryPopup,
  ContactInfoPanel,
  AccountPanel,
  NewGroupPanel,
  EmptyState,
  ChatHeader,
  ArchivedChatsPanel,
  StarredMessagesPanel,
  CustomTitleBar,
  fadeIn, 
  slideUp, 
  slideIn, 
  scaleIn 
} from "@/components/desktop";

const API_URL = process.env.REACT_APP_BACKEND_URL || 'https://profile-connector-3.emergent.host';

// WhatsApp-style Message Bubble
function MessageBubble({ message, isMe, isDark, showAvatar }) {
  const getStatusIcon = (status) => {
    switch (status) {
      case 'sent': return <Check className="w-3 h-3" />;
      case 'delivered': return <CheckCheck className="w-3 h-3" />;
      case 'read': return <CheckCheck className="w-3 h-3 text-[#00D9FF]" />;
      default: return <Clock className="w-3 h-3" />;
    }
  };

  return (
    <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-1`}>
      <div
        className={`relative max-w-[65%] px-3 py-2 rounded-lg ${
          isMe
            ? 'bg-[#00BFA5] text-white rounded-tr-none'
            : isDark
              ? 'bg-[#161B22] text-white rounded-tl-none'
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
  const { t, language } = useLanguage();
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false); // Sidebar collapse state
  
  // New group state
  const [groupName, setGroupName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState([]);
  
  // Archived and starred messages
  const [archivedChats, setArchivedChats] = useState([]);
  const [starredMessages, setStarredMessages] = useState([]);
  
  // Search states for different tabs
  const [channelSearch, setChannelSearch] = useState("");
  const [communitySearch, setCommunitySearch] = useState("");
  
  // AI Chat state
  const [aiMessages, setAiMessages] = useState([
    { id: 1, text: "Hello! I'm your FaceConnect AI assistant. I can help you with writing messages, translations, summaries, and more. How can I assist you today?", isAi: true }
  ]);
  const [aiInput, setAiInput] = useState("");
  
  // Media files state
  const [mediaFiles, setMediaFiles] = useState([]);
  
  // Dictionary popup state
  const [dictionaryPopup, setDictionaryPopup] = useState({ show: false, word: '', position: null });
  
  // Universal Search state
  const [searchType, setSearchType] = useState("chats"); // chats, users, media, web, contacts
  const [searchResults, setSearchResults] = useState({ users: [], media: [], chats: [] });
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  
  // Contact Sync state
  const [showContactSync, setShowContactSync] = useState(false);
  const [showContactImportModal, setShowContactImportModal] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [syncedContacts, setSyncedContacts] = useState([]);
  const [friendSuggestions, setFriendSuggestions] = useState([]);
  const [isSyncingContacts, setIsSyncingContacts] = useState(false);
  const [pendingRequests, setPendingRequests] = useState(new Set());
  const [importedContacts, setImportedContacts] = useState([]);
  const [importSource, setImportSource] = useState(null); // 'google', 'facebook', 'phone', 'csv'
  
  // Contact Preview Modal state
  const [showContactPreview, setShowContactPreview] = useState(false);
  const [previewContacts, setPreviewContacts] = useState([]);
  const [matchedUsers, setMatchedUsers] = useState([]);
  const [selectedContactIds, setSelectedContactIds] = useState(new Set());
  
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
  
  // Attachment menu state
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [showContactPicker, setShowContactPicker] = useState(false);
  const [sendingLocation, setSendingLocation] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef = useRef(null);
  const cameraVideoRef = useRef(null);
  const cameraStreamRef = useRef(null);
  
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  // ============== CONTACT SYNC FUNCTIONS ==============
  
  // Fetch all registered users
  const fetchAllUsers = async () => {
    if (!token) return;
    setIsSyncingContacts(true);
    try {
      const response = await fetch(`${API_URL}/api/contacts/all-users?token=${token}&limit=100`);
      if (response.ok) {
        const data = await response.json();
        setAllUsers(data.users || []);
        // Update pending requests set
        const pending = new Set(data.users.filter(u => u.request_sent).map(u => u.id));
        setPendingRequests(pending);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
    setIsSyncingContacts(false);
  };
  
  // Fetch friend suggestions
  const fetchFriendSuggestions = async () => {
    if (!token) return;
    try {
      const response = await fetch(`${API_URL}/api/contacts/suggestions?token=${token}&limit=10`);
      if (response.ok) {
        const data = await response.json();
        setFriendSuggestions(data.suggestions || []);
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    }
  };
  
  // Search users by query
  const searchUsers = async (query) => {
    if (!token || !query || query.length < 2) return;
    try {
      const response = await fetch(`${API_URL}/api/contacts/search?token=${token}&query=${encodeURIComponent(query)}&limit=20`);
      if (response.ok) {
        const data = await response.json();
        setSearchResults(prev => ({ ...prev, users: data.users || [] }));
      }
    } catch (error) {
      console.error('Error searching users:', error);
    }
  };
  
  // Send friend request
  const sendFriendRequest = async (userId) => {
    if (!token) return;
    try {
      const response = await fetch(`${API_URL}/api/friends/request?token=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId })
      });
      if (response.ok) {
        toast.success('Friend request sent!');
        setPendingRequests(prev => new Set([...prev, userId]));
        // Update user lists
        setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, request_sent: true } : u));
        setSearchResults(prev => ({
          ...prev,
          users: prev.users.map(u => u.id === userId ? { ...u, request_sent: true } : u)
        }));
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to send request');
      }
    } catch (error) {
      toast.error('Failed to send friend request');
    }
  };
  
  // Auto-add as friend (for synced contacts)
  const autoAddFriend = async (userId) => {
    if (!token) return;
    try {
      const response = await fetch(`${API_URL}/api/contacts/auto-add?token=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_ids: [userId] })
      });
      if (response.ok) {
        toast.success('Friend added!');
        setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, is_friend: true } : u));
      }
    } catch (error) {
      toast.error('Failed to add friend');
    }
  };
  
  // Sync contacts from device (simulated for Electron)
  const syncDeviceContacts = async () => {
    if (!token) return;
    setIsSyncingContacts(true);
    
    // In a real app, this would use Electron's native contact access
    // For now, we'll fetch all users as "synced contacts"
    try {
      await fetchAllUsers();
      await fetchFriendSuggestions();
      toast.success('Contacts synchronized!');
    } catch (error) {
      toast.error('Failed to sync contacts');
    }
    
    setIsSyncingContacts(false);
  };
  
  // Load contacts when opening contact sync
  useEffect(() => {
    if (showContactSync && token) {
      fetchAllUsers();
      fetchFriendSuggestions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showContactSync, token]);
  
  // ============== CONTACT IMPORT FUNCTIONS ==============
  
  // Import from Google Contacts (using Google OAuth)
  const importGoogleContacts = async () => {
    setImportSource('google');
    setIsSyncingContacts(true);
    
    try {
      // Determine the correct redirect URI based on environment
      // For Electron (file:// protocol), we need to use the backend callback
      const isElectronApp = window.location.protocol === 'file:' || window.electronAPI;
      const redirectUri = isElectronApp 
        ? `${API_URL}/api/google/callback`  // Backend handles the callback
        : `${window.location.origin}/contacts/google-callback`;
      
      console.log('[Google OAuth] Starting OAuth flow, isElectron:', isElectronApp);
      console.log('[Google OAuth] API_URL:', API_URL);
      console.log('[Google OAuth] Redirect URI:', redirectUri);
      
      // Get Google OAuth URL from backend
      const response = await fetch(`${API_URL}/api/google/auth-url?redirect_uri=${encodeURIComponent(redirectUri)}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Google OAuth] Failed to get auth URL:', response.status, errorText);
        toast.error('Google OAuth not configured on server');
        setIsSyncingContacts(false);
        return;
      }
      
      const data = await response.json();
      console.log('[Google OAuth] Got auth URL successfully');
      
      // For Electron, open in external browser and use backend callback
      if (isElectronApp) {
        // Store state for when user returns
        const state = btoa(JSON.stringify({ token, timestamp: Date.now() }));
        const authUrlWithState = `${data.auth_url}&state=${state}`;
        
        console.log('[Google OAuth] Opening in external browser...');
        
        // Try to open in external browser
        if (window.electronAPI?.openExternal) {
          try {
            const result = await window.electronAPI.openExternal(authUrlWithState);
            
            // Check if openExternal returned an error
            if (result && result.success === false) {
              console.error('[Google OAuth] openExternal failed:', result.error);
              // Fallback: Show the URL to user for manual copying
              toast.info(
                <div>
                  <p>Could not open browser automatically.</p>
                  <p className="text-xs mt-1 break-all">Copy this URL to your browser:</p>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(authUrlWithState);
                      toast.success('URL copied to clipboard!');
                    }}
                    className="mt-2 px-3 py-1 bg-[#00E676] text-white rounded text-sm"
                  >
                    Copy URL
                  </button>
                </div>,
                { duration: 15000 }
              );
            } else {
              toast.info('Complete Google sign-in in your browser, then return here.', { duration: 5000 });
            }
          } catch (openError) {
            console.error('[Google OAuth] Error calling openExternal:', openError);
            // Fallback: copy URL to clipboard
            try {
              await navigator.clipboard.writeText(authUrlWithState);
              toast.info('Browser couldn\'t open. URL copied to clipboard - paste it in your browser!', { duration: 8000 });
            } catch (clipboardError) {
              toast.error('Could not open browser or copy URL. Please try again.', { duration: 5000 });
              setIsSyncingContacts(false);
              return;
            }
          }
        } else {
          // No openExternal available, try window.open as fallback
          console.log('[Google OAuth] No openExternal, trying window.open...');
          window.open(authUrlWithState, '_blank');
          toast.info('Complete Google sign-in in the opened window.', { duration: 5000 });
        }
        
        // Poll backend for completion (backend stores token after callback)
        let attempts = 0;
        const maxAttempts = 180; // 3 minutes
        const pollInterval = setInterval(async () => {
          attempts++;
          try {
            const tokenCheck = await fetch(`${API_URL}/api/google/check-token?state=${state}`);
            if (tokenCheck.ok) {
              const tokenData = await tokenCheck.json();
              if (tokenData.access_token) {
                console.log('[Google OAuth] Token received from polling!');
                clearInterval(pollInterval);
                await fetchGoogleContacts(tokenData.access_token);
                return;
              }
            }
          } catch (e) {
            // Continue polling
          }
          
          if (attempts >= maxAttempts) {
            clearInterval(pollInterval);
            setIsSyncingContacts(false);
            toast.error('Google sign-in timed out. Please try again.');
          }
        }, 1000);
        
        return;
      }
      
      // For web, use popup
      // Store current state for after OAuth
      sessionStorage.setItem('google_oauth_state', JSON.stringify({
        returnUrl: window.location.href,
        token: token
      }));
      
      // Open Google OAuth in popup window
      const width = 500;
      const height = 600;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      
      const popup = window.open(
        data.auth_url,
        'Google Sign In',
        `width=${width},height=${height},left=${left},top=${top},popup=1`
      );
      
      // Listen for OAuth completion
      const checkPopup = setInterval(async () => {
        try {
          if (popup.closed) {
            clearInterval(checkPopup);
            setIsSyncingContacts(false);
            
            // Check if we got a token
            const googleToken = sessionStorage.getItem('google_access_token');
            if (googleToken) {
              sessionStorage.removeItem('google_access_token');
              await fetchGoogleContacts(googleToken);
            }
          } else if (popup.location?.href?.includes('code=')) {
            // Extract code from popup URL
            const url = new URL(popup.location.href);
            const code = url.searchParams.get('code');
            popup.close();
            clearInterval(checkPopup);
            
            if (code) {
              await exchangeGoogleCode(code);
            }
          }
        } catch (e) {
          // Cross-origin error - popup still on Google's domain
        }
      }, 500);
      
      // Timeout after 5 minutes
      setTimeout(() => {
        clearInterval(checkPopup);
        if (popup && !popup.closed) popup.close();
        setIsSyncingContacts(false);
      }, 300000);
      
    } catch (error) {
      console.error('[Google OAuth] Error:', error);
      toast.error(`Google OAuth error: ${error.message || 'Unknown error'}`);
      setIsSyncingContacts(false);
    }
  };
  
  // Exchange Google authorization code for access token
  const exchangeGoogleCode = async (code) => {
    try {
      const response = await fetch(`${API_URL}/api/google/exchange-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          code,
          redirect_uri: window.location.origin + '/contacts/google-callback'
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        await fetchGoogleContacts(data.access_token);
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to authenticate with Google');
        setIsSyncingContacts(false);
      }
    } catch (error) {
      console.error('Google token exchange error:', error);
      toast.error('Failed to exchange Google token');
      setIsSyncingContacts(false);
    }
  };
  
  // Fetch contacts from Google using access token
  const fetchGoogleContacts = async (accessToken) => {
    try {
      const response = await fetch(`${API_URL}/api/google/contacts?access_token=${accessToken}`);
      
      if (response.ok) {
        const data = await response.json();
        toast.success(`Found ${data.total} Google contacts!`);
        await processImportedContacts(data.contacts);
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to fetch Google contacts');
      }
    } catch (error) {
      console.error('Google contacts fetch error:', error);
      toast.error('Failed to fetch Google contacts');
    }
    
    setIsSyncingContacts(false);
    setShowContactImportModal(false);
  };
  
  // Import from Facebook Friends (using Facebook OAuth)
  const importFacebookFriends = async () => {
    setImportSource('facebook');
    setIsSyncingContacts(true);
    
    try {
      // Get Facebook OAuth URL from backend
      const response = await fetch(`${API_URL}/api/facebook/auth-url?redirect_uri=${encodeURIComponent(window.location.origin + '/contacts/facebook-callback')}`);
      
      if (response.ok) {
        const data = await response.json();
        
        // Store current state for after OAuth
        sessionStorage.setItem('facebook_oauth_state', JSON.stringify({
          returnUrl: window.location.href,
          token: token
        }));
        
        // Open Facebook OAuth in popup window
        const width = 600;
        const height = 700;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;
        
        const popup = window.open(
          data.auth_url,
          'Facebook Login',
          `width=${width},height=${height},left=${left},top=${top},popup=1`
        );
        
        // Listen for OAuth completion
        const checkPopup = setInterval(async () => {
          try {
            if (popup.closed) {
              clearInterval(checkPopup);
              setIsSyncingContacts(false);
              
              // Check if we got a token
              const facebookToken = sessionStorage.getItem('facebook_access_token');
              if (facebookToken) {
                sessionStorage.removeItem('facebook_access_token');
                await fetchFacebookFriends(facebookToken);
              }
            } else if (popup.location?.href?.includes('code=')) {
              // Extract code from popup URL
              const url = new URL(popup.location.href);
              const code = url.searchParams.get('code');
              popup.close();
              clearInterval(checkPopup);
              
              if (code) {
                await exchangeFacebookCode(code);
              }
            }
          } catch (e) {
            // Cross-origin error - popup still on Facebook's domain
          }
        }, 500);
        
        // Timeout after 5 minutes
        setTimeout(() => {
          clearInterval(checkPopup);
          if (!popup.closed) popup.close();
          setIsSyncingContacts(false);
        }, 300000);
        
      } else {
        toast.error('Facebook OAuth not configured');
        setIsSyncingContacts(false);
      }
    } catch (error) {
      console.error('Facebook import error:', error);
      toast.error('Failed to start Facebook OAuth');
      setIsSyncingContacts(false);
    }
  };
  
  // Exchange Facebook authorization code for access token
  const exchangeFacebookCode = async (code) => {
    try {
      const response = await fetch(`${API_URL}/api/facebook/exchange-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          code,
          redirect_uri: window.location.origin + '/contacts/facebook-callback'
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        await fetchFacebookFriends(data.access_token);
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to authenticate with Facebook');
        setIsSyncingContacts(false);
      }
    } catch (error) {
      console.error('Facebook token exchange error:', error);
      toast.error('Failed to exchange Facebook token');
      setIsSyncingContacts(false);
    }
  };
  
  // Fetch friends from Facebook using access token
  const fetchFacebookFriends = async (accessToken) => {
    try {
      const response = await fetch(`${API_URL}/api/facebook/friends?access_token=${accessToken}`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.friends.length > 0) {
          toast.success(`Found ${data.total} Facebook friends!`);
          await processImportedContacts(data.friends);
        } else {
          toast.info('No friends found who also use FaceConnect. Invite them!');
        }
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to fetch Facebook friends');
      }
    } catch (error) {
      console.error('Facebook friends fetch error:', error);
      toast.error('Failed to fetch Facebook friends');
    }
    
    setIsSyncingContacts(false);
    setShowContactImportModal(false);
  };
  
  // Import from Phone/Device Contacts
  const importPhoneContacts = async () => {
    setImportSource('phone');
    setIsSyncingContacts(true);
    
    try {
      if ('contacts' in navigator && 'ContactsManager' in window) {
        // Web Contacts API (Chrome on Android)
        const props = ['name', 'email', 'tel'];
        const opts = { multiple: true };
        const contacts = await navigator.contacts.select(props, opts);
        
        const formattedContacts = contacts.map(c => ({
          name: c.name?.[0] || 'Unknown',
          email: c.email?.[0] || '',
          phone: c.tel?.[0] || ''
        }));
        
        await processImportedContacts(formattedContacts);
      } else if (window.electronAPI?.getDeviceContacts) {
        // Electron native contacts
        const contacts = await window.electronAPI.getDeviceContacts();
        await processImportedContacts(contacts);
      } else {
        // Fallback - show file picker for vCard
        toast.info('Use CSV or vCard import for desktop');
        setShowContactImportModal(false);
      }
    } catch (error) {
      console.error('Phone contacts error:', error);
      toast.error('Failed to access phone contacts');
    }
    
    setIsSyncingContacts(false);
  };
  
  // Import from CSV file
  const importFromCSV = async (file) => {
    setImportSource('csv');
    setIsSyncingContacts(true);
    
    try {
      const text = await file.text();
      const lines = text.split('\n');
      const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
      
      const nameIndex = headers.findIndex(h => h.includes('name'));
      const emailIndex = headers.findIndex(h => h.includes('email') || h.includes('mail'));
      const phoneIndex = headers.findIndex(h => h.includes('phone') || h.includes('tel'));
      
      const contacts = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
        if (values.length > 1) {
          contacts.push({
            name: nameIndex >= 0 ? values[nameIndex] : values[0],
            email: emailIndex >= 0 ? values[emailIndex] : '',
            phone: phoneIndex >= 0 ? values[phoneIndex] : ''
          });
        }
      }
      
      await processImportedContacts(contacts);
      toast.success(`Imported ${contacts.length} contacts from CSV`);
    } catch (error) {
      console.error('CSV import error:', error);
      toast.error('Failed to parse CSV file');
    }
    
    setIsSyncingContacts(false);
  };
  
  // Import from vCard file
  const importFromVCard = async (file) => {
    setImportSource('vcard');
    setIsSyncingContacts(true);
    
    try {
      const text = await file.text();
      const cards = text.split('END:VCARD').filter(c => c.includes('BEGIN:VCARD'));
      
      const contacts = cards.map(card => {
        const nameMatch = card.match(/FN:(.+)/);
        const emailMatch = card.match(/EMAIL[^:]*:(.+)/);
        const telMatch = card.match(/TEL[^:]*:(.+)/);
        
        return {
          name: nameMatch ? nameMatch[1].trim() : 'Unknown',
          email: emailMatch ? emailMatch[1].trim() : '',
          phone: telMatch ? telMatch[1].trim() : ''
        };
      });
      
      await processImportedContacts(contacts);
      toast.success(`Imported ${contacts.length} contacts from vCard`);
    } catch (error) {
      console.error('vCard import error:', error);
      toast.error('Failed to parse vCard file');
    }
    
    setIsSyncingContacts(false);
  };
  
  // Process imported contacts - find matching users and show preview
  const processImportedContacts = async (contacts) => {
    if (!token || !contacts.length) return;
    
    setImportedContacts(contacts);
    setPreviewContacts(contacts);
    
    try {
      // Send to backend to find matching users
      const response = await fetch(`${API_URL}/api/contacts/sync?token=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contacts })
      });
      
      if (response.ok) {
        const data = await response.json();
        const matched = data.matched_users || [];
        setMatchedUsers(matched);
        
        // Pre-select all matched users
        const matchedIds = new Set(matched.map(u => u.id));
        setSelectedContactIds(matchedIds);
        
        // Show preview modal
        setShowContactPreview(true);
        setShowContactImportModal(false);
        
        if (matched.length > 0) {
          toast.success(`Found ${matched.length} contacts on FaceConnect!`);
        } else {
          toast.info('No matching contacts found on FaceConnect yet');
        }
      } else {
        // Even if no matches, show preview with imported contacts
        setMatchedUsers([]);
        setSelectedContactIds(new Set());
        setShowContactPreview(true);
        setShowContactImportModal(false);
        toast.info('Contacts imported - no FaceConnect users found');
      }
    } catch (error) {
      console.error('Process contacts error:', error);
      // Show preview anyway with the imported contacts
      setMatchedUsers([]);
      setSelectedContactIds(new Set());
      setShowContactPreview(true);
      setShowContactImportModal(false);
    }
    
    setIsSyncingContacts(false);
  };
  
  // Confirm and add selected contacts as friends
  const confirmAddSelectedContacts = async () => {
    if (!token || selectedContactIds.size === 0) {
      toast.warning('No contacts selected');
      return;
    }
    
    const selectedUsers = matchedUsers.filter(u => selectedContactIds.has(u.id));
    
    if (selectedUsers.length === 0) {
      toast.warning('No FaceConnect users selected');
      setShowContactPreview(false);
      return;
    }
    
    setIsSyncingContacts(true);
    
    let successCount = 0;
    let failCount = 0;
    
    for (const user of selectedUsers) {
      try {
        const response = await fetch(`${API_URL}/api/friends/request?token=${token}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: user.id })
        });
        
        if (response.ok) {
          successCount++;
          setPendingRequests(prev => new Set([...prev, user.id]));
        } else {
          failCount++;
        }
      } catch (error) {
        failCount++;
      }
    }
    
    setIsSyncingContacts(false);
    setShowContactPreview(false);
    
    // Update friend suggestions
    setFriendSuggestions(prev => {
      const existingIds = new Set(prev.map(u => u.id));
      const newUsers = matchedUsers.filter(u => !existingIds.has(u.id) && !selectedContactIds.has(u.id));
      return [...newUsers, ...prev];
    });
    
    if (successCount > 0) {
      toast.success(`Friend requests sent to ${successCount} contacts!`);
    }
    if (failCount > 0) {
      toast.warning(`${failCount} requests failed (may already be friends)`);
    }
    
    // Refresh users list
    await fetchAllUsers();
  };
  
  // Toggle contact selection
  const toggleContactSelection = (userId) => {
    setSelectedContactIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };
  
  // Select/Deselect all contacts
  const selectAllContacts = () => {
    const allIds = new Set(matchedUsers.map(u => u.id));
    setSelectedContactIds(allIds);
  };
  
  const deselectAllContacts = () => {
    setSelectedContactIds(new Set());
  };
  
  // Save all imported contacts to address book
  const saveAllContactsToAddressBook = async () => {
    if (!token || previewContacts.length === 0) {
      toast.warning('No contacts to save');
      return;
    }
    
    setIsSyncingContacts(true);
    
    try {
      // Prepare contacts with source info
      const contactsToSave = previewContacts.map(contact => ({
        name: contact.name || 'Unknown',
        email: contact.email || '',
        phone: contact.phone || '',
        notes: '',
        source: importSource || 'manual'
      }));
      
      const response = await fetch(`${API_URL}/api/contacts/save?token=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contacts: contactsToSave })
      });
      
      if (response.ok) {
        const data = await response.json();
        toast.success(
          <div className="flex flex-col">
            <span className="font-medium">Contacts saved to address book!</span>
            <span className="text-sm opacity-80">
              {data.saved_count} new, {data.updated_count} updated
            </span>
          </div>
        );
        
        // Close modal and reset state
        setShowContactPreview(false);
        setPreviewContacts([]);
        setMatchedUsers([]);
        setSelectedContactIds(new Set());
        setImportedContacts([]);
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to save contacts');
      }
    } catch (error) {
      console.error('Error saving contacts:', error);
      toast.error('Failed to save contacts. Please try again.');
    }
    
    setIsSyncingContacts(false);
  };
  
  // Handle file input for CSV/vCard
  const handleContactFileImport = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const fileName = file.name.toLowerCase();
    if (fileName.endsWith('.csv')) {
      importFromCSV(file);
    } else if (fileName.endsWith('.vcf') || fileName.endsWith('.vcard')) {
      importFromVCard(file);
    } else {
      toast.error('Please upload a CSV or vCard (.vcf) file');
    }
    
    // Reset input
    event.target.value = '';
  };

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

  // ========== ATTACHMENT MENU HANDLERS ==========
  
  // Handle Photos & Videos upload
  const handlePhotosVideosUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    
    setUploadingFile(true);
    setShowAttachMenu(false);
    
    for (const file of files) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('token', token);
        
        const response = await fetch(`${API_URL}/api/upload`, {
          method: 'POST',
          body: formData
        });
        
        if (response.ok) {
          const data = await response.json();
          
          // Send message with the uploaded file
          const msgRes = await fetch(`${API_URL}/api/conversations/${activeChat.id}/messages?token=${token}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: file.name,
              message_type: file.type.startsWith('image/') ? 'image' : 'video',
              file_url: data.file_url,
              file_name: data.file_name,
              file_size: data.file_size
            })
          });
          
          if (msgRes.ok) {
            const newMsg = await msgRes.json();
            setMessages(prev => [...prev, {
              id: newMsg.id,
              text: '',
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              isMe: true,
              status: 'sent',
              isImage: file.type.startsWith('image/'),
              isVideo: file.type.startsWith('video/'),
              imageUrl: file.type.startsWith('image/') ? data.file_url : undefined,
              videoUrl: file.type.startsWith('video/') ? data.file_url : undefined
            }]);
            toast.success(`${file.type.startsWith('image/') ? 'Photo' : 'Video'} sent!`);
          }
        }
      } catch (err) {
        console.error('Upload error:', err);
        toast.error(`Failed to send ${file.name}`);
      }
    }
    
    setUploadingFile(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };
  
  // Handle Camera capture
  const handleCameraCapture = async () => {
    setShowAttachMenu(false);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      cameraStreamRef.current = stream;
      setShowCamera(true);
      
      // Wait for video element to be ready
      setTimeout(() => {
        if (cameraVideoRef.current) {
          cameraVideoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (err) {
      console.error('Camera access error:', err);
      toast.error('Could not access camera. Please check permissions.');
    }
  };
  
  // Take photo from camera
  const handleTakePhoto = async () => {
    if (!cameraVideoRef.current) return;
    
    const video = cameraVideoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      
      // Close camera
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach(track => track.stop());
      }
      setShowCamera(false);
      setUploadingFile(true);
      
      try {
        const formData = new FormData();
        formData.append('file', blob, `photo_${Date.now()}.jpg`);
        formData.append('token', token);
        
        const response = await fetch(`${API_URL}/api/upload`, {
          method: 'POST',
          body: formData
        });
        
        if (response.ok) {
          const data = await response.json();
          
          const msgRes = await fetch(`${API_URL}/api/conversations/${activeChat.id}/messages?token=${token}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: 'Photo',
              message_type: 'image',
              file_url: data.file_url,
              file_name: data.file_name,
              file_size: data.file_size
            })
          });
          
          if (msgRes.ok) {
            const newMsg = await msgRes.json();
            setMessages(prev => [...prev, {
              id: newMsg.id,
              text: '',
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              isMe: true,
              status: 'sent',
              isImage: true,
              imageUrl: data.file_url
            }]);
            toast.success('Photo sent!');
          }
        }
      } catch (err) {
        console.error('Photo upload error:', err);
        toast.error('Failed to send photo');
      }
      
      setUploadingFile(false);
    }, 'image/jpeg', 0.9);
  };
  
  // Close camera
  const handleCloseCamera = () => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach(track => track.stop());
    }
    setShowCamera(false);
  };
  
  // Handle Document upload
  const handleDocumentUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    
    setUploadingFile(true);
    setShowAttachMenu(false);
    
    for (const file of files) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('token', token);
        
        const response = await fetch(`${API_URL}/api/upload`, {
          method: 'POST',
          body: formData
        });
        
        if (response.ok) {
          const data = await response.json();
          
          const msgRes = await fetch(`${API_URL}/api/conversations/${activeChat.id}/messages?token=${token}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: file.name,
              message_type: 'file',
              file_url: data.file_url,
              file_name: data.file_name,
              file_size: data.file_size
            })
          });
          
          if (msgRes.ok) {
            const newMsg = await msgRes.json();
            setMessages(prev => [...prev, {
              id: newMsg.id,
              text: file.name,
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              isMe: true,
              status: 'sent',
              isFile: true,
              fileName: file.name,
              fileSize: file.size,
              fileUrl: data.file_url
            }]);
            toast.success('Document sent!');
          }
        }
      } catch (err) {
        console.error('Document upload error:', err);
        toast.error(`Failed to send ${file.name}`);
      }
    }
    
    setUploadingFile(false);
  };
  
  // Handle Contact share
  const handleContactShare = async (contactToShare) => {
    if (!contactToShare || !activeChat) return;
    
    setShowContactPicker(false);
    
    try {
      const contactData = {
        name: contactToShare.name || contactToShare.display_name,
        phone: contactToShare.phone || '',
        email: contactToShare.email || '',
        avatar: contactToShare.avatar
      };
      
      const msgRes = await fetch(`${API_URL}/api/conversations/${activeChat.id}/messages?token=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: JSON.stringify(contactData),
          message_type: 'contact',
          metadata: contactData
        })
      });
      
      if (msgRes.ok) {
        const newMsg = await msgRes.json();
        setMessages(prev => [...prev, {
          id: newMsg.id,
          text: '',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isMe: true,
          status: 'sent',
          isContact: true,
          contactData
        }]);
        toast.success('Contact shared!');
      }
    } catch (err) {
      console.error('Contact share error:', err);
      toast.error('Failed to share contact');
    }
  };
  
  // Handle Location share
  const handleLocationShare = async () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }
    
    setShowAttachMenu(false);
    setSendingLocation(true);
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const mapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
        
        try {
          const msgRes = await fetch(`${API_URL}/api/conversations/${activeChat.id}/messages?token=${token}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: mapsUrl,
              message_type: 'location',
              metadata: { latitude, longitude, maps_url: mapsUrl }
            })
          });
          
          if (msgRes.ok) {
            const newMsg = await msgRes.json();
            setMessages(prev => [...prev, {
              id: newMsg.id,
              text: '',
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              isMe: true,
              status: 'sent',
              isLocation: true,
              locationData: { latitude, longitude, mapsUrl }
            }]);
            toast.success('Location shared!');
          }
        } catch (err) {
          console.error('Location share error:', err);
          toast.error('Failed to share location');
        }
        
        setSendingLocation(false);
      },
      (error) => {
        setSendingLocation(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            toast.error('Location permission denied');
            break;
          case error.POSITION_UNAVAILABLE:
            toast.error('Location unavailable');
            break;
          default:
            toast.error('Failed to get location');
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
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
    { id: 'chat', icon: MessageCircle, label: t('chats'), tooltip: 'View and start conversations', badge: chats.reduce((acc, c) => acc + (c.unread || 0), 0) },
    { id: 'calls', icon: Phone, label: t('calls'), tooltip: 'Make voice and video calls' },
    { id: 'status', icon: Circle, label: t('status'), tooltip: 'View status updates from contacts' },
    { id: 'channels', icon: Radio, label: t('channels'), tooltip: 'Discover and follow channels' },
    { id: 'community', icon: Users, label: t('community'), tooltip: 'Join and create communities' },
    { id: 'media', icon: ImageIcon, label: t('media'), tooltip: 'Browse shared media files' },
    { id: 'games', icon: Gamepad2, label: t('games'), tooltip: 'Play online games' },
    { id: 'copilot', icon: Sparkles, label: 'Copilot', tooltip: 'Microsoft Copilot AI Assistant' },
    { id: 'ai', icon: Brain, label: t('ai'), tooltip: 'Chat with AI Assistant' },
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

  // Handle text selection for dictionary lookup
  const handleContextMenu = useCallback((e) => {
    const selection = window.getSelection();
    const selectedText = selection?.toString().trim();
    
    // Only show dictionary for single words (no spaces)
    if (selectedText && selectedText.length > 0 && selectedText.length < 50 && !selectedText.includes(' ')) {
      e.preventDefault();
      setDictionaryPopup({
        show: true,
        word: selectedText,
        position: { x: e.clientX, y: e.clientY }
      });
    }
  }, []);

  // Close dictionary popup when clicking outside
  useEffect(() => {
    const handleClick = (e) => {
      if (dictionaryPopup.show && !e.target.closest('[data-testid="dictionary-popup"]')) {
        setDictionaryPopup({ show: false, word: '', position: null });
      }
    };
    
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [dictionaryPopup.show]);

  // Only render for Electron - must be after all hooks
  if (!isElectron()) {
    return children;
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div className="h-screen w-screen flex flex-col overflow-hidden">
        {/* Custom Title Bar for Electron - at the very top */}
        <CustomTitleBar />
        <div 
          className={`flex-1 w-screen flex overflow-hidden ${isDark ? 'bg-[#0D1117]' : 'bg-[#f0f2f5]'}`}
          onContextMenu={handleContextMenu}
          style={{ maxWidth: '100vw' }}
        >
      {/* Fixed Left Sidebar - Using DesktopSidebar Component */}
      <DesktopSidebar
        isDark={isDark}
        activeSidebarTab={activeSidebarTab}
        setActiveSidebarTab={setActiveSidebarTab}
        unreadCount={chats.reduce((acc, c) => acc + (c.unread || 0), 0)}
        setShowSettings={setShowSettings}
        showSettings={showSettings}
        toggleTheme={() => setTheme(isDark ? 'light' : 'dark')}
        logout={logout}
        sidebarCollapsed={sidebarCollapsed}
        setSidebarCollapsed={setSidebarCollapsed}
      />

      {/* Left Panel - Chat List */}
      <div className={`w-[350px] flex flex-col border-r ${isDark ? 'bg-[#0D1117] border-[#2a2a2a]' : 'bg-white border-gray-200'}`}>
        {/* Header */}
        <div className={`flex items-center justify-between px-4 py-3 ${isDark ? 'bg-[#161B22]' : 'bg-[#f0f2f5]'}`}>
          <Avatar className="w-10 h-10 cursor-pointer" onClick={() => navigate('/profile')}>
            <AvatarImage src={user?.avatar} />
            <AvatarFallback className="bg-[#00E676] text-white">
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
        <div className={`px-3 py-2 ${isDark ? 'bg-[#0D1117]' : 'bg-white'}`}>
          <div className={`flex items-center gap-3 px-4 py-2 rounded-lg ${isDark ? 'bg-[#161B22]' : 'bg-[#f0f2f5]'}`}>
            <Search className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
            <Input
              placeholder={t('search') + "..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setShowSearchResults(true)}
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
            {/* Sync Contacts Button */}
            <button
              onClick={() => setShowContactImportModal(true)}
              className={`p-2 rounded-full transition-colors ${
                isDark 
                  ? 'bg-[#00E676]/20 text-[#00E676] hover:bg-[#00E676]/30' 
                  : 'bg-[#00E676]/10 text-[#00E676] hover:bg-[#00E676]/20'
              }`}
              title="Import Contacts"
              data-testid="sync-contacts-btn"
            >
              <UserPlus className={`w-4 h-4 ${isSyncingContacts ? 'animate-spin' : ''}`} />
            </button>
          </div>
          
          {/* Search Type Tabs */}
          {showSearchResults && (
            <div className="flex gap-1 mt-2 flex-wrap">
              {[
                { id: 'chats', label: 'Chats', icon: MessageCircle },
                { id: 'users', label: 'Users', icon: Users },
                { id: 'contacts', label: 'All Contacts', icon: UserPlus },
                { id: 'media', label: 'Media', icon: ImageIcon },
                { id: 'web', label: 'Google', icon: ExternalLink },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setSearchType(tab.id);
                    if (tab.id === 'contacts' && allUsers.length === 0) {
                      fetchAllUsers();
                    }
                  }}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    searchType === tab.id
                      ? 'bg-[#00E676] text-white'
                      : isDark
                        ? 'bg-[#161B22] text-gray-300 hover:bg-[#21262D]'
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
          <div className={`flex-1 overflow-hidden ${isDark ? 'bg-[#0D1117]' : 'bg-white'}`}>
            <ScrollArea className="h-full">
              {isSearching ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-6 h-6 animate-spin text-[#00E676]" />
                </div>
              ) : (
                <div className="p-3">
                  {/* Google Web Search */}
                  {searchType === 'web' && (
                    <div>
                      <button
                        onClick={() => openGoogleSearch(searchQuery)}
                        className={`w-full flex items-center gap-3 p-4 rounded-xl transition-colors ${
                          isDark ? 'bg-[#161B22] hover:bg-[#21262D]' : 'bg-gray-100 hover:bg-gray-200'
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
                                isDark ? 'hover:bg-[#161B22]' : 'hover:bg-gray-100'
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
                              isDark ? 'hover:bg-[#161B22]' : 'hover:bg-gray-100'
                            }`}
                          >
                            <Avatar className="w-10 h-10">
                              <AvatarImage src={chat.avatar} />
                              <AvatarFallback className="bg-[#00E676] text-white">{chat.name?.charAt(0)}</AvatarFallback>
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
                              isDark ? 'hover:bg-[#161B22]' : 'hover:bg-gray-100'
                            }`}
                          >
                            <Avatar className="w-10 h-10">
                              <AvatarImage src={user.avatar} />
                              <AvatarFallback className="bg-[#00E676] text-white">{user.display_name?.charAt(0) || user.username?.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className={`font-medium truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{user.display_name || user.username}</p>
                              <p className={`text-sm truncate ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>@{user.username}</p>
                            </div>
                            <Button size="sm" variant="outline" className="h-8 text-[#00E676] border-[#00E676]">
                              <MessageCircle className="w-3 h-3 mr-1" /> Chat
                            </Button>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                  
                  {/* All Contacts Results - New Contact Sync Feature */}
                  {searchType === 'contacts' && (
                    <div>
                      {/* Sync Button Header */}
                      <div className={`flex items-center justify-between mb-3 p-3 rounded-xl ${isDark ? 'bg-[#161B22]' : 'bg-gray-100'}`}>
                        <div className="flex items-center gap-2">
                          <div className={`p-2 rounded-full ${isDark ? 'bg-[#00E676]/20' : 'bg-[#00E676]/10'}`}>
                            <Users className="w-5 h-5 text-[#00E676]" />
                          </div>
                          <div>
                            <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                              All FaceConnect Users
                            </p>
                            <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                              {allUsers.length} users found
                            </p>
                          </div>
                        </div>
                        <Button 
                          size="sm" 
                          onClick={syncDeviceContacts}
                          disabled={isSyncingContacts}
                          className="bg-[#00E676] hover:bg-[#00E676]/90 text-white"
                        >
                          <RefreshCw className={`w-4 h-4 mr-1 ${isSyncingContacts ? 'animate-spin' : ''}`} />
                          {isSyncingContacts ? 'Syncing...' : 'Sync'}
                        </Button>
                      </div>
                      
                      {/* Friend Suggestions */}
                      {friendSuggestions.length > 0 && (
                        <div className="mb-4">
                          <p className={`text-xs uppercase font-medium mb-2 flex items-center gap-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                            <Sparkles className="w-3 h-3" /> Suggested Friends
                          </p>
                          <div className="flex gap-2 overflow-x-auto pb-2">
                            {friendSuggestions.map(suggestion => (
                              <div
                                key={suggestion.id}
                                className={`flex-shrink-0 w-32 p-3 rounded-xl text-center ${
                                  isDark ? 'bg-[#161B22]' : 'bg-gray-100'
                                }`}
                              >
                                <Avatar className="w-12 h-12 mx-auto mb-2">
                                  <AvatarImage src={suggestion.avatar} />
                                  <AvatarFallback className="bg-[#00E676] text-white">{suggestion.name?.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <p className={`text-sm font-medium truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                  {suggestion.name}
                                </p>
                                {suggestion.mutual_friends > 0 && (
                                  <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                    {suggestion.mutual_friends} mutual
                                  </p>
                                )}
                                <Button
                                  size="sm"
                                  className="mt-2 w-full h-7 text-xs bg-[#00E676] hover:bg-[#00E676]/90"
                                  onClick={() => sendFriendRequest(suggestion.id)}
                                  disabled={pendingRequests.has(suggestion.id)}
                                >
                                  {pendingRequests.has(suggestion.id) ? 'Sent' : 'Add'}
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* All Users List */}
                      <p className={`text-xs uppercase font-medium mb-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                        All Users ({allUsers.length})
                      </p>
                      {isSyncingContacts ? (
                        <div className="flex items-center justify-center py-8">
                          <RefreshCw className="w-6 h-6 animate-spin text-[#00E676]" />
                        </div>
                      ) : allUsers.length === 0 ? (
                        <div className={`text-center py-8 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                          <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                          <p>No users found</p>
                          <p className="text-sm mt-1">Click Sync to discover contacts</p>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          {allUsers.filter(u => 
                            !searchQuery || 
                            u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            u.email?.toLowerCase().includes(searchQuery.toLowerCase())
                          ).map(user => (
                            <div
                              key={user.id}
                              className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
                                isDark ? 'hover:bg-[#161B22]' : 'hover:bg-gray-100'
                              }`}
                            >
                              <div className="relative">
                                <Avatar className="w-12 h-12">
                                  <AvatarImage src={user.avatar} />
                                  <AvatarFallback className="bg-gradient-to-br from-[#00a884] to-[#0088cc] text-white">
                                    {user.name?.charAt(0)}
                                  </AvatarFallback>
                                </Avatar>
                                {user.online && (
                                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className={`font-medium truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                    {user.name}
                                  </p>
                                  {user.is_friend && (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#00E676]/20 text-[#00E676]">
                                      Friend
                                    </span>
                                  )}
                                </div>
                                <p className={`text-sm truncate ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                  {user.email}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                {user.is_friend ? (
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="h-8 text-[#00E676] border-[#00E676]"
                                    onClick={() => {
                                      // Start chat with this user
                                      const existingChat = conversations.find(c => 
                                        c.participants?.includes(user.id) && !c.is_group
                                      );
                                      if (existingChat) {
                                        setActiveChat(existingChat);
                                      } else {
                                        toast.info('Starting new chat...');
                                      }
                                      setShowSearchResults(false);
                                    }}
                                  >
                                    <MessageCircle className="w-3 h-3 mr-1" /> Chat
                                  </Button>
                                ) : user.request_sent || pendingRequests.has(user.id) ? (
                                  <Button size="sm" variant="outline" disabled className="h-8">
                                    <Clock className="w-3 h-3 mr-1" /> Pending
                                  </Button>
                                ) : user.request_received ? (
                                  <Button 
                                    size="sm" 
                                    className="h-8 bg-[#00E676] hover:bg-[#00E676]/90 text-white"
                                    onClick={() => autoAddFriend(user.id)}
                                  >
                                    <UserCheck className="w-3 h-3 mr-1" /> Accept
                                  </Button>
                                ) : (
                                  <Button 
                                    size="sm" 
                                    className="h-8 bg-[#00E676] hover:bg-[#00E676]/90 text-white"
                                    onClick={() => sendFriendRequest(user.id)}
                                  >
                                    <UserPlus className="w-3 h-3 mr-1" /> Add
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
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
                              className={`aspect-square rounded-lg overflow-hidden ${isDark ? 'bg-[#161B22]' : 'bg-gray-100'}`}
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
            <div className={`flex items-center justify-between px-3 py-2 ${isDark ? 'bg-[#0D1117]' : 'bg-white'}`}>
              <div className="flex items-center gap-2">
                {[
                  { id: 'all', label: t('all') },
                  { id: 'unread', label: t('unread') },
                  { id: 'groups', label: t('groups') }
                ].map(f => (
                  <button
                    key={f.id}
                    onClick={() => setFilter(f.id)}
                    className={`px-3 py-1 rounded-full text-sm ${
                      filter === f.id
                        ? 'bg-[#00E676] text-white'
                        : isDark
                          ? 'bg-[#161B22] text-gray-300 hover:bg-[#21262D]'
                          : 'bg-[#f0f2f5] text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <Button 
                size="sm" 
                className="bg-[#00E676] hover:bg-[#00E676]/90 h-8"
                onClick={() => setShowNewGroup(true)}
                data-testid="new-chat-btn"
              >
                <Plus className="w-4 h-4 mr-1" /> {t('new')}
              </Button>
            </div>

            {/* Chat List */}
            <ScrollArea className="flex-1 chat-list-scroll">
              {loading ? (
                <div className="flex items-center justify-center h-40">
                  <RefreshCw className="w-6 h-6 animate-spin text-[#00E676]" />
                </div>
              ) : filteredChats.length === 0 ? (
                <div className={`flex flex-col items-center justify-center h-64 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  <MessageCircle className="w-16 h-16 mb-4 opacity-30" />
                  <p className="text-lg font-medium">{t('noChatsYet')}</p>
                  <p className="text-sm mt-2">{t('startConversation')}</p>
                  <Button 
                    className="mt-4 bg-[#00E676] hover:bg-[#00E676]/90"
                    onClick={() => setShowNewGroup(true)}
                  >
                    <Plus className="w-4 h-4 mr-2" /> {t('startNewChat')}
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
              {t('encryptionNotice')}
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
                  className="text-[#00E676]"
                >
                  <ArrowLeft className="w-4 h-4 mr-1" /> Back
                </Button>
              </div>
              
              {/* Call Actions */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <Button 
                  className="h-20 flex-col gap-2 bg-[#00E676] hover:bg-[#00E676]/90"
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
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer ${isDark ? 'hover:bg-[#161B22]' : 'hover:bg-gray-100'}`}
                  >
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={contact.avatar} />
                      <AvatarFallback className="bg-[#00E676] text-white">{contact.name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{contact.name}</p>
                      {contact.online && <span className="text-xs text-[#00E676]">Online</span>}
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-9 w-9 text-[#00E676]"
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
                  className="text-[#00E676]"
                >
                  <ArrowLeft className="w-4 h-4 mr-1" /> Back
                </Button>
              </div>
              
              {/* My Status */}
              <div className={`flex items-center gap-3 p-3 rounded-lg mb-4 cursor-pointer ${isDark ? 'hover:bg-[#161B22]' : 'hover:bg-gray-100'}`}>
                <div className="relative">
                  <Avatar className="w-14 h-14">
                    <AvatarImage src={user?.avatar} />
                    <AvatarFallback className="bg-[#00E676] text-white">{user?.display_name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="absolute bottom-0 right-0 w-6 h-6 bg-[#00E676] rounded-full flex items-center justify-center border-2 border-white dark:border-[#111b21]">
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
                  className="text-[#00E676]"
                >
                  <ArrowLeft className="w-4 h-4 mr-1" /> Back
                </Button>
              </div>
              
              {/* Search Bar */}
              <div className={`flex items-center gap-2 p-2 rounded-lg mb-4 ${isDark ? 'bg-[#161B22]' : 'bg-gray-100'}`}>
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
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${isDark ? 'hover:bg-[#161B22]' : 'hover:bg-gray-100'}`}
                  >
                    <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl" style={{ backgroundColor: channel.color + '20' }}>
                      {channel.icon}
                    </div>
                    <div className="flex-1">
                      <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{channel.name}</p>
                      <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{channel.category} • {channel.followers} followers</p>
                    </div>
                    <Button size="sm" variant="outline" className="h-8 text-[#00E676] border-[#00E676]">Follow</Button>
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
                  className="text-[#00E676]"
                >
                  <ArrowLeft className="w-4 h-4 mr-1" /> Back
                </Button>
              </div>
              
              {/* Search Bar */}
              <div className={`flex items-center gap-2 p-2 rounded-lg mb-4 ${isDark ? 'bg-[#161B22]' : 'bg-gray-100'}`}>
                <Search className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                <Input 
                  placeholder="Search communities..."
                  value={communitySearch}
                  onChange={(e) => setCommunitySearch(e.target.value)}
                  className={`border-0 bg-transparent focus-visible:ring-0 h-8 ${isDark ? 'text-white placeholder:text-gray-500' : ''}`}
                />
              </div>
              
              {/* Create Community Button */}
              <Button className="w-full mb-4 bg-[#00E676] hover:bg-[#00E676]/90">
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
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${isDark ? 'hover:bg-[#161B22]' : 'hover:bg-gray-100'}`}
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${isDark ? 'bg-[#21262D]' : 'bg-gray-200'}`}>
                      {community.icon}
                    </div>
                    <div className="flex-1">
                      <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{community.name}</p>
                      <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{community.category} • {community.members} members</p>
                    </div>
                    <Button size="sm" variant="outline" className="h-8 text-[#00E676] border-[#00E676]">Join</Button>
                  </div>
                ))}
              </div>
            </div>
          </ScrollArea>
        )}

        {activeSidebarTab === 'media' && (
          <MediaPanel
            isDark={isDark}
            onBack={() => setActiveSidebarTab('chat')}
            mediaFiles={mediaFiles}
            setMediaFiles={setMediaFiles}
            onUpload={handleMediaUpload}
          />
        )}

        {activeSidebarTab === 'games' && (
          <GamesPanel
            isDark={isDark}
            onBack={() => setActiveSidebarTab('chat')}
            openExternalLink={openExternalLink}
          />
        )}

        {/* Translation Panel */}
        {activeSidebarTab === 'translate' && (
          <TranslationPanel
            isDark={isDark}
            onBack={() => setActiveSidebarTab('chat')}
          />
        )}

        {activeSidebarTab === 'ai' && (
          <AIPanel 
            isDark={isDark}
            onBack={() => setActiveSidebarTab('chat')}
            aiMessages={aiMessages}
            aiInput={aiInput}
            setAiInput={setAiInput}
            handleSendAiMessage={handleSendAiMessage}
          />
        )}

        {/* Microsoft Copilot Panel */}
        {activeSidebarTab === 'copilot' && (
          <CopilotPanel 
            isDark={isDark}
            onBack={() => setActiveSidebarTab('chat')}
            openExternalLink={openExternalLink}
          />
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
                className={`flex items-center justify-between px-4 py-2 ${isDark ? 'bg-[#161B22]' : 'bg-[#f0f2f5]'}`}
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
                    <AvatarFallback className="bg-[#00E676] text-white">
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
                            <span className="ml-auto text-xs text-[#00E676]">{disappearingSettings[activeChat?.id]}</span>
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
                className="flex-1 px-4 sm:px-8 md:px-12 lg:px-16 py-4 chat-messages-scroll min-h-0"
                style={{
                  ...getWallpaperStyle(chatWallpapers[activeChat?.id], isDark),
                  height: 'calc(100vh - 200px)',
                  maxHeight: 'calc(100vh - 200px)',
                }}
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
                            ? 'bg-[#00E676] border-[#00E676]' 
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
                <div className={`flex items-center gap-2 px-4 py-3 ${isDark ? 'bg-[#161B22]' : 'bg-[#f0f2f5]'}`}>
                  {/* Hidden file inputs */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept="image/*,video/*"
                    multiple
                    onChange={handlePhotosVideosUpload}
                  />
                  <input
                    id="document-input"
                    type="file"
                    className="hidden"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar"
                    multiple
                    onChange={handleDocumentUpload}
                  />
                  
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <Smile className="w-6 h-6 text-gray-500" />
                  </Button>
                  
                  {/* WhatsApp-style Attachment Menu */}
                  <DropdownMenu open={showAttachMenu} onOpenChange={setShowAttachMenu}>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className={`rounded-full transition-transform ${showAttachMenu ? 'rotate-45' : ''}`}
                        data-testid="attach-btn"
                      >
                        <Paperclip className="w-6 h-6 text-gray-500" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent 
                      align="start" 
                      side="top"
                      sideOffset={8}
                      className={`w-56 rounded-2xl p-2 ${isDark ? 'bg-[#233138] border-[#3a4a5a]' : 'bg-white border-gray-200'}`}
                    >
                      {/* Photos & Videos */}
                      <DropdownMenuItem 
                        onClick={() => fileInputRef.current?.click()}
                        className={`flex items-center gap-4 px-4 py-3 rounded-xl cursor-pointer ${
                          isDark ? 'hover:bg-[#2a3a4a]' : 'hover:bg-gray-100'
                        }`}
                        data-testid="attach-photos"
                      >
                        <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                          <ImageIcon className="w-5 h-5 text-purple-500" />
                        </div>
                        <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          Photos & Videos
                        </span>
                      </DropdownMenuItem>
                      
                      {/* Camera */}
                      <DropdownMenuItem 
                        onClick={handleCameraCapture}
                        className={`flex items-center gap-4 px-4 py-3 rounded-xl cursor-pointer ${
                          isDark ? 'hover:bg-[#2a3a4a]' : 'hover:bg-gray-100'
                        }`}
                        data-testid="attach-camera"
                      >
                        <div className="w-10 h-10 rounded-full bg-pink-500/20 flex items-center justify-center">
                          <Camera className="w-5 h-5 text-pink-500" />
                        </div>
                        <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          Camera
                        </span>
                      </DropdownMenuItem>
                      
                      {/* Document */}
                      <DropdownMenuItem 
                        onClick={() => document.getElementById('document-input')?.click()}
                        className={`flex items-center gap-4 px-4 py-3 rounded-xl cursor-pointer ${
                          isDark ? 'hover:bg-[#2a3a4a]' : 'hover:bg-gray-100'
                        }`}
                        data-testid="attach-document"
                      >
                        <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                          <File className="w-5 h-5 text-blue-500" />
                        </div>
                        <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          Document
                        </span>
                      </DropdownMenuItem>
                      
                      {/* Contact */}
                      <DropdownMenuItem 
                        onClick={() => {
                          setShowAttachMenu(false);
                          setShowContactPicker(true);
                        }}
                        className={`flex items-center gap-4 px-4 py-3 rounded-xl cursor-pointer ${
                          isDark ? 'hover:bg-[#2a3a4a]' : 'hover:bg-gray-100'
                        }`}
                        data-testid="attach-contact"
                      >
                        <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center">
                          <Contact className="w-5 h-5 text-cyan-500" />
                        </div>
                        <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          Contact
                        </span>
                      </DropdownMenuItem>
                      
                      {/* Location */}
                      <DropdownMenuItem 
                        onClick={handleLocationShare}
                        disabled={sendingLocation}
                        className={`flex items-center gap-4 px-4 py-3 rounded-xl cursor-pointer ${
                          isDark ? 'hover:bg-[#2a3a4a]' : 'hover:bg-gray-100'
                        } ${sendingLocation ? 'opacity-50' : ''}`}
                        data-testid="attach-location"
                      >
                        <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                          {sendingLocation ? (
                            <RefreshCw className="w-5 h-5 text-green-500 animate-spin" />
                          ) : (
                            <MapPin className="w-5 h-5 text-green-500" />
                          )}
                        </div>
                        <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {sendingLocation ? 'Getting location...' : 'Location'}
                        </span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  
                  <div className={`flex-1 flex items-center rounded-lg px-4 py-2 ${isDark ? 'bg-[#21262D]' : 'bg-white'}`}>
                    <Input
                      placeholder={replyToMessage ? `Reply to ${replyToMessage.isMe ? 'yourself' : activeChat?.name}...` : t('typeMessage')}
                      value={messageInput}
                      onChange={(e) => {
                        setMessageInput(e.target.value);
                        handleTyping();
                      }}
                      onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                      className={`border-0 bg-transparent focus-visible:ring-0 ${isDark ? 'text-white placeholder:text-gray-400' : ''}`}
                    />
                  </div>
                  
                  {/* Uploading indicator */}
                  {uploadingFile && (
                    <div className="flex items-center gap-2 text-gray-400">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span className="text-xs">Sending...</span>
                    </div>
                  )}
                  
                  {messageInput.trim() ? (
                    <Button 
                      size="icon" 
                      className="rounded-full bg-[#00E676] hover:bg-[#00E676]/90"
                      onClick={handleSendMessage}
                      data-testid="send-message-btn"
                    >
                      <Send className="w-5 h-5 text-white" />
                    </Button>
                  ) : (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="rounded-full hover:bg-[#00E676]/20"
                      onClick={() => setIsRecordingVoice(true)}
                      data-testid="voice-message-btn"
                    >
                      <Mic className="w-6 h-6 text-gray-500 hover:text-[#00E676]" />
                    </Button>
                  )}
                </div>
              )}
            </AnimatePresence>
            </motion.div>
          ) : (
          /* Empty State - Clean minimal view */
          <EmptyState 
            isDark={isDark} 
            onBack={() => setActiveSidebarTab('chat')}
            onOpenCopilot={() => setActiveSidebarTab('copilot')}
          />
        )}
        </AnimatePresence>
      </motion.div>
      
      {/* Contact Info Panel */}
      <AnimatePresence>
        {showContactInfo && activeChat && (
          <ContactInfoPanel
            activeChat={activeChat}
            isDark={isDark}
            onClose={() => setShowContactInfo(false)}
            onReportBlock={handleReportBlock}
            onDeleteChat={handleDeleteChat}
          />
        )}
      </AnimatePresence>

      {/* Settings Dialog */}
      <DesktopSettings isOpen={showSettings} onClose={() => setShowSettings(false)} />
      
      {/* Account Panel */}
      <AnimatePresence>
        {showAccount && (
          <AccountPanel
            user={user}
            isDark={isDark}
            onClose={() => setShowAccount(false)}
            onNavigate={navigate}
          />
        )}
      </AnimatePresence>

      {/* New Group Panel */}
      <AnimatePresence>
        {showNewGroup && (
          <NewGroupPanel
            isDark={isDark}
            chats={chats}
            groupName={groupName}
            setGroupName={setGroupName}
            selectedMembers={selectedMembers}
            setSelectedMembers={setSelectedMembers}
            onClose={() => setShowNewGroup(false)}
            onCreateGroup={handleCreateGroup}
          />
        )}
      </AnimatePresence>

      {/* Archived Chats Panel */}
      <AnimatePresence>
        {showArchived && (
          <ArchivedChatsPanel
            isDark={isDark}
            archivedChats={archivedChats}
            onClose={() => setShowArchived(false)}
            onSelectChat={(chat) => { setActiveChat(chat); setShowArchived(false); }}
            onUnarchiveChat={handleUnarchiveChat}
          />
        )}
      </AnimatePresence>

      {/* Starred Messages Panel */}
      <AnimatePresence>
        {showStarred && (
          <StarredMessagesPanel
            isDark={isDark}
            starredMessages={starredMessages}
            onClose={() => setShowStarred(false)}
            onUnstarMessage={(msgId) => handleToggleStarMessage(msgId, true)}
          />
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
      
      {/* Camera Modal */}
      <AnimatePresence>
        {showCamera && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 z-[100] flex flex-col items-center justify-center"
          >
            <div className="relative w-full max-w-2xl aspect-video rounded-2xl overflow-hidden bg-black">
              <video
                ref={cameraVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              
              {/* Camera controls */}
              <div className="absolute bottom-6 left-0 right-0 flex items-center justify-center gap-8">
                <Button
                  onClick={handleCloseCamera}
                  className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600"
                  size="icon"
                >
                  <X className="w-6 h-6" />
                </Button>
                <Button
                  onClick={handleTakePhoto}
                  className="w-20 h-20 rounded-full bg-white hover:bg-gray-100 border-4 border-white"
                  size="icon"
                >
                  <Camera className="w-8 h-8 text-black" />
                </Button>
                <div className="w-14 h-14" /> {/* Spacer */}
              </div>
            </div>
            
            <p className="mt-4 text-white/70 text-sm">Tap the camera button to take a photo</p>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Contact Picker Modal */}
      <AnimatePresence>
        {showContactPicker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
            onClick={() => setShowContactPicker(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-md max-h-[80vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col ${
                isDark ? 'bg-[#1f2c34]' : 'bg-white'
              }`}
            >
              {/* Header */}
              <div className={`p-4 border-b ${isDark ? 'border-[#2a3942]' : 'border-gray-200'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-cyan-500/20">
                      <Contact className="w-6 h-6 text-cyan-500" />
                    </div>
                    <div>
                      <h3 className={`font-semibold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        Share Contact
                      </h3>
                      <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        Select a contact to share
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowContactPicker(false)}
                    className={`p-2 rounded-full ${isDark ? 'hover:bg-[#21262D]' : 'hover:bg-gray-100'}`}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              
              {/* Contact List */}
              <div className="flex-1 overflow-y-auto p-2">
                {chats.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                    <Contact className="w-12 h-12 mb-3 opacity-30" />
                    <p>No contacts available</p>
                  </div>
                ) : (
                  chats.map((chat) => (
                    <button
                      key={chat.id}
                      onClick={() => handleContactShare(chat)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${
                        isDark ? 'hover:bg-[#2a3942]' : 'hover:bg-gray-100'
                      }`}
                    >
                      <div className="relative">
                        {chat.avatar ? (
                          <img 
                            src={chat.avatar} 
                            alt={chat.name} 
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        ) : (
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-semibold ${
                            isDark ? 'bg-[#374151] text-white' : 'bg-gray-200 text-gray-600'
                          }`}>
                            {chat.name?.charAt(0)?.toUpperCase()}
                          </div>
                        )}
                        {chat.online && (
                          <div className="absolute bottom-0 right-0 w-3 h-3 bg-[#00E676] rounded-full border-2 border-white dark:border-[#1f2c34]" />
                        )}
                      </div>
                      <div className="flex-1 text-left">
                        <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {chat.name}
                        </p>
                        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                          {chat.isGroup ? 'Group' : 'Contact'}
                        </p>
                      </div>
                      <ArrowRight className="w-5 h-5 text-gray-400" />
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Auto Update Manager - Shows notifications when updates are available */}
      <UpdateManager isDark={isDark} />
      
      {/* Embedded Browser */}
      <EmbeddedBrowser
        isOpen={showBrowser}
        onClose={() => setShowBrowser(false)}
        initialUrl={browserUrl}
        isDark={isDark}
      />
      
      {/* Contact Import Modal */}
      <AnimatePresence>
        {showContactImportModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
            onClick={() => setShowContactImportModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-md rounded-2xl shadow-2xl overflow-hidden ${
                isDark ? 'bg-[#1f2c34]' : 'bg-white'
              }`}
            >
              {/* Header */}
              <div className={`p-4 border-b ${isDark ? 'border-[#2a3942]' : 'border-gray-200'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-[#00E676]/20">
                      <UserPlus className="w-6 h-6 text-[#00E676]" />
                    </div>
                    <div>
                      <h3 className={`font-semibold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        Import Contacts
                      </h3>
                      <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        Find friends on FaceConnect
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowContactImportModal(false)}
                    className={`p-2 rounded-full ${isDark ? 'hover:bg-[#21262D]' : 'hover:bg-gray-100'}`}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              
              {/* Import Options */}
              <div className="p-4 space-y-3">
                {/* CSV/vCard Import - RECOMMENDED */}
                <label
                  className={`w-full flex items-center gap-4 p-4 rounded-xl transition-all cursor-pointer border-2 border-[#00E676] ${
                    isDark 
                      ? 'bg-[#00E676]/10 hover:bg-[#00E676]/20' 
                      : 'bg-[#00E676]/5 hover:bg-[#00E676]/10'
                  }`}
                >
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#00a884] to-[#0088cc] flex items-center justify-center">
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2">
                      <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>CSV / vCard File</p>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#00E676] text-white">RECOMMENDED</span>
                    </div>
                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Import from .csv or .vcf file</p>
                  </div>
                  <input
                    type="file"
                    accept=".csv,.vcf,.vcard"
                    onChange={handleContactFileImport}
                    className="hidden"
                  />
                  {isSyncingContacts && (importSource === 'csv' || importSource === 'vcard') && (
                    <RefreshCw className="w-5 h-5 animate-spin text-[#00E676]" />
                  )}
                </label>
                
                {/* Phone Contacts */}
                <button
                  onClick={importPhoneContacts}
                  disabled={isSyncingContacts}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl transition-all ${
                    isDark 
                      ? 'bg-[#161B22] hover:bg-[#21262D]' 
                      : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <Smartphone className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Phone Contacts</p>
                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Access your device contacts</p>
                  </div>
                  {isSyncingContacts && importSource === 'phone' && (
                    <RefreshCw className="w-5 h-5 animate-spin text-[#00E676]" />
                  )}
                </button>
                
                {/* Google Contacts - NOW ENABLED */}
                <button
                  onClick={importGoogleContacts}
                  disabled={isSyncingContacts}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl transition-all ${
                    isDark 
                      ? 'bg-[#161B22] hover:bg-[#21262D]' 
                      : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-500 via-yellow-500 to-green-500 p-0.5">
                    <div className={`w-full h-full rounded-full flex items-center justify-center ${isDark ? 'bg-[#161B22]' : 'bg-white'}`}>
                      <Globe className="w-6 h-6 text-red-500" />
                    </div>
                  </div>
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2">
                      <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Google Contacts</p>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500 text-white">NEW</span>
                    </div>
                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Import from your Google account</p>
                  </div>
                  {isSyncingContacts && importSource === 'google' && (
                    <RefreshCw className="w-5 h-5 animate-spin text-[#00E676]" />
                  )}
                </button>
                
                {/* Facebook Friends - NOW ENABLED */}
                <button
                  onClick={importFacebookFriends}
                  disabled={isSyncingContacts}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl transition-all ${
                    isDark 
                      ? 'bg-[#161B22] hover:bg-[#21262D]' 
                      : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  <div className="w-12 h-12 rounded-full bg-[#1877F2] flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                  </div>
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2">
                      <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Facebook Friends</p>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500 text-white">NEW</span>
                    </div>
                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Import friends from Facebook</p>
                  </div>
                  {isSyncingContacts && importSource === 'facebook' && (
                    <RefreshCw className="w-5 h-5 animate-spin text-[#00E676]" />
                  )}
                </button>
              </div>
              
              {/* Footer */}
              <div className={`p-4 border-t ${isDark ? 'border-[#2a3942] bg-[#0D1117]' : 'border-gray-200 bg-gray-50'}`}>
                <p className={`text-xs text-center ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                  Your contacts are private and used only to find friends on FaceConnect
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
        
        {/* Contact Preview Modal - Shows imported contacts before adding */}
        {showContactPreview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
            onClick={() => setShowContactPreview(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden ${
                isDark ? 'bg-[#1f2c34]' : 'bg-white'
              }`}
            >
              {/* Header */}
              <div className={`p-4 border-b ${isDark ? 'border-[#2a3942]' : 'border-gray-200'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-[#00E676]/20">
                      <UserCheck className="w-6 h-6 text-[#00E676]" />
                    </div>
                    <div>
                      <h3 className={`font-semibold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        Preview Contacts
                      </h3>
                      <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        {previewContacts.length} imported • {matchedUsers.length} on FaceConnect
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowContactPreview(false)}
                    className={`p-2 rounded-full ${isDark ? 'hover:bg-[#21262D]' : 'hover:bg-gray-100'}`}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              
              {/* Select All / Deselect All */}
              {matchedUsers.length > 0 && (
                <div className={`px-4 py-2 flex items-center justify-between border-b ${isDark ? 'border-[#2a3942]' : 'border-gray-200'}`}>
                  <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {selectedContactIds.size} selected
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={selectAllContacts}
                      className="px-3 py-1 text-xs font-medium rounded-full bg-[#00E676] text-white hover:bg-[#00E676]/90 transition-colors"
                    >
                      Select All
                    </button>
                    <button
                      onClick={deselectAllContacts}
                      className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                        isDark ? 'bg-[#21262D] text-gray-300 hover:bg-[#374248]' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      Deselect All
                    </button>
                  </div>
                </div>
              )}
              
              {/* Contact List */}
              <div className="max-h-[400px] overflow-y-auto">
                {matchedUsers.length > 0 ? (
                  <div className="divide-y divide-gray-200 dark:divide-[#2a3942]">
                    {matchedUsers.map((user) => (
                      <div
                        key={user.id}
                        onClick={() => toggleContactSelection(user.id)}
                        className={`flex items-center gap-3 p-4 cursor-pointer transition-colors ${
                          selectedContactIds.has(user.id)
                            ? isDark ? 'bg-[#00E676]/10' : 'bg-[#00E676]/5'
                            : isDark ? 'hover:bg-[#161B22]' : 'hover:bg-gray-50'
                        }`}
                      >
                        {/* Checkbox */}
                        <div className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-colors ${
                          selectedContactIds.has(user.id)
                            ? 'bg-[#00E676] border-[#00E676]'
                            : isDark ? 'border-gray-500' : 'border-gray-300'
                        }`}>
                          {selectedContactIds.has(user.id) && (
                            <Check className="w-3 h-3 text-white" />
                          )}
                        </div>
                        
                        {/* Avatar */}
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={user.avatar} />
                          <AvatarFallback className="bg-gradient-to-br from-[#00a884] to-[#0088cc] text-white">
                            {user.display_name?.charAt(0)?.toUpperCase() || user.name?.charAt(0)?.toUpperCase() || '?'}
                          </AvatarFallback>
                        </Avatar>
                        
                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className={`font-medium truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            {user.display_name || user.name}
                          </p>
                          <p className={`text-sm truncate ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            {user.email || user.phone || 'FaceConnect user'}
                          </p>
                        </div>
                        
                        {/* Status badge */}
                        {user.is_friend ? (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-500/20 text-green-500">
                            Already friends
                          </span>
                        ) : user.request_sent || pendingRequests.has(user.id) ? (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-500/20 text-yellow-500">
                            Request sent
                          </span>
                        ) : (
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            isDark ? 'bg-[#00E676]/20 text-[#00E676]' : 'bg-[#00E676]/10 text-[#00E676]'
                          }`}>
                            Add friend
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center">
                    <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${
                      isDark ? 'bg-[#21262D]' : 'bg-gray-100'
                    }`}>
                      <Users className={`w-8 h-8 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                    </div>
                    <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      No matches found
                    </p>
                    <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      {previewContacts.length > 0 
                        ? `None of your ${previewContacts.length} imported contacts are on FaceConnect yet`
                        : 'No contacts were imported'
                      }
                    </p>
                    <p className={`text-xs mt-3 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                      Invite your friends to join FaceConnect!
                    </p>
                  </div>
                )}
              </div>
              
              {/* Imported Contacts Summary (collapsed) */}
              {previewContacts.length > 0 && matchedUsers.length < previewContacts.length && (
                <details className={`border-t ${isDark ? 'border-[#2a3942]' : 'border-gray-200'}`}>
                  <summary className={`px-4 py-3 cursor-pointer text-sm font-medium flex items-center gap-2 ${
                    isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-600'
                  }`}>
                    <ChevronDown className="w-4 h-4" />
                    {previewContacts.length - matchedUsers.length} contacts not on FaceConnect
                  </summary>
                  <div className={`max-h-[150px] overflow-y-auto px-4 pb-3 ${isDark ? 'bg-[#0D1117]' : 'bg-gray-50'}`}>
                    {previewContacts
                      .filter(c => !matchedUsers.some(u => u.email === c.email || u.phone === c.phone))
                      .slice(0, 20)
                      .map((contact, idx) => (
                        <div key={idx} className={`py-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                          {contact.name} {contact.email && `• ${contact.email}`}
                        </div>
                      ))
                    }
                    {previewContacts.length - matchedUsers.length > 20 && (
                      <p className={`text-xs py-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                        ...and {previewContacts.length - matchedUsers.length - 20} more
                      </p>
                    )}
                  </div>
                </details>
              )}
              
              {/* Footer Actions */}
              <div className={`p-4 border-t flex items-center justify-between gap-3 ${isDark ? 'border-[#2a3942] bg-[#0D1117]' : 'border-gray-200 bg-gray-50'}`}>
                <button
                  onClick={() => setShowContactPreview(false)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    isDark 
                      ? 'text-gray-300 hover:bg-[#21262D]' 
                      : 'text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Cancel
                </button>
                
                <div className="flex items-center gap-2">
                  {/* Save All to Contacts */}
                  <button
                    onClick={saveAllContactsToAddressBook}
                    disabled={previewContacts.length === 0 || isSyncingContacts}
                    className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                      previewContacts.length > 0
                        ? isDark 
                          ? 'bg-blue-600 text-white hover:bg-blue-500'
                          : 'bg-blue-500 text-white hover:bg-blue-600'
                        : isDark 
                          ? 'bg-[#21262D] text-gray-500 cursor-not-allowed'
                          : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    <BookUser className="w-4 h-4" />
                    Save All ({previewContacts.length})
                  </button>
                  
                  {/* Add Friends */}
                  <button
                    onClick={confirmAddSelectedContacts}
                    disabled={selectedContactIds.size === 0 || isSyncingContacts}
                    className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                      selectedContactIds.size > 0
                        ? 'bg-[#00E676] text-white hover:bg-[#00E676]/90'
                        : isDark 
                          ? 'bg-[#21262D] text-gray-500 cursor-not-allowed'
                          : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {isSyncingContacts ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4" />
                        Add Friends
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Dictionary Popup (right-click on selected text) */}
      {dictionaryPopup.show && (
        <DictionaryPopup
          word={dictionaryPopup.word}
          position={dictionaryPopup.position}
          isDark={isDark}
          onClose={() => setDictionaryPopup({ show: false, word: '', position: null })}
        />
      )}
    </div>
    </div>
    </TooltipProvider>
  );
}
