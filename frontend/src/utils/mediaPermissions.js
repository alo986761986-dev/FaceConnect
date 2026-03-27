/**
 * Media Permissions Utility for Android/Capacitor
 * Handles camera and microphone permissions for WebRTC calls
 */
import { Capacitor } from '@capacitor/core';
import { toast } from 'sonner';

// Check if running on native platform
export const isNative = () => Capacitor.isNativePlatform();
export const getPlatform = () => Capacitor.getPlatform();

/**
 * Request camera and microphone permissions for video calls
 * Uses Capacitor on native, falls back to web API
 */
export const requestVideoCallPermissions = async () => {
  console.log('[MediaPermissions] Requesting video call permissions...');
  console.log('[MediaPermissions] Platform:', getPlatform(), 'isNative:', isNative());
  
  if (isNative() && getPlatform() === 'android') {
    return await requestAndroidMediaPermissions(true, true);
  }
  
  // Web/iOS - use standard getUserMedia
  return await requestWebMediaPermissions(true, true);
};

/**
 * Request microphone permissions for voice calls
 * Uses Capacitor on native, falls back to web API
 */
export const requestVoiceCallPermissions = async () => {
  console.log('[MediaPermissions] Requesting voice call permissions...');
  console.log('[MediaPermissions] Platform:', getPlatform(), 'isNative:', isNative());
  
  if (isNative() && getPlatform() === 'android') {
    return await requestAndroidMediaPermissions(false, true);
  }
  
  // Web/iOS - use standard getUserMedia
  return await requestWebMediaPermissions(false, true);
};

/**
 * Request Android permissions using Capacitor
 */
const requestAndroidMediaPermissions = async (needCamera, needMicrophone) => {
  console.log('[MediaPermissions] Requesting Android permissions...', { needCamera, needMicrophone });
  
  try {
    // First, try to request permissions via Capacitor Camera plugin (handles both camera and mic on Android)
    if (needCamera) {
      try {
        const { Camera } = await import('@capacitor/camera');
        const cameraStatus = await Camera.checkPermissions();
        console.log('[MediaPermissions] Camera permission status:', cameraStatus);
        
        if (cameraStatus.camera !== 'granted') {
          const result = await Camera.requestPermissions({ permissions: ['camera'] });
          console.log('[MediaPermissions] Camera permission result:', result);
          
          if (result.camera === 'denied') {
            toast.error('Camera permission denied. Please enable in Settings.');
            return { granted: false, error: 'Camera permission denied' };
          }
        }
      } catch (e) {
        console.log('[MediaPermissions] Capacitor Camera not available:', e.message);
      }
    }
    
    // For microphone, we need to use getUserMedia directly as Capacitor doesn't have a dedicated mic permission plugin
    // Android WebView will prompt for permission when getUserMedia is called
    const constraints = {
      audio: needMicrophone ? {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      } : false,
      video: needCamera ? {
        facingMode: 'user',
        width: { ideal: 1280, max: 1920 },
        height: { ideal: 720, max: 1080 }
      } : false
    };
    
    console.log('[MediaPermissions] Requesting getUserMedia with constraints:', constraints);
    
    // This will trigger Android permission dialog
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    
    console.log('[MediaPermissions] Got stream:', {
      audioTracks: stream.getAudioTracks().length,
      videoTracks: stream.getVideoTracks().length
    });
    
    return { granted: true, stream };
    
  } catch (error) {
    console.error('[MediaPermissions] Android permission error:', error);
    return handleMediaError(error, needCamera);
  }
};

/**
 * Request Web permissions using standard getUserMedia API
 */
