import { motion, AnimatePresence } from "framer-motion";
import { WifiOff, Wifi, Signal } from "lucide-react";
import { useNetworkStatus } from "@/hooks/useMobile";

export const NetworkStatus = () => {
  const { isOnline, connectionType } = useNetworkStatus();

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          className="fixed top-0 left-0 right-0 z-[100] safe-area-top"
        >
          <div className="bg-red-500/90 backdrop-blur-sm px-4 py-3 flex items-center justify-center gap-2">
            <WifiOff className="w-4 h-4 text-white" />
            <span className="text-white text-sm font-medium">
              You're offline. Some features may be limited.
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export const ConnectionIndicator = ({ className = "" }) => {
  const { isOnline, connectionType } = useNetworkStatus();

  const getConnectionIcon = () => {
    if (!isOnline) return <WifiOff className="w-4 h-4 text-red-400" />;
    if (connectionType === '4g') return <Signal className="w-4 h-4 text-green-400" />;
    if (connectionType === '3g') return <Signal className="w-4 h-4 text-yellow-400" />;
    return <Wifi className="w-4 h-4 text-green-400" />;
  };

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {getConnectionIcon()}
      <span className="text-xs text-gray-500 uppercase">
        {isOnline ? connectionType : 'offline'}
      </span>
    </div>
  );
};

export default NetworkStatus;
