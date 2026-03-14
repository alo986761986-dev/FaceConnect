import { useState, useEffect, useCallback, useRef } from 'react';

// Hook for pull-to-refresh
export const usePullToRefresh = (onRefresh, threshold = 80) => {
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = useRef(0);
  const containerRef = useRef(null);

  const handleTouchStart = useCallback((e) => {
    if (window.scrollY === 0) {
      startY.current = e.touches[0].clientY;
    }
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (startY.current === 0 || isRefreshing) return;
    
    const currentY = e.touches[0].clientY;
    const diff = currentY - startY.current;
    
    if (diff > 0 && window.scrollY === 0) {
      setIsPulling(true);
      setPullDistance(Math.min(diff * 0.5, threshold * 1.5));
      
      if (diff > threshold) {
        e.preventDefault();
      }
    }
  }, [isRefreshing, threshold]);

  const handleTouchEnd = useCallback(async () => {
    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      
      if ('vibrate' in navigator) {
        navigator.vibrate(20);
      }
      
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }
    
    setIsPulling(false);
    setPullDistance(0);
    startY.current = 0;
  }, [pullDistance, threshold, isRefreshing, onRefresh]);

  useEffect(() => {
    const container = containerRef.current || document;
    
    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });
    
    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return { isPulling, pullDistance, isRefreshing, containerRef };
};

// Hook for swipe gestures
export const useSwipeGesture = (onSwipe, threshold = 50) => {
  const startX = useRef(0);
  const startY = useRef(0);
  const containerRef = useRef(null);

  const handleTouchStart = useCallback((e) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback((e) => {
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    
    const diffX = endX - startX.current;
    const diffY = endY - startY.current;
    
    // Check if horizontal swipe is more significant
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > threshold) {
      const direction = diffX > 0 ? 'right' : 'left';
      onSwipe(direction, Math.abs(diffX));
      
      if ('vibrate' in navigator) {
        navigator.vibrate(10);
      }
    } else if (Math.abs(diffY) > Math.abs(diffX) && Math.abs(diffY) > threshold) {
      const direction = diffY > 0 ? 'down' : 'up';
      onSwipe(direction, Math.abs(diffY));
    }
    
    startX.current = 0;
    startY.current = 0;
  }, [onSwipe, threshold]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });
    
    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchEnd]);

  return containerRef;
};

// Hook for long press
export const useLongPress = (onLongPress, delay = 500) => {
  const timeoutRef = useRef(null);
  const targetRef = useRef(null);
  const [isPressed, setIsPressed] = useState(false);

  const start = useCallback((e) => {
    setIsPressed(true);
    targetRef.current = e.target;
    
    timeoutRef.current = setTimeout(() => {
      if ('vibrate' in navigator) {
        navigator.vibrate(30);
      }
      onLongPress(e);
      setIsPressed(false);
    }, delay);
  }, [onLongPress, delay]);

  const clear = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsPressed(false);
  }, []);

  return {
    onTouchStart: start,
    onTouchEnd: clear,
    onTouchMove: clear,
    onMouseDown: start,
    onMouseUp: clear,
    onMouseLeave: clear,
    isPressed
  };
};

// Hook for double tap
export const useDoubleTap = (onDoubleTap, delay = 300) => {
  const lastTap = useRef(0);

  const handleTap = useCallback((e) => {
    const now = Date.now();
    
    if (now - lastTap.current < delay) {
      if ('vibrate' in navigator) {
        navigator.vibrate([10, 30, 10]);
      }
      onDoubleTap(e);
      lastTap.current = 0;
    } else {
      lastTap.current = now;
    }
  }, [onDoubleTap, delay]);

  return handleTap;
};

// Hook for network status
export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [connectionType, setConnectionType] = useState(
    navigator.connection?.effectiveType || 'unknown'
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    const handleConnectionChange = () => {
      setConnectionType(navigator.connection?.effectiveType || 'unknown');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    if (navigator.connection) {
      navigator.connection.addEventListener('change', handleConnectionChange);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      
      if (navigator.connection) {
        navigator.connection.removeEventListener('change', handleConnectionChange);
      }
    };
  }, []);

  return { isOnline, connectionType };
};

// Hook for device orientation
export const useDeviceOrientation = () => {
  const [orientation, setOrientation] = useState(
    window.innerWidth > window.innerHeight ? 'landscape' : 'portrait'
  );

  useEffect(() => {
    const handleResize = () => {
      setOrientation(
        window.innerWidth > window.innerHeight ? 'landscape' : 'portrait'
      );
    };

    const handleOrientationChange = () => {
      if (screen.orientation) {
        setOrientation(screen.orientation.type.includes('portrait') ? 'portrait' : 'landscape');
      }
    };

    window.addEventListener('resize', handleResize);
    
    if (screen.orientation) {
      screen.orientation.addEventListener('change', handleOrientationChange);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      
      if (screen.orientation) {
        screen.orientation.removeEventListener('change', handleOrientationChange);
      }
    };
  }, []);

  return orientation;
};

// Hook for visibility change (app backgrounded/foregrounded)
export const useVisibilityChange = (onVisible, onHidden) => {
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        onHidden?.();
      } else {
        onVisible?.();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [onVisible, onHidden]);
};

// Hook for safe area insets
export const useSafeAreaInsets = () => {
  const [insets, setInsets] = useState({
    top: 0,
    right: 0,
    bottom: 0,
    left: 0
  });

  useEffect(() => {
    const computeInsets = () => {
      const style = getComputedStyle(document.documentElement);
      setInsets({
        top: parseInt(style.getPropertyValue('--sat') || '0', 10),
        right: parseInt(style.getPropertyValue('--sar') || '0', 10),
        bottom: parseInt(style.getPropertyValue('--sab') || '0', 10),
        left: parseInt(style.getPropertyValue('--sal') || '0', 10)
      });
    };

    // Set CSS variables
    document.documentElement.style.setProperty('--sat', 'env(safe-area-inset-top)');
    document.documentElement.style.setProperty('--sar', 'env(safe-area-inset-right)');
    document.documentElement.style.setProperty('--sab', 'env(safe-area-inset-bottom)');
    document.documentElement.style.setProperty('--sal', 'env(safe-area-inset-left)');

    computeInsets();
    window.addEventListener('resize', computeInsets);
    
    return () => {
      window.removeEventListener('resize', computeInsets);
    };
  }, []);

  return insets;
};
