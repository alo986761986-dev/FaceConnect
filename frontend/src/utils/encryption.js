// Encrypted Storage using Web Crypto API (AES-GCM)

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12;
const SALT_LENGTH = 16;
const ITERATIONS = 100000;
const KEY_STORAGE_NAME = 'faceconnect_encryption_key';
const ENCRYPTED_PREFIX = 'enc:';

// Convert ArrayBuffer to Base64
const bufferToBase64 = (buffer) => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

// Convert Base64 to ArrayBuffer
const base64ToBuffer = (base64) => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
};

// Generate random bytes
const getRandomBytes = (length) => {
  return crypto.getRandomValues(new Uint8Array(length));
};

// Derive key from password using PBKDF2
const deriveKey = async (password, salt) => {
  const encoder = new TextEncoder();
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: ITERATIONS,
      hash: 'SHA-256'
    },
    passwordKey,
    { name: ALGORITHM, length: KEY_LENGTH },
    true,
    ['encrypt', 'decrypt']
  );
};

// Generate a new encryption key
const generateKey = async () => {
  return crypto.subtle.generateKey(
    { name: ALGORITHM, length: KEY_LENGTH },
    true,
    ['encrypt', 'decrypt']
  );
};

// Export key to storable format
const exportKey = async (key) => {
  const exported = await crypto.subtle.exportKey('raw', key);
  return bufferToBase64(exported);
};

// Import key from stored format
const importKey = async (keyData) => {
  const keyBuffer = base64ToBuffer(keyData);
  return crypto.subtle.importKey(
    'raw',
    keyBuffer,
    { name: ALGORITHM, length: KEY_LENGTH },
    true,
    ['encrypt', 'decrypt']
  );
};

// Get or create the encryption key
let cachedKey = null;

const getEncryptionKey = async () => {
  if (cachedKey) return cachedKey;

  const storedKey = localStorage.getItem(KEY_STORAGE_NAME);
  
  if (storedKey) {
    try {
      cachedKey = await importKey(storedKey);
      return cachedKey;
    } catch (err) {
      console.error('Failed to import stored key:', err);
    }
  }

  // Generate new key
  cachedKey = await generateKey();
  const exportedKey = await exportKey(cachedKey);
  localStorage.setItem(KEY_STORAGE_NAME, exportedKey);
  
  return cachedKey;
};

// Encrypt data
export const encrypt = async (plaintext) => {
  if (!plaintext) return null;
  
  try {
    const key = await getEncryptionKey();
    const encoder = new TextEncoder();
    const iv = getRandomBytes(IV_LENGTH);
    
    const encrypted = await crypto.subtle.encrypt(
      { name: ALGORITHM, iv },
      key,
      encoder.encode(JSON.stringify(plaintext))
    );

    // Combine IV + encrypted data
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);

    return ENCRYPTED_PREFIX + bufferToBase64(combined.buffer);
  } catch (err) {
    console.error('Encryption failed:', err);
    throw new Error('Failed to encrypt data');
  }
};

// Decrypt data
export const decrypt = async (ciphertext) => {
  if (!ciphertext) return null;
  
  // Check if data is encrypted
  if (!ciphertext.startsWith(ENCRYPTED_PREFIX)) {
    // Return as-is if not encrypted (for backwards compatibility)
    try {
      return JSON.parse(ciphertext);
    } catch {
      return ciphertext;
    }
  }

  try {
    const key = await getEncryptionKey();
    const data = base64ToBuffer(ciphertext.slice(ENCRYPTED_PREFIX.length));
    
    const iv = data.slice(0, IV_LENGTH);
    const encrypted = data.slice(IV_LENGTH);

    const decrypted = await crypto.subtle.decrypt(
      { name: ALGORITHM, iv: new Uint8Array(iv) },
      key,
      encrypted
    );

    const decoder = new TextDecoder();
    return JSON.parse(decoder.decode(decrypted));
  } catch (err) {
    console.error('Decryption failed:', err);
    throw new Error('Failed to decrypt data');
  }
};

// Check if Web Crypto API is available
export const isEncryptionSupported = () => {
  return typeof crypto !== 'undefined' && 
         typeof crypto.subtle !== 'undefined' &&
         typeof crypto.subtle.encrypt === 'function';
};

// Secure Storage Class
class SecureStorage {
  constructor(namespace = 'secure') {
    this.namespace = namespace;
    this.cache = new Map();
  }

  _getKey(key) {
    return `${this.namespace}:${key}`;
  }

  async setItem(key, value) {
    const storageKey = this._getKey(key);
    
    if (isEncryptionSupported()) {
      const encrypted = await encrypt(value);
      localStorage.setItem(storageKey, encrypted);
    } else {
      // Fallback to plain storage with warning
      console.warn('Encryption not supported, storing data unencrypted');
      localStorage.setItem(storageKey, JSON.stringify(value));
    }
    
    this.cache.set(key, value);
  }

  async getItem(key) {
    // Check cache first
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }

    const storageKey = this._getKey(key);
    const stored = localStorage.getItem(storageKey);
    
    if (!stored) return null;

    try {
      let value;
      if (isEncryptionSupported() && stored.startsWith(ENCRYPTED_PREFIX)) {
        value = await decrypt(stored);
      } else {
        value = JSON.parse(stored);
      }
      
      this.cache.set(key, value);
      return value;
    } catch (err) {
      console.error('Failed to retrieve item:', err);
      return null;
    }
  }

  async removeItem(key) {
    const storageKey = this._getKey(key);
    localStorage.removeItem(storageKey);
    this.cache.delete(key);
  }

  async clear() {
    const prefix = `${this.namespace}:`;
    const keysToRemove = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
    this.cache.clear();
  }

  async getAllKeys() {
    const prefix = `${this.namespace}:`;
    const keys = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        keys.push(key.slice(prefix.length));
      }
    }
    
    return keys;
  }

  async getAll() {
    const keys = await this.getAllKeys();
    const items = {};
    
    for (const key of keys) {
      items[key] = await this.getItem(key);
    }
    
    return items;
  }
}

