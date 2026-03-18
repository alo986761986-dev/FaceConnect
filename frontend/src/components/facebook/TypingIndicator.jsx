import { motion } from "framer-motion";

// Typing indicator with bouncing dots
export function TypingIndicator({ className = "" }) {
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full"
          animate={{
            y: [0, -6, 0],
          }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            delay: i * 0.15,
            ease: "easeInOut"
          }}
        />
      ))}
    </div>
  );
}

// Typing indicator in chat bubble style
export function TypingBubble({ username, avatar }) {
  return (
    <div className="flex items-end gap-2 mb-2">
      {avatar && (
        <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0">
          <img src={avatar} alt={username} className="w-full h-full object-cover" />
        </div>
      )}
      <motion.div
        initial={{ opacity: 0, scale: 0.8, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.8, y: 10 }}
        className="bg-gray-200 dark:bg-gray-700 rounded-2xl rounded-bl-md px-4 py-3"
      >
        <TypingIndicator />
      </motion.div>
    </div>
  );
}

// "User is typing..." text indicator
export function TypingText({ users = [] }) {
  if (users.length === 0) return null;

  let text;
  if (users.length === 1) {
    text = `${users[0]} is typing`;
  } else if (users.length === 2) {
    text = `${users[0]} and ${users[1]} are typing`;
  } else {
    text = `${users[0]} and ${users.length - 1} others are typing`;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 5 }}
      className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 px-4 py-1"
    >
      <TypingIndicator />
      <span>{text}</span>
    </motion.div>
  );
}

export default TypingIndicator;
