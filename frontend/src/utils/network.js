/**
 * Network and API utilities for improved stability and performance
 */

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Retry configuration
const DEFAULT_RETRY_OPTIONS = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
};

// Connection state
let isOnline = navigator.onLine;
let connectionQuality = 'good'; // 'good', 'slow', 'offline'
const pendingRequests = [];
const connectionListeners = new Set();

// Monitor connection status
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    isOnline = true;
    connectionQuality = 'good';
    notifyConnectionChange();
    processPendingRequests();
  });

  window.addEventListener('offline', () => {
    isOnline = false;
    connectionQuality = 'offline';
    notifyConnectionChange();
  });

  // Monitor connection quality
  if ('connection' in navigator) {
    const connection = navigator.connection;
    connection.addEventListener('change', updateConnectionQuality);
    updateConnectionQuality();
  }
}

function updateConnectionQuality() {
  if (!navigator.onLine) {
    connectionQuality = 'offline';
    return;
  }

  const connection = navigator.connection;
  if (connection) {
    const effectiveType = connection.effectiveType;
    if (effectiveType === '4g') {
      connectionQuality = 'good';
    } else if (effectiveType === '3g') {
      connectionQuality = 'slow';
    } else {
      connectionQuality = 'slow';
    }
  }
}

function notifyConnectionChange() {
  connectionListeners.forEach(listener => listener({ isOnline, connectionQuality }));
}

// Subscribe to connection changes
export function onConnectionChange(callback) {
  connectionListeners.add(callback);
  // Immediately notify of current state
  callback({ isOnline, connectionQuality });
  return () => connectionListeners.delete(callback);
}

// Get current connection status
export function getConnectionStatus() {
  return { isOnline, connectionQuality };
}

// Retry with exponential backoff
async function retryWithBackoff(fn, options = {}) {
  const { maxRetries, baseDelay, maxDelay, backoffMultiplier } = {
    ...DEFAULT_RETRY_OPTIONS,
    ...options,
  };

  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Don't retry on client errors (4xx) except 429 (rate limit)
      if (error.status >= 400 && error.status < 500 && error.status !== 429) {
        throw error;
      }

      if (attempt < maxRetries) {
        const delay = Math.min(baseDelay * Math.pow(backoffMultiplier, attempt), maxDelay);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}

// Enhanced fetch with retry and timeout
export async function fetchWithRetry(url, options = {}, retryOptions = {}) {
  const controller = new AbortController();
  const timeout = options.timeout || 30000;
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    return await retryWithBackoff(async () => {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      if (!response.ok) {
        const error = new Error(`HTTP ${response.status}`);
        error.status = response.status;
        error.response = response;
        throw error;
      }

      return response;
    }, retryOptions);
  } finally {
    clearTimeout(timeoutId);
  }
}

// API call wrapper with auth and error handling
export async function apiCall(endpoint, options = {}) {
  const token = localStorage.getItem('auth_token');
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Add token to URL if needed
  let url = `${API_URL}${endpoint}`;
  if (token && !url.includes('token=')) {
    const separator = url.includes('?') ? '&' : '?';
    url += `${separator}token=${token}`;
  }

  try {
    const response = await fetchWithRetry(url, {
      ...options,
      headers,
    });
    return await response.json();
  } catch (error) {
    // Queue request if offline
    if (!isOnline && options.queueIfOffline) {
      return queueRequest(endpoint, options);
    }
    throw error;
  }
}

// Queue requests for when back online
function queueRequest(endpoint, options) {
  return new Promise((resolve, reject) => {
    pendingRequests.push({ endpoint, options, resolve, reject });
  });
}

// Process pending requests when back online
async function processPendingRequests() {
  while (pendingRequests.length > 0) {
    const { endpoint, options, resolve, reject } = pendingRequests.shift();
    try {
      const result = await apiCall(endpoint, { ...options, queueIfOffline: false });
      resolve(result);
    } catch (error) {
      reject(error);
    }
  }
}

// Prefetch and cache data
const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function cachedApiCall(endpoint, options = {}) {
  const cacheKey = `${endpoint}:${JSON.stringify(options)}`;
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }

  const data = await apiCall(endpoint, options);
  cache.set(cacheKey, { data, timestamp: Date.now() });
  return data;
}

// Clear specific cache or all cache
export function clearCache(endpoint) {
  if (endpoint) {
    for (const key of cache.keys()) {
      if (key.startsWith(endpoint)) {
        cache.delete(key);
      }
    }
  } else {
    cache.clear();
  }
}

// Image preloader for better UX
export function preloadImages(urls) {
  return Promise.all(
    urls.map(url => new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = resolve;
      img.onerror = reject;
      img.src = url;
    }))
  );
}

// Debounce utility for search, etc.
export function debounce(fn, delay) {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

// Throttle utility for scroll handlers, etc.
export function throttle(fn, limit) {
  let inThrottle;
  return (...args) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

export default {
  apiCall,
  cachedApiCall,
  fetchWithRetry,
  onConnectionChange,
  getConnectionStatus,
  clearCache,
  preloadImages,
  debounce,
  throttle,
};
