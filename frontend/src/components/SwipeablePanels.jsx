import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence, useAnimation } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Camera, Settings, Film, Plus, X } from "lucide-react";
import { haptic } from "@/utils/mobile";
import { useSettings } from "@/context/SettingsContext";

const SWIPE_THRESHOLD = 50;
const PANEL_WIDTH = 280;

export default function SwipeablePanels({ children }) {
  const navigate = useNavigate();
  const { isDark } = useSettings();
  const [activePanel, setActivePanel] = useState(null); // 'left' | 'right' | null
  const [dragStart, setDragStart] = useState(null);
  const [currentX, setCurrentX] = useState(0);
  const containerRef = useRef(null);
  const controls = useAnimation();

  // Handle touch/mouse start
  const handleDragStart = (e) => {
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    setDragStart(clientX);
  };

  // Handle touch/mouse move
  const handleDragMove = (e) => {
    if (dragStart === null) return;
    
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const diff = clientX - dragStart;
    
    // Only allow swiping from edges when no panel is open
    if (activePanel === null) {
      // Left edge - open left panel
      if (dragStart < 30 && diff > 0) {
        setCurrentX(Math.min(diff, PANEL_WIDTH));
      }
      // Right edge - open right panel
      else if (dragStart > window.innerWidth - 30 && diff < 0) {
        setCurrentX(Math.max(diff, -PANEL_WIDTH));
      }
    } else if (activePanel === 'left') {
      // Close left panel
      setCurrentX(Math.max(PANEL_WIDTH + diff, 0));
    } else if (activePanel === 'right') {
      // Close right panel
      setCurrentX(Math.min(-PANEL_WIDTH + diff, 0));
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

  const openLeftPanel = () => {
    setActivePanel('left');
    setCurrentX(PANEL_WIDTH);
    haptic.medium();
  };

  const openRightPanel = () => {
    setActivePanel('right');
    setCurrentX(-PANEL_WIDTH);
    haptic.medium();
  };

  // Handle navigation actions
  const handleCamera = () => {
    haptic.medium();
    closePanel();
    // Open camera - navigate to create with camera mode
    navigate('/profiles');
    // You can also trigger a camera modal here
  };

  const handleSettings = () => {
    haptic.medium();
    closePanel();
    navigate('/settings');
  };

  const handleReels = () => {
    haptic.medium();
    closePanel();
    navigate('/reels');
  };

  const handleCreate = () => {
    haptic.medium();
    closePanel();
    // Trigger create menu - dispatch custom event
    window.dispatchEvent(new CustomEvent('openCreateMenu'));
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

  const panelBg = isDark ? 'bg-[#0A0A0A]' : 'bg-white';
  const panelBorder = isDark ? 'border-white/10' : 'border-gray-200';
  const textColor = isDark ? 'text-white' : 'text-gray-900';
  const mutedText = isDark ? 'text-gray-400' : 'text-gray-500';
  const iconBg = isDark ? 'bg-white/10' : 'bg-gray-100';

  return (
    <div 
      ref={containerRef}
      className="relative min-h-screen overflow-hidden sm:overflow-visible"
      onTouchStart={handleDragStart}
      onTouchMove={handleDragMove}
      onTouchEnd={handleDragEnd}
      onMouseDown={handleDragStart}
      onMouseMove={dragStart !== null ? handleDragMove : undefined}
      onMouseUp={handleDragEnd}
      onMouseLeave={dragStart !== null ? handleDragEnd : undefined}
    >
      {/* Left Panel - Camera & Settings */}
      <div 
        className={`fixed top-0 left-0 bottom-0 w-[280px] z-[100] ${panelBg} border-r ${panelBorder} sm:hidden`}
        style={{ 
          transform: `translateX(${Math.min(currentX - PANEL_WIDTH, 0)}px)`,
          transition: dragStart === null ? 'transform 0.3s ease-out' : 'none'
        }}
      >
        <div className="flex flex-col h-full p-6 pt-16 safe-top">
          <h2 className={`text-xl font-bold font-['Syne'] mb-8 ${textColor}`}>Quick Access</h2>
          
          <div className="space-y-4">
            {/* Camera Button */}
            <button
              onClick={handleCamera}
              className={`w-full flex items-center gap-4 p-4 rounded-2xl ${iconBg} hover:scale-[0.98] active:scale-95 transition-transform`}
              data-testid="panel-camera-btn"
            >
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--accent-purple)] flex items-center justify-center">
                <Camera className="w-6 h-6 text-white" />
              </div>
              <div className="text-left">
                <p className={`font-semibold ${textColor}`}>Camera</p>
                <p className={`text-sm ${mutedText}`}>Scan faces</p>
              </div>
            </button>

            {/* Settings Button */}
            <button
              onClick={handleSettings}
              className={`w-full flex items-center gap-4 p-4 rounded-2xl ${iconBg} hover:scale-[0.98] active:scale-95 transition-transform`}
              data-testid="panel-settings-btn"
            >
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center">
                <Settings className="w-6 h-6 text-white" />
              </div>
              <div className="text-left">
                <p className={`font-semibold ${textColor}`}>Settings</p>
                <p className={`text-sm ${mutedText}`}>Preferences</p>
              </div>
            </button>
          </div>

          {/* Swipe hint */}
          <div className={`mt-auto text-center ${mutedText} text-sm`}>
            <p>Swipe right to close</p>
          </div>
        </div>
      </div>

      {/* Right Panel - Reels & Create */}
      <div 
        className={`fixed top-0 right-0 bottom-0 w-[280px] z-[100] ${panelBg} border-l ${panelBorder} sm:hidden`}
        style={{ 
          transform: `translateX(${Math.max(currentX + PANEL_WIDTH, 0)}px)`,
          transition: dragStart === null ? 'transform 0.3s ease-out' : 'none'
        }}
      >
        <div className="flex flex-col h-full p-6 pt-16 safe-top">
          <h2 className={`text-xl font-bold font-['Syne'] mb-8 ${textColor}`}>Create</h2>
          
          <div className="space-y-4">
            {/* Reels Button */}
            <button
              onClick={handleReels}
              className={`w-full flex items-center gap-4 p-4 rounded-2xl ${iconBg} hover:scale-[0.98] active:scale-95 transition-transform`}
              data-testid="panel-reels-btn"
            >
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-500 to-orange-500 flex items-center justify-center">
                <Film className="w-6 h-6 text-white" />
              </div>
              <div className="text-left">
                <p className={`font-semibold ${textColor}`}>Reels</p>
                <p className={`text-sm ${mutedText}`}>Watch & create</p>
              </div>
            </button>

            {/* Create/Camera Button */}
            <button
              onClick={handleCreate}
              className={`w-full flex items-center gap-4 p-4 rounded-2xl ${iconBg} hover:scale-[0.98] active:scale-95 transition-transform`}
              data-testid="panel-create-btn"
            >
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--accent-cyan)] flex items-center justify-center">
                <Plus className="w-6 h-6 text-white" />
              </div>
              <div className="text-left">
                <p className={`font-semibold ${textColor}`}>New Post</p>
                <p className={`text-sm ${mutedText}`}>Photo or video</p>
              </div>
            </button>
          </div>

          {/* Swipe hint */}
          <div className={`mt-auto text-center ${mutedText} text-sm`}>
            <p>Swipe left to close</p>
          </div>
        </div>
      </div>

      {/* Backdrop when panel is open */}
      <AnimatePresence>
        {activePanel && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-[90] sm:hidden"
            onClick={closePanel}
          />
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div 
        className="min-h-screen"
        style={{ 
          transform: `translateX(${currentX}px)`,
          transition: dragStart === null ? 'transform 0.3s ease-out' : 'none'
        }}
      >
        {children}
      </div>

      {/* Edge indicators - Visual hints for swipe areas */}
      {activePanel === null && (
        <>
          {/* Left edge indicator */}
          <div className="fixed left-0 top-1/2 -translate-y-1/2 w-1 h-16 bg-gradient-to-b from-transparent via-[var(--primary)]/30 to-transparent rounded-r-full z-[80] pointer-events-none sm:hidden" />
          
          {/* Right edge indicator */}
          <div className="fixed right-0 top-1/2 -translate-y-1/2 w-1 h-16 bg-gradient-to-b from-transparent via-[var(--primary)]/30 to-transparent rounded-l-full z-[80] pointer-events-none sm:hidden" />
        </>
      )}
    </div>
  );
}
