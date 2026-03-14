import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import { Home, Camera, Plus, User, Settings } from "lucide-react";
import { haptic } from "@/utils/mobile";

export const BottomNav = ({ onScanClick, onAddClick }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [fabOpen, setFabOpen] = useState(false);
  
  const isHome = location.pathname === "/";
  
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

  return (
    <>
      {/* Backdrop when FAB is open */}
      <AnimatePresence>
        {fabOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 sm:hidden"
            onClick={() => setFabOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 sm:hidden safe-area-bottom">
        <div className="glass border-t border-white/5">
          <div className="flex items-center justify-around px-4 py-2">
            {/* Home */}
            <button
              data-testid="nav-home"
              onClick={() => handleNavClick("/")}
              className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-colors ${
                isHome ? "text-[#00F0FF]" : "text-gray-500"
              }`}
            >
              <Home className="w-6 h-6" />
              <span className="text-xs">Home</span>
            </button>

            {/* Scan - opens camera */}
            <button
              data-testid="nav-scan"
              onClick={handleScan}
              className="flex flex-col items-center gap-1 px-4 py-2 rounded-xl text-gray-500"
            >
              <Camera className="w-6 h-6" />
              <span className="text-xs">Scan</span>
            </button>

            {/* FAB Spacer */}
            <div className="w-16" />

            {/* Profile placeholder */}
            <button
              data-testid="nav-profile"
              className="flex flex-col items-center gap-1 px-4 py-2 rounded-xl text-gray-500 opacity-50"
            >
              <User className="w-6 h-6" />
              <span className="text-xs">Profile</span>
            </button>

            {/* Settings placeholder */}
            <button
              data-testid="nav-settings"
              className="flex flex-col items-center gap-1 px-4 py-2 rounded-xl text-gray-500 opacity-50"
            >
              <Settings className="w-6 h-6" />
              <span className="text-xs">Settings</span>
            </button>
          </div>
        </div>

        {/* Floating Action Button */}
        <div className="absolute left-1/2 -translate-x-1/2 -top-7">
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
              <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3">
                {/* Add Person */}
                <motion.button
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
    </>
  );
};

export default BottomNav;
