import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Smile, Play, Pause, X, Reply, Timer, Image as ImageIcon,
  Check, Clock, Trash2, Volume2, VolumeX, Square, Circle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

// ==================== MESSAGE REACTIONS ====================

const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '😡'];

export function ReactionPicker({ onSelect, onClose, position = 'top' }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: position === 'top' ? 10 : -10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className="absolute z-50 bg-white dark:bg-[#233138] rounded-full shadow-lg px-2 py-1 flex gap-1"
      style={{ [position === 'top' ? 'bottom' : 'top']: '100%', marginBottom: '8px' }}
    >
      {REACTION_EMOJIS.map((emoji) => (
        <motion.button
          key={emoji}
          whileHover={{ scale: 1.3 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => onSelect(emoji)}
          className="w-8 h-8 flex items-center justify-center text-xl hover:bg-gray-100 dark:hover:bg-[#2a3942] rounded-full transition-colors"
        >
          {emoji}
        </motion.button>
      ))}
      <button 
        onClick={onClose}
        className="w-8 h-8 flex items-center justify-center text-gray-400 hover:bg-gray-100 dark:hover:bg-[#2a3942] rounded-full"
      >
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  );
}

export function MessageReactions({ reactions = [], onAddReaction, isDark }) {
  const [showPicker, setShowPicker] = useState(false);
  
  // Group reactions by emoji
  const groupedReactions = reactions.reduce((acc, r) => {
    acc[r.emoji] = (acc[r.emoji] || 0) + 1;
    return acc;
  }, {});

  if (Object.keys(groupedReactions).length === 0 && !showPicker) {
    return null;
  }

  return (
    <div className="relative flex items-center gap-1 mt-1">
      {Object.entries(groupedReactions).map(([emoji, count]) => (
        <motion.span
          key={emoji}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs ${
            isDark ? 'bg-[#2a3942]' : 'bg-gray-100'
          }`}
        >
          <span>{emoji}</span>
          {count > 1 && <span className="text-gray-500">{count}</span>}
        </motion.span>
      ))}
      
      <AnimatePresence>
        {showPicker && (
          <ReactionPicker 
            onSelect={(emoji) => {
              onAddReaction(emoji);
              setShowPicker(false);
            }}
            onClose={() => setShowPicker(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}


// ==================== VOICE MESSAGES ====================

export function VoiceRecorder({ onSend, onCancel, isDark }) {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      chunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setDuration(0);
      
      timerRef.current = setInterval(() => {
        setDuration(d => d + 1);
      }, 1000);
    } catch (err) {
      console.error('Failed to start recording:', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const handleSend = () => {
    if (audioBlob) {
      onSend(audioBlob, duration);
      setAudioBlob(null);
      setAudioUrl(null);
      setDuration(0);
    }
  };

  const handleCancel = () => {
    if (isRecording) {
      stopRecording();
    }
    setAudioBlob(null);
    setAudioUrl(null);
    setDuration(0);
    onCancel();
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className={`flex items-center gap-3 px-4 py-3 ${isDark ? 'bg-[#202c33]' : 'bg-[#f0f2f5]'}`}
    >
      <Button 
        variant="ghost" 
        size="icon" 
        className="rounded-full text-red-500"
        onClick={handleCancel}
      >
        <Trash2 className="w-5 h-5" />
      </Button>

      <div className={`flex-1 flex items-center gap-3 px-4 py-2 rounded-full ${isDark ? 'bg-[#2a3942]' : 'bg-white'}`}>
        {isRecording ? (
          <>
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 1 }}
              className="w-3 h-3 rounded-full bg-red-500"
            />
            <div className={`flex-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Recording... {formatDuration(duration)}
            </div>
            {/* Waveform visualization */}
            <div className="flex items-center gap-0.5 h-6">
              {[...Array(20)].map((_, i) => (
                <motion.div
                  key={i}
                  animate={{ 
                    height: isRecording ? [4, Math.random() * 20 + 4, 4] : 4 
                  }}
                  transition={{ 
                    repeat: Infinity, 
                    duration: 0.5, 
                    delay: i * 0.05 
                  }}
                  className={`w-1 rounded-full ${isDark ? 'bg-[#00a884]' : 'bg-[#00a884]'}`}
                  style={{ minHeight: 4 }}
                />
              ))}
            </div>
          </>
        ) : audioUrl ? (
          <VoiceMessagePlayer audioUrl={audioUrl} duration={duration} isDark={isDark} />
        ) : (
          <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>
            Press the microphone to start recording
          </span>
        )}
      </div>

      {!isRecording && !audioUrl && (
        <Button 
          size="icon" 
          className="rounded-full bg-[#00a884] hover:bg-[#00a884]/90"
          onClick={startRecording}
        >
          <Circle className="w-5 h-5 text-white fill-white" />
        </Button>
      )}

      {isRecording && (
        <Button 
          size="icon" 
          className="rounded-full bg-red-500 hover:bg-red-600"
          onClick={stopRecording}
        >
          <Square className="w-4 h-4 text-white fill-white" />
        </Button>
      )}

      {audioUrl && !isRecording && (
        <Button 
          size="icon" 
          className="rounded-full bg-[#00a884] hover:bg-[#00a884]/90"
          onClick={handleSend}
        >
          <Check className="w-5 h-5 text-white" />
        </Button>
      )}
    </motion.div>
  );
}

export function VoiceMessagePlayer({ audioUrl, duration, isDark, isMe }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(duration || 0);
  const audioRef = useRef(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => setAudioDuration(audio.duration);
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = audioDuration > 0 ? (currentTime / audioDuration) * 100 : 0;

  return (
    <div className="flex items-center gap-3 min-w-[200px]">
      <audio ref={audioRef} src={audioUrl} preload="metadata" />
      
      <Button 
        variant="ghost" 
        size="icon" 
        className={`rounded-full h-10 w-10 ${isMe ? 'bg-[#025144] hover:bg-[#025144]/80' : isDark ? 'bg-[#2a3942]' : 'bg-gray-200'}`}
        onClick={togglePlay}
      >
        {isPlaying ? (
          <Pause className={`w-5 h-5 ${isMe ? 'text-white' : ''}`} />
        ) : (
          <Play className={`w-5 h-5 ${isMe ? 'text-white' : ''}`} />
        )}
      </Button>

      <div className="flex-1 flex flex-col gap-1">
        {/* Waveform/Progress bar */}
        <div className="relative h-6 flex items-center">
          <div className="flex items-end gap-0.5 w-full h-full">
            {[...Array(30)].map((_, i) => {
              const height = Math.sin(i * 0.5) * 10 + 12;
              const isActive = (i / 30) * 100 <= progress;
              return (
                <div
                  key={i}
                  className={`flex-1 rounded-full transition-colors ${
                    isActive 
                      ? (isMe ? 'bg-[#8ae3c7]' : 'bg-[#00a884]')
                      : (isMe ? 'bg-[#025144]' : isDark ? 'bg-[#3b4a54]' : 'bg-gray-300')
                  }`}
                  style={{ height: `${height}px` }}
                />
              );
            })}
          </div>
        </div>
        
        <div className={`text-xs ${isMe ? 'text-[#8ae3c7]' : isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          {formatTime(currentTime)} / {formatTime(audioDuration)}
        </div>
      </div>
    </div>
  );
}


// ==================== TYPING INDICATOR ====================

export function TypingIndicator({ isDark, userName }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className={`flex items-center gap-2 px-4 py-2 rounded-2xl max-w-fit ${
        isDark ? 'bg-[#202c33]' : 'bg-white shadow-sm'
      }`}
    >
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            animate={{ y: [0, -5, 0] }}
            transition={{ 
              repeat: Infinity, 
              duration: 0.6, 
              delay: i * 0.15,
              ease: "easeInOut"
            }}
            className={`w-2 h-2 rounded-full ${isDark ? 'bg-gray-400' : 'bg-gray-400'}`}
          />
        ))}
      </div>
      <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
        {userName ? `${userName} is typing...` : 'typing...'}
      </span>
    </motion.div>
  );
}


// ==================== MESSAGE REPLY/QUOTE ====================

export function ReplyPreview({ replyTo, onCancel, isDark }) {
  if (!replyTo) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className={`flex items-center gap-2 px-4 py-2 border-l-4 border-[#00a884] rounded-r-lg mx-4 mb-2 ${
        isDark ? 'bg-[#1f2c33]' : 'bg-gray-100'
      }`}
    >
      <Reply className="w-4 h-4 text-[#00a884]" />
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-medium ${isDark ? 'text-[#00a884]' : 'text-[#00a884]'}`}>
          {replyTo.isMe ? 'You' : replyTo.senderName || 'User'}
        </p>
        <p className={`text-sm truncate ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
          {replyTo.text}
        </p>
      </div>
      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onCancel}>
        <X className="w-4 h-4" />
      </Button>
    </motion.div>
  );
}

export function QuotedMessage({ quotedMessage, isDark, isMe, onClick }) {
  if (!quotedMessage) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      onClick={onClick}
      className={`border-l-4 border-[#00a884] rounded-r px-2 py-1 mb-1 cursor-pointer ${
        isMe 
          ? 'bg-[#025144]/50'
          : isDark ? 'bg-[#1f2c33]' : 'bg-gray-200/50'
      }`}
    >
      <p className={`text-xs font-medium ${isMe ? 'text-[#8ae3c7]' : 'text-[#00a884]'}`}>
        {quotedMessage.isMe ? 'You' : quotedMessage.senderName || 'User'}
      </p>
      <p className={`text-xs truncate ${isMe ? 'text-white/70' : isDark ? 'text-gray-400' : 'text-gray-600'}`}>
        {quotedMessage.text}
      </p>
    </motion.div>
  );
}


// ==================== DISAPPEARING MESSAGES ====================

export function DisappearingMessagesDialog({ open, onClose, currentSetting, onSave, isDark }) {
  const [selected, setSelected] = useState(currentSetting || 'off');

  const options = [
    { value: 'off', label: 'Off', description: 'Messages will not disappear' },
    { value: '24h', label: '24 hours', description: 'Messages disappear after 24 hours' },
    { value: '7d', label: '7 days', description: 'Messages disappear after 7 days' },
    { value: '90d', label: '90 days', description: 'Messages disappear after 90 days' },
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className={isDark ? 'bg-[#233138] text-white border-[#2a2a2a]' : ''}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Timer className="w-5 h-5 text-[#00a884]" />
            Disappearing messages
          </DialogTitle>
          <DialogDescription className={isDark ? 'text-gray-400' : ''}>
            Choose how long messages will be visible in this chat
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-2 py-4">
          {options.map((option) => (
            <button
              key={option.value}
              onClick={() => setSelected(option.value)}
              className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                selected === option.value
                  ? 'bg-[#00a884]/20 border border-[#00a884]'
                  : isDark ? 'hover:bg-[#2a3942]' : 'hover:bg-gray-100'
              }`}
            >
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                selected === option.value 
                  ? 'border-[#00a884] bg-[#00a884]'
                  : isDark ? 'border-gray-500' : 'border-gray-400'
              }`}>
                {selected === option.value && (
                  <Check className="w-3 h-3 text-white" />
                )}
              </div>
              <div className="flex-1 text-left">
                <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {option.label}
                </p>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  {option.description}
                </p>
              </div>
              {option.value !== 'off' && (
                <Timer className={`w-4 h-4 ${selected === option.value ? 'text-[#00a884]' : 'text-gray-400'}`} />
              )}
            </button>
          ))}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button 
            className="bg-[#00a884] hover:bg-[#00a884]/90"
            onClick={() => {
              onSave(selected);
              onClose();
            }}
          >
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function DisappearingTimer({ expiresAt, isDark, isMe }) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    if (!expiresAt) return;

    const updateTimer = () => {
      const now = new Date();
      const expiry = new Date(expiresAt);
      const diff = expiry - now;

      if (diff <= 0) {
        setTimeLeft('Expired');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      
      if (hours > 24) {
        const days = Math.floor(hours / 24);
        setTimeLeft(`${days}d`);
      } else if (hours > 0) {
        setTimeLeft(`${hours}h`);
      } else {
        setTimeLeft(`${minutes}m`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  if (!expiresAt) return null;

  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] ${
      isMe ? 'text-white/50' : isDark ? 'text-gray-500' : 'text-gray-400'
    }`}>
      <Timer className="w-3 h-3" />
      {timeLeft}
    </span>
  );
}


