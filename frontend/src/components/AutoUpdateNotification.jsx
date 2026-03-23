import { useState, useEffect } from 'react';
import { Download, RefreshCw, Check, AlertCircle, X, Key } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AutoUpdateNotification() {
  const [updateStatus, setUpdateStatus] = useState(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [showNotification, setShowNotification] = useState(false);
  const [updateInfo, setUpdateInfo] = useState(null);
  const [licenseKey, setLicenseKey] = useState('');
  const [keyValidated, setKeyValidated] = useState(false);
  const [keyError, setKeyError] = useState('');
  const [showKeyInput, setShowKeyInput] = useState(false);

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
    setShowKeyInput(false);
    setKeyError('');
  };

  // Validate license key and trigger update
  const handleValidateKey = () => {
    // License key format: XXXX-XXXX-XXXX-XXXX (16 chars + 3 dashes)
    const keyPattern = /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
    const cleanKey = licenseKey.toUpperCase().trim();
    
    if (!cleanKey) {
      setKeyError('Please enter a license key');
      return;
    }
    
    if (!keyPattern.test(cleanKey)) {
      setKeyError('Invalid format. Use: XXXX-XXXX-XXXX-XXXX');
      return;
    }
    
    // Validate key (accepts any properly formatted key for now)
    setKeyError('');
    setKeyValidated(true);
    
    // Store key in localStorage
    localStorage.setItem('faceconnect_license_key', cleanKey);
    
    // Trigger update check
    setUpdateStatus('checking');
    window.electronAPI?.checkForUpdates?.();
  };

  // Format key as user types
  const handleKeyChange = (e) => {
    let value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    
    // Add dashes automatically
    if (value.length > 4) {
      value = value.slice(0, 4) + '-' + value.slice(4);
    }
    if (value.length > 9) {
      value = value.slice(0, 9) + '-' + value.slice(9);
    }
    if (value.length > 14) {
      value = value.slice(0, 14) + '-' + value.slice(14);
    }
    
    // Limit to 19 characters (16 chars + 3 dashes)
    if (value.length <= 19) {
      setLicenseKey(value);
      setKeyError('');
    }
  };

  // Load saved key on mount
  useEffect(() => {
    const savedKey = localStorage.getItem('faceconnect_license_key');
    if (savedKey) {
      setLicenseKey(savedKey);
      setKeyValidated(true);
    }
  }, []);

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
                <div>
                  <p className="text-sm text-[var(--text-secondary)] mb-3">
                    You're running the latest version
                  </p>
                  
                  {/* License Key Section */}
                  <div className="mt-3 pt-3 border-t border-[var(--border)]">
                    <button
                      onClick={() => setShowKeyInput(!showKeyInput)}
                      className="flex items-center gap-2 text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
                    >
                      <Key className="w-3 h-3" />
                      {showKeyInput ? 'Hide License Key' : 'Enter License Key'}
                    </button>
                    
                    <AnimatePresence>
                      {showKeyInput && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-3"
                        >
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={licenseKey}
                              onChange={handleKeyChange}
                              placeholder="XXXX-XXXX-XXXX-XXXX"
                              className="w-full px-3 py-2 text-sm bg-[var(--muted)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono tracking-wider"
                            />
                            {keyError && (
                              <p className="text-xs text-red-500">{keyError}</p>
                            )}
                            {keyValidated && !keyError && (
                              <p className="text-xs text-green-500 flex items-center gap-1">
                                <Check className="w-3 h-3" /> License validated
                              </p>
                            )}
                            <button
                              onClick={handleValidateKey}
                              disabled={!licenseKey}
                              className="w-full py-2 px-4 bg-[#00E676] hover:bg-[#00E676]/90 disabled:bg-[var(--muted)] disabled:text-[var(--text-muted)] text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                            >
                              <RefreshCw className="w-4 h-4" />
                              Activate & Check Updates
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
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
