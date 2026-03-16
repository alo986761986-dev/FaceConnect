import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Loader2, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/AuthContext";
import { useSettings } from "@/context/SettingsContext";
import { haptic } from "@/utils/mobile";
import debounce from "lodash/debounce";

const API_URL = process.env.REACT_APP_BACKEND_URL;

/**
 * SmartInput - AI-powered text input with suggestions
 * 
 * Features:
 * - Real-time text completion suggestions (CoPilot-style)
 * - Quick reply suggestions for chat
 * - Caption suggestions for posts
 * 
 * Props:
 * - value: string - Current input value
 * - onChange: (value: string) => void
 * - onSubmit?: () => void
 * - context: "chat" | "post" | "story" | "bio"
 * - placeholder?: string
 * - multiline?: boolean
 * - showQuickReplies?: boolean
 * - lastMessage?: string - For generating quick replies
 * - className?: string
 */

export default function SmartInput({
  value,
  onChange,
  onSubmit,
  context = "chat",
  placeholder = "Type a message...",
  multiline = false,
  showQuickReplies = false,
  lastMessage = "",
  className = "",
  ...props
}) {
  const { token } = useAuth();
  const { isDark, settings } = useSettings();
  
  const [suggestions, setSuggestions] = useState([]);
  const [quickReplies, setQuickReplies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  const inputRef = useRef(null);
  const aiEnabled = settings?.aiFeatures !== false;

  // Debounced function to fetch suggestions
  const fetchSuggestions = useCallback(
    debounce(async (text) => {
      if (!aiEnabled || !token || text.length < 3) {
        setSuggestions([]);
        return;
      }
      
      setLoading(true);
      try {
        const response = await fetch(`${API_URL}/api/ai/text-suggest?token=${token}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            partial_text: text,
            context
          })
        });
        
        if (response.ok) {
          const data = await response.json();
          setSuggestions(data.suggestions || []);
          setShowSuggestions(data.suggestions?.length > 0);
          setSelectedIndex(0);
        }
      } catch (error) {
        console.error("Suggestion fetch error:", error);
      } finally {
        setLoading(false);
      }
    }, 500),
    [token, context, aiEnabled]
  );

  // Fetch quick replies
  const fetchQuickReplies = useCallback(async () => {
    if (!aiEnabled || !token || !lastMessage) return;
    
    try {
      const response = await fetch(`${API_URL}/api/ai/quick-replies?token=${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          last_message: lastMessage,
          context: "chat"
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setQuickReplies(data.replies || []);
      }
    } catch (error) {
      console.error("Quick reply fetch error:", error);
    }
  }, [token, lastMessage, aiEnabled]);

  // Fetch suggestions when value changes
  useEffect(() => {
    fetchSuggestions(value);
  }, [value, fetchSuggestions]);

  // Fetch quick replies when lastMessage changes
  useEffect(() => {
    if (showQuickReplies && lastMessage) {
      fetchQuickReplies();
    }
  }, [showQuickReplies, lastMessage, fetchQuickReplies]);

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (!showSuggestions || suggestions.length === 0) {
      if (e.key === 'Enter' && !e.shiftKey && onSubmit) {
        e.preventDefault();
        onSubmit();
      }
      return;
    }
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % suggestions.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
        break;
      case 'Tab':
      case 'ArrowRight':
        e.preventDefault();
        applySuggestion(suggestions[selectedIndex]);
        break;
      case 'Enter':
        if (!e.shiftKey && showSuggestions) {
          e.preventDefault();
          applySuggestion(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        break;
    }
  };

  // Apply suggestion to input
  const applySuggestion = (suggestion) => {
    if (!suggestion) return;
    
    // Append suggestion to current text
    const newValue = value + suggestion;
    onChange(newValue);
    setShowSuggestions(false);
    setSuggestions([]);
    haptic.light();
    
    // Focus back on input
    inputRef.current?.focus();
  };

  // Apply quick reply
  const applyQuickReply = (reply) => {
    onChange(reply);
    setQuickReplies([]);
    haptic.light();
    
    // Auto-submit after short delay
    setTimeout(() => {
      if (onSubmit) onSubmit();
    }, 100);
  };

  const InputComponent = multiline ? Textarea : Input;

  return (
    <div className="relative w-full">
      {/* Quick Replies */}
      <AnimatePresence>
        {showQuickReplies && quickReplies.length > 0 && !value && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="flex flex-wrap gap-2 mb-2"
          >
            {quickReplies.map((reply, i) => (
              <motion.button
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => applyQuickReply(reply)}
                className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                  isDark
                    ? 'bg-white/10 text-white hover:bg-white/20'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                data-testid={`quick-reply-${i}`}
              >
                {reply}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input with Suggestions */}
      <div className="relative">
        <InputComponent
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          placeholder={placeholder}
          className={`w-full ${className}`}
          {...props}
        />
        
        {/* AI indicator */}
        {aiEnabled && (
          <div className={`absolute right-3 top-1/2 -translate-y-1/2 ${loading ? 'opacity-100' : 'opacity-0'} transition-opacity`}>
            <Loader2 className="w-4 h-4 text-[#00F0FF] animate-spin" />
          </div>
        )}

        {/* Inline ghost suggestion */}
        {showSuggestions && suggestions.length > 0 && value && (
          <div 
            className="absolute inset-0 pointer-events-none flex items-center px-3 overflow-hidden"
            style={{ paddingTop: multiline ? '8px' : '0' }}
          >
            <span className="invisible">{value}</span>
            <span className={`${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
              {suggestions[selectedIndex]}
            </span>
          </div>
        )}
      </div>

      {/* Suggestions Dropdown */}
      <AnimatePresence>
        {showSuggestions && suggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className={`absolute bottom-full left-0 right-0 mb-1 rounded-lg border overflow-hidden z-50 ${
              isDark ? 'bg-[#1A1A1A] border-white/10' : 'bg-white border-gray-200 shadow-lg'
            }`}
          >
            <div className="flex items-center gap-1 px-3 py-1.5 border-b border-white/5">
              <Sparkles className="w-3 h-3 text-[#00F0FF]" />
              <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                AI Suggestions (Tab to accept)
              </span>
            </div>
            {suggestions.map((suggestion, i) => (
              <button
                key={i}
                onClick={() => applySuggestion(suggestion)}
                className={`w-full px-3 py-2 text-left text-sm flex items-center justify-between ${
                  i === selectedIndex
                    ? isDark ? 'bg-white/10' : 'bg-gray-100'
                    : ''
                } ${isDark ? 'text-white hover:bg-white/5' : 'text-gray-700 hover:bg-gray-50'}`}
                data-testid={`suggestion-${i}`}
              >
                <span>
                  <span className="opacity-50">{value}</span>
                  <span className="text-[#00F0FF]">{suggestion}</span>
                </span>
                {i === selectedIndex && (
                  <ChevronRight className="w-4 h-4 opacity-50" />
                )}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Export a simpler wrapper for quick integration
export function SmartTextarea(props) {
  return <SmartInput multiline {...props} />;
}
