import { motion } from "framer-motion";

/**
 * EmptyState - Clean minimal state with just icon and FaceConnect text
 */
export default function EmptyState({ isDark }) {
  return (
    <div className={`flex-1 flex flex-col items-center justify-center relative overflow-hidden ${
      isDark ? 'bg-[#222e35]' : 'bg-[#f0f2f5]'
    }`}>
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
      </div>
    </div>
  );
}