const requestWebMediaPermissions = async (needCamera, needMicrophone) => {
  console.log('[MediaPermissions] Requesting web permissions...', { needCamera, needMicrophone });
  
  try {
    // Check permission status first (if supported)
    if ('permissions' in navigator) {
      try {
        if (needMicrophone) {
          const micStatus = await navigator.permissions.query({ name: 'microphone' });
          console.log('[MediaPermissions] Microphone permission:', micStatus.state);
          if (micStatus.state === 'denied') {
            toast.error('Microphone blocked. Please enable in browser settings.');
            return { granted: false, error: 'Microphone permission denied' };
          }
        }
        
        if (needCamera) {
          const camStatus = await navigator.permissions.query({ name: 'camera' });
          console.log('[MediaPermissions] Camera permission:', camStatus.state);
          if (camStatus.state === 'denied') {
            toast.error('Camera blocked. Please enable in browser settings.');
            return { granted: false, error: 'Camera permission denied' };
          }
        }
      } catch (e) {
        // Permissions API may not support these queries
        console.log('[MediaPermissions] Permissions query not supported:', e.message);
      }
    }
    
    const constraints = {
      audio: needMicrophone ? {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      } : false,
      video: needCamera ? {
        facingMode: 'user',
        width: { ideal: 1280, max: 1920 },
        height: { ideal: 720, max: 1080 }
      } : false
    };
    
    console.log('[MediaPermissions] Requesting getUserMedia...');
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    
    console.log('[MediaPermissions] Got stream:', {
      audioTracks: stream.getAudioTracks().length,
      videoTracks: stream.getVideoTracks().length
    });
    
    return { granted: true, stream };
    
  } catch (error) {
    console.error('[MediaPermissions] Web permission error:', error);
    return handleMediaError(error, needCamera);
  }
};

/**
 * Handle media errors and return appropriate messages
 */
const handleMediaError = (error, isVideoCall) => {
  let errorMessage = isVideoCall 
    ? 'Failed to access camera and microphone' 
    : 'Failed to access microphone';
  
  switch (error.name) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
      errorMessage = isVideoCall
        ? 'Camera/microphone permission denied. Please allow access in your device settings.'
        : 'Microphone permission denied. Please allow access in your device settings.';
      break;
    case 'NotFoundError':
    case 'DevicesNotFoundError':
      errorMessage = isVideoCall
        ? 'No camera or microphone found on this device.'
        : 'No microphone found on this device.';
      break;
    case 'NotReadableError':
    case 'TrackStartError':
      errorMessage = isVideoCall
        ? 'Camera or microphone is already in use by another app.'
        : 'Microphone is already in use by another app.';
      break;
    case 'OverconstrainedError':
      errorMessage = 'Could not satisfy media constraints. Try again.';
      break;
    case 'AbortError':
      errorMessage = 'Media access was aborted. Please try again.';
      break;
    case 'SecurityError':
      errorMessage = 'Media access blocked due to security settings.';
      break;
    default:
      errorMessage = `Media error: ${error.message || error.name}`;
  }
  
  toast.error(errorMessage);
  return { granted: false, error: errorMessage };
};

/**
 * Stop all tracks in a media stream
 */
export const stopMediaStream = (stream) => {
  if (stream) {
    stream.getTracks().forEach(track => {
      track.stop();
      console.log('[MediaPermissions] Stopped track:', track.kind);
    });
  }
};

/**
 * Switch camera (front/back) on mobile
 */
export const switchCamera = async (currentStream, currentFacingMode) => {
  console.log('[MediaPermissions] Switching camera from:', currentFacingMode);
  
  const newFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';
  
  try {
    // Stop current video track
    if (currentStream) {
      const videoTrack = currentStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.stop();
      }
    }
    
    // Get new stream with different camera
    const newStream = await navigator.mediaDevices.getUserMedia({
      video: { 
        facingMode: newFacingMode,
        width: { ideal: 1280 },
        height: { ideal: 720 }
      }
    });
    
    console.log('[MediaPermissions] Switched to:', newFacingMode);
    toast.info(newFacingMode === 'user' ? 'Front camera' : 'Rear camera');
    
    return { 
      stream: newStream, 
      facingMode: newFacingMode,
      videoTrack: newStream.getVideoTracks()[0]
    };
  } catch (error) {
    console.error('[MediaPermissions] Failed to switch camera:', error);
    toast.error('Failed to switch camera');
    return null;
  }
};

export default {
  isNative,
  getPlatform,
  requestVideoCallPermissions,
  requestVoiceCallPermissions,
  stopMediaStream,
  switchCamera
};
