/**
 * Emoji Picker Modal Component
 * Extracted from WhatsAppDesktopLayout for modularity
 */
import { motion, AnimatePresence } from "framer-motion";

// All emoji categories
const EMOJI_CATEGORIES = [
  { icon: '😀', label: 'Smileys' },
  { icon: '👋', label: 'Gestures' },
  { icon: '❤️', label: 'Love' },
  { icon: '🎉', label: 'Party' },
  { icon: '🐱', label: 'Animals' },
  { icon: '🍕', label: 'Food' },
  { icon: '⚽', label: 'Sports' },
  { icon: '🚗', label: 'Travel' },
];

// Full emoji list
const EMOJIS = [
  // Smileys & Emotion
  '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '😊',
  '😇', '🥰', '😍', '🤩', '😘', '😗', '☺️', '😚', '😙', '🥲',
  '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔',
  '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '😮‍💨',
  '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢',
  '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '🥸',
  '😎', '🤓', '🧐', '😕', '😟', '🙁', '☹️', '😮', '😯', '😲',
  '😳', '🥺', '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😱',
  '😖', '😣', '😞', '😓', '😩', '😫', '🥱', '😤', '😡', '😠',
  '🤬', '😈', '👿', '💀', '☠️', '💩', '🤡', '👹', '👺', '👻',
  '👽', '👾', '🤖', '😺', '😸', '😹', '😻', '😼', '😽', '🙀',
  '😿', '😾', '🙈', '🙉', '🙊',
  // Gestures & People
  '👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞',
  '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍',
  '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝',
  '🙏', '✍️', '💅', '🤳', '💪', '🦾', '🦿', '🦵', '🦶', '👂',
  // Hearts & Love
  '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔',
  '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '💌',
  '💋', '💏', '💑', '🫂',
  // Celebration
  '🎉', '🎊', '🎈', '🎁', '🎂', '🎄', '🎃', '🎆', '🎇', '✨',
  '🎵', '🎶', '🎤', '🎧', '🎸', '🎹', '🥁', '🎷', '🎺', '🎻',
  // Animals
  '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯',
  '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🐤', '🦆',
  '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🪱', '🐛',
  '🦋', '🐌', '🐞', '🐜', '🪰', '🪲', '🪳', '🦟', '🦗', '🕷️',
  // Food & Drink
  '🍎', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒',
  '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🥑', '🍆', '🌶️', '🫑',
  '🥒', '🥬', '🥦', '🧄', '🧅', '🥔', '🍠', '🥐', '🥯', '🍞',
  '🥖', '🥨', '🧀', '🥚', '🍳', '🧈', '🥞', '🧇', '🥓', '🥩',
  '🍗', '🍖', '🦴', '🌭', '🍔', '🍟', '🍕', '🌮', '🌯', '🫔',
  '🥙', '🧆', '🥚', '🍱', '🍘', '🍙', '🍚', '🍛', '🍜', '🍝',
  '🍣', '🍤', '🍥', '🥮', '🍡', '🥟', '🥠', '🥡', '🦀', '🦞',
  '🦐', '🦑', '🦪', '🍦', '🍧', '🍨', '🍩', '🍪', '🎂', '🍰',
  '🧁', '🥧', '🍫', '🍬', '🍭', '🍮', '🍯', '🍼', '🥛', '☕',
  '🫖', '🍵', '🍶', '🍾', '🍷', '🍸', '🍹', '🍺', '🍻', '🥂',
  // Sports & Activities  
  '⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱',
  '🪀', '🏓', '🏸', '🏒', '🏑', '🥍', '🏏', '🪃', '🥅', '⛳',
  '🪁', '🏹', '🎣', '🤿', '🥊', '🥋', '🎽', '🛹', '🛼', '🛷',
  '⛸️', '🥌', '🎿', '⛷️', '🏂', '🪂', '🏋️', '🤼', '🤸', '🤺',
  // Travel & Places
  '🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐',
  '🛻', '🚚', '🚛', '🚜', '🏍️', '🛵', '🚲', '🛴', '🛺', '🚨',
  '🚔', '🚍', '🚘', '🚖', '🚡', '🚠', '🚟', '🚃', '🚋', '🚞',
  '🚝', '🚄', '🚅', '🚈', '🚂', '🚆', '🚇', '🚊', '🚉', '✈️',
  '🛫', '🛬', '🛩️', '💺', '🛰️', '🚀', '🛸', '🚁', '🛶', '⛵',
  '🚤', '🛥️', '🛳️', '⛴️', '🚢', '⚓', '🪝', '⛽', '🚧', '🚦',
  // Objects & Symbols
  '💯', '💢', '💥', '💫', '💦', '💨', '🕳️', '💣', '💬', '👁️‍🗨️',
  '🗨️', '🗯️', '💭', '💤', '🔥', '🌟', '⭐', '🌈', '☀️', '🌙',
  '💡', '🔦', '🏮', '🪔', '📱', '💻', '🖥️', '🖨️', '⌨️', '🖱️',
  '💾', '💿', '📀', '📼', '📷', '📸', '📹', '🎥', '📽️', '🎞️',
  '📞', '☎️', '📟', '📠', '📺', '📻', '🎙️', '🎚️', '🎛️', '🧭',
  '⏱️', '⏲️', '⏰', '🕰️', '⌛', '⏳', '📡', '🔋', '🔌', '💳',
];

export function EmojiPickerModal({ isOpen, onClose, onSelect, isDark, inputRef }) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.95 }}
          className={`absolute bottom-14 left-0 z-50 p-4 rounded-2xl shadow-2xl ${
            isDark ? 'bg-[#233138] border border-[#3a4a5a]' : 'bg-white border border-gray-200'
          }`}
          style={{ width: '420px' }}
          data-testid="emoji-picker-modal"
        >
          {/* Emoji Categories Header */}
          <div className={`flex gap-2 mb-3 pb-3 border-b ${isDark ? 'border-[#3a4a5a]' : 'border-gray-200'}`}>
            {EMOJI_CATEGORIES.map((cat) => (
              <button
                key={cat.label}
                className="p-2 rounded-lg text-lg hover:bg-gray-100 dark:hover:bg-[#2a3a4a] transition-colors"
                title={cat.label}
              >
                {cat.icon}
              </button>
            ))}
          </div>
          
          {/* Emoji Grid */}
          <div className="grid grid-cols-10 gap-1 max-h-80 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-transparent">
            {EMOJIS.map((emoji, index) => (
              <button
                key={`${emoji}-${index}`}
                onClick={() => {
                  onSelect(emoji);
                  inputRef?.current?.focus();
                }}
                className="w-9 h-9 flex items-center justify-center text-2xl hover:bg-gray-100 dark:hover:bg-[#2a3a4a] rounded-lg transition-colors"
              >
                {emoji}
              </button>
            ))}
          </div>
          
          {/* Footer */}
          <div className={`flex justify-between items-center mt-3 pt-3 border-t ${isDark ? 'border-[#3a4a5a]' : 'border-gray-200'}`}>
            <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Click emoji to insert
            </span>
            <button
              onClick={onClose}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                isDark 
                  ? 'bg-[#2a3a4a] text-white hover:bg-[#3a4a5a]' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Close
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default EmojiPickerModal;
