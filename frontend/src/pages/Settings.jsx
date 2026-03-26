import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { 
  ArrowLeft, Globe, Moon, Sun, Bell, Volume2, 
  Users, MessageCircle, Heart, AtSign, RefreshCw,
  Download, ChevronRight, Check, Smartphone, Palette,
  Play, UserPlus, Tag, BellRing, VolumeX, Shield, Search,
  PlayCircle, LogOut, Lock, Key, User, Link2, BadgeCheck,
  Target, Eye, EyeOff, Home as HomeIcon, Sliders, Filter,
  Clock, Chrome, Share2, Image as ImageIcon, Accessibility,
  Layout, Languages, Film, Timer, Gift, Baby, Users2,
  Megaphone, X, Settings as SettingsIcon, ChevronDown,
  Fingerprint, Trash2, HelpCircle, Info, FileText, Bot, Phone,
  Scan, Sparkles, Star
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
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { useSettings } from "@/context/SettingsContext";
import { haptic } from "@/utils/mobile";
import BottomNav from "@/components/BottomNav";
import PermissionsManager from "@/components/PermissionsManager";
import AISettings from "@/components/ai/AISettings";
import { ExportDataButton } from "@/components/DataExport";
import { FaceCompareButton } from "@/components/FaceComparison";
import BackupSettings from "@/components/BackupSettings";
import CloseFriendsManager from "@/components/CloseFriendsManager";
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

const API_URL = process.env.REACT_APP_BACKEND_URL;

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

const APP_VERSION = "2.4.0";

// Settings Menu Item Component
function SettingsItem({ icon: Icon, title, subtitle, onClick, rightElement, color = "#00F0FF", isDark, danger = false }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${
        isDark ? 'hover:bg-white/5' : 'hover:bg-gray-100'
      } ${danger ? 'text-red-500' : ''}`}
    >
      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
        danger ? 'bg-red-500/20' : ''
      }`} style={{ backgroundColor: danger ? undefined : `${color}20` }}>
        <Icon className="w-5 h-5" style={{ color: danger ? '#ef4444' : color }} />
      </div>
      <div className="flex-1 text-left">
        <p 
          className="font-semibold" 
          style={{ color: danger ? '#ef4444' : (isDark ? '#ffffff' : '#1f2937') }}
        >
          {title}
        </p>
        {subtitle && (
          <p 
            className="text-sm"
            style={{ color: isDark ? '#9ca3af' : '#4b5563' }}
          >
            {subtitle}
          </p>
        )}
      </div>
      {rightElement || <ChevronRight className="w-5 h-5" style={{ color: isDark ? '#6b7280' : '#9ca3af' }} />}
    </button>
  );
}

