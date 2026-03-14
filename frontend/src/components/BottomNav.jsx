import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import { Home, Camera, Plus, User, Users, MessageCircle, Play, Settings } from "lucide-react";
import { haptic } from "@/utils/mobile";
import SecuritySettings from "@/components/SecuritySettings";
import CreateMenu from "@/components/CreateMenu";
import { useAuth } from "@/context/AuthContext";

export const BottomNav = ({ onScanClick, onAddClick }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { unreadCount } = useAuth();
  const [fabOpen, setFabOpen] = useState(false);
  const [showSecuritySettings, setShowSecuritySettings] = useState(false);
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  
  const isHome = location.pathname === "/";
  const isChat = location.pathname === "/chat";
  const isReels = location.pathname === "/reels";
  const isSettings = location.pathname === "/settings";
  const isFriends = location.pathname === "/friends";
  
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

      {/* Bottom Navigation */}
      <nav 
        className="fixed bottom-0 left-0 right-0 z-[70] sm:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="bg-[#121212]/95 backdrop-blur-lg border-t border-white/10">
          <div className="flex items-center justify-around px-2 h-16">
            {/* Home */}
            <button
              data-testid="nav-home"
              onClick={() => handleNavClick("/")}
              className={`flex flex-col items-center justify-center gap-1 min-w-[48px] py-2 rounded-xl transition-colors ${
                isHome ? "text-[#00F0FF]" : "text-gray-500"
              }`}
            >
              <Home className="w-5 h-5" />
              <span className="text-[10px]">Home</span>
            </button>

            {/* Chat */}
            <button
              data-testid="nav-chat"
              onClick={() => handleNavClick("/chat")}
              className={`relative flex flex-col items-center justify-center gap-1 min-w-[48px] py-2 rounded-xl transition-colors ${
                isChat ? "text-[#00F0FF]" : "text-gray-500"
              }`}
            >
              <div className="relative">
                <MessageCircle className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 text-[9px] flex items-center justify-center rounded-full bg-[#00F0FF] text-black font-bold">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </div>
              <span className="text-[10px]">Chat</span>
            </button>

            {/* FAB Spacer */}
            <div className="w-14" />

            {/* Friends */}
            <button
              data-testid="nav-friends"
              onClick={() => handleNavClick("/friends")}
              className={`flex flex-col items-center justify-center gap-1 min-w-[44px] py-2 rounded-xl transition-colors ${
                isFriends ? "text-[#00F0FF]" : "text-gray-500"
              }`}
            >
              <Users className="w-5 h-5" />
              <span className="text-[10px]">Friends</span>
            </button>

            {/* Settings */}
            <button
              data-testid="nav-settings"
              onClick={() => handleNavClick("/settings")}
              className={`flex flex-col items-center justify-center gap-1 min-w-[44px] py-2 rounded-xl transition-colors ${
                isSettings ? "text-[#00F0FF]" : "text-gray-500"
              }`}
            >
              <Settings className="w-5 h-5" />
              <span className="text-[10px]">More</span>
            </button>
          </div>
        </div>

        {/* Floating Action Button */}
        <div className="absolute left-1/2 -translate-x-1/2 -top-7 z-[80]">
          <motion.button
            data-testid="fab-main"
            onClick={handleFabClick}
            whileTap={{ scale: 0.9 }}
            className="w-14 h-14 rounded-full bg-gradient-to-r from-[#00F0FF] to-[#7000FF] shadow-lg shadow-[#00F0FF]/30 flex items-center justify-center"
          >
            <Plus className="w-7 h-7 text-white" />
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
