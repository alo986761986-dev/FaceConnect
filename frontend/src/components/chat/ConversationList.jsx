import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import axios from "axios";
import { toast } from "sonner";
import { 
  MessageCircle, Search, Plus, Users, ArrowLeft,
  Check, CheckCheck, Image as ImageIcon, Paperclip, Trash2, X,
  UserPlus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { haptic } from "@/utils/mobile";
import { CreateGroupDialog, GroupListItem } from "./GroupChat";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function ConversationList({ onSelectConversation, selectedId }) {
  const { user, token, unreadCount } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewChat, setShowNewChat] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [deletingConversation, setDeletingConversation] = useState(null);
  const [swipedConversation, setSwipedConversation] = useState(null);
  const [activeTab, setActiveTab] = useState("chats"); // "chats" or "groups"

  const fetchConversations = useCallback(async () => {
    if (!token) return;
    try {
      const response = await axios.get(`${API}/conversations?token=${token}`);
      // Filter out group conversations for the chats tab
      const directChats = response.data.filter(c => !c.is_group);
      setConversations(directChats);
      
      // Initialize online users from the response
      const online = new Set();
      response.data.forEach(conv => {
        conv.participants?.forEach(p => {
          if (p.is_online) online.add(p.id);
        });
      });
      setOnlineUsers(online);
    } catch (error) {
      console.error("Failed to fetch conversations:", error);
    } finally {
      setLoading(false);
    }
  }, [token]);

  const fetchGroups = useCallback(async () => {
    if (!token) return;
    try {
      const response = await axios.get(`${API}/groups?token=${token}`);
      setGroups(response.data);
    } catch (error) {
      console.error("Failed to fetch groups:", error);
    }
  }, [token]);

  useEffect(() => {
    fetchConversations();
    fetchGroups();
  }, [fetchConversations, fetchGroups]);

  // Listen for new messages
  useEffect(() => {
    const handleNewMessage = (e) => {
      const { conversation_id, message } = e.detail;
      setConversations(prev => {
        const updated = prev.map(conv => {
          if (conv.id === conversation_id) {
            return {
              ...conv,
              last_message: message,
              unread_count: conv.id === selectedId ? 0 : conv.unread_count + 1,
              updated_at: message.created_at
            };
          }
          return conv;
        });
        // Sort by updated_at
        return updated.sort((a, b) => 
          new Date(b.updated_at) - new Date(a.updated_at)
        );
      });
    };

    window.addEventListener("chat_message", handleNewMessage);
    return () => window.removeEventListener("chat_message", handleNewMessage);
  }, [selectedId]);

  // Listen for online/offline status changes
  useEffect(() => {
    const handleUserStatus = (e) => {
      const { type, user_id } = e.detail;
      
      setOnlineUsers(prev => {
        const newSet = new Set(prev);
        if (type === 'user_online') {
          newSet.add(user_id);
        } else if (type === 'user_offline') {
          newSet.delete(user_id);
        }
        return newSet;
      });

      // Update conversations with new online status
      setConversations(prev => prev.map(conv => ({
        ...conv,
        participants: conv.participants?.map(p => ({
          ...p,
          is_online: type === 'user_online' ? (p.id === user_id ? true : p.is_online) : (p.id === user_id ? false : p.is_online)
        }))
      })));
    };

    window.addEventListener("user_status", handleUserStatus);
    return () => window.removeEventListener("user_status", handleUserStatus);
  }, []);

  const fetchUsers = async (search = "") => {
    if (!token) return;
    setLoadingUsers(true);
    try {
      const url = search 
        ? `${API}/users?token=${token}&search=${encodeURIComponent(search)}`
        : `${API}/users?token=${token}`;
      const response = await axios.get(url);
      setUsers(response.data);
    } catch (error) {
      console.error("Failed to fetch users:", error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleOpenNewChat = () => {
    setShowNewChat(true);
    fetchUsers();
  };

  const handleStartConversation = async (otherUserId) => {
    try {
      const response = await axios.post(`${API}/conversations?token=${token}`, {
        participant_ids: [otherUserId],
        is_group: false
      });
      
      setShowNewChat(false);
      fetchConversations();
      onSelectConversation(response.data);
      toast.success("Conversation started!");
    } catch (error) {
      toast.error("Failed to start conversation");
    }
  };

  // Delete conversation handler
  const handleDeleteConversation = async (conversationId) => {
    setDeletingConversation(conversationId);
    haptic.warning();
    
    try {
      await axios.delete(`${API}/conversations/${conversationId}?token=${token}`);
      setConversations(prev => prev.filter(c => c.id !== conversationId));
      setSwipedConversation(null);
      toast.success("Conversation deleted");
      
      // If we deleted the selected conversation, clear selection
      if (selectedId === conversationId) {
        onSelectConversation(null);
      }
    } catch (error) {
      console.error("Failed to delete conversation:", error);
      toast.error("Failed to delete conversation");
    } finally {
      setDeletingConversation(null);
    }
  };

  const getOtherParticipant = (conversation) => {
    if (!user) return null;
    const other = conversation.participants.find(p => p.id !== user.id);
    if (other) {
      // Check real-time online status
      return {
        ...other,
        is_online: onlineUsers.has(other.id) || other.is_online
      };
    }
    return other;
  };

  // Check if a user is online (using real-time status)
  const isUserOnline = (userId) => {
    return onlineUsers.has(userId);
  };

  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return "now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    if (diff < 604800000) return date.toLocaleDateString([], { weekday: "short" });
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  const getMessagePreview = (lastMessage) => {
    if (!lastMessage) return "No messages yet";
    
    const isMine = lastMessage.sender_id === user?.id;
    const prefix = isMine ? "You: " : "";
    
    switch (lastMessage.message_type) {
      case "image":
        return prefix + "Sent a photo";
      case "video":
        return prefix + "Sent a video";
      case "audio":
        return prefix + "Sent an audio";
      case "file":
        return prefix + "Sent a file";
      default:
        return prefix + (lastMessage.content || "");
    }
  };

  const filteredConversations = conversations.filter(conv => {
    if (!searchQuery) return true;
    const other = getOtherParticipant(conv);
    if (!other) return false;
    return (
      other.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      other.display_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div className="h-full flex flex-col bg-[#0A0A0A]">
      {/* Header */}
      <div className="p-4 border-b border-white/5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white font-['Outfit']">Messages</h2>
          <div className="flex gap-2">
            {activeTab === "groups" && (
              <Button
                data-testid="create-group-btn"
                onClick={() => setShowCreateGroup(true)}
                size="icon"
                variant="ghost"
                className="text-[#00F0FF]"
                title="Create Group"
              >
                <UserPlus className="w-5 h-5" />
              </Button>
            )}
            <Button
              data-testid="new-chat-btn"
              onClick={handleOpenNewChat}
              size="icon"
              className="bg-gradient-to-r from-[#00F0FF] to-[#7000FF] hover:opacity-90"
            >
              <Plus className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-4 bg-[#1A1A1A] p-1 rounded-lg">
          <button
            onClick={() => setActiveTab("chats")}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === "chats" 
                ? "bg-gradient-to-r from-[#00F0FF] to-[#7000FF] text-white" 
                : "text-gray-400 hover:text-white"
            }`}
            data-testid="chats-tab"
          >
            <MessageCircle className="w-4 h-4 inline mr-2" />
            Chats
          </button>
          <button
            onClick={() => setActiveTab("groups")}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === "groups" 
                ? "bg-gradient-to-r from-[#00F0FF] to-[#7000FF] text-white" 
                : "text-gray-400 hover:text-white"
            }`}
            data-testid="groups-tab"
          >
            <Users className="w-4 h-4 inline mr-2" />
            Groups ({groups.length})
          </button>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <Input
            data-testid="search-conversations"
            placeholder={activeTab === "chats" ? "Search conversations..." : "Search groups..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-[#1A1A1A] border-white/10 text-white focus:border-[#00F0FF]"
          />
        </div>
      </div>

      {/* Conversation/Group List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="w-12 h-12 rounded-full bg-[#1A1A1A]" />
                <div className="flex-1">
                  <div className="h-4 w-24 bg-[#1A1A1A] rounded mb-2" />
                  <div className="h-3 w-40 bg-[#1A1A1A] rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : activeTab === "groups" ? (
          // Groups Tab
          groups.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-4">
              <div className="w-16 h-16 rounded-full bg-[#1A1A1A] flex items-center justify-center mb-4">
                <Users className="w-8 h-8 text-gray-600" />
              </div>
              <h3 className="text-lg font-medium text-white mb-2">No groups yet</h3>
              <p className="text-gray-500 mb-4">Create a group to chat with multiple people</p>
              <Button
                onClick={() => setShowCreateGroup(true)}
                className="bg-gradient-to-r from-[#00F0FF] to-[#7000FF] hover:opacity-90"
                data-testid="create-first-group-btn"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Create Group
              </Button>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {groups
                .filter(g => !searchQuery || g.name.toLowerCase().includes(searchQuery.toLowerCase()))
                .map(group => (
                  <GroupListItem
                    key={group.id}
                    group={group}
                    onClick={() => onSelectConversation({ ...group, is_group: true })}
                    isSelected={selectedId === group.id}
                  />
                ))}
            </div>
          )
        ) : filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <div className="w-16 h-16 rounded-full bg-[#1A1A1A] flex items-center justify-center mb-4">
              <MessageCircle className="w-8 h-8 text-gray-600" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">No conversations</h3>
            <p className="text-gray-500 mb-4">Start a new chat to connect with others</p>
            <Button
              onClick={handleOpenNewChat}
              className="bg-gradient-to-r from-[#00F0FF] to-[#7000FF] hover:opacity-90"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Chat
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {filteredConversations.map((conv) => {
              const other = getOtherParticipant(conv);
              if (!other) return null;
              const isBeingDeleted = deletingConversation === conv.id;
              const isSwiped = swipedConversation === conv.id;

              return (
                <div key={conv.id} className="relative overflow-hidden group">
                  {/* Delete button (appears on swipe/hover) */}
                  <motion.button
                    data-testid={`delete-conversation-${conv.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteConversation(conv.id);
                    }}
                    className="absolute right-0 top-0 bottom-0 w-20 bg-red-500 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    disabled={isBeingDeleted}
                  >
                    {isBeingDeleted ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Trash2 className="w-5 h-5" />
                    )}
                  </motion.button>

                  <motion.button
                    data-testid={`conversation-${conv.id}`}
                    onClick={() => onSelectConversation(conv)}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1, x: isSwiped ? -80 : 0 }}
                    drag="x"
                    dragConstraints={{ left: -80, right: 0 }}
                    dragElastic={0.1}
                    onDragEnd={(e, info) => {
                      if (info.offset.x < -50) {
                        setSwipedConversation(conv.id);
                      } else {
                        setSwipedConversation(null);
                      }
                    }}
                    className={`w-full p-4 flex items-center gap-3 hover:bg-white/5 transition-colors text-left relative z-20 bg-[#0A0A0A] ${
                      selectedId === conv.id ? "bg-white/10" : ""
                    }`}
                  >
                    <div className="relative">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={other.avatar} alt={other.display_name} />
                        <AvatarFallback className="bg-gradient-to-br from-[#00F0FF] to-[#7000FF] text-white">
                          {(other.display_name || other.username)[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {other.is_online && (
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[#0A0A0A]" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-white truncate">
                          {other.display_name || other.username}
                        </span>
                        <span className="text-xs text-gray-500">
                          {conv.last_message && formatTime(conv.last_message.created_at)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className={`text-sm truncate ${
                          conv.unread_count > 0 ? "text-white font-medium" : "text-gray-500"
                        }`}>
                          {getMessagePreview(conv.last_message)}
                        </span>
                        {conv.unread_count > 0 && (
                          <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-[#00F0FF] text-black font-medium">
                            {conv.unread_count}
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* New Chat Dialog */}
      <Dialog open={showNewChat} onOpenChange={setShowNewChat}>
        <DialogContent className="bg-[#121212] border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-['Outfit']">New Chat</DialogTitle>
          </DialogHeader>
          
          {/* Search Users */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <Input
              data-testid="search-users"
              placeholder="Search users..."
              onChange={(e) => fetchUsers(e.target.value)}
              className="pl-10 bg-[#1A1A1A] border-white/10 text-white focus:border-[#00F0FF]"
            />
          </div>

          {/* Users List */}
          <div className="max-h-80 overflow-y-auto">
            {loadingUsers ? (
              <div className="p-4 text-center text-gray-500">Loading...</div>
            ) : users.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No users found</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {users.map((u) => (
                  <button
                    key={u.id}
                    data-testid={`user-${u.id}`}
                    onClick={() => handleStartConversation(u.id)}
                    className="w-full p-3 flex items-center gap-3 hover:bg-white/5 transition-colors"
                  >
                    <div className="relative">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={u.avatar} alt={u.display_name} />
                        <AvatarFallback className="bg-gradient-to-br from-[#00F0FF] to-[#7000FF] text-white">
                          {(u.display_name || u.username)[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {u.is_online && (
                        <span className="absolute bottom-0 right-0 w-2 h-2 bg-green-500 rounded-full border border-[#121212]" />
                      )}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-medium text-white">{u.display_name || u.username}</p>
                      <p className="text-sm text-gray-500">@{u.username}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Group Dialog */}
      <CreateGroupDialog
        open={showCreateGroup}
        onOpenChange={setShowCreateGroup}
        onGroupCreated={(newGroup) => {
          setGroups(prev => [newGroup, ...prev]);
          setActiveTab("groups");
          onSelectConversation({ ...newGroup, is_group: true });
        }}
      />
    </div>
  );
}
