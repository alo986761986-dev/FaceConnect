import { useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { useNavigate, useLocation } from 'react-router-dom';

/**
 * Hook to handle Android system navigation gestures.
 * Handles back gesture, swipe navigation, and proper history management.
 */
export const useAndroidGestures = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Handle hardware back button / back gesture
  const handleBackButton = useCallback(() => {
    // Check if we're at the root/home
    const isAtRoot = location.pathname === '/' || location.pathname === '/home';
    
    // Check if any modal or panel is open
    const hasOpenModal = document.querySelector('[data-modal-open="true"]');
    const hasOpenPanel = document.querySelector('[data-panel-open="true"]');
    
    if (hasOpenModal || hasOpenPanel) {
      // Close modal/panel instead of navigating
      window.dispatchEvent(new CustomEvent('closeAllModals'));
      return true; // Handled
    }
    
    if (isAtRoot) {
      // At root, minimize app instead of closing
      if (Capacitor.isNativePlatform()) {
        App.minimizeApp();
      }
      return true;
    }
    
    // Navigate back in history
    navigate(-1);
    return true;
  }, [navigate, location.pathname]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    // Listen for hardware back button
    const backButtonListener = App.addListener('backButton', ({ canGoBack }) => {
      const handled = handleBackButton();
      if (!handled && !canGoBack) {
        // Can't go back and not handled, minimize app
        App.minimizeApp();
      }
    });

    return () => {
      backButtonListener.then(listener => listener.remove());
    };
  }, [handleBackButton]);

  // Handle swipe gestures for panel navigation
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let touchStartX = 0;
    let touchStartY = 0;
    const SWIPE_THRESHOLD = 50;
    const EDGE_ZONE = 30; // Pixels from edge to detect edge swipe

    const handleTouchStart = (e) => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    };

    const handleTouchEnd = (e) => {
      const touchEndX = e.changedTouches[0].clientX;
      const touchEndY = e.changedTouches[0].clientY;
      
      const deltaX = touchEndX - touchStartX;
      const deltaY = touchEndY - touchStartY;
      
      // Only trigger if horizontal swipe is dominant
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > SWIPE_THRESHOLD) {
        // Edge swipe from left (back gesture)
        if (touchStartX < EDGE_ZONE && deltaX > 0) {
          handleBackButton();
        }
        // Edge swipe from right (forward gesture) - optional
        // Can be used to open side panels
        else if (touchStartX > window.innerWidth - EDGE_ZONE && deltaX < 0) {
          window.dispatchEvent(new CustomEvent('openRightPanel'));
        }
      }
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleBackButton]);

  return {
    handleBackButton,
    isNative: Capacitor.isNativePlatform()
  };
};

/**
 * Hook to handle safe area insets for edge-to-edge display.
 * Returns CSS variables for safe area padding.
 */
export const useSafeAreaInsets = () => {
  useEffect(() => {
    // Apply CSS environment variables for safe area
    const style = document.documentElement.style;
    
    // These CSS env() values are set by the system
    style.setProperty('--safe-area-top', 'env(safe-area-inset-top, 0px)');
    style.setProperty('--safe-area-right', 'env(safe-area-inset-right, 0px)');
    style.setProperty('--safe-area-bottom', 'env(safe-area-inset-bottom, 0px)');
    style.setProperty('--safe-area-left', 'env(safe-area-inset-left, 0px)');
    
    // Add padding for gesture navigation area
    if (Capacitor.isNativePlatform()) {
      style.setProperty('--gesture-inset-bottom', 'env(safe-area-inset-bottom, 20px)');
    }
  }, []);

  return {
    top: 'var(--safe-area-top)',
    right: 'var(--safe-area-right)',
    bottom: 'var(--safe-area-bottom)',
    left: 'var(--safe-area-left)',
    gestureBottom: 'var(--gesture-inset-bottom, 0px)'
  };
};

export default useAndroidGestures;
