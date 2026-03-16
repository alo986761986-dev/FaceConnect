import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart } from "lucide-react";

// Floating heart animation that appears on double-tap or like
export function FloatingHearts({ trigger, onComplete }) {
  const [hearts, setHearts] = useState([]);

  useEffect(() => {
    if (trigger) {
      // Create multiple hearts with random positions
      const newHearts = Array.from({ length: 6 }, (_, i) => ({
        id: Date.now() + i,
        x: Math.random() * 100 - 50,
        delay: i * 0.1,
        scale: 0.5 + Math.random() * 0.5,
        rotation: Math.random() * 30 - 15
      }));
      setHearts(newHearts);
      
      // Clean up after animation
      setTimeout(() => {
        setHearts([]);
        onComplete?.();
      }, 1500);
    }
  }, [trigger, onComplete]);

  return (
    <AnimatePresence>
      {hearts.map((heart) => (
        <motion.div
          key={heart.id}
          initial={{ 
            opacity: 1, 
            scale: 0, 
            y: 0,
            x: heart.x,
            rotate: heart.rotation
          }}
          animate={{ 
            opacity: [1, 1, 0], 
            scale: [0, heart.scale * 1.5, heart.scale],
            y: -150,
            rotate: heart.rotation + 20
          }}
          exit={{ opacity: 0 }}
          transition={{ 
            duration: 1.2, 
            delay: heart.delay,
            ease: "easeOut"
          }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-50"
        >
          <Heart className="w-8 h-8 fill-red-500 text-red-500 drop-shadow-lg" />
        </motion.div>
      ))}
    </AnimatePresence>
  );
}

// Center heart burst animation (for double-tap)
export function HeartBurst({ show, onComplete }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ scale: 0, opacity: 1 }}
          animate={{ 
            scale: [0, 1.5, 1.2],
            opacity: [1, 1, 0]
          }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          onAnimationComplete={onComplete}
          className="absolute inset-0 flex items-center justify-center pointer-events-none z-50"
        >
          <Heart className="w-24 h-24 fill-white text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.8)]" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Like button with animation
export function AnimatedLikeButton({ 
  isLiked, 
  likeCount, 
  onLike, 
  size = "md",
  showCount = true,
  isDark = true 
}) {
  const [showBurst, setShowBurst] = useState(false);
  const [animating, setAnimating] = useState(false);

  const handleLike = () => {
    if (!isLiked) {
      setShowBurst(true);
      setAnimating(true);
    }
    onLike();
  };

  const sizeClasses = {
    sm: "w-5 h-5",
    md: "w-6 h-6",
    lg: "w-8 h-8"
  };

  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={handleLike}
      className="flex items-center gap-1 relative"
    >
      <motion.div
        animate={animating ? {
          scale: [1, 1.3, 1],
          rotate: [0, -10, 10, 0]
        } : {}}
        transition={{ duration: 0.4 }}
        onAnimationComplete={() => setAnimating(false)}
      >
        <Heart 
          className={`${sizeClasses[size]} transition-all duration-200 ${
            isLiked 
              ? 'fill-red-500 text-red-500' 
              : isDark ? 'text-white' : 'text-gray-900'
          }`} 
        />
      </motion.div>
      
      {showCount && likeCount > 0 && (
        <motion.span 
          key={likeCount}
          initial={{ scale: 1.2 }}
          animate={{ scale: 1 }}
          className={`text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}
        >
          {likeCount}
        </motion.span>
      )}

      {/* Burst particles */}
      <AnimatePresence>
        {showBurst && (
          <>
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ scale: 0, x: 0, y: 0, opacity: 1 }}
                animate={{
                  scale: [0, 1, 0.5],
                  x: Math.cos((i / 8) * Math.PI * 2) * 30,
                  y: Math.sin((i / 8) * Math.PI * 2) * 30,
                  opacity: [1, 1, 0]
                }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5, delay: i * 0.02 }}
                onAnimationComplete={() => i === 7 && setShowBurst(false)}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
              >
                <Heart className="w-3 h-3 fill-red-500 text-red-500" />
              </motion.div>
            ))}
          </>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

// Reaction animation for live streams
export function LiveReaction({ type = "heart", onComplete }) {
  const icons = {
    heart: <Heart className="w-6 h-6 fill-red-500 text-red-500" />,
    fire: <span className="text-2xl">🔥</span>,
    laugh: <span className="text-2xl">😂</span>,
    wow: <span className="text-2xl">😮</span>,
    sad: <span className="text-2xl">😢</span>,
    clap: <span className="text-2xl">👏</span>,
    star: <span className="text-2xl">⭐</span>,
    gift: <span className="text-2xl">🎁</span>
  };

  return (
    <motion.div
      initial={{ 
        opacity: 1, 
        scale: 0.5, 
        y: 0,
        x: Math.random() * 60 - 30
      }}
      animate={{ 
        opacity: [1, 1, 0], 
        scale: [0.5, 1.2, 1],
        y: -200
      }}
      transition={{ duration: 2, ease: "easeOut" }}
      onAnimationComplete={onComplete}
      className="absolute bottom-0 left-1/2 -translate-x-1/2 pointer-events-none"
    >
      {icons[type] || icons.heart}
    </motion.div>
  );
}

// Container for live stream reactions
export function LiveReactionsContainer({ reactions = [] }) {
  return (
    <div className="absolute bottom-20 right-4 w-16 h-48 overflow-hidden pointer-events-none">
      <AnimatePresence>
        {reactions.map((reaction) => (
          <LiveReaction 
            key={reaction.id} 
            type={reaction.type}
            onComplete={reaction.onComplete}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

export default AnimatedLikeButton;
