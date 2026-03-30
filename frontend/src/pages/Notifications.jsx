/**
 * Facebook-style Notifications Page
 * Full notifications center matching Facebook Italian UI
 */
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Menu, Search, X, MoreHorizontal, Bell, Heart, MessageCircle,
  UserPlus, Shield, Camera, Video, Calendar, ShoppingBag, Users,
  Bookmark, Settings, Check, ChevronDown, Clock
} from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import BottomNav from "@/components/BottomNav";

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Notification types with Italian translations
const NOTIFICATION_TYPES = {
  dating_message: {
    icon: MessageCircle,
    color: 'bg-purple-500',
    template: (data) => `Il tuo match di ${data.matchType || 'Amicizia'}, **${data.userName}**, ti ha inviato un messaggio su Dating.`
  },
  dating_connection: {
    icon: Heart,
    color: 'bg-purple-500',
    template: (data) => `Tu, **${data.userName}** e **${data.otherUser}** ora siete in contatto come amici su Dating.`
  },
  dating_match: {
    icon: Heart,
    color: 'bg-purple-500',
    template: (data) => `Hai un nuovo match con **${data.userName}** su Dating!`
  },
  post_highlight: {
    icon: Bookmark,
    color: 'bg-green-500',
    template: (data) => `**${data.pageName}** ha messo in primo piano un post che devi vedere.`
  },
  access_approved: {
    icon: Shield,
    color: 'bg-blue-500',
    template: () => `Hai approvato un accesso.`
  },
  friend_request: {
    icon: UserPlus,
    color: 'bg-blue-500',
    template: (data) => `**${data.userName}** ti ha inviato una richiesta di amicizia.`
  },
  friend_accepted: {
    icon: UserPlus,
    color: 'bg-green-500',
    template: (data) => `**${data.userName}** ha accettato la tua richiesta di amicizia.`
  },
  like: {
    icon: Heart,
    color: 'bg-red-500',
    template: (data) => `A **${data.userName}** piace il tuo post.`
  },
  comment: {
    icon: MessageCircle,
    color: 'bg-blue-500',
    template: (data) => `**${data.userName}** ha commentato il tuo post.`
  },
  mention: {
    icon: MessageCircle,
    color: 'bg-purple-500',
    template: (data) => `**${data.userName}** ti ha menzionato in un commento.`
  },
  group_invite: {
    icon: Users,
    color: 'bg-blue-500',
    template: (data) => `**${data.userName}** ti ha invitato a unirti al gruppo "${data.groupName}".`
  },
  event_invite: {
    icon: Calendar,
    color: 'bg-orange-500',
    template: (data) => `**${data.userName}** ti ha invitato all'evento "${data.eventName}".`
  },
  live_video: {
    icon: Video,
    color: 'bg-red-500',
    template: (data) => `**${data.userName}** è in diretta ora.`
  },
  marketplace: {
    icon: ShoppingBag,
    color: 'bg-teal-500',
    template: (data) => `Il tuo articolo "${data.itemName}" ha ricevuto un messaggio.`
  },
  birthday: {
    icon: Calendar,
    color: 'bg-pink-500',
    template: (data) => `Oggi è il compleanno di **${data.userName}**! Fai gli auguri.`
  },
  memory: {
    icon: Clock,
    color: 'bg-blue-500',
    template: (data) => `Hai un ricordo di ${data.years} anni fa da guardare.`
  },
  story_reaction: {
    icon: Heart,
    color: 'bg-pink-500',
    template: (data) => `**${data.userName}** ha reagito alla tua storia.`
  },
  reel_like: {
    icon: Heart,
    color: 'bg-red-500',
    template: (data) => `A **${data.userName}** piace il tuo Reel.`
  }
};

