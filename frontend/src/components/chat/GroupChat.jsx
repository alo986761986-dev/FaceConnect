import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { toast } from "sonner";
import { 
  Users, Plus, X, Search, Settings, UserPlus, 
  Crown, Shield, LogOut, Trash2, Edit2, Check,
  ArrowLeft, MoreVertical, Image as ImageIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/context/AuthContext";
import { haptic } from "@/utils/mobile";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Create Group Dialog
export function CreateGroupDialog({ open, onOpenChange, onGroupCreated }) {
  const { token, user } = useAuth();
  const [groupName, setGroupName] = useState("");
  const [description, setDescription] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  // Search for users to add
  const searchUsers = useCallback(async () => {
    if (!searchQuery.trim() || !token) return;
    setLoading(true);
    try {
      const response = await axios.get(`${API}/users/search?q=${searchQuery}&token=${token}`);
      // Filter out current user
      setUsers(response.data.filter(u => u.id !== user?.id));
    } catch (error) {
      console.error("Failed to search users:", error);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, token, user]);

  useEffect(() => {
    const timer = setTimeout(searchUsers, 300);
    return () => clearTimeout(timer);
  }, [searchUsers]);

  const toggleUser = (selectedUser) => {
    setSelectedUsers(prev => {
      const exists = prev.find(u => u.id === selectedUser.id);
      if (exists) {
        return prev.filter(u => u.id !== selectedUser.id);
      }
      return [...prev, selectedUser];
    });
    haptic.light();
  };

  const handleCreate = async () => {
    if (!groupName.trim()) {
      toast.error("Group name is required");
      return;
    }
    if (selectedUsers.length === 0) {
      toast.error("Add at least one member");
      return;
    }

    setCreating(true);
    try {
      const response = await axios.post(`${API}/groups?token=${token}`, {
        name: groupName.trim(),
        description: description.trim(),
        participant_ids: selectedUsers.map(u => u.id)
      });
      
      toast.success("Group created!");
      haptic.success();
      onGroupCreated?.(response.data);
      onOpenChange(false);
      
      // Reset form
      setGroupName("");
      setDescription("");
      setSelectedUsers([]);
      setSearchQuery("");
    } catch (error) {
      console.error("Failed to create group:", error);
      toast.error(error.response?.data?.detail || "Failed to create group");
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#1a1a1a] border-white/10 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[#00F0FF]" />
            Create Group
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Group Name */}
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Group Name</label>
            <Input
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Enter group name"
              className="bg-white/5 border-white/10 text-white"
              data-testid="group-name-input"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Description (optional)</label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this group about?"
              className="bg-white/5 border-white/10 text-white"
            />
          </div>

          {/* Selected Members */}
          {selectedUsers.length > 0 && (
            <div>
              <label className="text-sm text-gray-400 mb-2 block">
                Selected ({selectedUsers.length})
              </label>
              <div className="flex flex-wrap gap-2">
                {selectedUsers.map(u => (
                  <div
                    key={u.id}
                    className="flex items-center gap-1 bg-[#7000FF]/20 text-[#00F0FF] px-2 py-1 rounded-full text-sm"
                  >
                    <span>{u.display_name || u.username}</span>
                    <button
                      onClick={() => toggleUser(u)}
                      className="hover:bg-white/10 rounded-full p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Search Users */}
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Add Members</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search users..."
                className="bg-white/5 border-white/10 text-white pl-10"
                data-testid="search-users-input"
              />
            </div>
          </div>

          {/* User Results */}
          {searchQuery && (
            <div className="max-h-48 overflow-y-auto space-y-1">
              {loading ? (
                <div className="text-center py-4 text-gray-500">Searching...</div>
              ) : users.length === 0 ? (
                <div className="text-center py-4 text-gray-500">No users found</div>
              ) : (
                users.map(u => {
                  const isSelected = selectedUsers.some(s => s.id === u.id);
                  return (
                    <button
                      key={u.id}
                      onClick={() => toggleUser(u)}
                      className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors ${
                        isSelected ? 'bg-[#7000FF]/20' : 'hover:bg-white/5'
                      }`}
                    >
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={u.avatar} />
                        <AvatarFallback className="bg-gradient-to-br from-[#00F0FF] to-[#7000FF]">
                          {(u.display_name || u.username)?.[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 text-left">
                        <div className="font-medium">{u.display_name || u.username}</div>
                        <div className="text-sm text-gray-500">@{u.username}</div>
                      </div>
                      {isSelected && (
                        <Check className="w-5 h-5 text-[#00F0FF]" />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-gray-400"
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={creating || !groupName.trim() || selectedUsers.length === 0}
            className="bg-gradient-to-r from-[#00F0FF] to-[#7000FF]"
            data-testid="create-group-btn"
          >
            {creating ? "Creating..." : "Create Group"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Group Settings/Info Panel
export function GroupInfoPanel({ group, onClose, onUpdate, onLeave }) {
  const { token, user } = useAuth();
  const [editing, setEditing] = useState(false);
  const [groupName, setGroupName] = useState(group?.name || "");
  const [description, setDescription] = useState(group?.description || "");
  const [saving, setSaving] = useState(false);
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const isAdmin = group?.admins?.includes(user?.id);
  const isCreator = group?.created_by === user?.id;

  const handleSave = async () => {
    if (!groupName.trim()) return;
    setSaving(true);
    try {
      await axios.put(`${API}/groups/${group.id}?token=${token}`, {
        name: groupName.trim(),
        description: description.trim()
      });
      toast.success("Group updated");
      onUpdate?.();
      setEditing(false);
    } catch (error) {
      toast.error("Failed to update group");
    } finally {
      setSaving(false);
    }
  };

  const handleLeave = async () => {
    if (!window.confirm("Are you sure you want to leave this group?")) return;
    
    try {
      await axios.post(`${API}/groups/${group.id}/leave?token=${token}`);
      toast.success("Left group");
      haptic.success();
      onLeave?.();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to leave group");
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (!window.confirm("Remove this member from the group?")) return;
    
    try {
      await axios.delete(`${API}/groups/${group.id}/members/${memberId}?token=${token}`);
      toast.success("Member removed");
      onUpdate?.();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to remove member");
    }
  };

  const handleToggleAdmin = async (memberId, isCurrentlyAdmin) => {
    try {
      if (isCurrentlyAdmin) {
        await axios.delete(`${API}/groups/${group.id}/admins/${memberId}?token=${token}`);
        toast.success("Admin removed");
      } else {
        await axios.post(`${API}/groups/${group.id}/admins/${memberId}?token=${token}`);
        toast.success("Admin added");
      }
      onUpdate?.();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to update admin");
    }
  };

  const searchUsers = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const response = await axios.get(`${API}/users/search?q=${searchQuery}&token=${token}`);
      // Filter out existing members
      const memberIds = new Set(group.members?.map(m => m.id) || []);
      setSearchResults(response.data.filter(u => !memberIds.has(u.id)));
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setSearching(false);
    }
  };

  const handleAddMember = async (userId) => {
    try {
      await axios.post(`${API}/groups/${group.id}/members?token=${token}`, {
        user_ids: [userId]
      });
      toast.success("Member added");
      onUpdate?.();
      setSearchQuery("");
      setSearchResults([]);
    } catch (error) {
      toast.error("Failed to add member");
    }
  };

  if (!group) return null;

  return (
    <motion.div
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      className="fixed inset-0 bg-[#0A0A0A] z-50 overflow-y-auto"
    >
      {/* Header */}
      <div className="sticky top-0 bg-[#0A0A0A] border-b border-white/5 p-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onClose}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h2 className="text-lg font-semibold flex-1">Group Info</h2>
        {isAdmin && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setEditing(!editing)}
          >
            <Edit2 className="w-5 h-5" />
          </Button>
        )}
      </div>

      <div className="p-4 space-y-6">
        {/* Group Avatar & Name */}
        <div className="text-center">
          <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-[#00F0FF] to-[#7000FF] flex items-center justify-center mb-4">
            {group.avatar ? (
              <img src={group.avatar} alt={group.name} className="w-full h-full rounded-full object-cover" />
            ) : (
              <Users className="w-12 h-12 text-white" />
            )}
          </div>
          
          {editing ? (
            <div className="space-y-2">
              <Input
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="bg-white/5 border-white/10 text-white text-center"
                placeholder="Group name"
              />
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="bg-white/5 border-white/10 text-white text-center"
                placeholder="Description"
              />
              <div className="flex justify-center gap-2 mt-2">
                <Button variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>
          ) : (
            <>
              <h3 className="text-xl font-bold text-white">{group.name}</h3>
              {group.description && (
                <p className="text-gray-400 mt-1">{group.description}</p>
              )}
              <p className="text-sm text-gray-500 mt-2">
                {group.member_count} members
              </p>
            </>
          )}
        </div>

        {/* Add Members (Admin only) */}
        {isAdmin && (
          <div className="bg-white/5 rounded-xl p-4">
            <button
              onClick={() => setShowAddMembers(!showAddMembers)}
              className="w-full flex items-center gap-3 text-[#00F0FF]"
            >
              <UserPlus className="w-5 h-5" />
              <span>Add Members</span>
            </button>
            
            <AnimatePresence>
              {showAddMembers && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="mt-4 space-y-3"
                >
                  <div className="flex gap-2">
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search users..."
                      className="bg-white/5 border-white/10 text-white"
                      onKeyDown={(e) => e.key === 'Enter' && searchUsers()}
                    />
                    <Button onClick={searchUsers} disabled={searching}>
                      <Search className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  {searchResults.map(u => (
                    <div key={u.id} className="flex items-center gap-3 p-2 bg-white/5 rounded-lg">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={u.avatar} />
                        <AvatarFallback>{u.username?.[0]}</AvatarFallback>
                      </Avatar>
                      <span className="flex-1">{u.display_name || u.username}</span>
                      <Button size="sm" onClick={() => handleAddMember(u.id)}>
                        Add
                      </Button>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Members List */}
        <div>
          <h4 className="text-sm text-gray-400 mb-3">Members ({group.members?.length || 0})</h4>
          <div className="space-y-2">
            {group.members?.map(member => {
              const memberIsAdmin = group.admins?.includes(member.id);
              const memberIsCreator = member.id === group.created_by;
              
              return (
                <div
                  key={member.id}
                  className="flex items-center gap-3 p-3 bg-white/5 rounded-xl"
                >
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={member.avatar} />
                    <AvatarFallback className="bg-gradient-to-br from-[#00F0FF] to-[#7000FF]">
                      {(member.display_name || member.username)?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">
                        {member.display_name || member.username}
                        {member.id === user?.id && " (You)"}
                      </span>
                      {memberIsCreator && (
                        <Crown className="w-4 h-4 text-yellow-500" title="Creator" />
                      )}
                      {memberIsAdmin && !memberIsCreator && (
                        <Shield className="w-4 h-4 text-[#00F0FF]" title="Admin" />
                      )}
                    </div>
                    <div className="text-sm text-gray-500">@{member.username}</div>
                  </div>

                  {/* Admin actions */}
                  {isAdmin && member.id !== user?.id && !memberIsCreator && (
                    <div className="flex gap-1">
                      {isCreator && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleToggleAdmin(member.id, memberIsAdmin)}
                          title={memberIsAdmin ? "Remove admin" : "Make admin"}
                        >
                          <Shield className={`w-4 h-4 ${memberIsAdmin ? 'text-[#00F0FF]' : 'text-gray-500'}`} />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveMember(member.id)}
                        className="text-red-500 hover:text-red-400"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Leave Group */}
        <Button
          variant="ghost"
          onClick={handleLeave}
          className="w-full text-red-500 hover:text-red-400 hover:bg-red-500/10"
          data-testid="leave-group-btn"
        >
          <LogOut className="w-5 h-5 mr-2" />
          Leave Group
        </Button>
      </div>
    </motion.div>
  );
}

// Group List Item Component
export function GroupListItem({ group, onClick, isSelected }) {
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${
        isSelected ? 'bg-[#7000FF]/20' : 'hover:bg-white/5'
      }`}
      data-testid={`group-item-${group.id}`}
    >
      <div className="relative">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#00F0FF] to-[#7000FF] flex items-center justify-center">
          {group.avatar ? (
            <img src={group.avatar} alt={group.name} className="w-full h-full rounded-full object-cover" />
          ) : (
            <Users className="w-6 h-6 text-white" />
          )}
        </div>
      </div>
      
      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-white truncate">{group.name}</span>
          <span className="text-xs text-gray-500">{group.member_count} members</span>
        </div>
        {group.last_message ? (
          <p className="text-sm text-gray-400 truncate">
            {group.last_message.content || "Sent a media"}
          </p>
        ) : (
          <p className="text-sm text-gray-500">No messages yet</p>
        )}
      </div>
    </motion.button>
  );
}

export default CreateGroupDialog;
