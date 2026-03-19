import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown, ChevronRight, Settings, File, Upload, RefreshCw,
  Globe, Monitor, Type, User, Shield, Bell, Lock, Eye, EyeOff,
  MessageCircle, Palette, Image, Download, Check, Keyboard,
  HelpCircle, Phone, LogOut, Camera, Mic, Speaker, Volume2,
  Moon, Sun, X, Info, FileText, Star, Send, Smile, Languages
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { useSettings } from "@/context/SettingsContext";
import ElectronUpdateButton from "@/components/ElectronUpdateButton";

// World Languages List
const WORLD_LANGUAGES = [
  { code: "en", name: "English", native: "English" },
  { code: "es", name: "Spanish", native: "Español" },
  { code: "fr", name: "French", native: "Français" },
  { code: "de", name: "German", native: "Deutsch" },
  { code: "it", name: "Italian", native: "Italiano" },
  { code: "pt", name: "Portuguese", native: "Português" },
  { code: "ru", name: "Russian", native: "Русский" },
  { code: "zh", name: "Chinese (Simplified)", native: "简体中文" },
  { code: "zh-TW", name: "Chinese (Traditional)", native: "繁體中文" },
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
  { code: "ur", name: "Urdu", native: "اردو" },
  { code: "fa", name: "Persian", native: "فارسی" },
  { code: "tr", name: "Turkish", native: "Türkçe" },
  { code: "vi", name: "Vietnamese", native: "Tiếng Việt" },
  { code: "th", name: "Thai", native: "ไทย" },
  { code: "id", name: "Indonesian", native: "Bahasa Indonesia" },
  { code: "ms", name: "Malay", native: "Bahasa Melayu" },
  { code: "fil", name: "Filipino", native: "Filipino" },
  { code: "nl", name: "Dutch", native: "Nederlands" },
  { code: "pl", name: "Polish", native: "Polski" },
  { code: "uk", name: "Ukrainian", native: "Українська" },
  { code: "ro", name: "Romanian", native: "Română" },
  { code: "el", name: "Greek", native: "Ελληνικά" },
  { code: "cs", name: "Czech", native: "Čeština" },
  { code: "sv", name: "Swedish", native: "Svenska" },
  { code: "hu", name: "Hungarian", native: "Magyar" },
  { code: "fi", name: "Finnish", native: "Suomi" },
  { code: "da", name: "Danish", native: "Dansk" },
  { code: "no", name: "Norwegian", native: "Norsk" },
  { code: "he", name: "Hebrew", native: "עברית" },
  { code: "sw", name: "Swahili", native: "Kiswahili" },
  { code: "af", name: "Afrikaans", native: "Afrikaans" },
  { code: "zu", name: "Zulu", native: "isiZulu" },
  { code: "am", name: "Amharic", native: "አማርኛ" },
  { code: "ne", name: "Nepali", native: "नेपाली" },
  { code: "si", name: "Sinhala", native: "සිංහල" },
  { code: "my", name: "Burmese", native: "မြန်မာ" },
  { code: "km", name: "Khmer", native: "ខ្មែរ" },
  { code: "lo", name: "Lao", native: "ລາວ" },
  { code: "ka", name: "Georgian", native: "ქართული" },
  { code: "hy", name: "Armenian", native: "Հայերdelays" },
  { code: "az", name: "Azerbaijani", native: "Azərbaycan" },
  { code: "uz", name: "Uzbek", native: "O'zbek" },
  { code: "kk", name: "Kazakh", native: "Қазақ" },
  { code: "mn", name: "Mongolian", native: "Монгол" },
  { code: "sr", name: "Serbian", native: "Српски" },
  { code: "hr", name: "Croatian", native: "Hrvatski" },
  { code: "sk", name: "Slovak", native: "Slovenčina" },
  { code: "sl", name: "Slovenian", native: "Slovenščina" },
  { code: "bg", name: "Bulgarian", native: "Български" },
  { code: "mk", name: "Macedonian", native: "Македонски" },
  { code: "et", name: "Estonian", native: "Eesti" },
  { code: "lv", name: "Latvian", native: "Latviešu" },
  { code: "lt", name: "Lithuanian", native: "Lietuvių" },
  { code: "sq", name: "Albanian", native: "Shqip" },
  { code: "bs", name: "Bosnian", native: "Bosanski" },
  { code: "mt", name: "Maltese", native: "Malti" },
  { code: "is", name: "Icelandic", native: "Íslenska" },
  { code: "ga", name: "Irish", native: "Gaeilge" },
  { code: "cy", name: "Welsh", native: "Cymraeg" },
  { code: "eu", name: "Basque", native: "Euskara" },
  { code: "ca", name: "Catalan", native: "Català" },
  { code: "gl", name: "Galician", native: "Galego" },
];

