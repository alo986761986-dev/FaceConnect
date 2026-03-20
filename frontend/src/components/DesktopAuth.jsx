import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Mail, Lock, Eye, EyeOff, Loader2, Smartphone,
  ChevronRight, Shield, Zap, Users, ArrowLeft, KeyRound
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

const API_URL = process.env.REACT_APP_BACKEND_URL || 'https://profile-connector-3.preview.emergentagent.com';

// Social Auth Icons
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

export default function DesktopAuth() {
  const { login, register } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showEmailAuth, setShowEmailAuth] = useState(false); // New: toggle for email/password form
  
  // Forgot password states
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordStep, setForgotPasswordStep] = useState(1); // 1: email, 2: code, 3: new password
  const [resetEmail, setResetEmail] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    username: "",
    displayName: ""
  });

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        await login(formData.email, formData.password);
        toast.success("Welcome back!");
      } else {
        await register(formData.email, formData.password, formData.username, formData.displayName);
        toast.success("Account created successfully!");
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || error.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  // Forgot Password Step 1: Request reset code
  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await fetch(`${API_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail })
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success("Reset code sent! Check your email.");
        setForgotPasswordStep(2);
      } else {
        toast.error(data.message || "Failed to send reset code");
      }
    } catch (error) {
      toast.error("Failed to send reset code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Forgot Password Step 2: Verify code
  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await fetch(`${API_URL}/api/auth/verify-reset-code?email=${encodeURIComponent(resetEmail)}&code=${encodeURIComponent(resetCode)}`, {
        method: 'POST'
      });
      
      const data = await response.json();
      
      if (data.success) {
        setResetToken(data.reset_token);
        setForgotPasswordStep(3);
        toast.success("Code verified! Set your new password.");
      } else {
        toast.error("Invalid or expired code");
      }
    } catch (error) {
      toast.error("Invalid or expired code");
    } finally {
      setLoading(false);
    }
  };

  // Forgot Password Step 3: Set new password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }
    
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await fetch(`${API_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: resetToken, new_password: newPassword })
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success("Password reset successfully! Please login.");
        // Reset all states
        setShowForgotPassword(false);
        setForgotPasswordStep(1);
        setResetEmail("");
        setResetCode("");
        setResetToken("");
        setNewPassword("");
        setConfirmPassword("");
        setIsLogin(true);
      } else {
        toast.error(data.message || "Failed to reset password");
      }
    } catch (error) {
      toast.error("Failed to reset password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const resetForgotPassword = () => {
    setShowForgotPassword(false);
    setForgotPasswordStep(1);
    setResetEmail("");
    setResetCode("");
    setResetToken("");
    setNewPassword("");
    setConfirmPassword("");
  };

  // State for Google Auth popup window
  const [showGoogleAuthWindow, setShowGoogleAuthWindow] = useState(false);
  const [googleAuthUrl, setGoogleAuthUrl] = useState('');

  const handleSocialAuth = async (provider) => {
    setSocialLoading(provider);
    
    try {
      // Check if we're in Electron
      const isElectronApp = window.electronAPI?.isElectron || 
        (typeof process !== 'undefined' && process.versions && process.versions.electron);
      
      // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS, THIS BREAKS THE AUTH
      // Build redirect URL dynamically based on current location
      const redirectUrl = window.location.origin + '/auth/callback';
      
      let authUrl;
      
      if (provider === 'google') {
        // Use Emergent's auth service for Google OAuth
        authUrl = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
      } else if (provider === 'facebook') {
        // Facebook OAuth - requires FB_APP_ID in environment
        const fbAppId = process.env.REACT_APP_FACEBOOK_APP_ID;
        if (!fbAppId) {
          toast.info("Facebook sign-in requires configuration", {
            description: "Contact admin to enable Facebook authentication",
            duration: 5000
          });
          setSocialLoading(null);
          return;
        }
        const fbScopes = 'email,public_profile';
        authUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${fbAppId}&redirect_uri=${encodeURIComponent(redirectUrl)}&scope=${fbScopes}&response_type=code&state=facebook`;
      } else if (provider === 'apple') {
        // Apple OAuth - requires Apple Developer configuration
        const appleClientId = process.env.REACT_APP_APPLE_CLIENT_ID;
        if (!appleClientId) {
          toast.info("Apple sign-in requires configuration", {
            description: "Contact admin to enable Apple authentication",
            duration: 5000
          });
          setSocialLoading(null);
          return;
        }
        authUrl = `https://appleid.apple.com/auth/authorize?client_id=${appleClientId}&redirect_uri=${encodeURIComponent(redirectUrl)}&response_type=code&scope=name%20email&response_mode=form_post&state=apple`;
      } else {
        toast.error("Unknown authentication provider");
        setSocialLoading(null);
        return;
      }

      // Store that we're waiting for OAuth callback
      localStorage.setItem('oauth_pending', provider);

      // For Electron: Open auth in embedded popup window
      if (isElectronApp && provider === 'google') {
        setGoogleAuthUrl(authUrl);
        setShowGoogleAuthWindow(true);
        setSocialLoading(null);
        return;
      }
      
      // For Electron with other providers: Use shell.openExternal
      if (isElectronApp && window.electronAPI?.openExternal) {
        window.electronAPI.openExternal(authUrl);
        
        toast.info(`Please complete sign-in in your browser`, {
          duration: 10000,
          description: "You'll be redirected back after signing in"
        });
        
        setSocialLoading(null);
        return;
      }

      // For web: Redirect to OAuth
      window.location.href = authUrl;

    } catch (error) {
      console.error('Social auth error:', error);
      toast.error(`${provider} authentication failed`);
      setSocialLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a1628] via-[#111b21] to-[#0d1f2d] flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center items-center p-12 relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-20 left-20 w-72 h-72 bg-[#00a884] rounded-full filter blur-[100px]" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-[#0088cc] rounded-full filter blur-[120px]" />
        </div>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 text-center"
        >
          {/* Logo */}
          <div className="w-24 h-24 mx-auto mb-8 rounded-3xl bg-gradient-to-br from-[#00a884] to-[#0088cc] flex items-center justify-center">
            <span className="text-4xl font-bold text-white">FC</span>
          </div>
          
          <h1 className="text-4xl font-bold text-white mb-4">
            FaceConnect Desktop
          </h1>
          <p className="text-gray-400 text-lg mb-12 max-w-md">
            Connect with friends and family instantly. Fast, secure, and always in sync.
          </p>

          {/* Features */}
          <div className="space-y-4 text-left max-w-sm mx-auto">
            {[
              { icon: Shield, text: "End-to-end encrypted messages" },
              { icon: Zap, text: "Lightning fast performance" },
              { icon: Users, text: "Group chats and video calls" },
              { icon: Smartphone, text: "Sync across all your devices" }
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.1 }}
                className="flex items-center gap-3 text-gray-300"
              >
                <feature.icon className="w-5 h-5 text-[#00a884]" />
                <span>{feature.text}</span>
              </motion.div>
            ))}
          </div>

          {/* Mobile App Download */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-12 p-4 rounded-xl bg-white/5 border border-white/10"
          >
            <p className="text-gray-400 text-sm mb-3">Get the mobile app</p>
            <div className="flex gap-3 justify-center">
              <a 
                href="https://play.google.com/store/apps/details?id=com.faceconnect.app" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-black rounded-lg hover:bg-gray-900 transition-colors"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="currentColor">
                  <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z"/>
                </svg>
                <div className="text-left">
                  <div className="text-[10px] text-gray-400">GET IT ON</div>
                  <div className="text-sm text-white font-medium">Google Play</div>
                </div>
              </a>
              <a 
                href="https://apps.apple.com/app/faceconnect" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-black rounded-lg hover:bg-gray-900 transition-colors"
              >
                <AppleIcon />
                <div className="text-left">
                  <div className="text-[10px] text-gray-400">Download on the</div>
                  <div className="text-sm text-white font-medium">App Store</div>
                </div>
              </a>
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* Right Panel - Auth Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md"
        >
          <div className="bg-[#202c33] rounded-2xl p-8 shadow-2xl border border-white/10">
            {/* Header */}
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-white mb-2">
                {isLogin ? "Welcome Back" : "Create Account"}
              </h2>
              <p className="text-gray-400">
                {isLogin ? "Sign in to continue to FaceConnect" : "Sign up to get started"}
              </p>
            </div>

            {/* Social Auth Buttons */}
            <div className="space-y-3 mb-6">
              {/* Google - Primary Action */}
              <Button
                variant="outline"
                className="w-full h-14 bg-white hover:bg-gray-100 text-gray-800 border-0 text-base font-medium"
                onClick={() => handleSocialAuth('google')}
                disabled={socialLoading !== null}
              >
                {socialLoading === 'google' ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <GoogleIcon />
                    <span className="ml-3">Continue with Google</span>
                  </>
                )}
              </Button>

              {/* Other Auth Options - Collapsible */}
              {!showEmailAuth && (
                <button
                  type="button"
                  onClick={() => setShowEmailAuth(true)}
                  className="w-full text-center text-gray-400 hover:text-white text-sm py-2 transition-colors"
                >
                  Other sign-in options
                </button>
              )}

              <AnimatePresence>
                {showEmailAuth && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-3 overflow-hidden"
                  >
                    <Button
                      variant="outline"
                      className="w-full h-12 bg-black hover:bg-gray-900 text-white border-0"
                      onClick={() => handleSocialAuth('apple')}
                      disabled={socialLoading !== null}
                    >
                      {socialLoading === 'apple' ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          <AppleIcon />
                          <span className="ml-3">Continue with Apple</span>
                        </>
                      )}
                    </Button>

                    <Button
                      variant="outline"
                      className="w-full h-12 bg-[#1877F2] hover:bg-[#1877F2]/90 text-white border-0"
                      onClick={() => handleSocialAuth('facebook')}
                      disabled={socialLoading !== null}
                    >
                      {socialLoading === 'facebook' ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          <FacebookIcon />
                          <span className="ml-3">Continue with Facebook</span>
                        </>
                      )}
                    </Button>

                    {/* Divider */}
                    <div className="relative my-6">
                      <Separator className="bg-white/10" />
                      <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#202c33] px-4 text-gray-500 text-sm">
                        or use email
                      </span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Email/Password Form - Only shown when showEmailAuth is true */}
            {showEmailAuth && (
              <form onSubmit={handleSubmit} className="space-y-4">
                {!isLogin && (
                <>
                  <div>
                    <Label className="text-gray-400 text-sm">Username</Label>
                    <Input
                      name="username"
                      placeholder="johndoe"
                      value={formData.username}
                      onChange={handleChange}
                      className="mt-1 bg-[#2a3942] border-white/10 text-white placeholder:text-gray-500 focus:border-[#00a884]"
                      required={!isLogin}
                    />
                  </div>
                  <div>
                    <Label className="text-gray-400 text-sm">Display Name</Label>
                    <Input
                      name="displayName"
                      placeholder="John Doe"
                      value={formData.displayName}
                      onChange={handleChange}
                      className="mt-1 bg-[#2a3942] border-white/10 text-white placeholder:text-gray-500 focus:border-[#00a884]"
                      required={!isLogin}
                    />
                  </div>
                </>
              )}

              <div>
                <Label className="text-gray-400 text-sm">Email</Label>
                <div className="relative mt-1">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <Input
                    type="email"
                    name="email"
                    placeholder="you@example.com"
                    value={formData.email}
                    onChange={handleChange}
                    className="pl-10 bg-[#2a3942] border-white/10 text-white placeholder:text-gray-500 focus:border-[#00a884]"
                    required
                  />
                </div>
              </div>

              <div>
                <Label className="text-gray-400 text-sm">Password</Label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleChange}
                    className="pl-10 pr-10 bg-[#2a3942] border-white/10 text-white placeholder:text-gray-500 focus:border-[#00a884]"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-400"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {isLogin && (
                <div className="text-right">
                  <button 
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="text-sm text-[#00a884] hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-12 bg-[#00a884] hover:bg-[#00a884]/90 text-white font-medium"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    {isLogin ? "Sign In" : "Create Account"}
                    <ChevronRight className="w-5 h-5 ml-2" />
                  </>
                )}
              </Button>
            </form>
            )}

            {/* Toggle Login/Register */}
            {showEmailAuth && (
              <p className="mt-6 text-center text-gray-400">
                {isLogin ? "Don't have an account?" : "Already have an account?"}
                <button
                  onClick={() => setIsLogin(!isLogin)}
                  className="ml-2 text-[#00a884] hover:underline font-medium"
                >
                  {isLogin ? "Sign up" : "Sign in"}
                </button>
              </p>
            )}
          </div>

          {/* Mobile Download Link (for mobile view) */}
          <div className="lg:hidden mt-6 text-center">
            <p className="text-gray-400 text-sm mb-3">Get the mobile app</p>
            <div className="flex gap-3 justify-center">
              <a 
                href="https://play.google.com/store/apps/details?id=com.faceconnect.app" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-[#00a884] hover:underline text-sm"
              >
                Google Play
              </a>
              <span className="text-gray-600">•</span>
              <a 
                href="https://apps.apple.com/app/faceconnect" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-[#00a884] hover:underline text-sm"
              >
                App Store
              </a>
            </div>
          </div>

          {/* Footer */}
          <p className="mt-6 text-center text-gray-500 text-xs">
            By continuing, you agree to our{" "}
            <a href="/terms" className="text-[#00a884] hover:underline">Terms of Service</a>
            {" "}and{" "}
            <a href="/privacy" className="text-[#00a884] hover:underline">Privacy Policy</a>
          </p>
        </motion.div>
      </div>

      {/* Forgot Password Modal */}
      <AnimatePresence>
        {showForgotPassword && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
            onClick={(e) => e.target === e.currentTarget && resetForgotPassword()}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#202c33] rounded-2xl p-8 w-full max-w-md border border-white/10"
            >
              {/* Back button */}
              <button
                onClick={() => {
                  if (forgotPasswordStep > 1) {
                    setForgotPasswordStep(forgotPasswordStep - 1);
                  } else {
                    resetForgotPassword();
                  }
                }}
                className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Back</span>
              </button>

              {/* Step 1: Enter Email */}
              {forgotPasswordStep === 1 && (
                <form onSubmit={handleForgotPassword}>
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-[#00a884]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Mail className="w-8 h-8 text-[#00a884]" />
                    </div>
                    <h3 className="text-xl font-bold text-white">Forgot Password?</h3>
                    <p className="text-gray-400 mt-2">
                      Enter your email and we'll send you a reset code
                    </p>
                  </div>
                  
                  <div className="mb-6">
                    <Label className="text-gray-400 text-sm">Email Address</Label>
                    <Input
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="mt-1 bg-[#2a3942] border-white/10 text-white placeholder:text-gray-500 focus:border-[#00a884]"
                      required
                    />
                  </div>
                  
                  <Button
                    type="submit"
                    className="w-full h-12 bg-[#00a884] hover:bg-[#00a884]/90 text-white"
                    disabled={loading}
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Send Reset Code"}
                  </Button>
                </form>
              )}

              {/* Step 2: Enter Code */}
              {forgotPasswordStep === 2 && (
                <form onSubmit={handleVerifyCode}>
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-[#00a884]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <KeyRound className="w-8 h-8 text-[#00a884]" />
                    </div>
                    <h3 className="text-xl font-bold text-white">Enter Reset Code</h3>
                    <p className="text-gray-400 mt-2">
                      We sent a 6-digit code to {resetEmail}
                    </p>
                  </div>
                  
                  <div className="mb-6">
                    <Label className="text-gray-400 text-sm">Reset Code</Label>
                    <Input
                      type="text"
                      value={resetCode}
                      onChange={(e) => setResetCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="000000"
                      className="mt-1 bg-[#2a3942] border-white/10 text-white placeholder:text-gray-500 focus:border-[#00a884] text-center text-2xl tracking-widest"
                      maxLength={6}
                      required
                    />
                  </div>
                  
                  <Button
                    type="submit"
                    className="w-full h-12 bg-[#00a884] hover:bg-[#00a884]/90 text-white"
                    disabled={loading || resetCode.length !== 6}
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verify Code"}
                  </Button>
                  
                  <p className="mt-4 text-center text-gray-400 text-sm">
                    Didn't receive the code?{" "}
                    <button
                      type="button"
                      onClick={() => setForgotPasswordStep(1)}
                      className="text-[#00a884] hover:underline"
                    >
                      Resend
                    </button>
                  </p>
                </form>
              )}

              {/* Step 3: New Password */}
              {forgotPasswordStep === 3 && (
                <form onSubmit={handleResetPassword}>
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-[#00a884]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Lock className="w-8 h-8 text-[#00a884]" />
                    </div>
                    <h3 className="text-xl font-bold text-white">Set New Password</h3>
                    <p className="text-gray-400 mt-2">
                      Create a strong password for your account
                    </p>
                  </div>
                  
                  <div className="space-y-4 mb-6">
                    <div>
                      <Label className="text-gray-400 text-sm">New Password</Label>
                      <div className="relative mt-1">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                        <Input
                          type={showPassword ? "text" : "password"}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="••••••••"
                          className="pl-10 bg-[#2a3942] border-white/10 text-white placeholder:text-gray-500 focus:border-[#00a884]"
                          required
                          minLength={8}
                        />
                      </div>
                    </div>
                    
                    <div>
                      <Label className="text-gray-400 text-sm">Confirm Password</Label>
                      <div className="relative mt-1">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                        <Input
                          type={showPassword ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="••••••••"
                          className="pl-10 bg-[#2a3942] border-white/10 text-white placeholder:text-gray-500 focus:border-[#00a884]"
                          required
                          minLength={8}
                        />
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="showPasswordCheck"
                        checked={showPassword}
                        onChange={(e) => setShowPassword(e.target.checked)}
                        className="rounded border-gray-600"
                      />
                      <label htmlFor="showPasswordCheck" className="text-gray-400 text-sm">
                        Show passwords
                      </label>
                    </div>
                  </div>
                  
                  <Button
                    type="submit"
                    className="w-full h-12 bg-[#00a884] hover:bg-[#00a884]/90 text-white"
                    disabled={loading || newPassword.length < 8 || newPassword !== confirmPassword}
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Reset Password"}
                  </Button>
                </form>
              )}
            </motion.div>
          </motion.div>
        )}

        {/* Google Auth Embedded Window */}
        {showGoogleAuthWindow && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-xl w-full max-w-lg h-[600px] overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 bg-gray-100 border-b">
                <div className="flex items-center gap-2">
                  <GoogleIcon />
                  <span className="font-medium text-gray-800">Sign in with Google</span>
                </div>
                <button
                  onClick={() => {
                    setShowGoogleAuthWindow(false);
                    setGoogleAuthUrl('');
                    localStorage.removeItem('oauth_pending');
                  }}
                  className="p-1 hover:bg-gray-200 rounded-full transition-colors"
                >
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {/* Webview for Google Auth */}
              <div className="flex-1 relative">
                <webview
                  src={googleAuthUrl}
                  style={{ width: '100%', height: '100%' }}
                  allowpopups="true"
                  partition="persist:google-auth"
                  ref={(webview) => {
                    if (webview) {
                      webview.addEventListener('did-navigate', (e) => {
                        // Check if we've reached the callback URL
                        if (e.url.includes('/auth/callback')) {
                          setShowGoogleAuthWindow(false);
                          // Navigate to the callback URL in the main window
                          const callbackUrl = new URL(e.url);
                          window.location.href = '/auth/callback' + callbackUrl.search;
                        }
                      });
                      
                      webview.addEventListener('did-navigate-in-page', (e) => {
                        if (e.url.includes('/auth/callback')) {
                          setShowGoogleAuthWindow(false);
                          const callbackUrl = new URL(e.url);
                          window.location.href = '/auth/callback' + callbackUrl.search;
                        }
                      });
                    }
                  }}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
