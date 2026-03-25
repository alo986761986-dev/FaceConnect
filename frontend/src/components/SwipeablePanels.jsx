import { useState, useRef, useEffect, createContext, useContext } from "react";
import { motion, AnimatePresence, useAnimation } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Camera, Settings, Film, Plus, X, ArrowLeft, ChevronRight } from "lucide-react";
import { haptic } from "@/utils/mobile";
import { useSettings } from "@/context/SettingsContext";

const SWIPE_THRESHOLD = 50;
const PANEL_WIDTH = 280;

// Context for panel controls
const PanelContext = createContext(null);

export function usePanels() {
  return useContext(PanelContext);
}

export default function SwipeablePanels({ children }) {
  const navigate = useNavigate();
  const { isDark } = useSettings();
  const [activePanel, setActivePanel] = useState(null); // 'left' | 'right' | null
  const [dragStart, setDragStart] = useState(null);
  const [currentX, setCurrentX] = useState(0);
  const containerRef = useRef(null);
  const controls = useAnimation();

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

  // Context value for panel controls
  const panelContextValue = {
    openLeftPanel,
    openRightPanel,
    closePanel,
    activePanel
  };

  return (
    <PanelContext.Provider value={panelContextValue}>
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
          /* Allow vertical scrolling on mobile, only horizontal restricted */
          touchAction: 'pan-y',
          overflowY: 'auto',
          overflowX: 'hidden'
        }}
      >
        {/* Backdrop for centered panels */}
        {activePanel && (
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[99] sm:hidden"
            onClick={closePanel}
            style={{
              opacity: activePanel ? 1 : 0,
            transition: 'opacity 0.3s ease-out'
          }}
        />
      )}

      {/* Left Panel - Camera & Settings - CENTERED */}
      <div 
        className={`fixed inset-0 flex items-center justify-center z-[100] pointer-events-none sm:hidden`}
        style={{ 
          opacity: activePanel === 'left' || currentX > 50 ? 1 : 0,
          transition: dragStart === null ? 'opacity 0.3s ease-out' : 'none'
        }}
      >
        <div 
          className={`w-[85%] max-w-[320px] ${panelBg} rounded-3xl shadow-2xl pointer-events-auto`}
          style={{
            transform: activePanel === 'left' ? 'scale(1)' : currentX > 50 ? `scale(${0.8 + (currentX / PANEL_WIDTH) * 0.2})` : 'scale(0.8)',
            opacity: activePanel === 'left' ? 1 : currentX > 50 ? currentX / PANEL_WIDTH : 0,
            transition: dragStart === null ? 'transform 0.3s ease-out, opacity 0.3s ease-out' : 'none'
          }}
        >
          <div className="flex flex-col p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className={`text-xl font-bold font-['Syne'] ${textColor}`}>Quick Access</h2>
              <button
                onClick={closePanel}
                className={`p-2 rounded-full ${iconBg} hover:scale-95 active:scale-90 transition-transform`}
                data-testid="left-panel-back-btn"
              >
                <X className={`w-5 h-5 ${textColor}`} />
              </button>
            </div>
            
            <div className="space-y-3">
              {/* Camera Button */}
              <button
                onClick={handleCamera}
                className={`w-full flex items-center gap-4 p-4 rounded-2xl ${iconBg} hover:scale-[0.98] active:scale-95 transition-transform`}
                data-testid="panel-camera-btn"
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--accent-purple)] flex items-center justify-center">
                  <Camera className="w-6 h-6 text-white" />
                </div>
                <div className="text-left flex-1">
                  <p className={`font-semibold ${textColor}`}>Camera</p>
                  <p className={`text-sm ${mutedText}`}>Scan faces</p>
                </div>
                <ChevronRight className={`w-5 h-5 ${mutedText}`} />
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
                <div className="text-left flex-1">
                  <p className={`font-semibold ${textColor}`}>Settings</p>
                  <p className={`text-sm ${mutedText}`}>Preferences</p>
                </div>
                <ChevronRight className={`w-5 h-5 ${mutedText}`} />
              </button>
            </div>

            {/* Hint */}
            <div className={`mt-6 text-center ${mutedText} text-xs`}>
              <p>Tap outside or X to close</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Reels & Create - CENTERED */}
      <div 
        className={`fixed inset-0 flex items-center justify-center z-[100] pointer-events-none sm:hidden`}
        style={{ 
          opacity: activePanel === 'right' || currentX < -50 ? 1 : 0,
          transition: dragStart === null ? 'opacity 0.3s ease-out' : 'none'
        }}
      >
        <div 
          className={`w-[85%] max-w-[320px] ${panelBg} rounded-3xl shadow-2xl pointer-events-auto`}
          style={{
            transform: activePanel === 'right' ? 'scale(1)' : currentX < -50 ? `scale(${0.8 + (Math.abs(currentX) / PANEL_WIDTH) * 0.2})` : 'scale(0.8)',
            opacity: activePanel === 'right' ? 1 : currentX < -50 ? Math.abs(currentX) / PANEL_WIDTH : 0,
            transition: dragStart === null ? 'transform 0.3s ease-out, opacity 0.3s ease-out' : 'none'
          }}
        >
          <div className="flex flex-col p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className={`text-xl font-bold font-['Syne'] ${textColor}`}>Create</h2>
              <button
                onClick={closePanel}
                className={`p-2 rounded-full ${iconBg} hover:scale-95 active:scale-90 transition-transform`}
                data-testid="right-panel-back-btn"
              >
                <X className={`w-5 h-5 ${textColor}`} />
              </button>
            </div>
            
            <div className="space-y-3">
              {/* Reels Button */}
              <button
                onClick={handleReels}
                className={`w-full flex items-center gap-4 p-4 rounded-2xl ${iconBg} hover:scale-[0.98] active:scale-95 transition-transform`}
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

              {/* Create/Camera Button */}
              <button
                onClick={handleCreate}
                className={`w-full flex items-center gap-4 p-4 rounded-2xl ${iconBg} hover:scale-[0.98] active:scale-95 transition-transform`}
                data-testid="panel-create-btn"
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--accent-cyan)] flex items-center justify-center">
                  <Plus className="w-6 h-6 text-white" />
                </div>
                <div className="text-left flex-1">
                  <p className={`font-semibold ${textColor}`}>New Post</p>
                  <p className={`text-sm ${mutedText}`}>Photo or video</p>
                </div>
                <ChevronRight className={`w-5 h-5 ${mutedText}`} />
              </button>
            </div>

            {/* Hint */}
            <div className={`mt-6 text-center ${mutedText} text-xs`}>
              <p>Tap outside or X to close</p>
            </div>
          </div>
        </div>
      </div>

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
    </PanelContext.Provider>
  );
}
