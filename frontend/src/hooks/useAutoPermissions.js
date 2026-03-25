// Hook for auto-requesting all permissions on app launch
import { useEffect, useState, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { 
  requestAllPermissions, 
  hasRequestedPermissions, 
  getStoredPermissionResults,
  isNative 
} from '@/utils/permissions';

export const useAutoPermissions = (options = {}) => {
  const { 
    autoRequest = true,      // Auto request on mount
    forceRequest = false,    // Force request even if already requested
    onComplete = null,       // Callback when permissions are done
    delay = 1000,            // Delay before requesting (ms)
  } = options;

  const [permissionResults, setPermissionResults] = useState(null);
  const [isRequesting, setIsRequesting] = useState(false);
  const [hasRequested, setHasRequested] = useState(hasRequestedPermissions());

  const requestPermissions = useCallback(async () => {
    // Skip if not on native platform and not forcing
    const platform = Capacitor.getPlatform();
    console.log(`📱 Platform: ${platform}, isNative: ${isNative()}`);

    // Don't request again if already done (unless forced)
    if (hasRequestedPermissions() && !forceRequest) {
      console.log('✅ Permissions already requested, loading stored results');
      const stored = getStoredPermissionResults();
      setPermissionResults(stored);
      setHasRequested(true);
      onComplete?.(stored);
      return stored;
    }

    setIsRequesting(true);
    console.log('🔐 Auto-requesting all permissions...');

    try {
      const results = await requestAllPermissions((status) => {
        console.log(`Permission status: ${status}`);
      });

      setPermissionResults(results);
      setHasRequested(true);
      onComplete?.(results);

      return results;
    } catch (error) {
      console.error('Permission request error:', error);
      return null;
    } finally {
      setIsRequesting(false);
    }
  }, [forceRequest, onComplete]);

  useEffect(() => {
    if (!autoRequest) return;

    // Delay the permission request slightly to ensure app is fully loaded
    const timer = setTimeout(() => {
      requestPermissions();
    }, delay);

    return () => clearTimeout(timer);
  }, [autoRequest, delay, requestPermissions]);

  return {
    permissionResults,
    isRequesting,
    hasRequested,
    requestPermissions,
  };
};

export default useAutoPermissions;
