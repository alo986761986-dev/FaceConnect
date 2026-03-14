import "@/App.css";
import { useEffect, useState, useCallback } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { AnimatePresence } from "framer-motion";
import Dashboard from "@/pages/Dashboard";
import PersonDetail from "@/pages/PersonDetail";
import Auth from "@/pages/Auth";
import Chat from "@/pages/Chat";
import Reels from "@/pages/Reels";
import InstallPrompt from "@/components/InstallPrompt";
import LockScreen from "@/components/LockScreen";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { 
  isBiometricEnabled, 
  isAuthenticationRequired,
  getAuthTimeout,
  refreshAuthSession
} from "@/utils/biometric";
import { useVisibilityChange } from "@/hooks/useMobile";

// Protected Route wrapper
function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#00F0FF] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }
  
  return children;
}

// Public Route wrapper (redirects to home if already logged in)
function PublicRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#00F0FF] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  
  return children;
}

function App() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Check if app should be locked on mount
  useEffect(() => {
    const checkAuth = () => {
      const shouldLock = isBiometricEnabled() && isAuthenticationRequired(getAuthTimeout());
      setIsLocked(shouldLock);
      setCheckingAuth(false);
    };
    
    // Small delay to prevent flash
    setTimeout(checkAuth, 100);
  }, []);

  // Lock app when it goes to background (if biometric enabled)
  const handleVisibilityHidden = useCallback(() => {
    if (isBiometricEnabled()) {
      // Don't lock immediately, check timeout
      const timeout = getAuthTimeout();
      if (timeout > 0) {
        // Mark the time user left
        localStorage.setItem('app_backgrounded_at', Date.now().toString());
      }
    }
  }, []);

  const handleVisibilityVisible = useCallback(() => {
    if (isBiometricEnabled()) {
      const backgroundedAt = localStorage.getItem('app_backgrounded_at');
      const timeout = getAuthTimeout();
      
      if (backgroundedAt && timeout > 0) {
        const elapsed = Date.now() - parseInt(backgroundedAt, 10);
        const timeoutMs = timeout * 60 * 1000;
        
        if (elapsed > timeoutMs) {
          setIsLocked(true);
        }
        
        localStorage.removeItem('app_backgrounded_at');
      }
    }
  }, []);

  useVisibilityChange(handleVisibilityVisible, handleVisibilityHidden);

  // Handle unlock
  const handleUnlock = useCallback(() => {
    refreshAuthSession();
    setIsLocked(false);
  }, []);

  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
          .then((registration) => {
            console.log('SW registered:', registration.scope);
          })
          .catch((error) => {
            console.log('SW registration failed:', error);
          });
      });
    }

    // Handle PWA install prompt
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      
      // Show install prompt after a delay if not already installed
      const isInstalled = window.matchMedia('(display-mode: standalone)').matches;
      if (!isInstalled && !localStorage.getItem('pwa-install-dismissed')) {
        setTimeout(() => {
          setShowInstallPrompt(true);
        }, 3000);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Handle app installed
    window.addEventListener('appinstalled', () => {
      setDeferredPrompt(null);
      setShowInstallPrompt(false);
      toast.success('FaceConnect installed successfully!');
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('User accepted install');
    }
    setDeferredPrompt(null);
    setShowInstallPrompt(false);
  };

  const handleDismissInstall = () => {
    setShowInstallPrompt(false);
    localStorage.setItem('pwa-install-dismissed', 'true');
  };

  // Show nothing while checking auth
  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#00F0FF] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <AuthProvider>
      <div className="min-h-screen bg-[#0A0A0A]">
        {/* Lock Screen */}
        <AnimatePresence>
          {isLocked && <LockScreen onUnlock={handleUnlock} />}
        </AnimatePresence>

        {/* Main App */}
        {!isLocked && (
          <>
            <BrowserRouter>
              <Routes>
                <Route path="/auth" element={
                  <PublicRoute>
                    <Auth />
                  </PublicRoute>
                } />
                <Route path="/" element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                } />
                <Route path="/person/:id" element={
                  <ProtectedRoute>
                    <PersonDetail />
                  </ProtectedRoute>
                } />
                <Route path="/chat" element={
                  <ProtectedRoute>
                    <Chat />
                  </ProtectedRoute>
                } />
                <Route path="/reels" element={
                  <ProtectedRoute>
                    <Reels />
                  </ProtectedRoute>
                } />
              </Routes>
            </BrowserRouter>
            
            <Toaster 
              position="bottom-right" 
              toastOptions={{
                style: {
                  background: '#121212',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#fff',
                },
              }}
            />

            {/* PWA Install Prompt */}
            <InstallPrompt 
              isVisible={showInstallPrompt && deferredPrompt}
              onInstall={handleInstall}
              onDismiss={handleDismissInstall}
            />
          </>
        )}
      </div>
    </AuthProvider>
  );
}

export default App;
