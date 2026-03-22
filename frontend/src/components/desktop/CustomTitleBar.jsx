import { useState, useEffect } from 'react';
import { Minus, Square, X, Maximize2 } from 'lucide-react';
import { useSettings } from '@/context/SettingsContext';

export default function CustomTitleBar() {
  const { isDark } = useSettings();
  const [isMaximized, setIsMaximized] = useState(false);
  const [isElectronApp, setIsElectronApp] = useState(false);

  useEffect(() => {
    // Check if running in Electron
    setIsElectronApp(!!window.electronAPI);

    // Get initial maximized state
    if (window.electronAPI?.isMaximized) {
      window.electronAPI.isMaximized().then(setIsMaximized);
    }

    // Listen for maximize state changes
    if (window.electronAPI?.onMaximizeChange) {
      window.electronAPI.onMaximizeChange((maximized) => {
        setIsMaximized(maximized);
      });
    }

    return () => {
      // Cleanup listeners on unmount
      if (window.electronAPI?.removeUpdateListeners) {
        // Note: This removes all listeners, but we only want to clean up on full unmount
      }
    };
  }, []);

  // Don't render if not in Electron
  if (!isElectronApp) return null;

  const handleMinimize = () => {
    window.electronAPI?.minimizeWindow();
  };

  const handleMaximize = () => {
    window.electronAPI?.maximizeWindow();
  };

  const handleClose = () => {
    window.electronAPI?.closeWindow();
  };

  return (
    <div
      className={`h-8 flex items-center justify-between select-none ${
        isDark ? 'bg-[#202c33]' : 'bg-[#f0f2f5]'
      }`}
      style={{ WebkitAppRegion: 'drag' }}
      data-testid="custom-title-bar"
    >
      {/* Left side - App title/logo */}
      <div className="flex items-center gap-2 pl-3">
        <div className="w-4 h-4 rounded bg-gradient-to-br from-[#00a884] to-[#0088cc] flex items-center justify-center">
          <span className="text-white text-[8px] font-bold">FC</span>
        </div>
        <span className={`text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
          FaceConnect
        </span>
      </div>

      {/* Right side - Window controls */}
      <div 
        className="flex items-center h-full"
        style={{ WebkitAppRegion: 'no-drag' }}
      >
        {/* Minimize button */}
        <button
          onClick={handleMinimize}
          className={`h-full px-4 flex items-center justify-center transition-colors ${
            isDark 
              ? 'hover:bg-[#374045] text-gray-400 hover:text-white' 
              : 'hover:bg-gray-200 text-gray-600 hover:text-gray-900'
          }`}
          data-testid="titlebar-minimize"
          title="Minimize"
        >
          <Minus className="w-4 h-4" />
        </button>

        {/* Maximize/Restore button */}
        <button
          onClick={handleMaximize}
          className={`h-full px-4 flex items-center justify-center transition-colors ${
            isDark 
              ? 'hover:bg-[#374045] text-gray-400 hover:text-white' 
              : 'hover:bg-gray-200 text-gray-600 hover:text-gray-900'
          }`}
          data-testid="titlebar-maximize"
          title={isMaximized ? 'Restore' : 'Maximize'}
        >
          {isMaximized ? (
            <Maximize2 className="w-3.5 h-3.5" />
          ) : (
            <Square className="w-3.5 h-3.5" />
          )}
        </button>

        {/* Close button */}
        <button
          onClick={handleClose}
          className={`h-full px-4 flex items-center justify-center transition-colors hover:bg-red-500 hover:text-white ${
            isDark ? 'text-gray-400' : 'text-gray-600'
          }`}
          data-testid="titlebar-close"
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
