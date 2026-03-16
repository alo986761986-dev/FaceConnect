import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { LANGUAGES, getTranslation, isRTL, getLanguageInfo } from "@/utils/i18n";

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  // Initialize settings from localStorage
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem("app_settings");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return getDefaultSettings();
      }
    }
    return getDefaultSettings();
  });

  function getDefaultSettings() {
    // Detect browser language
    const browserLang = navigator.language.split("-")[0];
    const supportedLang = LANGUAGES.find(l => l.code === browserLang);
    
    // Detect system theme preference
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    
    return {
      language: supportedLang ? supportedLang.code : "en",
      theme: prefersDark ? "dark" : "light",
      notifications: {
        enabled: true,
        comments: true,
        reels: true,
        messages: true,
        friendRequests: true,
        tags: true,
        friendUpdates: true,
        sound: "default",
        messageSound: "default",
        vibration: true,
        volume: 80,
      }
    };
  }

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

  // Set language
  const setLanguage = useCallback((langCode) => {
    updateSetting("language", langCode);
  }, [updateSetting]);

  // Set theme
  const setTheme = useCallback((theme) => {
    updateSetting("theme", theme);
  }, [updateSetting]);

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
    theme: settings.theme,
    setTheme,
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
