import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wifi, WifiOff, Signal, SignalLow, RefreshCw } from 'lucide-react';
import { onConnectionChange, getConnectionStatus } from '@/utils/network';

export function ConnectionStatus() {
  const [status, setStatus] = useState(getConnectionStatus());
  const [showBanner, setShowBanner] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);

  useEffect(() => {
    const unsubscribe = onConnectionChange((newStatus) => {
      const wasOffline = !status.isOnline;
      const isNowOnline = newStatus.isOnline;

      setStatus(newStatus);

      // Show banner when going offline or coming back online
      if (!newStatus.isOnline) {
        setShowBanner(true);
      } else if (wasOffline && isNowOnline) {
        setShowBanner(true);
        setReconnecting(true);
        // Hide after showing "Back online" message
        setTimeout(() => {
          setShowBanner(false);
          setReconnecting(false);
        }, 3000);
      }
    });

    return unsubscribe;
  }, [status.isOnline]);

  const getStatusConfig = () => {
    if (!status.isOnline) {
      return {
        icon: WifiOff,
        text: 'No internet connection',
        subtext: 'Waiting to reconnect...',
        bgColor: 'bg-red-500',
        textColor: 'text-white',
      };
    }

    if (reconnecting) {
      return {
        icon: RefreshCw,
        text: 'Back online',
        subtext: 'Syncing your data...',
        bgColor: 'bg-green-500',
        textColor: 'text-white',
        animate: true,
      };
    }

    if (status.connectionQuality === 'slow') {
      return {
        icon: SignalLow,
        text: 'Slow connection',
        subtext: 'Some features may be limited',
        bgColor: 'bg-yellow-500',
        textColor: 'text-black',
      };
    }

    return null;
  };

  const config = getStatusConfig();

  return (
    <AnimatePresence>
      {showBanner && config && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className={`fixed top-0 left-0 right-0 z-[200] ${config.bgColor} ${config.textColor} safe-area-top`}
        >
          <div className="flex items-center justify-center gap-2 py-2 px-4">
            <config.icon 
              className={`w-4 h-4 ${config.animate ? 'animate-spin' : ''}`} 
            />
            <div className="text-center">
              <p className="text-sm font-medium">{config.text}</p>
              {config.subtext && (
                <p className="text-xs opacity-80">{config.subtext}</p>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Hook for components that need connection status
export function useConnection() {
  const [status, setStatus] = useState(getConnectionStatus());

  useEffect(() => {
    return onConnectionChange(setStatus);
  }, []);

  return status;
}

export default ConnectionStatus;
