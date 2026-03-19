import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Gift, Users, Bookmark, Clock, ChevronDown, ChevronUp,
  Video, Calendar, ShoppingBag, Heart, Star, TrendingUp,
  Gamepad2, Newspaper, UserPlus, X, Check, Settings
} from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/context/AuthContext";
import DesktopSettings from "@/components/DesktopSettings";
import { isElectron } from "@/utils/electron";

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Left Sidebar - Navigation shortcuts
export function LeftSidebar({ className = "" }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Hide left sidebar in Electron app
  if (isElectron()) {
    return null;
  }

  const mainItems = [
    { icon: Users, label: "Friends", path: "/friends", color: "#1877F2" },
    { icon: Clock, label: "Memories", path: "/memories", color: "#F7B928" },
    { icon: Video, label: "Watch", path: "/watch", color: "#F43F5E" },
    { icon: Video, label: "Reels", path: "/reels", color: "#FF00D6" },
  ];

  const moreItems = [
    { icon: Calendar, label: "Events", path: "/events", color: "#EC4899" },
    { icon: ShoppingBag, label: "Marketplace", path: "/marketplace", color: "#22C55E" },
    { icon: Gamepad2, label: "Gaming", path: "/gaming", color: "#6366F1" },
    { icon: Users, label: "Groups", path: "/groups", color: "#3B82F6" },
  ];

  return (
    <aside className={`hidden lg:block w-[280px] xl:w-[300px] 2xl:w-[320px] sticky top-16 h-[calc(100vh-64px)] overflow-y-auto sidebar-scroll ${className}`}>
      <div className="p-3 space-y-1">
        {/* User Profile */}
        <button
          onClick={() => navigate(`/profile/${user?.username}`)}
          className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-white/5 transition-colors group"
        >
          <Avatar className="h-9 w-9">
            <AvatarImage src={user?.avatar ? `${API_URL}${user.avatar}` : undefined} />
            <AvatarFallback className="bg-gradient-to-br from-[var(--primary)] to-[var(--accent-purple)] text-white text-sm">
              {user?.username?.[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="font-medium text-[var(--text-primary)] group-hover:text-[var(--primary)] transition-colors">
            {user?.display_name || user?.username}
          </span>
        </button>

        {/* Main Navigation Items */}
        {mainItems.map((item) => (
          <SidebarItem key={item.label} item={item} onClick={() => navigate(item.path)} />
        ))}

        {/* Expandable Section */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              {moreItems.map((item) => (
                <SidebarItem key={item.label} item={item} onClick={() => navigate(item.path)} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* See More/Less Button */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-white/5 transition-colors"
        >
          <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center">
            {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </div>
          <span className="text-[var(--text-secondary)]">
            {expanded ? "See less" : "See more"}
          </span>
        </button>

        {/* Divider */}
        <div className="h-px bg-white/10 my-3" />

        {/* Your Shortcuts */}
        <p className="px-2 text-sm font-semibold text-[var(--text-muted)] mb-2">
          Your shortcuts
        </p>
        <ShortcutItem 
          label="FaceConnect Premium" 
          icon="star"
          onClick={() => navigate('/premium')} 
        />
        <ShortcutItem 
          label="Face Scanner" 
          icon="scan"
          onClick={() => navigate('/scan')} 
        />

        {/* Settings Button */}
        <button
          onClick={() => setShowSettings(true)}
          className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-white/5 transition-colors group mt-2"
        >
          <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center">
            <Settings className="w-5 h-5 text-gray-400" />
          </div>
          <span className="text-[var(--text-secondary)] group-hover:text-[var(--primary)] transition-colors">
            Settings
          </span>
        </button>
      </div>

      {/* Footer */}
      <div className="p-4 text-xs text-[var(--text-muted)]">
        <p>Privacy · Terms · Advertising · Cookies</p>
        <p className="mt-1">FaceConnect © 2024</p>
      </div>

      {/* Desktop Settings Dialog */}
      <DesktopSettings isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </aside>
  );
}

// Right Sidebar - Suggestions, Birthdays, Sponsored
export function RightSidebar({ className = "" }) {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [suggestions, setSuggestions] = useState([]);
  const [birthdays, setBirthdays] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchSuggestions = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/api/users/suggestions?limit=5`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSuggestions(data.suggestions || data || []);
      }
    } catch (err) {
      console.error("Failed to fetch suggestions:", err);
    }
  }, [token]);

  const fetchBirthdays = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/api/users/birthdays`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setBirthdays(data.birthdays || data || []);
      }
    } catch (err) {
      // Birthdays endpoint might not exist, that's ok
    }
  }, [token]);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchSuggestions(), fetchBirthdays()]).finally(() => setLoading(false));
  }, [fetchSuggestions, fetchBirthdays]);

  return (
    <aside className={`hidden xl:block w-[300px] 2xl:w-[340px] sticky top-16 h-[calc(100vh-64px)] overflow-y-auto sidebar-scroll ${className}`}>
      <div className="p-4 space-y-5">
        {/* Sponsored Section */}
        <SponsoredSection />

        {/* Divider */}
        <div className="h-px bg-white/10" />

        {/* Birthdays */}
        {birthdays.length > 0 && (
          <>
            <BirthdaysSection birthdays={birthdays} />
            <div className="h-px bg-white/10" />
          </>
        )}

        {/* Friend Suggestions */}
        <FriendSuggestions 
          suggestions={suggestions} 
          loading={loading}
          onRefresh={fetchSuggestions}
        />

        {/* Contacts / Online Friends */}
        <OnlineContacts />
      </div>
    </aside>
  );
}

