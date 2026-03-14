// Biometric Authentication using WebAuthn API

const APP_NAME = 'FaceConnect';
const RP_ID = window.location.hostname;

// Check if WebAuthn is supported
export const isBiometricSupported = () => {
  return window.PublicKeyCredential !== undefined &&
         typeof window.PublicKeyCredential === 'function';
};

// Check if platform authenticator (fingerprint/FaceID) is available
export const isPlatformAuthenticatorAvailable = async () => {
  if (!isBiometricSupported()) return false;
  
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch (err) {
    console.error('Platform authenticator check failed:', err);
    return false;
  }
};

// Generate a random challenge
const generateChallenge = () => {
  const array = new Uint8Array(32);
  window.crypto.getRandomValues(array);
  return array;
};

// Convert ArrayBuffer to base64
const bufferToBase64 = (buffer) => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

// Convert base64 to ArrayBuffer
const base64ToBuffer = (base64) => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
};

// Generate user ID
const getUserId = () => {
  let userId = localStorage.getItem('biometric_user_id');
  if (!userId) {
    userId = bufferToBase64(generateChallenge());
    localStorage.setItem('biometric_user_id', userId);
  }
  return base64ToBuffer(userId);
};

// Register biometric credential
export const registerBiometric = async () => {
  if (!await isPlatformAuthenticatorAvailable()) {
    throw new Error('Biometric authentication not available on this device');
  }

  const challenge = generateChallenge();
  const userId = getUserId();

  const publicKeyCredentialCreationOptions = {
    challenge,
    rp: {
      name: APP_NAME,
      id: RP_ID
    },
    user: {
      id: userId,
      name: 'faceconnect-user',
      displayName: 'FaceConnect User'
    },
    pubKeyCredParams: [
      { alg: -7, type: 'public-key' },   // ES256
      { alg: -257, type: 'public-key' }  // RS256
    ],
    authenticatorSelection: {
      authenticatorAttachment: 'platform',
      userVerification: 'required',
      residentKey: 'preferred'
    },
    timeout: 60000,
    attestation: 'none'
  };

  try {
    const credential = await navigator.credentials.create({
      publicKey: publicKeyCredentialCreationOptions
    });

    if (credential) {
      // Store credential ID for future authentication
      const credentialId = bufferToBase64(credential.rawId);
      localStorage.setItem('biometric_credential_id', credentialId);
      localStorage.setItem('biometric_enabled', 'true');
      
      return {
        success: true,
        credentialId
      };
    }
    
    return { success: false, error: 'No credential returned' };
  } catch (err) {
    console.error('Biometric registration failed:', err);
    return { success: false, error: err.message };
  }
};

// Authenticate with biometric
export const authenticateWithBiometric = async () => {
  const credentialId = localStorage.getItem('biometric_credential_id');
  
  if (!credentialId) {
    throw new Error('No biometric credential registered');
  }

  const challenge = generateChallenge();

  const publicKeyCredentialRequestOptions = {
    challenge,
    allowCredentials: [{
      id: base64ToBuffer(credentialId),
      type: 'public-key',
      transports: ['internal']
    }],
    userVerification: 'required',
    timeout: 60000,
    rpId: RP_ID
  };

  try {
    const assertion = await navigator.credentials.get({
      publicKey: publicKeyCredentialRequestOptions
    });

    if (assertion) {
      // Store last authentication time
      localStorage.setItem('biometric_last_auth', Date.now().toString());
      
      return { success: true };
    }
    
    return { success: false, error: 'Authentication failed' };
  } catch (err) {
    console.error('Biometric authentication failed:', err);
    return { success: false, error: err.message };
  }
};

// Check if biometric is enabled
export const isBiometricEnabled = () => {
  return localStorage.getItem('biometric_enabled') === 'true';
};

// Disable biometric
export const disableBiometric = () => {
  localStorage.removeItem('biometric_enabled');
  localStorage.removeItem('biometric_credential_id');
  localStorage.removeItem('biometric_last_auth');
};

// Check if authentication is required (based on timeout)
export const isAuthenticationRequired = (timeoutMinutes = 5) => {
  if (!isBiometricEnabled()) return false;
  
  const lastAuth = localStorage.getItem('biometric_last_auth');
  if (!lastAuth) return true;
  
  const elapsed = Date.now() - parseInt(lastAuth, 10);
  const timeoutMs = timeoutMinutes * 60 * 1000;
  
  return elapsed > timeoutMs;
};

// Set authentication timeout
export const setAuthTimeout = (minutes) => {
  localStorage.setItem('biometric_timeout', minutes.toString());
};

// Get authentication timeout
export const getAuthTimeout = () => {
  return parseInt(localStorage.getItem('biometric_timeout') || '5', 10);
};

// Update last auth time (for session refresh)
export const refreshAuthSession = () => {
  localStorage.setItem('biometric_last_auth', Date.now().toString());
};
