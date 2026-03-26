import { useState, useRef, useEffect, createContext, useContext } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, useAnimation } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { 
  Camera, Settings, Film, Plus, X, ArrowLeft, ChevronRight,
  Moon, Sun, Bell, Lock, User, Globe, HelpCircle, LogOut,
  Image, Video, FileText, Smile, Monitor, Zap, Eye
} from "lucide-react";
import { haptic } from "@/utils/mobile";
import { useSettings } from "@/context/SettingsContext";
import { useAuth } from "@/context/AuthContext";

const SWIPE_THRESHOLD = 50;
const PANEL_WIDTH = 280;

// Context for panel controls
const PanelContext = createContext(null);

export function usePanels() {
  return useContext(PanelContext);
}

export default function SwipeablePanels({ children }) {
  const navigate = useNavigate();
  const { isDark, toggleTheme, settings, updateDisplaySetting } = useSettings();
  const { logout } = useAuth();
  const [activePanel, setActivePanel] = useState(null); // 'left' | 'right' | null
  const [dragStart, setDragStart] = useState(null);
  const [currentX, setCurrentX] = useState(0);
  const containerRef = useRef(null);
  const controls = useAnimation();

  // Popup states
  const [showSettingsPopup, setShowSettingsPopup] = useState(false);
  const [showDisplaySettings, setShowDisplaySettings] = useState(false);
  const [showNewPostPopup, setShowNewPostPopup] = useState(false);

  // Functions to open panels programmatically
  const openLeftPanel = () => {
    haptic.medium();
    setActivePanel('left');
    setCurrentX(PANEL_WIDTH);
  };

  const openRightPanel = () => {
    haptic.medium();
    setActivePanel('right');
    setCurrentX(-PANEL_WIDTH);
  };

  // Handle touch/mouse start
  const handleDragStart = (e) => {
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    // Only capture horizontal edge swipes - don't interfere with vertical scrolling
    // Check if starting from edge (within 30px of left or right edge)
    const isLeftEdge = clientX < 30;
    const isRightEdge = clientX > window.innerWidth - 30;
    
    if (activePanel === null && !isLeftEdge && !isRightEdge) {
      // Not starting from edge, don't capture this touch - allow normal scroll
      return;
    }
    
    setDragStart({ x: clientX, y: clientY });
  };

  // Handle touch/mouse move
  const handleDragMove = (e) => {
    if (dragStart === null) return;
    
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const diffX = clientX - dragStart.x;
    const diffY = clientY - dragStart.y;
    
    // If vertical movement is greater than horizontal, this is a scroll - release control
    if (Math.abs(diffY) > Math.abs(diffX) && Math.abs(diffY) > 10) {
      setDragStart(null);
      setCurrentX(0);
      return;
    }
    
    // Only allow swiping from edges when no panel is open
    if (activePanel === null) {
      // Left edge - open left panel
      if (dragStart.x < 30 && diffX > 0) {
        setCurrentX(Math.min(diffX, PANEL_WIDTH));
      }
      // Right edge - open right panel
      else if (dragStart.x > window.innerWidth - 30 && diffX < 0) {
        setCurrentX(Math.max(diffX, -PANEL_WIDTH));
      }
    } else if (activePanel === 'left') {
      // Close left panel
      setCurrentX(Math.max(PANEL_WIDTH + diffX, 0));
    } else if (activePanel === 'right') {
      // Close right panel
      setCurrentX(Math.min(-PANEL_WIDTH + diffX, 0));
    }
  };

  // Handle touch/mouse end
  const handleDragEnd = () => {
    if (dragStart === null) return;
    
    if (activePanel === null) {
      if (currentX > SWIPE_THRESHOLD) {
        setActivePanel('left');
        setCurrentX(PANEL_WIDTH);
        haptic.light();
      } else if (currentX < -SWIPE_THRESHOLD) {
        setActivePanel('right');
        setCurrentX(-PANEL_WIDTH);
        haptic.light();
      } else {
        setCurrentX(0);
      }
    } else {
      if (activePanel === 'left' && currentX < PANEL_WIDTH - SWIPE_THRESHOLD) {
        closePanel();
      } else if (activePanel === 'right' && currentX > -PANEL_WIDTH + SWIPE_THRESHOLD) {
        closePanel();
      } else {
        // Snap back to open position
        setCurrentX(activePanel === 'left' ? PANEL_WIDTH : -PANEL_WIDTH);
      }
    }
    
    setDragStart(null);
  };

  const closePanel = () => {
    setActivePanel(null);
    setCurrentX(0);
    haptic.light();
  };

  // Handle navigation actions
  const handleCamera = () => {
    haptic.medium();
    closePanel();
    // Open camera - navigate to profiles for face scanning
    navigate('/profiles');
    // You can also trigger a camera modal here
  };

  const handleSettings = () => {
    haptic.medium();
    closePanel();
    // Open settings popup instead of navigating
    setShowSettingsPopup(true);
  };

  const handleReels = () => {
    haptic.medium();
    closePanel();
    navigate('/reels');
  };

  const handleCreate = () => {
    haptic.medium();
    closePanel();
    // Open new post popup instead of dispatching event
    setShowNewPostPopup(true);
  };

  // Keyboard escape to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && activePanel) {
        closePanel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activePanel]);

  const panelBg = isDark ? 'bg-[#1A1A2E]' : 'bg-white';
  const panelBorder = isDark ? 'border-white/20' : 'border-gray-200';
  const textColor = isDark ? 'text-white' : 'text-gray-900';
  const mutedText = isDark ? 'text-gray-400' : 'text-gray-500';
  const iconBg = isDark ? 'bg-white/10' : 'bg-gray-100';

  // Context value for panel controls
  const panelContextValue = {
    openLeftPanel,
    openRightPanel,
    closePanel,
    activePanel
  };

  return (
    <PanelContext.Provider value={panelContextValue}>
      {/* Panels rendered via Portal to body to avoid scroll/transform issues */}
      {typeof document !== 'undefined' && createPortal(
        <>
          {/* Animated Backdrop for centered panels */}
          <AnimatePresence>
            {activePanel && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="fixed inset-0 bg-black/70 backdrop-blur-md z-[9998] sm:hidden"
                onClick={closePanel}
                data-testid="panel-backdrop"
              />
            )}
          </AnimatePresence>

          {/* Left Panel - Camera & Settings - CENTERED */}
          {activePanel === 'left' && (
            <div 
              className="fixed inset-0 flex items-center justify-center z-[9999] sm:hidden"
              onClick={(e) => { if (e.target === e.currentTarget) closePanel(); }}
            >
              <div 
                style={{
                  width: '85%',
                  maxWidth: '320px',
                  backgroundColor: isDark ? '#1E1E2E' : '#ffffff',
                  borderRadius: '24px',
                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  overflow: 'hidden'
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex flex-col p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className={`text-xl font-bold font-['Syne'] ${textColor}`}>Quick Access</h2>
                    <button
                      onClick={closePanel}
                      className={`p-2 rounded-full ${iconBg} hover:scale-95 active:scale-90 transition-all duration-200`}
                      data-testid="left-panel-back-btn"
                    >
                      <X className={`w-5 h-5 ${textColor}`} />
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    <button
                      onClick={handleCamera}
                      className={`w-full flex items-center gap-4 p-4 rounded-2xl ${iconBg} transition-all duration-200 active:scale-95`}
                      data-testid="panel-camera-btn"
                    >
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-400 to-purple-500 flex items-center justify-center">
                        <Camera className="w-6 h-6 text-white" />
                      </div>
                      <div className="text-left flex-1">
                        <p className={`font-semibold ${textColor}`}>Camera</p>
                        <p className={`text-sm ${mutedText}`}>Scan faces</p>
                      </div>
                      <ChevronRight className={`w-5 h-5 ${mutedText}`} />
                    </button>

                    <button
                      onClick={handleSettings}
                      className={`w-full flex items-center gap-4 p-4 rounded-2xl ${iconBg} transition-all duration-200 active:scale-95`}
                      data-testid="panel-settings-btn"
                    >
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center">
                        <Settings className="w-6 h-6 text-white" />
                      </div>
                      <div className="text-left flex-1">
                        <p className={`font-semibold ${textColor}`}>Settings</p>
                        <p className={`text-sm ${mutedText}`}>Preferences</p>
                      </div>
                      <ChevronRight className={`w-5 h-5 ${mutedText}`} />
                    </button>
                  </div>

                  <div className={`mt-6 text-center ${mutedText} text-xs`}>
                    <p>Tap outside or X to close</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Right Panel - Reels & Create - CENTERED */}
          {activePanel === 'right' && (
            <div 
              className="fixed inset-0 flex items-center justify-center z-[9999] sm:hidden"
              onClick={(e) => { if (e.target === e.currentTarget) closePanel(); }}
            >
              <div 
                style={{
                  width: '85%',
                  maxWidth: '320px',
                  backgroundColor: isDark ? '#1E1E2E' : '#ffffff',
                  borderRadius: '24px',
                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  overflow: 'hidden'
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex flex-col p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className={`text-xl font-bold font-['Syne'] ${textColor}`}>Create</h2>
                    <button
                      onClick={closePanel}
                      className={`p-2 rounded-full ${iconBg} hover:scale-95 active:scale-90 transition-all duration-200`}
                      data-testid="right-panel-back-btn"
                    >
                      <X className={`w-5 h-5 ${textColor}`} />
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    <button
                      onClick={handleReels}
                      className={`w-full flex items-center gap-4 p-4 rounded-2xl ${iconBg} transition-all duration-200 active:scale-95`}
                      data-testid="panel-reels-btn"
                    >
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-500 to-orange-500 flex items-center justify-center">
                        <Film className="w-6 h-6 text-white" />
                      </div>
                      <div className="text-left flex-1">
                        <p className={`font-semibold ${textColor}`}>Reels</p>
                        <p className={`text-sm ${mutedText}`}>Watch & create</p>
                      </div>
                      <ChevronRight className={`w-5 h-5 ${mutedText}`} />
                    </button>

                    <button
                      onClick={handleCreate}
                      className={`w-full flex items-center gap-4 p-4 rounded-2xl ${iconBg} transition-all duration-200 active:scale-95`}
                      data-testid="panel-create-btn"
                    >
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-400 to-teal-400 flex items-center justify-center">
                        <Plus className="w-6 h-6 text-white" />
                      </div>
                      <div className="text-left flex-1">
                        <p className={`font-semibold ${textColor}`}>New Post</p>
                        <p className={`text-sm ${mutedText}`}>Photo or video</p>
                      </div>
                      <ChevronRight className={`w-5 h-5 ${mutedText}`} />
                    </button>
                  </div>

                  <div className={`mt-6 text-center ${mutedText} text-xs`}>
                    <p>Tap outside or X to close</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>,
        document.body
      )}

      <div 
        ref={containerRef}
        className="relative min-h-screen sm:overflow-visible mobile-scroll-wrapper"
        onTouchStart={handleDragStart}
        onTouchMove={handleDragMove}
        onTouchEnd={handleDragEnd}
        onMouseDown={handleDragStart}
        onMouseMove={dragStart !== null ? handleDragMove : undefined}
        onMouseUp={handleDragEnd}
        onMouseLeave={dragStart !== null ? handleDragEnd : undefined}
        style={{ 
          touchAction: 'pan-y',
          overflowY: 'auto',
          overflowX: 'hidden'
        }}
      >
        <div 
          className="min-h-screen"
          style={{ 
            // Only apply transform when actively dragging or panel is opening
            // This preserves `position: fixed` for children when panels are closed
            ...(currentX !== 0 ? {
              transform: `translateX(${currentX}px)`,
              transition: dragStart === null ? 'transform 0.3s ease-out' : 'none'
            } : {})
          }}
        >
          {children}
        </div>

        {/* Edge indicators - Visual hints for swipe areas */}
        <AnimatePresence>
          {activePanel === null && (
            <>
              {/* Left edge indicator */}
              <motion.div 
                className="fixed left-0 top-1/2 -translate-y-1/2 w-1.5 h-20 bg-gradient-to-b from-transparent via-[var(--primary)]/40 to-transparent rounded-r-full z-[80] pointer-events-none sm:hidden"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.3 }}
              />
              
              {/* Right edge indicator */}
              <motion.div 
                className="fixed right-0 top-1/2 -translate-y-1/2 w-1.5 h-20 bg-gradient-to-b from-transparent via-[var(--primary)]/40 to-transparent rounded-l-full z-[80] pointer-events-none sm:hidden"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.3 }}
              />
            </>
          )}
        </AnimatePresence>
    </div>

    {/* Settings Popup Modal */}
    {typeof document !== 'undefined' && createPortal(
      <AnimatePresence>
        {showSettingsPopup && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-md z-[200]"
              onClick={() => setShowSettingsPopup(false)}
            />
            
            {/* Settings Popup - Positioned at TOP */}
            <motion.div
              initial={{ opacity: 0, y: -100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -100 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className={`fixed inset-x-4 top-4 max-w-md mx-auto ${isDark ? 'bg-[#1a1a1a]' : 'bg-white'} rounded-3xl shadow-2xl z-[201] overflow-hidden sm:hidden`}
            >
              {/* Header */}
              <div className={`flex items-center justify-between p-4 border-b ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>
                <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Settings</h2>
                <button
                  onClick={() => setShowSettingsPopup(false)}
                  className={`p-2 rounded-full ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'} transition-colors`}
                >
                  <X className={`w-5 h-5 ${isDark ? 'text-white' : 'text-gray-900'}`} />
                </button>
              </div>
              
              {/* Settings Options */}
              <div className="p-4 space-y-2 max-h-[60vh] overflow-y-auto">
                {/* Theme Toggle */}
                <button
                  onClick={() => { toggleTheme(); haptic.light(); }}
                  className={`w-full flex items-center gap-4 p-4 rounded-2xl ${isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-gray-50 hover:bg-gray-100'} transition-colors`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isDark ? 'bg-yellow-500/20' : 'bg-blue-500/20'}`}>
                    {isDark ? <Sun className="w-5 h-5 text-yellow-500" /> : <Moon className="w-5 h-5 text-blue-500" />}
                  </div>
                  <div className="flex-1 text-left">
                    <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {isDark ? 'Light Mode' : 'Dark Mode'}
                    </p>
                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      Switch to {isDark ? 'light' : 'dark'} theme
                    </p>
                  </div>
                  <ChevronRight className={`w-5 h-5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                </button>

                {/* Account */}
                <button
                  onClick={() => { setShowSettingsPopup(false); navigate('/settings'); }}
                  className={`w-full flex items-center gap-4 p-4 rounded-2xl ${isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-gray-50 hover:bg-gray-100'} transition-colors`}
                >
                  <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <User className="w-5 h-5 text-blue-500" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Account</p>
                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Profile & security</p>
                  </div>
                  <ChevronRight className={`w-5 h-5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                </button>

                {/* Notifications */}
                <button
                  onClick={() => { setShowSettingsPopup(false); navigate('/settings'); }}
                  className={`w-full flex items-center gap-4 p-4 rounded-2xl ${isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-gray-50 hover:bg-gray-100'} transition-colors`}
                >
                  <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                    <Bell className="w-5 h-5 text-purple-500" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Notifications</p>
                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Push & email alerts</p>
                  </div>
                  <ChevronRight className={`w-5 h-5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                </button>

                {/* Display Settings - NEW */}
                <button
                  onClick={() => { setShowSettingsPopup(false); setShowDisplaySettings(true); haptic.light(); }}
                  className={`w-full flex items-center gap-4 p-4 rounded-2xl ${isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-gray-50 hover:bg-gray-100'} transition-colors`}
                >
                  <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center">
                    <Monitor className="w-5 h-5 text-cyan-500" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Display</p>
                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Refresh rate & quality</p>
                  </div>
                  <ChevronRight className={`w-5 h-5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                </button>

                {/* Privacy */}
                <button
                  onClick={() => { setShowSettingsPopup(false); navigate('/settings'); }}
                  className={`w-full flex items-center gap-4 p-4 rounded-2xl ${isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-gray-50 hover:bg-gray-100'} transition-colors`}
                >
                  <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                    <Lock className="w-5 h-5 text-green-500" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Privacy</p>
                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Who can see your content</p>
                  </div>
                  <ChevronRight className={`w-5 h-5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                </button>

                {/* Language */}
                <button
                  onClick={() => { setShowSettingsPopup(false); navigate('/settings'); }}
                  className={`w-full flex items-center gap-4 p-4 rounded-2xl ${isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-gray-50 hover:bg-gray-100'} transition-colors`}
                >
                  <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center">
                    <Globe className="w-5 h-5 text-orange-500" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Language</p>
                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>English</p>
                  </div>
                  <ChevronRight className={`w-5 h-5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                </button>

                {/* Help */}
                <button
                  onClick={() => { setShowSettingsPopup(false); navigate('/settings'); }}
                  className={`w-full flex items-center gap-4 p-4 rounded-2xl ${isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-gray-50 hover:bg-gray-100'} transition-colors`}
                >
                  <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center">
                    <HelpCircle className="w-5 h-5 text-cyan-500" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Help & Support</p>
                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Get assistance</p>
                  </div>
                  <ChevronRight className={`w-5 h-5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                </button>

                {/* Logout */}
                <button
                  onClick={() => { setShowSettingsPopup(false); logout(); haptic.heavy(); }}
                  className={`w-full flex items-center gap-4 p-4 rounded-2xl ${isDark ? 'bg-red-500/10 hover:bg-red-500/20' : 'bg-red-50 hover:bg-red-100'} transition-colors mt-4`}
                >
                  <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                    <LogOut className="w-5 h-5 text-red-500" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-medium text-red-500">Log Out</p>
                    <p className={`text-sm ${isDark ? 'text-red-400/70' : 'text-red-400'}`}>Sign out of your account</p>
                  </div>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>,
      document.body
    )}

    {/* New Post Popup Modal */}
    {typeof document !== 'undefined' && createPortal(
      <AnimatePresence>
        {showNewPostPopup && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-md z-[200]"
              onClick={() => setShowNewPostPopup(false)}
            />
            
            {/* New Post Popup */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 50 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className={`fixed inset-x-4 top-[20%] max-w-md mx-auto ${isDark ? 'bg-[#1a1a1a]' : 'bg-white'} rounded-3xl shadow-2xl z-[201] overflow-hidden sm:hidden`}
              style={{ maxHeight: '70vh' }}
            >
              {/* Header */}
              <div className={`flex items-center justify-between p-4 border-b ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>
                <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Create New Post</h2>
                <button
                  onClick={() => setShowNewPostPopup(false)}
                  className={`p-2 rounded-full ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'} transition-colors`}
                >
                  <X className={`w-5 h-5 ${isDark ? 'text-white' : 'text-gray-900'}`} />
                </button>
              </div>
              
              {/* Create Options */}
              <div className="p-4 space-y-3 overflow-y-auto" style={{ maxHeight: 'calc(70vh - 70px)' }}>
                {/* Photo Post */}
                <motion.button
                  onClick={() => { setShowNewPostPopup(false); navigate('/create'); haptic.medium(); }}
                  className={`w-full flex items-center gap-4 p-4 rounded-2xl ${isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-gray-50 hover:bg-gray-100'} transition-all`}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center">
                    <Image className="w-7 h-7 text-white" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className={`font-semibold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>Photo</p>
                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Share a photo from your gallery</p>
                  </div>
                  <ChevronRight className={`w-5 h-5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                </motion.button>

                {/* Video Post */}
                <motion.button
                  onClick={() => { setShowNewPostPopup(false); navigate('/create'); haptic.medium(); }}
                  className={`w-full flex items-center gap-4 p-4 rounded-2xl ${isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-gray-50 hover:bg-gray-100'} transition-all`}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center">
                    <Video className="w-7 h-7 text-white" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className={`font-semibold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>Video</p>
                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Record or upload a video</p>
                  </div>
                  <ChevronRight className={`w-5 h-5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                </motion.button>

                {/* Text Post */}
                <motion.button
                  onClick={() => { setShowNewPostPopup(false); navigate('/create'); haptic.medium(); }}
                  className={`w-full flex items-center gap-4 p-4 rounded-2xl ${isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-gray-50 hover:bg-gray-100'} transition-all`}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                    <FileText className="w-7 h-7 text-white" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className={`font-semibold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>Text</p>
                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Write something on your mind</p>
                  </div>
                  <ChevronRight className={`w-5 h-5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                </motion.button>

                {/* Story */}
                <motion.button
                  onClick={() => { setShowNewPostPopup(false); navigate('/stories/create'); haptic.medium(); }}
                  className={`w-full flex items-center gap-4 p-4 rounded-2xl ${isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-gray-50 hover:bg-gray-100'} transition-all`}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-yellow-500 flex items-center justify-center">
                    <Smile className="w-7 h-7 text-white" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className={`font-semibold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>Story</p>
                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Share a moment that disappears</p>
                  </div>
                  <ChevronRight className={`w-5 h-5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                </motion.button>

                {/* Reel */}
                <motion.button
                  onClick={() => { setShowNewPostPopup(false); navigate('/reels/create'); haptic.medium(); }}
                  className={`w-full flex items-center gap-4 p-4 rounded-2xl ${isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-gray-50 hover:bg-gray-100'} transition-all`}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center">
                    <Film className="w-7 h-7 text-white" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className={`font-semibold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>Reel</p>
                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Create a short video reel</p>
                  </div>
                  <ChevronRight className={`w-5 h-5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                </motion.button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>,
      document.body
    )}

    {/* Display Settings Popup Modal */}
    {typeof document !== 'undefined' && createPortal(
      <AnimatePresence>
        {showDisplaySettings && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-md z-[200]"
              onClick={() => setShowDisplaySettings(false)}
            />
            
            {/* Display Settings Popup */}
            <motion.div
              initial={{ opacity: 0, y: -100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -100 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className={`fixed inset-x-4 top-4 max-w-md mx-auto ${isDark ? 'bg-[#1a1a1a]' : 'bg-white'} rounded-3xl shadow-2xl z-[201] overflow-hidden sm:hidden`}
            >
              {/* Header */}
              <div className={`flex items-center justify-between p-4 border-b ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>
                <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Display Settings</h2>
                <button
                  onClick={() => setShowDisplaySettings(false)}
                  className={`p-2 rounded-full ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'} transition-colors`}
                >
                  <X className={`w-5 h-5 ${isDark ? 'text-white' : 'text-gray-900'}`} />
                </button>
              </div>
              
              {/* Display Options */}
              <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
                {/* Refresh Rate Section */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Zap className={`w-5 h-5 ${isDark ? 'text-yellow-400' : 'text-yellow-600'}`} />
                    <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Refresh Rate</h3>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {['auto', '60', '90', '120'].map((rate) => (
                      <button
                        key={rate}
                        onClick={() => { updateDisplaySetting('refreshRate', rate); haptic.light(); }}
                        className={`py-3 px-2 rounded-xl text-center font-medium transition-all ${
                          settings?.display?.refreshRate === rate
                            ? 'bg-[var(--primary)] text-white'
                            : isDark ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                        }`}
                      >
                        {rate === 'auto' ? 'Auto' : `${rate}Hz`}
                      </button>
                    ))}
                  </div>
                  <p className={`text-xs mt-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    Higher refresh rates provide smoother animations
                  </p>
                </div>

                {/* Display Quality Section */}
                <div className={`pt-4 border-t ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>
                  <div className="flex items-center gap-2 mb-3">
                    <Eye className={`w-5 h-5 ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`} />
                    <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Display Quality</h3>
                  </div>
                  <div className="space-y-2">
                    {[
                      { value: 'auto', label: 'Auto', desc: 'Automatically detect display type' },
                      { value: 'low', label: 'Low (TFT LCD)', desc: 'Basic effects, better battery' },
                      { value: 'medium', label: 'Medium (IPS/Incell)', desc: 'Balanced effects & performance' },
                      { value: 'high', label: 'High (AMOLED/OLED)', desc: 'Full effects, true blacks' },
                    ].map((quality) => (
                      <button
                        key={quality.value}
                        onClick={() => { updateDisplaySetting('displayQuality', quality.value); haptic.light(); }}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                          settings?.display?.displayQuality === quality.value
                            ? 'bg-[var(--primary)] text-white'
                            : isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-gray-50 hover:bg-gray-100'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                          settings?.display?.displayQuality === quality.value
                            ? 'border-white bg-white'
                            : isDark ? 'border-gray-500' : 'border-gray-400'
                        }`}>
                          {settings?.display?.displayQuality === quality.value && (
                            <div className="w-2 h-2 rounded-full bg-[var(--primary)]" />
                          )}
                        </div>
                        <div className="flex-1 text-left">
                          <p className={`font-medium ${settings?.display?.displayQuality === quality.value ? 'text-white' : isDark ? 'text-white' : 'text-gray-900'}`}>
                            {quality.label}
                          </p>
                          <p className={`text-xs ${settings?.display?.displayQuality === quality.value ? 'text-white/70' : isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            {quality.desc}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Additional Options */}
                <div className={`pt-4 border-t ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>
                  <h3 className={`font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>Additional Options</h3>
                  
                  {/* Smooth Animations Toggle */}
                  <div className={`flex items-center justify-between p-3 rounded-xl ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                    <div>
                      <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Smooth Animations</p>
                      <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>GPU-accelerated animations</p>
                    </div>
                    <button
                      onClick={() => { updateDisplaySetting('smoothAnimations', !settings?.display?.smoothAnimations); haptic.light(); }}
                      className={`w-12 h-7 rounded-full transition-colors ${
                        settings?.display?.smoothAnimations !== false ? 'bg-[var(--primary)]' : isDark ? 'bg-gray-700' : 'bg-gray-300'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full bg-white shadow transform transition-transform ${
                        settings?.display?.smoothAnimations !== false ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>

                  {/* Reduced Motion Toggle */}
                  <div className={`flex items-center justify-between p-3 rounded-xl mt-2 ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                    <div>
                      <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Reduced Motion</p>
                      <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Minimize animations (accessibility)</p>
                    </div>
                    <button
                      onClick={() => { updateDisplaySetting('reducedMotion', !settings?.display?.reducedMotion); haptic.light(); }}
                      className={`w-12 h-7 rounded-full transition-colors ${
                        settings?.display?.reducedMotion ? 'bg-[var(--primary)]' : isDark ? 'bg-gray-700' : 'bg-gray-300'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full bg-white shadow transform transition-transform ${
                        settings?.display?.reducedMotion ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>

                  {/* High Contrast Toggle */}
                  <div className={`flex items-center justify-between p-3 rounded-xl mt-2 ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                    <div>
                      <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>High Contrast</p>
                      <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Better visibility on low quality displays</p>
                    </div>
                    <button
                      onClick={() => { updateDisplaySetting('highContrast', !settings?.display?.highContrast); haptic.light(); }}
                      className={`w-12 h-7 rounded-full transition-colors ${
                        settings?.display?.highContrast ? 'bg-[var(--primary)]' : isDark ? 'bg-gray-700' : 'bg-gray-300'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full bg-white shadow transform transition-transform ${
                        settings?.display?.highContrast ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>,
      document.body
    )}

    </PanelContext.Provider>
  );
}
