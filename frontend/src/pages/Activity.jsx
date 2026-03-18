import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Heart, MessageCircle, UserPlus, AtSign, Eye, Video,
  Check, Trash2, Bell, BellOff, Settings, ChevronRight
} from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { useSettings } from "@/context/SettingsContext";
import { haptic } from "@/utils/mobile";
import BottomNav from "@/components/BottomNav";

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Notification type icons and colors
const NOTIFICATION_TYPES = {
  like: { icon: Heart, color: "text-red-500", bgColor: "bg-red-500/10", label: "liked your post" },
  comment: { icon: MessageCircle, color: "text-blue-500", bgColor: "bg-blue-500/10", label: "commented" },
  follow: { icon: UserPlus, color: "text-green-500", bgColor: "bg-green-500/10", label: "started following you" },
  follow_request: { icon: UserPlus, color: "text-amber-500", bgColor: "bg-amber-500/10", label: "requested to follow you" },
  mention: { icon: AtSign, color: "text-purple-500", bgColor: "bg-purple-500/10", label: "mentioned you" },
  story_view: { icon: Eye, color: "text-cyan-500", bgColor: "bg-cyan-500/10", label: "viewed your story" },
  live: { icon: Video, color: "text-pink-500", bgColor: "bg-pink-500/10", label: "started a live video" },
  tag: { icon: AtSign, color: "text-indigo-500", bgColor: "bg-indigo-500/10", label: "tagged you" }
};

// Notification Item Component
function NotificationItem({ notification, onMarkRead, onDelete, onClick }) {
  const typeConfig = NOTIFICATION_TYPES[notification.type] || NOTIFICATION_TYPES.like;
  const Icon = typeConfig.icon;
  
  const getTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    
    if (seconds < 60) return "now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`;
    return `${Math.floor(seconds / 604800)}w`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className={`flex items-start gap-3 p-4 border-b border-[var(--border)] ${
        !notification.is_read ? 'bg-[var(--primary)]/5' : ''
      }`}
      onClick={onClick}
    >
      {/* Avatar with type icon overlay */}
      <div className="relative">
        <Avatar className="w-12 h-12">
          <AvatarImage src={notification.actor_avatar ? `${API_URL}${notification.actor_avatar}` : undefined} />
          <AvatarFallback className="bg-gradient-to-br from-[var(--primary)] to-[var(--accent-purple)] text-white">
            {notification.actor_username?.[0]?.toUpperCase() || "?"}
          </AvatarFallback>
        </Avatar>
        <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full ${typeConfig.bgColor} flex items-center justify-center`}>
          <Icon className={`w-3 h-3 ${typeConfig.color}`} />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm">
          <span className="font-semibold">{notification.actor_username}</span>
          {" "}
          <span className="text-[var(--text-secondary)]">{typeConfig.label}</span>
          {notification.content && (
            <span className="text-[var(--text-muted)]">: "{notification.content}"</span>
          )}
        </p>
        <p className="text-xs text-[var(--text-muted)] mt-1">
          {getTimeAgo(notification.created_at)}
        </p>
      </div>

      {/* Preview Image */}
      {notification.target_preview && notification.target_preview.startsWith("/") && (
        <div className="w-12 h-12 rounded-lg overflow-hidden bg-[var(--muted)] flex-shrink-0">
          <img
            src={`${API_URL}${notification.target_preview}`}
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Unread indicator */}
      {!notification.is_read && (
        <div className="w-2 h-2 rounded-full bg-[var(--primary)] flex-shrink-0 mt-2" />
      )}
    </motion.div>
  );
}

export default function Activity() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const { isDark } = useSettings();
  
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState("all"); // all, unread

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    if (!token) return;
    
    try {
      const response = await fetch(
        `${API_URL}/api/notifications?token=${token}&unread_only=${filter === "unread"}`
      );
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unread_count || 0);
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      setLoading(false);
    }
  }, [token, filter]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Mark all as read
  const handleMarkAllRead = async () => {
    haptic.medium();
    try {
      await fetch(`${API_URL}/api/notifications/read-all?token=${token}`, { method: "POST" });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
      toast.success("All notifications marked as read");
    } catch (error) {
      toast.error("Failed to mark notifications as read");
    }
  };

  // Clear all notifications
  const handleClearAll = async () => {
    if (!confirm("Clear all notifications?")) return;
    
    haptic.medium();
    try {
      await fetch(`${API_URL}/api/notifications/clear-all?token=${token}`, { method: "DELETE" });
      setNotifications([]);
      setUnreadCount(0);
      toast.success("All notifications cleared");
    } catch (error) {
      toast.error("Failed to clear notifications");
    }
  };

  // Handle notification click
  const handleNotificationClick = async (notification) => {
    haptic.light();
    
    // Mark as read
    if (!notification.is_read) {
      try {
        await fetch(`${API_URL}/api/notifications/${notification.id}/read?token=${token}`, { method: "POST" });
        setNotifications(prev => prev.map(n => 
          n.id === notification.id ? { ...n, is_read: true } : n
        ));
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch (error) {
        console.error("Failed to mark as read:", error);
      }
    }
    
    // Navigate based on type
    if (notification.target_id) {
      if (notification.target_type === "post") {
        // Navigate to post (could implement post detail view)
        navigate("/");
      } else if (notification.target_type === "story") {
        navigate("/");
      }
    } else if (notification.type === "follow" || notification.type === "follow_request") {
      // Navigate to user profile
      navigate(`/profile/${notification.actor_id}`);
    }
  };

  return (
    <div 
      className="min-h-screen pb-20"
      style={{ background: 'var(--background)' }}
      data-theme={isDark ? 'dark' : 'light'}
    >
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[var(--background)] border-b border-[var(--border)] safe-top">
        <div className="flex items-center justify-between p-4">
          <h1 className="text-xl font-bold font-['Syne']">Activity</h1>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllRead}
                className="text-[var(--primary)]"
              >
                <Check className="w-4 h-4 mr-1" />
                Read all
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClearAll}
              className="text-[var(--text-muted)]"
            >
              <Trash2 className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex px-4 pb-3 gap-2">
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === "all"
                ? 'bg-[var(--text-primary)] text-[var(--background)]'
                : 'bg-[var(--muted)] text-[var(--text-secondary)]'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter("unread")}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-1 ${
              filter === "unread"
                ? 'bg-[var(--text-primary)] text-[var(--background)]'
                : 'bg-[var(--muted)] text-[var(--text-secondary)]'
            }`}
          >
            Unread
            {unreadCount > 0 && (
              <span className="bg-[var(--primary)] text-white text-xs px-1.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Notifications List */}
      <main>
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <div className="w-20 h-20 rounded-full bg-[var(--muted)] flex items-center justify-center mb-4">
              <Bell className="w-10 h-10 text-[var(--text-muted)]" />
            </div>
            <h3 className="text-lg font-medium mb-2">No notifications</h3>
            <p className="text-[var(--text-muted)] text-sm">
              {filter === "unread" 
                ? "You're all caught up!"
                : "When someone interacts with you, you'll see it here"
              }
            </p>
          </div>
        ) : (
          <AnimatePresence>
            {notifications.map(notification => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onClick={() => handleNotificationClick(notification)}
              />
            ))}
          </AnimatePresence>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
