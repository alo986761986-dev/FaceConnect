import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { LANGUAGES, getTranslation, isRTL, getLanguageInfo } from "@/utils/i18n";

const SettingsContext = createContext(null);

// Detect the best language based on browser/device settings
function detectBrowserLanguage() {
  // Try multiple sources for language detection
  const sources = [
    navigator.language,                    // Primary browser language
    navigator.languages?.[0],              // First in preferred list
    navigator.userLanguage,                // IE
    navigator.browserLanguage,             // IE
  ].filter(Boolean);

  for (const source of sources) {
    // Try exact match first (e.g., "zh-TW")
    const exactMatch = LANGUAGES.find(l => l.code === source);
    if (exactMatch) return exactMatch.code;
    
    // Try base language (e.g., "zh" from "zh-CN")
    const baseLang = source.split("-")[0].toLowerCase();
    const baseMatch = LANGUAGES.find(l => l.code === baseLang);
    if (baseMatch) return baseMatch.code;
  }
  
  return "en"; // Default fallback
}

export function SettingsProvider({ children }) {
  // Initialize settings from localStorage with auto-detection fallback
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem("app_settings");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Migrate old settings if needed - only set autoLanguage if not defined
        if (parsed.autoLanguage === undefined) {
          parsed.autoLanguage = true;
        }
        return parsed;
      } catch {
        return getDefaultSettings();
      }
    }
    return getDefaultSettings();
  });
  
  const [isInitialized, setIsInitialized] = useState(false);

  function getDefaultSettings() {
    // Detect browser/device language
    const detectedLang = detectBrowserLanguage();
    
    // Detect system theme preference
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    
    return {
      language: detectedLang,
      autoLanguage: true, // Auto-detect language by default
      theme: prefersDark ? "dark" : "light",
      autoTheme: true, // Follow system theme by default
      notifications: {
        enabled: true,
        // Messages settings
        messages: {
          enabled: true,
          tone: "default",
          vibration: true,
          highPriority: true,
          reactions: true,
        },
        // Groups settings
        groups: {
          enabled: true,
          tone: "default",
          vibration: true,
          highPriority: true,
          reactions: true,
        },
        // Calls settings
        calls: {
          enabled: true,
          ringtone: "default",
          vibration: true,
        },
        // Status settings
        status: {
          enabled: true,
          tone: "default",
          vibration: true,
          highPriority: true,
          reactions: true,
        },
        // Legacy settings for backwards compatibility
        comments: true,
        reels: true,
        friendRequests: true,
        tags: true,
        friendUpdates: true,
        sound: "default",
        messageSound: "default",
        vibration: true,
        volume: 80,
      },
      // FaceScan settings
      faceScan: {
        quality: "high", // low, medium, high, ultra
        multiplefaces: true, // Detect multiple faces in one scan
        autoSnapshot: false, // Auto-capture when face detected
        aiEnhancement: true, // Use AI for better recognition
        scanSensitivity: 0.6, // 0.0 to 1.0 - lower = more strict matching
        showLandmarks: true, // Show face landmarks during scan
        showConfidence: true, // Show confidence score
        saveHistory: true, // Save scan history
        hapticFeedback: true, // Vibrate on detection
      }
    };
  }

  // Re-detect language if autoLanguage is enabled (on app load)
  useEffect(() => {
    if (!isInitialized && settings.autoLanguage) {
      const detectedLang = detectBrowserLanguage();
      if (detectedLang !== settings.language) {
        setSettings(prev => ({
          ...prev,
          language: detectedLang
        }));
      }
    }
    setIsInitialized(true);
  }, [isInitialized, settings.autoLanguage, settings.language]);

  // Listen for system theme changes
  useEffect(() => {
    if (!settings.autoTheme) return;
    
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e) => {
      setSettings(prev => ({
        ...prev,
        theme: e.matches ? "dark" : "light"
      }));
    };
    
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [settings.autoTheme]);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("app_settings", JSON.stringify(settings));
  }, [settings]);

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;
    
    // Remove old theme classes
    root.classList.remove("dark-theme", "light-theme");
    root.removeAttribute("data-theme");
    
    // Apply new theme
    if (settings.theme === "dark") {
      root.classList.add("dark-theme");
      root.setAttribute("data-theme", "dark");
    } else {
      root.classList.add("light-theme");
      root.setAttribute("data-theme", "light");
    }
    
    // Update body background
    document.body.style.backgroundColor = settings.theme === "dark" ? "#0A0A0A" : "#FFFFFF";
    document.body.style.color = settings.theme === "dark" ? "#FFFFFF" : "#1A1A1A";
  }, [settings.theme]);

  // Apply RTL direction based on language
  useEffect(() => {
    const rtl = isRTL(settings.language);
    document.documentElement.dir = rtl ? "rtl" : "ltr";
    document.documentElement.lang = settings.language;
  }, [settings.language]);

  // Translation function
  const t = useCallback((key) => {
    return getTranslation(settings.language, key);
  }, [settings.language]);

  // Update specific setting
  const updateSetting = useCallback((key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  }, []);

  // Update nested notification setting
  const updateNotificationSetting = useCallback((key, value) => {
    setSettings(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [key]: value
      }
    }));
  }, []);

  // Set language (and disable auto-detection when manually set)
  const setLanguage = useCallback((langCode) => {
    setSettings(prev => ({
      ...prev,
      language: langCode,
      autoLanguage: false // Disable auto-detection when user manually selects
    }));
  }, []);

  // Set theme (and disable auto-theme when manually set)
  const setTheme = useCallback((theme) => {
    setSettings(prev => ({
      ...prev,
      theme: theme,
      autoTheme: false // Disable auto-theme when user manually selects
    }));
  }, []);

  // Toggle auto language detection
  const setAutoLanguage = useCallback((enabled) => {
    if (enabled) {
      const detectedLang = detectBrowserLanguage();
      setSettings(prev => ({
        ...prev,
        autoLanguage: true,
        language: detectedLang
      }));
    } else {
      setSettings(prev => ({
        ...prev,
        autoLanguage: false
      }));
    }
  }, []);

  // Toggle auto theme
  const setAutoTheme = useCallback((enabled) => {
    if (enabled) {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      setSettings(prev => ({
        ...prev,
        autoTheme: true,
        theme: prefersDark ? "dark" : "light"
      }));
    } else {
      setSettings(prev => ({
        ...prev,
        autoTheme: false
      }));
    }
  }, []);

  // Toggle theme
  const toggleTheme = useCallback(() => {
    setSettings(prev => ({
      ...prev,
      theme: prev.theme === "dark" ? "light" : "dark"
    }));
  }, []);

  // Get current language info
  const currentLanguage = getLanguageInfo(settings.language);
  const isRtl = isRTL(settings.language);
  const isDark = settings.theme === "dark";

  const value = {
    settings,
    setSettings,
    updateSetting,
    updateNotificationSetting,
    language: settings.language,
    setLanguage,
    autoLanguage: settings.autoLanguage,
    setAutoLanguage,
    theme: settings.theme,
    setTheme,
    autoTheme: settings.autoTheme,
    setAutoTheme,
    toggleTheme,
    t,
    currentLanguage,
    isRtl,
    isDark,
    languages: LANGUAGES,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}

export default SettingsContext;