// Section Header Component
function SectionHeader({ title, isDark }) {
  return (
    <h2 className={`text-xs font-bold uppercase tracking-wider px-3 py-2 ${
      isDark ? 'text-gray-500' : 'text-gray-700'
    }`}>
      {title}
    </h2>
  );
}

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

  // Dialog states
  const [activeSection, setActiveSection] = useState(null);
  const [showLanguageDialog, setShowLanguageDialog] = useState(false);
  const [showPermissionsDialog, setShowPermissionsDialog] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showBackupDialog, setShowBackupDialog] = useState(false);
  const [showCloseFriendsDialog, setShowCloseFriendsDialog] = useState(false);
  
  // Other states
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

  // Listen for backup dialog open event
  useEffect(() => {
    const handleOpenBackup = () => setShowBackupDialog(true);
    window.addEventListener('openBackupDialog', handleOpenBackup);
    return () => window.removeEventListener('openBackupDialog', handleOpenBackup);
  }, []);

  // Listen for close friends dialog open event
  useEffect(() => {
    const handleOpenCloseFriends = () => setShowCloseFriendsDialog(true);
    window.addEventListener('openCloseFriendsDialog', handleOpenCloseFriends);
    return () => window.removeEventListener('openCloseFriendsDialog', handleOpenCloseFriends);
  }, []);

  // Filter languages based on search
  const filteredLanguages = languages.filter(lang => 
    lang.name.toLowerCase().includes(languageSearch.toLowerCase()) ||
    lang.native.toLowerCase().includes(languageSearch.toLowerCase()) ||
    lang.code.toLowerCase().includes(languageSearch.toLowerCase())
  );

  const handleLogout = () => {
    haptic.warning();
    logout();
    navigate("/auth");
    toast.success("Logged out successfully");
  };

  const handleSoundPreview = (soundId) => {
    haptic.light();
    previewSound(soundId);
  };

  // Main Settings View
  const renderMainSettings = () => (
    <div className="space-y-2">
      {/* User Profile Header */}
      <div className={`p-4 rounded-2xl mb-4 ${isDark ? 'bg-[#121212]' : 'bg-white shadow-sm'}`}>
        <div className="flex items-center gap-4">
          <Avatar className="w-16 h-16 ring-2 ring-[#00F0FF]/30">
            <AvatarImage src={user?.avatar} />
            <AvatarFallback className="bg-gradient-to-br from-[#00F0FF] to-[#7000FF] text-white text-xl">
              {(user?.display_name || user?.username || "U")[0].toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {user?.display_name || user?.username}
            </h2>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              @{user?.username}
            </p>
            <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              {user?.email}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setActiveSection("personal")}
            className={isDark ? 'border-white/10' : ''}
          >
            Edit
          </Button>
        </div>
      </div>

      {/* Settings & Privacy */}
      <SectionHeader title={t('settingsPrivacy') || "Settings & Privacy"} isDark={isDark} />
      <div className={`rounded-2xl overflow-hidden ${isDark ? 'bg-[#121212]' : 'bg-white shadow-sm'}`}>
        <SettingsItem
          icon={Lock}
          title={t('password') || "Password"}
          subtitle="Change your password"
          onClick={() => setActiveSection("password")}
          color="#7000FF"
          isDark={isDark}
        />
        <SettingsItem
          icon={Shield}
          title={t('security') || "Security"}
          subtitle="Login activity, 2FA"
          onClick={() => setActiveSection("security")}
          color="#00F0FF"
          isDark={isDark}
        />
        <SettingsItem
          icon={User}
          title={t('personalDetails') || "Personal Details"}
          subtitle="Name, email, phone"
          onClick={() => setActiveSection("personal")}
          color="#FF6B6B"
          isDark={isDark}
        />
        <SettingsItem
          icon={Link2}
          title={t('connectedFeatures') || "Connected Features"}
          subtitle="Linked accounts, apps"
          onClick={() => setActiveSection("connected")}
          color="#4ECDC4"
          isDark={isDark}
        />
        <SettingsItem
          icon={BadgeCheck}
          title={t('verification') || "Verification"}
          subtitle="Verify your account"
          onClick={() => setActiveSection("verification")}
          color="#FFE66D"
          isDark={isDark}
        />
        <SettingsItem
          icon={Target}
          title={t('adPreferences') || "Ad Preferences"}
          subtitle="Manage ad settings"
          onClick={() => setActiveSection("ads")}
          color="#FF758C"
          isDark={isDark}
        />
      </div>

      {/* Tools & Resources */}
      <SectionHeader title={t('toolsResources') || "Tools & Resources"} isDark={isDark} />
      <div className={`rounded-2xl overflow-hidden ${isDark ? 'bg-[#121212]' : 'bg-white shadow-sm'}`}>
        <SettingsItem
          icon={Eye}
          title={t('privacyControls') || "Privacy Controls"}
          subtitle="Who can see your content"
          onClick={() => setActiveSection("privacy")}
          color="#00F0FF"
          isDark={isDark}
        />
        <SettingsItem
          icon={Baby}
          title={t('familyCenter') || "Family Center"}
          subtitle="Parental controls"
          onClick={() => setActiveSection("family")}
          color="#FF7EB3"
          isDark={isDark}
        />
        <SettingsItem
          icon={Users2}
          title={t('defaultAudience') || "Default Audience"}
          subtitle="Who sees your posts"
          onClick={() => setActiveSection("audience")}
          color="#7000FF"
          isDark={isDark}
        />
      </div>

      {/* Preferences */}
      <SectionHeader title={t('preferences') || "Preferences"} isDark={isDark} />
      <div className={`rounded-2xl overflow-hidden ${isDark ? 'bg-[#121212]' : 'bg-white shadow-sm'}`}>
        <SettingsItem
          icon={Filter}
          title={t('contentPreferences') || "Content Preferences"}
          subtitle="What you want to see"
          onClick={() => setActiveSection("content")}
          color="#00F0FF"
          isDark={isDark}
        />
        <SettingsItem
          icon={Heart}
          title={t('relationshipPreferences') || "Relationship Preferences"}
          subtitle="Dating, friends"
          onClick={() => setActiveSection("relationship")}
          color="#FF6B6B"
          isDark={isDark}
        />
        <SettingsItem
          icon={Bell}
          title={t('notifications') || "Notifications"}
          subtitle="Push, email, sounds"
          onClick={() => setActiveSection("notifications")}
          color="#FFE66D"
          isDark={isDark}
        />
        <SettingsItem
          icon={Accessibility}
          title={t('accessibility') || "Accessibility"}
          subtitle="Screen reader, text size"
          onClick={() => setActiveSection("accessibility")}
          color="#4ECDC4"
          isDark={isDark}
        />
        <SettingsItem
          icon={Layout}
          title={t('tabBar') || "Tab Bar"}
          subtitle="Customize navigation"
          onClick={() => setActiveSection("tabbar")}
          color="#7000FF"
          isDark={isDark}
        />
        <SettingsItem
          icon={Globe}
          title={t('languageRegion') || "Language & Region"}
          subtitle={currentLanguage?.name || "English"}
          onClick={() => setShowLanguageDialog(true)}
          color="#00F0FF"
          isDark={isDark}
        />
        <SettingsItem
          icon={Film}
          title={t('media') || "Media"}
          subtitle="Auto-play, quality"
          onClick={() => setActiveSection("media")}
          color="#FF758C"
          isDark={isDark}
        />
        <SettingsItem
          icon={Timer}
          title={t('timeManagement') || "Time Management"}
          subtitle="Screen time, reminders"
          onClick={() => setActiveSection("time")}
          color="#FFE66D"
          isDark={isDark}
        />
        <SettingsItem
          icon={Chrome}
          title={t('browser') || "Browser"}
          subtitle="In-app browser settings"
          onClick={() => setActiveSection("browser")}
          color="#4ECDC4"
          isDark={isDark}
        />
        <SettingsItem
          icon={Share2}
          title={t('sharingSuggestions') || "Sharing Suggestions"}
          subtitle="Gallery sharing"
          onClick={() => setActiveSection("sharing")}
          color="#7000FF"
          isDark={isDark}
        />
      </div>

      {/* Appearance */}
      <SectionHeader title={t('appearance') || "Appearance"} isDark={isDark} />
      <div className={`rounded-2xl overflow-hidden p-4 ${isDark ? 'bg-[#121212]' : 'bg-white shadow-sm'}`}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-[#7000FF]/20 flex items-center justify-center">
            <Palette className="w-5 h-5 text-[#7000FF]" />
          </div>
          <div>
            <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{t('theme') || "Theme"}</p>
            <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Choose your theme</p>
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
            <Moon className={`w-6 h-6 mx-auto mb-2 ${theme === "dark" ? "text-[#00F0FF]" : "text-gray-500"}`} />
            <p className={`text-sm font-medium ${theme === "dark" ? "text-[#00F0FF]" : "text-gray-500"}`}>
              {t('dark') || "Dark"}
            </p>
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
            <Sun className={`w-6 h-6 mx-auto mb-2 ${theme === "light" ? "text-[#00F0FF]" : "text-gray-500"}`} />
            <p className={`text-sm font-medium ${theme === "light" ? "text-[#00F0FF]" : "text-gray-500"}`}>
              {t('light') || "Light"}
            </p>
          </button>
        </div>
      </div>

      {/* AI Features */}
      <SectionHeader title={t('aiFeatures') || "AI Features"} isDark={isDark} />
      <div className={`rounded-2xl overflow-hidden ${isDark ? 'bg-[#121212]' : 'bg-white shadow-sm'}`}>
        <SettingsItem
          icon={Bot}
          title={t('aiAssistant') || "AI Assistant"}
          subtitle="Chat, image gen, captions"
          onClick={() => setActiveSection("ai")}
          color="#00F0FF"
          isDark={isDark}
        />
      </div>

      {/* App Permissions */}
      <SectionHeader title={t('appPermissions') || "App Permissions"} isDark={isDark} />
      <div className={`rounded-2xl overflow-hidden ${isDark ? 'bg-[#121212]' : 'bg-white shadow-sm'}`}>
        <SettingsItem
          icon={Smartphone}
          title={t('managePermissions') || "Manage Permissions"}
          subtitle="Camera, location, storage"
          onClick={() => setShowPermissionsDialog(true)}
          color="#4ECDC4"
          isDark={isDark}
        />
      </div>

      {/* About & Support */}
      <SectionHeader title={t('aboutSupport') || "About & Support"} isDark={isDark} />
      <div className={`rounded-2xl overflow-hidden ${isDark ? 'bg-[#121212]' : 'bg-white shadow-sm'}`}>
        <SettingsItem
          icon={HelpCircle}
          title={t('helpCenter') || "Help Center"}
          subtitle="FAQs, contact support"
          onClick={() => toast.info("Help Center coming soon")}
          color="#00F0FF"
          isDark={isDark}
        />
        <SettingsItem
          icon={FileText}
          title={t('termsPrivacy') || "Terms & Privacy Policy"}
          subtitle="Legal information"
          onClick={() => toast.info("Terms page coming soon")}
          color="#7000FF"
          isDark={isDark}
        />
        <SettingsItem
          icon={Info}
          title={t('about') || "About"}
          subtitle={`Version ${APP_VERSION}`}
          onClick={() => toast.info(`FaceConnect v${APP_VERSION}`)}
          color="#FFE66D"
          isDark={isDark}
        />
      </div>

      {/* Logout Button */}
      <div className={`rounded-2xl overflow-hidden mt-4 ${isDark ? 'bg-[#121212]' : 'bg-white shadow-sm'}`}>
        <SettingsItem
          icon={LogOut}
          title={t('logout') || "Log Out"}
          subtitle={`Logged in as @${user?.username}`}
          onClick={() => setShowLogoutConfirm(true)}
          color="#EF4444"
          isDark={isDark}
          danger
        />
      </div>

      {/* App Version Footer */}
      <div className="text-center py-6">
        <p className={`text-xs ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
          FaceConnect v{APP_VERSION}
        </p>
      </div>
    </div>
  );

  // Section Views
  const renderSectionContent = () => {
    switch (activeSection) {
      case "password":
        return <PasswordSection isDark={isDark} t={t} token={token} />;
      case "security":
        return <SecuritySection isDark={isDark} t={t} settings={settings} updateSetting={updateSetting} />;
      case "personal":
        return <PersonalDetailsSection isDark={isDark} t={t} user={user} token={token} />;
      case "connected":
        return <ConnectedFeaturesSection isDark={isDark} t={t} />;
      case "verification":
        return <VerificationSection isDark={isDark} t={t} user={user} />;
      case "ads":
        return <AdPreferencesSection isDark={isDark} t={t} settings={settings} updateSetting={updateSetting} />;
      case "privacy":
        return <PrivacyControlsSection isDark={isDark} t={t} settings={settings} updateSetting={updateSetting} />;
      case "family":
        return <FamilyCenterSection isDark={isDark} t={t} />;
      case "audience":
        return <DefaultAudienceSection isDark={isDark} t={t} settings={settings} updateSetting={updateSetting} />;
      case "content":
        return <ContentPreferencesSection isDark={isDark} t={t} settings={settings} updateSetting={updateSetting} />;
      case "relationship":
        return <RelationshipPreferencesSection isDark={isDark} t={t} settings={settings} updateSetting={updateSetting} />;
      case "notifications":
        return <NotificationsSection isDark={isDark} t={t} settings={settings} setSettings={setSettings} updateNotificationSetting={updateNotificationSetting} handleSoundPreview={handleSoundPreview} />;
      case "accessibility":
        return <AccessibilitySection isDark={isDark} t={t} settings={settings} updateSetting={updateSetting} />;
      case "tabbar":
        return <TabBarSection isDark={isDark} t={t} settings={settings} updateSetting={updateSetting} />;
      case "media":
        return <MediaSection isDark={isDark} t={t} settings={settings} updateSetting={updateSetting} />;
      case "time":
        return <TimeManagementSection isDark={isDark} t={t} settings={settings} updateSetting={updateSetting} />;
      case "browser":
        return <BrowserSection isDark={isDark} t={t} settings={settings} updateSetting={updateSetting} />;
      case "sharing":
        return <SharingSuggestionsSection isDark={isDark} t={t} settings={settings} updateSetting={updateSetting} />;
      case "ai":
        return <AISettings />;
      default:
        return null;
    }
  };

  const getSectionTitle = () => {
    const titles = {
      password: t('password') || "Password",
      security: t('security') || "Security",
      personal: t('personalDetails') || "Personal Details",
      connected: t('connectedFeatures') || "Connected Features",
      verification: t('verification') || "Verification",
      ads: t('adPreferences') || "Ad Preferences",
      privacy: t('privacyControls') || "Privacy Controls",
      family: t('familyCenter') || "Family Center",
      audience: t('defaultAudience') || "Default Audience",
      content: t('contentPreferences') || "Content Preferences",
      relationship: t('relationshipPreferences') || "Relationship Preferences",
      notifications: t('notifications') || "Notifications",
      accessibility: t('accessibility') || "Accessibility",
      tabbar: t('tabBar') || "Tab Bar",
      media: t('media') || "Media",
      time: t('timeManagement') || "Time Management",
      browser: t('browser') || "Browser",
      sharing: t('sharingSuggestions') || "Sharing Suggestions",
      ai: t('aiSettings') || "AI Settings"
    };
    return titles[activeSection] || "Settings";
  };

  return (
    <div 
      className={`min-h-screen ${isDark ? 'bg-[#0A0A0A]' : 'bg-[#F0F2F5]'} pb-20`}
      data-theme={isDark ? 'dark' : 'light'}
    >
      {/* Header */}
      <div className={`sticky top-0 z-40 px-4 py-3 backdrop-blur-lg border-b ${isDark ? 'bg-[#0A0A0A]/95 border-white/5' : 'bg-white/95 border-gray-100'}`}>
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => activeSection ? setActiveSection(null) : navigate(-1)}
            className={isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600'}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {activeSection ? getSectionTitle() : (t('settings') || "Settings")}
          </h1>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="h-[calc(100vh-130px)]">
        <div className="px-4 py-4">
          <AnimatePresence mode="wait">
            {activeSection ? (
              <motion.div
                key={activeSection}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                {renderSectionContent()}
              </motion.div>
            ) : (
              <motion.div
                key="main"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {renderMainSettings()}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </ScrollArea>

      {/* Language Dialog */}
      <Dialog open={showLanguageDialog} onOpenChange={setShowLanguageDialog}>
        <DialogContent className={`${isDark ? 'bg-[#121212] border-white/10' : ''} max-w-md max-h-[80vh]`}>
          <DialogHeader>
            <DialogTitle>{t('selectLanguage') || "Select Language"}</DialogTitle>
          </DialogHeader>
          <div className="relative mb-4">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
            <Input
              value={languageSearch}
              onChange={(e) => setLanguageSearch(e.target.value)}
              placeholder="Search languages..."
              className={`pl-10 ${isDark ? 'bg-[#1A1A1A] border-white/10' : ''}`}
            />
          </div>
          <ScrollArea className="h-[400px]">
            <div className="space-y-1">
              {filteredLanguages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => { setLanguage(lang.code); setShowLanguageDialog(false); haptic.light(); }}
                  className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors ${
                    language === lang.code 
                      ? 'bg-[#00F0FF]/20' 
                      : isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{lang.flag}</span>
                    <div className="text-left">
                      <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{lang.native}</p>
                      <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>{lang.name}</p>
                    </div>
                  </div>
                  {language === lang.code && <Check className="w-5 h-5 text-[#00F0FF]" />}
                </button>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Permissions Dialog */}
      <Dialog open={showPermissionsDialog} onOpenChange={setShowPermissionsDialog}>
        <DialogContent className={`${isDark ? 'bg-[#121212] border-white/10' : ''} max-w-md`}>
          <DialogHeader>
            <DialogTitle>{t('appPermissions') || "App Permissions"}</DialogTitle>
          </DialogHeader>
          <PermissionsManager />
        </DialogContent>
      </Dialog>

      {/* Logout Confirmation Dialog */}
      <Dialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
        <DialogContent className={`${isDark ? 'bg-[#121212] border-white/10' : ''} max-w-sm`}>
          <DialogHeader>
            <DialogTitle className="text-red-500">{t('logout') || "Log Out"}</DialogTitle>
            <DialogDescription>
              Are you sure you want to log out of your account?
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 mt-4">
            <Button
              variant="outline"
              onClick={() => setShowLogoutConfirm(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleLogout}
              className="flex-1 bg-red-500 hover:bg-red-600 text-white"
              data-testid="confirm-logout-btn"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Log Out
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Encrypted Backup Dialog */}
      <BackupSettings 
        isOpen={showBackupDialog} 
        onClose={() => setShowBackupDialog(false)} 
      />

      {/* Close Friends Manager Dialog */}
      <CloseFriendsManager
        isOpen={showCloseFriendsDialog}
        onClose={() => setShowCloseFriendsDialog(false)}
      />

      <BottomNav />
    </div>
  );
}

// ============== SECTION COMPONENTS ==============

// Password Section
function PasswordSection({ isDark, t, token }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    
    setSaving(true);
    haptic.medium();
    
    try {
      const response = await fetch(`${API_URL}/api/auth/change-password?token=${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword })
      });
      
      if (response.ok) {
        toast.success("Password changed successfully");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        const data = await response.json();
        toast.error(data.detail || "Failed to change password");
      }
    } catch (error) {
      toast.error("Failed to change password");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className={`p-4 rounded-xl ${isDark ? 'bg-[#121212]' : 'bg-white shadow-sm'}`}>
        <div className="space-y-4">
          <div>
            <Label className={isDark ? 'text-gray-400' : ''}>{t('currentPassword') || "Current Password"}</Label>
            <div className="relative mt-1">
              <Input
                type={showCurrent ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className={isDark ? 'bg-[#1A1A1A] border-white/10' : ''}
              />
              <button
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                {showCurrent ? <EyeOff className="w-4 h-4 text-gray-500" /> : <Eye className="w-4 h-4 text-gray-500" />}
              </button>
            </div>
          </div>
          
          <div>
            <Label className={isDark ? 'text-gray-400' : ''}>{t('newPassword') || "New Password"}</Label>
            <div className="relative mt-1">
              <Input
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={isDark ? 'bg-[#1A1A1A] border-white/10' : ''}
              />
              <button
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                {showNew ? <EyeOff className="w-4 h-4 text-gray-500" /> : <Eye className="w-4 h-4 text-gray-500" />}
              </button>
            </div>
          </div>
          
          <div>
            <Label className={isDark ? 'text-gray-400' : ''}>{t('confirmPassword') || "Confirm Password"}</Label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={`mt-1 ${isDark ? 'bg-[#1A1A1A] border-white/10' : ''}`}
            />
          </div>
          
          <Button
            onClick={handleChangePassword}
            disabled={saving || !currentPassword || !newPassword || !confirmPassword}
            className="w-full bg-gradient-to-r from-[#00F0FF] to-[#7000FF]"
          >
            {saving ? "Saving..." : (t('changePassword') || "Change Password")}
          </Button>
        </div>
      </div>
    </div>
  );
}

