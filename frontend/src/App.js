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
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import TermsOfService from "@/pages/TermsOfService";
import Premium from "@/pages/Premium";
import AdminDashboard from "@/pages/AdminDashboard";
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
import { pageVariants } from "@/components/animations";

// Animated page wrapper component
function AnimatedPage({ children }) {
  return (
    <motion.div
      initial="initial"
      animate="enter"
      exit="exit"
      variants={pageVariants}
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

// Animated Routes wrapper - must be inside Router to access location
function AppRoutes() {
  const location = useLocation();
  
  return (
    <AnimatePresence mode="wait" initial={false}>
      <Routes location={location} key={location.pathname}>
        <Route path="/auth" element={
          <PublicRoute>
            <AnimatedPage><Auth /></AnimatedPage>
          </PublicRoute>
        } />
        <Route path="/auth/callback" element={
          <AnimatedPage><AuthCallback /></AnimatedPage>
        } />
        <Route path="/privacy" element={
          <AnimatedPage><PrivacyPolicy /></AnimatedPage>
        } />
        <Route path="/terms" element={
          <AnimatedPage><TermsOfService /></AnimatedPage>
        } />
        <Route path="/premium" element={
          <ProtectedRoute>
            <AnimatedPage><Premium /></AnimatedPage>
          </ProtectedRoute>
        } />
        <Route path="/admin" element={
          <ProtectedRoute>
            <AnimatedPage><AdminDashboard /></AnimatedPage>
          </ProtectedRoute>
        } />
        <Route path="/payment/success" element={
          <ProtectedRoute>
            <AnimatedPage><Premium /></AnimatedPage>
          </ProtectedRoute>
        } />
        <Route path="/payment/cancel" element={
          <ProtectedRoute>
            <AnimatedPage><Premium /></AnimatedPage>
          </ProtectedRoute>
        } />
        <Route path="/" element={
          <ProtectedRoute>
            <AnimatedPage><Home /></AnimatedPage>
          </ProtectedRoute>
        } />
        <Route path="/profiles" element={
          <ProtectedRoute>
            <AnimatedPage><Dashboard /></AnimatedPage>
          </ProtectedRoute>
        } />
        <Route path="/person/:id" element={
          <ProtectedRoute>
            <AnimatedPage><PersonDetail /></AnimatedPage>
          </ProtectedRoute>
        } />
        <Route path="/chat" element={
          <ProtectedRoute>
            <AnimatedPage><Chat /></AnimatedPage>
          </ProtectedRoute>
        } />
        <Route path="/reels" element={
          <ProtectedRoute>
            <AnimatedPage><Reels /></AnimatedPage>
          </ProtectedRoute>
        } />
        <Route path="/explore" element={
          <ProtectedRoute>
            <AnimatedPage><Explore /></AnimatedPage>
          </ProtectedRoute>
        } />
        <Route path="/settings" element={
          <ProtectedRoute>
            <AnimatedPage><Settings /></AnimatedPage>
          </ProtectedRoute>
        } />
        <Route path="/friends" element={
          <ProtectedRoute>
            <AnimatedPage><Friends /></AnimatedPage>
          </ProtectedRoute>
        } />
        <Route path="/live" element={
          <ProtectedRoute>
            <AnimatedPage><LiveStreams /></AnimatedPage>
          </ProtectedRoute>
        } />
        <Route path="/live/:streamId" element={
          <ProtectedRoute>
            <AnimatedPage><LiveStream /></AnimatedPage>
          </ProtectedRoute>
        } />
        <Route path="/feed" element={
          <ProtectedRoute>
            <AnimatedPage><Feed /></AnimatedPage>
          </ProtectedRoute>
        } />
        <Route path="/activity" element={
          <ProtectedRoute>
            <AnimatedPage><Activity /></AnimatedPage>
          </ProtectedRoute>
        } />
        <Route path="/ai" element={
          <ProtectedRoute>
            <AnimatedPage><AIAssistant /></AnimatedPage>
          </ProtectedRoute>
        } />
      </Routes>
    </AnimatePresence>
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
            <AppRoutes />
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
