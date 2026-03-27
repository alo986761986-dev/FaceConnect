/**
 * Call Audio Service for FaceConnect
 * Handles ringtones, dialing tones, and call sounds
 */
import { Capacitor } from '@capacitor/core';

// Check if running on native platform
const isNative = () => Capacitor.isNativePlatform();

// Audio instances
let ringtoneAudio = null;
let dialingAudio = null;
let endCallAudio = null;
let busyAudio = null;

// Sound file paths
const SOUNDS = {
  ringtone: '/sounds/ringtone.wav',      // For incoming calls
  dialing: '/sounds/notification.wav',   // For outgoing calls (dialing tone)
  endCall: '/sounds/error.wav',          // When call ends
  busy: '/sounds/error.wav',             // When recipient is busy
  connected: '/sounds/success.wav',      // When call connects
  message: '/sounds/receive.wav',        // New message
};

/**
 * Create and configure an audio element
 */
const createAudio = (src, loop = false, volume = 0.7) => {
  const audio = new Audio(src);
  audio.loop = loop;
  audio.volume = volume;
  audio.preload = 'auto';
  
  // Handle errors gracefully
  audio.onerror = (e) => {
    console.log('[CallAudio] Audio error:', src, e);
  };
  
  return audio;
};

/**
 * Play ringtone for incoming calls
 * Loops continuously until stopped
 */
export const playRingtone = async () => {
  console.log('[CallAudio] Playing ringtone...');
  
  // Stop any existing ringtone
  stopRingtone();
  
  try {
    ringtoneAudio = createAudio(SOUNDS.ringtone, true, 0.8);
    
    // On mobile, we may need user interaction first
    const playPromise = ringtoneAudio.play();
    
    if (playPromise !== undefined) {
      await playPromise.catch(error => {
        console.log('[CallAudio] Ringtone autoplay blocked:', error.message);
        // On mobile, audio may be blocked until user interaction
        // The audio will play when user taps answer/reject
      });
    }
    
    console.log('[CallAudio] Ringtone playing');
    return true;
  } catch (error) {
    console.error('[CallAudio] Failed to play ringtone:', error);
    return false;
  }
};

/**
 * Stop ringtone
 */
export const stopRingtone = () => {
  if (ringtoneAudio) {
    ringtoneAudio.pause();
    ringtoneAudio.currentTime = 0;
    ringtoneAudio = null;
    console.log('[CallAudio] Ringtone stopped');
  }
};

/**
 * Play dialing/calling tone for outgoing calls
 * Plays a repeating tone while waiting for answer
 */
export const playDialingTone = async () => {
  console.log('[CallAudio] Playing dialing tone...');
  
  stopDialingTone();
  
  try {
    // Create a repeating dialing tone effect
    dialingAudio = createAudio(SOUNDS.dialing, false, 0.5);
    
    // Play and set up repeat
    const playDialing = async () => {
      if (dialingAudio) {
        dialingAudio.currentTime = 0;
        try {
          await dialingAudio.play();
        } catch (e) {
          console.log('[CallAudio] Dialing tone play error:', e.message);
        }
      }
    };
    
    // Repeat every 3 seconds
    await playDialing();
    dialingAudio._intervalId = setInterval(playDialing, 3000);
    
    console.log('[CallAudio] Dialing tone playing');
    return true;
  } catch (error) {
    console.error('[CallAudio] Failed to play dialing tone:', error);
    return false;
  }
};

/**
 * Stop dialing tone
 */
export const stopDialingTone = () => {
  if (dialingAudio) {
    if (dialingAudio._intervalId) {
      clearInterval(dialingAudio._intervalId);
    }
    dialingAudio.pause();
    dialingAudio.currentTime = 0;
    dialingAudio = null;
    console.log('[CallAudio] Dialing tone stopped');
  }
};

/**
 * Play end call sound
 */
export const playEndCallSound = async () => {
  console.log('[CallAudio] Playing end call sound...');
  
  try {
    endCallAudio = createAudio(SOUNDS.endCall, false, 0.6);
    await endCallAudio.play().catch(() => {});
    
    // Clean up after playing
    endCallAudio.onended = () => {
      endCallAudio = null;
    };
    
    return true;
  } catch (error) {
    console.error('[CallAudio] Failed to play end call sound:', error);
    return false;
  }
};

/**
 * Play busy tone
 */
export const playBusyTone = async () => {
  console.log('[CallAudio] Playing busy tone...');
  
  try {
    busyAudio = createAudio(SOUNDS.busy, false, 0.6);
    
    // Play 3 short beeps
    let playCount = 0;
    const playBeep = async () => {
      if (playCount < 3 && busyAudio) {
        busyAudio.currentTime = 0;
        await busyAudio.play().catch(() => {});
        playCount++;
        setTimeout(playBeep, 500);
      } else {
        busyAudio = null;
      }
    };
    
    await playBeep();
    return true;
  } catch (error) {
    console.error('[CallAudio] Failed to play busy tone:', error);
    return false;
  }
};

/**
 * Play connected sound
 */
export const playConnectedSound = async () => {
  console.log('[CallAudio] Playing connected sound...');
  
  try {
    const audio = createAudio(SOUNDS.connected, false, 0.5);
    await audio.play().catch(() => {});
    return true;
  } catch (error) {
    console.error('[CallAudio] Failed to play connected sound:', error);
    return false;
  }
};

/**
 * Stop all call audio
 */
export const stopAllCallAudio = () => {
  console.log('[CallAudio] Stopping all call audio...');
  stopRingtone();
  stopDialingTone();
  
  if (endCallAudio) {
    endCallAudio.pause();
    endCallAudio = null;
  }
  
  if (busyAudio) {
    busyAudio.pause();
    busyAudio = null;
  }
};

/**
 * Preload all audio files for faster playback
 */
export const preloadCallSounds = () => {
  console.log('[CallAudio] Preloading sounds...');
  
  Object.values(SOUNDS).forEach(src => {
    const audio = new Audio();
    audio.preload = 'auto';
    audio.src = src;
  });
};

// Export for use in components
export default {
  playRingtone,
  stopRingtone,
  playDialingTone,
  stopDialingTone,
  playEndCallSound,
  playBusyTone,
  playConnectedSound,
  stopAllCallAudio,
  preloadCallSounds,
};
