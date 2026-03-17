import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Smartphone, CheckCircle, X, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Google Play Store badge SVG
const PlayStoreBadge = ({ onClick, className }) => (
  <motion.button
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    className={`inline-flex ${className}`}
  >
    <svg width="135" height="40" viewBox="0 0 135 40" xmlns="http://www.w3.org/2000/svg">
      <rect width="135" height="40" rx="5" fill="#000"/>
      <path d="M47.418 10.239c0 .89-.264 1.6-.79 2.129-.602.628-1.387.942-2.348.942-.921 0-1.707-.32-2.358-.958-.651-.64-.977-1.433-.977-2.381 0-.947.326-1.742.977-2.382.65-.64 1.437-.959 2.358-.959.458 0 .895.09 1.31.27.417.18.75.418 1.002.714l-.563.563c-.42-.502-.996-.753-1.75-.753-.67 0-1.251.234-1.742.702-.49.468-.736 1.074-.736 1.82s.245 1.352.736 1.82c.49.468 1.071.702 1.742.702.713 0 1.306-.236 1.78-.707.308-.307.486-.735.534-1.286h-2.314v-.773h3.086c.033.172.05.338.05.5z" fill="#FFF"/>
      <path d="M52.03 7.535h-2.802V9.56h2.526v.774h-2.526v2.025h2.802v.793h-3.613V6.742h3.613v.793zM55.258 13.152h-.81V7.535h-1.727v-.793h4.264v.793h-1.727v5.617zM60.724 13.152h-.811V6.742h.81v6.41zM64.653 13.152h-.811V7.535h-1.727v-.793h4.264v.793h-1.726v5.617zM73.608 12.346c-.64.64-1.42.96-2.344.96s-1.705-.32-2.344-.96c-.64-.64-.959-1.43-.959-2.372s.32-1.732.96-2.372c.638-.64 1.419-.959 2.343-.959s1.704.32 2.344.96c.64.64.959 1.43.959 2.371 0 .942-.32 1.733-.959 2.372zm-4.06-.544c.46.473 1.032.71 1.716.71.683 0 1.256-.237 1.716-.71.46-.474.69-1.08.69-1.822 0-.74-.23-1.348-.69-1.821-.46-.473-1.033-.71-1.716-.71-.684 0-1.256.237-1.716.71-.46.473-.69 1.08-.69 1.821 0 .742.23 1.348.69 1.822zM75.387 13.152V6.742h.987l3.065 4.957V6.742h.81v6.41h-.845l-3.208-5.17v5.17h-.809z" fill="#FFF"/>
      <path d="M68.135 21.752c-2.33 0-4.23 1.774-4.23 4.222 0 2.432 1.9 4.222 4.23 4.222 2.333 0 4.233-1.79 4.233-4.222 0-2.448-1.9-4.222-4.233-4.222zm0 6.782c-1.278 0-2.381-1.055-2.381-2.56 0-1.521 1.103-2.56 2.381-2.56 1.28 0 2.382 1.039 2.382 2.56 0 1.505-1.103 2.56-2.382 2.56zm-9.225-6.782c-2.33 0-4.23 1.774-4.23 4.222 0 2.432 1.9 4.222 4.23 4.222 2.333 0 4.233-1.79 4.233-4.222 0-2.448-1.9-4.222-4.233-4.222zm0 6.782c-1.278 0-2.381-1.055-2.381-2.56 0-1.521 1.103-2.56 2.381-2.56 1.28 0 2.382 1.039 2.382 2.56 0 1.505-1.103 2.56-2.382 2.56zm-10.979-5.485v1.779h4.255c-.127 1.002-.46 1.734-.968 2.252-.624.625-1.6 1.31-3.287 1.31-2.62 0-4.667-2.113-4.667-4.735s2.047-4.735 4.667-4.735c1.413 0 2.447.555 3.21 1.278l1.257-1.258c-1.063-1.018-2.479-1.799-4.467-1.799-3.593 0-6.613 2.927-6.613 6.514s3.02 6.514 6.613 6.514c1.941 0 3.403-.638 4.55-1.83 1.175-1.175 1.542-2.831 1.542-4.166 0-.413-.032-.796-.095-1.115h-5.997v-.009zm44.93 1.381c-.35-.942-1.421-2.68-3.608-2.68-2.17 0-3.974 1.707-3.974 4.222 0 2.367 1.788 4.222 4.181 4.222 1.932 0 3.05-1.183 3.513-1.87l-1.437-.958c-.479.703-1.135 1.167-2.076 1.167-.942 0-1.612-.432-2.044-1.278l5.636-2.333-.19-.492zm-5.746 1.407c-.048-1.63 1.263-2.463 2.205-2.463.735 0 1.358.368 1.566.895l-3.77 1.568zm-4.582 4.087h1.851V17.16h-1.851v12.764zm-3.034-7.455h-.063c-.416-.496-1.214-.942-2.224-.942-2.113 0-4.05 1.858-4.05 4.238 0 2.365 1.937 4.206 4.05 4.206 1.01 0 1.808-.447 2.224-.958h.063v.606c0 1.615-.863 2.479-2.254 2.479-1.136 0-1.84-.816-2.13-1.504l-1.61.671c.464 1.12 1.697 2.495 3.74 2.495 2.176 0 4.017-1.282 4.017-4.404v-7.592H79.5v.705zm-2.127 5.844c-1.279 0-2.35-1.073-2.35-2.544 0-1.488 1.071-2.576 2.35-2.576 1.262 0 2.254 1.088 2.254 2.576 0 1.471-.992 2.544-2.254 2.544zm24.173-11.015h-4.428v12.764h1.851v-4.836h2.577c2.047 0 4.058-1.48 4.058-3.964 0-2.479-2.011-3.964-4.058-3.964zm.048 6.149h-2.625v-4.373h2.625c1.382 0 2.166 1.143 2.166 2.186 0 1.027-.784 2.187-2.166 2.187zm11.404-1.83c-1.337 0-2.72.59-3.294 1.894l1.642.685c.35-.685 1.002-.91 1.688-.91.956 0 1.928.574 1.944 1.594v.127c-.336-.19-1.056-.479-1.944-.479-1.783 0-3.598.98-3.598 2.812 0 1.67 1.464 2.75 3.102 2.75 1.254 0 1.944-.56 2.377-1.217h.063v.958h1.788v-4.79c0-2.217-1.656-3.423-3.768-3.423zm-.224 6.847c-.608 0-1.463-.304-1.463-1.058 0-.96 1.056-1.328 1.969-1.328.816 0 1.2.175 1.696.415-.143 1.153-1.134 1.971-2.202 1.971zm10.467-6.577l-2.123 5.378h-.063l-2.201-5.378h-1.992l3.299 7.503-1.88 4.174h1.929l5.082-11.677h-2.05zm-16.716 7.91h1.852V17.16h-1.852v12.764z" fill="#FFF"/>
      <path d="M10.435 7.538c-.292.31-.463.786-.463 1.405v22.116c0 .619.171 1.095.463 1.405l.074.072 12.391-12.391v-.293L10.509 7.466l-.074.072z" fill="url(#a)"/>
      <path d="M27.029 24.279l-4.129-4.13v-.292l4.13-4.129.093.053 4.892 2.78c1.398.793 1.398 2.093 0 2.887l-4.892 2.779-.094.052z" fill="url(#b)"/>
      <path d="M27.122 24.227l-4.222-4.222-12.465 12.465c.461.488 1.221.548 2.08.062l14.607-8.305" fill="url(#c)"/>
      <path d="M27.122 15.779L12.515 7.474c-.859-.486-1.619-.426-2.08.062l12.465 12.465 4.222-4.222z" fill="url(#d)"/>
      <defs>
        <linearGradient id="a" x1="21.8" y1="8.71" x2="5.017" y2="25.493" gradientUnits="userSpaceOnUse">
          <stop stopColor="#00A0FF"/>
          <stop offset=".007" stopColor="#00A1FF"/>
          <stop offset=".26" stopColor="#00BEFF"/>
          <stop offset=".512" stopColor="#00D2FF"/>
          <stop offset=".76" stopColor="#00DFFF"/>
          <stop offset="1" stopColor="#00E3FF"/>
        </linearGradient>
        <linearGradient id="b" x1="33.834" y1="20.002" x2="9.637" y2="20.002" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFE000"/>
          <stop offset=".409" stopColor="#FFBD00"/>
          <stop offset=".775" stopColor="#FFA500"/>
          <stop offset="1" stopColor="#FF9C00"/>
        </linearGradient>
        <linearGradient id="c" x1="24.827" y1="22.296" x2="2.069" y2="45.054" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FF3A44"/>
          <stop offset="1" stopColor="#C31162"/>
        </linearGradient>
        <linearGradient id="d" x1="7.297" y1="-.177" x2="17.46" y2="10.005" gradientUnits="userSpaceOnUse">
          <stop stopColor="#32A071"/>
          <stop offset=".069" stopColor="#2DA771"/>
          <stop offset=".476" stopColor="#15CF74"/>
          <stop offset=".801" stopColor="#06E775"/>
          <stop offset="1" stopColor="#00F076"/>
        </linearGradient>
      </defs>
    </svg>
  </motion.button>
);

