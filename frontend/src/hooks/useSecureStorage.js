import { useState, useEffect, useCallback } from 'react';
import { 
  secureUserStorage, 
  secureNotesStorage, 
  secureSettingsStorage,
  isEncryptionSupported 
} from '@/utils/encryption';

// Hook for encrypted storage
export const useSecureStorage = (key, initialValue = null, storageType = 'user') => {
  const [value, setValue] = useState(initialValue);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Get the appropriate storage instance
  const storage = {
    user: secureUserStorage,
    notes: secureNotesStorage,
    settings: secureSettingsStorage
  }[storageType] || secureUserStorage;

  // Load initial value
  useEffect(() => {
    const loadValue = async () => {
      try {
        setLoading(true);
        const stored = await storage.getItem(key);
        if (stored !== null) {
          setValue(stored);
        }
      } catch (err) {
        console.error(`Failed to load ${key}:`, err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    loadValue();
  }, [key, storage]);

  // Update value
  const updateValue = useCallback(async (newValue) => {
    try {
      setError(null);
      const valueToStore = typeof newValue === 'function' 
        ? newValue(value) 
        : newValue;
      
      await storage.setItem(key, valueToStore);
      setValue(valueToStore);
      return true;
    } catch (err) {
      console.error(`Failed to save ${key}:`, err);
      setError(err);
      return false;
    }
  }, [key, value, storage]);

  // Remove value
  const removeValue = useCallback(async () => {
    try {
      await storage.removeItem(key);
      setValue(initialValue);
      return true;
    } catch (err) {
      console.error(`Failed to remove ${key}:`, err);
      setError(err);
      return false;
    }
  }, [key, initialValue, storage]);

  return {
    value,
    setValue: updateValue,
    remove: removeValue,
    loading,
    error,
    isEncrypted: isEncryptionSupported()
  };
};

// Hook for encrypted notes
export const useSecureNotes = (personId) => {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load notes
  useEffect(() => {
    const loadNotes = async () => {
      try {
        setLoading(true);
        const stored = await secureNotesStorage.getItem(`person_${personId}`);
        if (stored) {
          setNotes(stored);
        }
      } catch (err) {
        console.error('Failed to load notes:', err);
      } finally {
        setLoading(false);
      }
    };

    if (personId) {
      loadNotes();
    }
  }, [personId]);

  // Add note
  const addNote = useCallback(async (content) => {
    const newNote = {
      id: `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      content,
      createdAt: new Date().toISOString(),
      encrypted: true
    };

    const updatedNotes = [...notes, newNote];
    await secureNotesStorage.setItem(`person_${personId}`, updatedNotes);
    setNotes(updatedNotes);
    return newNote;
  }, [personId, notes]);

  // Remove note
  const removeNote = useCallback(async (noteId) => {
    const updatedNotes = notes.filter(n => n.id !== noteId);
    await secureNotesStorage.setItem(`person_${personId}`, updatedNotes);
    setNotes(updatedNotes);
  }, [personId, notes]);

  // Clear all notes
  const clearNotes = useCallback(async () => {
    await secureNotesStorage.removeItem(`person_${personId}`);
    setNotes([]);
  }, [personId]);

  return {
    notes,
    addNote,
    removeNote,
    clearNotes,
    loading
  };
};

// Hook for encrypted settings
export const useSecureSettings = () => {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const stored = await secureSettingsStorage.getItem('app_settings');
        if (stored) {
          setSettings(stored);
        }
      } catch (err) {
        console.error('Failed to load settings:', err);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  const updateSetting = useCallback(async (key, value) => {
    const newSettings = { ...settings, [key]: value };
    await secureSettingsStorage.setItem('app_settings', newSettings);
    setSettings(newSettings);
  }, [settings]);

  const getSetting = useCallback((key, defaultValue = null) => {
    return settings[key] ?? defaultValue;
  }, [settings]);

  return {
    settings,
    updateSetting,
    getSetting,
    loading
  };
};

export default useSecureStorage;
