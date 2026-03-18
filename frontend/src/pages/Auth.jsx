import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Mail, Lock, User, ArrowRight, Eye, EyeOff, Wrench, X, CheckCircle, AlertCircle, Wifi, WifiOff, Trash2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";

const API = process.env.REACT_APP_BACKEND_URL;

// Social login icons as SVG components
const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

const AppleIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
  </svg>
);

const FacebookIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="#1877F2">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);

export default function Auth() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, register } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showRepairModal, setShowRepairModal] = useState(false);
  const [repairStatus, setRepairStatus] = useState({
    connection: null,
    checking: false
  });
  
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    username: "",
    displayName: ""
  });

  // Test backend connection
  const testConnection = async () => {
    setRepairStatus(prev => ({ ...prev, checking: true, connection: null }));
    try {
      const response = await fetch(`${API}/api/health`, { 
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      if (response.ok) {
        setRepairStatus(prev => ({ ...prev, connection: 'success', checking: false }));
        toast.success("Connection successful!");
      } else {
        setRepairStatus(prev => ({ ...prev, connection: 'error', checking: false }));
        toast.error("Server returned an error");
      }
    } catch (error) {
      setRepairStatus(prev => ({ ...prev, connection: 'error', checking: false }));
      toast.error("Cannot connect to server");
    }
  };

  // Clear all local data
  const clearLocalData = () => {
    localStorage.clear();
    sessionStorage.clear();
    toast.success("Local data cleared!");
    setRepairStatus(prev => ({ ...prev, connection: null }));
  };

  // Reload the app
  const reloadApp = () => {
    window.location.reload();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        await login(formData.email, formData.password);
        toast.success("Welcome back!");
      } else {
        if (!formData.username.trim()) {
          toast.error("Username is required");
          setLoading(false);
          return;
        }
        await register(
          formData.username,
          formData.email,
          formData.password,
          formData.displayName || formData.username
        );
        toast.success("Account created!");
      }
      navigate("/");
    } catch (error) {
      const message = error.response?.data?.detail || "Authentication failed";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
  const handleGoogleLogin = () => {
    setSocialLoading('google');
    const redirectUrl = window.location.origin + '/auth/callback';
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  const handleAppleLogin = () => {
    toast.info("Apple Sign-In requires Apple Developer credentials. Coming soon!");
  };

  const handleFacebookLogin = () => {
    toast.info("Facebook Login requires Facebook Developer credentials. Coming soon!");
  };

  const handleChange = (field) => (e) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
  };

  return (
    <div className="min-h-screen bg-[var(--background)] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Gradient orbs */}
        <div className="absolute top-1/4 -left-20 w-60 h-60 bg-[var(--primary)]/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-[var(--accent-purple)]/10 rounded-full blur-3xl" />
        {/* Grid pattern */}
        <div 
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                             linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '50px 50px'
          }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Repair/Troubleshoot Button */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          onClick={() => setShowRepairModal(true)}
          className="absolute -top-2 right-0 p-2 rounded-full bg-[var(--muted)] hover:bg-[var(--card)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--primary)] transition-all duration-200 z-20"
          title="Troubleshoot connection"
          data-testid="repair-btn"
        >
          <Wrench className="w-5 h-5" />
        </motion.button>

        {/* Logo */}
        <div className="text-center mb-8">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="w-24 h-24 mx-auto mb-6 relative"
          >
            {/* Glow effect behind logo */}
            <div className="absolute inset-0 bg-gradient-to-br from-[var(--primary)] to-[var(--accent-purple)] rounded-3xl blur-xl opacity-40" />
            <div className="relative w-full h-full bg-[var(--card)] rounded-3xl border border-[var(--border)] flex items-center justify-center overflow-hidden">
              <img 
                src="/icons/icon-192x192.png" 
                alt="FaceConnect Logo" 
                className="w-16 h-16 object-contain"
              />
            </div>
          </motion.div>
          <h1 className="text-4xl font-bold text-[var(--foreground)] font-['Syne'] tracking-tight">
            Face<span className="text-[var(--primary)]">Connect</span>
          </h1>
          <p className="text-[var(--text-secondary)] mt-2 font-['Manrope']">Biometric Social Network</p>
        </div>

        {/* Auth Card */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-[var(--card)] backdrop-blur-xl border border-[var(--border)] rounded-3xl p-6 shadow-2xl"
        >
          {/* Tabs */}
          <div className="flex gap-2 mb-6 p-1.5 bg-[var(--muted)] rounded-2xl">
            <button
              data-testid="login-tab"
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-300 ${
                isLogin
                  ? "bg-[var(--primary)] text-white shadow-lg"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              Sign In
            </button>
            <button
              data-testid="register-tab"
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-300 ${
                !isLogin
                  ? "bg-[var(--primary)] text-white shadow-lg"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              Create Account
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence mode="wait">
              {!isLogin && (
                <motion.div
                  key="register-fields"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4"
                >
                  <div>
                    <Label htmlFor="username" className="text-[var(--text-secondary)] mb-2 block">
                      Username
                    </Label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                      <Input
                        id="username"
                        data-testid="username-input"
                        placeholder="Choose a username"
                        value={formData.username}
                        onChange={handleChange("username")}
                        className="pl-11 h-12 bg-[var(--muted)] border-[var(--border)] text-[var(--text-primary)] rounded-xl focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]/20 placeholder:text-[var(--text-muted)]"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="displayName" className="text-[var(--text-secondary)] mb-2 block">
                      Display Name (optional)
                    </Label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                      <Input
                        id="displayName"
                        data-testid="display-name-input"
                        placeholder="Your display name"
                        value={formData.displayName}
                        onChange={handleChange("displayName")}
                        className="pl-11 h-12 bg-[var(--muted)] border-[var(--border)] text-[var(--text-primary)] rounded-xl focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]/20 placeholder:text-[var(--text-muted)]"
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div>
              <Label htmlFor="email" className="text-[var(--text-secondary)] mb-2 block text-sm font-medium">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                <Input
                  id="email"
                  type="email"
                  data-testid="email-input"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={handleChange("email")}
                  required
                  className="pl-11 h-12 bg-[var(--muted)] border-[var(--border)] text-[var(--text-primary)] rounded-xl focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]/20 placeholder:text-[var(--text-muted)]"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="password" className="text-[var(--text-secondary)] mb-2 block text-sm font-medium">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  data-testid="password-input"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange("password")}
                  required
                  className="pl-11 pr-12 h-12 bg-[var(--muted)] border-[var(--border)] text-[var(--text-primary)] rounded-xl focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]/20 placeholder:text-[var(--text-muted)]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              data-testid="auth-submit-btn"
              disabled={loading}
              className="w-full h-12 bg-[var(--primary)] hover:bg-[var(--primary-dark)] hover:shadow-lg hover:shadow-[var(--primary)]/25 text-white font-bold text-sm rounded-full transition-all duration-300"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  {isLogin ? "Sign In" : "Create Account"}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-[var(--border)]" />
            <span className="text-[var(--text-muted)] text-xs uppercase tracking-wider">or continue with</span>
            <div className="flex-1 h-px bg-[var(--border)]" />
          </div>

          {/* Social Login Buttons */}
          <div className="space-y-3">
            <Button
              type="button"
              data-testid="google-login-btn"
              onClick={handleGoogleLogin}
              disabled={socialLoading === 'google'}
              className="w-full h-12 bg-white hover:bg-gray-50 text-gray-900 font-semibold rounded-full flex items-center justify-center gap-3 transition-all duration-200"
            >
              {socialLoading === 'google' ? (
                <div className="w-5 h-5 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <GoogleIcon />
                  Continue with Google
                </>
              )}
            </Button>

            <Button
              type="button"
              data-testid="apple-login-btn"
              onClick={handleAppleLogin}
              disabled={socialLoading === 'apple'}
              className="w-full h-12 bg-[var(--card)] hover:bg-[var(--muted)] text-[var(--text-primary)] font-semibold rounded-full flex items-center justify-center gap-3 border border-[var(--border)] transition-all duration-200"
            >
              {socialLoading === 'apple' ? (
                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <AppleIcon />
                  Continue with Apple
                </>
              )}
            </Button>

            <Button
              type="button"
              data-testid="facebook-login-btn"
              onClick={handleFacebookLogin}
              disabled={socialLoading === 'facebook'}
              className="w-full h-12 bg-[#1877F2] hover:bg-[#166FE5] text-white font-semibold rounded-full flex items-center justify-center gap-3 transition-all duration-200"
            >
              {socialLoading === 'facebook' ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <FacebookIcon />
                  Continue with Facebook
                </>
              )}
            </Button>
          </div>

          {/* Google Play Store Badge */}
          <div className="mt-6 pt-6 border-t border-[var(--border)]">
            <p className="text-center text-[var(--text-muted)] text-xs mb-3">Get the mobile app</p>
            <a
              href="https://play.google.com/store/apps/details?id=com.faceconnect.app"
              target="_blank"
              rel="noopener noreferrer"
              className="flex justify-center"
              data-testid="google-play-badge"
            >
              <img
                src="https://play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png"
                alt="Get it on Google Play"
                className="h-14 hover:opacity-80 transition-opacity"
              />
            </a>
          </div>
        </motion.div>

        {/* Terms */}
        <p className="text-center mt-6 text-[var(--text-muted)] text-xs">
          By continuing, you agree to our{" "}
          <a href="/privacy" className="text-[var(--primary)] hover:underline">Privacy Policy</a>
          {" "}and{" "}
          <a href="/terms" className="text-[var(--primary)] hover:underline">Terms of Service</a>
        </p>
      </motion.div>

      {/* Repair/Troubleshoot Modal */}
      <AnimatePresence>
        {showRepairModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowRepairModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[var(--card)] rounded-3xl p-6 w-full max-w-sm border border-[var(--border)] shadow-2xl"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center">
                    <Wrench className="w-5 h-5 text-[var(--primary)]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[var(--text-primary)]">Troubleshoot</h3>
                    <p className="text-xs text-[var(--text-muted)]">Connection diagnostics</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowRepairModal(false)}
                  className="p-2 rounded-full hover:bg-[var(--muted)] transition-colors"
                >
                  <X className="w-5 h-5 text-[var(--text-muted)]" />
                </button>
              </div>

              {/* Server Info */}
              <div className="mb-4 p-3 bg-[var(--muted)] rounded-xl">
                <p className="text-xs text-[var(--text-muted)] mb-1">Server URL</p>
                <p className="text-sm text-[var(--text-primary)] font-mono break-all">{API || 'Not configured'}</p>
              </div>

              {/* Connection Status */}
              <div className="mb-6 p-4 bg-[var(--muted)] rounded-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {repairStatus.checking ? (
                      <div className="w-8 h-8 rounded-full bg-[var(--primary)]/10 flex items-center justify-center">
                        <RefreshCw className="w-4 h-4 text-[var(--primary)] animate-spin" />
                      </div>
                    ) : repairStatus.connection === 'success' ? (
                      <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      </div>
                    ) : repairStatus.connection === 'error' ? (
                      <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center">
                        <AlertCircle className="w-4 h-4 text-red-500" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-[var(--text-muted)]/10 flex items-center justify-center">
                        <Wifi className="w-4 h-4 text-[var(--text-muted)]" />
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium text-[var(--text-primary)]">
                        {repairStatus.checking ? 'Testing...' : 
                         repairStatus.connection === 'success' ? 'Connected' :
                         repairStatus.connection === 'error' ? 'Connection Failed' :
                         'Not Tested'}
                      </p>
                      <p className="text-xs text-[var(--text-muted)]">Backend API</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-3">
                <Button
                  onClick={testConnection}
                  disabled={repairStatus.checking}
                  className="w-full h-11 bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white font-semibold rounded-xl flex items-center justify-center gap-2"
                  data-testid="test-connection-btn"
                >
                  {repairStatus.checking ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Wifi className="w-4 h-4" />
                  )}
                  Test Connection
                </Button>

                <Button
                  onClick={clearLocalData}
                  variant="outline"
                  className="w-full h-11 bg-transparent hover:bg-[var(--muted)] text-[var(--text-primary)] font-semibold rounded-xl flex items-center justify-center gap-2 border border-[var(--border)]"
                  data-testid="clear-data-btn"
                >
                  <Trash2 className="w-4 h-4" />
                  Clear Local Data
                </Button>

                <Button
                  onClick={reloadApp}
                  variant="outline"
                  className="w-full h-11 bg-transparent hover:bg-[var(--muted)] text-[var(--text-primary)] font-semibold rounded-xl flex items-center justify-center gap-2 border border-[var(--border)]"
                  data-testid="reload-app-btn"
                >
                  <RefreshCw className="w-4 h-4" />
                  Reload App
                </Button>
              </div>

              {/* Help Text */}
              <p className="mt-4 text-xs text-[var(--text-muted)] text-center">
                If you're having login issues, make sure you have an account. 
                <br />Use "Create Account" to register first.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