// ==================== CUSTOM WALLPAPERS ====================

const PRESET_WALLPAPERS = [
  { id: 'default-dark', name: 'Default Dark', type: 'pattern', value: '#0b141a' },
  { id: 'default-light', name: 'Default Light', type: 'pattern', value: '#efeae2' },
  { id: 'solid-teal', name: 'Teal', type: 'solid', value: '#128C7E' },
  { id: 'solid-purple', name: 'Purple', type: 'solid', value: '#6B5B95' },
  { id: 'solid-blue', name: 'Blue', type: 'solid', value: '#1E3A5F' },
  { id: 'solid-green', name: 'Green', type: 'solid', value: '#2D5A27' },
  { id: 'gradient-sunset', name: 'Sunset', type: 'gradient', value: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
  { id: 'gradient-ocean', name: 'Ocean', type: 'gradient', value: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
  { id: 'gradient-forest', name: 'Forest', type: 'gradient', value: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)' },
  { id: 'gradient-night', name: 'Night Sky', type: 'gradient', value: 'linear-gradient(135deg, #0c0c0c 0%, #1a1a2e 50%, #16213e 100%)' },
];

export function WallpaperPicker({ open, onClose, currentWallpaper, onSave, isDark }) {
  const [selected, setSelected] = useState(currentWallpaper?.id || 'default-dark');
  const [customImage, setCustomImage] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setCustomImage(url);
      setSelected('custom');
    }
  };

  const handleSave = () => {
    if (selected === 'custom' && customImage) {
      onSave({ id: 'custom', type: 'image', value: customImage });
    } else {
      const preset = PRESET_WALLPAPERS.find(w => w.id === selected);
      onSave(preset);
    }
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent 
        className={`max-w-lg mx-auto ${isDark ? 'bg-[#233138] text-white border-[#2a2a2a]' : ''}`}
        style={{
          position: 'fixed',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
        }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-[#00a884]" />
            Chat Wallpaper
          </DialogTitle>
          <DialogDescription className={isDark ? 'text-gray-400' : ''}>
            Choose a wallpaper for this conversation
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          {/* Preset Wallpapers */}
          <p className={`text-sm font-medium mb-3 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            Preset Wallpapers
          </p>
          <div className="grid grid-cols-5 gap-2 mb-4">
            {PRESET_WALLPAPERS.map((wallpaper) => (
              <button
                key={wallpaper.id}
                onClick={() => setSelected(wallpaper.id)}
                className={`aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                  selected === wallpaper.id
                    ? 'border-[#00a884] ring-2 ring-[#00a884]/30'
                    : 'border-transparent hover:border-gray-400'
                }`}
                style={{
                  background: wallpaper.type === 'gradient' ? wallpaper.value : wallpaper.value
                }}
                title={wallpaper.name}
              >
                {selected === wallpaper.id && (
                  <div className="w-full h-full flex items-center justify-center bg-black/30">
                    <Check className="w-5 h-5 text-white" />
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Custom Image Upload */}
          <p className={`text-sm font-medium mb-3 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            Custom Image
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
          
          <div className="flex gap-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              className={`flex-1 h-24 border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-2 transition-colors ${
                isDark 
                  ? 'border-gray-600 hover:border-gray-500 text-gray-400' 
                  : 'border-gray-300 hover:border-gray-400 text-gray-500'
              }`}
            >
              <ImageIcon className="w-6 h-6" />
              <span className="text-sm">Upload Image</span>
            </button>
            
            {customImage && (
              <button
                onClick={() => setSelected('custom')}
                className={`h-24 w-24 rounded-lg overflow-hidden border-2 transition-all ${
                  selected === 'custom'
                    ? 'border-[#00a884] ring-2 ring-[#00a884]/30'
                    : 'border-transparent'
                }`}
              >
                <img src={customImage} alt="Custom" className="w-full h-full object-cover" />
              </button>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button 
            className="bg-[#00a884] hover:bg-[#00a884]/90"
            onClick={handleSave}
          >
            Apply Wallpaper
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function getWallpaperStyle(wallpaper, isDark) {
  if (!wallpaper) {
    // Default WhatsApp-style pattern
    return {
      backgroundImage: isDark 
        ? 'url("data:image/svg+xml,%3Csvg width="100" height="100" xmlns="http://www.w3.org/2000/svg"%3E%3Cpath d="M0 0h100v100H0z" fill="%230b141a"/%3E%3Cpath d="M20 20h2v2h-2zM40 40h2v2h-2zM60 60h2v2h-2zM80 80h2v2h-2z" fill="%23182229" opacity=".5"/%3E%3C/svg%3E")'
        : 'url("data:image/svg+xml,%3Csvg width="100" height="100" xmlns="http://www.w3.org/2000/svg"%3E%3Cpath d="M0 0h100v100H0z" fill="%23efeae2"/%3E%3Cpath d="M20 20h2v2h-2zM40 40h2v2h-2zM60 60h2v2h-2zM80 80h2v2h-2z" fill="%23d1d7db" opacity=".3"/%3E%3C/svg%3E")',
      backgroundColor: isDark ? '#0b141a' : '#efeae2'
    };
  }

  switch (wallpaper.type) {
    case 'solid':
      return { backgroundColor: wallpaper.value };
    case 'gradient':
      return { background: wallpaper.value };
    case 'image':
      return {
        backgroundImage: `url(${wallpaper.value})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      };
    case 'pattern':
    default:
      return { backgroundColor: wallpaper.value };
  }
}


