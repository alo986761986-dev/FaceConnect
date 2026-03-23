import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  MessageCircle, Phone, Circle, Radio, Users, ImageIcon, 
  Gamepad2, Sparkles, Brain, Settings, Moon, Sun, LogOut, Languages,
  Share2, ExternalLink, ArrowLeft, X, Chrome, Music, Maximize2, Minimize2, Minus,
  ChevronLeft, ChevronRight, Menu
} from "lucide-react";
import { 
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/context/LanguageContext";

// Social media links
const socialLinks = [
  { name: 'Facebook', url: 'https://www.facebook.com', color: '#1877F2', icon: (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  )},
  { name: 'Instagram', url: 'https://www.instagram.com', color: '#E4405F', icon: (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
    </svg>
  )},
  { name: 'TikTok', url: 'https://www.tiktok.com', color: '#000000', icon: (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
    </svg>
  )},
  { name: 'WhatsApp', url: 'https://web.whatsapp.com', color: '#25D366', icon: (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  )},
  { name: 'YouTube', url: 'https://www.youtube.com', color: '#FF0000', icon: (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
    </svg>
  )},
  { name: 'Telegram', url: 'https://web.telegram.org', color: '#0088cc', icon: (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
    </svg>
  )},
];

// Spotify Icon SVG
const SpotifyIcon = ({ className = "w-6 h-6" }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
  </svg>
);

// Apple Music Icon SVG
const AppleMusicIcon = ({ className = "w-6 h-6" }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M23.994 6.124a9.23 9.23 0 00-.24-2.19c-.317-1.31-1.062-2.31-2.18-3.043a5.022 5.022 0 00-1.877-.726 10.496 10.496 0 00-1.564-.15c-.04-.003-.083-.01-.124-.013H5.986c-.152.01-.303.017-.455.026-.747.043-1.49.123-2.193.4-1.336.53-2.3 1.452-2.865 2.78-.192.448-.292.925-.363 1.408-.056.392-.088.785-.1 1.18 0 .032-.007.062-.01.093v12.223c.01.14.017.283.027.424.05.815.154 1.624.497 2.373.65 1.42 1.738 2.353 3.234 2.801.42.127.856.187 1.293.228.555.053 1.11.06 1.667.06h11.03a12.5 12.5 0 001.57-.1c.822-.106 1.596-.35 2.295-.81a5.046 5.046 0 001.88-2.207c.186-.42.293-.87.37-1.324.113-.675.138-1.358.137-2.04-.002-3.8 0-7.595-.003-11.393zm-6.423 3.99v5.712c0 .417-.058.827-.244 1.206-.29.59-.76.962-1.388 1.14-.35.1-.706.157-1.07.173-.95.042-1.785-.455-2.107-1.323-.263-.71-.167-1.39.27-2.02.367-.53.883-.837 1.498-.99a7.077 7.077 0 011.197-.2c.4-.033.8-.06 1.197-.118.12-.017.237-.063.346-.107.136-.054.19-.154.19-.306V8.293c0-.16-.058-.252-.207-.293-.096-.026-.195-.04-.294-.05-.36-.038-.722-.063-1.08-.104-1.017-.114-2.033-.24-3.05-.356-1.045-.12-2.088-.24-3.132-.363-.34-.04-.68-.09-1.02-.124-.054-.006-.108 0-.16.008-.12.02-.18.1-.18.226v7.63c0 .32-.02.64-.09.953-.142.625-.497 1.108-1.028 1.465-.342.23-.723.36-1.13.41-.678.085-1.334.02-1.95-.31-.453-.24-.786-.593-.965-1.074-.243-.65-.2-1.29.1-1.907.27-.557.71-.943 1.27-1.186.357-.155.734-.242 1.12-.287.468-.054.938-.093 1.403-.156.168-.023.334-.07.49-.124.16-.057.23-.165.228-.34-.002-2.423 0-4.847-.004-7.27 0-.16.042-.29.163-.398.1-.09.218-.14.35-.14.16.002.32.018.48.036 1.32.153 2.64.308 3.96.46 1.667.194 3.335.387 5.003.583.59.07 1.178.147 1.768.218.19.023.35.09.46.27.06.1.08.21.08.32z"/>
  </svg>
);

// SoundCloud Icon SVG
const SoundCloudIcon = ({ className = "w-6 h-6" }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M1.175 12.225c-.051 0-.094.046-.101.1l-.233 2.154.233 2.105c.007.058.05.098.101.098.05 0 .09-.04.099-.098l.255-2.105-.27-2.154c-.009-.06-.052-.1-.102-.1m-.899.828c-.06 0-.091.037-.104.094L0 14.479l.165 1.308c.014.057.045.094.09.094.042 0 .075-.037.09-.094l.195-1.308-.195-1.332c-.015-.057-.045-.094-.09-.094m1.83-1.229c-.06 0-.105.039-.12.09l-.21 2.563.225 2.458c.015.06.06.09.12.09.061 0 .105-.03.12-.09l.256-2.443-.27-2.578c-.015-.06-.06-.09-.12-.09m.945-.089c-.075 0-.135.06-.15.135l-.193 2.64.21 2.544c.016.077.075.135.15.135.074 0 .12-.058.135-.135l.24-2.529-.24-2.655c-.016-.075-.06-.135-.135-.135m1.124.076c-.09 0-.149.075-.165.165l-.176 2.55.194 2.505c.016.09.075.164.165.164.09 0 .149-.074.164-.164l.209-2.505-.224-2.55c-.015-.09-.074-.165-.164-.165m.976-.239c-.09 0-.165.075-.179.164l-.176 2.775.191 2.52c.014.091.089.165.179.165.091 0 .165-.074.18-.165l.209-2.52-.21-2.775c-.014-.09-.089-.164-.179-.164m1.139-.569c-.105 0-.179.09-.194.194l-.164 3.36.18 2.475c.015.105.09.18.194.18.105 0 .18-.075.195-.18l.195-2.475-.21-3.36c-.015-.105-.09-.194-.195-.194m.989-.299c-.12 0-.209.09-.224.21l-.15 3.63.165 2.446c.015.12.105.21.224.21.12 0 .209-.09.225-.21l.18-2.446-.18-3.63c-.016-.12-.105-.21-.225-.21m1.125-.27c-.135 0-.239.105-.254.24l-.135 3.885.15 2.407c.015.135.12.24.255.24.135 0 .24-.105.255-.24l.165-2.407-.165-3.885c-.015-.135-.12-.24-.255-.24m1.065-.12c-.15 0-.255.105-.27.255l-.12 3.99.135 2.37c.015.15.12.27.27.27.149 0 .254-.12.27-.27l.149-2.37-.149-3.99c-.016-.15-.121-.255-.271-.255m1.064-.181c-.164 0-.284.12-.299.285l-.105 4.156.12 2.355c.015.166.135.286.3.286.165 0 .284-.12.299-.286l.135-2.355-.134-4.156c-.016-.165-.135-.285-.3-.285m1.14-.119c-.18 0-.315.135-.329.315l-.091 4.26.105 2.325c.014.18.149.315.33.315.178 0 .313-.135.328-.315l.12-2.325-.12-4.26c-.015-.18-.15-.315-.33-.315m1.062-.075c-.194 0-.329.149-.345.345l-.074 4.32.09 2.295c.015.195.15.345.345.345.195 0 .33-.15.346-.345l.104-2.295-.104-4.32c-.016-.196-.15-.345-.346-.345m1.095 0c-.209 0-.359.165-.375.375l-.06 4.305.075 2.28c.015.209.165.375.375.375.209 0 .359-.165.375-.375l.09-2.28-.09-4.305c-.015-.21-.165-.375-.375-.375m1.14 0c-.225 0-.375.18-.391.405l-.045 4.29.061 2.265c.015.225.165.405.39.405.226 0 .376-.18.391-.405l.075-2.265-.075-4.29c-.015-.225-.165-.405-.391-.405m1.53.645c-.074-.18-.255-.3-.449-.3-.195 0-.375.12-.449.3-.03.06-.03.135-.03.195l.045 4.41-.06 2.236c0 .06.015.12.03.165.075.165.255.27.449.27.196 0 .361-.105.436-.255.015-.045.03-.105.03-.165l.075-2.235-.076-4.396c0-.06 0-.135-.03-.195m1.35-.405c-.255 0-.465.21-.479.465l-.046 4.785.061 2.19c.015.255.225.465.48.465.255 0 .465-.21.48-.465l.074-2.19-.074-4.785c-.016-.255-.225-.465-.48-.465m1.095-.165c-.27 0-.495.225-.51.495l-.03 4.935.045 2.16c.016.271.24.496.51.496.271 0 .496-.225.51-.495l.061-2.16-.061-4.936c-.014-.27-.239-.495-.51-.495m1.604.405c-.015-.3-.27-.54-.585-.54-.3 0-.555.225-.585.525l-.015 4.935.03 2.13c.015.315.271.555.585.555.3 0 .555-.24.585-.555l.045-2.13-.044-4.92m.99-.555c-.315 0-.585.27-.6.6l-.016 5.04.031 2.1c.016.33.286.6.601.6.315 0 .585-.27.6-.6l.046-2.1-.046-5.04c-.015-.33-.285-.6-.6-.6m1.59.015c-.33 0-.601.285-.615.615l-.016 5.01.031 2.085c.015.345.285.615.615.615.33 0 .601-.27.616-.615l.045-2.085-.045-5.01c-.015-.33-.285-.615-.616-.615m2.34-.165c-.375 0-.689.3-.705.675v.015l-.03 5.19.045 2.055c.015.375.33.675.705.675.375 0 .69-.3.705-.675l.046-2.055-.046-5.19c-.015-.39-.33-.69-.705-.69m1.184.735v-.015c-.015-.39-.33-.72-.72-.72s-.705.33-.72.72v.015l-.031 5.445.031 2.025c.016.405.33.72.72.72.391 0 .705-.315.721-.72l.044-2.025-.044-5.445m.975-.615c-.405 0-.735.345-.75.75l-.016 5.325.031 2.01c.015.406.345.75.75.75.405 0 .735-.345.75-.75l.045-2.01-.045-5.325c-.015-.405-.345-.75-.75-.75m1.635.36c-.045-.405-.39-.72-.81-.72-.405 0-.75.315-.795.72l-.015 5.685.03 1.98c.045.405.39.72.795.72.42 0 .765-.315.81-.72l.03-1.98-.03-5.685m1.17-.555c-.435 0-.795.36-.81.795l-.016 5.925.031 1.965c.015.435.375.795.81.795.436 0 .796-.36.81-.795l.046-1.965-.046-5.925c-.015-.435-.375-.795-.81-.795"/>
  </svg>
);

// YouTube Music Icon SVG
const YouTubeMusicIcon = ({ className = "w-6 h-6" }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M12 0C5.376 0 0 5.376 0 12s5.376 12 12 12 12-5.376 12-12S18.624 0 12 0zm0 19.104c-3.924 0-7.104-3.18-7.104-7.104S8.076 4.896 12 4.896s7.104 3.18 7.104 7.104-3.18 7.104-7.104 7.104zm0-13.332c-3.432 0-6.228 2.796-6.228 6.228S8.568 18.228 12 18.228s6.228-2.796 6.228-6.228S15.432 5.772 12 5.772zM9.684 15.54V8.46L15.816 12l-6.132 3.54z"/>
  </svg>
);

// Sidebar item configuration with badges
export const getSidebarItems = (unreadCount = 0, t = (key) => key) => [
  { id: 'chat', icon: MessageCircle, label: t('chats') || 'Chats', tooltip: 'View and start conversations', badge: unreadCount },
  { id: 'calls', icon: Phone, label: t('calls') || 'Calls', tooltip: 'Make voice and video calls', badge: 2 },
  { id: 'status', icon: Circle, label: t('status') || 'Status', tooltip: 'View status updates', badge: 5 },
  { id: 'channels', icon: Radio, label: t('channels') || 'Channels', tooltip: 'Discover channels', badge: 3 },
  { id: 'community', icon: Users, label: t('community') || 'Community', tooltip: 'Join communities', badge: 1 },
  { id: 'media', icon: ImageIcon, label: t('media') || 'Media', tooltip: 'Browse media files', badge: 0 },
  { id: 'games', icon: Gamepad2, label: t('games') || 'Games', tooltip: 'Play games', badge: 2 },
  { id: 'translate', icon: Languages, label: 'Translate', tooltip: 'Translation & dictionary', badge: 0 },
  { id: 'copilot', icon: Sparkles, label: 'Copilot', tooltip: 'Microsoft Copilot AI', badge: 1 },
  { id: 'ai', icon: Brain, label: t('ai') || 'AI', tooltip: 'AI Assistant', badge: 0 },
];

// 3D Button Animation Variants
const buttonVariants = {
  initial: { 
    opacity: 0, 
    x: -20,
    rotateY: -15,
    scale: 0.9
  },
  animate: (i) => ({ 
    opacity: 1, 
    x: 0,
    rotateY: 0,
    scale: 1,
    transition: { 
      delay: i * 0.05,
      duration: 0.4,
      ease: [0.25, 0.46, 0.45, 0.94]
    }
  }),
  hover: { 
    scale: 1.08,
    rotateY: 8,
    z: 20,
    transition: { 
      duration: 0.2,
      ease: "easeOut"
    }
  },
  tap: { 
    scale: 0.95,
    rotateY: 0,
  }
};

export default function DesktopSidebar({ 
  isDark, 
  activeSidebarTab, 
  setActiveSidebarTab,
  unreadCount = 0,
  onAloClick,
  showAlo,
  setShowSettings,
  showSettings,
  toggleTheme,
  logout,
  onOpenPopup,
  openExternalLink, // For opening external links
  sidebarCollapsed,
  setSidebarCollapsed
}) {
  const { t } = useLanguage();
  const sidebarItems = getSidebarItems(unreadCount, t);
  const [showSocialPopup, setShowSocialPopup] = useState(false);
  const [showMusicHubPopup, setShowMusicHubPopup] = useState(false);
  const [showSpotifyPopup, setShowSpotifyPopup] = useState(false);
  const [isSpotifyMaximized, setIsSpotifyMaximized] = useState(false);
  const [showAppleMusicPopup, setShowAppleMusicPopup] = useState(false);
  const [isAppleMusicMaximized, setIsAppleMusicMaximized] = useState(false);
  const [showSoundCloudPopup, setShowSoundCloudPopup] = useState(false);
  const [isSoundCloudMaximized, setIsSoundCloudMaximized] = useState(false);
  const [showYouTubeMusicPopup, setShowYouTubeMusicPopup] = useState(false);
  const [isYouTubeMusicMaximized, setIsYouTubeMusicMaximized] = useState(false);
  
  // Internal collapsed state if not provided from parent
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const isCollapsed = sidebarCollapsed !== undefined ? sidebarCollapsed : internalCollapsed;
  const setIsCollapsed = setSidebarCollapsed !== undefined ? setSidebarCollapsed : setInternalCollapsed;
  
  // Mini Player State
  const [activeMiniPlayer, setActiveMiniPlayer] = useState(null); // 'spotify', 'apple-music', 'soundcloud', 'youtube-music'
  const [miniPlayerPosition, setMiniPlayerPosition] = useState({ x: 20, y: window.innerHeight - 140 });
  const [isDraggingMiniPlayer, setIsDraggingMiniPlayer] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  
  // Music services data for the hub
  const musicServices = [
    { 
      id: 'spotify', 
      name: 'Spotify', 
      color: '#1DB954', 
      bgGradient: 'from-[#1DB954]/30 via-[#191414]/50 to-[#1DB954]/20',
      icon: SpotifyIcon,
      url: 'https://open.spotify.com',
      protocolUrl: 'spotify:',
      description: 'Stream millions of songs',
      onClick: async () => { 
        setShowMusicHubPopup(false); 
        // Try to open Spotify desktop app, fallback to web
        if (window.electronAPI?.openSpotify) {
          await window.electronAPI.openSpotify();
        } else if (window.electronAPI?.openExternal) {
          window.electronAPI.openExternal('spotify:').catch(() => {
            window.electronAPI.openExternal('https://open.spotify.com');
          });
        } else {
          window.open('https://open.spotify.com', '_blank');
        }
      },
    },
    { 
      id: 'apple-music', 
      name: 'Apple Music', 
      color: '#FA243C', 
      bgGradient: 'from-[#FA243C]/30 via-[#FB5C74]/20 to-[#FA243C]/20',
      icon: AppleMusicIcon,
      url: 'https://music.apple.com',
      protocolUrl: 'music:',
      description: 'Discover new music',
      onClick: async () => { 
        setShowMusicHubPopup(false);
        // Try to open Apple Music app, fallback to web
        if (window.electronAPI?.openExternal) {
          window.electronAPI.openExternal('music:').catch(() => {
            window.electronAPI.openExternal('https://music.apple.com');
          });
        } else {
          window.open('https://music.apple.com', '_blank');
        }
      },
    },
    { 
      id: 'soundcloud', 
      name: 'SoundCloud', 
      color: '#FF5500', 
      bgGradient: 'from-[#FF5500]/30 via-[#FF7700]/20 to-[#FF5500]/20',
      icon: SoundCloudIcon,
      url: 'https://soundcloud.com',
      description: 'Find independent artists',
      onClick: () => { 
        setShowMusicHubPopup(false);
        // Open SoundCloud in browser
        if (window.electronAPI?.openExternal) {
          window.electronAPI.openExternal('https://soundcloud.com');
        } else {
          window.open('https://soundcloud.com', '_blank');
        }
      },
    },
    { 
      id: 'youtube-music', 
      name: 'YouTube Music', 
      color: '#FF0000', 
      bgGradient: 'from-[#FF0000]/30 via-[#282828]/50 to-[#FF0000]/20',
      icon: YouTubeMusicIcon,
      url: 'https://music.youtube.com',
      description: 'Music videos & playlists',
      onClick: () => { 
        setShowMusicHubPopup(false);
        // Open YouTube Music in browser
        if (window.electronAPI?.openExternal) {
          window.electronAPI.openExternal('https://music.youtube.com');
        } else {
          window.open('https://music.youtube.com', '_blank');
        }
      },
    },
  ];
  
  // Mini player is disabled since we now open external apps
  const activeService = null;

  const handleItemClick = (itemId) => {
    // All items open as popups in the main window
    if (onOpenPopup) {
      onOpenPopup(itemId);
    }
    setActiveSidebarTab(itemId);
  };

  return (
    <>
      {/* Sidebar Toggle Button - Always visible */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={`fixed left-0 top-1/2 -translate-y-1/2 z-50 p-2 rounded-r-xl transition-all ${
          isDark 
            ? 'bg-[#161B22] hover:bg-[#21262D] border-r border-t border-b border-[#2a2a2a]' 
            : 'bg-white hover:bg-gray-100 border-r border-t border-b border-gray-200 shadow-md'
        } ${isCollapsed ? 'translate-x-0' : 'translate-x-[72px]'}`}
        style={{ 
          transition: 'transform 0.3s ease-in-out',
        }}
        data-testid="sidebar-toggle-btn"
      >
        <motion.div
          animate={{ rotate: isCollapsed ? 0 : 180 }}
          transition={{ duration: 0.3 }}
        >
          <ChevronRight className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />
        </motion.div>
      </motion.button>

      {/* Main Sidebar with Fade Animation */}
      <AnimatePresence>
        {!isCollapsed && (
          <motion.div 
            className={`w-[72px] flex flex-col border-r ${isDark ? 'bg-[#161B22] border-[#2a2a2a]' : 'bg-[#f0f2f5] border-gray-200'}`}
            initial={{ x: -72, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -72, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            style={{ perspective: 1000 }}
          >
      {/* App Logo with 3D effect */}
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.div 
            className="p-3 flex justify-center cursor-pointer"
            initial={{ opacity: 0, scale: 0.5, rotateY: -90 }}
            animate={{ opacity: 1, scale: 1, rotateY: 0 }}
            transition={{ delay: 0.2, duration: 0.5, ease: "easeOut" }}
          >
            <motion.div 
              className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#00a884] via-[#00d4aa] to-[#0088cc] flex items-center justify-center shadow-lg"
              whileHover={{ 
                scale: 1.1, 
                rotateY: 15,
                boxShadow: '0 10px 30px rgba(0, 168, 132, 0.4)'
              }}
              whileTap={{ scale: 0.95 }}
              style={{ transformStyle: 'preserve-3d' }}
            >
              <span className="text-white font-bold text-lg">FC</span>
              {/* Shine effect */}
              <motion.div
                className="absolute inset-0 rounded-xl bg-gradient-to-tr from-transparent via-white/20 to-transparent"
                animate={{ x: ['-100%', '200%'] }}
                transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 2 }}
              />
            </motion.div>
          </motion.div>
        </TooltipTrigger>
        <TooltipContent side="right" className="bg-gray-900 text-white">
          <p>FaceConnect</p>
        </TooltipContent>
      </Tooltip>
      
      {/* Large Social Media Button */}
      <div className="px-2 py-3">
        <Tooltip>
          <TooltipTrigger asChild>
            <motion.button
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, duration: 0.4 }}
              whileHover={{ 
                scale: 1.05, 
                rotateY: 8,
                boxShadow: '0 15px 40px rgba(236, 72, 153, 0.4)'
              }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowSocialPopup(true)}
              className={`w-full p-4 rounded-2xl flex flex-col items-center gap-2 transition-all relative overflow-hidden ${
                isDark 
                  ? 'bg-gradient-to-br from-pink-600/30 via-purple-600/30 to-blue-600/30 border border-pink-500/30' 
                  : 'bg-gradient-to-br from-pink-100 via-purple-100 to-blue-100 border border-pink-200'
              }`}
              style={{ transformStyle: 'preserve-3d' }}
              data-testid="social-media-btn"
            >
              {/* Animated gradient background */}
              <motion.div
                className="absolute inset-0 opacity-50"
                animate={{
                  background: [
                    'linear-gradient(45deg, rgba(236,72,153,0.3), rgba(139,92,246,0.3), rgba(59,130,246,0.3))',
                    'linear-gradient(90deg, rgba(139,92,246,0.3), rgba(59,130,246,0.3), rgba(236,72,153,0.3))',
                    'linear-gradient(135deg, rgba(59,130,246,0.3), rgba(236,72,153,0.3), rgba(139,92,246,0.3))',
                    'linear-gradient(45deg, rgba(236,72,153,0.3), rgba(139,92,246,0.3), rgba(59,130,246,0.3))',
                  ]
                }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
              />
              
              {/* Icon with glow */}
              <motion.div
                className="relative z-10"
                animate={{ 
                  textShadow: [
                    '0 0 10px rgba(236,72,153,0.5)',
                    '0 0 20px rgba(139,92,246,0.5)',
                    '0 0 10px rgba(59,130,246,0.5)',
                    '0 0 10px rgba(236,72,153,0.5)',
                  ]
                }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Share2 className={`w-7 h-7 ${isDark ? 'text-pink-400' : 'text-pink-600'}`} />
              </motion.div>
              
              <span className={`text-xs font-bold relative z-10 ${isDark ? 'text-white' : 'text-gray-800'}`}>
                Social
              </span>
              
              {/* Shine effect */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent"
                animate={{ x: ['-100%', '200%'] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              />
            </motion.button>
          </TooltipTrigger>
          <TooltipContent side="right" className="bg-gray-900 text-white">
            <p className="font-medium text-pink-400">Social Media</p>
            <p className="text-xs text-gray-400">Connect with social platforms</p>
          </TooltipContent>
        </Tooltip>
      </div>
      
      {/* Music Hub Button */}
      <div className="px-2 pb-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <motion.button
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.35, duration: 0.4 }}
              whileHover={{ 
                scale: 1.05, 
                rotateY: 8,
                boxShadow: '0 15px 40px rgba(139, 92, 246, 0.4)'
              }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowMusicHubPopup(true)}
              className={`w-full p-4 rounded-2xl flex flex-col items-center gap-2 transition-all relative overflow-hidden ${
                isDark 
                  ? 'bg-gradient-to-br from-[#1DB954]/20 via-[#8B5CF6]/20 to-[#FF0000]/20 border border-purple-500/40' 
                  : 'bg-gradient-to-br from-[#1DB954]/15 via-[#8B5CF6]/15 to-[#FF0000]/15 border border-purple-300'
              }`}
              style={{ transformStyle: 'preserve-3d' }}
              data-testid="music-hub-btn"
            >
              {/* Animated multi-color background */}
              <motion.div
                className="absolute inset-0 opacity-40"
                animate={{
                  background: [
                    'linear-gradient(45deg, rgba(30,215,96,0.3), rgba(139,92,246,0.3), rgba(255,0,0,0.3))',
                    'linear-gradient(90deg, rgba(250,36,60,0.3), rgba(30,215,96,0.3), rgba(255,85,0,0.3))',
                    'linear-gradient(135deg, rgba(255,85,0,0.3), rgba(255,0,0,0.3), rgba(139,92,246,0.3))',
                    'linear-gradient(45deg, rgba(30,215,96,0.3), rgba(139,92,246,0.3), rgba(255,0,0,0.3))',
                  ]
                }}
                transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
              />
              
              {/* Music Icon Stack */}
              <motion.div
                className="relative z-10 flex items-center justify-center"
                animate={{ 
                  filter: [
                    'drop-shadow(0 0 8px rgba(139,92,246,0.5))',
                    'drop-shadow(0 0 15px rgba(30,215,96,0.6))',
                    'drop-shadow(0 0 8px rgba(255,0,0,0.5))',
                    'drop-shadow(0 0 8px rgba(139,92,246,0.5))',
                  ]
                }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                <Music className={`w-7 h-7 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
              </motion.div>
              
              <span className={`text-xs font-bold relative z-10 ${isDark ? 'text-white' : 'text-gray-800'}`}>
                Music
              </span>
              
              {/* Mini service icons */}
              <div className="absolute bottom-1 left-0 right-0 flex justify-center gap-0.5 opacity-60">
                <div className="w-1.5 h-1.5 rounded-full bg-[#1DB954]" />
                <div className="w-1.5 h-1.5 rounded-full bg-[#FA243C]" />
                <div className="w-1.5 h-1.5 rounded-full bg-[#FF5500]" />
                <div className="w-1.5 h-1.5 rounded-full bg-[#FF0000]" />
              </div>
              
              {/* Shine effect */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent"
                animate={{ x: ['-100%', '200%'] }}
                transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 2 }}
              />
            </motion.button>
          </TooltipTrigger>
          <TooltipContent side="right" className="bg-gray-900 text-white">
            <p className="font-medium text-purple-400">Music Hub</p>
            <p className="text-xs text-gray-400">Spotify, Apple Music, SoundCloud & more</p>
          </TooltipContent>
        </Tooltip>
      </div>
      
      {/* Main Navigation with 3D animations */}
      <div className="flex-1 py-2 overflow-hidden">
        <div className="space-y-1 px-2" style={{ perspective: 800 }}>
          {sidebarItems.map((item, index) => (
            <Tooltip key={item.id}>
              <TooltipTrigger asChild>
                <motion.button
                  custom={index}
                  variants={buttonVariants}
                  initial="initial"
                  animate="animate"
                  whileHover="hover"
                  whileTap="tap"
                  onClick={() => handleItemClick(item.id)}
                  className={`w-full p-3 rounded-xl flex flex-col items-center gap-1 transition-colors relative group ${
                    activeSidebarTab === item.id
                      ? 'bg-[#00E676] text-white shadow-lg'
                      : isDark 
                        ? 'text-gray-400 hover:bg-[#21262D] hover:text-white' 
                        : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'
                  }`}
                  style={{ transformStyle: 'preserve-3d' }}
                  data-testid={`sidebar-${item.id}`}
                >
                  {/* Icon with glow effect on active */}
                  <motion.div
                    animate={activeSidebarTab === item.id ? {
                      textShadow: ['0 0 8px rgba(255,255,255,0.5)', '0 0 15px rgba(255,255,255,0.8)', '0 0 8px rgba(255,255,255,0.5)']
                    } : {}}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <item.icon className="w-5 h-5" />
                  </motion.div>
                  
                  {/* Badge with pop animation */}
                  <AnimatePresence>
                    {item.badge > 0 && (
                      <motion.span 
                        className="absolute top-1 right-1 w-5 h-5 bg-[#25d366] text-white text-xs font-bold rounded-full flex items-center justify-center shadow-md"
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 500, damping: 25 }}
                      >
                        {item.badge > 99 ? '99+' : item.badge}
                      </motion.span>
                    )}
                  </AnimatePresence>
                  
                  <span className="text-[10px] font-medium truncate w-full text-center">
                    {item.label}
                  </span>
                  
                  {/* Active indicator */}
                  {activeSidebarTab === item.id && (
                    <motion.div
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full"
                      layoutId="activeIndicator"
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  )}
                </motion.button>
              </TooltipTrigger>
              <TooltipContent side="right" className="bg-gray-900 text-white">
                <p>{item.tooltip}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </div>
      
      {/* Bottom Actions with 3D effects */}
      <div className="p-2 space-y-1 border-t border-[#2a2a2a]/50">
        {/* Settings */}
        <Tooltip>
          <TooltipTrigger asChild>
            <motion.button
              whileHover={{ scale: 1.1, rotateY: 10 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowSettings?.(true)}
              className={`w-full p-3 rounded-xl flex flex-col items-center gap-1 transition-all ${
                showSettings 
                  ? 'bg-[#00E676] text-white' 
                  : isDark 
                    ? 'text-gray-400 hover:bg-[#21262D] hover:text-white' 
                    : 'text-gray-600 hover:bg-gray-200'
              }`}
              style={{ transformStyle: 'preserve-3d' }}
              data-testid="sidebar-settings"
            >
              <motion.div
                animate={{ rotate: showSettings ? 180 : 0 }}
                transition={{ duration: 0.3 }}
              >
                <Settings className="w-5 h-5" />
              </motion.div>
              <span className="text-[10px]">{t('settings')}</span>
            </motion.button>
          </TooltipTrigger>
          <TooltipContent side="right" className="bg-gray-900 text-white">
            <p>{t('settings')}</p>
          </TooltipContent>
        </Tooltip>
        
        {/* Theme Toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <motion.button
              whileHover={{ scale: 1.1, rotateY: 10 }}
              whileTap={{ scale: 0.95 }}
              onClick={toggleTheme}
              className={`w-full p-3 rounded-xl flex flex-col items-center gap-1 transition-all ${
                isDark 
                  ? 'text-gray-400 hover:bg-[#21262D] hover:text-yellow-400' 
                  : 'text-gray-600 hover:bg-gray-200 hover:text-blue-600'
              }`}
              style={{ transformStyle: 'preserve-3d' }}
              data-testid="sidebar-theme"
            >
              <motion.div
                animate={{ rotate: isDark ? 0 : 180 }}
                transition={{ duration: 0.5 }}
              >
                {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </motion.div>
              <span className="text-[10px]">{isDark ? 'Light' : 'Dark'}</span>
            </motion.button>
          </TooltipTrigger>
          <TooltipContent side="right" className="bg-gray-900 text-white">
            <p>Toggle {isDark ? 'Light' : 'Dark'} Mode</p>
          </TooltipContent>
        </Tooltip>
        
        {/* Logout */}
        <Tooltip>
          <TooltipTrigger asChild>
            <motion.button
              whileHover={{ scale: 1.1, rotateY: 10, color: '#ef4444' }}
              whileTap={{ scale: 0.95 }}
              onClick={logout}
              className={`w-full p-3 rounded-xl flex flex-col items-center gap-1 transition-all ${
                isDark 
                  ? 'text-gray-400 hover:bg-red-500/20' 
                  : 'text-gray-600 hover:bg-red-50'
              }`}
              style={{ transformStyle: 'preserve-3d' }}
              data-testid="sidebar-logout"
            >
              <LogOut className="w-5 h-5" />
              <span className="text-[10px]">{t('logout')}</span>
            </motion.button>
          </TooltipTrigger>
          <TooltipContent side="right" className="bg-gray-900 text-white">
            <p>{t('logout')}</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </motion.div>
        )}
      </AnimatePresence>
      
      {/* Social Media Popup */}
      <AnimatePresence>
        {showSocialPopup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center"
            onClick={() => setShowSocialPopup(false)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 30 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className={`w-96 rounded-3xl shadow-2xl overflow-hidden ${
                isDark ? 'bg-[#1a2328] border border-[#2a3942]' : 'bg-white border border-gray-200'
              }`}
            >
              {/* Header */}
              <div className={`flex items-center justify-between px-5 py-4 border-b ${
                isDark ? 'bg-gradient-to-r from-pink-600/20 via-purple-600/20 to-blue-600/20 border-[#2a3942]' : 'bg-gradient-to-r from-pink-50 via-purple-50 to-blue-50 border-gray-200'
              }`}>
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowSocialPopup(false)}
                    className={`h-9 w-9 rounded-full ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-200'}`}
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </Button>
                  <h4 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Social Media
                  </h4>
                </div>
                <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-blue-500/20">
                  <Chrome className="w-4 h-4 text-blue-400" />
                  <span className="text-xs text-blue-400 font-medium">Browser</span>
                </div>
              </div>
              
              {/* Social Links Grid */}
              <div className="p-4 grid grid-cols-3 gap-3">
                {socialLinks.map((social, index) => (
                  <motion.button
                    key={social.name}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ 
                      scale: 1.08, 
                      y: -5,
                      boxShadow: `0 10px 30px ${social.color}40`
                    }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      if (openExternalLink) openExternalLink(social.url);
                      else window.open(social.url, '_blank');
                      setShowSocialPopup(false);
                    }}
                    className={`flex flex-col items-center gap-2 p-4 rounded-2xl transition-all ${
                      isDark ? 'bg-[#233138] hover:bg-[#21262D]' : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                    style={{ transformStyle: 'preserve-3d' }}
                  >
                    <span style={{ color: social.color }}>{social.icon}</span>
                    <span className={`text-xs font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {social.name}
                    </span>
                  </motion.button>
                ))}
              </div>

              {/* Close Button */}
              <div className={`px-4 py-4 border-t ${isDark ? 'border-[#2a3942]' : 'border-gray-200'}`}>
                <Button
                  variant="outline"
                  className={`w-full rounded-xl h-11 ${isDark ? 'border-gray-600 hover:bg-white/10' : ''}`}
                  onClick={() => setShowSocialPopup(false)}
                >
                  <X className="w-4 h-4 mr-2" />
                  Close
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Music Hub Popup */}
      <AnimatePresence>
        {showMusicHubPopup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-lg z-[100] flex items-center justify-center p-4"
            onClick={() => setShowMusicHubPopup(false)}
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0, y: 50, rotateX: -15 }}
              animate={{ scale: 1, opacity: 1, y: 0, rotateX: 0 }}
              exit={{ scale: 0.5, opacity: 0, y: 50, rotateX: 15 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className={`relative rounded-3xl shadow-2xl overflow-hidden ${
                isDark ? 'bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f0f23]' : 'bg-gradient-to-br from-white via-gray-50 to-gray-100'
              }`}
              style={{ 
                width: '90%',
                maxWidth: '600px',
                transformStyle: 'preserve-3d',
                perspective: 1000
              }}
            >
              {/* Animated background pattern */}
              <motion.div 
                className="absolute inset-0 opacity-20"
                animate={{
                  background: [
                    'radial-gradient(circle at 20% 20%, rgba(30,215,96,0.3), transparent 40%), radial-gradient(circle at 80% 80%, rgba(255,0,0,0.3), transparent 40%)',
                    'radial-gradient(circle at 80% 20%, rgba(250,36,60,0.3), transparent 40%), radial-gradient(circle at 20% 80%, rgba(255,85,0,0.3), transparent 40%)',
                    'radial-gradient(circle at 50% 50%, rgba(139,92,246,0.3), transparent 50%)',
                    'radial-gradient(circle at 20% 20%, rgba(30,215,96,0.3), transparent 40%), radial-gradient(circle at 80% 80%, rgba(255,0,0,0.3), transparent 40%)',
                  ]
                }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
              />
              
              {/* Header */}
              <motion.div 
                className="relative px-6 py-5 border-b border-white/10"
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.3 }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <motion.div
                      className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 via-pink-500 to-red-500 flex items-center justify-center"
                      animate={{ 
                        boxShadow: [
                          '0 0 20px rgba(139,92,246,0.5)',
                          '0 0 30px rgba(236,72,153,0.5)',
                          '0 0 20px rgba(239,68,68,0.5)',
                          '0 0 20px rgba(139,92,246,0.5)',
                        ]
                      }}
                      transition={{ duration: 3, repeat: Infinity }}
                    >
                      <Music className="w-6 h-6 text-white" />
                    </motion.div>
                    <div>
                      <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        Music Hub
                      </h3>
                      <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        Stream your favorite music
                      </p>
                    </div>
                  </div>
                  
                  <motion.button
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setShowMusicHubPopup(false)}
                    className={`p-2 rounded-full transition-colors ${
                      isDark ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-gray-200 text-gray-600'
                    }`}
                  >
                    <X className="w-5 h-5" />
                  </motion.button>
                </div>
              </motion.div>

              {/* Music Services Grid */}
              <div className="relative p-6">
                <div className="grid grid-cols-2 gap-4">
                  {musicServices.map((service, index) => (
                    <motion.button
                      key={service.id}
                      initial={{ opacity: 0, y: 20, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ delay: 0.15 + index * 0.1, duration: 0.4 }}
                      whileHover={{ 
                        scale: 1.05, 
                        y: -5,
                        boxShadow: `0 20px 40px ${service.color}40`
                      }}
                      whileTap={{ scale: 0.98 }}
                      onClick={service.onClick}
                      className={`relative p-5 rounded-2xl flex flex-col items-center gap-3 transition-all overflow-hidden ${
                        isDark 
                          ? `bg-gradient-to-br ${service.bgGradient} border border-white/10 hover:border-white/20` 
                          : `bg-gradient-to-br ${service.bgGradient} border border-gray-200 hover:border-gray-300`
                      }`}
                      style={{ transformStyle: 'preserve-3d' }}
                      data-testid={`music-hub-${service.id}`}
                    >
                      {/* Glow effect */}
                      <motion.div
                        className="absolute inset-0 opacity-0 group-hover:opacity-100"
                        style={{ background: `radial-gradient(circle at center, ${service.color}30, transparent 70%)` }}
                        animate={{ opacity: [0.3, 0.5, 0.3] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                      
                      {/* Service Icon */}
                      <motion.div
                        className="relative z-10"
                        animate={{ 
                          filter: [
                            `drop-shadow(0 0 8px ${service.color}60)`,
                            `drop-shadow(0 0 15px ${service.color}90)`,
                            `drop-shadow(0 0 8px ${service.color}60)`,
                          ]
                        }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        <service.icon className="w-10 h-10" style={{ color: service.color }} />
                      </motion.div>
                      
                      {/* Service Info */}
                      <div className="relative z-10 text-center">
                        <h4 className={`font-bold text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {service.name}
                        </h4>
                        <p className={`text-xs mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                          {service.description}
                        </p>
                      </div>
                      
                      {/* Shine effect */}
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent"
                        animate={{ x: ['-100%', '200%'] }}
                        transition={{ duration: 3, repeat: Infinity, repeatDelay: 1 + index * 0.5 }}
                      />
                    </motion.button>
                  ))}
                </div>
                
                {/* Quick access tip */}
                <motion.div
                  className={`mt-5 p-3 rounded-xl text-center ${
                    isDark ? 'bg-white/5' : 'bg-gray-100'
                  }`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                >
                  <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                    Click to open the music app in a new window
                  </p>
                </motion.div>
              </div>
              
              {/* Bottom gradient bar */}
              <motion.div
                className="h-1 bg-gradient-to-r from-[#1DB954] via-[#FA243C] via-[#FF5500] to-[#FF0000]"
                animate={{ 
                  backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
                }}
                transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
                style={{ backgroundSize: '200% 200%' }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Spotify Popup Window */}
      <AnimatePresence>
        {showSpotifyPopup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-md z-[100] flex items-center justify-center p-4"
            onClick={() => setShowSpotifyPopup(false)}
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0, y: 50, rotateX: -15 }}
              animate={{ 
                scale: isSpotifyMaximized ? 1 : 0.95, 
                opacity: 1, 
                y: 0, 
                rotateX: 0,
                width: isSpotifyMaximized ? '100%' : '90%',
                height: isSpotifyMaximized ? '100%' : '85%',
              }}
              exit={{ scale: 0.5, opacity: 0, y: 50, rotateX: 15 }}
              transition={{ 
                type: "spring", 
                damping: 25, 
                stiffness: 300,
                duration: 0.4 
              }}
              onClick={(e) => e.stopPropagation()}
              className={`relative rounded-3xl shadow-2xl overflow-hidden flex flex-col ${
                isDark ? 'bg-[#121212]' : 'bg-[#121212]'
              }`}
              style={{ 
                maxWidth: isSpotifyMaximized ? '100%' : '1200px',
                maxHeight: isSpotifyMaximized ? '100%' : '800px',
                transformStyle: 'preserve-3d',
                perspective: 1000
              }}
            >
              {/* Spotify Header Bar */}
              <motion.div 
                className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-[#1DB954] via-[#1ed760] to-[#1DB954]"
                initial={{ y: -50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.3 }}
              >
                <div className="flex items-center gap-3">
                  <motion.div
                    animate={{ rotate: [0, 360] }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                  >
                    <SpotifyIcon className="w-7 h-7 text-white" />
                  </motion.div>
                  <div>
                    <h4 className="text-white font-bold text-lg">Spotify</h4>
                    <p className="text-white/70 text-xs">Web Player - FaceConnect</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {/* Mini Player Button */}
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => minimizeToMiniPlayer('spotify')}
                    className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
                    title="Minimize to Mini Player"
                  >
                    <Minus className="w-4 h-4" />
                  </motion.button>
                  
                  {/* Maximize/Minimize Button */}
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setIsSpotifyMaximized(!isSpotifyMaximized)}
                    className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
                    title={isSpotifyMaximized ? "Restore" : "Maximize"}
                  >
                    {isSpotifyMaximized ? (
                      <Minimize2 className="w-4 h-4" />
                    ) : (
                      <Maximize2 className="w-4 h-4" />
                    )}
                  </motion.button>
                  
                  {/* Open in Browser */}
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => {
                      if (openExternalLink) openExternalLink('https://open.spotify.com');
                      else window.open('https://open.spotify.com', '_blank');
                    }}
                    className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
                    title="Open in Browser"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </motion.button>
                  
                  {/* Close Button */}
                  <motion.button
                    whileHover={{ scale: 1.1, backgroundColor: 'rgba(255,255,255,0.3)' }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setShowSpotifyPopup(false)}
                    className="p-2 rounded-full bg-white/20 hover:bg-red-500 text-white transition-colors"
                    title="Close"
                  >
                    <X className="w-4 h-4" />
                  </motion.button>
                </div>
              </motion.div>
              
              {/* Spotify Web Player iframe */}
              <motion.div 
                className="flex-1 bg-[#121212] relative"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.5 }}
              >
                {/* Loading animation */}
                <motion.div
                  className="absolute inset-0 flex items-center justify-center bg-[#121212] z-10"
                  initial={{ opacity: 1 }}
                  animate={{ opacity: 0 }}
                  transition={{ delay: 1.5, duration: 0.5 }}
                  style={{ pointerEvents: 'none' }}
                >
                  <div className="flex flex-col items-center gap-4">
                    <motion.div
                      animate={{ 
                        scale: [1, 1.2, 1],
                        rotate: [0, 180, 360]
                      }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    >
                      <SpotifyIcon className="w-16 h-16 text-[#1DB954]" />
                    </motion.div>
                    <motion.div
                      className="flex gap-1"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5 }}
                    >
                      {[0, 1, 2].map((i) => (
                        <motion.div
                          key={i}
                          className="w-2 h-2 bg-[#1DB954] rounded-full"
                          animate={{ y: [0, -10, 0] }}
                          transition={{ 
                            duration: 0.6, 
                            repeat: Infinity, 
                            delay: i * 0.15 
                          }}
                        />
                      ))}
                    </motion.div>
                    <p className="text-white/60 text-sm">Loading Spotify...</p>
                  </div>
                </motion.div>
                
                <iframe
                  src="https://open.spotify.com"
                  className="w-full h-full border-0"
                  title="Spotify Web Player"
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  loading="lazy"
                />
              </motion.div>
              
              {/* Bottom glow effect */}
              <motion.div
                className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-[#1DB954] via-[#1ed760] to-[#1DB954]"
                animate={{
                  opacity: [0.5, 1, 0.5],
                  scaleX: [0.8, 1, 0.8]
                }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Apple Music Popup Window */}
      <AnimatePresence>
        {showAppleMusicPopup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-md z-[100] flex items-center justify-center p-4"
            onClick={() => setShowAppleMusicPopup(false)}
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0, y: 50, rotateX: -15 }}
              animate={{ 
                scale: isAppleMusicMaximized ? 1 : 0.95, 
                opacity: 1, 
                y: 0, 
                rotateX: 0,
                width: isAppleMusicMaximized ? '100%' : '90%',
                height: isAppleMusicMaximized ? '100%' : '85%',
              }}
              exit={{ scale: 0.5, opacity: 0, y: 50, rotateX: 15 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="relative rounded-3xl shadow-2xl overflow-hidden flex flex-col bg-[#1a1a1a]"
              style={{ 
                maxWidth: isAppleMusicMaximized ? '100%' : '1200px',
                maxHeight: isAppleMusicMaximized ? '100%' : '800px',
              }}
            >
              {/* Apple Music Header */}
              <motion.div 
                className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-[#FA243C] via-[#FB5C74] to-[#FA243C]"
                initial={{ y: -50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.3 }}
              >
                <div className="flex items-center gap-3">
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <AppleMusicIcon className="w-7 h-7 text-white" />
                  </motion.div>
                  <div>
                    <h4 className="text-white font-bold text-lg">Apple Music</h4>
                    <p className="text-white/70 text-xs">Web Player - FaceConnect</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => minimizeToMiniPlayer('apple-music')}
                    className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white"
                    title="Minimize to Mini Player"
                  >
                    <Minus className="w-4 h-4" />
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setIsAppleMusicMaximized(!isAppleMusicMaximized)}
                    className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white"
                  >
                    {isAppleMusicMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => {
                      if (openExternalLink) openExternalLink('https://music.apple.com');
                      else window.open('https://music.apple.com', '_blank');
                    }}
                    className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.1, backgroundColor: 'rgba(255,255,255,0.3)' }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setShowAppleMusicPopup(false)}
                    className="p-2 rounded-full bg-white/20 hover:bg-red-500 text-white"
                  >
                    <X className="w-4 h-4" />
                  </motion.button>
                </div>
              </motion.div>
              
              {/* Apple Music iframe */}
              <motion.div 
                className="flex-1 bg-[#1a1a1a] relative"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.5 }}
              >
                <motion.div
                  className="absolute inset-0 flex items-center justify-center bg-[#1a1a1a] z-10"
                  initial={{ opacity: 1 }}
                  animate={{ opacity: 0 }}
                  transition={{ delay: 1.5, duration: 0.5 }}
                  style={{ pointerEvents: 'none' }}
                >
                  <div className="flex flex-col items-center gap-4">
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                    >
                      <AppleMusicIcon className="w-16 h-16 text-[#FA243C]" />
                    </motion.div>
                    <motion.div className="flex gap-1">
                      {[0, 1, 2].map((i) => (
                        <motion.div
                          key={i}
                          className="w-2 h-2 bg-[#FA243C] rounded-full"
                          animate={{ y: [0, -10, 0] }}
                          transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                        />
                      ))}
                    </motion.div>
                    <p className="text-white/60 text-sm">Loading Apple Music...</p>
                  </div>
                </motion.div>
                <iframe
                  src="https://music.apple.com"
                  className="w-full h-full border-0"
                  title="Apple Music"
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen"
                  loading="lazy"
                />
              </motion.div>
              
              <motion.div
                className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-[#FA243C] via-[#FB5C74] to-[#FA243C]"
                animate={{ opacity: [0.5, 1, 0.5], scaleX: [0.8, 1, 0.8] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* SoundCloud Popup Window */}
      <AnimatePresence>
        {showSoundCloudPopup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-md z-[100] flex items-center justify-center p-4"
            onClick={() => setShowSoundCloudPopup(false)}
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0, y: 50, rotateX: -15 }}
              animate={{ 
                scale: isSoundCloudMaximized ? 1 : 0.95, 
                opacity: 1, 
                y: 0, 
                rotateX: 0,
                width: isSoundCloudMaximized ? '100%' : '90%',
                height: isSoundCloudMaximized ? '100%' : '85%',
              }}
              exit={{ scale: 0.5, opacity: 0, y: 50, rotateX: 15 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="relative rounded-3xl shadow-2xl overflow-hidden flex flex-col bg-[#f2f2f2]"
              style={{ 
                maxWidth: isSoundCloudMaximized ? '100%' : '1200px',
                maxHeight: isSoundCloudMaximized ? '100%' : '800px',
              }}
            >
              {/* SoundCloud Header */}
              <motion.div 
                className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-[#FF5500] via-[#FF7700] to-[#FF5500]"
                initial={{ y: -50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.3 }}
              >
                <div className="flex items-center gap-3">
                  <motion.div
                    animate={{ 
                      x: [0, 5, 0, -5, 0],
                    }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <SoundCloudIcon className="w-7 h-7 text-white" />
                  </motion.div>
                  <div>
                    <h4 className="text-white font-bold text-lg">SoundCloud</h4>
                    <p className="text-white/70 text-xs">Discover Music - FaceConnect</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => minimizeToMiniPlayer('soundcloud')}
                    className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white"
                    title="Minimize to Mini Player"
                  >
                    <Minus className="w-4 h-4" />
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setIsSoundCloudMaximized(!isSoundCloudMaximized)}
                    className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white"
                  >
                    {isSoundCloudMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => {
                      if (openExternalLink) openExternalLink('https://soundcloud.com');
                      else window.open('https://soundcloud.com', '_blank');
                    }}
                    className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.1, backgroundColor: 'rgba(255,255,255,0.3)' }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setShowSoundCloudPopup(false)}
                    className="p-2 rounded-full bg-white/20 hover:bg-red-500 text-white"
                  >
                    <X className="w-4 h-4" />
                  </motion.button>
                </div>
              </motion.div>
              
              {/* SoundCloud iframe */}
              <motion.div 
                className="flex-1 bg-[#f2f2f2] relative"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.5 }}
              >
                <motion.div
                  className="absolute inset-0 flex items-center justify-center bg-[#f2f2f2] z-10"
                  initial={{ opacity: 1 }}
                  animate={{ opacity: 0 }}
                  transition={{ delay: 1.5, duration: 0.5 }}
                  style={{ pointerEvents: 'none' }}
                >
                  <div className="flex flex-col items-center gap-4">
                    <motion.div
                      animate={{ 
                        scale: [1, 1.1, 1],
                        rotate: [0, 5, 0, -5, 0]
                      }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    >
                      <SoundCloudIcon className="w-16 h-16 text-[#FF5500]" />
                    </motion.div>
                    <motion.div className="flex gap-1">
                      {[0, 1, 2].map((i) => (
                        <motion.div
                          key={i}
                          className="w-2 h-2 bg-[#FF5500] rounded-full"
                          animate={{ y: [0, -10, 0] }}
                          transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                        />
                      ))}
                    </motion.div>
                    <p className="text-gray-600 text-sm">Loading SoundCloud...</p>
                  </div>
                </motion.div>
                <iframe
                  src="https://soundcloud.com/discover"
                  className="w-full h-full border-0"
                  title="SoundCloud"
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen"
                  loading="lazy"
                />
              </motion.div>
              
              <motion.div
                className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-[#FF5500] via-[#FF7700] to-[#FF5500]"
                animate={{ opacity: [0.5, 1, 0.5], scaleX: [0.8, 1, 0.8] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* YouTube Music Popup Window */}
      <AnimatePresence>
        {showYouTubeMusicPopup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-md z-[100] flex items-center justify-center p-4"
            onClick={() => setShowYouTubeMusicPopup(false)}
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0, y: 50, rotateX: -15 }}
              animate={{ 
                scale: isYouTubeMusicMaximized ? 1 : 0.95, 
                opacity: 1, 
                y: 0, 
                rotateX: 0,
                width: isYouTubeMusicMaximized ? '100%' : '90%',
                height: isYouTubeMusicMaximized ? '100%' : '85%',
              }}
              exit={{ scale: 0.5, opacity: 0, y: 50, rotateX: 15 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="relative rounded-3xl shadow-2xl overflow-hidden flex flex-col bg-[#030303]"
              style={{ 
                maxWidth: isYouTubeMusicMaximized ? '100%' : '1200px',
                maxHeight: isYouTubeMusicMaximized ? '100%' : '800px',
              }}
            >
              {/* YouTube Music Header */}
              <motion.div 
                className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-[#FF0000] via-[#CC0000] to-[#FF0000]"
                initial={{ y: -50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.3 }}
              >
                <div className="flex items-center gap-3">
                  <motion.div
                    animate={{ rotate: [0, 360] }}
                    transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                  >
                    <YouTubeMusicIcon className="w-7 h-7 text-white" />
                  </motion.div>
                  <div>
                    <h4 className="text-white font-bold text-lg">YouTube Music</h4>
                    <p className="text-white/70 text-xs">Stream Music - FaceConnect</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => minimizeToMiniPlayer('youtube-music')}
                    className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white"
                    title="Minimize to Mini Player"
                  >
                    <Minus className="w-4 h-4" />
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setIsYouTubeMusicMaximized(!isYouTubeMusicMaximized)}
                    className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white"
                  >
                    {isYouTubeMusicMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => {
                      if (openExternalLink) openExternalLink('https://music.youtube.com');
                      else window.open('https://music.youtube.com', '_blank');
                    }}
                    className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.1, backgroundColor: 'rgba(255,255,255,0.3)' }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setShowYouTubeMusicPopup(false)}
                    className="p-2 rounded-full bg-white/20 hover:bg-red-600 text-white"
                  >
                    <X className="w-4 h-4" />
                  </motion.button>
                </div>
              </motion.div>
              
              {/* YouTube Music iframe */}
              <motion.div 
                className="flex-1 bg-[#030303] relative"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.5 }}
              >
                <motion.div
                  className="absolute inset-0 flex items-center justify-center bg-[#030303] z-10"
                  initial={{ opacity: 1 }}
                  animate={{ opacity: 0 }}
                  transition={{ delay: 1.5, duration: 0.5 }}
                  style={{ pointerEvents: 'none' }}
                >
                  <div className="flex flex-col items-center gap-4">
                    <motion.div
                      animate={{ 
                        scale: [1, 1.2, 1],
                        rotate: [0, 180, 360]
                      }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    >
                      <YouTubeMusicIcon className="w-16 h-16 text-[#FF0000]" />
                    </motion.div>
                    <motion.div className="flex gap-1">
                      {[0, 1, 2].map((i) => (
                        <motion.div
                          key={i}
                          className="w-2 h-2 bg-[#FF0000] rounded-full"
                          animate={{ y: [0, -10, 0] }}
                          transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                        />
                      ))}
                    </motion.div>
                    <p className="text-white/60 text-sm">Loading YouTube Music...</p>
                  </div>
                </motion.div>
                <iframe
                  src="https://music.youtube.com"
                  className="w-full h-full border-0"
                  title="YouTube Music"
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  loading="lazy"
                />
              </motion.div>
              
              <motion.div
                className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-[#FF0000] via-[#CC0000] to-[#FF0000]"
                animate={{ opacity: [0.5, 1, 0.5], scaleX: [0.8, 1, 0.8] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Mini Music Player Widget */}
      <AnimatePresence>
        {activeMiniPlayer && activeService && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 400 }}
            drag
            dragMomentum={false}
            onDragStart={() => setIsDraggingMiniPlayer(true)}
            onDragEnd={() => setIsDraggingMiniPlayer(false)}
            className="fixed z-[200] cursor-move"
            style={{ 
              left: 80, 
              bottom: 20,
            }}
            data-testid="mini-player-widget"
          >
            <motion.div
              className={`rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl border ${
                isDark 
                  ? 'bg-black/80 border-white/10' 
                  : 'bg-white/90 border-gray-200'
              }`}
              style={{ width: 280 }}
              whileHover={{ scale: 1.02 }}
            >
              {/* Mini Player Header */}
              <div 
                className="px-3 py-2 flex items-center justify-between"
                style={{ background: `linear-gradient(135deg, ${activeService.color}40, ${activeService.color}20)` }}
              >
                <div className="flex items-center gap-2">
                  {/* Animated equalizer bars */}
                  <div className="flex items-end gap-0.5 h-4">
                    {[0, 1, 2, 3].map((i) => (
                      <motion.div
                        key={i}
                        className="w-0.5 rounded-full"
                        style={{ backgroundColor: activeService.color }}
                        animate={isPlaying ? {
                          height: ['4px', '16px', '8px', '12px', '4px'],
                        } : { height: '4px' }}
                        transition={{
                          duration: 0.8,
                          repeat: Infinity,
                          delay: i * 0.15,
                          ease: "easeInOut"
                        }}
                      />
                    ))}
                  </div>
                  <span className={`text-xs font-semibold ${isDark ? 'text-white' : 'text-gray-800'}`}>
                    {activeService.name}
                  </span>
                </div>
                
                <div className="flex items-center gap-1">
                  {/* Expand Button */}
                  <motion.button
                    whileHover={{ scale: 1.2 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={expandFromMiniPlayer}
                    className={`p-1.5 rounded-full transition-colors ${
                      isDark ? 'hover:bg-white/20 text-white' : 'hover:bg-gray-200 text-gray-700'
                    }`}
                    title="Expand"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                  </motion.button>
                  
                  {/* Close Mini Player */}
                  <motion.button
                    whileHover={{ scale: 1.2 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setActiveMiniPlayer(null)}
                    className={`p-1.5 rounded-full transition-colors ${
                      isDark ? 'hover:bg-red-500/50 text-white' : 'hover:bg-red-100 text-gray-700'
                    }`}
                    title="Close"
                  >
                    <X className="w-3.5 h-3.5" />
                  </motion.button>
                </div>
              </div>
              
              {/* Now Playing Info */}
              <div className="p-3">
                <div className="flex items-center gap-3">
                  {/* Album Art Placeholder with Service Icon */}
                  <motion.div 
                    className="w-12 h-12 rounded-lg flex items-center justify-center relative overflow-hidden"
                    style={{ backgroundColor: `${activeService.color}20` }}
                    animate={{ 
                      boxShadow: [
                        `0 0 10px ${activeService.color}40`,
                        `0 0 20px ${activeService.color}60`,
                        `0 0 10px ${activeService.color}40`,
                      ]
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <motion.div
                      animate={isPlaying ? { rotate: 360 } : { rotate: 0 }}
                      transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    >
                      <activeService.icon className="w-6 h-6" style={{ color: activeService.color }} />
                    </motion.div>
                  </motion.div>
                  
                  {/* Track Info */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      Now Playing
                    </p>
                    <p className={`text-xs truncate ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      via {activeService.name}
                    </p>
                  </div>
                </div>
                
                {/* Progress Bar */}
                <div className="mt-3">
                  <div className={`h-1 rounded-full overflow-hidden ${isDark ? 'bg-white/10' : 'bg-gray-200'}`}>
                    <motion.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: activeService.color }}
                      animate={{ width: isPlaying ? ['0%', '100%'] : '30%' }}
                      transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                    />
                  </div>
                </div>
                
                {/* Control Buttons */}
                <div className="flex items-center justify-center gap-4 mt-3">
                  {/* Previous */}
                  <motion.button
                    whileHover={{ scale: 1.2 }}
                    whileTap={{ scale: 0.9 }}
                    className={`p-2 rounded-full transition-colors ${
                      isDark ? 'hover:bg-white/10 text-white' : 'hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M6 6h2v12H6V6zm3.5 6l8.5 6V6l-8.5 6z"/>
                    </svg>
                  </motion.button>
                  
                  {/* Play/Pause */}
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="p-3 rounded-full transition-colors"
                    style={{ backgroundColor: activeService.color }}
                  >
                    {isPlaying ? (
                      <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z"/>
                      </svg>
                    )}
                  </motion.button>
                  
                  {/* Next */}
                  <motion.button
                    whileHover={{ scale: 1.2 }}
                    whileTap={{ scale: 0.9 }}
                    className={`p-2 rounded-full transition-colors ${
                      isDark ? 'hover:bg-white/10 text-white' : 'hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
                    </svg>
                  </motion.button>
                </div>
              </div>
              
              {/* Keyboard Shortcuts Hint */}
              <motion.div 
                className={`px-3 py-1.5 text-center border-t ${
                  isDark ? 'border-white/5 bg-white/5' : 'border-gray-100 bg-gray-50'
                }`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <p className={`text-[10px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                  <span className="font-medium">Space</span> Play/Pause • <span className="font-medium">M</span> Expand • <span className="font-medium">Esc</span> Close
                </p>
              </motion.div>
              
              {/* Bottom Glow */}
              <motion.div
                className="h-0.5"
                style={{ backgroundColor: activeService.color }}
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
