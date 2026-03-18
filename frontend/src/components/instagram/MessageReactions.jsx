import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, SmilePlus } from "lucide-react";

const QUICK_REACTIONS = ["❤️", "😂", "😮", "😢", "😡", "👍"];

export function MessageReactions({ reactions = [], onAddReaction, onRemoveReaction, currentUserId }) {
  const [showPicker, setShowPicker] = useState(false);

  // Group reactions by emoji
  const groupedReactions = reactions.reduce((acc, r) => {
    if (!acc[r.emoji]) {
      acc[r.emoji] = [];
    }
    acc[r.emoji].push(r.user_id);
    return acc;
  }, {});

  const handleReaction = (emoji) => {
    const userReaction = reactions.find(r => r.user_id === currentUserId);
    
    if (userReaction?.emoji === emoji) {
      onRemoveReaction?.();
    } else {
      onAddReaction?.(emoji);
    }
    setShowPicker(false);
  };

  const userHasReacted = (emoji) => {
    return reactions.some(r => r.user_id === currentUserId && r.emoji === emoji);
  };

  return (
    <div className="relative">
      {/* Display existing reactions */}
      {Object.keys(groupedReactions).length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {Object.entries(groupedReactions).map(([emoji, users]) => (
            <button
              key={emoji}
              onClick={() => handleReaction(emoji)}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-colors ${
                userHasReacted(emoji)
                  ? "bg-[var(--primary)]/20 text-[var(--primary)]"
                  : "bg-[var(--muted)] text-[var(--text-secondary)]"
              }`}
            >
              <span>{emoji}</span>
              {users.length > 1 && <span>{users.length}</span>}
            </button>
          ))}
        </div>
      )}

      {/* Reaction picker trigger */}
      <button
        onClick={() => setShowPicker(!showPicker)}
        className="p-1 rounded-full hover:bg-[var(--muted)] transition-colors"
      >
        <SmilePlus className="w-4 h-4 text-[var(--text-muted)]" />
      </button>

      {/* Reaction picker */}
      <AnimatePresence>
        {showPicker && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            className="absolute bottom-full left-0 mb-2 flex gap-1 p-2 bg-[var(--card)] rounded-full shadow-lg border border-[var(--border)] z-10"
          >
            {QUICK_REACTIONS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleReaction(emoji)}
                className={`w-8 h-8 flex items-center justify-center text-lg rounded-full hover:bg-[var(--muted)] transition-all hover:scale-125 ${
                  userHasReacted(emoji) ? "bg-[var(--primary)]/20" : ""
                }`}
              >
                {emoji}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Double-tap to like (Instagram-style)
export function DoubleTapLike({ children, onDoubleTap, liked }) {
  const [showHeart, setShowHeart] = useState(false);
  const lastTap = useState(0);

  const handleTap = () => {
    const now = Date.now();
    if (now - lastTap[0] < 300) {
      // Double tap detected
      if (!liked) {
        onDoubleTap?.();
      }
      setShowHeart(true);
      setTimeout(() => setShowHeart(false), 1000);
    }
    lastTap[0] = now;
  };

  return (
    <div className="relative" onClick={handleTap}>
      {children}
      
      <AnimatePresence>
        {showHeart && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
          >
            <Heart className="w-24 h-24 text-white fill-white drop-shadow-lg" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Long-press reaction menu
export function LongPressReaction({ children, onReaction, onLongPress }) {
  const [showMenu, setShowMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const longPressTimer = useState(null);

  const handleTouchStart = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMenuPosition({
      x: e.touches[0].clientX - rect.left,
      y: e.touches[0].clientY - rect.top
    });
    
    longPressTimer[0] = setTimeout(() => {
      setShowMenu(true);
      onLongPress?.();
    }, 500);
  };

  const handleTouchEnd = () => {
    if (longPressTimer[0]) {
      clearTimeout(longPressTimer[0]);
    }
  };

  const handleReaction = (emoji) => {
    onReaction?.(emoji);
    setShowMenu(false);
  };

  return (
    <div
      className="relative"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchEnd}
    >
      {children}
      
      <AnimatePresence>
        {showMenu && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={() => setShowMenu(false)}
            />
            
            {/* Reaction menu */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute z-50 flex gap-1 p-2 bg-[var(--card)] rounded-full shadow-2xl border border-[var(--border)]"
              style={{
                left: Math.min(menuPosition.x, 200),
                top: menuPosition.y - 60
              }}
            >
              {QUICK_REACTIONS.map((emoji) => (
                <motion.button
                  key={emoji}
                  whileHover={{ scale: 1.3 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleReaction(emoji)}
                  className="w-10 h-10 flex items-center justify-center text-2xl rounded-full hover:bg-[var(--muted)]"
                >
                  {emoji}
                </motion.button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export default MessageReactions;