// ==================== ENHANCED MESSAGE BUBBLE ====================

export function EnhancedMessageBubble({ 
  message, 
  isMe, 
  isDark, 
  onReply, 
  onReact,
  showReactionPicker,
  setShowReactionPicker
}) {
  const [showOptions, setShowOptions] = useState(false);
  
  const getStatusIcon = (status) => {
    switch (status) {
      case 'sent': return <Check className="w-3 h-3" />;
      case 'delivered': return <Check className="w-3 h-3" />;
      case 'read': return <Check className="w-3 h-3 text-[#53bdeb]" />;
      default: return <Clock className="w-3 h-3" />;
    }
  };

  return (
    <div 
      className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-1 group relative`}
      onMouseEnter={() => setShowOptions(true)}
      onMouseLeave={() => {
        setShowOptions(false);
        if (!showReactionPicker) setShowReactionPicker?.(null);
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        setShowReactionPicker?.(message.id);
      }}
    >
      {/* Quick action buttons */}
      <AnimatePresence>
        {showOptions && !showReactionPicker && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className={`absolute ${isMe ? 'right-[calc(100%-60px)]' : 'left-[calc(100%-60px)]'} top-0 flex items-center gap-1`}
          >
            <button
              onClick={() => setShowReactionPicker?.(message.id)}
              className={`p-1.5 rounded-full transition-colors ${
                isDark ? 'hover:bg-[#2a3942] text-gray-400' : 'hover:bg-gray-200 text-gray-500'
              }`}
            >
              <Smile className="w-4 h-4" />
            </button>
            <button
              onClick={() => onReply?.(message)}
              className={`p-1.5 rounded-full transition-colors ${
                isDark ? 'hover:bg-[#2a3942] text-gray-400' : 'hover:bg-gray-200 text-gray-500'
              }`}
            >
              <Reply className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative max-w-[65%]">
        {/* Reaction picker */}
        <AnimatePresence>
          {showReactionPicker === message.id && (
            <ReactionPicker
              position={isMe ? 'top' : 'top'}
              onSelect={(emoji) => {
                onReact?.(message.id, emoji);
                setShowReactionPicker?.(null);
              }}
              onClose={() => setShowReactionPicker?.(null)}
            />
          )}
        </AnimatePresence>

        <div
          className={`relative px-3 py-2 rounded-lg ${
            isMe
              ? 'bg-[#005c4b] text-white rounded-tr-none'
              : isDark
                ? 'bg-[#202c33] text-white rounded-tl-none'
                : 'bg-white text-gray-900 rounded-tl-none shadow-sm'
          }`}
        >
          {/* Quoted message if replying */}
          {message.quotedMessage && (
            <QuotedMessage 
              quotedMessage={message.quotedMessage} 
              isDark={isDark} 
              isMe={isMe}
            />
          )}

          {/* Voice message */}
          {message.isVoice && message.audioUrl && (
            <VoiceMessagePlayer 
              audioUrl={message.audioUrl} 
              duration={message.duration}
              isDark={isDark}
              isMe={isMe}
            />
          )}

          {/* Image */}
          {message.image && (
            <img 
              src={message.image} 
              alt="" 
              className="rounded-lg mb-2 max-w-full"
            />
          )}
          
          {/* Text */}
          {message.text && !message.isVoice && (
            <p className="text-sm whitespace-pre-wrap break-words">{message.text}</p>
          )}
          
          {/* Footer with time, status, and disappearing timer */}
          <div className={`flex items-center justify-end gap-1 mt-1 ${isMe ? 'text-white/70' : 'text-gray-400'}`}>
            {message.expiresAt && (
              <DisappearingTimer expiresAt={message.expiresAt} isDark={isDark} isMe={isMe} />
            )}
            <span className="text-[10px]">{message.time}</span>
            {isMe && getStatusIcon(message.status)}
          </div>
        </div>

        {/* Reactions display */}
        {message.reactions?.length > 0 && (
          <MessageReactions 
            reactions={message.reactions} 
            onAddReaction={(emoji) => onReact?.(message.id, emoji)}
            isDark={isDark}
          />
        )}
      </div>
    </div>
  );
}
