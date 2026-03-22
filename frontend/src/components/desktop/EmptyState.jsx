import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Lock, FileText, UserPlus, Bot, Users, ArrowLeft, X,
  ExternalLink, Chrome
} from "lucide-react";
import { Button } from "@/components/ui/button";

// Social media links for popup
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
 * EmptyState - Enhanced default state when no chat is selected
 * Features: 3D animations, action buttons, social media popup
 */
export default function EmptyState({ 
  isDark, 
  onSendDocuments, 
  onAddContacts, 
  onAskCopilot,
  openExternalLink 
}) {
  const [showSocialPopup, setShowSocialPopup] = useState(false);

  return (
    <div className={`flex-1 flex flex-col items-center justify-center relative overflow-hidden ${
      isDark ? 'bg-[#222e35]' : 'bg-[#f0f2f5]'
    }`}>
      {/* Animated Background Gradient */}
      <motion.div
        className="absolute inset-0 opacity-30"
        style={{
          background: isDark 
            ? 'radial-gradient(circle at 50% 50%, rgba(0,168,132,0.15) 0%, transparent 50%)'
            : 'radial-gradient(circle at 50% 50%, rgba(0,168,132,0.1) 0%, transparent 50%)'
        }}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />

      {/* Floating particles */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className={`absolute w-2 h-2 rounded-full ${isDark ? 'bg-[#00a884]/20' : 'bg-[#00a884]/10'}`}
          initial={{ 
            x: Math.random() * 400 - 200, 
            y: Math.random() * 400 - 200,
            opacity: 0 
          }}
          animate={{ 
            y: [0, -30, 0],
            opacity: [0, 0.6, 0],
          }}
          transition={{
            duration: 3 + Math.random() * 2,
            repeat: Infinity,
            delay: i * 0.5,
            ease: "easeInOut"
          }}
        />
      ))}

      <div className="w-[450px] text-center relative z-10">
        {/* 3D Animated Logo */}
        <motion.div 
          className="relative w-24 h-24 mx-auto mb-6"
          initial={{ rotateY: 0 }}
          animate={{ 
            rotateY: [0, 10, -10, 0],
            rotateX: [0, -5, 5, 0],
          }}
          transition={{ 
            duration: 6, 
            repeat: Infinity, 
            ease: "easeInOut" 
          }}
          style={{ perspective: 1000, transformStyle: 'preserve-3d' }}
        >
          <motion.div 
            className="w-full h-full rounded-2xl bg-gradient-to-br from-[#00a884] via-[#00d4aa] to-[#0088cc] flex items-center justify-center shadow-2xl"
            whileHover={{ 
              scale: 1.1, 
              rotateY: 15,
              boxShadow: '0 25px 50px -12px rgba(0, 168, 132, 0.5)'
            }}
            style={{ transformStyle: 'preserve-3d' }}
          >
            <span className="text-4xl font-bold text-white drop-shadow-lg">FC</span>
            
            {/* Shine effect */}
            <motion.div
              className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-transparent via-white/30 to-transparent"
              animate={{ x: ['-100%', '200%'] }}
              transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
            />
          </motion.div>
          
          {/* 3D Shadow */}
          <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-16 h-4 bg-black/20 rounded-full blur-md" />
        </motion.div>
        
        <motion.h2 
          className={`text-3xl font-light mb-3 ${isDark ? 'text-white' : 'text-gray-800'}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          FaceConnect Desktop
        </motion.h2>
        
        <motion.p 
          className={`text-sm mb-6 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          Send and receive messages without keeping your phone online.
          <br />
          Use FaceConnect on up to 4 linked devices and 1 phone at the same time.
        </motion.p>
        
        <motion.div 
          className={`flex items-center justify-center gap-2 text-xs mb-8 ${
            isDark ? 'text-gray-500' : 'text-gray-400'
          }`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <Lock className="w-3 h-3" />
          End-to-end encrypted
        </motion.div>

        {/* Action Buttons */}
        <motion.div 
          className="flex gap-3 justify-center mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <motion.button
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={onSendDocuments}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl transition-all ${
              isDark 
                ? 'bg-[#202c33] hover:bg-[#2a3942] text-white border border-[#2a3942]' 
                : 'bg-white hover:bg-gray-50 text-gray-800 border border-gray-200'
            } shadow-lg hover:shadow-xl`}
            data-testid="send-documents-btn"
          >
            <div className="p-2 rounded-lg bg-blue-500/10">
              <FileText className="w-5 h-5 text-blue-500" />
            </div>
            <span className="font-medium">Send Documents</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={onAddContacts}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl transition-all ${
              isDark 
                ? 'bg-[#202c33] hover:bg-[#2a3942] text-white border border-[#2a3942]' 
                : 'bg-white hover:bg-gray-50 text-gray-800 border border-gray-200'
            } shadow-lg hover:shadow-xl`}
            data-testid="add-contacts-btn"
          >
            <div className="p-2 rounded-lg bg-green-500/10">
              <UserPlus className="w-5 h-5 text-green-500" />
            </div>
            <span className="font-medium">Add Contacts</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={onAskCopilot}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl transition-all ${
              isDark 
                ? 'bg-gradient-to-r from-purple-600/20 to-blue-600/20 hover:from-purple-600/30 hover:to-blue-600/30 text-white border border-purple-500/30' 
                : 'bg-gradient-to-r from-purple-50 to-blue-50 hover:from-purple-100 hover:to-blue-100 text-gray-800 border border-purple-200'
            } shadow-lg hover:shadow-xl`}
            data-testid="ask-copilot-btn"
          >
            <div className="p-2 rounded-lg bg-gradient-to-r from-purple-500/10 to-blue-500/10">
              <Bot className="w-5 h-5 text-purple-500" />
            </div>
            <span className="font-medium">Ask Copilot</span>
          </motion.button>
        </motion.div>

        {/* Social Media & Back Buttons */}
        <motion.div 
          className="flex gap-3 justify-center mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowSocialPopup(true)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all ${
              isDark 
                ? 'bg-gradient-to-r from-pink-600/20 to-orange-600/20 hover:from-pink-600/30 hover:to-orange-600/30 text-white border border-pink-500/30' 
                : 'bg-gradient-to-r from-pink-50 to-orange-50 hover:from-pink-100 hover:to-orange-100 text-gray-800 border border-pink-200'
            }`}
            data-testid="social-media-popup-btn"
          >
            <Users className="w-4 h-4 text-pink-500" />
            <span className="text-sm font-medium">Social Media</span>
          </motion.button>
        </motion.div>

        {/* Mobile App Download Links */}
        <motion.div 
          className={`p-4 rounded-xl ${
            isDark ? 'bg-[#111b21]' : 'bg-white'
          } border ${isDark ? 'border-[#2a2a2a]' : 'border-gray-200'} shadow-lg`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <p className={`text-sm mb-3 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            Download the mobile app
          </p>
          <div className="flex gap-3 justify-center">
            <motion.a 
              href="https://play.google.com/store/apps/details?id=com.faceconnect.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                isDark ? 'bg-[#202c33] hover:bg-[#2a3942]' : 'bg-gray-100 hover:bg-gray-200'
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              data-testid="download-google-play"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill={isDark ? '#fff' : '#000'}>
                <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z"/>
              </svg>
              <div className="text-left">
                <div className={`text-[10px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>GET IT ON</div>
                <div className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Google Play</div>
              </div>
            </motion.a>
            <motion.a 
              href="https://apps.apple.com/app/faceconnect" 
              target="_blank" 
              rel="noopener noreferrer"
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                isDark ? 'bg-[#202c33] hover:bg-[#2a3942]' : 'bg-gray-100 hover:bg-gray-200'
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              data-testid="download-app-store"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill={isDark ? '#fff' : '#000'}>
                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
              </svg>
              <div className="text-left">
                <div className={`text-[10px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Download on the</div>
                <div className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>App Store</div>
              </div>
            </motion.a>
          </div>
        </motion.div>
      </div>

      {/* Social Media Popup */}
      <AnimatePresence>
        {showSocialPopup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center"
            onClick={() => setShowSocialPopup(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className={`w-80 rounded-2xl shadow-2xl overflow-hidden ${
                isDark ? 'bg-[#233138] border border-[#2a3942]' : 'bg-white border border-gray-200'
              }`}
            >
              {/* Header */}
              <div className={`flex items-center justify-between px-4 py-3 border-b ${
                isDark ? 'bg-[#1a2328] border-[#2a3942]' : 'bg-gray-50 border-gray-200'
              }`}>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowSocialPopup(false)}
                    className={`h-8 w-8 rounded-full ${isDark ? 'hover:bg-[#2a3942]' : 'hover:bg-gray-200'}`}
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                  <h4 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Social Media
                  </h4>
                </div>
                <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-blue-500/10">
                  <Chrome className="w-3 h-3 text-blue-500" />
                  <span className="text-[10px] text-blue-500 font-medium">Browser</span>
                </div>
              </div>
              
              {/* Links */}
              <div className="p-3 space-y-1">
                {socialLinks.map((social, index) => (
                  <motion.button
                    key={social.name}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ x: 4, backgroundColor: isDark ? 'rgba(42,57,66,0.8)' : 'rgba(243,244,246,1)' }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      if (openExternalLink) openExternalLink(social.url);
                      else window.open(social.url, '_blank');
                      setShowSocialPopup(false);
                    }}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${
                      isDark ? 'hover:bg-[#2a3942]' : 'hover:bg-gray-100'
                    }`}
                  >
                    <span style={{ color: social.color }}>{social.icon}</span>
                    <span className={`flex-1 text-left font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {social.name}
                    </span>
                    <ExternalLink className={`w-4 h-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                  </motion.button>
                ))}
              </div>

              {/* Close Button */}
              <div className={`px-4 py-3 border-t ${isDark ? 'border-[#2a3942]' : 'border-gray-200'}`}>
                <Button
                  variant="outline"
                  className="w-full"
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
    </div>
  );
}
