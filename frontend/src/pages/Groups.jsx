import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Users, Lock, Globe, Plus, Search, Settings, Image,
  MessageCircle, Bell, MoreHorizontal, X, UserPlus,
  Shield, Calendar, MapPin, Link2, ChevronRight, Heart
} from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { useSettings } from "@/context/SettingsContext";
import BottomNav from "@/components/BottomNav";
import FacebookGroups from "@/components/facebook/FacebookGroups";
import { GroupsSkeleton } from "@/components/skeletons";

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Groups Page - uses the comprehensive FacebookGroups component
export default function Groups() {
  const { user, token } = useAuth();
  const { isDark } = useSettings();

  return (
    <div className="min-h-screen pb-20">
      <FacebookGroups isDark={isDark} />
      <BottomNav />
    </div>
  );
}

// Keep legacy code below for reference
const GROUP_CATEGORIES = [
  "Technology", "Gaming", "Sports", "Music", "Art", "Food",
  "Travel", "Fitness", "Photography", "Business", "Education", "Entertainment"
];

function GroupsLegacy() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("feed");
  const [groups, setGroups] = useState([]);
  const [myGroups, setMyGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);

  const fetchGroups = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/social-groups?token=${token}&search=${searchQuery}`);
      if (res.ok) {
        const data = await res.json();
        setGroups(data.groups || data || []);
        setMyGroups((data.groups || data || []).filter(g => g.is_member));
      } else {
        throw new Error('Failed to fetch groups');
      }
    } catch (err) {
      console.error("Failed to fetch groups:", err);
      const mockGroups = generateMockGroups();
      setGroups(mockGroups);
      setMyGroups(mockGroups.slice(0, 3));
    } finally {
      setLoading(false);
    }
  }, [token, searchQuery]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const generateMockGroups = () => {
    return [
      { id: "1", name: "React Developers", description: "A community for React enthusiasts", members: 15420, category: "Technology", is_private: false, cover: "https://picsum.photos/800/300?random=1", is_member: true },
      { id: "2", name: "Photography Lovers", description: "Share your best shots", members: 8900, category: "Photography", is_private: false, cover: "https://picsum.photos/800/300?random=2", is_member: true },
      { id: "3", name: "Fitness Warriors", description: "Get fit together", members: 23100, category: "Fitness", is_private: false, cover: "https://picsum.photos/800/300?random=3", is_member: true },
      { id: "4", name: "Indie Game Devs", description: "For indie game developers", members: 5600, category: "Gaming", is_private: true, cover: "https://picsum.photos/800/300?random=4", is_member: false },
      { id: "5", name: "Travel Stories", description: "Share your adventures", members: 45000, category: "Travel", is_private: false, cover: "https://picsum.photos/800/300?random=5", is_member: false },
      { id: "6", name: "Startup Founders", description: "Connect with entrepreneurs", members: 12300, category: "Business", is_private: true, cover: "https://picsum.photos/800/300?random=6", is_member: false },
    ].map(g => ({
      ...g,
      posts_today: Math.floor(Math.random() * 50),
      last_active: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString()
    }));
  };

  const formatMembers = (count) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[var(--bg-primary)]/95 backdrop-blur-lg border-b border-white/5">
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Groups</h1>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              className="rounded-full"
              onClick={() => setShowCreateModal(true)}
            >
              <Plus className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" className="rounded-full">
              <Settings className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            <Input
              placeholder="Search groups..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white/5 border-white/10 rounded-full"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-4 pb-3">
          {[
            { id: "feed", label: "Your Feed" },
            { id: "discover", label: "Discover" },
            { id: "your-groups", label: "Your Groups" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2 px-4 rounded-full text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? "bg-[var(--primary)] text-white"
                  : "bg-white/5 text-[var(--text-secondary)] hover:bg-white/10"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      {/* Content */}
      <div className="p-4">
        {loading ? (
          <GroupsSkeleton />
        ) : (
          <>
            {activeTab === "feed" && (
              <GroupFeed groups={myGroups} />
            )}

            {activeTab === "discover" && (
          <div className="space-y-4">
            {/* Categories */}
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
              {GROUP_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  className="px-4 py-2 bg-white/5 rounded-full text-sm text-[var(--text-secondary)] hover:bg-white/10 whitespace-nowrap"
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Suggested Groups */}
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Suggested for you</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {groups.filter(g => !g.is_member).map((group) => (
                <GroupCard
                  key={group.id}
                  group={group}
                  formatMembers={formatMembers}
                  onClick={() => setSelectedGroup(group)}
                />
              ))}
            </div>
          </div>
        )}

        {activeTab === "your-groups" && (
          <div className="space-y-4">
            {myGroups.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-16 h-16 mx-auto text-[var(--text-muted)] mb-4" />
                <p className="text-[var(--text-secondary)]">You haven't joined any groups yet</p>
                <Button 
                  className="mt-4 bg-[var(--primary)]"
                  onClick={() => setActiveTab("discover")}
                >
                  Discover Groups
                </Button>
              </div>
            ) : (
              myGroups.map((group) => (
                <GroupCard
                  key={group.id}
                  group={group}
                  formatMembers={formatMembers}
                  onClick={() => setSelectedGroup(group)}
                  showActivity
                />
              ))
            )}
          </div>
        )}
          </>
        )}
      </div>

      {/* Group Detail Modal */}
      <AnimatePresence>
        {selectedGroup && (
          <GroupDetail
            group={selectedGroup}
            onClose={() => setSelectedGroup(null)}
            formatMembers={formatMembers}
          />
        )}
      </AnimatePresence>

      {/* Create Group Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <CreateGroupModal onClose={() => setShowCreateModal(false)} />
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
}

function GroupCard({ group, formatMembers, onClick, showActivity }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/5 rounded-xl overflow-hidden hover:bg-white/10 transition-colors cursor-pointer"
      onClick={onClick}
    >
      {/* Cover */}
      <div className="h-24 bg-gradient-to-r from-[var(--primary)] to-[var(--accent-purple)] relative">
        {group.cover && (
          <img src={group.cover} alt="" className="w-full h-full object-cover" />
        )}
        {group.is_private && (
          <div className="absolute top-2 right-2 px-2 py-1 bg-black/50 rounded-full flex items-center gap-1">
            <Lock className="w-3 h-3 text-white" />
            <span className="text-xs text-white">Private</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <h3 className="font-semibold text-[var(--text-primary)]">{group.name}</h3>
        <p className="text-sm text-[var(--text-muted)] line-clamp-1 mt-1">{group.description}</p>
        <div className="flex items-center gap-2 mt-2 text-xs text-[var(--text-muted)]">
          <Users className="w-3 h-3" />
          <span>{formatMembers(group.members)} members</span>
          {showActivity && group.posts_today > 0 && (
            <>
              <span>•</span>
              <span>{group.posts_today} posts today</span>
            </>
          )}
        </div>
        {!group.is_member && (
          <Button size="sm" className="w-full mt-3 bg-[var(--primary)]">
            <UserPlus className="w-4 h-4 mr-2" />
            Join Group
          </Button>
        )}
      </div>
    </motion.div>
  );
}

function GroupFeed({ groups }) {
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    // Mock group posts
    setPosts([
      { id: "1", group: groups[0], user: { username: "john_dev", display_name: "John Developer" }, content: "Just released my new React component library! Check it out 🚀", likes: 234, comments: 45, created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() },
      { id: "2", group: groups[1], user: { username: "sarah_photos", display_name: "Sarah Photos" }, content: "Golden hour shots from yesterday's hike 📸", image: "https://picsum.photos/600/400?random=10", likes: 567, comments: 89, created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString() },
      { id: "3", group: groups[2], user: { username: "mike_fit", display_name: "Mike Fitness" }, content: "New personal record! 💪 Keep pushing your limits!", likes: 892, comments: 156, created_at: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString() },
    ].filter(p => p.group));
  }, [groups]);

  if (groups.length === 0) {
    return (
      <div className="text-center py-12">
        <Users className="w-16 h-16 mx-auto text-[var(--text-muted)] mb-4" />
        <p className="text-[var(--text-secondary)]">Join groups to see posts in your feed</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <motion.div
          key={post.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/5 rounded-xl overflow-hidden"
        >
          {/* Group info */}
          <div className="flex items-center gap-3 p-3 border-b border-white/5">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[var(--primary)] to-[var(--accent-purple)]" />
            <div className="flex-1">
              <p className="font-semibold text-[var(--text-primary)] text-sm">{post.group?.name}</p>
              <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                <span>{post.user.display_name}</span>
                <span>•</span>
                <span>{getTimeAgo(post.created_at)}</span>
              </div>
            </div>
            <button className="p-2">
              <MoreHorizontal className="w-5 h-5 text-[var(--text-muted)]" />
            </button>
          </div>

          {/* Content */}
          <div className="p-3">
            <p className="text-[var(--text-primary)]">{post.content}</p>
            {post.image && (
              <img src={post.image} alt="" className="w-full rounded-lg mt-3" />
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4 p-3 border-t border-white/5">
            <button className="flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--primary)]">
              <Heart className="w-5 h-5" />
              <span className="text-sm">{post.likes}</span>
            </button>
            <button className="flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--primary)]">
              <MessageCircle className="w-5 h-5" />
              <span className="text-sm">{post.comments}</span>
            </button>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function GroupDetail({ group, onClose, formatMembers }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/80 flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        className="w-full max-w-lg bg-[var(--bg-primary)] rounded-t-3xl sm:rounded-3xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cover */}
        <div className="h-40 bg-gradient-to-r from-[var(--primary)] to-[var(--accent-purple)] relative">
          {group.cover && (
            <img src={group.cover} alt="" className="w-full h-full object-cover" />
          )}
          <button
            onClick={onClose}
            className="absolute top-4 left-4 p-2 rounded-full bg-black/50"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Info */}
        <div className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold text-[var(--text-primary)]">{group.name}</h2>
              <div className="flex items-center gap-2 text-sm text-[var(--text-muted)] mt-1">
                {group.is_private ? <Lock className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
                <span>{group.is_private ? "Private" : "Public"} group</span>
                <span>•</span>
                <span>{formatMembers(group.members)} members</span>
              </div>
            </div>
          </div>

          <p className="text-[var(--text-secondary)] mt-4">{group.description}</p>

          <div className="flex gap-3 mt-6">
            {group.is_member ? (
              <>
                <Button className="flex-1 bg-white/10 hover:bg-white/20 text-[var(--text-primary)]">
                  <Bell className="w-4 h-4 mr-2" />
                  Notifications
                </Button>
                <Button className="flex-1 bg-[var(--primary)]">
                  <MessageCircle className="w-4 h-4 mr-2" />
                  View Group
                </Button>
              </>
            ) : (
              <Button className="w-full bg-[var(--primary)]">
                <UserPlus className="w-4 h-4 mr-2" />
                Join Group
              </Button>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function CreateGroupModal({ onClose }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [category, setCategory] = useState("Technology");

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/80 flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        className="w-full max-w-lg bg-[var(--bg-primary)] rounded-t-3xl sm:rounded-3xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Create Group</h2>
          <button onClick={onClose}>
            <X className="w-5 h-5 text-[var(--text-muted)]" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Cover upload */}
          <div className="h-32 bg-white/5 rounded-xl flex flex-col items-center justify-center border-2 border-dashed border-white/20 cursor-pointer hover:border-[var(--primary)] transition-colors">
            <Image className="w-8 h-8 text-[var(--text-muted)] mb-2" />
            <p className="text-sm text-[var(--text-muted)]">Add Cover Photo</p>
          </div>

          <Input
            placeholder="Group name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="bg-white/5 border-white/10"
          />

          <textarea
            placeholder="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full p-3 bg-white/5 border border-white/10 rounded-lg text-[var(--text-primary)] resize-none"
          />

          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full p-3 bg-white/5 border border-white/10 rounded-lg text-[var(--text-primary)]"
          >
            {GROUP_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          {/* Privacy toggle */}
          <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
            <div className="flex items-center gap-3">
              {isPrivate ? <Lock className="w-5 h-5 text-[var(--text-muted)]" /> : <Globe className="w-5 h-5 text-[var(--text-muted)]" />}
              <div>
                <p className="font-medium text-[var(--text-primary)]">{isPrivate ? "Private" : "Public"}</p>
                <p className="text-xs text-[var(--text-muted)]">
                  {isPrivate ? "Only members can see posts" : "Anyone can see posts"}
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsPrivate(!isPrivate)}
              className={`w-12 h-6 rounded-full transition-colors ${isPrivate ? 'bg-[var(--primary)]' : 'bg-white/20'}`}
            >
              <div className={`w-5 h-5 rounded-full bg-white transition-transform ${isPrivate ? 'translate-x-6' : 'translate-x-0.5'}`} />
            </button>
          </div>

          <Button className="w-full bg-[var(--primary)] hover:bg-[var(--primary-hover)]">
            Create Group
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function getTimeAgo(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);
  
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}