// Text Size Options
const TEXT_SIZES = [
  { value: "xs", label: "Extra Small", scale: 0.8 },
  { value: "sm", label: "Small", scale: 0.9 },
  { value: "md", label: "Medium (Default)", scale: 1 },
  { value: "lg", label: "Large", scale: 1.1 },
  { value: "xl", label: "Extra Large", scale: 1.2 },
  { value: "2xl", label: "2X Large", scale: 1.3 },
];

// Chat Themes
const CHAT_THEMES = [
  { id: "default", name: "Default", primary: "#00F0FF", secondary: "#7000FF" },
  { id: "ocean", name: "Ocean Blue", primary: "#0077B6", secondary: "#023E8A" },
  { id: "forest", name: "Forest Green", primary: "#2D6A4F", secondary: "#1B4332" },
  { id: "sunset", name: "Sunset", primary: "#F77F00", secondary: "#D62828" },
  { id: "lavender", name: "Lavender", primary: "#9B5DE5", secondary: "#7400B8" },
  { id: "rose", name: "Rose", primary: "#FF4D6D", secondary: "#C9184A" },
  { id: "midnight", name: "Midnight", primary: "#3A0CA3", secondary: "#240046" },
  { id: "minimal", name: "Minimal", primary: "#6B7280", secondary: "#374151" },
];

// Media Quality Options
const MEDIA_QUALITY_OPTIONS = [
  { value: "auto", label: "Auto (Recommended)" },
  { value: "high", label: "High Quality" },
  { value: "medium", label: "Medium Quality" },
  { value: "low", label: "Low Quality (Data Saver)" },
];

// Keyboard Shortcuts
const KEYBOARD_SHORTCUTS = [
  { action: "Send Message", shortcut: "Enter" },
  { action: "New Line", shortcut: "Shift + Enter" },
  { action: "Search", shortcut: "Ctrl + F" },
  { action: "Settings", shortcut: "Ctrl + ," },
  { action: "New Chat", shortcut: "Ctrl + N" },
  { action: "Close Chat", shortcut: "Ctrl + W" },
  { action: "Mute Conversation", shortcut: "Ctrl + M" },
  { action: "Archive Chat", shortcut: "Ctrl + E" },
  { action: "Delete Chat", shortcut: "Ctrl + D" },
  { action: "Toggle Dark Mode", shortcut: "Ctrl + Shift + D" },
  { action: "Emoji Picker", shortcut: "Ctrl + ." },
  { action: "Voice Call", shortcut: "Ctrl + Shift + V" },
  { action: "Video Call", shortcut: "Ctrl + Shift + C" },
];

