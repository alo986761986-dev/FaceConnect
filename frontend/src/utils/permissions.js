// Device permissions utility
export const PERMISSIONS = {
  CAMERA: 'camera',
  MICROPHONE: 'microphone',
  LOCATION: 'geolocation',
  CONTACTS: 'contacts',
  GALLERY: 'photos' // Note: No direct API, uses file input
};

// Check if permission API is supported
export const isPermissionSupported = () => {
  return 'permissions' in navigator;
};

// Request camera permission
export const requestCameraPermission = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    stream.getTracks().forEach(track => track.stop());
    return { granted: true, status: 'granted' };
  } catch (error) {
    if (error.name === 'NotAllowedError') {
      return { granted: false, status: 'denied', error: 'Camera access denied' };
    }
    return { granted: false, status: 'error', error: error.message };
  }
};

// Request microphone permission
export const requestMicrophonePermission = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach(track => track.stop());
    return { granted: true, status: 'granted' };
  } catch (error) {
    if (error.name === 'NotAllowedError') {
      return { granted: false, status: 'denied', error: 'Microphone access denied' };
    }
    return { granted: false, status: 'error', error: error.message };
  }
};

// Request location permission
export const requestLocationPermission = async () => {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({ granted: false, status: 'unsupported', error: 'Geolocation not supported' });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({ 
          granted: true, 
          status: 'granted',
          position: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          }
        });
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          resolve({ granted: false, status: 'denied', error: 'Location access denied' });
        } else {
          resolve({ granted: false, status: 'error', error: error.message });
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
};

// Request contacts permission (Contact Picker API)
export const requestContactsPermission = async () => {
  if (!('contacts' in navigator && 'ContactsManager' in window)) {
    return { granted: false, status: 'unsupported', error: 'Contacts API not supported' };
  }

  try {
    const props = ['name', 'tel', 'email'];
    const opts = { multiple: true };
    const contacts = await navigator.contacts.select(props, opts);
    return { granted: true, status: 'granted', contacts };
  } catch (error) {
    if (error.name === 'NotAllowedError') {
      return { granted: false, status: 'denied', error: 'Contacts access denied' };
    }
    return { granted: false, status: 'error', error: error.message };
  }
};

// Check permission status
export const checkPermission = async (permissionName) => {
  if (!isPermissionSupported()) {
    return 'unknown';
  }

  try {
    const result = await navigator.permissions.query({ name: permissionName });
    return result.state; // 'granted', 'denied', or 'prompt'
  } catch (error) {
    return 'unknown';
  }
};

// Check all permissions status
export const checkAllPermissions = async () => {
  const permissions = {
    camera: await checkPermission('camera'),
    microphone: await checkPermission('microphone'),
    geolocation: await checkPermission('geolocation'),
    contacts: 'contacts' in navigator ? 'prompt' : 'unsupported',
    gallery: 'prompt' // Always prompt as there's no direct API
  };
  
  return permissions;
};

// Request camera and microphone together for live streaming
export const requestLiveStreamPermissions = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: { 
        facingMode: 'user',
        width: { ideal: 1280 },
        height: { ideal: 720 }
      }, 
      audio: true 
    });
    
    return { 
      granted: true, 
      status: 'granted',
      stream,
      hasVideo: stream.getVideoTracks().length > 0,
      hasAudio: stream.getAudioTracks().length > 0
    };
  } catch (error) {
    // Stop any partial stream
    if (error.name === 'NotAllowedError') {
      return { 
        granted: false, 
        status: 'denied', 
        error: 'Camera and microphone access denied. Please allow access in your browser settings.',
        stream: null
      };
    }
    if (error.name === 'NotFoundError') {
      return { 
        granted: false, 
        status: 'not_found', 
        error: 'No camera or microphone found on this device.',
        stream: null
      };
    }
    if (error.name === 'NotReadableError') {
      return { 
        granted: false, 
        status: 'in_use', 
        error: 'Camera or microphone is already in use by another application.',
        stream: null
      };
    }
    return { 
      granted: false, 
      status: 'error', 
      error: error.message,
      stream: null
    };
  }
};

// Request all permissions
export const requestAllPermissions = async (onProgress) => {
  const results = {};
  
  onProgress?.('Requesting camera access...');
  results.camera = await requestCameraPermission();
  
  onProgress?.('Requesting microphone access...');
  results.microphone = await requestMicrophonePermission();
  
  onProgress?.('Requesting location access...');
  results.location = await requestLocationPermission();
  
  return results;
};

// Open gallery (file picker)
export const openGallery = (accept = 'image/*,video/*') => {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.multiple = true;
    
    input.onchange = (e) => {
      const files = Array.from(e.target.files || []);
      resolve({ granted: true, files });
    };
    
    input.oncancel = () => {
      resolve({ granted: false, files: [] });
    };
    
    input.click();
  });
};