// Create storage instances for different data types
export const secureUserStorage = new SecureStorage('user');
export const secureNotesStorage = new SecureStorage('notes');
export const secureSettingsStorage = new SecureStorage('settings');

// Password-protected vault for extra sensitive data
export class PasswordVault {
  constructor() {
    this.key = null;
    this.isUnlocked = false;
  }

  async unlock(password) {
    try {
      const storedSalt = localStorage.getItem('vault_salt');
      let salt;
      
      if (storedSalt) {
        salt = new Uint8Array(base64ToBuffer(storedSalt));
      } else {
        salt = getRandomBytes(SALT_LENGTH);
        localStorage.setItem('vault_salt', bufferToBase64(salt.buffer));
      }

      this.key = await deriveKey(password, salt);
      
      // Verify key by trying to decrypt a test value
      const testValue = localStorage.getItem('vault_test');
      if (testValue) {
        try {
          await this._decrypt(testValue);
        } catch {
          this.key = null;
          throw new Error('Invalid password');
        }
      } else {
        // First time setup - store test value
        const encrypted = await this._encrypt('vault_initialized');
        localStorage.setItem('vault_test', encrypted);
      }

      this.isUnlocked = true;
      return true;
    } catch (err) {
      this.isUnlocked = false;
      throw err;
    }
  }

  lock() {
    this.key = null;
    this.isUnlocked = false;
  }

  async _encrypt(data) {
    if (!this.key) throw new Error('Vault is locked');
    
    const encoder = new TextEncoder();
    const iv = getRandomBytes(IV_LENGTH);
    
    const encrypted = await crypto.subtle.encrypt(
      { name: ALGORITHM, iv },
      this.key,
      encoder.encode(JSON.stringify(data))
    );

    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);

    return bufferToBase64(combined.buffer);
  }

  async _decrypt(ciphertext) {
    if (!this.key) throw new Error('Vault is locked');
    
    const data = base64ToBuffer(ciphertext);
    const iv = data.slice(0, IV_LENGTH);
    const encrypted = data.slice(IV_LENGTH);

    const decrypted = await crypto.subtle.decrypt(
      { name: ALGORITHM, iv: new Uint8Array(iv) },
      this.key,
      encrypted
    );

    const decoder = new TextDecoder();
    return JSON.parse(decoder.decode(decrypted));
  }

  async store(key, value) {
    if (!this.isUnlocked) throw new Error('Vault is locked');
    
    const encrypted = await this._encrypt(value);
    localStorage.setItem(`vault:${key}`, encrypted);
  }

  async retrieve(key) {
    if (!this.isUnlocked) throw new Error('Vault is locked');
    
    const stored = localStorage.getItem(`vault:${key}`);
    if (!stored) return null;
    
    return this._decrypt(stored);
  }

  async remove(key) {
    localStorage.removeItem(`vault:${key}`);
  }

  changePassword = async (oldPassword, newPassword) => {
    // Verify old password
    const storedSalt = localStorage.getItem('vault_salt');
    if (!storedSalt) throw new Error('Vault not initialized');
    
    const salt = new Uint8Array(base64ToBuffer(storedSalt));
    const oldKey = await deriveKey(oldPassword, salt);
    
    // Get all vault items
    const vaultItems = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('vault:') && key !== 'vault_test') {
        const itemKey = key.slice(6);
        try {
          const data = base64ToBuffer(localStorage.getItem(key));
          const iv = data.slice(0, IV_LENGTH);
          const encrypted = data.slice(IV_LENGTH);
          
          const decrypted = await crypto.subtle.decrypt(
            { name: ALGORITHM, iv: new Uint8Array(iv) },
            oldKey,
            encrypted
          );
          
          const decoder = new TextDecoder();
          vaultItems[itemKey] = JSON.parse(decoder.decode(decrypted));
        } catch {
          throw new Error('Invalid old password');
        }
      }
    }

    // Generate new salt and key
    const newSalt = getRandomBytes(SALT_LENGTH);
    const newKey = await deriveKey(newPassword, newSalt);

    // Re-encrypt all items with new key
    localStorage.setItem('vault_salt', bufferToBase64(newSalt.buffer));
    
    this.key = newKey;
    
    // Re-encrypt test value
    const encrypted = await this._encrypt('vault_initialized');
    localStorage.setItem('vault_test', encrypted);

    // Re-encrypt all items
    for (const [key, value] of Object.entries(vaultItems)) {
      await this.store(key, value);
    }

    this.isUnlocked = true;
    return true;
  };
}

export const passwordVault = new PasswordVault();

// Utility to migrate unencrypted data to encrypted storage
export const migrateToEncryptedStorage = async (keys, storage = secureUserStorage) => {
  for (const key of keys) {
    const plainValue = localStorage.getItem(key);
    if (plainValue && !plainValue.startsWith(ENCRYPTED_PREFIX)) {
      try {
        const parsed = JSON.parse(plainValue);
        await storage.setItem(key, parsed);
        localStorage.removeItem(key);
        console.log(`Migrated ${key} to encrypted storage`);
      } catch (err) {
        console.warn(`Failed to migrate ${key}:`, err);
      }
    }
  }
};

// Export encryption status info
export const getEncryptionInfo = () => {
  return {
    supported: isEncryptionSupported(),
    algorithm: ALGORITHM,
    keyLength: KEY_LENGTH,
    hasKey: localStorage.getItem(KEY_STORAGE_NAME) !== null
  };
};
