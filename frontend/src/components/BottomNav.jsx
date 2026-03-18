import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import { Home, Camera, Plus, User, Users, MessageCircle, Play, Settings, Scan, Bot, Radio, Film } from "lucide-react";
import { haptic } from "@/utils/mobile";
import SecuritySettings from "@/components/SecuritySettings";
import CreateMenu from "@/components/CreateMenu";
import { useAuth } from "@/context/AuthContext";
import { useSettings } from "@/context/SettingsContext";

export const BottomNav = ({ onScanClick, onAddClick }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { unreadCount } = useAuth();
  const { t } = useSettings();
  const [fabOpen, setFabOpen] = useState(false);
  const [showSecuritySettings, setShowSecuritySettings] = useState(false);
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  
  const isHome = location.pathname === "/";
  const isChat = location.pathname === "/chat";
  const isReels = location.pathname === "/reels";
  const isLive = location.pathname === "/live";
  const isSettings = location.pathname === "/settings";
  const isFriends = location.pathname === "/friends";
  const isProfiles = location.pathname === "/profiles";
  const isAI = location.pathname === "/ai";
  
  const handleNavClick = (path) => {
    haptic.light();
    navigate(path);
  };

  const handleFabClick = () => {
    haptic.medium();
    setShowCreateMenu(true);
  };

  const handleScan = () => {
    haptic.success();
    setFabOpen(false);
    onScanClick?.();
  };

  const handleAdd = () => {
    haptic.success();
    setFabOpen(false);
    onAddClick?.();
  };

  const handleSecurityClick = () => {
    haptic.light();
    setShowSecuritySettings(true);
  };

  const NavItem = ({ icon: Icon, label, active, onClick, badge, testId }) => (
    <motion.button
      data-testid={testId}
      onClick={onClick}
      whileTap={{ scale: 0.9 }}
      className="flex flex-col items-center justify-center gap-0.5 min-w-[48px] py-2 px-2 rounded-2xl transition-all duration-200 relative"
    >
      <div className={`relative transition-all duration-200 ${active ? 'scale-110' : ''}`}>
        <Icon 
          className={`w-5 h-5 transition-all duration-200 ${
            active 
              ? 'text-[#00E5FF]' 
              : 'text-[#52525B]'
          }`}
          style={active ? { filter: 'drop-shadow(0 0 8px rgba(0, 229, 255, 0.6))' } : {}}
        />
        {badge > 0 && (
          <motion.span 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 text-[9px] flex items-center justify-center rounded-full bg-gradient-to-r from-[#00E5FF] to-[#7C3AED] text-black font-bold shadow-lg"
          >
            {badge > 9 ? "9+" : badge}
          </motion.span>
        )}
      </div>
      <span className={`text-[9px] font-medium transition-colors duration-200 ${
        active ? 'text-[#00E5FF]' : 'text-[#52525B]'
      }`}>
        {label}
      </span>
      {/* Active indicator dot */}
      {active && (
        <motion.div
          layoutId="navIndicator"
          className="absolute -bottom-0.5 w-1 h-1 rounded-full bg-[#00E5FF]"
          style={{ boxShadow: '0 0 8px rgba(0, 229, 255, 0.8)' }}
        />
      )}
    </motion.button>
  );

  return (
    <>
      {/* Backdrop when FAB is open */}
      <AnimatePresence>
        {fabOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] sm:hidden"
            onClick={() => setFabOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Neo-Noir Dock Navigation */}
      <nav 
        className="fixed bottom-4 left-4 right-4 z-[70] sm:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <motion.div 
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="relative bg-[#0A0A0A]/80 backdrop-blur-xl border border-white/10 rounded-[28px] shadow-2xl shadow-black/50"
        >
          {/* Subtle gradient overlay */}
          <div className="absolute inset-0 rounded-[28px] bg-gradient-to-b from-white/[0.03] to-transparent pointer-events-none" />
          
          <div className="flex items-center justify-around px-2 h-16 relative">
            <NavItem
              testId="nav-home"
              icon={Home}
              label={t('home') || 'Home'}
              active={isHome}
              onClick={() => handleNavClick("/")}
            />

            <NavItem
              testId="nav-reels"
              icon={Film}
              label={t('reels') || 'Reels'}
              active={isReels}
              onClick={() => handleNavClick("/reels")}
            />

            {/* FAB Spacer */}
            <div className="w-14" />

            <NavItem
              testId="nav-messages"
              icon={MessageCircle}
              label={t('chat') || 'Chat'}
              active={isChat}
              onClick={() => handleNavClick("/chat")}
              badge={unreadCount}
            />

            <NavItem
              testId="nav-settings"
              icon={Settings}
              label={t('settings') || 'Settings'}
              active={isSettings}
              onClick={() => handleNavClick("/settings")}
            />
          </div>
        </motion.div>

        {/* Floating Action Button - Centered with glow */}
        <div className="absolute left-1/2 -translate-x-1/2 -top-5 z-[80]">
          <motion.button
            data-testid="fab-main"
            onClick={handleFabClick}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="relative w-14 h-14 rounded-full bg-gradient-to-br from-[#00E5FF] via-[#00B8D4] to-[#7C3AED] flex items-center justify-center group"
            style={{
              boxShadow: '0 0 20px rgba(0, 229, 255, 0.4), 0 4px 20px rgba(0, 0, 0, 0.5)'
            }}
          >
            {/* Pulse ring */}
            <span className="absolute inset-0 rounded-full bg-gradient-to-br from-[#00E5FF] to-[#7C3AED] animate-ping opacity-20" />
            <Plus className="w-7 h-7 text-black relative z-10" />
          </motion.button>
        </div>
      </nav>

      {/* Security Settings Modal */}
      <SecuritySettings 
        isOpen={showSecuritySettings} 
        onClose={setShowSecuritySettings} 
      />

      {/* Create Menu Modal */}
      <CreateMenu
        isOpen={showCreateMenu}
        onClose={() => setShowCreateMenu(false)}
      />
    </>
  );
};

export default BottomNav;
