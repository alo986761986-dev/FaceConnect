import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { toast } from "sonner";
import {
  Search, UserPlus, UserCheck, UserX, Users, 
  Clock, Check, X, MessageCircle, MoreVertical,
  Loader2, RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/context/AuthContext";
import { haptic } from "@/utils/mobile";
import BottomNav from "@/components/BottomNav";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Friends() {
  const { user, token } = useAuth();
  const [activeTab, setActiveTab] = useState("friends");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [friends, setFriends] = useState([]);
  const [onlineFriends, setOnlineFriends] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch friends data
  const fetchFriendsData = useCallback(async () => {
    if (!token) return;

    try {
      const [friendsRes, requestsRes, sentRes] = await Promise.all([
        axios.get(`${API}/friends?token=${token}`),
        axios.get(`${API}/friends/requests?token=${token}`),
        axios.get(`${API}/friends/sent?token=${token}`)
      ]);

      setFriends(friendsRes.data);
      setOnlineFriends(friendsRes.data.filter(f => f.is_online));
      setPendingRequests(requestsRes.data);
      setSentRequests(sentRes.data);
    } catch (error) {
      console.error("Failed to fetch friends:", error);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchFriendsData();
  }, [fetchFriendsData]);

  // Listen for online status changes
  useEffect(() => {
    const handleUserStatus = (e) => {
      const { type, user_id } = e.detail;
      
      setFriends(prev => prev.map(f => 
        f.id === user_id ? { ...f, is_online: type === 'user_online' } : f
      ));
      
      if (type === 'user_online') {
        setOnlineFriends(prev => {
          const friend = friends.find(f => f.id === user_id);
          if (friend && !prev.find(f => f.id === user_id)) {
            return [...prev, { ...friend, is_online: true }];
          }
          return prev;
        });
      } else {
        setOnlineFriends(prev => prev.filter(f => f.id !== user_id));
      }
    };

    window.addEventListener("user_status", handleUserStatus);
    return () => window.removeEventListener("user_status", handleUserStatus);
  }, [friends]);

  // Search users
  const handleSearch = async (query) => {
    setSearchQuery(query);
    
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const response = await axios.get(
        `${API}/users/search?token=${token}&q=${encodeURIComponent(query)}`
      );
      setSearchResults(response.data);
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setSearching(false);
    }
  };

  // Send friend request
  const handleSendRequest = async (userId) => {
    haptic.medium();
    
    try {
      await axios.post(`${API}/friends/request?token=${token}`, {
        user_id: userId
      });
      
      // Update UI
      setSearchResults(prev => prev.map(u => 
        u.id === userId ? { ...u, request_sent: true } : u
      ));
      
      toast.success("Friend request sent!");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to send request");
    }
  };

  // Accept friend request
  const handleAcceptRequest = async (requestId, userId) => {
    haptic.success();
    
    try {
      await axios.post(`${API}/friends/accept?token=${token}`, {
        request_id: requestId
      });
      
      // Move from pending to friends
      const acceptedUser = pendingRequests.find(r => r.id === requestId)?.from_user;
      if (acceptedUser) {
        setFriends(prev => [...prev, acceptedUser]);
      }
      setPendingRequests(prev => prev.filter(r => r.id !== requestId));
      
      toast.success("Friend request accepted!");
    } catch (error) {
      toast.error("Failed to accept request");
    }
  };

  // Decline friend request
  const handleDeclineRequest = async (requestId) => {
    haptic.light();
    
    try {
      await axios.post(`${API}/friends/decline?token=${token}`, {
        request_id: requestId
      });
      
      setPendingRequests(prev => prev.filter(r => r.id !== requestId));
      toast.success("Request declined");
    } catch (error) {
      toast.error("Failed to decline request");
    }
  };

  // Cancel sent request
  const handleCancelRequest = async (requestId) => {
    haptic.light();
    
    try {
      await axios.delete(`${API}/friends/request/${requestId}?token=${token}`);
      setSentRequests(prev => prev.filter(r => r.id !== requestId));
      toast.success("Request cancelled");
    } catch (error) {
      toast.error("Failed to cancel request");
    }
  };

  // Remove friend
  const handleRemoveFriend = async (friendId) => {
    haptic.medium();
    
    try {
      await axios.delete(`${API}/friends/${friendId}?token=${token}`);
      setFriends(prev => prev.filter(f => f.id !== friendId));
      setOnlineFriends(prev => prev.filter(f => f.id !== friendId));
      toast.success("Friend removed");
    } catch (error) {
      toast.error("Failed to remove friend");
    }
  };

  const formatLastSeen = (dateStr) => {
    if (!dateStr) return "Unknown";
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return "Just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-[#0A0A0A]/95 backdrop-blur-lg border-b border-white/5">
        <div className="p-4">
          <h1 className="text-2xl font-bold text-white font-['Outfit'] mb-4">Friends</h1>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <Input
              data-testid="friend-search"
              placeholder="Search for friends..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10 bg-[#1A1A1A] border-white/10 text-white"
            />
            {searching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 animate-spin" />
            )}
          </div>
        </div>
      </div>

      {/* Search Results */}
      <AnimatePresence>
        {searchResults.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 border-b border-white/5"
          >
            <h3 className="text-sm font-medium text-gray-400 mb-3">Search Results</h3>
            <div className="space-y-2">
              {searchResults.map((result) => (
                <div
                  key={result.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-[#121212]"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={result.avatar} />
                        <AvatarFallback className="bg-gradient-to-br from-[#00F0FF] to-[#7000FF]">
                          {(result.display_name || result.username)?.[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {result.is_online && (
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[#121212]" />
                      )}
                    </div>
                    <div>
                      <p className="text-white font-medium">{result.display_name || result.username}</p>
                      <p className="text-sm text-gray-500">@{result.username}</p>
                    </div>
                  </div>
                  
                  {result.is_friend ? (
                    <span className="text-sm text-green-500 flex items-center gap-1">
                      <UserCheck className="w-4 h-4" />
                      Friends
                    </span>
                  ) : result.request_sent ? (
                    <span className="text-sm text-gray-500 flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      Pending
                    </span>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => handleSendRequest(result.id)}
                      className="bg-[#00F0FF] hover:bg-[#00F0FF]/80 text-black"
                    >
                      <UserPlus className="w-4 h-4 mr-1" />
                      Add
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="p-4">
        <TabsList className="w-full bg-[#1A1A1A] p-1">
          <TabsTrigger 
            value="friends" 
            className="flex-1 data-[state=active]:bg-[#00F0FF]/20 data-[state=active]:text-[#00F0FF]"
          >
            <Users className="w-4 h-4 mr-1" />
            All ({friends.length})
          </TabsTrigger>
          <TabsTrigger 
            value="online"
            className="flex-1 data-[state=active]:bg-green-500/20 data-[state=active]:text-green-500"
          >
            <span className="w-2 h-2 bg-green-500 rounded-full mr-2" />
            Online ({onlineFriends.length})
          </TabsTrigger>
          <TabsTrigger 
            value="requests"
            className="flex-1 data-[state=active]:bg-[#7000FF]/20 data-[state=active]:text-[#7000FF] relative"
          >
            <UserPlus className="w-4 h-4 mr-1" />
            Requests
            {pendingRequests.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
                {pendingRequests.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* All Friends */}
        <TabsContent value="friends" className="mt-4 space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-white animate-spin" />
            </div>
          ) : friends.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500">No friends yet</p>
              <p className="text-sm text-gray-600">Search and add friends to connect!</p>
            </div>
          ) : (
            friends.map((friend) => (
              <FriendCard
                key={friend.id}
                friend={friend}
                onRemove={() => handleRemoveFriend(friend.id)}
                formatLastSeen={formatLastSeen}
              />
            ))
          )}
        </TabsContent>

        {/* Online Friends */}
        <TabsContent value="online" className="mt-4 space-y-2">
          {onlineFriends.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center mx-auto mb-3">
                <span className="w-3 h-3 bg-gray-600 rounded-full" />
              </div>
              <p className="text-gray-500">No friends online</p>
              <p className="text-sm text-gray-600">Check back later!</p>
            </div>
          ) : (
            onlineFriends.map((friend) => (
              <FriendCard
                key={friend.id}
                friend={friend}
                onRemove={() => handleRemoveFriend(friend.id)}
                formatLastSeen={formatLastSeen}
                showOnlineStatus
              />
            ))
          )}
        </TabsContent>

        {/* Friend Requests */}
        <TabsContent value="requests" className="mt-4 space-y-4">
          {/* Pending Requests */}
          <div>
            <h3 className="text-sm font-medium text-gray-400 mb-3">
              Pending Requests ({pendingRequests.length})
            </h3>
            {pendingRequests.length === 0 ? (
              <p className="text-gray-600 text-sm">No pending requests</p>
            ) : (
              <div className="space-y-2">
                {pendingRequests.map((request) => (
                  <div
                    key={request.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-[#121212]"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={request.from_user?.avatar} />
                        <AvatarFallback className="bg-gradient-to-br from-[#00F0FF] to-[#7000FF]">
                          {(request.from_user?.display_name || request.from_user?.username)?.[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-white font-medium">
                          {request.from_user?.display_name || request.from_user?.username}
                        </p>
                        <p className="text-sm text-gray-500">
                          {formatLastSeen(request.created_at)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleAcceptRequest(request.id, request.from_user?.id)}
                        className="bg-green-500 hover:bg-green-600"
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeclineRequest(request.id)}
                        className="border-white/10 text-gray-400"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sent Requests */}
          <div>
            <h3 className="text-sm font-medium text-gray-400 mb-3">
              Sent Requests ({sentRequests.length})
            </h3>
            {sentRequests.length === 0 ? (
              <p className="text-gray-600 text-sm">No sent requests</p>
            ) : (
              <div className="space-y-2">
                {sentRequests.map((request) => (
                  <div
                    key={request.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-[#121212]"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={request.to_user?.avatar} />
                        <AvatarFallback className="bg-gradient-to-br from-[#00F0FF] to-[#7000FF]">
                          {(request.to_user?.display_name || request.to_user?.username)?.[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-white font-medium">
                          {request.to_user?.display_name || request.to_user?.username}
                        </p>
                        <p className="text-sm text-gray-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Pending
                        </p>
                      </div>
                    </div>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCancelRequest(request.id)}
                      className="border-white/10 text-gray-400"
                    >
                      Cancel
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <BottomNav />
    </div>
  );
}

// Friend Card Component
function FriendCard({ friend, onRemove, formatLastSeen, showOnlineStatus }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center justify-between p-3 rounded-xl bg-[#121212]"
    >
      <div className="flex items-center gap-3">
        <div className="relative">
          <Avatar className="w-12 h-12">
            <AvatarImage src={friend.avatar} />
            <AvatarFallback className="bg-gradient-to-br from-[#00F0FF] to-[#7000FF]">
              {(friend.display_name || friend.username)?.[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          {friend.is_online && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[#121212]"
            />
          )}
        </div>
        <div>
          <p className="text-white font-medium">{friend.display_name || friend.username}</p>
          <p className="text-sm text-gray-500">
            {friend.is_online ? (
              <span className="text-green-500">Online</span>
            ) : (
              `Last seen ${formatLastSeen(friend.last_seen)}`
            )}
          </p>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <Button
          size="icon"
          variant="ghost"
          className="text-gray-400 hover:text-white"
        >
          <MessageCircle className="w-5 h-5" />
        </Button>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              className="text-gray-400 hover:text-white"
            >
              <MoreVertical className="w-5 h-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-[#1A1A1A] border-white/10">
            <DropdownMenuItem 
              onClick={onRemove}
              className="text-red-400 focus:text-red-400"
            >
              <UserX className="w-4 h-4 mr-2" />
              Remove Friend
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.div>
  );
}
