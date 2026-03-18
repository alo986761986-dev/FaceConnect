import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ThumbsUp } from "lucide-react";

// Facebook reaction emojis with their colors
const REACTIONS = [
  { id: "like", emoji: "👍", label: "Like", color: "#1877F2", bgColor: "#E7F3FF" },
  { id: "love", emoji: "❤️", label: "Love", color: "#F33E58", bgColor: "#FFEBED" },
  { id: "haha", emoji: "😆", label: "Haha", color: "#F7B125", bgColor: "#FFF8E6" },
  { id: "wow", emoji: "😮", label: "Wow", color: "#F7B125", bgColor: "#FFF8E6" },
  { id: "sad", emoji: "😢", label: "Sad", color: "#F7B125", bgColor: "#FFF8E6" },
  { id: "angry", emoji: "😡", label: "Angry", color: "#E9710F", bgColor: "#FFF0E6" },
];

export default function FacebookReactions({ 
  currentReaction, 
  onReact, 
  reactionCounts = {},
  size = "default" // "default" | "small" | "large"
}) {
  const [showPicker, setShowPicker] = useState(false);
  const [hoveredReaction, setHoveredReaction] = useState(null);
  const timeoutRef = useRef(null);
  const containerRef = useRef(null);

  const sizeClasses = {
    small: { button: "text-xs gap-1", emoji: "text-lg", picker: "h-10" },
    default: { button: "text-sm gap-1.5", emoji: "text-2xl", picker: "h-12" },
    large: { button: "text-base gap-2", emoji: "text-3xl", picker: "h-14" },
  };

  const currentSize = sizeClasses[size];

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setShowPicker(true), 500);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setShowPicker(false), 300);
  };

  const handleReaction = (reaction) => {
    onReact(reaction.id === currentReaction ? null : reaction.id);
    setShowPicker(false);
  };

  const handleQuickLike = () => {
    if (!showPicker) {
      onReact(currentReaction === "like" ? null : "like");
    }
  };

  const activeReaction = REACTIONS.find(r => r.id === currentReaction);

  // Calculate total reactions
  const totalReactions = Object.values(reactionCounts).reduce((a, b) => a + b, 0);

  // Get top 3 reactions for display
  const topReactions = Object.entries(reactionCounts)
    .filter(([_, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([id]) => REACTIONS.find(r => r.id === id))
    .filter(Boolean);

  return (
    <div 
      ref={containerRef}
      className="relative inline-flex items-center"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Reaction Picker Popup */}
      <AnimatePresence>
        {showPicker && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.8 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            className={`absolute bottom-full left-0 mb-2 bg-white dark:bg-gray-800 rounded-full shadow-xl border border-gray-200 dark:border-gray-700 px-2 flex items-center ${currentSize.picker} z-50`}
            style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }}
          >
            {REACTIONS.map((reaction, index) => (
              <motion.button
                key={reaction.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ 
                  opacity: 1, 
                  y: 0,
                  scale: hoveredReaction === reaction.id ? 1.4 : 1,
                  translateY: hoveredReaction === reaction.id ? -8 : 0
                }}
                transition={{ 
                  delay: index * 0.03,
                  type: "spring",
                  stiffness: 400,
                  damping: 20
                }}
                onClick={() => handleReaction(reaction)}
                onMouseEnter={() => setHoveredReaction(reaction.id)}
                onMouseLeave={() => setHoveredReaction(null)}
                className={`${currentSize.emoji} p-1 cursor-pointer transition-transform relative`}
                title={reaction.label}
              >
                <span className="select-none">{reaction.emoji}</span>
                
                {/* Label tooltip */}
                <AnimatePresence>
                  {hoveredReaction === reaction.id && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 5 }}
                      className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black/80 text-white text-xs px-2 py-1 rounded whitespace-nowrap"
                    >
                      {reaction.label}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Like Button */}
      <button
        onClick={handleQuickLike}
        className={`flex items-center ${currentSize.button} font-medium transition-colors ${
          activeReaction 
            ? `text-[${activeReaction.color}]` 
            : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
        }`}
        style={activeReaction ? { color: activeReaction.color } : {}}
      >
        {activeReaction ? (
          <motion.span
            key={activeReaction.id}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="text-lg"
          >
            {activeReaction.emoji}
          </motion.span>
        ) : (
          <ThumbsUp className="w-5 h-5" />
        )}
        <span>{activeReaction?.label || "Like"}</span>
      </button>

      {/* Reaction Summary (shows stacked emojis + count) */}
      {totalReactions > 0 && (
        <div className="ml-2 flex items-center">
          <div className="flex -space-x-1">
            {topReactions.map((reaction, i) => (
              <motion.span
                key={reaction.id}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: i * 0.1 }}
                className="w-5 h-5 rounded-full bg-white dark:bg-gray-700 flex items-center justify-center text-xs shadow-sm border border-gray-100 dark:border-gray-600"
                style={{ zIndex: 3 - i }}
              >
                {reaction.emoji}
              </motion.span>
            ))}
          </div>
          <span className="ml-1.5 text-sm text-gray-500 dark:text-gray-400">
            {totalReactions}
          </span>
        </div>
      )}
    </div>
  );
}

// Compact version for comment reactions
export function CompactReactions({ reactions = [], onReact, currentUserId }) {
  const [showPicker, setShowPicker] = useState(false);

  const userReaction = reactions.find(r => r.user_id === currentUserId);
  const reactionCounts = reactions.reduce((acc, r) => {
    acc[r.type] = (acc[r.type] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="relative inline-flex items-center">
      <button
        onMouseEnter={() => setShowPicker(true)}
        onMouseLeave={() => setShowPicker(false)}
        onClick={() => onReact(userReaction ? null : "like")}
        className={`text-xs font-medium ${
          userReaction ? "text-[#1877F2]" : "text-gray-500 hover:text-gray-700 dark:text-gray-400"
        }`}
      >
        {userReaction ? REACTIONS.find(r => r.id === userReaction.type)?.label || "Like" : "Like"}
      </button>

      <AnimatePresence>
        {showPicker && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute bottom-full left-0 mb-1 bg-white dark:bg-gray-800 rounded-full shadow-lg px-1 flex items-center h-8 z-50"
            onMouseEnter={() => setShowPicker(true)}
            onMouseLeave={() => setShowPicker(false)}
          >
            {REACTIONS.map((reaction) => (
              <button
                key={reaction.id}
                onClick={() => {
                  onReact(reaction.id);
                  setShowPicker(false);
                }}
                className="text-base p-0.5 hover:scale-125 transition-transform"
              >
                {reaction.emoji}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
