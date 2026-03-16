import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { 
  ArrowLeft, Globe, Moon, Sun, Bell, Volume2, 
  Users, MessageCircle, Heart, AtSign, RefreshCw,
  Download, ChevronRight, Check, Smartphone, Palette,
  Play, UserPlus, Tag, BellRing, VolumeX, Shield
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { haptic } from "@/utils/mobile";
import BottomNav from "@/components/BottomNav";
import PermissionsManager from "@/components/PermissionsManager";
import { 
  isPushSupported, 
  getPermissionStatus, 
  requestPermission, 
  subscribeToPush, 
  unsubscribeFromPush,
  isSubscribed 
} from "@/utils/pushNotifications";

// All world languages
const LANGUAGES = [
  { code: "en", name: "English", native: "English" },
  { code: "es", name: "Spanish", native: "Español" },
  { code: "fr", name: "French", native: "Français" },
  { code: "de", name: "German", native: "Deutsch" },
  { code: "it", name: "Italian", native: "Italiano" },
  { code: "pt", name: "Portuguese", native: "Português" },
  { code: "ru", name: "Russian", native: "Русский" },
  { code: "zh", name: "Chinese", native: "中文" },
  { code: "ja", name: "Japanese", native: "日本語" },
  { code: "ko", name: "Korean", native: "한국어" },
  { code: "ar", name: "Arabic", native: "العربية" },
  { code: "hi", name: "Hindi", native: "हिन्दी" },
  { code: "bn", name: "Bengali", native: "বাংলা" },
  { code: "pa", name: "Punjabi", native: "ਪੰਜਾਬੀ" },
  { code: "te", name: "Telugu", native: "తెలుగు" },
  { code: "ta", name: "Tamil", native: "தமிழ்" },
  { code: "mr", name: "Marathi", native: "मराठी" },
  { code: "gu", name: "Gujarati", native: "ગુજરાતી" },
  { code: "kn", name: "Kannada", native: "ಕನ್ನಡ" },
  { code: "ml", name: "Malayalam", native: "മലയാളം" },
  { code: "th", name: "Thai", native: "ไทย" },
  { code: "vi", name: "Vietnamese", native: "Tiếng Việt" },
  { code: "id", name: "Indonesian", native: "Bahasa Indonesia" },
  { code: "ms", name: "Malay", native: "Bahasa Melayu" },
  { code: "fil", name: "Filipino", native: "Filipino" },
  { code: "tr", name: "Turkish", native: "Türkçe" },
  { code: "pl", name: "Polish", native: "Polski" },
  { code: "uk", name: "Ukrainian", native: "Українська" },
  { code: "nl", name: "Dutch", native: "Nederlands" },
  { code: "el", name: "Greek", native: "Ελληνικά" },
  { code: "cs", name: "Czech", native: "Čeština" },
  { code: "sv", name: "Swedish", native: "Svenska" },
  { code: "da", name: "Danish", native: "Dansk" },
  { code: "fi", name: "Finnish", native: "Suomi" },
  { code: "no", name: "Norwegian", native: "Norsk" },
  { code: "hu", name: "Hungarian", native: "Magyar" },
  { code: "ro", name: "Romanian", native: "Română" },
  { code: "sk", name: "Slovak", native: "Slovenčina" },
  { code: "bg", name: "Bulgarian", native: "Български" },
  { code: "hr", name: "Croatian", native: "Hrvatski" },
  { code: "sr", name: "Serbian", native: "Српски" },
  { code: "sl", name: "Slovenian", native: "Slovenščina" },
  { code: "lt", name: "Lithuanian", native: "Lietuvių" },
  { code: "lv", name: "Latvian", native: "Latviešu" },
  { code: "et", name: "Estonian", native: "Eesti" },
  { code: "he", name: "Hebrew", native: "עברית" },
  { code: "fa", name: "Persian", native: "فارسی" },
  { code: "ur", name: "Urdu", native: "اردو" },
  { code: "sw", name: "Swahili", native: "Kiswahili" },
  { code: "am", name: "Amharic", native: "አማርኛ" },
  { code: "yo", name: "Yoruba", native: "Yorùbá" },
  { code: "ig", name: "Igbo", native: "Igbo" },
  { code: "ha", name: "Hausa", native: "Hausa" },
  { code: "zu", name: "Zulu", native: "isiZulu" },
  { code: "xh", name: "Xhosa", native: "isiXhosa" },
  { code: "af", name: "Afrikaans", native: "Afrikaans" },
  { code: "ne", name: "Nepali", native: "नेपाली" },
  { code: "si", name: "Sinhala", native: "සිංහල" },
  { code: "my", name: "Burmese", native: "မြန်မာ" },
  { code: "km", name: "Khmer", native: "ខ្មែរ" },
  { code: "lo", name: "Lao", native: "ລາວ" },
  { code: "mn", name: "Mongolian", native: "Монгол" },
  { code: "ka", name: "Georgian", native: "ქართული" },
  { code: "hy", name: "Armenian", native: "Հայերdelays" },
  { code: "az", name: "Azerbaijani", native: "Azərbaycan" },
  { code: "kk", name: "Kazakh", native: "Қазақ" },
  { code: "uz", name: "Uzbek", native: "Oʻzbek" },
  { code: "tg", name: "Tajik", native: "Тоҷикӣ" },
  { code: "ky", name: "Kyrgyz", native: "Кыргызча" },
  { code: "tk", name: "Turkmen", native: "Türkmen" },
  { code: "ps", name: "Pashto", native: "پښتو" },
  { code: "ku", name: "Kurdish", native: "Kurdî" },
  { code: "sq", name: "Albanian", native: "Shqip" },
  { code: "mk", name: "Macedonian", native: "Македонски" },
  { code: "bs", name: "Bosnian", native: "Bosanski" },
  { code: "mt", name: "Maltese", native: "Malti" },
  { code: "is", name: "Icelandic", native: "Íslenska" },
  { code: "ga", name: "Irish", native: "Gaeilge" },
  { code: "cy", name: "Welsh", native: "Cymraeg" },
  { code: "gd", name: "Scottish Gaelic", native: "Gàidhlig" },
  { code: "eu", name: "Basque", native: "Euskara" },
  { code: "ca", name: "Catalan", native: "Català" },
  { code: "gl", name: "Galician", native: "Galego" },
  { code: "lb", name: "Luxembourgish", native: "Lëtzebuergesch" },
  { code: "eo", name: "Esperanto", native: "Esperanto" },
  { code: "la", name: "Latin", native: "Latina" },
];

// Notification sound options
const NOTIFICATION_SOUNDS = [
  { id: "default", name: "Default" },
  { id: "chime", name: "Chime" },
  { id: "bell", name: "Bell" },
  { id: "pop", name: "Pop" },
  { id: "ding", name: "Ding" },
  { id: "swoosh", name: "Swoosh" },
  { id: "bubble", name: "Bubble" },
  { id: "none", name: "None (Silent)" },
];

const APP_VERSION = "2.1.0";

export default function Settings() {
  const navigate = useNavigate();
  const { user, token, logout } = useAuth();
  
  // Settings state
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem("app_settings");
    return saved ? JSON.parse(saved) : {
      language: "en",
      theme: "dark",
      // Notification settings
      notifications: {
        enabled: true,
        comments: true,
        reels: true,
        messages: true,
        friendRequests: true,
        tags: true,
        friendUpdates: true,
        sound: "default",
        messageSound: "default",
        vibration: true,
        volume: 80,
      }
    };
  });

  const [showLanguageDialog, setShowLanguageDialog] = useState(false);
  const [showPermissionsDialog, setShowPermissionsDialog] = useState(false);
  const [checkingUpdates, setCheckingUpdates] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(null);
  const [permissionStatus, setPermissionStatus] = useState("default");
  const [isSubscribedToPush, setIsSubscribedToPush] = useState(false);
  const [requestingPermission, setRequestingPermission] = useState(false);

  // Check permission status on mount
  useEffect(() => {
    const checkStatus = async () => {
      setPermissionStatus(getPermissionStatus());
      const subscribed = await isSubscribed();
      setIsSubscribedToPush(subscribed);
    };
    checkStatus();
  }, []);

  // Save settings when changed
  useEffect(() => {
    localStorage.setItem("app_settings", JSON.stringify(settings));
    
    // Apply theme
    if (settings.theme === "light") {
      document.documentElement.classList.add("light-theme");
      document.documentElement.classList.remove("dark-theme");
    } else {
      document.documentElement.classList.add("dark-theme");
      document.documentElement.classList.remove("light-theme");
    }
  }, [settings]);

  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    haptic.light();
  };

  const updateNotificationSetting = (key, value) => {
    setSettings(prev => ({
      ...prev,
      notifications: { ...prev.notifications, [key]: value }
    }));
    haptic.light();
  };

  // Request notification permission and subscribe to push
  const handleEnableAllNotifications = async () => {
    setRequestingPermission(true);
    haptic.medium();

    try {
      // Check if push is supported
      if (!isPushSupported()) {
        toast.error("Push notifications are not supported on this device");
        setRequestingPermission(false);
        return;
      }

      // Request permission
      const { granted, permission } = await requestPermission();
      setPermissionStatus(permission);

      if (!granted) {
        toast.error("Notification permission denied. Please enable in browser settings.");
        setRequestingPermission(false);
        return;
      }

      // Subscribe to push notifications
      if (token) {
        await subscribeToPush(token);
        setIsSubscribedToPush(true);
      }

      // Enable all notification settings
      setSettings(prev => ({
        ...prev,
        notifications: {
          ...prev.notifications,
          enabled: true,
          comments: true,
          reels: true,
          messages: true,
          friendRequests: true,
          tags: true,
          friendUpdates: true,
        }
      }));

      haptic.success();
      toast.success("All notifications enabled!");
    } catch (error) {
      console.error("Failed to enable notifications:", error);
      toast.error("Failed to enable notifications. Please try again.");
    } finally {
      setRequestingPermission(false);
    }
  };

  // Handle master notification toggle
  const handleMasterNotificationToggle = async (enabled) => {
    haptic.light();

    if (enabled) {
      // Request permission when enabling
      if (permissionStatus !== "granted") {
        await handleEnableAllNotifications();
        return;
      }

      // If already granted, just enable settings
      setSettings(prev => ({
        ...prev,
        notifications: { ...prev.notifications, enabled: true }
      }));

      // Subscribe to push if not already
      if (!isSubscribedToPush && token) {
        try {
          await subscribeToPush(token);
          setIsSubscribedToPush(true);
        } catch (error) {
          console.error("Failed to subscribe:", error);
        }
      }
    } else {
      // Disable notifications
      setSettings(prev => ({
        ...prev,
        notifications: { ...prev.notifications, enabled: false }
      }));

      // Optionally unsubscribe from push
      if (token) {
        try {
          await unsubscribeFromPush(token);
          setIsSubscribedToPush(false);
        } catch (error) {
          console.error("Failed to unsubscribe:", error);
        }
      }
    }
  };

  const handleCheckUpdates = async () => {
    setCheckingUpdates(true);
    haptic.medium();
    
    // Simulate update check
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Randomly show update or not for demo
    const hasUpdate = Math.random() > 0.5;
    setUpdateAvailable(hasUpdate ? { version: "2.2.0", size: "15.2 MB" } : null);
    setCheckingUpdates(false);
    
    if (!hasUpdate) {
      toast.success("You're on the latest version!");
    }
  };

  const handleDownloadUpdate = () => {
    haptic.success();
    toast.success("Update will be installed on next restart");
    setUpdateAvailable(null);
  };

  const getLanguageName = (code) => {
    const lang = LANGUAGES.find(l => l.code === code);
    return lang ? `${lang.name} (${lang.native})` : code;
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-[#0A0A0A]/95 backdrop-blur-lg border-b border-white/5">
        <div className="flex items-center gap-4 px-4 py-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="text-gray-400 hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold text-white font-['Outfit']">Settings</h1>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Language & Region */}
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider px-1">
            Language & Region
          </h2>
          <button
            data-testid="language-selector"
            onClick={() => setShowLanguageDialog(true)}
            className="w-full p-4 rounded-xl bg-[#121212] border border-white/5 flex items-center justify-between hover:border-white/10 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#00F0FF]/20 flex items-center justify-center">
                <Globe className="w-5 h-5 text-[#00F0FF]" />
              </div>
              <div className="text-left">
                <p className="text-white font-medium">Language</p>
                <p className="text-sm text-gray-500">{getLanguageName(settings.language)}</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-500" />
          </button>
        </section>

        {/* Permissions */}
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider px-1">
            Permissions
          </h2>
          <button
            data-testid="permissions-manager"
            onClick={() => setShowPermissionsDialog(true)}
            className="w-full p-4 rounded-xl bg-[#121212] border border-white/5 flex items-center justify-between hover:border-white/10 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                <Shield className="w-5 h-5 text-green-500" />
              </div>
              <div className="text-left">
                <p className="text-white font-medium">App Permissions</p>
                <p className="text-sm text-gray-500">Camera, location, contacts & more</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-500" />
          </button>
        </section>

        {/* Appearance */}
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider px-1">
            Appearance
          </h2>
          <div className="p-4 rounded-xl bg-[#121212] border border-white/5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#7000FF]/20 flex items-center justify-center">
                  <Palette className="w-5 h-5 text-[#7000FF]" />
                </div>
                <div>
                  <p className="text-white font-medium">Theme</p>
                  <p className="text-sm text-gray-500">Choose your preferred theme</p>
                </div>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                data-testid="theme-dark"
                onClick={() => updateSetting("theme", "dark")}
                className={`flex-1 p-4 rounded-xl border-2 transition-colors ${
                  settings.theme === "dark" 
                    ? "border-[#00F0FF] bg-[#00F0FF]/10" 
                    : "border-white/10 bg-[#1A1A1A]"
                }`}
              >
                <Moon className={`w-6 h-6 mx-auto mb-2 ${
                  settings.theme === "dark" ? "text-[#00F0FF]" : "text-gray-500"
                }`} />
                <p className={`text-sm font-medium ${
                  settings.theme === "dark" ? "text-white" : "text-gray-500"
                }`}>Dark</p>
              </button>
              
              <button
                data-testid="theme-light"
                onClick={() => updateSetting("theme", "light")}
                className={`flex-1 p-4 rounded-xl border-2 transition-colors ${
                  settings.theme === "light" 
                    ? "border-[#00F0FF] bg-[#00F0FF]/10" 
                    : "border-white/10 bg-[#1A1A1A]"
                }`}
              >
                <Sun className={`w-6 h-6 mx-auto mb-2 ${
                  settings.theme === "light" ? "text-[#00F0FF]" : "text-gray-500"
                }`} />
                <p className={`text-sm font-medium ${
                  settings.theme === "light" ? "text-white" : "text-gray-500"
                }`}>Light</p>
              </button>
            </div>
          </div>
        </section>

        {/* Notifications */}
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider px-1">
            Notifications
          </h2>
          
          {/* Permission Status Banner */}
          {permissionStatus !== "granted" && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-xl bg-gradient-to-r from-[#00F0FF]/10 to-[#7000FF]/10 border border-[#00F0FF]/30"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-[#00F0FF]/20 flex items-center justify-center">
                  <BellRing className="w-5 h-5 text-[#00F0FF]" />
                </div>
                <div>
                  <p className="text-white font-medium">Enable Notifications</p>
                  <p className="text-sm text-gray-400">
                    {permissionStatus === "denied" 
                      ? "Notifications blocked. Enable in browser settings."
                      : "Allow notifications to stay updated"}
                  </p>
                </div>
              </div>
              <Button
                data-testid="allow-all-notifications"
                onClick={handleEnableAllNotifications}
                disabled={requestingPermission || permissionStatus === "denied"}
                className="w-full bg-gradient-to-r from-[#00F0FF] to-[#7000FF] hover:opacity-90 text-white"
              >
                {requestingPermission ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Enabling...
                  </>
                ) : (
                  <>
                    <Bell className="w-4 h-4 mr-2" />
                    Allow All Notifications
                  </>
                )}
              </Button>
            </motion.div>
          )}
          
          <div className="rounded-xl bg-[#121212] border border-white/5 divide-y divide-white/5">
            {/* Master Toggle */}
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                  <Bell className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-white font-medium">Push Notifications</p>
                  <p className="text-sm text-gray-500">
                    {permissionStatus === "granted" && isSubscribedToPush 
                      ? "Subscribed to push notifications" 
                      : "Enable all notifications"}
                  </p>
                </div>
              </div>
              <Switch
                data-testid="notifications-master"
                checked={settings.notifications.enabled}
                onCheckedChange={handleMasterNotificationToggle}
                disabled={requestingPermission}
              />
            </div>

            {settings.notifications.enabled && (
              <>
                {/* Comments */}
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <MessageCircle className="w-5 h-5 text-gray-500" />
                    <p className="text-white">Comments</p>
                  </div>
                  <Switch
                    data-testid="notifications-comments"
                    checked={settings.notifications.comments}
                    onCheckedChange={(val) => updateNotificationSetting("comments", val)}
                  />
                </div>

                {/* Reels */}
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Play className="w-5 h-5 text-gray-500" />
                    <p className="text-white">Reels</p>
                  </div>
                  <Switch
                    data-testid="notifications-reels"
                    checked={settings.notifications.reels}
                    onCheckedChange={(val) => updateNotificationSetting("reels", val)}
                  />
                </div>

                {/* Messages */}
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <MessageCircle className="w-5 h-5 text-gray-500" />
                    <p className="text-white">Messages</p>
                  </div>
                  <Switch
                    data-testid="notifications-messages"
                    checked={settings.notifications.messages}
                    onCheckedChange={(val) => updateNotificationSetting("messages", val)}
                  />
                </div>

                {/* Friend Requests */}
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <UserPlus className="w-5 h-5 text-gray-500" />
                    <p className="text-white">Friend Requests</p>
                  </div>
                  <Switch
                    data-testid="notifications-friend-requests"
                    checked={settings.notifications.friendRequests}
                    onCheckedChange={(val) => updateNotificationSetting("friendRequests", val)}
                  />
                </div>

                {/* Tags */}
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Tag className="w-5 h-5 text-gray-500" />
                    <p className="text-white">Tags & Mentions</p>
                  </div>
                  <Switch
                    data-testid="notifications-tags"
                    checked={settings.notifications.tags}
                    onCheckedChange={(val) => updateNotificationSetting("tags", val)}
                  />
                </div>

                {/* Friend Updates */}
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-gray-500" />
                    <p className="text-white">Friend Updates</p>
                  </div>
                  <Switch
                    data-testid="notifications-friend-updates"
                    checked={settings.notifications.friendUpdates}
                    onCheckedChange={(val) => updateNotificationSetting("friendUpdates", val)}
                  />
                </div>
              </>
            )}
          </div>
        </section>

        {/* Sound Settings */}
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider px-1">
            Sounds
          </h2>
          
          <div className="rounded-xl bg-[#121212] border border-white/5 divide-y divide-white/5">
            {/* Default Notification Sound */}
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <BellRing className="w-5 h-5 text-gray-500" />
                  <p className="text-white">Notification Sound</p>
                </div>
              </div>
              <Select
                value={settings.notifications.sound}
                onValueChange={(val) => updateNotificationSetting("sound", val)}
              >
                <SelectTrigger data-testid="notification-sound-select" className="bg-[#1A1A1A] border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1A1A1A] border-white/10">
                  {NOTIFICATION_SOUNDS.map(sound => (
                    <SelectItem key={sound.id} value={sound.id} className="text-white">
                      {sound.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Message Sound */}
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Volume2 className="w-5 h-5 text-gray-500" />
                  <p className="text-white">Message Sound</p>
                </div>
              </div>
              <Select
                value={settings.notifications.messageSound}
                onValueChange={(val) => updateNotificationSetting("messageSound", val)}
              >
                <SelectTrigger data-testid="message-sound-select" className="bg-[#1A1A1A] border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1A1A1A] border-white/10">
                  {NOTIFICATION_SOUNDS.map(sound => (
                    <SelectItem key={sound.id} value={sound.id} className="text-white">
                      {sound.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Vibration */}
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Smartphone className="w-5 h-5 text-gray-500" />
                <p className="text-white">Vibration</p>
              </div>
              <Switch
                data-testid="vibration-toggle"
                checked={settings.notifications.vibration}
                onCheckedChange={(val) => updateNotificationSetting("vibration", val)}
              />
            </div>

            {/* Volume */}
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  {settings.notifications.volume === 0 ? (
                    <VolumeX className="w-5 h-5 text-gray-500" />
                  ) : (
                    <Volume2 className="w-5 h-5 text-gray-500" />
                  )}
                  <p className="text-white">Volume</p>
                </div>
                <span className="text-gray-500 text-sm">{settings.notifications.volume}%</span>
              </div>
              <Slider
                data-testid="volume-slider"
                value={[settings.notifications.volume]}
                onValueChange={([val]) => updateNotificationSetting("volume", val)}
                max={100}
                step={10}
                className="w-full"
              />
            </div>
          </div>
        </section>

        {/* App Updates */}
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider px-1">
            App Updates
          </h2>
          
          <div className="p-4 rounded-xl bg-[#121212] border border-white/5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <Download className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-white font-medium">Current Version</p>
                  <p className="text-sm text-gray-500">v{APP_VERSION}</p>
                </div>
              </div>
            </div>

            {updateAvailable ? (
              <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-green-400 font-medium">Update Available!</p>
                  <span className="text-xs text-gray-500">{updateAvailable.size}</span>
                </div>
                <p className="text-sm text-gray-400 mb-3">Version {updateAvailable.version} is ready to install</p>
                <Button
                  data-testid="download-update"
                  onClick={handleDownloadUpdate}
                  className="w-full bg-green-500 hover:bg-green-600"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download & Install
                </Button>
              </div>
            ) : (
              <Button
                data-testid="check-updates"
                onClick={handleCheckUpdates}
                disabled={checkingUpdates}
                variant="outline"
                className="w-full border-white/10 text-white hover:bg-white/5"
              >
                {checkingUpdates ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Checking...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Check for Updates
                  </>
                )}
              </Button>
            )}
          </div>
        </section>

        {/* About */}
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider px-1">
            About
          </h2>
          
          <div className="p-4 rounded-xl bg-[#121212] border border-white/5">
            <div className="flex items-center gap-4 mb-4">
              <img 
                src="/icons/icon-96x96.png" 
                alt="FaceConnect" 
                className="w-16 h-16 rounded-2xl"
              />
              <div>
                <h3 className="text-white font-bold text-lg">FaceConnect</h3>
                <p className="text-gray-500 text-sm">Version {APP_VERSION}</p>
              </div>
            </div>
            <p className="text-gray-400 text-sm">
              Facial Recognition Social Network Tracker. Connect, share, and discover.
            </p>
          </div>
        </section>
      </div>

      {/* Language Selection Dialog */}
      <Dialog open={showLanguageDialog} onOpenChange={setShowLanguageDialog}>
        <DialogContent className="bg-[#121212] border-white/10 text-white max-w-md max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="text-xl font-['Outfit']">Select Language</DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-1">
              {LANGUAGES.map(lang => (
                <button
                  key={lang.code}
                  onClick={() => {
                    updateSetting("language", lang.code);
                    setShowLanguageDialog(false);
                    toast.success(`Language changed to ${lang.name}`);
                  }}
                  className={`w-full p-3 rounded-lg flex items-center justify-between hover:bg-white/5 transition-colors ${
                    settings.language === lang.code ? "bg-[#00F0FF]/10" : ""
                  }`}
                >
                  <div>
                    <p className="text-white font-medium">{lang.name}</p>
                    <p className="text-sm text-gray-500">{lang.native}</p>
                  </div>
                  {settings.language === lang.code && (
                    <Check className="w-5 h-5 text-[#00F0FF]" />
                  )}
                </button>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Permissions Manager Dialog */}
      <PermissionsManager
        isOpen={showPermissionsDialog}
        onClose={setShowPermissionsDialog}
      />

      <BottomNav />
    </div>
  );
}
