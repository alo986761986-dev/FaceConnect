import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, UserPlus, UserMinus, Search, Star, X, Loader2, Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { useSettings } from "@/context/SettingsContext";
import { haptic } from "@/utils/mobile";

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function CloseFriendsManager({ isOpen, onClose }) {
  const { token } = useAuth();
  const { isDark } = useSettings();
  
  const [closeFriends, setCloseFriends] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [addingId, setAddingId] = useState(null);
  const [removingId, setRemovingId] = useState(null);

  // Fetch close friends and suggestions
  useEffect(() => {
    if (isOpen) {
      fetchCloseFriends();
      fetchSuggestions();
    }
  }, [isOpen]);

  const fetchCloseFriends = async () => {
    try {
      const response = await fetch(`${API_URL}/api/close-friends?token=${token}`);
      if (response.ok) {
        const data = await response.json();
        setCloseFriends(data.close_friends || []);
      }
    } catch (error) {
      console.error("Failed to fetch close friends:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSuggestions = async () => {
    try {
      const response = await fetch(`${API_URL}/api/close-friends/suggestions?token=${token}`);
      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.suggestions || []);
      }
    } catch (error) {
      console.error("Failed to fetch suggestions:", error);
    }
  };

  // Search users
  const handleSearch = async (query) => {
    setSearchQuery(query);
    
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    
    setSearching(true);
    try {
      const response = await fetch(
        `${API_URL}/api/explore/search?token=${token}&q=${encodeURIComponent(query)}&type=users`
      );
      if (response.ok) {
        const data = await response.json();
        // Filter out users already in close friends
        const closeFriendIds = closeFriends.map(cf => cf.id);
        setSearchResults((data.users || []).filter(u => !closeFriendIds.includes(u.id)));
      }
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setSearching(false);
    }
  };

  // Add to close friends
  const handleAdd = async (userId, username) => {
    setAddingId(userId);
    haptic.medium();
    
    try {
      const response = await fetch(`${API_URL}/api/close-friends?token=${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId })
      });
      
      if (response.ok) {
        const data = await response.json();
        setCloseFriends(prev => [...prev, data.friend]);
        setSuggestions(prev => prev.filter(s => s.id !== userId));
        setSearchResults(prev => prev.filter(s => s.id !== userId));
        toast.success(`Added ${username} to Close Friends`);
        haptic.success();
      } else {
        const error = await response.json();
        toast.error(error.detail || "Failed to add");
      }
    } catch (error) {
      toast.error("Failed to add to close friends");
    } finally {
      setAddingId(null);
    }
  };

  // Remove from close friends
  const handleRemove = async (userId, username) => {
    setRemovingId(userId);
    haptic.medium();
    
    try {
      const response = await fetch(`${API_URL}/api/close-friends/${userId}?token=${token}`, {
        method: "DELETE"
      });
      
      if (response.ok) {
        setCloseFriends(prev => prev.filter(cf => cf.id !== userId));
        toast.success(`Removed ${username} from Close Friends`);
      } else {
        toast.error("Failed to remove");
      }
    } catch (error) {
      toast.error("Failed to remove from close friends");
    } finally {
      setRemovingId(null);
    }
  };

  // User card component
  const UserCard = ({ user, isCloseFriend = false, onAction }) => (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--muted)]">
      <Avatar className="w-12 h-12">
        <AvatarImage src={user.avatar ? `${API_URL}${user.avatar}` : undefined} />
        <AvatarFallback className="bg-gradient-to-br from-[var(--primary)] to-[var(--accent-purple)] text-white">
          {user.username?.[0]?.toUpperCase() || "?"}
        </AvatarFallback>
      </Avatar>
      
      <div className="flex-1 min-w-0">
        <p className="font-semibold truncate">{user.username}</p>
        {user.display_name && (
          <p className="text-sm text-[var(--text-muted)] truncate">{user.display_name}</p>
        )}
      </div>
      
      {isCloseFriend ? (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onAction(user.id, user.username)}
          disabled={removingId === user.id}
          className="text-red-500 border-red-500/30 hover:bg-red-500/10"
        >
          {removingId === user.id ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <UserMinus className="w-4 h-4" />
          )}
        </Button>
      ) : (
        <Button
          size="sm"
          onClick={() => onAction(user.id, user.username)}
          disabled={addingId === user.id}
          className="bg-green-600 hover:bg-green-700"
        >
          {addingId === user.id ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <UserPlus className="w-4 h-4" />
          )}
        </Button>
      )}
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`max-w-md max-h-[80vh] overflow-hidden flex flex-col ${isDark ? 'bg-[#121212] border-white/10' : 'bg-white'}`}>
        <DialogHeader>
          <DialogTitle className={`flex items-center gap-2 ${isDark ? 'text-white' : ''}`}>
            <Star className="w-5 h-5 text-green-500" />
            Close Friends
          </DialogTitle>
          <DialogDescription>
            Share stories only with people you choose. They won't know they're on your list.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            <Input
              placeholder="Search people to add..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10"
            />
            {searchQuery && (
              <button
                onClick={() => { setSearchQuery(""); setSearchResults([]); }}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X className="w-4 h-4 text-[var(--text-muted)]" />
              </button>
            )}
          </div>

          {/* Search Results */}
          {searchQuery && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-[var(--text-muted)]">Search Results</h4>
              {searching ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-6 h-6 animate-spin text-[var(--primary)]" />
                </div>
              ) : searchResults.length > 0 ? (
                searchResults.map(user => (
                  <UserCard key={user.id} user={user} onAction={handleAdd} />
                ))
              ) : (
                <p className="text-center text-[var(--text-muted)] py-4 text-sm">
                  No users found
                </p>
              )}
            </div>
          )}

          {/* Current Close Friends */}
          {!searchQuery && (
            <>
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-[var(--text-muted)] flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Your Close Friends ({closeFriends.length})
                </h4>
                
                {loading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-[var(--primary)]" />
                  </div>
                ) : closeFriends.length > 0 ? (
                  <div className="space-y-2">
                    {closeFriends.map(friend => (
                      <UserCard 
                        key={friend.id} 
                        user={friend} 
                        isCloseFriend 
                        onAction={handleRemove} 
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-green-500/10 flex items-center justify-center">
                      <Star className="w-8 h-8 text-green-500" />
                    </div>
                    <p className="text-[var(--text-secondary)]">No close friends yet</p>
                    <p className="text-sm text-[var(--text-muted)]">
                      Add people to share exclusive stories
                    </p>
                  </div>
                )}
              </div>

              {/* Suggestions */}
              {suggestions.length > 0 && (
                <div className="space-y-2 pt-4 border-t border-[var(--border)]">
                  <h4 className="text-sm font-medium text-[var(--text-muted)]">Suggested</h4>
                  {suggestions.slice(0, 5).map(user => (
                    <UserCard key={user.id} user={user} onAction={handleAdd} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Info Footer */}
        <div className="pt-3 border-t border-[var(--border)]">
          <p className="text-xs text-[var(--text-muted)] text-center">
            When you share a story to Close Friends, they'll see a green ring around your profile photo.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
