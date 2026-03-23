import { motion } from "framer-motion";
import { ArrowLeft, Sparkles } from "lucide-react";

// Microsoft Copilot Icon
const CopilotIcon = () => (
  <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none">
    <defs>
      <linearGradient id="copilotGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#00bcf2" />
        <stop offset="50%" stopColor="#7b83eb" />
        <stop offset="100%" stopColor="#c878ff" />
      </linearGradient>
    </defs>
    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="url(#copilotGradient)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

/**
 * EmptyState - Clean minimal state with just icon and FaceConnect text
 */
export default function EmptyState({ isDark, onBack, onOpenCopilot }) {
  // Open Microsoft Copilot
  const handleOpenCopilot = () => {
    if (onOpenCopilot) {
      onOpenCopilot();
    } else if (window.electronAPI?.openExternal) {
      window.electronAPI.openExternal('https://copilot.microsoft.com');
    } else {
      window.open('https://copilot.microsoft.com', '_blank');
    }
  };

  return (
    <div className={`flex-1 flex flex-col items-center justify-center relative overflow-hidden ${
      isDark ? 'bg-[#222e35]' : 'bg-[#f0f2f5]'
    }`}>
      {/* Back Button - Top Left */}
      {onBack && (
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          onClick={onBack}
          className={`absolute top-6 left-6 flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
            isDark 
              ? 'bg-white/10 hover:bg-white/20 text-white' 
              : 'bg-black/5 hover:bg-black/10 text-gray-700'
          }`}
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">Back</span>
        </motion.button>
      )}

      {/* Animated Background */}
      <motion.div
        className="absolute inset-0 opacity-20"
        style={{
          background: isDark 
            ? 'radial-gradient(circle at 50% 50%, rgba(0,168,132,0.2) 0%, transparent 60%)'
            : 'radial-gradient(circle at 50% 50%, rgba(0,168,132,0.15) 0%, transparent 60%)'
        }}
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.2, 0.3, 0.2],
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />

      {/* Floating Particles */}
      {[...Array(5)].map((_, i) => (
        <motion.div
          key={i}
          className={`absolute w-3 h-3 rounded-full ${isDark ? 'bg-[#00a884]/15' : 'bg-[#00a884]/10'}`}
          style={{
            left: `${20 + i * 15}%`,
            top: `${30 + (i % 3) * 20}%`,
          }}
          animate={{ 
            y: [0, -20, 0],
            opacity: [0.3, 0.6, 0.3],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 3 + i * 0.5,
            repeat: Infinity,
            delay: i * 0.3,
            ease: "easeInOut"
          }}
        />
      ))}

      {/* Main Content - Icon and Text Only */}
      <div className="text-center relative z-10">
        {/* 3D Animated Logo */}
        <motion.div 
          className="relative w-28 h-28 mx-auto mb-8"
          initial={{ opacity: 0, scale: 0.5, rotateY: -180 }}
          animate={{ opacity: 1, scale: 1, rotateY: 0 }}
          transition={{ 
            duration: 0.8, 
            ease: "easeOut",
            delay: 0.2
          }}
          style={{ perspective: 1000, transformStyle: 'preserve-3d' }}
        >
          <motion.div 
            className="w-full h-full rounded-3xl bg-gradient-to-br from-[#00a884] via-[#00d4aa] to-[#0088cc] flex items-center justify-center shadow-2xl"
            animate={{ 
              rotateY: [0, 5, -5, 0],
              rotateX: [0, -3, 3, 0],
            }}
            transition={{ 
              duration: 8, 
              repeat: Infinity, 
              ease: "easeInOut" 
            }}
            whileHover={{ 
              scale: 1.05, 
              rotateY: 10,
              boxShadow: '0 30px 60px -15px rgba(0, 168, 132, 0.5)'
            }}
            style={{ transformStyle: 'preserve-3d' }}
          >
            <span className="text-5xl font-bold text-white drop-shadow-lg">FC</span>
            
            {/* Shine effect */}
            <motion.div
              className="absolute inset-0 rounded-3xl bg-gradient-to-tr from-transparent via-white/25 to-transparent"
              animate={{ x: ['-100%', '200%'] }}
              transition={{ duration: 3, repeat: Infinity, repeatDelay: 3 }}
            />
          </motion.div>
          
          {/* 3D Shadow */}
          <motion.div 
            className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-20 h-5 bg-black/20 rounded-full blur-lg"
            animate={{ 
              scale: [1, 1.1, 1],
              opacity: [0.2, 0.3, 0.2],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        </motion.div>
        
        {/* FaceConnect Text */}
        <motion.h1 
          className={`text-4xl font-light tracking-wide ${isDark ? 'text-white' : 'text-gray-800'}`}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
        >
          <span className="font-normal">Face</span>
          <span className="font-semibold text-[#00a884]">Connect</span>
        </motion.h1>
        
        <motion.p
          className={`text-sm mt-3 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.6 }}
        >
          Biometric Social Network
        </motion.p>

        {/* Microsoft Copilot Button - Center */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, duration: 0.5 }}
          onClick={handleOpenCopilot}
          className={`mt-8 flex items-center gap-3 px-6 py-3 rounded-2xl mx-auto transition-all ${
            isDark 
              ? 'bg-gradient-to-r from-[#00bcf2]/20 via-[#7b83eb]/20 to-[#c878ff]/20 hover:from-[#00bcf2]/30 hover:via-[#7b83eb]/30 hover:to-[#c878ff]/30 border border-white/10 hover:border-white/20' 
              : 'bg-gradient-to-r from-[#00bcf2]/10 via-[#7b83eb]/10 to-[#c878ff]/10 hover:from-[#00bcf2]/20 hover:via-[#7b83eb]/20 hover:to-[#c878ff]/20 border border-gray-200 hover:border-gray-300'
          }`}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.98 }}
        >
          <CopilotIcon />
          <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-800'}`}>
            Microsoft Copilot
          </span>
          <Sparkles className="w-4 h-4 text-[#7b83eb]" />
        </motion.button>
      </div>
    </div>
  );
}