// Sample notifications for demo
const SAMPLE_NOTIFICATIONS = [
  {
    id: '1',
    type: 'post_highlight',
    data: { pageName: 'Dentro La Notizia' },
    photo: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=100&h=100&fit=crop',
    isPage: true,
    pageColor: 'bg-green-600',
    read: false,
    createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000) // 3h ago
  },
  {
    id: '2',
    type: 'dating_message',
    data: { userName: 'Rosa', matchType: 'Amicizia' },
    photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
    read: false,
    createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000)
  },
  {
    id: '3',
    type: 'dating_connection',
    data: { userName: 'Rosa', otherUser: 'Incoronata' },
    photo: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=100&h=100&fit=crop',
    read: false,
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000)
  },
  {
    id: '4',
    type: 'dating_message',
    data: { userName: 'Elvira', matchType: 'Amicizia' },
    photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop',
    read: false,
    createdAt: new Date(Date.now() - 7 * 60 * 60 * 1000)
  },
  {
    id: '5',
    type: 'access_approved',
    data: {},
    photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop',
    read: true,
    createdAt: new Date(Date.now() - 7 * 60 * 60 * 1000)
  },
  // Previous day notifications
  {
    id: '6',
    type: 'dating_message',
    data: { userName: 'Elvira', matchType: 'Amicizia' },
    photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop',
    read: true,
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000)
  },
  {
    id: '7',
    type: 'dating_connection',
    data: { userName: 'Teresa', otherUser: 'Elvira' },
    photo: 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=100&h=100&fit=crop',
    read: true,
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000)
  },
  {
    id: '8',
    type: 'like',
    data: { userName: 'Marco Rossi' },
    photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop',
    read: true,
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
  },
  {
    id: '9',
    type: 'friend_request',
    data: { userName: 'Giulia Bianchi' },
    photo: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop',
    read: true,
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
  },
  {
    id: '10',
    type: 'birthday',
    data: { userName: 'Anna Verdi' },
    photo: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop',
    read: true,
    createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000)
  }
];

// Format time in Italian style
function formatTimeAgo(date) {
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  const diffWeeks = Math.floor(diffDays / 7);

  if (diffMins < 1) return 'adesso';
  if (diffMins < 60) return `${diffMins} min`;
  if (diffHours < 24) return `${diffHours} h`;
  if (diffDays === 1) return '1 g';
  if (diffDays < 7) return `${diffDays} g`;
  if (diffWeeks === 1) return '1 sett.';
  return `${diffWeeks} sett.`;
}

// Parse notification message with bold names
function parseNotificationMessage(template, data) {
  if (!template) return '';
  const message = typeof template === 'function' ? template(data) : template;
  
  // Split by ** markers for bold text
  const parts = message.split(/\*\*(.*?)\*\*/g);
  
  return parts.map((part, index) => {
    // Odd indices are the bold parts (between ** markers)
    if (index % 2 === 1) {
      return <strong key={index}>{part}</strong>;
    }
    return part;
  });
}

