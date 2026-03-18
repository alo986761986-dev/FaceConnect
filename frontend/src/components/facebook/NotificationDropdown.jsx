import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { 
  Bell, Settings, Heart, MessageCircle, UserPlus, 
  AtSign, Share2, Video, Radio, X, Check, CheckCheck
} from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/context/AuthContext";
import { NotificationSkeleton } from "./LoadingSkeleton";
import { formatDistanceToNow } from "date-fns";

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Notification type icons
const NOTIFICATION_ICONS = {
  like: { icon: Heart, color: "text-red-500", bg: "bg-red-100 dark:bg-red-900/30" },
  comment: { icon: MessageCircle, color: "text-blue-500", bg: "bg-blue-100 dark:bg-blue-900/30" },
  follow: { icon: UserPlus, color: "text-green-500", bg: "bg-green-100 dark:bg-green-900/30" },
  mention: { icon: AtSign, color: "text-purple-500", bg: "bg-purple-100 dark:bg-purple-900/30" },
  share: { icon: Share2, color: "text-orange-500", bg: "bg-orange-100 dark:bg-orange-900/30" },
  live: { icon: Radio, color: "text-pink-500", bg: "bg-pink-100 dark:bg-pink-900/30" },
  video: { icon: Video, color: "text-cyan-500", bg: "bg-cyan-100 dark:bg-cyan-900/30" },
  default: { icon: Bell, color: "text-gray-500", bg: "bg-gray-100 dark:bg-gray-700" }
};

function NotificationItem({ notification, onRead, onNavigate }) {
  const { icon: Icon, color, bg } = NOTIFICATION_ICONS[notification.type] || NOTIFICATION_ICONS.default;
  const isRead = notification.read;

  const handleClick = () => {
    if (!isRead) {
      onRead(notification.id);
    }
    onNavigate(notification);
  };

  return (
    <motion.button
      whileHover={{ backgroundColor: "rgba(0,0,0,0.03)" }}
      onClick={handleClick}
      className={`w-full flex items-start gap-3 p-3 text-left transition-colors ${
        !isRead ? "bg-blue-50/50 dark:bg-blue-900/10" : ""
      }`}
    >
      {/* User Avatar with notification icon overlay */}
      <div className="relative flex-shrink-0">
        <Avatar className="w-12 h-12">
          <AvatarImage 
            src={notification.from_user?.avatar ? `${API_URL}${notification.from_user.avatar}` : undefined}
          />
          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
            {notification.from_user?.username?.[0]?.toUpperCase() || "?"}
          </AvatarFallback>
        </Avatar>
        <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full ${bg} flex items-center justify-center`}>
          <Icon className={`w-3.5 h-3.5 ${color}`} />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm ${!isRead ? "font-medium" : ""} text-gray-900 dark:text-white`}>
          <span className="font-semibold">{notification.from_user?.username}</span>
          {" "}
          {notification.message || getNotificationMessage(notification)}
        </p>
        <p className={`text-xs mt-0.5 ${!isRead ? "text-blue-500" : "text-gray-500 dark:text-gray-400"}`}>
          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
        </p>
      </div>

      {/* Preview image/unread indicator */}
      <div className="flex-shrink-0 flex items-center gap-2">
        {notification.preview_image && (
          <img 
            src={`${API_URL}${notification.preview_image}`}
            alt=""
            className="w-12 h-12 rounded-lg object-cover"
          />
        )}
        {!isRead && (
          <div className="w-3 h-3 bg-blue-500 rounded-full" />
        )}
      </div>
    </motion.button>
  );
}

function getNotificationMessage(notification) {
  switch (notification.type) {
    case "like": return "liked your post";
    case "comment": return "commented on your post";
    case "follow": return "started following you";
    case "mention": return "mentioned you in a comment";
    case "share": return "shared your post";
    case "live": return "started a live video";
    case "video": return "posted a new video";
    default: return notification.message || "sent you a notification";
  }
}

export default function NotificationDropdown() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState("all"); // all, unread
  const dropdownRef = useRef(null);

  const fetchNotifications = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/notifications?token=${token}`);
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || data || []);
        setUnreadCount(data.unread_count || data.filter(n => !n.read).length || 0);
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchNotifications();
    // Poll for new notifications
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const markAsRead = async (notificationId) => {
    try {
      await fetch(`${API_URL}/api/notifications/${notificationId}/read?token=${token}`, {
        method: "POST"
      });
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Failed to mark as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch(`${API_URL}/api/notifications/read-all?token=${token}`, {
        method: "POST"
      });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    }
  };

  const handleNavigate = (notification) => {
    setIsOpen(false);
    if (notification.post_id) {
      navigate(`/post/${notification.post_id}`);
    } else if (notification.from_user?.id) {
      navigate(`/profile/${notification.from_user.id}`);
    }
  };

  const filteredNotifications = filter === "unread" 
    ? notifications.filter(n => !n.read)
    : notifications;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2.5 rounded-full transition-colors ${
          isOpen 
            ? "bg-blue-100 dark:bg-blue-900/30 text-blue-500" 
            : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
        }`}
      >
        <Bell className="w-5 h-5" />
        
        {/* Badge */}
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center px-1"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-[360px] bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Notifications</h2>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-sm text-blue-500 hover:text-blue-600 font-medium"
                  >
                    Mark all read
                  </button>
                )}
                <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
                  <Settings className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex border-b border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setFilter("all")}
                className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                  filter === "all"
                    ? "text-blue-500 border-b-2 border-blue-500"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilter("unread")}
                className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                  filter === "unread"
                    ? "text-blue-500 border-b-2 border-blue-500"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                }`}
              >
                Unread
              </button>
            </div>

            {/* Notifications List */}
            <div className="max-h-[400px] overflow-y-auto">
              {loading ? (
                <div className="p-2">
                  {[...Array(4)].map((_, i) => (
                    <NotificationSkeleton key={i} />
                  ))}
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className="p-8 text-center">
                  <Bell className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-500 dark:text-gray-400">
                    {filter === "unread" ? "No unread notifications" : "No notifications yet"}
                  </p>
                </div>
              ) : (
                <div>
                  {/* Today */}
                  <div className="px-4 py-2 text-sm font-semibold text-gray-500 dark:text-gray-400">
                    Earlier
                  </div>
                  {filteredNotifications.map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onRead={markAsRead}
                      onNavigate={handleNavigate}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => {
                  navigate("/notifications");
                  setIsOpen(false);
                }}
                className="w-full py-2 text-sm font-medium text-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
              >
                See all notifications
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
