import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import { Home, Search, Plus, Film, User, MessageCircle, Settings } from "lucide-react";
import { haptic } from "@/utils/mobile";
import CreateMenu from "@/components/CreateMenu";
import { useAuth } from "@/context/AuthContext";
import { useSettings } from "@/context/SettingsContext";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

const API_URL = process.env.REACT_APP_BACKEND_URL;

export const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, unreadCount } = useAuth();
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

  const NavItem = ({ icon: Icon, path, badge, isActive, testId }) => (
    <button
      data-testid={testId}
      onClick={() => handleNavClick(path)}
      className="relative flex items-center justify-center w-12 h-12 transition-colors"
    >
      <Icon 
        className={`w-6 h-6 transition-colors ${
          isActive 
            ? isDark ? 'text-white' : 'text-black'
            : isDark ? 'text-gray-500' : 'text-gray-400'
        }`}
        strokeWidth={isActive ? 2.5 : 1.5}
        fill={isActive ? 'currentColor' : 'none'}
      />
      {badge > 0 && (
        <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 text-[10px] flex items-center justify-center rounded-full bg-[#EF4444] text-white font-bold">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </button>
  );

  const ProfileNavItem = ({ isActive }) => (
    <button
      data-testid="nav-profile"
      onClick={() => handleNavClick("/settings")}
      className="relative flex items-center justify-center w-12 h-12"
    >
      <div className={`w-7 h-7 rounded-full overflow-hidden ring-2 transition-all ${
        isActive 
          ? isDark ? 'ring-white' : 'ring-black'
          : 'ring-transparent'
      }`}>
        <Avatar className="w-full h-full">
          <AvatarImage src={user?.avatar ? `${API_URL}${user.avatar}` : undefined} />
          <AvatarFallback className="bg-gradient-to-br from-[#2D5BFF] to-[#7C3AED] text-white text-xs">
            {user?.display_name?.[0] || user?.username?.[0] || "U"}
          </AvatarFallback>
        </Avatar>
      </div>
    </button>
  );

  return (
    <>
      {/* Bottom Navigation - Floating Dock Style */}
      <nav className="bottom-nav">
        <div className="bottom-nav-inner">
          <NavItem
            testId="nav-home"
            icon={Home}
            path="/"
            isActive={currentPath === "/"}
          />

          <NavItem
            testId="nav-search"
            icon={Search}
            path="/profiles"
            isActive={currentPath === "/profiles"}
          />

          {/* Create Button - Distinct Style */}
          <button
            data-testid="nav-create"
            onClick={handleCreateClick}
            className="create-button"
          >
            <Plus className="w-6 h-6" strokeWidth={2} />
          </button>

          <NavItem
            testId="nav-reels"
            icon={Film}
            path="/reels"
            isActive={currentPath === "/reels"}
          />

          <NavItem
            testId="nav-messages"
            icon={MessageCircle}
            path="/chat"
            isActive={currentPath === "/chat"}
            badge={unreadCount}
          />
        </div>
      </nav>

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
            label="Search"
            path="/profiles"
            isActive={currentPath === "/profiles"}
            onClick={() => handleNavClick("/profiles")}
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