// Direct APK Download Badge
const APKDownloadBadge = ({ onClick, downloading, progress, className }) => (
  <motion.button
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    disabled={downloading}
    className={`inline-flex items-center gap-3 bg-gradient-to-r from-[#00F0FF] to-[#7000FF] text-white px-4 py-2 rounded-lg font-medium ${className}`}
  >
    {downloading ? (
      <>
        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        <span>Downloading... {progress}%</span>
      </>
    ) : (
      <>
        <Download className="w-5 h-5" />
        <span>Download APK</span>
      </>
    )}
  </motion.button>
);

export function AppDownloadSection({ isDark }) {
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadComplete, setDownloadComplete] = useState(false);

  // Check if on mobile
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const isAndroid = /Android/i.test(navigator.userAgent);

  const handlePlayStoreClick = () => {
    // Open Google Play Store (replace with actual URL when published)
    window.open('https://play.google.com/store/apps/details?id=com.faceconnect.app', '_blank');
    toast.info('Opening Google Play Store...');
  };

  const handleAPKDownload = async () => {
    setDownloading(true);
    setDownloadProgress(0);
    
    try {
      // Simulate download progress
      const progressInterval = setInterval(() => {
        setDownloadProgress(prev => {
          if (prev >= 100) {
            clearInterval(progressInterval);
            return 100;
          }
          return prev + Math.random() * 15;
        });
      }, 300);

      // Create APK download link (this would be your actual APK URL)
      const apkUrl = `${API_URL}/api/app/download/android`;
      
      // Try to download the APK
      const response = await fetch(apkUrl);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'FaceConnect-v2.5.0.apk';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        clearInterval(progressInterval);
        setDownloadProgress(100);
        setDownloadComplete(true);
        toast.success('APK downloaded! Check your Downloads folder.');
      } else {
        throw new Error('APK not available');
      }
    } catch (error) {
      // Fallback: Show instructions
      toast.info('APK download will be available soon. Use PWA install for now!');
      setShowDownloadModal(true);
    } finally {
      setDownloading(false);
      setTimeout(() => {
        setDownloadProgress(0);
        setDownloadComplete(false);
      }, 3000);
    }
  };

  return (
    <>
      {/* Download Section Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`mx-4 my-4 p-4 rounded-2xl ${
          isDark 
            ? 'bg-gradient-to-br from-[#1a1a2e] to-[#16213e] border border-white/10' 
            : 'bg-gradient-to-br from-white to-gray-50 border border-gray-200 shadow-lg'
        }`}
      >
        <div className="flex items-start gap-4">
          {/* App Icon */}
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#00F0FF] via-[#7000FF] to-[#FF3366] p-[2px] flex-shrink-0">
            <div className={`w-full h-full rounded-2xl flex items-center justify-center ${isDark ? 'bg-[#0A0A0A]' : 'bg-white'}`}>
              <Smartphone className="w-8 h-8 text-[#00F0FF]" />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3 className={`font-bold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Get FaceConnect App
            </h3>
            <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Download for the best experience with offline access
            </p>

            {/* Download Buttons */}
            <div className="flex flex-wrap gap-3 mt-4">
              {/* Google Play Store Button */}
              <PlayStoreBadge onClick={handlePlayStoreClick} />
              
              {/* Direct APK Download (Android only) */}
              {isAndroid && (
                <APKDownloadBadge
                  onClick={handleAPKDownload}
                  downloading={downloading}
                  progress={Math.round(downloadProgress)}
                />
              )}
            </div>

            {/* Download Complete Indicator */}
            <AnimatePresence>
              {downloadComplete && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center gap-2 mt-3 text-green-500"
                >
                  <CheckCircle className="w-5 h-5" />
                  <span className="text-sm font-medium">Downloaded to your device!</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>

      {/* Download Instructions Modal */}
      <AnimatePresence>
        {showDownloadModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowDownloadModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className={`w-full max-w-md rounded-2xl p-6 ${isDark ? 'bg-[#1a1a1a]' : 'bg-white'}`}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Install FaceConnect
                </h3>
                <button
                  onClick={() => setShowDownloadModal(false)}
                  className={`p-2 rounded-full ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className={`p-4 rounded-xl ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                  <h4 className={`font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Option 1: Install as PWA
                  </h4>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    Tap the browser menu and select "Add to Home Screen" for instant app-like experience.
                  </p>
                </div>

                <div className={`p-4 rounded-xl ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                  <h4 className={`font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Option 2: Google Play Store
                  </h4>
                  <p className={`text-sm mb-3 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    Download from the official store for automatic updates.
                  </p>
                  <PlayStoreBadge onClick={handlePlayStoreClick} />
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// Auto-refresh hook with visibility change detection
export function useAutoRefresh(fetchFn, intervalMs = 30000) {
  const [lastRefresh, setLastRefresh] = useState(Date.now());

  useEffect(() => {
    // Refresh on interval
    const interval = setInterval(() => {
      fetchFn();
      setLastRefresh(Date.now());
    }, intervalMs);

    // Refresh when tab becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const timeSinceLastRefresh = Date.now() - lastRefresh;
        if (timeSinceLastRefresh > intervalMs / 2) {
          fetchFn();
          setLastRefresh(Date.now());
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchFn, intervalMs, lastRefresh]);

  return lastRefresh;
}

// Pull-to-refresh component
export function PullToRefresh({ onRefresh, children, isDark }) {
  const [pulling, setPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const containerRef = useRef(null);

  const handleTouchStart = (e) => {
    if (containerRef.current?.scrollTop === 0) {
      startY.current = e.touches[0].clientY;
      setPulling(true);
    }
  };

  const handleTouchMove = (e) => {
    if (!pulling) return;
    const currentY = e.touches[0].clientY;
    const distance = Math.max(0, (currentY - startY.current) * 0.5);
    setPullDistance(Math.min(distance, 100));
  };

  const handleTouchEnd = async () => {
    if (pullDistance > 60 && !refreshing) {
      setRefreshing(true);
      await onRefresh();
      setRefreshing(false);
    }
    setPulling(false);
    setPullDistance(0);
  };

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative overflow-auto"
      style={{ transform: `translateY(${pullDistance}px)` }}
    >
      {/* Pull indicator */}
      <AnimatePresence>
        {pullDistance > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute top-0 left-0 right-0 flex items-center justify-center py-4"
            style={{ top: -60 }}
          >
            <motion.div
              animate={{ rotate: refreshing ? 360 : pullDistance * 3.6 }}
              transition={{ duration: refreshing ? 1 : 0, repeat: refreshing ? Infinity : 0 }}
            >
              <RefreshCw className={`w-6 h-6 ${isDark ? 'text-[#00F0FF]' : 'text-[#7000FF]'}`} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {children}
    </div>
  );
}

export default AppDownloadSection;