// Sidebar Item Component
function SidebarItem({ item, onClick }) {
  const Icon = item.icon;
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-white/5 transition-colors group"
    >
      <div 
        className="w-9 h-9 rounded-full flex items-center justify-center"
        style={{ backgroundColor: `${item.color}20` }}
      >
        <Icon className="w-5 h-5" style={{ color: item.color }} />
      </div>
      <span className="text-[var(--text-primary)] group-hover:text-[var(--primary)] transition-colors">
        {item.label}
      </span>
    </button>
  );
}

// Shortcut Item
function ShortcutItem({ label, icon, onClick }) {
  const icons = {
    star: Star,
    scan: TrendingUp,
  };
  const Icon = icons[icon] || Star;

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-white/5 transition-colors"
    >
      <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[var(--primary)] to-[var(--accent-purple)] flex items-center justify-center">
        <Icon className="w-4 h-4 text-white" />
      </div>
      <span className="text-[var(--text-secondary)] text-sm">{label}</span>
    </button>
  );
}

// Sponsored Section
function SponsoredSection() {
  const ads = [
    {
      id: 1,
      title: "Upgrade to Premium",
      description: "Unlock unlimited face scans & advanced filters",
      image: "/icons/faceconnect-logo-main.png",
      link: "/premium"
    }
  ];

  const navigate = useNavigate();

  return (
    <div>
      <h3 className="text-[var(--text-muted)] font-semibold text-sm mb-3">Sponsored</h3>
      {ads.map(ad => (
        <button
          key={ad.id}
          onClick={() => navigate(ad.link)}
          className="flex gap-3 w-full p-2 rounded-lg hover:bg-white/5 transition-colors text-left"
        >
          <div className="w-32 h-32 rounded-lg bg-gradient-to-br from-[var(--primary)]/20 to-[var(--accent-purple)]/20 flex items-center justify-center overflow-hidden">
            <img 
              src={ad.image} 
              alt={ad.title}
              className="w-20 h-20 object-contain"
              onError={(e) => e.target.style.display = 'none'}
            />
          </div>
          <div className="flex-1">
            <p className="text-[var(--text-primary)] font-medium text-sm">{ad.title}</p>
            <p className="text-[var(--text-muted)] text-xs mt-1">{ad.description}</p>
          </div>
        </button>
      ))}
    </div>
  );
}

// Birthdays Section
function BirthdaysSection({ birthdays }) {
  return (
    <div>
      <h3 className="text-[var(--text-muted)] font-semibold text-sm mb-3">Birthdays</h3>
      <div className="flex items-center gap-3 p-2 rounded-lg bg-white/5">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center">
          <Gift className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <p className="text-[var(--text-primary)] text-sm">
            <span className="font-semibold">{birthdays[0]?.username}</span>
            {birthdays.length > 1 && ` and ${birthdays.length - 1} others`}
            {birthdays.length === 1 && "'s birthday is today"}
            {birthdays.length > 1 && " have birthdays today"}
          </p>
        </div>
      </div>
    </div>
  );
}

