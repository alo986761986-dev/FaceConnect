// Utility to detect if running in Electron
export const isElectron = () => {
  return typeof window !== 'undefined' && window.electronAPI?.isElectron === true;
};

export const getElectronAPI = () => {
  if (isElectron()) {
    return window.electronAPI;
  }
  return null;
};
