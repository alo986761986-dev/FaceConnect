import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Download, RefreshCw, CheckCircle2, AlertCircle, 
  X, Loader2, ArrowDownCircle, Sparkles, Rocket,
  PartyPopper, Zap, Wifi, WifiOff, Link2, Globe, Cloud
} from "lucide-react";
import { Button } from "@/components/ui/button";

const POPUP_AUTO_DISMISS_MS = 10000; // 10 seconds auto-dismiss
const UPDATE_SERVER_URL = "https://faceconnect.com/releases";

export function UpdateManager({ isDark }) {
  const [updateStatus, setUpdateStatus] = useState('idle'); // idle, checking, available, downloading, ready, installing, complete, error, up-to-date
  const [updateInfo, setUpdateInfo] = useState(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadSpeed, setDownloadSpeed] = useState(0);
  const [bytesDownloaded, setBytesDownloaded] = useState(0);
  const [totalBytes, setTotalBytes] = useState(0);
  const [error, setError] = useState(null);
  const [showBanner, setShowBanner] = useState(false);
  const [appVersion, setAppVersion] = useState('');
  const [showComplete, setShowComplete] = useState(false);
  const [downloadPhase, setDownloadPhase] = useState('initializing'); // initializing, connecting, downloading, verifying, complete
  const [dismissCountdown, setDismissCountdown] = useState(10);
  const [isConnectedToServer, setIsConnectedToServer] = useState(true);
  const dismissTimerRef = useRef(null);
  const countdownRef = useRef(null);

  // Auto-dismiss timer function
  const startAutoDismiss = (callback) => {
    // Clear existing timers
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    
    // Start countdown
    setDismissCountdown(10);
    countdownRef.current = setInterval(() => {
      setDismissCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    // Set dismiss timer
    dismissTimerRef.current = setTimeout(() => {
      if (callback) callback();
      clearInterval(countdownRef.current);
    }, POPUP_AUTO_DISMISS_MS);
  };

  // Stop auto-dismiss (when user interacts)
  const stopAutoDismiss = () => {
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    setDismissCountdown(10);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

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
        startAutoDismiss(() => setShowBanner(false));
      } else if (status.updateAvailable) {
        setUpdateStatus('downloading');
        setShowBanner(true);
        setIsConnectedToServer(true);
      }
    }).catch(() => {
      setIsConnectedToServer(false);
    });

    // Listen for update events
    window.electronAPI.onUpdateStatus((data) => {
      if (data.status === 'checking') {
        setUpdateStatus('checking');
        setShowBanner(true);
        setIsConnectedToServer(true);
      } else if (data.status === 'up-to-date') {
        setUpdateStatus('up-to-date');
        setIsConnectedToServer(true);
        startAutoDismiss(() => setShowBanner(false));
      }
    });

    window.electronAPI.onUpdateAvailable((info) => {
      setUpdateInfo(info);
      setUpdateStatus('available');
      setShowBanner(true);
      setDownloadPhase('initializing');
      setDownloadProgress(0);
      setBytesDownloaded(0);
      setTotalBytes(0);
      setIsConnectedToServer(true);
      stopAutoDismiss(); // Don't auto-dismiss during download
      setTimeout(() => {
        setUpdateStatus('downloading');
        setDownloadPhase('connecting');
      }, 1500);
    });

    window.electronAPI.onDownloadProgress((progress) => {
      setUpdateStatus('downloading');
      setDownloadProgress(progress.percent || 0);
      setDownloadSpeed(progress.bytesPerSecond || 0);
      setBytesDownloaded(progress.transferred || 0);
      setTotalBytes(progress.total || 0);
      setIsConnectedToServer(true);
      stopAutoDismiss(); // Don't auto-dismiss during download
      
      // Update download phase based on progress
      if (progress.percent < 5) {
        setDownloadPhase('connecting');
      } else if (progress.percent < 95) {
        setDownloadPhase('downloading');
      } else {
        setDownloadPhase('verifying');
      }
    });

    window.electronAPI.onUpdateDownloaded((info) => {
      setUpdateInfo(info);
      setUpdateStatus('ready');
      setDownloadProgress(100);
      setDownloadPhase('complete');
      setIsConnectedToServer(true);
      startAutoDismiss(() => setShowBanner(false));
    });

    window.electronAPI.onUpdateError((err) => {
      const errorMsg = err.message || 'Unknown error';
      setError(errorMsg);
      setUpdateStatus('error');
      setIsConnectedToServer(!(errorMsg.includes('network') || errorMsg.includes('connect') || errorMsg.includes('ENOTFOUND')));
      startAutoDismiss(() => {
        setShowBanner(false);
        setUpdateStatus('idle');
      });
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
    setDownloadProgress(0);
    stopAutoDismiss();
    try {
      await window.electronAPI.checkForUpdates();
      setIsConnectedToServer(true);
    } catch (err) {
      setIsConnectedToServer(false);
      setError('Failed to connect to update server');
      setUpdateStatus('error');
      startAutoDismiss(() => {
        setShowBanner(false);
        setUpdateStatus('idle');
      });
    }
  };

  const openReleasesPage = () => {
    if (window.electronAPI?.openExternal) {
      window.electronAPI.openExternal(UPDATE_SERVER_URL);
    } else {
      window.open(UPDATE_SERVER_URL, '_blank');
    }
  };

  const handleInstallUpdate = async () => {
    if (!window.electronAPI) return;
    setUpdateStatus('installing');
    stopAutoDismiss();
    
    // Show installing animation briefly
    setTimeout(async () => {
      setShowComplete(true);
      setUpdateStatus('complete');
      
      // Auto-restart after showing complete message
      setTimeout(() => {
        window.electronAPI.installUpdate();
      }, 2000);
    }, 1000);
  };

  const formatSpeed = (bytesPerSecond) => {
    if (!bytesPerSecond || bytesPerSecond === 0) return '0 B/s';
    if (bytesPerSecond < 1024) return `${Math.round(bytesPerSecond)} B/s`;
    if (bytesPerSecond < 1024 * 1024) return `${(bytesPerSecond / 1024).toFixed(1)} KB/s`;
    return `${(bytesPerSecond / (1024 * 1024)).toFixed(2)} MB/s`;
  };

  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    if (bytes < 1024) return `${Math.round(bytes)} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const getPhaseLabel = (phase) => {
    switch (phase) {
      case 'initializing': return 'Initializing...';
      case 'connecting': return 'Connecting to server...';
      case 'downloading': return 'Downloading update...';
      case 'verifying': return 'Verifying download...';
      case 'complete': return 'Download complete!';
      default: return 'Preparing...';
    }
  };

  const getPhaseIcon = (phase) => {
    switch (phase) {
      case 'initializing': return '🔄';
      case 'connecting': return '🌐';
      case 'downloading': return '⬇️';
      case 'verifying': return '✅';
      case 'complete': return '🎉';
      default: return '⏳';
    }
  };

  // DISABLED: Update popups removed per user request
  // Updates will still download silently in the background
  // and install on next app restart
  return null;

  return (
    <>
      {/* Floating Update Banner */}
      <AnimatePresence>
        {showBanner && updateStatus !== 'idle' && (
          <motion.div
            initial={{ opacity: 0, y: -100, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -100, scale: 0.8 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] rounded-2xl shadow-2xl overflow-hidden ${
              isDark ? 'bg-[#1a2328]' : 'bg-white'
            }`}
            style={{ 
              minWidth: '380px',
              border: isDark ? '1px solid #2a3942' : '1px solid #e5e7eb',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)'
            }}
          >
            {/* Animated gradient header */}
            <div className={`relative overflow-hidden ${
              updateStatus === 'ready' || updateStatus === 'complete'
                ? 'bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500' 
                : updateStatus === 'error'
                  ? 'bg-gradient-to-r from-red-500 via-orange-500 to-red-500'
                  : updateStatus === 'downloading'
                    ? 'bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500'
                    : 'bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500'
            }`}>
              {/* Animated shine effect */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                animate={{ x: ['-100%', '100%'] }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              />
              
              <div className="relative px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3 text-white">
                  {updateStatus === 'checking' && (
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
                      <RefreshCw className="w-5 h-5" />
                    </motion.div>
                  )}
                  {updateStatus === 'available' && <Sparkles className="w-5 h-5" />}
                  {updateStatus === 'downloading' && (
                    <motion.div animate={{ y: [0, 3, 0] }} transition={{ duration: 0.5, repeat: Infinity }}>
                      <ArrowDownCircle className="w-5 h-5" />
                    </motion.div>
                  )}
                  {updateStatus === 'ready' && <Rocket className="w-5 h-5" />}
                  {updateStatus === 'installing' && (
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.5, repeat: Infinity, ease: "linear" }}>
                      <Zap className="w-5 h-5" />
                    </motion.div>
                  )}
                  {updateStatus === 'complete' && <PartyPopper className="w-5 h-5" />}
                  {updateStatus === 'up-to-date' && <CheckCircle2 className="w-5 h-5" />}
                  {updateStatus === 'error' && <AlertCircle className="w-5 h-5" />}
                  
                  <span className="font-bold text-sm tracking-wide">
                    {updateStatus === 'checking' && 'CHECKING FOR UPDATES'}
                    {updateStatus === 'available' && 'NEW UPDATE FOUND!'}
                    {updateStatus === 'downloading' && 'DOWNLOADING UPDATE'}
                    {updateStatus === 'ready' && 'UPDATE READY TO INSTALL'}
                    {updateStatus === 'installing' && 'INSTALLING UPDATE'}
                    {updateStatus === 'complete' && 'UPDATE COMPLETE!'}
                    {updateStatus === 'up-to-date' && 'YOU\'RE UP TO DATE'}
                    {updateStatus === 'error' && 'UPDATE FAILED'}
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  {/* Server connection indicator */}
                  <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-white/20 text-xs">
                    {isConnectedToServer ? (
                      <>
                        <Cloud className="w-3 h-3" />
                        <span>Online</span>
                      </>
                    ) : (
                      <>
                        <WifiOff className="w-3 h-3" />
                        <span>Offline</span>
                      </>
                    )}
                  </div>
                  
                  {/* Auto-dismiss countdown */}
                  {dismissCountdown > 0 && dismissCountdown < 10 && updateStatus !== 'downloading' && updateStatus !== 'installing' && (
                    <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-white/20 text-xs">
                      <span>{dismissCountdown}s</span>
                    </div>
                  )}
                  
                  {updateStatus !== 'installing' && updateStatus !== 'complete' && (
                    <button 
                      onClick={() => {
                        stopAutoDismiss();
                        setShowBanner(false);
                      }}
                      onMouseEnter={stopAutoDismiss}
                      className="text-white/80 hover:text-white transition-colors p-1 hover:bg-white/20 rounded-full"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-4">
              {/* Checking State */}
              {updateStatus === 'checking' && (
                <div className="flex items-center gap-3">
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                    className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center"
                  >
                    <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
                  </motion.div>
                  <div>
                    <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      Looking for updates...
                    </p>
                    <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      Checking for updates...
                    </p>
                  </div>
                </div>
              )}

              {/* Available State */}
              {updateStatus === 'available' && updateInfo && (
                <div className="flex items-center gap-3">
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 0.5, repeat: Infinity }}
                    className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center"
                  >
                    <Sparkles className="w-5 h-5 text-purple-500" />
                  </motion.div>
                  <div>
                    <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      Version {updateInfo.version} available!
                    </p>
                    <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      Current: v{appVersion} → New: v{updateInfo.version}
                    </p>
                  </div>
                </div>
              )}

              {/* Downloading State with Progress Bar */}
              {updateStatus === 'downloading' && (
                <div className="space-y-4">
                  {/* Phase indicator */}
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{getPhaseIcon(downloadPhase)}</span>
                    <span className={`text-sm font-medium ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                      {getPhaseLabel(downloadPhase)}
                    </span>
                  </div>
                  
                  {/* Main percentage display */}
                  <div className="flex items-center justify-center">
                    <div className="relative">
                      <svg className="w-24 h-24 transform -rotate-90">
                        <circle
                          cx="48"
                          cy="48"
                          r="40"
                          stroke={isDark ? '#2a3942' : '#e5e7eb'}
                          strokeWidth="8"
                          fill="none"
                        />
                        <motion.circle
                          cx="48"
                          cy="48"
                          r="40"
                          stroke="url(#progressGradient)"
                          strokeWidth="8"
                          fill="none"
                          strokeLinecap="round"
                          initial={{ strokeDasharray: '251.2', strokeDashoffset: 251.2 }}
                          animate={{ strokeDashoffset: 251.2 - (251.2 * downloadProgress / 100) }}
                          transition={{ duration: 0.5 }}
                        />
                        <defs>
                          <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#3b82f6" />
                            <stop offset="50%" stopColor="#8b5cf6" />
                            <stop offset="100%" stopColor="#3b82f6" />
                          </linearGradient>
                        </defs>
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {Math.round(downloadProgress)}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Linear Progress Bar */}
                  <div className="space-y-1">
                    <div className={`relative h-2 rounded-full overflow-hidden ${isDark ? 'bg-[#2a3942]' : 'bg-gray-200'}`}>
                      <motion.div
                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${downloadProgress}%` }}
                        transition={{ duration: 0.3 }}
                      />
                      <motion.div
                        className="absolute inset-y-0 w-20 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                        animate={{ x: ['-100%', '400%'] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                      />
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className={isDark ? 'text-gray-500' : 'text-gray-400'}>0%</span>
                      <span className={isDark ? 'text-gray-500' : 'text-gray-400'}>100%</span>
                    </div>
                  </div>
                  
                  {/* Data & Network Info */}
                  <div className={`grid grid-cols-2 gap-3 p-3 rounded-xl ${isDark ? 'bg-[#1a2328]' : 'bg-gray-50'}`}>
                    {/* Data Downloaded */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <Download className={`w-3.5 h-3.5 ${isDark ? 'text-blue-400' : 'text-blue-500'}`} />
                        <span className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                          Data
                        </span>
                      </div>
                      <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {formatBytes(bytesDownloaded)} / {formatBytes(totalBytes)}
                      </p>
                    </div>
                    
                    {/* Network Speed */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <motion.div
                          animate={{ opacity: downloadSpeed > 0 ? [1, 0.5, 1] : 1 }}
                          transition={{ duration: 0.5, repeat: Infinity }}
                        >
                          <ArrowDownCircle className={`w-3.5 h-3.5 ${isDark ? 'text-green-400' : 'text-green-500'}`} />
                        </motion.div>
                        <span className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                          Speed
                        </span>
                      </div>
                      <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {formatSpeed(downloadSpeed)}
                      </p>
                    </div>
                  </div>
                  
                  {/* Status message */}
                  <p className={`text-xs text-center ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                    ⚠️ Please don't close the app during download
                  </p>
                </div>
              )}

              {/* Ready State */}
              {updateStatus === 'ready' && (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <motion.div
                      animate={{ rotate: [0, 10, -10, 0] }}
                      transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 1 }}
                      className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center"
                    >
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    </motion.div>
                    <div>
                      <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        Download Complete!
                      </p>
                      <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        Version {updateInfo?.version || 'new'} is ready to install
                      </p>
                    </div>
                  </div>
                  
                  {/* Progress bar at 100% */}
                  <div className={`relative h-3 rounded-full overflow-hidden ${isDark ? 'bg-[#2a3942]' : 'bg-gray-200'}`}>
                    <div className="absolute inset-y-0 left-0 right-0 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full" />
                    <motion.div
                      className="absolute inset-y-0 w-full bg-gradient-to-r from-transparent via-white/30 to-transparent"
                      animate={{ x: ['-100%', '100%'] }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    />
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      onClick={handleInstallUpdate}
                      className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold"
                    >
                      <Rocket className="w-4 h-4 mr-2" />
                      Install & Restart Now
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => setShowBanner(false)}
                      className={isDark ? 'border-[#2a3942] hover:bg-[#2a3942]' : ''}
                    >
                      Later
                    </Button>
                  </div>
                </div>
              )}

              {/* Installing State */}
              {updateStatus === 'installing' && (
                <div className="flex flex-col items-center gap-3 py-2">
                  <motion.div
                    animate={{ rotate: 360, scale: [1, 1.1, 1] }}
                    transition={{ rotate: { duration: 1, repeat: Infinity, ease: "linear" }, scale: { duration: 0.5, repeat: Infinity } }}
                    className="w-12 h-12 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center"
                  >
                    <Zap className="w-6 h-6 text-white" />
                  </motion.div>
                  <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Installing update...
                  </p>
                  <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    App will restart automatically
                  </p>
                </div>
              )}

              {/* Complete State */}
              {updateStatus === 'complete' && (
                <div className="flex flex-col items-center gap-3 py-2">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: [0, 1.2, 1] }}
                    transition={{ duration: 0.5 }}
                    className="w-12 h-12 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center"
                  >
                    <PartyPopper className="w-6 h-6 text-white" />
                  </motion.div>
                  <motion.p 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}
                  >
                    Update Installed Successfully!
                  </motion.p>
                  <motion.p 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}
                  >
                    Restarting app in 2 seconds...
                  </motion.p>
                  
                  {/* Success checkmark animation */}
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.5, type: "spring" }}
                    className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 dark:bg-green-900/30"
                  >
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span className="text-xs font-medium text-green-600 dark:text-green-400">
                      v{updateInfo?.version || 'new'} installed
                    </span>
                  </motion.div>
                </div>
              )}

              {/* Up to Date State */}
              {updateStatus === 'up-to-date' && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  </div>
                  <div>
                    <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      You have the latest version
                    </p>
                    <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      FaceConnect v{appVersion}
                    </p>
                  </div>
                </div>
              )}

              {/* Error State */}
              {updateStatus === 'error' && (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                      {isConnectedToServer ? (
                        <AlertCircle className="w-5 h-5 text-red-500" />
                      ) : (
                        <WifiOff className="w-5 h-5 text-red-500" />
                      )}
                    </div>
                    <div>
                      <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {isConnectedToServer ? 'Update failed' : 'Connection failed'}
                      </p>
                      <p className={`text-xs ${isDark ? 'text-red-400' : 'text-red-500'}`}>
                        {error || (isConnectedToServer ? 'Please try again later' : 'Cannot connect to update servers')}
                      </p>
                    </div>
                  </div>
                  
                  {/* Manual Download Link */}
                  <div className={`p-3 rounded-lg ${isDark ? 'bg-[#1a2328]' : 'bg-gray-50'}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <Globe className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                      <span className={`text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        Manual Download Available
                      </span>
                    </div>
                    <Button 
                      variant="outline"
                      onClick={openReleasesPage}
                      className={`w-full text-xs ${isDark ? 'border-[#2a3942] hover:bg-[#2a3942]' : ''}`}
                    >
                      <Link2 className="w-3 h-3 mr-2" />
                      Download from Website
                    </Button>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      variant="outline"
                      onClick={handleCheckForUpdates}
                      className={`flex-1 ${isDark ? 'border-[#2a3942] hover:bg-[#2a3942]' : ''}`}
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Try Again
                    </Button>
                  </div>
                  
                  {/* Auto-dismiss countdown */}
                  <p className={`text-xs text-center ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                    Closing in {dismissCountdown} seconds...
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Compact Mini Progress Bar (bottom of screen when minimized) */}
      <AnimatePresence>
        {!showBanner && updateStatus === 'downloading' && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            onClick={() => setShowBanner(true)}
            className={`fixed bottom-20 left-1/2 -translate-x-1/2 z-[100] px-4 py-3 rounded-2xl cursor-pointer ${
              isDark ? 'bg-[#233138] border border-[#2a3942]' : 'bg-white border border-gray-200'
            } shadow-lg`}
          >
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  {getPhaseLabel(downloadPhase)}
                </span>
                <span className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {Math.round(downloadProgress)}%
                </span>
              </div>
              {/* Mini progress bar */}
              <div className={`w-48 h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-[#2a3942]' : 'bg-gray-200'}`}>
                <motion.div
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                  animate={{ width: `${downloadProgress}%` }}
                />
              </div>
              <div className="flex justify-between text-xs">
                <span className={isDark ? 'text-gray-500' : 'text-gray-400'}>
                  {formatBytes(bytesDownloaded)} / {formatBytes(totalBytes)}
                </span>
                <span className={isDark ? 'text-green-400' : 'text-green-600'}>
                  {formatSpeed(downloadSpeed)}
                </span>
              </div>
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
  const [downloadProgress, setDownloadProgress] = useState(0);

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

    window.electronAPI.onDownloadProgress((progress) => {
      setDownloadProgress(progress.percent);
      setUpdateStatus('downloading');
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

      {updateStatus === 'downloading' && (
        <div className="mb-3">
          <div className="flex justify-between text-xs mb-1">
            <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Downloading...</span>
            <span className={isDark ? 'text-white' : 'text-gray-900'}>{Math.round(downloadProgress)}%</span>
          </div>
          <div className={`h-2 rounded-full ${isDark ? 'bg-[#2a3942]' : 'bg-gray-200'}`}>
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all"
              style={{ width: `${downloadProgress}%` }}
            />
          </div>
        </div>
      )}

      {updateStatus === 'ready' ? (
        <Button 
          onClick={handleInstall}
          className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
        >
          <Rocket className="w-4 h-4 mr-2" />
          Install Update (v{updateInfo?.version})
        </Button>
      ) : updateStatus === 'checking' ? (
        <div className="flex items-center gap-2 text-sm text-gray-500 justify-center py-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          Checking for updates...
        </div>
      ) : updateStatus !== 'downloading' && (
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
        Updates are downloaded automatically
      </p>
    </div>
  );
}

export default UpdateManager;
