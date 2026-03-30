/**
 * Contact Sync Service for FaceConnect Desktop
 * Handles automatic synchronization of contacts with the backend
 */

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Sync interval in milliseconds (5 minutes)
const SYNC_INTERVAL = 5 * 60 * 1000;

// Local storage keys
const STORAGE_KEYS = {
  LAST_SYNC: 'faceconnect_last_contact_sync',
  SYNCED_CONTACTS: 'faceconnect_synced_contacts',
  AUTO_SYNC_ENABLED: 'faceconnect_auto_sync_enabled'
};

// Check if running in Electron
export const isElectron = () => {
  return typeof window !== 'undefined' && 
    (window.navigator.userAgent.toLowerCase().includes('electron') ||
     window.process?.type === 'renderer' ||
     typeof window.require === 'function');
};

/**
 * Get contacts from local storage
 */
export const getLocalContacts = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.SYNCED_CONTACTS);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.error('Error getting local contacts:', e);
    return [];
  }
};

/**
 * Save contacts to local storage
 */
export const saveLocalContacts = (contacts) => {
  try {
    localStorage.setItem(STORAGE_KEYS.SYNCED_CONTACTS, JSON.stringify(contacts));
    localStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
  } catch (e) {
    console.error('Error saving local contacts:', e);
  }
};

/**
 * Get last sync timestamp
 */
export const getLastSyncTime = () => {
  try {
    return localStorage.getItem(STORAGE_KEYS.LAST_SYNC);
  } catch (e) {
    return null;
  }
};

/**
 * Check if auto-sync is enabled
 */
export const isAutoSyncEnabled = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.AUTO_SYNC_ENABLED);
    return stored === null ? true : stored === 'true'; // Default to enabled
  } catch (e) {
    return true;
  }
};

/**
 * Set auto-sync enabled/disabled
 */
export const setAutoSyncEnabled = (enabled) => {
  try {
    localStorage.setItem(STORAGE_KEYS.AUTO_SYNC_ENABLED, String(enabled));
  } catch (e) {
    console.error('Error setting auto-sync:', e);
  }
};

/**
 * Sync contacts with backend
 * @param {string} token - Auth token
 * @param {Array} localContacts - Contacts to sync
 * @returns {Object} - Sync result
 */
export const syncContactsWithBackend = async (token, localContacts = []) => {
  if (!token) {
    throw new Error('No auth token provided');
  }

  try {
    // If we have local contacts, save them to the backend
    if (localContacts.length > 0) {
      const saveResponse = await fetch(`${API_URL}/api/contacts/save?token=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contacts: localContacts })
      });
      
      if (!saveResponse.ok) {
        console.warn('Failed to save contacts to backend');
      }
    }

    // Fetch all contacts from backend (address book)
    const response = await fetch(`${API_URL}/api/contacts/address-book?token=${token}`);
    
    if (response.ok) {
      const data = await response.json();
      const contacts = data.contacts || [];
      
      // Save to local storage
      saveLocalContacts(contacts);
      
      return {
        success: true,
        contacts,
        count: contacts.length,
        lastSync: new Date().toISOString()
      };
    } else {
      throw new Error('Failed to fetch contacts from backend');
    }
  } catch (error) {
    console.error('Contact sync error:', error);
    return {
      success: false,
      error: error.message,
      contacts: getLocalContacts()
    };
  }
};

/**
 * Fetch user's address book from backend
 */
export const fetchAddressBook = async (token) => {
  if (!token) return [];
  
  try {
    const response = await fetch(`${API_URL}/api/contacts/address-book?token=${token}`);
    if (response.ok) {
      const data = await response.json();
      return data.contacts || [];
    }
  } catch (error) {
    console.error('Error fetching address book:', error);
  }
  return [];
};

/**
 * Add contacts to address book
 */
export const addContactsToAddressBook = async (token, contacts) => {
  if (!token || !contacts || contacts.length === 0) {
    return { success: false, error: 'Invalid parameters' };
  }

  try {
    const response = await fetch(`${API_URL}/api/contacts/save?token=${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contacts })
    });

    if (response.ok) {
      const data = await response.json();
      
      // Update local storage
      const existingContacts = getLocalContacts();
      const newContacts = [...existingContacts];
      
      contacts.forEach(contact => {
        const exists = newContacts.find(c => 
          (c.email && c.email === contact.email) || 
          (c.phone && c.phone === contact.phone)
        );
        if (!exists) {
          newContacts.push({
            ...contact,
            id: contact.id || Date.now().toString(),
            synced: true
          });
        }
      });
      
      saveLocalContacts(newContacts);
      
      return {
        success: true,
        saved: data.saved || contacts.length,
        updated: data.updated || 0
      };
    } else {
      const error = await response.json();
      return { success: false, error: error.detail || 'Save failed' };
    }
  } catch (error) {
    console.error('Error adding contacts:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Match contacts against registered FaceConnect users
 */
export const matchContactsWithUsers = async (token, contacts) => {
  if (!token || !contacts || contacts.length === 0) {
    return { matches: [], notFound: contacts };
  }

  const emails = contacts.filter(c => c.email).map(c => c.email.toLowerCase());
  const phones = contacts.filter(c => c.phone).map(c => c.phone.replace(/\D/g, ''));

  try {
    const response = await fetch(`${API_URL}/api/contacts/match?token=${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emails, phones })
    });

    if (response.ok) {
      const data = await response.json();
      return {
        matches: data.matches || [],
        notFound: data.not_found || []
      };
    }
  } catch (error) {
    console.error('Error matching contacts:', error);
  }
  
  return { matches: [], notFound: contacts };
};

/**
 * Auto-sync manager class
 */
class ContactSyncManager {
  constructor() {
    this.syncInterval = null;
    this.token = null;
    this.onSyncComplete = null;
    this.isSyncing = false;
  }

  /**
   * Initialize the sync manager
   */
  init(token, onSyncComplete) {
    this.token = token;
    this.onSyncComplete = onSyncComplete;
    
    // Only auto-sync in Electron
    if (isElectron() && isAutoSyncEnabled()) {
      this.startAutoSync();
    }
  }

  /**
   * Update auth token
   */
  setToken(token) {
    this.token = token;
  }

  /**
   * Start automatic sync
   */
  startAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    // Initial sync after 3 seconds
    setTimeout(() => this.performSync(), 3000);

    // Regular sync interval
    this.syncInterval = setInterval(() => {
      this.performSync();
    }, SYNC_INTERVAL);

    console.log('Contact auto-sync started');
  }

  /**
   * Stop automatic sync
   */
  stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    console.log('Contact auto-sync stopped');
  }

  /**
   * Perform a sync operation
   */
  async performSync() {
    if (this.isSyncing || !this.token) return;

    this.isSyncing = true;
    
    try {
      const result = await syncContactsWithBackend(this.token);
      
      if (result.success && this.onSyncComplete) {
        this.onSyncComplete(result);
      }
    } catch (error) {
      console.error('Auto-sync error:', error);
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Force immediate sync
   */
  async forceSync() {
    return this.performSync();
  }

  /**
   * Cleanup
   */
  destroy() {
    this.stopAutoSync();
    this.token = null;
    this.onSyncComplete = null;
  }
}

// Export singleton instance
export const contactSyncManager = new ContactSyncManager();

export default contactSyncManager;
