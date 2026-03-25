import "@/App.css";
import "@/styles/theme.css";
import "@/styles/mobile-animations.css";
import React, { useEffect, useState, useCallback, lazy, Suspense, Component } from "react";
import { BrowserRouter, HashRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import AutoUpdateNotification from "@/components/AutoUpdateNotification";
import WhatsAppDesktopLayout from "@/components/WhatsAppDesktopLayout";
import DesktopAuth from "@/components/DesktopAuth";
import { isElectron } from "@/utils/electron";
import { toast } from "sonner";
import { AnimatePresence, motion } from "framer-motion";
import useAutoPermissions from "@/hooks/useAutoPermissions";

// Error Boundary Component to catch crashes
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('App Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#0A0A0A] text-white p-4">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#00E676] to-[#00BFA5] flex items-center justify-center mb-6">
            <span className="text-3xl font-bold">FC</span>
          </div>
          <h1 className="text-xl font-semibold mb-2">Something went wrong</h1>
          <p className="text-gray-400 text-center mb-6">The app encountered an error. Please restart.</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-[#00E676] text-white rounded-xl font-medium"
          >
            Restart App
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Core pages - loaded immediately
import Auth from "@/pages/Auth";
import AuthCallback from "@/pages/AuthCallback";
import Home from "@/pages/Home";

// Lazy loaded pages for better performance
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const PersonDetail = lazy(() => import("@/pages/PersonDetail"));
const Chat = lazy(() => import("@/pages/Chat"));
const Reels = lazy(() => import("@/pages/Reels"));
const Settings = lazy(() => import("@/pages/Settings"));
const Friends = lazy(() => import("@/pages/Friends"));
const LiveStreams = lazy(() => import("@/pages/LiveStreams"));
const LiveStream = lazy(() => import("@/pages/LiveStream"));
const Feed = lazy(() => import("@/pages/Feed"));
const Explore = lazy(() => import("@/pages/Explore"));
const Activity = lazy(() => import("@/pages/Activity"));
const AIAssistant = lazy(() => import("@/pages/AIAssistant"));
const PrivacyPolicy = lazy(() => import("@/pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("@/pages/TermsOfService"));
const SafetyStandards = lazy(() => import("@/pages/SafetyStandards"));
const Premium = lazy(() => import("@/pages/Premium"));
const AdminDashboard = lazy(() => import("@/pages/AdminDashboard"));

// New social media pages - lazy loaded
const Watch = lazy(() => import("@/pages/Watch"));
const Marketplace = lazy(() => import("@/pages/Marketplace"));
const Groups = lazy(() => import("@/pages/Groups"));
const Events = lazy(() => import("@/pages/Events"));
const Memories = lazy(() => import("@/pages/Memories"));
const Gaming = lazy(() => import("@/pages/Gaming"));

import InstallPrompt from "@/components/InstallPrompt";
import LockScreen from "@/components/LockScreen";
import UpdateNotification from "@/components/UpdateNotification";
import PlayStoreBanner from "@/components/PlayStoreBanner";
import ConnectionStatus from "@/components/ConnectionStatus";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { SettingsProvider, useSettings } from "@/context/SettingsContext";
import { PremiumProvider } from "@/context/PremiumContext";
import { CallProvider } from "@/context/CallContext";
import { LanguageProvider } from "@/context/LanguageContext";
import FloatingChat from "@/components/facebook/FloatingChat";
import IncomingCallOverlay from "@/components/IncomingCallOverlay";
import { 
  isBiometricEnabled, 
  isAuthenticationRequired,
  getAuthTimeout,
  refreshAuthSession
} from "@/utils/biometric";
import { useVisibilityChange } from "@/hooks/useMobile";
import { pageVariants } from "@/components/animations";

// Loading spinner component for Suspense fallback
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
      <div className="relative">
        <div className="w-12 h-12 rounded-full border-4 border-[var(--border)] border-t-[var(--primary)] animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-6 h-6 rounded-full bg-[var(--primary)] animate-ping opacity-20" />
        </div>
      </div>
    </div>
  );
}

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

// Detect if running in Electron (for Router selection)
// CRITICAL: Use multiple detection methods, prioritizing file:// protocol check
// which is reliable even before preload script completes
const isElectronEnv = typeof window !== 'undefined' && (
  // Check if using file:// protocol (most reliable for production builds)
  window.location.protocol === 'file:' ||
  // Check preload-exposed API
  window.electronAPI?.isElectron === true ||
  // Check process type (may be undefined in newer Electron due to contextIsolation)
  (window.process?.type === 'renderer') ||
  // Check user agent string
  (navigator.userAgent.toLowerCase().indexOf('electron') >= 0)
);

// Use HashRouter for Electron (file:// protocol), BrowserRouter for web
const Router = isElectronEnv ? HashRouter : BrowserRouter;

// Log which router is being used (helps debug)
if (typeof window !== 'undefined') {
  console.log('[FaceConnect] Router mode:', isElectronEnv ? 'HashRouter (Electron)' : 'BrowserRouter (Web)');
  console.log('[FaceConnect] Protocol:', window.location.protocol);
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
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#00F0FF] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <SettingsProvider>
      <LanguageProvider>
        <AuthProvider>
          <PremiumProvider>
            <CallProvider>
              <ThemedApp 
                isLocked={isLocked}
                handleUnlock={handleUnlock}
                showInstallPrompt={showInstallPrompt}
                deferredPrompt={deferredPrompt}
                handleInstall={handleInstall}
                handleDismissInstall={handleDismissInstall}
              />
            </CallProvider>
          </PremiumProvider>
        </AuthProvider>
      </LanguageProvider>
    </SettingsProvider>
  );
}

// Animated Routes wrapper - must be inside Router to access location
function AppRoutes() {
  const location = useLocation();
  
  return (
    <Suspense fallback={<PageLoader />}>
      <AnimatePresence mode="wait" initial={false}>
        <Routes location={location} key={location.pathname}>
          <Route path="/auth" element={
            <PublicRoute>
              {isElectron() ? (
                <DesktopAuth />
              ) : (
                <AnimatedPage><Auth /></AnimatedPage>
              )}
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
        <Route path="/safety" element={
          <AnimatedPage><SafetyStandards /></AnimatedPage>
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
            {isElectron() ? (
              <WhatsAppDesktopLayout>
                <AnimatedPage><Home /></AnimatedPage>
              </WhatsAppDesktopLayout>
            ) : (
              <AnimatedPage><Home /></AnimatedPage>
            )}
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
            {isElectron() ? (
              <WhatsAppDesktopLayout>
                <AnimatedPage><Chat /></AnimatedPage>
              </WhatsAppDesktopLayout>
            ) : (
              <AnimatedPage><Chat /></AnimatedPage>
            )}
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
        {/* New Social Media Features */}
        <Route path="/watch" element={
          <ProtectedRoute>
            <AnimatedPage><Watch /></AnimatedPage>
          </ProtectedRoute>
        } />
        <Route path="/marketplace" element={
          <ProtectedRoute>
            <AnimatedPage><Marketplace /></AnimatedPage>
          </ProtectedRoute>
        } />
        <Route path="/groups" element={
          <ProtectedRoute>
            <AnimatedPage><Groups /></AnimatedPage>
          </ProtectedRoute>
        } />
        <Route path="/events" element={
          <ProtectedRoute>
            <AnimatedPage><Events /></AnimatedPage>
          </ProtectedRoute>
        } />
        <Route path="/memories" element={
          <ProtectedRoute>
            <AnimatedPage><Memories /></AnimatedPage>
          </ProtectedRoute>
        } />
        <Route path="/gaming" element={
          <ProtectedRoute>
            <AnimatedPage><Gaming /></AnimatedPage>
          </ProtectedRoute>
        } />
      </Routes>
    </AnimatePresence>
    </Suspense>
  );
}

// Separate component to use settings context
function ThemedApp({ isLocked, handleUnlock, showInstallPrompt, deferredPrompt, handleInstall, handleDismissInstall }) {
  const { isDark } = useSettings();
  
  // Auto-request all permissions on app launch (for mobile/Capacitor)
  const { permissionResults, isRequesting, hasRequested } = useAutoPermissions({
    autoRequest: true,
    delay: 1500, // Wait 1.5s after app loads
    onComplete: (results) => {
      console.log('✅ Permissions auto-requested:', results);
      // Show a toast notification about permissions
      if (results) {
        const granted = Object.values(results).filter(r => r?.granted).length;
        const total = Object.keys(results).length;
        if (granted > 0) {
          toast.success(`${granted}/${total} permissions enabled`, {
            duration: 3000,
            description: 'FaceConnect is ready to use all features',
          });
        }
      }
    },
  });
  
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
          <AutoUpdateNotification />

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

            {/* Floating Messenger Chat (Facebook-style) */}
            <FloatingChat />

            {/* Global Incoming Call Overlay */}
            <IncomingCallOverlay />

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

// Wrap App with ErrorBoundary for crash protection
function AppWithErrorBoundary() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}

export default AppWithErrorBoundary;
