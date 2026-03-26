import { useState, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { Keyboard } from '@capacitor/keyboard';

/**
 * Hook to handle keyboard visibility and viewport adjustments on mobile.
 * Provides proper handling for Android's soft keyboard.
 */
export const useKeyboardHandler = () => {
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(window.innerHeight);
  
  useEffect(() => {
    const isNative = Capacitor.isNativePlatform();
    
    if (isNative) {
      // Use Capacitor Keyboard plugin for native apps
      const showListener = Keyboard.addListener('keyboardWillShow', (info) => {
        setKeyboardVisible(true);
        setKeyboardHeight(info.keyboardHeight);
        // Adjust viewport
        document.documentElement.style.setProperty('--keyboard-height', `${info.keyboardHeight}px`);
        document.body.classList.add('keyboard-visible');
      });
      
      const hideListener = Keyboard.addListener('keyboardWillHide', () => {
        setKeyboardVisible(false);
        setKeyboardHeight(0);
        document.documentElement.style.setProperty('--keyboard-height', '0px');
        document.body.classList.remove('keyboard-visible');
      });
      
      return () => {
        showListener.then(l => l.remove());
        hideListener.then(l => l.remove());
      };
    } else {
      // Web fallback using visualViewport API
      const handleResize = () => {
        if (window.visualViewport) {
          const newHeight = window.visualViewport.height;
          const heightDiff = window.innerHeight - newHeight;
          
          if (heightDiff > 150) {
            // Keyboard is likely visible
            setKeyboardVisible(true);
            setKeyboardHeight(heightDiff);
            setViewportHeight(newHeight);
            document.documentElement.style.setProperty('--keyboard-height', `${heightDiff}px`);
            document.body.classList.add('keyboard-visible');
          } else {
            setKeyboardVisible(false);
            setKeyboardHeight(0);
            setViewportHeight(window.innerHeight);
            document.documentElement.style.setProperty('--keyboard-height', '0px');
            document.body.classList.remove('keyboard-visible');
          }
        }
      };
      
      // Initial setup
      handleResize();
      
      // Listen for viewport changes
      if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', handleResize);
        window.visualViewport.addEventListener('scroll', handleResize);
      }
      
      return () => {
        if (window.visualViewport) {
          window.visualViewport.removeEventListener('resize', handleResize);
          window.visualViewport.removeEventListener('scroll', handleResize);
        }
      };
    }
  }, []);
  
  // Scroll element into view when keyboard shows
  const scrollInputIntoView = useCallback((element) => {
    if (keyboardVisible && element) {
      setTimeout(() => {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }, [keyboardVisible]);
  
  return {
    keyboardVisible,
    keyboardHeight,
    viewportHeight,
    scrollInputIntoView
  };
};

/**
 * Hook to manage input focus and keyboard behavior.
 */
export const useInputFocus = (inputRef) => {
  const { keyboardVisible, scrollInputIntoView } = useKeyboardHandler();
  
  const handleFocus = useCallback(() => {
    if (inputRef?.current) {
      scrollInputIntoView(inputRef.current);
    }
  }, [inputRef, scrollInputIntoView]);
  
  return {
    handleFocus,
    keyboardVisible
  };
};

export default useKeyboardHandler;
