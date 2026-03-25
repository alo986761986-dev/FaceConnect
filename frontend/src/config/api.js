// Centralized API configuration
// This ensures all parts of the app use the correct backend URL

const PRODUCTION_URL = 'https://profile-connector-3.emergent.host';

export const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || PRODUCTION_URL;
export const API_URL = API_BASE_URL;
export const API = `${API_BASE_URL}/api`;

// WebSocket URL (convert https to wss)
export const WS_URL = API_BASE_URL.replace('https://', 'wss://').replace('http://', 'ws://');

// Log configuration for debugging
if (typeof window !== 'undefined') {
  console.log('[API Config] Backend URL:', API_BASE_URL);
}

export default {
  API_BASE_URL,
  API_URL,
  API,
  WS_URL,
  PRODUCTION_URL
};
