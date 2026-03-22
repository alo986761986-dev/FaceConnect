// Sound utilities for notifications and messages
// Uses both Web Audio API and HTML5 Audio for reliable playback across platforms

// Detect if running in Electron (file:// protocol)
const isElectronEnv = typeof window !== 'undefined' && (
  window.location.protocol === 'file:' ||
  window.electronAPI?.isElectron === true ||
  (navigator.userAgent.toLowerCase().indexOf('electron') >= 0)
);

// WAV file paths - use relative paths for Electron, absolute for web
const getBasePath = () => isElectronEnv ? '.' : '';

const SOUND_FILES = {
  send: `${getBasePath()}/sounds/send.wav`,
  receive: `${getBasePath()}/sounds/receive.wav`,
  notification: `${getBasePath()}/sounds/notification.wav`,
  success: `${getBasePath()}/sounds/success.wav`,
  error: `${getBasePath()}/sounds/error.wav`,
  typing: `${getBasePath()}/sounds/typing.wav`,
  ringtone: `${getBasePath()}/sounds/ringtone.wav`,
};

// Programmatic sounds as fallback
const SOUND_LIBRARY = {
  default: {
    name: "Default",
    frequency: 880,
    duration: 0.15,
    type: "sine"
  },
  chime: {
    name: "Chime",
    frequency: 1047,
    duration: 0.2,
    type: "sine",
    harmonics: [1, 0.5, 0.25]
  },
  bell: {
    name: "Bell",
    frequency: 659,
    duration: 0.3,
    type: "triangle"
  },
  pop: {
    name: "Pop",
    frequency: 440,
    duration: 0.08,
    type: "square"
  },
  ding: {
    name: "Ding",
    frequency: 1319,
    duration: 0.25,
    type: "sine"
  },
  swoosh: {
    name: "Swoosh",
    frequencyStart: 200,
    frequencyEnd: 800,
    duration: 0.15,
    type: "sawtooth",
    sweep: true
  },
  bubble: {
    name: "Bubble",
    frequency: 523,
    duration: 0.12,
    type: "sine",
    pitchBend: 0.3
  },
  // Call sounds
  call_outgoing: {
    name: "Outgoing Call",
    frequency: 440,
    duration: 0.5,
    type: "sine"
  },
  call_incoming: {
    name: "Incoming Call",
    frequency: 880,
    duration: 0.6,
    type: "sine",
    harmonics: [1, 0.7, 0.4]
  },
  call_connect: {
    name: "Call Connected",
    frequency: 1047,
    duration: 0.15,
    type: "sine"
  },
  call_end: {
    name: "Call Ended",
    frequency: 330,
    duration: 0.3,
    type: "triangle"
  },
  none: {
    name: "None (Silent)",
    silent: true
  }
};

// Audio context singleton
let audioContext = null;

// Audio element cache
const audioCache = new Map();

// Last played timestamps for debouncing
const lastPlayed = new Map();

function getAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
  return audioContext;
}

/**
 * Preload a WAV sound file
 */
function preloadWavSound(soundName) {
  if (audioCache.has(soundName)) return audioCache.get(soundName);
  
  const soundPath = SOUND_FILES[soundName];
  if (!soundPath) return null;
  
  try {
    const audio = new Audio(soundPath);
    audio.preload = 'auto';
    audio.load();
    audioCache.set(soundName, audio);
    return audio;
  } catch (e) {
    console.warn(`Failed to preload sound: ${soundName}`, e);
    return null;
  }
}

/**
 * Play a WAV sound file
 */
async function playWavSound(soundName, volume = 0.8, debounceMs = 50) {
  // Check if enabled
  const soundEnabled = localStorage.getItem('soundEnabled') !== 'false';
  if (!soundEnabled) return;
  
  // Debounce
  const now = Date.now();
  const lastTime = lastPlayed.get(soundName) || 0;
  if (now - lastTime < debounceMs) return;
  lastPlayed.set(soundName, now);
  
  const soundPath = SOUND_FILES[soundName];
  if (!soundPath) return;
  
  try {
    let audio = audioCache.get(soundName);
    
    if (!audio) {
      audio = new Audio(soundPath);
      audioCache.set(soundName, audio);
    }
    
    // Clone for overlapping sounds
    const playable = audio.cloneNode();
    playable.volume = Math.min(1, Math.max(0, volume));
    
    await playable.play();
    
    playable.onended = () => {
      playable.remove();
    };
    
    return playable;
  } catch (e) {
    console.debug(`Sound play failed: ${soundName}`, e.message);
  }
}

/**
 * Play a programmatic sound using Web Audio API
 */