// Security Section
function SecuritySection({ isDark, t, settings, updateSetting }) {
  return (
    <div className="space-y-4" data-testid="security-section">
      <div className={`p-4 rounded-xl ${isDark ? 'bg-[#121212]' : 'bg-white shadow-sm'}`}>
        <h3 className={`font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          {t('twoFactorAuth') || "Two-Factor Authentication"}
        </h3>
        <div className="flex items-center justify-between">
          <div>
            <p className={isDark ? 'text-white' : 'text-gray-900'}>{t('enable2FA') || "Enable 2FA"}</p>
            <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
              Add extra security to your account
            </p>
          </div>
          <Switch
            data-testid="2fa-toggle"
            checked={settings?.twoFactorEnabled || false}
            onCheckedChange={(val) => { updateSetting('twoFactorEnabled', val); haptic.light(); }}
          />
        </div>
      </div>
      
      <div className={`p-4 rounded-xl ${isDark ? 'bg-[#121212]' : 'bg-white shadow-sm'}`}>
        <h3 className={`font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          {t('biometricLogin') || "Biometric Login"}
        </h3>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Fingerprint className="w-5 h-5 text-[#00F0FF]" />
            <div>
              <p className={isDark ? 'text-white' : 'text-gray-900'}>{t('faceIdFingerprint') || "Face ID / Fingerprint"}</p>
              <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                Use biometrics to unlock
              </p>
            </div>
          </div>
          <Switch
            data-testid="biometric-toggle"
            checked={settings?.biometricEnabled || false}
            onCheckedChange={(val) => { updateSetting('biometricEnabled', val); haptic.light(); }}
          />
        </div>
      </div>
      
      <div className={`p-4 rounded-xl ${isDark ? 'bg-[#121212]' : 'bg-white shadow-sm'}`}>
        <h3 className={`font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          {t('loginActivity') || "Login Activity"}
        </h3>
        <Button variant="outline" className={`w-full ${isDark ? 'border-white/10' : ''}`} data-testid="view-login-history-btn">
          {t('viewLoginHistory') || "View Login History"}
        </Button>
      </div>
      
      {/* FaceScan Settings */}
      <FaceScanSettings isDark={isDark} t={t} />
    </div>
  );
}

// FaceScan Settings Component
function FaceScanSettings({ isDark, t }) {
  const { settings, updateSettings } = useSettings();
  
  const faceScanSettings = settings?.faceScan || {
    quality: "high",
    multipleFaces: true,
    autoSnapshot: false,
    aiEnhancement: true,
    scanSensitivity: 0.6,
    showLandmarks: true,
    showConfidence: true,
    saveHistory: true,
    hapticFeedback: true,
  };

  const updateFaceScan = (key, value) => {
    updateSettings({
      faceScan: {
        ...faceScanSettings,
        [key]: value
      }
    });
    haptic.light();
  };

  return (
    <div className={`p-4 rounded-xl ${isDark ? 'bg-[#121212]' : 'bg-white shadow-sm'}`}>
      <h3 className={`font-semibold mb-4 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
        <Scan className="w-5 h-5 text-[#00F0FF]" />
        {t('faceScanSettings') || "FaceScan Settings"}
      </h3>
      
      <div className="space-y-4">
        {/* Scan Quality */}
        <div>
          <Label className={`mb-2 block ${isDark ? 'text-gray-400' : ''}`}>
            {t('scanQuality') || "Scan Quality"}
          </Label>
          <Select
            value={faceScanSettings.quality}
            onValueChange={(value) => updateFaceScan("quality", value)}
          >
            <SelectTrigger className={isDark ? 'bg-[#1A1A1A] border-white/10 text-white' : ''}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className={isDark ? 'bg-[#1A1A1A] border-white/10' : ''}>
              <SelectItem value="low">Low (Fast)</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High (Recommended)</SelectItem>
              <SelectItem value="ultra">Ultra (Accurate)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Sensitivity Slider */}
        <div>
          <div className="flex justify-between mb-2">
            <Label className={isDark ? 'text-gray-400' : ''}>
              {t('scanSensitivity') || "Scan Sensitivity"}
            </Label>
            <span className="text-[#00F0FF] text-sm">{Math.round(faceScanSettings.scanSensitivity * 100)}%</span>
          </div>
          <Slider
            value={[faceScanSettings.scanSensitivity * 100]}
            onValueChange={([value]) => updateFaceScan("scanSensitivity", value / 100)}
            min={30}
            max={90}
            step={5}
            className="w-full"
          />
          <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            Lower = stricter matching, Higher = more matches
          </p>
        </div>

        {/* Multiple Faces */}
        <div className="flex items-center justify-between">
          <div>
            <p className={isDark ? 'text-white' : 'text-gray-900'}>
              {t('multipleFaces') || "Multiple Faces"}
            </p>
            <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
              Detect all faces in frame
            </p>
          </div>
          <Switch
            checked={faceScanSettings.multipleFaces}
            onCheckedChange={(val) => updateFaceScan("multipleFaces", val)}
          />
        </div>

        {/* AI Enhancement */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <div>
              <p className={isDark ? 'text-white' : 'text-gray-900'}>
                {t('aiEnhancement') || "AI Enhancement"}
              </p>
              <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                Better recognition accuracy
              </p>
            </div>
          </div>
          <Switch
            checked={faceScanSettings.aiEnhancement}
            onCheckedChange={(val) => updateFaceScan("aiEnhancement", val)}
          />
        </div>

        {/* Auto Snapshot */}
        <div className="flex items-center justify-between">
          <div>
            <p className={isDark ? 'text-white' : 'text-gray-900'}>
              {t('autoSnapshot') || "Auto Snapshot"}
            </p>
            <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
              Capture when face detected
            </p>
          </div>
          <Switch
            checked={faceScanSettings.autoSnapshot}
            onCheckedChange={(val) => updateFaceScan("autoSnapshot", val)}
          />
        </div>

        {/* Show Landmarks */}
        <div className="flex items-center justify-between">
          <div>
            <p className={isDark ? 'text-white' : 'text-gray-900'}>
              {t('showLandmarks') || "Show Landmarks"}
            </p>
            <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
              Display face feature points
            </p>
          </div>
          <Switch
            checked={faceScanSettings.showLandmarks}
            onCheckedChange={(val) => updateFaceScan("showLandmarks", val)}
          />
        </div>

        {/* Haptic Feedback */}
        <div className="flex items-center justify-between">
          <div>
            <p className={isDark ? 'text-white' : 'text-gray-900'}>
              {t('hapticFeedback') || "Haptic Feedback"}
            </p>
            <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
              Vibrate on detection
            </p>
          </div>
          <Switch
            checked={faceScanSettings.hapticFeedback}
            onCheckedChange={(val) => updateFaceScan("hapticFeedback", val)}
          />
        </div>

        {/* Save History */}
        <div className="flex items-center justify-between">
          <div>
            <p className={isDark ? 'text-white' : 'text-gray-900'}>
              {t('saveHistory') || "Save Scan History"}
            </p>
            <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
              Keep record of scans
            </p>
          </div>
          <Switch
            checked={faceScanSettings.saveHistory}
            onCheckedChange={(val) => updateFaceScan("saveHistory", val)}
          />
        </div>
      </div>
      
      {/* Face Comparison */}
      <div className={`p-4 rounded-xl mt-4 ${isDark ? 'bg-[#121212]' : 'bg-white shadow-sm'}`}>
        <h3 className={`font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Face Comparison
        </h3>
        <FaceCompareButton isDark={isDark} />
      </div>
    </div>
  );
}

// Personal Details Section
function PersonalDetailsSection({ isDark, t, user, token }) {
  const [displayName, setDisplayName] = useState(user?.display_name || "");
  const [username, setUsername] = useState(user?.username || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    haptic.medium();
    
    try {
      const response = await fetch(`${API_URL}/api/auth/update-profile?token=${token}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ display_name: displayName, phone })
      });
      
      if (response.ok) {
        toast.success("Profile updated");
      } else {
        toast.error("Failed to update profile");
      }
    } catch (error) {
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className={`p-4 rounded-xl ${isDark ? 'bg-[#121212]' : 'bg-white shadow-sm'}`}>
        <div className="space-y-4">
          <div>
            <Label className={isDark ? 'text-gray-400' : ''}>{t('displayName') || "Display Name"}</Label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className={`mt-1 ${isDark ? 'bg-[#1A1A1A] border-white/10' : ''}`}
            />
          </div>
          
          <div>
            <Label className={isDark ? 'text-gray-400' : ''}>{t('username') || "Username"}</Label>
            <Input
              value={username}
              disabled
              className={`mt-1 ${isDark ? 'bg-[#1A1A1A] border-white/10 opacity-50' : 'opacity-50'}`}
            />
            <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Username cannot be changed</p>
          </div>
          
          <div>
            <Label className={isDark ? 'text-gray-400' : ''}>{t('email') || "Email"}</Label>
            <Input
              value={email}
              disabled
              className={`mt-1 ${isDark ? 'bg-[#1A1A1A] border-white/10 opacity-50' : 'opacity-50'}`}
            />
          </div>
          
          <div>
            <Label className={isDark ? 'text-gray-400' : ''}>{t('phone') || "Phone"}</Label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 234 567 8900"
              className={`mt-1 ${isDark ? 'bg-[#1A1A1A] border-white/10' : ''}`}
            />
          </div>
          
          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-gradient-to-r from-[#00F0FF] to-[#7000FF]"
          >
            {saving ? "Saving..." : (t('saveChanges') || "Save Changes")}
          </Button>
        </div>
      </div>
    </div>
  );
}

