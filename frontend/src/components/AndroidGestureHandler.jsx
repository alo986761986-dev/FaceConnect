import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { useNavigate, useLocation } from 'react-router-dom';

/**
 * Android Gesture Navigation Handler Component
 * Provides system-level gesture navigation support for Android apps.
 * - Back gesture handling (swipe from edge)
 * - Hardware back button support
 * - Status bar and navigation bar theming
 * - Safe area inset management
 */
export function AndroidGestureHandler({ children, isDark = true }) {
  const navigate = useNavigate();
  const location = useLocation();

  // Setup back button/gesture handling
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const handleBackButton = async ({ canGoBack }) => {
      // Check if any modal is open (use data attributes)
      const hasOpenModal = document.querySelector('[data-modal-open="true"]');
      const hasOpenPanel = document.querySelector('[data-panel-open="true"]');
      const hasOpenDialog = document.querySelector('[role="dialog"][data-state="open"]');
      
      if (hasOpenModal || hasOpenPanel || hasOpenDialog) {
        // Close modal/panel by dispatching event
        window.dispatchEvent(new CustomEvent('closeAllModals'));
        return;
      }
      
      // Check if at root/home
      const isAtRoot = ['/', '/home', '/feed'].includes(location.pathname);
      
      if (isAtRoot) {
        // At root - minimize app instead of closing
        await App.minimizeApp();
        return;
      }
      
      // Navigate back in history
      if (canGoBack) {
        navigate(-1);
      } else {
        // Can't go back, minimize app
        await App.minimizeApp();
      }
    };

    const backButtonListener = App.addListener('backButton', handleBackButton);

    return () => {
      backButtonListener.then(listener => listener.remove());
    };
  }, [navigate, location.pathname]);

  // Setup status bar and navigation bar styling
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const setupStatusBar = async () => {
      try {
        // Set status bar style based on theme
        await StatusBar.setStyle({
          style: isDark ? Style.Dark : Style.Light
        });
        
        // Make status bar overlay app content (edge-to-edge)
        await StatusBar.setOverlaysWebView({ overlay: true });
        
        // Set transparent background
        await StatusBar.setBackgroundColor({ color: '#00000000' });
      } catch (error) {
        console.log('StatusBar setup error (may be unsupported):', error.message);
      }
    };

    setupStatusBar();
  }, [isDark]);

  // Apply safe area CSS variables
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const root = document.documentElement;
    
    // Set CSS custom properties for safe areas
    root.style.setProperty('--safe-area-top', 'env(safe-area-inset-top, 0px)');
    root.style.setProperty('--safe-area-bottom', 'env(safe-area-inset-bottom, 0px)');
    root.style.setProperty('--safe-area-left', 'env(safe-area-inset-left, 0px)');
    root.style.setProperty('--safe-area-right', 'env(safe-area-inset-right, 0px)');
    
    // Add class for gesture navigation styling
    root.classList.add('gesture-navigation');
    
    // Apply body padding for safe areas
    document.body.style.paddingTop = 'var(--safe-area-top)';
    document.body.style.paddingBottom = 'var(--safe-area-bottom)';
    
    return () => {
      root.classList.remove('gesture-navigation');
    };
  }, []);

  // Handle app state changes
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const stateChangeListener = App.addListener('appStateChange', ({ isActive }) => {
      if (isActive) {
        // App came to foreground
        console.log('[FaceConnect] App resumed');
        window.dispatchEvent(new CustomEvent('appResumed'));
      } else {
        // App went to background
        console.log('[FaceConnect] App backgrounded');
        window.dispatchEvent(new CustomEvent('appBackgrounded'));
      }
    });

    return () => {
      stateChangeListener.then(listener => listener.remove());
    };
  }, []);

  return children;
}

export default AndroidGestureHandler;