export async function playSound(soundId, volume = 80) {
  const sound = SOUND_LIBRARY[soundId] || SOUND_LIBRARY.default;
  
  if (sound.silent || volume === 0) return;
  
  // Check if enabled
  const soundEnabled = localStorage.getItem('soundEnabled') !== 'false';
  if (!soundEnabled) return;
  
  try {
    const ctx = getAudioContext();
    const gainNode = ctx.createGain();
    const normalizedVolume = Math.min(1, Math.max(0, volume / 100)) * 0.5;
    
    gainNode.connect(ctx.destination);
    gainNode.gain.setValueAtTime(normalizedVolume, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + sound.duration);
    
    if (sound.sweep) {
      const oscillator = ctx.createOscillator();
      oscillator.type = sound.type || 'sine';
      oscillator.frequency.setValueAtTime(sound.frequencyStart, ctx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(sound.frequencyEnd, ctx.currentTime + sound.duration);
      oscillator.connect(gainNode);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + sound.duration);
    } else if (sound.harmonics) {
      sound.harmonics.forEach((amplitude, i) => {
        const oscillator = ctx.createOscillator();
        const harmonicGain = ctx.createGain();
        harmonicGain.gain.setValueAtTime(normalizedVolume * amplitude, ctx.currentTime);
        harmonicGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + sound.duration);
        harmonicGain.connect(ctx.destination);
        
        oscillator.type = sound.type || 'sine';
        oscillator.frequency.setValueAtTime(sound.frequency * (i + 1), ctx.currentTime);
        oscillator.connect(harmonicGain);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + sound.duration);
      });
    } else if (sound.pitchBend) {
      const oscillator = ctx.createOscillator();
      oscillator.type = sound.type || 'sine';
      oscillator.frequency.setValueAtTime(sound.frequency, ctx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(
        sound.frequency * (1 + sound.pitchBend), 
        ctx.currentTime + sound.duration
      );
      oscillator.connect(gainNode);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + sound.duration);
    } else {
      const oscillator = ctx.createOscillator();
      oscillator.type = sound.type || 'sine';
      oscillator.frequency.setValueAtTime(sound.frequency, ctx.currentTime);
      oscillator.connect(gainNode);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + sound.duration);
    }
    
  } catch (error) {
    console.warn('Sound playback failed:', error);
  }
}

// ==========================================
// HIGH-QUALITY WAV SOUND FUNCTIONS
// ==========================================

/**
 * Play send message sound (swoosh)
 */
export function playSendSound(volume = 0.8) {
  return playWavSound('send', volume);
}

/**
 * Play receive message sound (pop)
 */
export function playReceiveSound(volume = 0.8) {
  return playWavSound('receive', volume);
}

/**
 * Play notification sound (chime)
 */
export function playNotificationChime(volume = 0.8) {
  return playWavSound('notification', volume);
}

/**
 * Play success sound (arpeggio)
 */
export function playSuccessSound(volume = 0.8) {
  return playWavSound('success', volume);
}

/**
 * Play error sound (beep)
 */
export function playErrorSound(volume = 0.6) {
  return playWavSound('error', volume);
}

/**
 * Play typing sound (click)
 */
export function playTypingSound(volume = 0.3) {
  return playWavSound('typing', volume, 100);
}

/**
 * Play ringtone sound
 */
export function playRingtoneSound(volume = 1.0) {
  return playWavSound('ringtone', volume);
}

// ==========================================
// LEGACY FUNCTIONS FOR COMPATIBILITY
// ==========================================

/**
 * Play notification sound based on settings
 */
export function playNotificationSound(settings) {
  if (!settings?.notifications?.enabled) return;
  
  // Use WAV file for better quality
  const volume = (settings.notifications.volume ?? 80) / 100;
  playNotificationChime(volume);
}

/**
 * Play message sound based on settings
 */
export function playMessageSound(settings, type = 'receive') {
  if (!settings?.notifications?.enabled) return;
  
  const volume = (settings.notifications.volume ?? 80) / 100;
  
  if (type === 'send') {
    playSendSound(volume);
  } else {
    playReceiveSound(volume);
  }
}

/**
 * Get available sound options
 */
export function getSoundOptions() {
  return [
    { id: 'default', name: 'Default' },
    { id: 'chime', name: 'Chime' },
    { id: 'bell', name: 'Bell' },
    { id: 'pop', name: 'Pop' },
    { id: 'ding', name: 'Ding' },
    { id: 'swoosh', name: 'Swoosh' },
    { id: 'bubble', name: 'Bubble' },
    { id: 'none', name: 'None (Silent)' },
  ];
}

/**
 * Preview a sound
 */
export function previewSound(soundId, volume = 80) {
  playSound(soundId, volume);
}

/**
 * Toggle sound enabled/disabled
 */
export function toggleSoundEnabled(enabled) {
  localStorage.setItem('soundEnabled', enabled ? 'true' : 'false');
}

/**
 * Check if sound is enabled
 */
export function isSoundEnabled() {
  return localStorage.getItem('soundEnabled') !== 'false';
}

/**
 * Preload all sounds
 */
export function preloadAllSounds() {
  Object.keys(SOUND_FILES).forEach(preloadWavSound);
}

// Preload sounds on module load
if (typeof window !== 'undefined') {
  // Delay preload to not block initial render
  setTimeout(preloadAllSounds, 1000);
}

export default {
  playSound,
  playSendSound,
  playReceiveSound,
  playNotificationChime,
  playSuccessSound,
  playErrorSound,
  playTypingSound,
  playRingtoneSound,
  playNotificationSound,
  playMessageSound,
  getSoundOptions,
  previewSound,
  toggleSoundEnabled,
  isSoundEnabled,
  preloadAllSounds,
};