// Connected Features Section
function ConnectedFeaturesSection({ isDark, t }) {
  const connections = [
    { id: "google", name: "Google", icon: "G", connected: true, color: "#DB4437" },
    { id: "apple", name: "Apple", icon: "", connected: false, color: "#000000" },
    { id: "facebook", name: "Facebook", icon: "f", connected: false, color: "#1877F2" },
    { id: "twitter", name: "X (Twitter)", icon: "X", connected: false, color: "#1DA1F2" },
  ];

  return (
    <div className="space-y-4">
      <div className={`p-4 rounded-xl ${isDark ? 'bg-[#121212]' : 'bg-white shadow-sm'}`}>
        <h3 className={`font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          {t('linkedAccounts') || "Linked Accounts"}
        </h3>
        <div className="space-y-3">
          {connections.map((conn) => (
            <div key={conn.id} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                  style={{ backgroundColor: conn.color }}
                >
                  {conn.icon}
                </div>
                <div>
                  <p className={isDark ? 'text-white' : 'text-gray-900'}>{conn.name}</p>
                  <p className={`text-sm ${conn.connected ? 'text-green-500' : isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                    {conn.connected ? "Connected" : "Not connected"}
                  </p>
                </div>
              </div>
              <Button
                variant={conn.connected ? "outline" : "default"}
                size="sm"
                onClick={() => { haptic.light(); toast.info(`${conn.name} integration coming soon`); }}
                className={conn.connected ? '' : 'bg-[#00F0FF] text-black'}
              >
                {conn.connected ? "Disconnect" : "Connect"}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Verification Section
function VerificationSection({ isDark, t, user }) {
  return (
    <div className="space-y-4">
      <div className={`p-4 rounded-xl ${isDark ? 'bg-[#121212]' : 'bg-white shadow-sm'}`}>
        <div className="text-center py-6">
          <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-r from-[#00F0FF] to-[#7000FF] flex items-center justify-center mb-4">
            <BadgeCheck className="w-10 h-10 text-white" />
          </div>
          <h3 className={`text-lg font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {t('getVerified') || "Get Verified"}
          </h3>
          <p className={`text-sm mb-6 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            Verified accounts get a blue checkmark and increased visibility
          </p>
          <Button className="bg-gradient-to-r from-[#00F0FF] to-[#7000FF]">
            {t('applyForVerification') || "Apply for Verification"}
          </Button>
        </div>
      </div>
      
      <div className={`p-4 rounded-xl ${isDark ? 'bg-[#121212]' : 'bg-white shadow-sm'}`}>
        <h3 className={`font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          {t('requirements') || "Requirements"}
        </h3>
        <ul className={`space-y-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
          <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500" /> Complete profile</li>
          <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500" /> Verified email</li>
          <li className="flex items-center gap-2"><X className="w-4 h-4 text-gray-400" /> 1,000+ followers</li>
          <li className="flex items-center gap-2"><X className="w-4 h-4 text-gray-400" /> Notable public presence</li>
        </ul>
      </div>
    </div>
  );
}

// Ad Preferences Section
function AdPreferencesSection({ isDark, t, settings, updateSetting }) {
  return (
    <div className="space-y-4" data-testid="ad-preferences-section">
      <div className={`p-4 rounded-xl ${isDark ? 'bg-[#121212]' : 'bg-white shadow-sm'}`}>
        <h3 className={`font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          {t('adPersonalization') || "Ad Personalization"}
        </h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className={isDark ? 'text-white' : 'text-gray-900'}>{t('personalizedAds') || "Personalized Ads"}</p>
              <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                Show ads based on your interests
              </p>
            </div>
            <Switch
              data-testid="personalized-ads-toggle"
              checked={settings?.personalizedAds !== false}
              onCheckedChange={(val) => { updateSetting('personalizedAds', val); haptic.light(); }}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <p className={isDark ? 'text-white' : 'text-gray-900'}>{t('adsFromPartners') || "Ads from Partners"}</p>
              <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                Allow third-party ad targeting
              </p>
            </div>
            <Switch
              data-testid="partner-ads-toggle"
              checked={settings?.partnerAds || false}
              onCheckedChange={(val) => { updateSetting('partnerAds', val); haptic.light(); }}
            />
          </div>
        </div>
      </div>
      
      <div className={`p-4 rounded-xl ${isDark ? 'bg-[#121212]' : 'bg-white shadow-sm'}`}>
        <Button variant="outline" className={`w-full ${isDark ? 'border-white/10' : ''}`} data-testid="view-ad-interests-btn">
          <Target className="w-4 h-4 mr-2" />
          {t('viewAdInterests') || "View Your Ad Interests"}
        </Button>
      </div>
    </div>
  );
}

// Privacy Controls Section
function PrivacyControlsSection({ isDark, t, settings, updateSetting }) {
  return (
    <div className="space-y-4" data-testid="privacy-controls-section">
      <div className={`p-4 rounded-xl ${isDark ? 'bg-[#121212]' : 'bg-white shadow-sm'}`}>
        <h3 className={`font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          {t('accountPrivacy') || "Account Privacy"}
        </h3>
        
        <div className="space-y-4">
          {/* Close Friends Button */}
          <Button
            variant="outline"
            className={`w-full justify-start gap-3 ${isDark ? 'border-white/10' : ''}`}
            onClick={() => window.dispatchEvent(new CustomEvent('openCloseFriendsDialog'))}
            data-testid="close-friends-btn"
          >
            <Star className="w-5 h-5 text-green-500" />
            <div className="text-left flex-1">
              <p className="font-medium">Close Friends</p>
              <p className="text-xs text-gray-500">Manage your close friends list</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </Button>

          <div className="flex items-center justify-between">
            <div>
              <p className={isDark ? 'text-white' : 'text-gray-900'}>{t('privateAccount') || "Private Account"}</p>
              <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                Only approved followers can see your content
              </p>
            </div>
            <Switch
              data-testid="private-account-toggle"
              checked={settings?.privateAccount || false}
              onCheckedChange={(val) => { updateSetting('privateAccount', val); haptic.light(); }}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <p className={isDark ? 'text-white' : 'text-gray-900'}>{t('activityStatus') || "Activity Status"}</p>
              <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                Show when you're active
              </p>
            </div>
            <Switch
              data-testid="activity-status-toggle"
              checked={settings?.activityStatus !== false}
              onCheckedChange={(val) => { updateSetting('activityStatus', val); haptic.light(); }}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <p className={isDark ? 'text-white' : 'text-gray-900'}>{t('readReceipts') || "Read Receipts"}</p>
              <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                Show when you've read messages
              </p>
            </div>
            <Switch
              data-testid="read-receipts-toggle"
              checked={settings?.readReceipts !== false}
              onCheckedChange={(val) => { updateSetting('readReceipts', val); haptic.light(); }}
            />
          </div>
        </div>
      </div>
      
      {/* Data Export Section */}
      <div className={`p-4 rounded-xl ${isDark ? 'bg-[#121212]' : 'bg-white shadow-sm'}`}>
        <h3 className={`font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Your Data
        </h3>
        <div className="space-y-3">
          <ExportDataButton isDark={isDark} />
          <Button
            variant="outline"
            className={`w-full justify-start gap-3 ${isDark ? 'border-white/10' : ''}`}
            onClick={() => window.dispatchEvent(new CustomEvent('openBackupDialog'))}
          >
            <Shield className="w-5 h-5 text-green-500" />
            <div className="text-left">
              <p className="font-medium">Encrypted Backup</p>
              <p className="text-xs text-gray-500">Local, cloud, or server backup</p>
            </div>
          </Button>
        </div>
      </div>
    </div>
  );
}

// Family Center Section
function FamilyCenterSection({ isDark, t }) {
  return (
    <div className="space-y-4">
      <div className={`p-4 rounded-xl ${isDark ? 'bg-[#121212]' : 'bg-white shadow-sm'}`}>
        <div className="text-center py-6">
          <div className="w-20 h-20 mx-auto rounded-full bg-[#FF7EB3]/20 flex items-center justify-center mb-4">
            <Baby className="w-10 h-10 text-[#FF7EB3]" />
          </div>
          <h3 className={`text-lg font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {t('familyCenter') || "Family Center"}
          </h3>
          <p className={`text-sm mb-6 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            Manage supervision and parental controls for your family
          </p>
          <Button className="bg-[#FF7EB3] text-white">
            {t('setupParentalControls') || "Set Up Parental Controls"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// Default Audience Section
function DefaultAudienceSection({ isDark, t, settings, updateSetting }) {
  const audiences = [
    { id: "public", name: "Public", icon: Globe, desc: "Anyone can see" },
    { id: "friends", name: "Friends", icon: Users, desc: "Only friends" },
    { id: "close_friends", name: "Close Friends", icon: Heart, desc: "Your close friends list" },
    { id: "private", name: "Only Me", icon: Lock, desc: "Only you can see" },
  ];

  return (
    <div className="space-y-4">
      <div className={`p-4 rounded-xl ${isDark ? 'bg-[#121212]' : 'bg-white shadow-sm'}`}>
        <h3 className={`font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          {t('whoCanSeeYourPosts') || "Who can see your posts"}
        </h3>
        
        <div className="space-y-2">
          {audiences.map((aud) => (
            <button
              key={aud.id}
              onClick={() => { updateSetting('defaultAudience', aud.id); haptic.light(); }}
              className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${
                settings?.defaultAudience === aud.id
                  ? 'bg-[#00F0FF]/20 border border-[#00F0FF]'
                  : isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50'
              }`}
            >
              <aud.icon className={`w-5 h-5 ${settings?.defaultAudience === aud.id ? 'text-[#00F0FF]' : 'text-gray-500'}`} />
              <div className="flex-1 text-left">
                <p className={isDark ? 'text-white' : 'text-gray-900'}>{aud.name}</p>
                <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>{aud.desc}</p>
              </div>
              {settings?.defaultAudience === aud.id && <Check className="w-5 h-5 text-[#00F0FF]" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// Content Preferences Section
function ContentPreferencesSection({ isDark, t, settings, updateSetting }) {
  return (
    <div className="space-y-4">
      <div className={`p-4 rounded-xl ${isDark ? 'bg-[#121212]' : 'bg-white shadow-sm'}`}>
        <h3 className={`font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          {t('sensitiveContent') || "Sensitive Content"}
        </h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className={isDark ? 'text-white' : 'text-gray-900'}>{t('hideSensitiveContent') || "Hide Sensitive Content"}</p>
              <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                Blur potentially sensitive images
              </p>
            </div>
            <Switch
              checked={settings?.hideSensitive !== false}
              onCheckedChange={(val) => { updateSetting('hideSensitive', val); haptic.light(); }}
            />
          </div>
        </div>
      </div>
      
      <div className={`p-4 rounded-xl ${isDark ? 'bg-[#121212]' : 'bg-white shadow-sm'}`}>
        <h3 className={`font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          {t('interests') || "Interests"}
        </h3>
        <p className={`text-sm mb-3 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          Content you're interested in
        </p>
        <div className="flex flex-wrap gap-2">
          {["Technology", "Music", "Sports", "Art", "Travel", "Food", "Fashion", "Gaming"].map((interest) => (
            <Button
              key={interest}
              variant="outline"
              size="sm"
              className={isDark ? 'border-white/10' : ''}
            >
              {interest}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}

// Relationship Preferences Section
function RelationshipPreferencesSection({ isDark, t, settings, updateSetting }) {
  return (
    <div className="space-y-4">
      <div className={`p-4 rounded-xl ${isDark ? 'bg-[#121212]' : 'bg-white shadow-sm'}`}>
        <h3 className={`font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          {t('relationshipStatus') || "Relationship Status"}
        </h3>
        <Select defaultValue={settings?.relationshipStatus || "not_specified"}>
          <SelectTrigger className={isDark ? 'bg-[#1A1A1A] border-white/10' : ''}>
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="not_specified">Not Specified</SelectItem>
            <SelectItem value="single">Single</SelectItem>
            <SelectItem value="in_relationship">In a Relationship</SelectItem>
            <SelectItem value="engaged">Engaged</SelectItem>
            <SelectItem value="married">Married</SelectItem>
            <SelectItem value="complicated">It's Complicated</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div className={`p-4 rounded-xl ${isDark ? 'bg-[#121212]' : 'bg-white shadow-sm'}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className={isDark ? 'text-white' : 'text-gray-900'}>{t('showRelationshipStatus') || "Show Status"}</p>
            <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
              Display on your profile
            </p>
          </div>
          <Switch
            checked={settings?.showRelationshipStatus || false}
            onCheckedChange={(val) => { updateSetting('showRelationshipStatus', val); haptic.light(); }}
          />
        </div>
      </div>
    </div>
  );
}

// Notification Category Component
function NotificationCategory({ title, icon: Icon, color, settings, categoryKey, isDark, t, onUpdate, handleSoundPreview, showRingtone = false }) {
  const categorySettings = settings?.notifications?.[categoryKey] || {};
  const isEnabled = categorySettings.enabled !== false;
  
  const updateCategorySetting = (key, value) => {
    onUpdate(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [categoryKey]: {
          ...prev.notifications?.[categoryKey],
          [key]: value
        }
      }
    }));
  };
  
  return (
    <div className={`p-4 rounded-xl ${isDark ? 'bg-[#121212]' : 'bg-white shadow-sm'}`}>
      {/* Category Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: `${color}20` }}>
            <Icon className="w-5 h-5" style={{ color }} />
          </div>
          <div>
            <p className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{title}</p>
          </div>
        </div>
        <Switch
          checked={isEnabled}
          onCheckedChange={(val) => updateCategorySetting('enabled', val)}
          data-testid={`${categoryKey}-notifications-toggle`}
        />
      </div>
      
      {/* Category Settings */}
      <AnimatePresence>
        {isEnabled && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4 pl-4 border-l-2 border-[#00F0FF]/30"
          >
            {/* Notification Tone / Ringtone */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-gray-500" />
                <span className={isDark ? 'text-white' : 'text-gray-900'}>
                  {showRingtone ? (t('ringtone') || "Ringtone") : (t('notificationTone') || "Notification tone")}
                </span>
              </div>
              <Select 
                value={showRingtone ? (categorySettings.ringtone || "default") : (categorySettings.tone || "default")}
                onValueChange={(val) => {
                  updateCategorySetting(showRingtone ? 'ringtone' : 'tone', val);
                  handleSoundPreview(val);
                }}
              >
                <SelectTrigger className={`w-32 ${isDark ? 'bg-[#1A1A1A] border-white/10' : ''}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {NOTIFICATION_SOUNDS.map((sound) => (
                    <SelectItem key={sound.id} value={sound.id}>{sound.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Vibration */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-gray-500" />
                <span className={isDark ? 'text-white' : 'text-gray-900'}>{t('vibration') || "Vibration"}</span>
              </div>
              <Switch
                checked={categorySettings.vibration !== false}
                onCheckedChange={(val) => updateCategorySetting('vibration', val)}
                data-testid={`${categoryKey}-vibration-toggle`}
              />
            </div>
            
            {/* High Priority (not for calls) */}
            {!showRingtone && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BellRing className="w-4 h-4 text-gray-500" />
                  <span className={isDark ? 'text-white' : 'text-gray-900'}>{t('highPriority') || "Use high priority notifications"}</span>
                </div>
                <Switch
                  checked={categorySettings.highPriority !== false}
                  onCheckedChange={(val) => updateCategorySetting('highPriority', val)}
                  data-testid={`${categoryKey}-highpriority-toggle`}
                />
              </div>
            )}
            
            {/* Reactions (not for calls) */}
            {!showRingtone && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Heart className="w-4 h-4 text-gray-500" />
                  <span className={isDark ? 'text-white' : 'text-gray-900'}>{t('notificationReactions') || "Notification reactions"}</span>
                </div>
                <Switch
                  checked={categorySettings.reactions !== false}
                  onCheckedChange={(val) => updateCategorySetting('reactions', val)}
                  data-testid={`${categoryKey}-reactions-toggle`}
                />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Notifications Section
function NotificationsSection({ isDark, t, settings, setSettings, updateNotificationSetting, handleSoundPreview }) {
  const allEnabled = settings?.notifications?.enabled !== false;
  
  const handleAllowAll = (enabled) => {
    haptic.medium();
    setSettings(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        enabled: enabled,
        messages: { ...prev.notifications?.messages, enabled },
        groups: { ...prev.notifications?.groups, enabled },
        calls: { ...prev.notifications?.calls, enabled },
        status: { ...prev.notifications?.status, enabled },
      }
    }));
    
    if (enabled) {
      // Request browser notification permission
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
      }
      toast.success(t('allNotificationsEnabled') || "All notifications enabled");
    } else {
      toast.info(t('allNotificationsDisabled') || "All notifications disabled");
    }
  };
  
  return (
    <div className="space-y-4">
      {/* Allow All Notifications */}
      <div className={`p-4 rounded-xl ${isDark ? 'bg-[#121212]' : 'bg-white shadow-sm'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-[#00F0FF] to-[#7000FF] flex items-center justify-center">
              <Bell className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {t('allowAllNotifications') || "Allow all notifications and messages"}
              </p>
              <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                {t('receiveAllAlerts') || "Receive alerts for all activity"}
              </p>
            </div>
          </div>
          <Switch
            checked={allEnabled}
            onCheckedChange={handleAllowAll}
            data-testid="allow-all-notifications-toggle"
          />
        </div>
      </div>
      
      {/* Messages Notifications */}
      <NotificationCategory
        title={t('messages') || "Messages"}
        icon={MessageCircle}
        color="#00F0FF"
        settings={settings}
        categoryKey="messages"
        isDark={isDark}
        t={t}
        onUpdate={setSettings}
        handleSoundPreview={handleSoundPreview}
      />
      
      {/* Groups Notifications */}
      <NotificationCategory
        title={t('groups') || "Groups"}
        icon={Users}
        color="#7000FF"
        settings={settings}
        categoryKey="groups"
        isDark={isDark}
        t={t}
        onUpdate={setSettings}
        handleSoundPreview={handleSoundPreview}
      />
      
      {/* Calls Notifications */}
      <NotificationCategory
        title={t('calls') || "Calls"}
        icon={Phone}
        color="#4ECDC4"
        settings={settings}
        categoryKey="calls"
        isDark={isDark}
        t={t}
        onUpdate={setSettings}
        handleSoundPreview={handleSoundPreview}
        showRingtone={true}
      />
      
      {/* Status Notifications */}
      <NotificationCategory
        title={t('status') || "Status"}
        icon={Eye}
        color="#FFE66D"
        settings={settings}
        categoryKey="status"
        isDark={isDark}
        t={t}
        onUpdate={setSettings}
        handleSoundPreview={handleSoundPreview}
      />
      
      {/* Other Notifications (Legacy) */}
      <div className={`p-4 rounded-xl ${isDark ? 'bg-[#121212]' : 'bg-white shadow-sm'}`}>
        <h3 className={`font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          {t('otherNotifications') || "Other Notifications"}
        </h3>
        
        <div className="space-y-3 pl-4 border-l-2 border-[#00F0FF]/30">
          {[
            { key: "comments", icon: MessageCircle, label: t('comments') || "Comments" },
            { key: "friendRequests", icon: UserPlus, label: t('friendRequests') || "Friend Requests" },
            { key: "tags", icon: Tag, label: t('tags') || "Tags" },
            { key: "reels", icon: Film, label: t('reels') || "Reels" },
          ].map(({ key, icon: Icon, label }) => (
            <div key={key} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon className="w-4 h-4 text-gray-500" />
                <span className={isDark ? 'text-white' : 'text-gray-900'}>{label}</span>
              </div>
              <Switch
                checked={settings?.notifications?.[key] !== false}
                onCheckedChange={(val) => updateNotificationSetting(key, val)}
                disabled={!allEnabled}
                data-testid={`${key}-notifications-toggle`}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Accessibility Section
function AccessibilitySection({ isDark, t, settings, updateSetting }) {
  return (
    <div className="space-y-4">
      <div className={`p-4 rounded-xl ${isDark ? 'bg-[#121212]' : 'bg-white shadow-sm'}`}>
        <h3 className={`font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          {t('textSize') || "Text Size"}
        </h3>
        <Slider
          defaultValue={[settings?.textSize || 100]}
          min={80}
          max={150}
          step={10}
          onValueChange={(val) => updateSetting('textSize', val[0])}
        />
        <div className="flex justify-between mt-2 text-sm text-gray-500">
          <span>Small</span>
          <span>{settings?.textSize || 100}%</span>
          <span>Large</span>
        </div>
      </div>
      
      <div className={`p-4 rounded-xl ${isDark ? 'bg-[#121212]' : 'bg-white shadow-sm'}`}>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className={isDark ? 'text-white' : 'text-gray-900'}>{t('reduceMotion') || "Reduce Motion"}</p>
              <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                Minimize animations
              </p>
            </div>
            <Switch
              checked={settings?.reduceMotion || false}
              onCheckedChange={(val) => { updateSetting('reduceMotion', val); haptic.light(); }}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <p className={isDark ? 'text-white' : 'text-gray-900'}>{t('highContrast') || "High Contrast"}</p>
              <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                Increase visual contrast
              </p>
            </div>
            <Switch
              checked={settings?.highContrast || false}
              onCheckedChange={(val) => { updateSetting('highContrast', val); haptic.light(); }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// Tab Bar Section
function TabBarSection({ isDark, t, settings, updateSetting }) {
  return (
    <div className="space-y-4" data-testid="tabbar-section">
      <div className={`p-4 rounded-xl ${isDark ? 'bg-[#121212]' : 'bg-white shadow-sm'}`}>
        <h3 className={`font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          {t('customizeTabBar') || "Customize Tab Bar"}
        </h3>
        <p className={`text-sm mb-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          Choose which tabs appear in the bottom navigation
        </p>
        
        {[
          { key: "home", label: "Home", icon: HomeIcon },
          { key: "chat", label: "Chat", icon: MessageCircle },
          { key: "ai", label: "AI Assistant", icon: Bot },
          { key: "reels", label: "Reels", icon: Film },
        ].map(({ key, label, icon: Icon }) => (
          <div key={key} className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              <Icon className="w-5 h-5 text-gray-500" />
              <span className={isDark ? 'text-white' : 'text-gray-900'}>{label}</span>
            </div>
            <Switch
              data-testid={`tabbar-${key}-toggle`}
              checked={settings?.tabBar?.[key] !== false}
              onCheckedChange={(val) => { updateSetting(`tabBar.${key}`, val); haptic.light(); }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// Media Section
function MediaSection({ isDark, t, settings, updateSetting }) {
  return (
    <div className="space-y-4" data-testid="media-section">
      <div className={`p-4 rounded-xl ${isDark ? 'bg-[#121212]' : 'bg-white shadow-sm'}`}>
        <h3 className={`font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          {t('autoplay') || "Autoplay"}
        </h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className={isDark ? 'text-white' : 'text-gray-900'}>{t('autoplayVideos') || "Autoplay Videos"}</p>
              <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                Play videos automatically
              </p>
            </div>
            <Switch
              data-testid="autoplay-videos-toggle"
              checked={settings?.autoplayVideos !== false}
              onCheckedChange={(val) => { updateSetting('autoplayVideos', val); haptic.light(); }}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <p className={isDark ? 'text-white' : 'text-gray-900'}>{t('autoplayOnData') || "Autoplay on Mobile Data"}</p>
              <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                Use mobile data for videos
              </p>
            </div>
            <Switch
              checked={settings?.autoplayOnData || false}
              onCheckedChange={(val) => { updateSetting('autoplayOnData', val); haptic.light(); }}
            />
          </div>
        </div>
      </div>
      
      <div className={`p-4 rounded-xl ${isDark ? 'bg-[#121212]' : 'bg-white shadow-sm'}`}>
        <h3 className={`font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          {t('videoQuality') || "Video Quality"}
        </h3>
        <Select defaultValue={settings?.videoQuality || "auto"}>
          <SelectTrigger className={isDark ? 'bg-[#1A1A1A] border-white/10' : ''}>
            <SelectValue placeholder="Select quality" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="auto">Auto</SelectItem>
            <SelectItem value="high">High (1080p)</SelectItem>
            <SelectItem value="medium">Medium (720p)</SelectItem>
            <SelectItem value="low">Low (480p)</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

// Time Management Section
function TimeManagementSection({ isDark, t, settings, updateSetting }) {
  return (
    <div className="space-y-4" data-testid="time-management-section">
      <div className={`p-4 rounded-xl ${isDark ? 'bg-[#121212]' : 'bg-white shadow-sm'}`}>
        <h3 className={`font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          {t('screenTime') || "Screen Time"}
        </h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className={isDark ? 'text-white' : 'text-gray-900'}>{t('dailyReminder') || "Daily Reminder"}</p>
              <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                Remind me after daily limit
              </p>
            </div>
            <Switch
              data-testid="daily-reminder-toggle"
              checked={settings?.dailyReminder || false}
              onCheckedChange={(val) => { updateSetting('dailyReminder', val); haptic.light(); }}
            />
          </div>
        </div>
      </div>
      
      <div className={`p-4 rounded-xl ${isDark ? 'bg-[#121212]' : 'bg-white shadow-sm'}`}>
        <h3 className={`font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          {t('dailyLimit') || "Daily Limit"}
        </h3>
        <Slider
          data-testid="daily-limit-slider"
          defaultValue={[settings?.dailyLimit || 120]}
          min={15}
          max={480}
          step={15}
          onValueChange={(val) => updateSetting('dailyLimit', val[0])}
        />
        <p className={`text-center mt-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          {Math.floor((settings?.dailyLimit || 120) / 60)}h {(settings?.dailyLimit || 120) % 60}m per day
        </p>
      </div>
    </div>
  );
}

// Browser Section
function BrowserSection({ isDark, t, settings, updateSetting }) {
  return (
    <div className="space-y-4" data-testid="browser-section">
      <div className={`p-4 rounded-xl ${isDark ? 'bg-[#121212]' : 'bg-white shadow-sm'}`}>
        <h3 className={`font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          {t('inAppBrowser') || "In-App Browser"}
        </h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className={isDark ? 'text-white' : 'text-gray-900'}>{t('useInAppBrowser') || "Use In-App Browser"}</p>
              <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                Open links inside the app
              </p>
            </div>
            <Switch
              data-testid="in-app-browser-toggle"
              checked={settings?.useInAppBrowser !== false}
              onCheckedChange={(val) => { updateSetting('useInAppBrowser', val); haptic.light(); }}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <p className={isDark ? 'text-white' : 'text-gray-900'}>{t('clearBrowsingData') || "Clear Browsing Data"}</p>
              <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                Clear cookies and cache
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => toast.success("Browsing data cleared")} data-testid="clear-browsing-data-btn">
              Clear
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Sharing Suggestions Section
function SharingSuggestionsSection({ isDark, t, settings, updateSetting }) {
  return (
    <div className="space-y-4" data-testid="sharing-suggestions-section">
      <div className={`p-4 rounded-xl ${isDark ? 'bg-[#121212]' : 'bg-white shadow-sm'}`}>
        <h3 className={`font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          {t('gallerySuggestions') || "Gallery Suggestions"}
        </h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className={isDark ? 'text-white' : 'text-gray-900'}>{t('suggestPhotos') || "Suggest Photos"}</p>
              <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                Show photos to share from your gallery
              </p>
            </div>
            <Switch
              data-testid="suggest-photos-toggle"
              checked={settings?.suggestPhotos !== false}
              onCheckedChange={(val) => { updateSetting('suggestPhotos', val); haptic.light(); }}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <p className={isDark ? 'text-white' : 'text-gray-900'}>{t('suggestPeople') || "Suggest People"}</p>
              <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                Suggest people to share with
              </p>
            </div>
            <Switch
              data-testid="suggest-people-toggle"
              checked={settings?.suggestPeople !== false}
              onCheckedChange={(val) => { updateSetting('suggestPeople', val); haptic.light(); }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
