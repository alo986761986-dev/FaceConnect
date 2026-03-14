import { motion } from "framer-motion";
import { RefreshCw } from "lucide-react";

export const PullToRefresh = ({ isPulling, pullDistance, isRefreshing, threshold = 80 }) => {
  const progress = Math.min(pullDistance / threshold, 1);
  const shouldTrigger = pullDistance >= threshold;

  if (!isPulling && !isRefreshing) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center pointer-events-none"
      style={{ 
        height: Math.max(pullDistance, isRefreshing ? 60 : 0),
        paddingTop: 'env(safe-area-inset-top)'
      }}
    >
      <motion.div
        animate={{ 
          rotate: isRefreshing ? 360 : progress * 180,
          scale: shouldTrigger ? 1.2 : 1
        }}
        transition={{ 
          rotate: isRefreshing ? { duration: 1, repeat: Infinity, ease: "linear" } : { duration: 0 },
          scale: { duration: 0.2 }
        }}
        className={`w-10 h-10 rounded-full flex items-center justify-center ${
          shouldTrigger || isRefreshing
            ? 'bg-[#00F0FF]/20 border-2 border-[#00F0FF]'
            : 'bg-white/5 border border-white/20'
        }`}
      >
        <RefreshCw 
          className={`w-5 h-5 ${
            shouldTrigger || isRefreshing ? 'text-[#00F0FF]' : 'text-gray-400'
          }`}
        />
      </motion.div>
    </motion.div>
  );
};

export default PullToRefresh;
