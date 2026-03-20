import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Download, RefreshCw, CheckCircle2, AlertCircle, 
  X, Loader2, ArrowDownCircle, Sparkles, Rocket
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export function UpdateManager({ isDark }) {
  const [updateStatus, setUpdateStatus] = useState('idle'); // idle, checking, available, downloading, ready, error, up-to-date
  const [updateInfo, setUpdateInfo] = useState(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [error, setError] = useState(null);
  const [showBanner, setShowBanner] = useState(false);
  const [appVersion, setAppVersion] = useState('');

  useEffect(() => {
    // Check if we're in Electron
    if (!window.electronAPI) return;

    // Get current app version
    window.electronAPI.getAppVersion().then(version => {
      setAppVersion(version);
    });

    // Get initial update status
    window.electronAPI.getUpdateStatus().then(status => {
      if (status.updateDownloaded) {
        setUpdateStatus('ready');
        setShowBanner(true);
      } else if (status.updateAvailable) {
        setUpdateStatus('downloading');
        setShowBanner(true);
      }
    });

    // Listen for update events
    window.electronAPI.onUpdateStatus((data) => {
      if (data.status === 'checking') {
        setUpdateStatus('checking');
      } else if (data.status === 'up-to-date') {
        setUpdateStatus('up-to-date');
        setTimeout(() => setShowBanner(false), 3000);
      }
    });

    window.electronAPI.onUpdateAvailable((info) => {
      setUpdateInfo(info);
      setUpdateStatus('available');
      setShowBanner(true);
      setTimeout(() => setUpdateStatus('downloading'), 1000);
    });

    window.electronAPI.onDownloadProgress((progress) => {
      setUpdateStatus('downloading');
      setDownloadProgress(progress.percent);
    });

    window.electronAPI.onUpdateDownloaded((info) => {
      setUpdateInfo(info);
      setUpdateStatus('ready');
      setDownloadProgress(100);
    });

    window.electronAPI.onUpdateError((err) => {
      setError(err.message);
      setUpdateStatus('error');
      setTimeout(() => {
        setShowBanner(false);
        setUpdateStatus('idle');
      }, 5000);
    });

    return () => {
      if (window.electronAPI?.removeUpdateListeners) {
        window.electronAPI.removeUpdateListeners();
      }
    };
  }, []);

  const handleCheckForUpdates = async () => {
    if (!window.electronAPI) return;
    setUpdateStatus('checking');
    setShowBanner(true);
    setError(null);
    await window.electronAPI.checkForUpdates();
  };

  const handleInstallUpdate = async () => {
    if (!window.electronAPI) return;
    await window.electronAPI.installUpdate();
  };

  // Don't render anything if not in Electron
  if (!window.electronAPI) return null;

  return (
    <>
      {/* Floating Update Banner */}
      <AnimatePresence>
        {showBanner && updateStatus !== 'idle' && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.9 }}
            className={`fixed top-4 right-4 z-[100] max-w-sm rounded-2xl shadow-2xl overflow-hidden ${
              isDark ? 'bg-[#233138] border border-[#2a3942]' : 'bg-white border border-gray-200'
            }`}
          >
            {/* Header */}
            <div className={`px-4 py-3 flex items-center justify-between ${
              updateStatus === 'ready' 
                ? 'bg-gradient-to-r from-green-500 to-emerald-500' 
                : updateStatus === 'error'
                  ? 'bg-gradient-to-r from-red-500 to-orange-500'
                  : 'bg-gradient-to-r from-blue-500 to-purple-500'
            }`}>
              <div className="flex items-center gap-2 text-white">
                {updateStatus === 'checking' && <Loader2 className="w-4 h-4 animate-spin" />}
                {updateStatus === 'available' && <Sparkles className="w-4 h-4" />}
                {updateStatus === 'downloading' && <ArrowDownCircle className="w-4 h-4" />}
                {updateStatus === 'ready' && <Rocket className="w-4 h-4" />}
                {updateStatus === 'up-to-date' && <CheckCircle2 className="w-4 h-4" />}
                {updateStatus === 'error' && <AlertCircle className="w-4 h-4" />}
                <span className="font-semibold text-sm">
                  {updateStatus === 'checking' && 'Checking for Updates...'}
                  {updateStatus === 'available' && 'Update Available!'}
                  {updateStatus === 'downloading' && 'Downloading Update...'}
                  {updateStatus === 'ready' && 'Update Ready!'}
                  {updateStatus === 'up-to-date' && 'You\'re Up to Date!'}
                  {updateStatus === 'error' && 'Update Error'}
                </span>
              </div>
              <button 
                onClick={() => setShowBanner(false)}
                className="text-white/80 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4">
              {updateStatus === 'checking' && (
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Looking for new versions on GitHub...
                </p>
              )}

              {updateStatus === 'available' && updateInfo && (
                <div>
                  <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Version {updateInfo.version} is available
                  </p>
                  <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    Current: v{appVersion}
                  </p>
                </div>
              )}

              {updateStatus === 'downloading' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      Downloading...
                    </span>
                    <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {Math.round(downloadProgress)}%
                    </span>
                  </div>
                  <Progress value={downloadProgress} className="h-2" />
                  <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                    Please don't close the app during download
                  </p>
                </div>
              )}

              {updateStatus === 'ready' && (
                <div className="space-y-3">
                  <div>
                    <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      Version {updateInfo?.version || 'new'} has been downloaded and is ready to install.
                    </p>
                    <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                      The app will restart to complete the update.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      onClick={handleInstallUpdate}
                      className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                    >
                      <Rocket className="w-4 h-4 mr-2" />
                      Restart & Update
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => setShowBanner(false)}
                      className={isDark ? 'border-[#2a3942]' : ''}
                    >
                      Later
                    </Button>
                  </div>
                </div>
              )}

              {updateStatus === 'up-to-date' && (
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  You have the latest version (v{appVersion}).
                </p>
              )}

              {updateStatus === 'error' && (
                <div>
                  <p className={`text-sm ${isDark ? 'text-red-400' : 'text-red-600'}`}>
                    {error || 'Failed to check for updates. Please try again later.'}
                  </p>
                  <Button 
                    variant="outline"
                    onClick={handleCheckForUpdates}
                    className={`mt-2 w-full ${isDark ? 'border-[#2a3942]' : ''}`}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Try Again
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// Compact version indicator for settings
export function UpdateIndicator({ isDark, onCheckUpdate }) {
  const [updateStatus, setUpdateStatus] = useState('idle');
  const [updateInfo, setUpdateInfo] = useState(null);
  const [appVersion, setAppVersion] = useState('');

  useEffect(() => {
    if (!window.electronAPI) return;

    window.electronAPI.getAppVersion().then(setAppVersion);
    
    window.electronAPI.getUpdateStatus().then(status => {
      if (status.updateDownloaded) setUpdateStatus('ready');
      else if (status.updateAvailable) setUpdateStatus('downloading');
    });

    window.electronAPI.onUpdateAvailable((info) => {
      setUpdateInfo(info);
      setUpdateStatus('available');
    });

    window.electronAPI.onUpdateDownloaded((info) => {
      setUpdateInfo(info);
      setUpdateStatus('ready');
    });
  }, []);

  if (!window.electronAPI) return null;

  const handleCheck = async () => {
    setUpdateStatus('checking');
    await window.electronAPI.checkForUpdates();
    if (onCheckUpdate) onCheckUpdate();
  };

  const handleInstall = async () => {
    await window.electronAPI.installUpdate();
  };

  return (
    <div className={`p-4 rounded-xl ${isDark ? 'bg-[#202c33]' : 'bg-gray-100'}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Download className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
          <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
            App Updates
          </span>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full ${
          isDark ? 'bg-[#2a3942] text-gray-400' : 'bg-gray-200 text-gray-600'
        }`}>
          v{appVersion}
        </span>
      </div>

      {updateStatus === 'ready' ? (
        <Button 
          onClick={handleInstall}
          className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
        >
          <Rocket className="w-4 h-4 mr-2" />
          Install Update (v{updateInfo?.version})
        </Button>
      ) : updateStatus === 'downloading' ? (
        <div className="flex items-center gap-2 text-sm text-blue-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          Downloading update...
        </div>
      ) : updateStatus === 'checking' ? (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          Checking for updates...
        </div>
      ) : (
        <Button 
          variant="outline"
          onClick={handleCheck}
          className={`w-full ${isDark ? 'border-[#2a3942] hover:bg-[#2a3942]' : ''}`}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Check for Updates
        </Button>
      )}

      <p className={`text-xs mt-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
        Updates are automatically downloaded from GitHub releases
      </p>
    </div>
  );
}

export default UpdateManager;
