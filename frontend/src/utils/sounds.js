// Sound utilities for notifications and messages
// Uses Web Audio API for reliable playback on mobile

// Sound types with base64 encoded audio or URL references
const SOUND_LIBRARY = {
  default: {
    name: "Default",
    // Using a simple beep tone generated programmatically
    frequency: 880,
    duration: 0.15,
    type: "sine"
  },
  chime: {
    name: "Chime",
    frequency: 1047, // C6
    duration: 0.2,
    type: "sine",
    harmonics: [1, 0.5, 0.25] // Creates a chime-like sound
  },
  bell: {
    name: "Bell",
    frequency: 659, // E5
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
    frequency: 1319, // E6
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
    frequency: 523, // C5
    duration: 0.12,
    type: "sine",
    pitchBend: 0.3 // Bend up slightly
  },
  none: {
    name: "None (Silent)",
    silent: true
  }
};

// Audio context singleton
let audioContext = null;

function getAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  // Resume if suspended (required for mobile)
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
  return audioContext;
}

/**
 * Play a notification sound
 * @param {string} soundId - The sound ID from SOUND_LIBRARY
 * @param {number} volume - Volume from 0 to 100
 * @returns {Promise<void>}
 */
export async function playSound(soundId, volume = 80) {
  const sound = SOUND_LIBRARY[soundId] || SOUND_LIBRARY.default;
  
  if (sound.silent || volume === 0) return;
  
  try {
    const ctx = getAudioContext();
    const gainNode = ctx.createGain();
    const normalizedVolume = Math.min(1, Math.max(0, volume / 100)) * 0.5; // Cap at 50% to avoid distortion
    
    gainNode.connect(ctx.destination);
    gainNode.gain.setValueAtTime(normalizedVolume, ctx.currentTime);
    // Fade out for smoother sound
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + sound.duration);
    
    if (sound.sweep) {
      // Frequency sweep (for swoosh)
      const oscillator = ctx.createOscillator();
      oscillator.type = sound.type || 'sine';
      oscillator.frequency.setValueAtTime(sound.frequencyStart, ctx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(sound.frequencyEnd, ctx.currentTime + sound.duration);
      oscillator.connect(gainNode);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + sound.duration);
    } else if (sound.harmonics) {
      // Multiple oscillators for harmonics (chime)
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
      // Pitch bend (for bubble)
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
      // Simple tone
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

/**
 * Play notification sound based on settings
 * @param {object} settings - The app settings object
 */
export function playNotificationSound(settings) {
  if (!settings?.notifications?.enabled) return;
  const soundId = settings.notifications.sound || 'default';
  const volume = settings.notifications.volume ?? 80;
  playSound(soundId, volume);
}

/**
 * Play message sound based on settings
 * @param {object} settings - The app settings object
 */
export function playMessageSound(settings) {
  if (!settings?.notifications?.enabled) return;
  const soundId = settings.notifications.messageSound || 'default';
  const volume = settings.notifications.volume ?? 80;
  playSound(soundId, volume);
}

/**
 * Get available sound options
 * @returns {Array} Array of {id, name} objects
 */
export function getSoundOptions() {
  return Object.entries(SOUND_LIBRARY).map(([id, sound]) => ({
    id,
    name: sound.name
  }));
}

/**
 * Preview a sound at current volume setting
 * @param {string} soundId - The sound ID to preview
 * @param {number} volume - Volume from 0 to 100
 */
export function previewSound(soundId, volume = 80) {
  playSound(soundId, volume);
}

export default {
  playSound,
  playNotificationSound,
  playMessageSound,
  getSoundOptions,
  previewSound
};
