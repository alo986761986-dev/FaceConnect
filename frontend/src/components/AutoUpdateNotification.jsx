import { useState, useEffect } from 'react';
import { Download, RefreshCw, Check, AlertCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AutoUpdateNotification() {
  const [updateStatus, setUpdateStatus] = useState(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [showNotification, setShowNotification] = useState(false);
  const [updateInfo, setUpdateInfo] = useState(null);

  useEffect(() => {
    // Only run in Electron environment
    if (!window.electronAPI) return;

    // Listen for update events
    window.electronAPI.onUpdateStatus?.((data) => {
      setUpdateStatus(data.status);
      if (data.status === 'checking') {
        setShowNotification(true);
      }
    });

    window.electronAPI.onUpdateAvailable?.((info) => {
      setUpdateStatus('available');
      setUpdateInfo(info);
      setShowNotification(true);
    });

    window.electronAPI.onDownloadProgress?.((progress) => {
      setUpdateStatus('downloading');
      setDownloadProgress(progress.percent);
      setShowNotification(true);
    });

    window.electronAPI.onUpdateDownloaded?.((info) => {
      setUpdateStatus('downloaded');
      setUpdateInfo(info);
      setShowNotification(true);
    });

    window.electronAPI.onUpdateError?.((error) => {
      setUpdateStatus('error');
      console.error('Update error:', error);
    });

    // Cleanup
    return () => {
      window.electronAPI.removeUpdateListeners?.();
    };
  }, []);

  const handleInstallUpdate = () => {
    window.electronAPI?.installUpdate?.();
  };

  const handleCheckForUpdates = () => {
    setUpdateStatus('checking');
    window.electronAPI?.checkForUpdates?.();
  };

  const handleDismiss = () => {
    setShowNotification(false);
  };

  // Don't render in non-Electron environment
  if (!window.electronAPI) return null;

  return (
    <AnimatePresence>
      {showNotification && updateStatus && (
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -50, scale: 0.95 }}
          className="fixed top-4 right-4 z-[9999] max-w-sm"
        >
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b border-[var(--border)]">
              <div className="flex items-center gap-2">
                {updateStatus === 'checking' && (
                  <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />
                )}
                {updateStatus === 'available' && (
                  <Download className="w-4 h-4 text-blue-500" />
                )}
                {updateStatus === 'downloading' && (
                  <Download className="w-4 h-4 text-blue-500 animate-bounce" />
                )}
                {updateStatus === 'downloaded' && (
                  <Check className="w-4 h-4 text-green-500" />
                )}
                {updateStatus === 'error' && (
                  <AlertCircle className="w-4 h-4 text-red-500" />
                )}
                {updateStatus === 'up-to-date' && (
                  <Check className="w-4 h-4 text-green-500" />
                )}
                <span className="text-sm font-semibold text-[var(--text-primary)]">
                  {updateStatus === 'checking' && 'Checking for updates...'}
                  {updateStatus === 'available' && 'Update Available'}
                  {updateStatus === 'downloading' && 'Downloading Update'}
                  {updateStatus === 'downloaded' && 'Update Ready'}
                  {updateStatus === 'error' && 'Update Error'}
                  {updateStatus === 'up-to-date' && 'Up to Date'}
                </span>
              </div>
              <button
                onClick={handleDismiss}
                className="p-1 hover:bg-[var(--muted)] rounded-full transition-colors"
              >
                <X className="w-4 h-4 text-[var(--text-muted)]" />
              </button>
            </div>

            {/* Content */}
            <div className="p-3">
              {updateStatus === 'checking' && (
                <p className="text-sm text-[var(--text-secondary)]">
                  Looking for new versions...
                </p>
              )}

              {updateStatus === 'available' && updateInfo && (
                <div>
                  <p className="text-sm text-[var(--text-secondary)]">
                    Version {updateInfo.version} is available
                  </p>
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    Downloading automatically...
                  </p>
                </div>
              )}

              {updateStatus === 'downloading' && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-[var(--text-secondary)]">
                      Downloading...
                    </span>
                    <span className="text-sm font-medium text-[var(--text-primary)]">
                      {Math.round(downloadProgress)}%
                    </span>
                  </div>
                  <div className="h-2 bg-[var(--muted)] rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-blue-500 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${downloadProgress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                </div>
              )}

              {updateStatus === 'downloaded' && (
                <div>
                  <p className="text-sm text-[var(--text-secondary)] mb-3">
                    Version {updateInfo?.version} is ready to install
                  </p>
                  <button
                    onClick={handleInstallUpdate}
                    className="w-full py-2 px-4 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Restart to Update
                  </button>
                </div>
              )}

              {updateStatus === 'up-to-date' && (
                <p className="text-sm text-[var(--text-secondary)]">
                  You're running the latest version
                </p>
              )}

              {updateStatus === 'error' && (
                <div>
                  <p className="text-sm text-[var(--text-secondary)] mb-3">
                    Failed to check for updates
                  </p>
                  <button
                    onClick={handleCheckForUpdates}
                    className="w-full py-2 px-4 bg-[var(--muted)] hover:bg-[var(--muted-hover)] text-[var(--text-primary)] text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Try Again
                  </button>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
