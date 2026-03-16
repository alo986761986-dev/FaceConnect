import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { 
  ArrowLeft, Globe, Moon, Sun, Bell, Volume2, 
  Users, MessageCircle, Heart, AtSign, RefreshCw,
  Download, ChevronRight, Check, Smartphone, Palette,
  Play, UserPlus, Tag, BellRing, VolumeX, Shield, Search,
  PlayCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
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
import { useSettings } from "@/context/SettingsContext";
import { haptic } from "@/utils/mobile";
import BottomNav from "@/components/BottomNav";
import PermissionsManager from "@/components/PermissionsManager";
import { LANGUAGES } from "@/utils/i18n";
import { previewSound } from "@/utils/sounds";
import { 
  isPushSupported, 
  getPermissionStatus, 
  requestPermission, 
  subscribeToPush, 
  unsubscribeFromPush,
  isSubscribed 
} from "@/utils/pushNotifications";

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

const APP_VERSION = "2.3.0";

export default function Settings() {
  const navigate = useNavigate();
  const { user, token, logout } = useAuth();
  const { 
    settings, 
    setSettings, 
    updateSetting, 
    updateNotificationSetting,
    language,
    setLanguage,
    theme,
    setTheme,
    isDark,
    t,
    currentLanguage,
    languages
  } = useSettings();

  const [showLanguageDialog, setShowLanguageDialog] = useState(false);
  const [showPermissionsDialog, setShowPermissionsDialog] = useState(false);
  const [checkingUpdates, setCheckingUpdates] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(null);
  const [permissionStatus, setPermissionStatus] = useState("default");
  const [isSubscribedToPush, setIsSubscribedToPush] = useState(false);
  const [requestingPermission, setRequestingPermission] = useState(false);
  const [languageSearch, setLanguageSearch] = useState("");

  // Check permission status on mount
  useEffect(() => {
    const checkStatus = async () => {
      setPermissionStatus(getPermissionStatus());
      const subscribed = await isSubscribed();
      setIsSubscribedToPush(subscribed);
    };
    checkStatus();
  }, []);

  // Filter languages based on search
  const filteredLanguages = languages.filter(lang => 
    lang.name.toLowerCase().includes(languageSearch.toLowerCase()) ||
    lang.native.toLowerCase().includes(languageSearch.toLowerCase()) ||
    lang.code.toLowerCase().includes(languageSearch.toLowerCase())
  );

  const handleUpdateNotificationSetting = (key, value) => {
    updateNotificationSetting(key, value);
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
    setUpdateAvailable(hasUpdate ? { version: "2.3.0", size: "15.2 MB" } : null);
    setCheckingUpdates(false);
    
    if (!hasUpdate) {
      toast.success(t("latestVersion"));
    }
  };

  const handleDownloadUpdate = () => {
    haptic.success();
    toast.success("Update will be installed on next restart");
    setUpdateAvailable(null);
  };

  return (
    <div className={`min-h-screen pb-24 transition-colors duration-300 ${isDark ? 'bg-[#0A0A0A]' : 'bg-gray-50'}`}>
      {/* Header */}
      <div className={`sticky top-0 z-40 backdrop-blur-lg border-b ${isDark ? 'bg-[#0A0A0A]/95 border-white/5' : 'bg-white/95 border-gray-200'}`}>
        <div className="flex items-center gap-4 px-4 py-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className={isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className={`text-xl font-bold font-['Outfit'] ${isDark ? 'text-white' : 'text-gray-900'}`}>{t("settings")}</h1>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Language & Region */}
        <section className="space-y-3">
          <h2 className={`text-sm font-medium uppercase tracking-wider px-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            {t("languageRegion")}
          </h2>
          <button
            data-testid="language-selector"
            onClick={() => setShowLanguageDialog(true)}
            className={`w-full p-4 rounded-xl border flex items-center justify-between transition-colors ${
              isDark 
                ? 'bg-[#121212] border-white/5 hover:border-white/10' 
                : 'bg-white border-gray-200 hover:border-gray-300 shadow-sm'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#00F0FF]/20 flex items-center justify-center">
                <Globe className="w-5 h-5 text-[#00F0FF]" />
              </div>
              <div className="text-left">
                <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{t("language")}</p>
                <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>{currentLanguage.native} ({currentLanguage.name})</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-500" />
          </button>
        </section>

        {/* Permissions */}
        <section className="space-y-3">
          <h2 className={`text-sm font-medium uppercase tracking-wider px-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            {t("permissions")}
          </h2>
          <button
            data-testid="permissions-manager"
            onClick={() => setShowPermissionsDialog(true)}
            className={`w-full p-4 rounded-xl border flex items-center justify-between transition-colors ${
              isDark 
                ? 'bg-[#121212] border-white/5 hover:border-white/10' 
                : 'bg-white border-gray-200 hover:border-gray-300 shadow-sm'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                <Shield className="w-5 h-5 text-green-500" />
              </div>
              <div className="text-left">
                <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{t("appPermissions")}</p>
                <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>{t("cameraLocationMore")}</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-500" />
          </button>
        </section>

        {/* Appearance */}
        <section className="space-y-3">
          <h2 className={`text-sm font-medium uppercase tracking-wider px-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            {t("appearance")}
          </h2>
          <div className={`p-4 rounded-xl border space-y-4 ${isDark ? 'bg-[#121212] border-white/5' : 'bg-white border-gray-200 shadow-sm'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#7000FF]/20 flex items-center justify-center">
                  <Palette className="w-5 h-5 text-[#7000FF]" />
                </div>
                <div>
                  <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{t("theme")}</p>
                  <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>{t("chooseTheme")}</p>
                </div>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                data-testid="theme-dark"
                onClick={() => { setTheme("dark"); haptic.light(); }}
                className={`flex-1 p-4 rounded-xl border-2 transition-colors ${
                  theme === "dark" 
                    ? "border-[#00F0FF] bg-[#00F0FF]/10" 
                    : isDark ? "border-white/10 bg-[#1A1A1A]" : "border-gray-200 bg-gray-50"
                }`}
              >
                <Moon className={`w-6 h-6 mx-auto mb-2 ${
                  theme === "dark" ? "text-[#00F0FF]" : "text-gray-500"
                }`} />
                <p className={`text-sm font-medium ${
                  theme === "dark" ? (isDark ? "text-white" : "text-gray-900") : "text-gray-500"
                }`}>{t("dark")}</p>
              </button>
              
              <button
                data-testid="theme-light"
                onClick={() => { setTheme("light"); haptic.light(); }}
                className={`flex-1 p-4 rounded-xl border-2 transition-colors ${
                  theme === "light" 
                    ? "border-[#00F0FF] bg-[#00F0FF]/10" 
                    : isDark ? "border-white/10 bg-[#1A1A1A]" : "border-gray-200 bg-gray-50"
                }`}
              >
                <Sun className={`w-6 h-6 mx-auto mb-2 ${
                  theme === "light" ? "text-[#00F0FF]" : "text-gray-500"
                }`} />
                <p className={`text-sm font-medium ${
                  theme === "light" ? (isDark ? "text-white" : "text-gray-900") : "text-gray-500"
                }`}>{t("light")}</p>
              </button>
            </div>
          </div>
        </section>

        {/* Notifications */}
        <section className="space-y-3">
          <h2 className={`text-sm font-medium uppercase tracking-wider px-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            {t("notifications")}
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
                <Button
                  data-testid="preview-notification-sound"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    haptic.light();
                    previewSound(settings.notifications.sound, settings.notifications.volume);
                  }}
                  className="text-[#00F0FF] hover:text-[#00F0FF]/80 gap-1"
                >
                  <PlayCircle className="w-4 h-4" />
                  Preview
                </Button>
              </div>
              <Select
                value={settings.notifications.sound}
                onValueChange={(val) => {
                  updateNotificationSetting("sound", val);
                  // Auto-preview when selecting a new sound
                  previewSound(val, settings.notifications.volume);
                }}
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
                <Button
                  data-testid="preview-message-sound"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    haptic.light();
                    previewSound(settings.notifications.messageSound, settings.notifications.volume);
                  }}
                  className="text-[#00F0FF] hover:text-[#00F0FF]/80 gap-1"
                >
                  <PlayCircle className="w-4 h-4" />
                  Preview
                </Button>
              </div>
              <Select
                value={settings.notifications.messageSound}
                onValueChange={(val) => {
                  updateNotificationSetting("messageSound", val);
                  // Auto-preview when selecting a new sound
                  previewSound(val, settings.notifications.volume);
                }}
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
      <Dialog open={showLanguageDialog} onOpenChange={(open) => {
        setShowLanguageDialog(open);
        if (!open) setLanguageSearch("");
      }}>
        <DialogContent className={`border max-w-md max-h-[80vh] ${isDark ? 'bg-[#121212] border-white/10 text-white' : 'bg-white border-gray-200 text-gray-900'}`}>
          <DialogHeader>
            <DialogTitle className="text-xl font-['Outfit']">{t("language")}</DialogTitle>
          </DialogHeader>
          
          {/* Search Box */}
          <div className="relative mb-2">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
            <Input
              placeholder={`${t("search")} (${languages.length} ${t("language").toLowerCase()}s)`}
              value={languageSearch}
              onChange={(e) => setLanguageSearch(e.target.value)}
              className={`pl-10 ${isDark ? 'bg-[#1A1A1A] border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
            />
          </div>
          
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-1">
              {filteredLanguages.length === 0 ? (
                <p className={`text-center py-8 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                  No languages found for "{languageSearch}"
                </p>
              ) : (
                filteredLanguages.map(lang => (
                  <button
                    key={lang.code}
                    onClick={() => {
                      setLanguage(lang.code);
                      setShowLanguageDialog(false);
                      setLanguageSearch("");
                      haptic.light();
                      toast.success(`Language changed to ${lang.name}`);
                    }}
                    className={`w-full p-3 rounded-lg flex items-center justify-between transition-colors ${
                      isDark ? 'hover:bg-white/5' : 'hover:bg-gray-100'
                    } ${language === lang.code ? "bg-[#00F0FF]/10" : ""}`}
                  >
                    <div className="text-left">
                      <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{lang.name}</p>
                      <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>{lang.native}</p>
                    </div>
                    {language === lang.code && (
                      <Check className="w-5 h-5 text-[#00F0FF]" />
                    )}
                  </button>
                ))
              )}
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
