import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, RefreshCw, X, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

// Check if running in Electron
const isElectron = typeof window !== 'undefined' && window.electronAPI?.isElectron;

export function UpdateNotification() {
  const [updateInfo, setUpdateInfo] = useState(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [updateReady, setUpdateReady] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!isElectron) return;

    // Listen for update events
    window.electronAPI.onUpdateAvailable((info) => {
      setUpdateInfo(info);
      setDismissed(false);
    });

    window.electronAPI.onDownloadProgress((progress) => {
      setDownloadProgress(Math.round(progress.percent));
    });

    window.electronAPI.onUpdateDownloaded((info) => {
      setUpdateReady(true);
      setUpdateInfo(info);
    });
  }, []);

  const handleInstall = () => {
    if (isElectron) {
      window.electronAPI.installUpdate();
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
  };

  if (!isElectron || dismissed || !updateInfo) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -50 }}
        className="fixed top-4 right-4 z-[100] w-80"
      >
        <div className="bg-[#1a1a1a] border border-[#00F0FF]/30 rounded-xl p-4 shadow-xl">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              {updateReady ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <Download className="w-5 h-5 text-[#00F0FF]" />
              )}
              <span className="font-semibold text-white">
                {updateReady ? 'Update Ready' : 'Update Available'}
              </span>
            </div>
            <button
              onClick={handleDismiss}
              className="text-gray-500 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-sm text-gray-400 mb-3">
            {updateReady
              ? `Version ${updateInfo.version} is ready to install.`
              : `Version ${updateInfo.version} is downloading...`}
          </p>

          {!updateReady && downloadProgress > 0 && (
            <div className="mb-3">
              <Progress value={downloadProgress} className="h-2" />
              <p className="text-xs text-gray-500 mt-1">{downloadProgress}% complete</p>
            </div>
          )}

          {updateReady && (
            <Button
              onClick={handleInstall}
              className="w-full bg-gradient-to-r from-[#00F0FF] to-[#7000FF] hover:opacity-90"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Restart & Install
            </Button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// Hook to get app version
export function useAppVersion() {
  const [version, setVersion] = useState('2.5.0');

  useEffect(() => {
    if (isElectron) {
      window.electronAPI.getAppVersion().then(setVersion);
    }
  }, []);

  return version;
}

// Hook to check for updates manually
export function useCheckForUpdates() {
  const checkForUpdates = () => {
    if (isElectron) {
      window.electronAPI.checkForUpdates();
    }
  };

  return { checkForUpdates, isElectron };
}

export default UpdateNotification;
