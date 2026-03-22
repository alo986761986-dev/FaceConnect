// Utility to detect if running in Electron
// Uses multiple detection methods for reliability
export const isElectron = () => {
  if (typeof window === 'undefined') return false;
  
  return (
    // Check if using file:// protocol (most reliable for production builds)
    window.location.protocol === 'file:' ||
    // Check preload-exposed API
    window.electronAPI?.isElectron === true ||
    // Check process type (may be undefined in newer Electron due to contextIsolation)
    (window.process?.type === 'renderer') ||
    // Check user agent string (Electron includes it)
    (navigator.userAgent.toLowerCase().indexOf('electron') >= 0)
  );
};

export const getElectronAPI = () => {
  if (isElectron() && window.electronAPI) {
    return window.electronAPI;
  }
  return null;
};
