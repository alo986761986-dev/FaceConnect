import "@/App.css";
import "@/styles/theme.css";
import { useEffect, useState, useCallback } from "react";
import { BrowserRouter, HashRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { AnimatePresence, motion } from "framer-motion";
import Dashboard from "@/pages/Dashboard";
import PersonDetail from "@/pages/PersonDetail";
import Auth from "@/pages/Auth";
import AuthCallback from "@/pages/AuthCallback";
import Chat from "@/pages/Chat";
import Reels from "@/pages/Reels";
import Settings from "@/pages/Settings";
import Friends from "@/pages/Friends";
import LiveStreams from "@/pages/LiveStreams";
import LiveStream from "@/pages/LiveStream";
import Feed from "@/pages/Feed";
import Home from "@/pages/Home";
import Explore from "@/pages/Explore";
import Activity from "@/pages/Activity";
import AIAssistant from "@/pages/AIAssistant";
import InstallPrompt from "@/components/InstallPrompt";
import LockScreen from "@/components/LockScreen";
import UpdateNotification from "@/components/UpdateNotification";
import PlayStoreBanner from "@/components/PlayStoreBanner";
import ConnectionStatus from "@/components/ConnectionStatus";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { SettingsProvider, useSettings } from "@/context/SettingsContext";
import { 
  isBiometricEnabled, 
  isAuthenticationRequired,
  getAuthTimeout,
  refreshAuthSession
} from "@/utils/biometric";
import { useVisibilityChange } from "@/hooks/useMobile";

// Page transition animation variants
const pageTransition = {
  initial: { opacity: 0, y: 8 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }
  },
  exit: { 
    opacity: 0, 
    y: -8,
    transition: { duration: 0.2, ease: "easeIn" }
  }
};

// Animated page wrapper component
function AnimatedPage({ children }) {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageTransition}
      style={{ minHeight: '100vh' }}
    >
      {children}
    </motion.div>
  );
}

// Protected Route wrapper
function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const { isDark } = useSettings();
  
  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-[#0A0A0A]' : 'bg-white'}`}>
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
  const { isDark } = useSettings();
  
  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-[#0A0A0A]' : 'bg-white'}`}>
        <div className="w-8 h-8 border-2 border-[#00F0FF] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  
  return children;
}

// Detect if running in Electron
const isElectron = typeof window !== 'undefined' && (
  window.electronAPI?.isElectron || 
  (window.process?.type === 'renderer') ||
  (navigator.userAgent.indexOf('Electron') >= 0)
);

// Use HashRouter for Electron (file:// protocol), BrowserRouter for web
const Router = isElectron ? HashRouter : BrowserRouter;

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
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#00F0FF] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <SettingsProvider>
      <AuthProvider>
        <ThemedApp 
          isLocked={isLocked}
          handleUnlock={handleUnlock}
          showInstallPrompt={showInstallPrompt}
          deferredPrompt={deferredPrompt}
          handleInstall={handleInstall}
          handleDismissInstall={handleDismissInstall}
        />
      </AuthProvider>
    </SettingsProvider>
  );
}

// Separate component to use settings context
function ThemedApp({ isLocked, handleUnlock, showInstallPrompt, deferredPrompt, handleInstall, handleDismissInstall }) {
  const { isDark } = useSettings();
  
  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-[#0A0A0A]' : 'bg-white'}`}>
      {/* Lock Screen */}
      <AnimatePresence>
        {isLocked && <LockScreen onUnlock={handleUnlock} />}
      </AnimatePresence>

      {/* Main App */}
      {!isLocked && (
        <>
          <Router>
            <Routes>
              <Route path="/auth" element={
                <PublicRoute>
                  <Auth />
                </PublicRoute>
              } />
              <Route path="/auth/callback" element={<AuthCallback />} />
                <Route path="/" element={
                  <ProtectedRoute>
                    <Home />
                  </ProtectedRoute>
                } />
                <Route path="/profiles" element={
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
                <Route path="/explore" element={
                  <ProtectedRoute>
                    <Explore />
                  </ProtectedRoute>
                } />
                <Route path="/settings" element={
                  <ProtectedRoute>
                    <Settings />
                  </ProtectedRoute>
                } />
                <Route path="/friends" element={
                  <ProtectedRoute>
                    <Friends />
                  </ProtectedRoute>
                } />
                <Route path="/live" element={
                  <ProtectedRoute>
                    <LiveStreams />
                  </ProtectedRoute>
                } />
                <Route path="/live/:streamId" element={
                  <ProtectedRoute>
                    <LiveStream />
                  </ProtectedRoute>
                } />
                <Route path="/feed" element={
                  <ProtectedRoute>
                    <Feed />
                  </ProtectedRoute>
                } />
                <Route path="/activity" element={
                  <ProtectedRoute>
                    <Activity />
                  </ProtectedRoute>
                } />
                <Route path="/ai" element={
                  <ProtectedRoute>
                    <AIAssistant />
                  </ProtectedRoute>
                } />
              </Routes>
            </Router>
            
            <ThemedToaster />

            {/* PWA Install Prompt */}
            <InstallPrompt 
              isVisible={showInstallPrompt && deferredPrompt}
              onInstall={handleInstall}
              onDismiss={handleDismissInstall}
            />

            {/* Electron Update Notification */}
            <UpdateNotification />

            {/* Connection Status Indicator */}
            <ConnectionStatus />

            {/* Play Store Banner (mobile only) */}
            <PlayStoreBanner isDark={isDark} />
          </>
        )}
      </div>
  );
}

// Theme-aware Toaster
function ThemedToaster() {
  const { isDark } = useSettings();
  
  return (
    <Toaster 
      position="bottom-right" 
      toastOptions={{
        style: {
          background: isDark ? '#121212' : '#FFFFFF',
          border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.1)',
          color: isDark ? '#fff' : '#1A1A1A',
        },
      }}
    />
  );
}

export default App;