// Friend Suggestions Section
function FriendSuggestions({ suggestions, loading, onRefresh }) {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [followedIds, setFollowedIds] = useState(new Set());
  const [dismissedIds, setDismissedIds] = useState(new Set());

  const handleFollow = async (userId) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/api/follow/${userId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setFollowedIds(prev => new Set([...prev, userId]));
      }
    } catch (err) {
      console.error("Failed to follow:", err);
    }
  };

  const handleDismiss = (userId) => {
    setDismissedIds(prev => new Set([...prev, userId]));
  };

  const visibleSuggestions = suggestions.filter(
    s => !dismissedIds.has(s.id) && !followedIds.has(s.id)
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[var(--text-muted)] font-semibold text-sm">People you may know</h3>
        <button 
          onClick={onRefresh}
          className="text-[var(--primary)] text-sm hover:underline"
        >
          See all
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-3 animate-pulse">
              <div className="w-10 h-10 rounded-full bg-white/10" />
              <div className="flex-1">
                <div className="h-3 w-24 bg-white/10 rounded mb-2" />
                <div className="h-2 w-16 bg-white/10 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : visibleSuggestions.length === 0 ? (
        <p className="text-[var(--text-muted)] text-sm text-center py-4">
          No suggestions available
        </p>
      ) : (
        <div className="space-y-1">
          {visibleSuggestions.slice(0, 5).map(user => (
            <motion.div
              key={user.id}
              initial={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors group"
            >
              <button onClick={() => navigate(`/profile/${user.username}`)}>
                <Avatar className="h-10 w-10">
                  <AvatarImage src={user.avatar ? `${API_URL}${user.avatar}` : undefined} />
                  <AvatarFallback className="bg-gradient-to-br from-[var(--primary)] to-[var(--accent-purple)] text-white text-sm">
                    {user.username?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </button>
              <div className="flex-1 min-w-0">
                <button 
                  onClick={() => navigate(`/profile/${user.username}`)}
                  className="text-[var(--text-primary)] font-medium text-sm hover:underline truncate block"
                >
                  {user.display_name || user.username}
                </button>
                <p className="text-[var(--text-muted)] text-xs truncate">
                  {user.mutual_friends ? `${user.mutual_friends} mutual friends` : user.bio?.slice(0, 30) || "@" + user.username}
                </p>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleFollow(user.id)}
                  className="p-1.5 rounded-full bg-[var(--primary)] hover:bg-[var(--primary-hover)] transition-colors"
                >
                  <UserPlus className="w-3.5 h-3.5 text-white" />
                </button>
                <button
                  onClick={() => handleDismiss(user.id)}
                  className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

// Online Contacts
function OnlineContacts() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [contacts, setContacts] = useState([]);

  useEffect(() => {
    if (!token) return;
    // Fetch following users as contacts
    fetch(`${API_URL}/api/social/following`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.ok ? res.json() : [])
      .then(data => setContacts((data.following || data || []).slice(0, 10)))
      .catch(() => {});
  }, [token]);

  if (contacts.length === 0) return null;

  return (
    <div>
      <h3 className="text-[var(--text-muted)] font-semibold text-sm mb-3">Contacts</h3>
      <div className="space-y-1">
        {contacts.map(contact => (
          <button
            key={contact.id}
            onClick={() => navigate(`/chat/${contact.id}`)}
            className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-white/5 transition-colors"
          >
            <div className="relative">
              <Avatar className="h-8 w-8">
                <AvatarImage src={contact.avatar ? `${API_URL}${contact.avatar}` : undefined} />
                <AvatarFallback className="bg-gradient-to-br from-[var(--primary)] to-[var(--accent-purple)] text-white text-xs">
                  {contact.username?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {/* Online indicator - randomly show some as online */}
              {Math.random() > 0.5 && (
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-[var(--bg-primary)]" />
              )}
            </div>
            <span className="text-[var(--text-primary)] text-sm">
              {contact.display_name || contact.username}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default { LeftSidebar, RightSidebar };
