import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Star, Shield, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Google Play Store URL - Replace with your actual URL when published
// Current: Placeholder URL for development
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.faceconnect.com';
// TODO: Update this when your app is published on Google Play Store
const BANNER_DISMISSED_KEY = 'playStoreBannerDismissed';
const BANNER_DISMISSED_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

export function PlayStoreBanner({ isDark }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if banner was recently dismissed
    const dismissedAt = localStorage.getItem(BANNER_DISMISSED_KEY);
    if (dismissedAt) {
      const timeSinceDismissed = Date.now() - parseInt(dismissedAt, 10);
      if (timeSinceDismissed < BANNER_DISMISSED_DURATION) {
        return; // Don't show banner
      }
    }

    // Check if running as installed PWA or native app
    const isInstalled = window.matchMedia('(display-mode: standalone)').matches ||
                        window.navigator.standalone ||
                        document.referrer.includes('android-app://');
    
    // Check if on mobile
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    // Show banner only on mobile web (not installed)
    if (isMobile && !isInstalled) {
      // Delay showing banner for better UX
      const timer = setTimeout(() => setIsVisible(true), 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(BANNER_DISMISSED_KEY, Date.now().toString());
    setIsVisible(false);
  };

  const handleDownload = () => {
    window.open(PLAY_STORE_URL, '_blank');
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed bottom-0 left-0 right-0 z-[100] safe-area-bottom"
        >
          <div className={`mx-2 mb-2 rounded-2xl overflow-hidden shadow-2xl ${
            isDark 
              ? 'bg-gradient-to-r from-[#1a1a2e] to-[#16213e] border border-white/10' 
              : 'bg-white border border-gray-200'
          }`}>
            {/* Close button */}
            <button
              onClick={handleDismiss}
              className={`absolute top-2 right-2 p-1.5 rounded-full ${
                isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'
              }`}
            >
              <X className="w-5 h-5" />
            </button>

            <div className="p-4">
              {/* App Info Row */}
              <div className="flex items-start gap-3 mb-4">
                {/* App Icon */}
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#00F0FF] via-[#7000FF] to-[#FF3366] p-[2px] flex-shrink-0">
                  <div className={`w-full h-full rounded-xl flex items-center justify-center ${isDark ? 'bg-[#0A0A0A]' : 'bg-white'}`}>
                    <span className="text-2xl font-bold bg-gradient-to-r from-[#00F0FF] to-[#7000FF] bg-clip-text text-transparent">
                      FC
                    </span>
                  </div>
                </div>

                {/* App Details */}
                <div className="flex-1 min-w-0 pr-6">
                  <h3 className={`font-bold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    FaceConnect
                  </h3>
                  <div className="flex items-center gap-1 mt-0.5">
                    {[1, 2, 3, 4, 5].map(i => (
                      <Star key={i} className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                    ))}
                    <span className={`text-xs ml-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      4.8 (10K+)
                    </span>
                  </div>
                  <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    Free • Social
                  </p>
                </div>
              </div>

              {/* Features */}
              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-[#00F0FF]" />
                  <span className={`text-xs ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Fast</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-green-500" />
                  <span className={`text-xs ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Secure</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Download className="w-4 h-4 text-[#7000FF]" />
                  <span className={`text-xs ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Offline</span>
                </div>
              </div>

              {/* Download Button */}
              <Button
                onClick={handleDownload}
                className="w-full bg-gradient-to-r from-[#00F0FF] to-[#7000FF] hover:opacity-90 text-white font-semibold py-3 rounded-xl"
              >
                <img 
                  src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg" 
                  alt="Get it on Google Play"
                  className="h-6 mr-2"
                  onError={(e) => { e.target.style.display = 'none' }}
                />
                Get it on Google Play
              </Button>

              <p className={`text-center text-xs mt-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                Free download • No ads
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default PlayStoreBanner;
