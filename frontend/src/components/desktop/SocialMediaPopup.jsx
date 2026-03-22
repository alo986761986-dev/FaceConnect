import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, X, Users, ExternalLink, Chrome } from "lucide-react";
import { Button } from "@/components/ui/button";

// Social media links configuration
const socialLinks = [
  { name: 'Facebook', url: 'https://www.facebook.com', color: '#1877F2', icon: (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  )},
  { name: 'Instagram', url: 'https://www.instagram.com', color: '#E4405F', icon: (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
    </svg>
  )},
  { name: 'TikTok', url: 'https://www.tiktok.com', color: '#000000', icon: (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
    </svg>
  )},
  { name: 'Telegram', url: 'https://web.telegram.org/a/', color: '#0088cc', icon: (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
    </svg>
  )},
  { name: 'WhatsApp', url: 'https://web.whatsapp.com', color: '#25D366', icon: (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  )},
  { name: 'YouTube', url: 'https://www.youtube.com', color: '#FF0000', icon: (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
    </svg>
  )},
];

/**
 * SocialMediaPopup - Floating social media links popup
 * Extracted from WhatsAppDesktopLayout.jsx for maintainability
 */
export default function SocialMediaPopup({
  isDark,
  showSocialPopup,
  setShowSocialPopup,
  openExternalLink,
}) {
  return (
    <div className="fixed bottom-6 right-6 z-50">
      <AnimatePresence>
        {showSocialPopup && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className={`absolute bottom-16 right-0 rounded-2xl shadow-2xl overflow-hidden ${
              isDark ? 'bg-[#233138] border border-[#2a3942]' : 'bg-white border border-gray-200'
            }`}
            style={{ minWidth: '240px' }}
          >
            {/* Header with Back Button */}
            <div className={`flex items-center gap-2 px-3 py-2.5 border-b ${
              isDark ? 'bg-[#1a2328] border-[#2a3942]' : 'bg-gray-50 border-gray-200'
            }`}>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowSocialPopup(false)}
                className={`h-7 w-7 rounded-full ${isDark ? 'hover:bg-[#2a3942]' : 'hover:bg-gray-200'}`}
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <h4 className={`flex-1 text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Social Media
              </h4>
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-blue-500/10">
                <Chrome className="w-3 h-3 text-blue-500" />
                <span className="text-[10px] text-blue-500 font-medium">Browser</span>
              </div>
            </div>
            
            <div className="p-2 space-y-1">
              {socialLinks.map((social) => (
                <motion.button
                  key={social.name}
                  whileHover={{ x: 4, backgroundColor: isDark ? 'rgba(42,57,66,0.8)' : 'rgba(243,244,246,1)' }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    openExternalLink(social.url);
                    setShowSocialPopup(false);
                  }}
                  className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-colors ${
                    isDark ? 'hover:bg-[#2a3942]' : 'hover:bg-gray-100'
                  }`}
                  data-testid={`social-${social.name.toLowerCase()}`}
                >
                  <span style={{ color: social.color }}>{social.icon}</span>
                  <span className={`flex-1 text-left text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {social.name}
                  </span>
                  <ExternalLink className={`w-3.5 h-3.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                </motion.button>
              ))}
            </div>
            
            {/* Arrow pointer */}
            <div className={`absolute -bottom-2 right-6 w-4 h-4 rotate-45 ${
              isDark ? 'bg-[#233138] border-r border-b border-[#2a3942]' : 'bg-white border-r border-b border-gray-200'
            }`} />
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Floating Social Button */}
      <div className="flex items-center">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowSocialPopup(!showSocialPopup)}
          className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all ${
            showSocialPopup
              ? 'bg-red-500 hover:bg-red-600'
              : 'bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 hover:from-blue-600 hover:via-purple-600 hover:to-pink-600'
          }`}
          data-testid="social-popup-btn"
        >
          <AnimatePresence mode="wait">
            {showSocialPopup ? (
              <motion.div
                key="close"
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <X className="w-6 h-6 text-white" />
              </motion.div>
            ) : (
              <motion.div
                key="social"
                initial={{ rotate: 90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: -90, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="flex items-center justify-center"
              >
                <Users className="w-6 h-6 text-white" />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>
      </div>
      
      {/* Tooltip */}
      {!showSocialPopup && (
        <motion.div
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          className={`absolute right-16 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${
            isDark ? 'bg-[#233138] text-white' : 'bg-gray-800 text-white'
          }`}
        >
          Social Media
          <div className={`absolute right-[-6px] top-1/2 -translate-y-1/2 w-3 h-3 rotate-45 ${
            isDark ? 'bg-[#233138]' : 'bg-gray-800'
          }`} />
        </motion.div>
      )}
    </div>
  );
}