// Notification Item Component
function NotificationItem({ notification, onRead, onOptions }) {
  const notifConfig = NOTIFICATION_TYPES[notification.type] || NOTIFICATION_TYPES.like;
  const Icon = notifConfig.icon;
  
  const handleClick = () => {
    if (!notification.read) {
      onRead(notification.id);
    }
    // Navigate based on notification type
    toast.info('Apertura notifica...');
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className={`flex items-start gap-3 p-3 ${
        !notification.read ? 'bg-blue-50' : 'bg-white'
      }`}
      data-testid={`notification-${notification.id}`}
    >
      {/* Avatar with icon overlay */}
      <button 
        onClick={handleClick}
        className="relative flex-shrink-0"
      >
        <Avatar className="w-14 h-14">
          <AvatarImage src={notification.photo} />
          <AvatarFallback className="bg-gray-200 text-gray-600">
            {notification.data?.userName?.[0] || notification.data?.pageName?.[0] || '?'}
          </AvatarFallback>
        </Avatar>
        
        {/* Notification type icon */}
        <div className={`absolute -bottom-1 -right-1 w-7 h-7 rounded-full ${notifConfig.color} flex items-center justify-center border-2 border-white`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
      </button>

      {/* Content */}
      <button 
        onClick={handleClick}
        className="flex-1 text-left min-w-0"
      >
        <p className={`text-sm leading-snug ${!notification.read ? 'text-gray-900' : 'text-gray-700'}`}>
          {parseNotificationMessage(notifConfig.template, notification.data)}
        </p>
        <p className={`text-xs mt-1 ${!notification.read ? 'text-blue-500 font-medium' : 'text-gray-500'}`}>
          {formatTimeAgo(notification.createdAt)}
        </p>
      </button>

      {/* Options button */}
      <button 
        onClick={() => onOptions(notification)}
        className="p-2 -mr-2 text-gray-400 hover:text-gray-600"
        data-testid={`notification-options-${notification.id}`}
      >
        <MoreHorizontal className="w-5 h-5" />
      </button>
    </motion.div>
  );
}

// Notification Options Modal
function NotificationOptionsModal({ notification, isOpen, onClose, onAction }) {
  if (!isOpen) return null;

  const options = [
    { id: 'remove', label: 'Rimuovi questa notifica', icon: X },
    { id: 'mute', label: 'Disattiva notifiche di questo tipo', icon: Bell },
    { id: 'report', label: 'Segnala un problema', icon: Shield },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/50"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl p-4"
        onClick={e => e.stopPropagation()}
      >
        {options.map((option) => (
          <button
            key={option.id}
            onClick={() => {
              onAction(option.id, notification);
              onClose();
            }}
            className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 rounded-xl"
          >
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
              <option.icon className="w-5 h-5 text-gray-700" />
            </div>
            <span className="text-base text-gray-900">{option.label}</span>
          </button>
        ))}
        
        <button
          onClick={onClose}
          className="w-full mt-2 p-4 text-center text-blue-600 font-medium"
        >
          Annulla
        </button>
      </motion.div>
    </motion.div>
  );
}

// Main Notifications Page
export default function Notifications() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [showOptions, setShowOptions] = useState(false);
  const [showOlder, setShowOlder] = useState(false);

  // Fetch notifications from API
  useEffect(() => {
    const fetchNotifications = async () => {
      if (!token) return;
      
      try {
        const res = await fetch(`${API_URL}/api/notifications?token=${token}&limit=50`);
        if (res.ok) {
          const data = await res.json();
          // API returns { notifications: [...], unread_count: ... }
          const notificationsList = data.notifications || data;
          if (Array.isArray(notificationsList) && notificationsList.length > 0) {
            setNotifications(notificationsList.map(n => ({
              id: n.id,
              type: n.type || 'like',
              data: {
                userName: n.actor_display_name || n.actor_username || 'Utente',
                pageName: n.actor_display_name || n.actor_username,
              },
              photo: n.actor_avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop',
              read: n.is_read,
              createdAt: new Date(n.created_at)
            })));
          } else {
            // Use sample data as fallback if empty
            setNotifications(SAMPLE_NOTIFICATIONS);
          }
        } else {
          // Use sample data as fallback
          setNotifications(SAMPLE_NOTIFICATIONS);
        }
      } catch (error) {
        console.error('Error fetching notifications:', error);
        // Use sample data on error
        setNotifications(SAMPLE_NOTIFICATIONS);
      } finally {
        setLoading(false);
      }
    };
    
    fetchNotifications();
  }, [token]);

  // Group notifications by time
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const displayNotifications = notifications.length > 0 ? notifications : SAMPLE_NOTIFICATIONS;
  const todayNotifications = displayNotifications.filter(n => n.createdAt >= today);
  const previousNotifications = displayNotifications.filter(n => n.createdAt < today);

  // Mark notification as read
  const handleRead = async (id) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
    
    try {
      await fetch(`${API_URL}/api/notifications/${id}/read?token=${token}`, {
        method: 'POST'
      });
    } catch (error) {
      // Silent fail
    }
  };

  // Handle notification options
  const handleOptions = (notification) => {
    setSelectedNotification(notification);
    setShowOptions(true);
  };

  // Handle option action
  const handleOptionAction = async (action, notification) => {
    switch (action) {
      case 'remove':
        setNotifications(prev => prev.filter(n => n.id !== notification.id));
        try {
          await fetch(`${API_URL}/api/notifications/${notification.id}?token=${token}`, {
            method: 'DELETE'
          });
        } catch (error) {}
        toast.success('Notifica rimossa');
        break;
      case 'mute':
        try {
          await fetch(`${API_URL}/api/notifications/mute/${notification.type}?token=${token}`, {
            method: 'POST'
          });
        } catch (error) {}
        toast.success('Notifiche disattivate per questo tipo');
        break;
      case 'report':
        toast.info('Segnalazione inviata');
        break;
      default:
        break;
    }
  };

  // Mark all as read
  const markAllRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    try {
      await fetch(`${API_URL}/api/notifications/read-all?token=${token}`, {
        method: 'POST'
      });
    } catch (error) {}
    toast.success('Tutte le notifiche segnate come lette');
  };

  // Filter notifications by search
  const filteredNotifications = (notifs) => {
    if (!searchQuery) return notifs;
    return notifs.filter(n => {
      const message = NOTIFICATION_TYPES[n.type]?.template(n.data) || '';
      return message.toLowerCase().includes(searchQuery.toLowerCase());
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20" data-testid="notifications-page">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="flex items-center justify-between px-4 py-3">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 -ml-2"
            data-testid="notifications-menu-btn"
          >
            <Menu className="w-6 h-6 text-gray-700" />
          </button>
          
          {showSearch ? (
            <div className="flex-1 mx-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cerca nelle notifiche..."
                className="w-full px-4 py-2 bg-gray-100 rounded-full text-sm outline-none"
                autoFocus
              />
            </div>
          ) : (
            <h1 className="text-xl font-bold text-gray-900">Notifiche</h1>
          )}
          
          <button 
            onClick={() => {
              setShowSearch(!showSearch);
              if (showSearch) setSearchQuery('');
            }}
            className="p-2 -mr-2"
            data-testid="notifications-search-btn"
          >
            {showSearch ? (
              <X className="w-6 h-6 text-gray-700" />
            ) : (
              <Search className="w-6 h-6 text-gray-700" />
            )}
          </button>
        </div>
      </header>

      <ScrollArea className="h-[calc(100vh-140px)]">
        {/* Today Section */}
        {filteredNotifications(todayNotifications).length > 0 && (
          <section>
            <div className="flex items-center justify-between px-4 py-3 bg-white">
              <h2 className="font-bold text-base text-gray-900">Oggi</h2>
              <button 
                onClick={markAllRead}
                className="text-sm text-blue-600 font-medium"
              >
                Segna tutto come letto
              </button>
            </div>
            
            <div className="divide-y divide-gray-100">
              {filteredNotifications(todayNotifications).map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onRead={handleRead}
                  onOptions={handleOptions}
                />
              ))}
            </div>
          </section>
        )}

        {/* Previous Section */}
        {filteredNotifications(previousNotifications).length > 0 && (
          <section className="mt-2">
            <div className="px-4 py-3 bg-white">
              <h2 className="font-bold text-base text-gray-900">Precedenti</h2>
            </div>
            
            <div className="divide-y divide-gray-100">
              {filteredNotifications(previousNotifications)
                .slice(0, showOlder ? undefined : 3)
                .map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onRead={handleRead}
                    onOptions={handleOptions}
                  />
                ))}
            </div>
            
            {/* View Previous Button */}
            {!showOlder && filteredNotifications(previousNotifications).length > 3 && (
              <button
                onClick={() => setShowOlder(true)}
                className="w-full py-4 bg-gray-100 text-gray-700 font-medium text-center hover:bg-gray-200 transition-colors"
                data-testid="view-previous-btn"
              >
                Vedi notifiche precedenti
              </button>
            )}
          </section>
        )}

        {/* Empty State */}
        {notifications.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 px-6">
            <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <Bell className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Nessuna notifica
            </h3>
            <p className="text-gray-500 text-center">
              Quando riceverai notifiche, appariranno qui.
            </p>
          </div>
        )}

        {/* No Search Results */}
        {searchQuery && filteredNotifications([...todayNotifications, ...previousNotifications]).length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 px-6">
            <Search className="w-12 h-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Nessun risultato
            </h3>
            <p className="text-gray-500 text-center">
              Nessuna notifica corrisponde a "{searchQuery}"
            </p>
          </div>
        )}
      </ScrollArea>

      {/* Options Modal */}
      <AnimatePresence>
        {showOptions && (
          <NotificationOptionsModal
            notification={selectedNotification}
            isOpen={showOptions}
            onClose={() => {
              setShowOptions(false);
              setSelectedNotification(null);
            }}
            onAction={handleOptionAction}
          />
        )}
      </AnimatePresence>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
}
