import { useCallback, useRef, useEffect } from 'react';

// Sound file paths
const SOUNDS = {
  send: '/sounds/send.wav',
  receive: '/sounds/receive.wav',
  notification: '/sounds/notification.wav',
  success: '/sounds/success.wav',
  error: '/sounds/error.wav',
  typing: '/sounds/typing.wav',
  ringtone: '/sounds/ringtone.wav',
};

// Preloaded audio cache
const audioCache = new Map();

// Check if we're in a mobile app (Capacitor)
const isCapacitor = typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.();

// Check if we're in Electron
const isElectron = typeof window !== 'undefined' && window.electronAPI?.isElectron;

/**
 * Preload a sound file
 */
const preloadSound = (soundName) => {
  if (audioCache.has(soundName)) return audioCache.get(soundName);
  
  const soundPath = SOUNDS[soundName];
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
};

/**
 * Play a sound with optional volume
 */
const playSound = async (soundName, volume = 1.0) => {
  // Check if sound is enabled in settings
  const soundEnabled = localStorage.getItem('soundEnabled') !== 'false';
  if (!soundEnabled) return;
  
  const soundPath = SOUNDS[soundName];
  if (!soundPath) {
    console.warn(`Unknown sound: ${soundName}`);
    return;
  }
  
  try {
    // Use cached audio or create new
    let audio = audioCache.get(soundName);
    
    if (!audio) {
      audio = new Audio(soundPath);
      audioCache.set(soundName, audio);
    }
    
    // Clone for overlapping sounds
    const playableAudio = audio.cloneNode();
    playableAudio.volume = Math.min(1, Math.max(0, volume));
    
    // Handle mobile audio context
    if (isCapacitor) {
      // Ensure audio context is resumed on mobile
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        const ctx = new AudioContext();
        if (ctx.state === 'suspended') {
          await ctx.resume();
        }
      }
    }
    
    await playableAudio.play();
    
    // Cleanup after playing
    playableAudio.onended = () => {
      playableAudio.remove();
    };
    
    return playableAudio;
  } catch (e) {
    // Silently fail - audio might be blocked by browser
    console.debug(`Sound play failed: ${soundName}`, e.message);
  }
};

/**
 * Sound utility hook
 */
export function useSound() {
  const lastPlayedRef = useRef({});
  
  // Preload common sounds on mount
  useEffect(() => {
    Object.keys(SOUNDS).forEach(preloadSound);
  }, []);
  
  /**
   * Play a sound with debounce to prevent spam
   */
  const play = useCallback((soundName, options = {}) => {
    const { volume = 1.0, debounce = 50 } = options;
    
    const now = Date.now();
    const lastPlayed = lastPlayedRef.current[soundName] || 0;
    
    // Debounce rapid plays
    if (now - lastPlayed < debounce) {
      return;
    }
    
    lastPlayedRef.current[soundName] = now;
    playSound(soundName, volume);
  }, []);
  
  /**
   * Convenience methods
   */
  const playSend = useCallback((volume) => play('send', { volume }), [play]);
  const playReceive = useCallback((volume) => play('receive', { volume }), [play]);
  const playNotification = useCallback((volume) => play('notification', { volume }), [play]);
  const playSuccess = useCallback((volume) => play('success', { volume }), [play]);
  const playError = useCallback((volume) => play('error', { volume }), [play]);
  const playTyping = useCallback((volume) => play('typing', { volume: volume || 0.3, debounce: 100 }), [play]);
  const playRingtone = useCallback((volume) => play('ringtone', { volume }), [play]);
  
  /**
   * Toggle sound enabled/disabled
   */
  const toggleSound = useCallback((enabled) => {
    localStorage.setItem('soundEnabled', enabled ? 'true' : 'false');
  }, []);
  
  /**
   * Check if sound is enabled
   */
  const isSoundEnabled = useCallback(() => {
    return localStorage.getItem('soundEnabled') !== 'false';
  }, []);
  
  return {
    play,
    playSend,
    playReceive,
    playNotification,
    playSuccess,
    playError,
    playTyping,
    playRingtone,
    toggleSound,
    isSoundEnabled,
  };
}

/**
 * Standalone play function for use outside React components
 */
export const SoundManager = {
  play: playSound,
  preload: preloadSound,
  
  send: (volume) => playSound('send', volume),
  receive: (volume) => playSound('receive', volume),
  notification: (volume) => playSound('notification', volume),
  success: (volume) => playSound('success', volume),
  error: (volume) => playSound('error', volume),
  typing: (volume) => playSound('typing', volume || 0.3),
  ringtone: (volume) => playSound('ringtone', volume),
  
  toggleEnabled: (enabled) => {
    localStorage.setItem('soundEnabled', enabled ? 'true' : 'false');
  },
  
  isEnabled: () => localStorage.getItem('soundEnabled') !== 'false',
  
  // Preload all sounds
  preloadAll: () => Object.keys(SOUNDS).forEach(preloadSound),
};

export default useSound;
