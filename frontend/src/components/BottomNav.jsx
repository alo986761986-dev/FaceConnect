import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import { Home, Camera, Plus, User, Shield, MessageCircle, Play, Settings } from "lucide-react";
import { haptic } from "@/utils/mobile";
import SecuritySettings from "@/components/SecuritySettings";
import { useAuth } from "@/context/AuthContext";

export const BottomNav = ({ onScanClick, onAddClick }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { unreadCount } = useAuth();
  const [fabOpen, setFabOpen] = useState(false);
  const [showSecuritySettings, setShowSecuritySettings] = useState(false);
  
  const isHome = location.pathname === "/";
  const isChat = location.pathname === "/chat";
  const isReels = location.pathname === "/reels";
  const isSettings = location.pathname === "/settings";
  
  const handleNavClick = (path) => {
    haptic.light();
    navigate(path);
  };

  const handleFabClick = () => {
    haptic.medium();
    setFabOpen(!fabOpen);
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
            <div className="w-16" />

            {/* Reels */}
            <button
              data-testid="nav-reels"
              onClick={() => handleNavClick("/reels")}
              className={`flex flex-col items-center justify-center gap-1 min-w-[48px] py-2 rounded-xl transition-colors ${
                isReels ? "text-[#00F0FF]" : "text-gray-500"
              }`}
            >
              <Play className="w-5 h-5" />
              <span className="text-[10px]">Reels</span>
            </button>

            {/* Settings */}
            <button
              data-testid="nav-settings"
              onClick={() => handleNavClick("/settings")}
              className={`flex flex-col items-center justify-center gap-1 min-w-[48px] py-2 rounded-xl transition-colors ${
                isSettings ? "text-[#00F0FF]" : "text-gray-500"
              }`}
            >
              <Settings className="w-5 h-5" />
              <span className="text-[10px]">Settings</span>
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
            <motion.div
              animate={{ rotate: fabOpen ? 45 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <Plus className="w-7 h-7 text-white" />
            </motion.div>
          </motion.button>

          {/* FAB Menu */}
          <AnimatePresence>
            {fabOpen && (
              <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 z-[90]">
                {/* Add Person */}
                <motion.button
                  data-testid="fab-add-person"
                  initial={{ opacity: 0, y: 20, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.8 }}
                  transition={{ delay: 0.05 }}
                  onClick={handleAdd}
                  className="flex items-center gap-3 px-4 py-3 rounded-full bg-[#1A1A1A] border border-white/10 shadow-lg"
                >
                  <div className="w-10 h-10 rounded-full bg-[#7000FF]/20 flex items-center justify-center">
                    <User className="w-5 h-5 text-[#7000FF]" />
                  </div>
                  <span className="text-white font-medium pr-2">Add Person</span>
                </motion.button>

                {/* Scan Face */}
                <motion.button
                  data-testid="fab-scan-face"
                  initial={{ opacity: 0, y: 20, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.8 }}
                  transition={{ delay: 0 }}
                  onClick={handleScan}
                  className="flex items-center gap-3 px-4 py-3 rounded-full bg-[#1A1A1A] border border-white/10 shadow-lg"
                >
                  <div className="w-10 h-10 rounded-full bg-[#00F0FF]/20 flex items-center justify-center">
                    <Camera className="w-5 h-5 text-[#00F0FF]" />
                  </div>
                  <span className="text-white font-medium pr-2">Scan Face</span>
                </motion.button>
              </div>
            )}
          </AnimatePresence>
        </div>
      </nav>

      {/* Security Settings Modal */}
      <SecuritySettings 
        isOpen={showSecuritySettings} 
        onClose={setShowSecuritySettings} 
      />
    </>
  );
};

export default BottomNav;