export default function DesktopSettings({ isOpen, onClose }) {
  const { user, logout } = useAuth();
  const { settings, updateSetting, isDark, setTheme, theme } = useSettings();
  
  // Local state for desktop-specific settings
  const [desktopSettings, setDesktopSettings] = useState({
    // General
    openOnLogin: false,
    minimizeToTray: true,
    language: "en",
    spellCheckLanguage: "en",
    textSize: "md",
    
    // Account
    securityNotifications: true,
    
    // Privacy
    hideOnlineStatus: false,
    hideReadReceipts: false,
    hideTypingIndicator: false,
    blockScreenshots: false,
    
    // Chat
    chatTheme: "default",
    chatBackground: "default",
    mediaUploadQuality: "auto",
    autoDownloadPhotos: true,
    autoDownloadVideos: false,
    autoDownloadDocuments: true,
    spellCheck: true,
    replaceTextWithEmojis: true,
    enterToSend: true,
    
    // Video & Voice
    defaultCamera: "default",
    defaultMicrophone: "default",
    defaultSpeaker: "default",
    
    // Notifications
    showNotificationBanner: true,
    showNotificationBadge: true,
    messageNotifications: true,
    showMessagePreview: true,
    reactionNotifications: true,
    statusReactionNotifications: false,
  });

  // Dialog states
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [showHelpDialog, setShowHelpDialog] = useState(false);
  const [showDeleteAccountDialog, setShowDeleteAccountDialog] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Devices
  const [cameras, setCameras] = useState([]);
  const [microphones, setMicrophones] = useState([]);
  const [speakers, setSpeakers] = useState([]);

  // Get media devices
  useEffect(() => {
    const getDevices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        setCameras(devices.filter(d => d.kind === 'videoinput'));
        setMicrophones(devices.filter(d => d.kind === 'audioinput'));
        setSpeakers(devices.filter(d => d.kind === 'audiooutput'));
      } catch (e) {
        console.log('Could not enumerate devices');
      }
    };
    getDevices();
  }, []);

  const updateDesktopSetting = (key, value) => {
    setDesktopSettings(prev => ({ ...prev, [key]: value }));
    toast.success("Setting updated");
  };

  const handleLogout = () => {
    logout();
    onClose();
    toast.success("Logged out successfully");
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`max-w-2xl max-h-[85vh] p-0 ${isDark ? 'bg-[#0A0A0A] border-white/10' : 'bg-white'}`}>
        <DialogHeader className={`p-4 border-b ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
          <DialogTitle className={`flex items-center gap-2 ${isDark ? 'text-white' : ''}`}>
            <Settings className="w-5 h-5" />
            Settings
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[calc(85vh-80px)]">
          <div className="p-4">
            <Accordion type="multiple" className="space-y-2">
              
              {/* FILE SECTION */}
              <AccordionItem value="file" className={`border rounded-lg ${isDark ? 'border-white/10 bg-[#121212]' : 'border-gray-200 bg-white'}`}>
                <AccordionTrigger className={`px-4 hover:no-underline ${isDark ? 'text-white hover:bg-white/5' : 'hover:bg-gray-50'}`}>
                  <div className="flex items-center gap-3">
                    <File className="w-5 h-5 text-blue-500" />
                    <span>File</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4 space-y-3">
                  <Button variant="ghost" className={`w-full justify-start ${isDark ? 'hover:bg-white/5' : ''}`}>
                    <Settings className="w-4 h-4 mr-3" />
                    Preferences
                  </Button>
                  <Button variant="ghost" className={`w-full justify-start ${isDark ? 'hover:bg-white/5' : ''}`}>
                    <Upload className="w-4 h-4 mr-3" />
                    Upload Photos and Videos
                  </Button>
                  <Button variant="ghost" className={`w-full justify-start ${isDark ? 'hover:bg-white/5' : ''}`}>
                    <RefreshCw className="w-4 h-4 mr-3" />
                    Syncing Previous Messages
                  </Button>
                  
                  <Separator className={isDark ? 'bg-white/10' : ''} />
                  
                  {/* Auto Update Button - Electron Only */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={isDark ? 'text-white' : ''}>Check for Updates</p>
                      <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Download and install updates</p>
                    </div>
                    <ElectronUpdateButton variant="outline" size="sm" showLabel={true} />
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* GENERAL SECTION */}
              <AccordionItem value="general" className={`border rounded-lg ${isDark ? 'border-white/10 bg-[#121212]' : 'border-gray-200 bg-white'}`}>
                <AccordionTrigger className={`px-4 hover:no-underline ${isDark ? 'text-white hover:bg-white/5' : 'hover:bg-gray-50'}`}>
                  <div className="flex items-center gap-3">
                    <Monitor className="w-5 h-5 text-green-500" />
                    <span>General</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4 space-y-4">
                  {/* Open on Login */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={isDark ? 'text-white' : ''}>Open FaceConnect when you log in</p>
                      <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Start automatically with Windows</p>
                    </div>
                    <Switch
                      checked={desktopSettings.openOnLogin}
                      onCheckedChange={(v) => updateDesktopSetting('openOnLogin', v)}
                    />
                  </div>

                  {/* Minimize to Tray */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={isDark ? 'text-white' : ''}>Reduce notification bar</p>
                      <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Minimize to system tray</p>
                    </div>
                    <Switch
                      checked={desktopSettings.minimizeToTray}
                      onCheckedChange={(v) => updateDesktopSetting('minimizeToTray', v)}
                    />
                  </div>

                  {/* Language */}
                  <div>
                    <Label className={`mb-2 block ${isDark ? 'text-gray-400' : ''}`}>
                      <Globe className="w-4 h-4 inline mr-2" />
                      Language
                    </Label>
                    <Select
                      value={desktopSettings.language}
                      onValueChange={(v) => updateDesktopSetting('language', v)}
                    >
                      <SelectTrigger className={isDark ? 'bg-[#1A1A1A] border-white/10' : ''}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className={`max-h-60 ${isDark ? 'bg-[#1A1A1A] border-white/10' : ''}`}>
                        {WORLD_LANGUAGES.map(lang => (
                          <SelectItem key={lang.code} value={lang.code}>
                            {lang.name} ({lang.native})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Text Size */}
                  <div>
                    <Label className={`mb-2 block ${isDark ? 'text-gray-400' : ''}`}>
                      <Type className="w-4 h-4 inline mr-2" />
                      Text Size
                    </Label>
                    <Select
                      value={desktopSettings.textSize}
                      onValueChange={(v) => updateDesktopSetting('textSize', v)}
                    >
                      <SelectTrigger className={isDark ? 'bg-[#1A1A1A] border-white/10' : ''}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className={isDark ? 'bg-[#1A1A1A] border-white/10' : ''}>
                        {TEXT_SIZES.map(size => (
                          <SelectItem key={size.value} value={size.value}>
                            {size.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* ACCOUNT SECTION */}
              <AccordionItem value="account" className={`border rounded-lg ${isDark ? 'border-white/10 bg-[#121212]' : 'border-gray-200 bg-white'}`}>
                <AccordionTrigger className={`px-4 hover:no-underline ${isDark ? 'text-white hover:bg-white/5' : 'hover:bg-gray-50'}`}>
                  <div className="flex items-center gap-3">
                    <User className="w-5 h-5 text-purple-500" />
                    <span>Account</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={isDark ? 'text-white' : ''}>Security Notifications</p>
                      <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Alert when new login detected</p>
                    </div>
                    <Switch
                      checked={desktopSettings.securityNotifications}
                      onCheckedChange={(v) => updateDesktopSetting('securityNotifications', v)}
                    />
                  </div>
                  
                  <Button variant="outline" className={`w-full justify-start ${isDark ? 'border-white/10' : ''}`}>
                    <Shield className="w-4 h-4 mr-3" />
                    Request Account Info
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className={`w-full justify-start text-red-500 hover:text-red-600 ${isDark ? 'border-white/10' : ''}`}
                    onClick={() => setShowDeleteAccountDialog(true)}
                  >
                    <X className="w-4 h-4 mr-3" />
                    How to Delete My Account
                  </Button>
                </AccordionContent>
              </AccordionItem>

              {/* PRIVACY SECTION */}
              <AccordionItem value="privacy" className={`border rounded-lg ${isDark ? 'border-white/10 bg-[#121212]' : 'border-gray-200 bg-white'}`}>
                <AccordionTrigger className={`px-4 hover:no-underline ${isDark ? 'text-white hover:bg-white/5' : 'hover:bg-gray-50'}`}>
                  <div className="flex items-center gap-3">
                    <Lock className="w-5 h-5 text-red-500" />
                    <span>Privacy</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={isDark ? 'text-white' : ''}>Hide Online Status</p>
                      <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Others won't see when you're active</p>
                    </div>
                    <Switch
                      checked={desktopSettings.hideOnlineStatus}
                      onCheckedChange={(v) => updateDesktopSetting('hideOnlineStatus', v)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={isDark ? 'text-white' : ''}>Hide Read Receipts</p>
                      <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Others won't see when you read messages</p>
                    </div>
                    <Switch
                      checked={desktopSettings.hideReadReceipts}
                      onCheckedChange={(v) => updateDesktopSetting('hideReadReceipts', v)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={isDark ? 'text-white' : ''}>Hide Typing Indicator</p>
                      <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Others won't see when you're typing</p>
                    </div>
                    <Switch
                      checked={desktopSettings.hideTypingIndicator}
                      onCheckedChange={(v) => updateDesktopSetting('hideTypingIndicator', v)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={isDark ? 'text-white' : ''}>Block Screenshots</p>
                      <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Prevent screenshots in the app</p>
                    </div>
                    <Switch
                      checked={desktopSettings.blockScreenshots}
                      onCheckedChange={(v) => updateDesktopSetting('blockScreenshots', v)}
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* CHAT SECTION */}
              <AccordionItem value="chat" className={`border rounded-lg ${isDark ? 'border-white/10 bg-[#121212]' : 'border-gray-200 bg-white'}`}>
                <AccordionTrigger className={`px-4 hover:no-underline ${isDark ? 'text-white hover:bg-white/5' : 'hover:bg-gray-50'}`}>
                  <div className="flex items-center gap-3">
                    <MessageCircle className="w-5 h-5 text-cyan-500" />
                    <span>Chat</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4 space-y-4">
                  {/* Theme */}
                  <div>
                    <Label className={`mb-2 block ${isDark ? 'text-gray-400' : ''}`}>
                      <Palette className="w-4 h-4 inline mr-2" />
                      Theme
                    </Label>
                    <div className="grid grid-cols-4 gap-2">
                      {CHAT_THEMES.map(t => (
                        <button
                          key={t.id}
                          onClick={() => updateDesktopSetting('chatTheme', t.id)}
                          className={`p-2 rounded-lg border-2 transition-all ${
                            desktopSettings.chatTheme === t.id
                              ? 'border-[#00F0FF]'
                              : isDark ? 'border-white/10' : 'border-gray-200'
                          }`}
                        >
                          <div 
                            className="w-full h-6 rounded"
                            style={{ background: `linear-gradient(135deg, ${t.primary}, ${t.secondary})` }}
                          />
                          <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{t.name}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Background */}
                  <div>
                    <Label className={`mb-2 block ${isDark ? 'text-gray-400' : ''}`}>
                      <Image className="w-4 h-4 inline mr-2" />
                      Background
                    </Label>
                    <Select
                      value={desktopSettings.chatBackground}
                      onValueChange={(v) => updateDesktopSetting('chatBackground', v)}
                    >
                      <SelectTrigger className={isDark ? 'bg-[#1A1A1A] border-white/10' : ''}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className={isDark ? 'bg-[#1A1A1A] border-white/10' : ''}>
                        <SelectItem value="default">Default</SelectItem>
                        <SelectItem value="gradient1">Gradient Blue</SelectItem>
                        <SelectItem value="gradient2">Gradient Purple</SelectItem>
                        <SelectItem value="dark">Dark</SelectItem>
                        <SelectItem value="custom">Custom Image...</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Media Upload Quality */}
                  <div>
                    <Label className={`mb-2 block ${isDark ? 'text-gray-400' : ''}`}>
                      Media file upload quality
                    </Label>
                    <Select
                      value={desktopSettings.mediaUploadQuality}
                      onValueChange={(v) => updateDesktopSetting('mediaUploadQuality', v)}
                    >
                      <SelectTrigger className={isDark ? 'bg-[#1A1A1A] border-white/10' : ''}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className={isDark ? 'bg-[#1A1A1A] border-white/10' : ''}>
                        {MEDIA_QUALITY_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Auto Download */}
                  <div className="space-y-3">
                    <Label className={isDark ? 'text-gray-400' : ''}>Automatic media download</Label>
                    <div className="flex items-center justify-between">
                      <span className={`text-sm ${isDark ? 'text-white' : ''}`}>Photos</span>
                      <Switch
                        checked={desktopSettings.autoDownloadPhotos}
                        onCheckedChange={(v) => updateDesktopSetting('autoDownloadPhotos', v)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={`text-sm ${isDark ? 'text-white' : ''}`}>Videos</span>
                      <Switch
                        checked={desktopSettings.autoDownloadVideos}
                        onCheckedChange={(v) => updateDesktopSetting('autoDownloadVideos', v)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={`text-sm ${isDark ? 'text-white' : ''}`}>Documents</span>
                      <Switch
                        checked={desktopSettings.autoDownloadDocuments}
                        onCheckedChange={(v) => updateDesktopSetting('autoDownloadDocuments', v)}
                      />
                    </div>
                  </div>

                  <Separator className={isDark ? 'bg-white/10' : ''} />

                  {/* Spell Check */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={isDark ? 'text-white' : ''}>Spell Check</p>
                    </div>
                    <Switch
                      checked={desktopSettings.spellCheck}
                      onCheckedChange={(v) => updateDesktopSetting('spellCheck', v)}
                    />
                  </div>

                  {/* Replace text with Emojis */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={isDark ? 'text-white' : ''}>Replace text with Emojis</p>
                      <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>:) becomes 😊</p>
                    </div>
                    <Switch
                      checked={desktopSettings.replaceTextWithEmojis}
                      onCheckedChange={(v) => updateDesktopSetting('replaceTextWithEmojis', v)}
                    />
                  </div>

                  {/* Send key */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={isDark ? 'text-white' : ''}>Send key to send</p>
                      <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Press Enter to send messages</p>
                    </div>
                    <Switch
                      checked={desktopSettings.enterToSend}
                      onCheckedChange={(v) => updateDesktopSetting('enterToSend', v)}
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* VIDEO AND VOICE SECTION */}
              <AccordionItem value="video-voice" className={`border rounded-lg ${isDark ? 'border-white/10 bg-[#121212]' : 'border-gray-200 bg-white'}`}>
                <AccordionTrigger className={`px-4 hover:no-underline ${isDark ? 'text-white hover:bg-white/5' : 'hover:bg-gray-50'}`}>
                  <div className="flex items-center gap-3">
                    <Phone className="w-5 h-5 text-orange-500" />
                    <span>Video and Voice</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4 space-y-4">
                  {/* Camera */}
                  <div>
                    <Label className={`mb-2 block ${isDark ? 'text-gray-400' : ''}`}>
                      <Camera className="w-4 h-4 inline mr-2" />
                      Camera
                    </Label>
                    <Select
                      value={desktopSettings.defaultCamera}
                      onValueChange={(v) => updateDesktopSetting('defaultCamera', v)}
                    >
                      <SelectTrigger className={isDark ? 'bg-[#1A1A1A] border-white/10' : ''}>
                        <SelectValue placeholder="Select camera" />
                      </SelectTrigger>
                      <SelectContent className={isDark ? 'bg-[#1A1A1A] border-white/10' : ''}>
                        <SelectItem value="default">Default Camera</SelectItem>
                        {cameras.map(cam => (
                          <SelectItem key={cam.deviceId} value={cam.deviceId}>
                            {cam.label || `Camera ${cam.deviceId.slice(0,8)}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Microphone */}
                  <div>
                    <Label className={`mb-2 block ${isDark ? 'text-gray-400' : ''}`}>
                      <Mic className="w-4 h-4 inline mr-2" />
                      Microphone
                    </Label>
                    <Select
                      value={desktopSettings.defaultMicrophone}
                      onValueChange={(v) => updateDesktopSetting('defaultMicrophone', v)}
                    >
                      <SelectTrigger className={isDark ? 'bg-[#1A1A1A] border-white/10' : ''}>
                        <SelectValue placeholder="Select microphone" />
                      </SelectTrigger>
                      <SelectContent className={isDark ? 'bg-[#1A1A1A] border-white/10' : ''}>
                        <SelectItem value="default">Default Microphone</SelectItem>
                        {microphones.map(mic => (
                          <SelectItem key={mic.deviceId} value={mic.deviceId}>
                            {mic.label || `Microphone ${mic.deviceId.slice(0,8)}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Speakers */}
                  <div>
                    <Label className={`mb-2 block ${isDark ? 'text-gray-400' : ''}`}>
                      <Speaker className="w-4 h-4 inline mr-2" />
                      Speakers
                    </Label>
                    <Select
                      value={desktopSettings.defaultSpeaker}
                      onValueChange={(v) => updateDesktopSetting('defaultSpeaker', v)}
                    >
                      <SelectTrigger className={isDark ? 'bg-[#1A1A1A] border-white/10' : ''}>
                        <SelectValue placeholder="Select speakers" />
                      </SelectTrigger>
                      <SelectContent className={isDark ? 'bg-[#1A1A1A] border-white/10' : ''}>
                        <SelectItem value="default">Default Speakers</SelectItem>
                        {speakers.map(spk => (
                          <SelectItem key={spk.deviceId} value={spk.deviceId}>
                            {spk.label || `Speaker ${spk.deviceId.slice(0,8)}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* NOTIFICATIONS SECTION */}
              <AccordionItem value="notifications" className={`border rounded-lg ${isDark ? 'border-white/10 bg-[#121212]' : 'border-gray-200 bg-white'}`}>
                <AccordionTrigger className={`px-4 hover:no-underline ${isDark ? 'text-white hover:bg-white/5' : 'hover:bg-gray-50'}`}>
                  <div className="flex items-center gap-3">
                    <Bell className="w-5 h-5 text-yellow-500" />
                    <span>Notifications</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={isDark ? 'text-white' : ''}>Show Notification Banner</p>
                      <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Display desktop notifications</p>
                    </div>
                    <Switch
                      checked={desktopSettings.showNotificationBanner}
                      onCheckedChange={(v) => updateDesktopSetting('showNotificationBanner', v)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={isDark ? 'text-white' : ''}>Show Notification Badge in App Bar</p>
                      <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Show unread count on taskbar</p>
                    </div>
                    <Switch
                      checked={desktopSettings.showNotificationBadge}
                      onCheckedChange={(v) => updateDesktopSetting('showNotificationBadge', v)}
                    />
                  </div>

                  <Separator className={isDark ? 'bg-white/10' : ''} />
                  <p className={`font-medium ${isDark ? 'text-white' : ''}`}>Messages</p>

                  <div className="flex items-center justify-between">
                    <span className={isDark ? 'text-white' : ''}>Message Notifications</span>
                    <Switch
                      checked={desktopSettings.messageNotifications}
                      onCheckedChange={(v) => updateDesktopSetting('messageNotifications', v)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className={isDark ? 'text-white' : ''}>Show Previews</span>
                    <Switch
                      checked={desktopSettings.showMessagePreview}
                      onCheckedChange={(v) => updateDesktopSetting('showMessagePreview', v)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className={isDark ? 'text-white' : ''}>Show Reaction Notifications</span>
                    <Switch
                      checked={desktopSettings.reactionNotifications}
                      onCheckedChange={(v) => updateDesktopSetting('reactionNotifications', v)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className={isDark ? 'text-white' : ''}>Status Reactions</span>
                    <Switch
                      checked={desktopSettings.statusReactionNotifications}
                      onCheckedChange={(v) => updateDesktopSetting('statusReactionNotifications', v)}
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* KEYBOARD SHORTCUTS */}
              <AccordionItem value="keyboard" className={`border rounded-lg ${isDark ? 'border-white/10 bg-[#121212]' : 'border-gray-200 bg-white'}`}>
                <AccordionTrigger className={`px-4 hover:no-underline ${isDark ? 'text-white hover:bg-white/5' : 'hover:bg-gray-50'}`}>
                  <div className="flex items-center gap-3">
                    <Keyboard className="w-5 h-5 text-indigo-500" />
                    <span>Keyboard Shortcuts</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="space-y-2">
                    {KEYBOARD_SHORTCUTS.map((shortcut, i) => (
                      <div key={i} className="flex items-center justify-between py-2">
                        <span className={isDark ? 'text-white' : ''}>{shortcut.action}</span>
                        <kbd className={`px-2 py-1 rounded text-xs font-mono ${isDark ? 'bg-white/10 text-gray-300' : 'bg-gray-100 text-gray-700'}`}>
                          {shortcut.shortcut}
                        </kbd>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* HELP & FEEDBACK */}
              <AccordionItem value="help" className={`border rounded-lg ${isDark ? 'border-white/10 bg-[#121212]' : 'border-gray-200 bg-white'}`}>
                <AccordionTrigger className={`px-4 hover:no-underline ${isDark ? 'text-white hover:bg-white/5' : 'hover:bg-gray-50'}`}>
                  <div className="flex items-center gap-3">
                    <HelpCircle className="w-5 h-5 text-teal-500" />
                    <span>Help & Feedback</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4 space-y-2">
                  <Button variant="ghost" className={`w-full justify-start ${isDark ? 'hover:bg-white/5' : ''}`}>
                    <HelpCircle className="w-4 h-4 mr-3" />
                    Help Center
                  </Button>
                  <Button variant="ghost" className={`w-full justify-start ${isDark ? 'hover:bg-white/5' : ''}`}>
                    <MessageCircle className="w-4 h-4 mr-3" />
                    Contact Us
                  </Button>
                  <Button variant="ghost" className={`w-full justify-start ${isDark ? 'hover:bg-white/5' : ''}`}>
                    <Send className="w-4 h-4 mr-3" />
                    Send Feedback
                  </Button>
                  <Button variant="ghost" className={`w-full justify-start ${isDark ? 'hover:bg-white/5' : ''}`}>
                    <Star className="w-4 h-4 mr-3" />
                    Rate App
                  </Button>
                  <Button variant="ghost" className={`w-full justify-start ${isDark ? 'hover:bg-white/5' : ''}`}>
                    <FileText className="w-4 h-4 mr-3" />
                    Terms & Privacy Policy
                  </Button>
                </AccordionContent>
              </AccordionItem>

            </Accordion>

            {/* LOG OUT BUTTON */}
            <div className="mt-6">
              <Button 
                variant="outline" 
                className={`w-full text-red-500 hover:text-red-600 hover:bg-red-500/10 ${isDark ? 'border-white/10' : ''}`}
                onClick={() => setShowLogoutConfirm(true)}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Log Out
              </Button>
            </div>

            {/* App Version */}
            <div className="text-center mt-4">
              <p className={`text-xs ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                FaceConnect Desktop v2.5.2
              </p>
            </div>
          </div>
        </ScrollArea>

        {/* Delete Account Dialog */}
        <Dialog open={showDeleteAccountDialog} onOpenChange={setShowDeleteAccountDialog}>
          <DialogContent className={isDark ? 'bg-[#121212] border-white/10' : ''}>
            <DialogHeader>
              <DialogTitle className="text-red-500">Delete Account</DialogTitle>
            </DialogHeader>
            <div className={`space-y-4 ${isDark ? 'text-gray-300' : ''}`}>
              <p>To delete your account:</p>
              <ol className="list-decimal list-inside space-y-2 text-sm">
                <li>Go to Settings {'>'} Account {'>'} Delete Account</li>
                <li>Enter your password to confirm</li>
                <li>Your data will be permanently deleted after 30 days</li>
                <li>You can cancel deletion within 30 days by logging back in</li>
              </ol>
              <p className="text-sm text-yellow-500">Warning: This action cannot be undone after 30 days.</p>
            </div>
          </DialogContent>
        </Dialog>

        {/* Logout Confirmation */}
        <Dialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
          <DialogContent className={isDark ? 'bg-[#121212] border-white/10' : ''}>
            <DialogHeader>
              <DialogTitle className="text-red-500">Log Out</DialogTitle>
            </DialogHeader>
            <p className={isDark ? 'text-gray-300' : ''}>Are you sure you want to log out?</p>
            <div className="flex gap-3 mt-4">
              <Button variant="outline" onClick={() => setShowLogoutConfirm(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleLogout} className="flex-1 bg-red-500 hover:bg-red-600 text-white">
                Log Out
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}
