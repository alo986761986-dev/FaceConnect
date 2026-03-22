import { motion } from "framer-motion";
import { 
  ArrowLeft, Camera, Lock, Shield, Key, Smartphone, FileText, Trash2 
} from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

/**
 * AccountPanel - User account settings panel
 * Extracted from WhatsAppDesktopLayout.jsx for maintainability
 */
export default function AccountPanel({ 
  user, 
  isDark, 
  onClose, 
  onNavigate 
}) {
  const accountOptions = [
    { 
      label: 'Privacy', 
      description: 'Last seen, profile photo, about', 
      icon: Lock, 
      onClick: () => onNavigate?.('/settings/privacy') 
    },
    { 
      label: 'Security', 
      description: 'Security notifications, linked devices', 
      icon: Shield, 
      onClick: () => onNavigate?.('/settings/security') 
    },
    { 
      label: 'Two-step verification', 
      description: 'Add extra security to your account', 
      icon: Key 
    },
    { 
      label: 'Change number', 
      description: 'Change your phone number', 
      icon: Smartphone 
    },
    { 
      label: 'Request account info', 
      description: 'Download your account data', 
      icon: FileText 
    },
    { 
      label: 'Delete account', 
      description: 'Permanently delete your account', 
      icon: Trash2, 
      danger: true 
    },
  ];

  return (
    <motion.div
      initial={{ x: -400, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -400, opacity: 0 }}
      className={`absolute left-0 top-0 bottom-0 w-[400px] z-50 flex flex-col ${
        isDark ? 'bg-[#111b21]' : 'bg-white'
      }`}
      data-testid="account-panel"
    >
      {/* Account Header */}
      <div className={`flex items-center gap-6 px-6 py-4 ${
        isDark ? 'bg-[#202c33]' : 'bg-[#00a884]'
      }`}>
        <Button 
          variant="ghost" 
          size="icon" 
          className="rounded-full text-white hover:bg-white/10"
          onClick={onClose}
          data-testid="account-back-btn"
        >
          <ArrowLeft className="w-6 h-6" />
        </Button>
        <h2 className="text-xl font-medium text-white">Account</h2>
      </div>
      
      <ScrollArea className="flex-1">
        {/* Profile Section */}
        <div className="text-center py-8 px-6">
          <div className="relative inline-block">
            <Avatar className="w-32 h-32 mx-auto mb-4 ring-4 ring-[#00a884]/20">
              <AvatarImage src={user?.avatar} />
              <AvatarFallback className="bg-[#00a884] text-white text-4xl">
                {user?.display_name?.charAt(0)?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <button 
              className="absolute bottom-4 right-0 p-2 rounded-full bg-[#00a884]"
              data-testid="change-avatar-btn"
            >
              <Camera className="w-4 h-4 text-white" />
            </button>
          </div>
          <h3 className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {user?.display_name || user?.username}
          </h3>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            @{user?.username}
          </p>
          <p className={`text-sm mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            {user?.email}
          </p>
        </div>

        {/* Status */}
        <div className={`mx-4 p-4 rounded-xl mb-4 ${isDark ? 'bg-[#202c33]' : 'bg-gray-50'}`}>
          <p className={`text-xs font-medium mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            About
          </p>
          <p className={isDark ? 'text-white' : 'text-gray-900'}>
            {user?.status || "Hey, I'm using FaceConnect!"}
          </p>
        </div>
        
        {/* Account Options */}
        <div className="px-4 pb-6">
          <p className={`text-xs font-medium mb-3 px-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            Settings
          </p>
          <div className="space-y-1">
            {accountOptions.map((item) => (
              <button
                key={item.label}
                onClick={item.onClick}
                className={`w-full flex items-center gap-4 px-4 py-3 rounded-lg transition-colors text-left ${
                  isDark 
                    ? 'hover:bg-[#202c33]' 
                    : 'hover:bg-gray-100'
                }`}
                data-testid={`account-${item.label.toLowerCase().replace(/\s+/g, '-')}-btn`}
              >
                <div className={`p-2 rounded-full ${
                  item.danger 
                    ? 'bg-red-500/10' 
                    : (isDark ? 'bg-[#00a884]/10' : 'bg-[#00a884]/10')
                }`}>
                  <item.icon className={`w-5 h-5 ${item.danger ? 'text-red-500' : 'text-[#00a884]'}`} />
                </div>
                <div className="flex-1">
                  <span className={`block ${
                    item.danger 
                      ? 'text-red-500' 
                      : (isDark ? 'text-white' : 'text-gray-900')
                  }`}>
                    {item.label}
                  </span>
                  <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                    {item.description}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </ScrollArea>
    </motion.div>
  );
}
