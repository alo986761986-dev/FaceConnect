import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import { Home, Search, Plus, Film, MessageCircle, Settings, Bell, Heart, ShoppingBag, User } from "lucide-react";
import { haptic } from "@/utils/mobile";
import CreateMenu from "@/components/CreateMenu";
import { useAuth } from "@/context/AuthContext";
import { useSettings } from "@/context/SettingsContext";

const API_URL = process.env.REACT_APP_BACKEND_URL;

export const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { unreadCount } = useAuth();
  const { isDark } = useSettings();
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  
  const currentPath = location.pathname;

  // Listen for openCreateMenu custom event from swipeable panels
  useEffect(() => {
    const handleOpenCreateMenu = () => {
      setShowCreateMenu(true);
    };
    window.addEventListener('openCreateMenu', handleOpenCreateMenu);
    return () => window.removeEventListener('openCreateMenu', handleOpenCreateMenu);
  }, []);
  
  const handleNavClick = (path) => {
    haptic.light();
    navigate(path);
  };

  const handleCreateClick = () => {
    haptic.medium();
    setShowCreateMenu(true);
  };

  // Navigation item with outline style matching the image
  const NavItem = ({ icon: Icon, path, badge, isActive, testId }) => (
    <motion.button
      data-testid={testId}
      onClick={() => handleNavClick(path)}
      className="relative flex items-center justify-center w-14 h-14 transition-colors"
      whileTap={{ scale: 0.85 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
    >
      <Icon 
        className={`w-7 h-7 transition-all duration-200 ${
          isActive 
            ? isDark ? 'text-white' : 'text-black'
            : isDark ? 'text-gray-500' : 'text-gray-400'
        }`}
        strokeWidth={1.5}
        fill="none"
      />
      {/* Notification badge */}
      <AnimatePresence>
        {badge > 0 && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 25 }}
            className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#00D4FF]"
          />
        )}
      </AnimatePresence>
    </motion.button>
  );

  // Mobile Bottom Navigation using Portal to escape transform context
  const mobileNav = (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden" data-testid="mobile-bottom-nav">
      {/* Subtle top border line */}
      <div className={`absolute top-0 left-0 right-0 h-px ${isDark ? 'bg-gray-800/50' : 'bg-gray-200'}`} />
      
      {/* Navigation bar background */}
      <div className={`${isDark ? 'bg-[#0A0A0A]' : 'bg-white'} px-2 pb-safe`}>
        <div className="flex items-center justify-around h-16">
          {/* Home */}
          <NavItem
            testId="nav-home"
            icon={Home}
            path="/"
            isActive={currentPath === "/"}
          />

          {/* Reels/Video */}
          <NavItem
            testId="nav-reels"
            icon={Film}
            path="/reels"
            isActive={currentPath === "/reels"}
          />

          {/* Marketplace - Shopping Bag */}
          <NavItem
            testId="nav-marketplace"
            icon={ShoppingBag}
            path="/marketplace"
            isActive={currentPath === "/marketplace"}
          />

          {/* Dating - Heart */}
          <NavItem
            testId="nav-dating"
            icon={Heart}
            path="/dating"
            isActive={currentPath === "/dating"}
          />

          {/* Notifications - Bell */}
          <NavItem
            testId="nav-notifications"
            icon={Bell}
            path="/notifications"
            isActive={currentPath === "/notifications"}
            badge={unreadCount}
          />

          {/* Profile */}
          <motion.button
            data-testid="nav-profile"
            onClick={() => handleNavClick("/profile")}
            className="relative flex items-center justify-center w-14 h-14"
            whileTap={{ scale: 0.85 }}
          >
            <div className={`w-8 h-8 rounded-full overflow-hidden border-2 ${
              currentPath === "/profile" 
                ? isDark ? 'border-white' : 'border-black'
                : 'border-transparent'
            }`}>
              <img 
                src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop"
                alt="Profile"
                className="w-full h-full object-cover"
              />
            </div>
          </motion.button>
        </div>
      </div>
    </nav>
  );

  return (
    <>
      {/* Bottom Navigation - Rendered via Portal to body to escape transform context */}
      {typeof document !== 'undefined' && createPortal(mobileNav, document.body)}

      {/* Desktop Sidebar - Hidden on Mobile */}
      <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-[72px] lg:w-[244px] flex-col border-r border-[var(--border)] bg-[var(--background)] z-50">
        {/* Logo */}
        <div className="h-[72px] flex items-center px-4 lg:px-6">
          <span className="hidden lg:block text-xl font-bold font-['Syne']">
            FaceConnect
          </span>
          <span className="lg:hidden text-2xl font-bold">F</span>
        </div>

        {/* Nav Items */}
        <div className="flex-1 py-4 space-y-1 px-3">
          <DesktopNavItem
            icon={Home}
            label="Home"
            path="/"
            isActive={currentPath === "/"}
            onClick={() => handleNavClick("/")}
            isDark={isDark}
          />
          <DesktopNavItem
            icon={Search}
            label="Explore"
            path="/explore"
            isActive={currentPath === "/explore"}
            onClick={() => handleNavClick("/explore")}
            isDark={isDark}
          />
          <DesktopNavItem
            icon={Film}
            label="Reels"
            path="/reels"
            isActive={currentPath === "/reels"}
            onClick={() => handleNavClick("/reels")}
            isDark={isDark}
          />
          <DesktopNavItem
            icon={MessageCircle}
            label="Messages"
            path="/chat"
            isActive={currentPath === "/chat"}
            onClick={() => handleNavClick("/chat")}
            badge={unreadCount}
            isDark={isDark}
          />

          {/* Create Button */}
          <button
            onClick={handleCreateClick}
            className="w-full flex items-center gap-4 px-3 py-3 rounded-lg hover:bg-[var(--muted)] transition-colors mt-4"
          >
            <div className="w-6 h-6 rounded-lg bg-[var(--text-primary)] flex items-center justify-center">
              <Plus className="w-4 h-4 text-[var(--background)]" />
            </div>
            <span className="hidden lg:block font-medium">Create</span>
          </button>
        </div>

        {/* Profile */}
        <div className="p-3 border-t border-[var(--border)]">
          <DesktopNavItem
            icon={Settings}
            label="Settings"
            path="/settings"
            isActive={currentPath === "/settings"}
            onClick={() => handleNavClick("/settings")}
            isDark={isDark}
          />
        </div>
      </aside>

      {/* Create Menu Modal */}
      <CreateMenu
        isOpen={showCreateMenu}
        onClose={() => setShowCreateMenu(false)}
      />
    </>
  );
};

// Desktop Navigation Item
const DesktopNavItem = ({ icon: Icon, label, path, isActive, onClick, badge, isDark }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-4 px-3 py-3 rounded-lg transition-colors ${
      isActive 
        ? 'bg-[var(--muted)]' 
        : 'hover:bg-[var(--muted)]'
    }`}
  >
    <div className="relative">
      <Icon 
        className={`w-6 h-6 ${isActive ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}
        strokeWidth={isActive ? 2.5 : 1.5}
        fill={isActive ? 'currentColor' : 'none'}
      />
      {badge > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 text-[9px] flex items-center justify-center rounded-full bg-[#EF4444] text-white font-bold">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </div>
    <span className={`hidden lg:block ${isActive ? 'font-semibold' : 'font-medium'}`}>
      {label}
    </span>
  </button>
);

export default BottomNav;
