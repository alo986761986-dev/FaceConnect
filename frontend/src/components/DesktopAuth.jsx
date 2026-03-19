import { useState } from "react";
import { motion } from "framer-motion";
import { 
  Mail, Lock, Eye, EyeOff, Loader2, Smartphone,
  ChevronRight, Shield, Zap, Users
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

const API_URL = process.env.REACT_APP_BACKEND_URL;

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
      toast.error(error.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSocialAuth = async (provider) => {
    setSocialLoading(provider);
    
    try {
      // For Emergent OAuth, we need to redirect to the OAuth URL
      // The OAuth flow will redirect back with a session_id
      const redirectUri = encodeURIComponent(window.location.origin + '/auth/callback');
      
      // Map provider to Emergent OAuth endpoint
      const oauthUrls = {
        google: `https://demobackend.emergentagent.com/auth/v1/env/oauth/google?redirect_uri=${redirectUri}`,
        facebook: `https://demobackend.emergentagent.com/auth/v1/env/oauth/facebook?redirect_uri=${redirectUri}`,
        apple: `https://demobackend.emergentagent.com/auth/v1/env/oauth/apple?redirect_uri=${redirectUri}`
      };

      const authUrl = oauthUrls[provider];
      
      if (!authUrl) {
        toast.error(`${provider} authentication is not available`);
        setSocialLoading(null);
        return;
      }

      // Open OAuth popup/window
      const width = 500;
      const height = 600;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      
      const popup = window.open(
        authUrl,
        `${provider}Auth`,
        `width=${width},height=${height},left=${left},top=${top}`
      );

      // Check if popup was blocked
      if (!popup || popup.closed) {
        toast.error("Popup was blocked. Please allow popups for this site.");
        setSocialLoading(null);
        return;
      }

      // Poll for popup close and check for session
      const pollTimer = setInterval(async () => {
        try {
          // Check if popup is closed
          if (popup.closed) {
            clearInterval(pollTimer);
            setSocialLoading(null);
            return;
          }

          // Try to get the URL from popup (will fail due to cross-origin until redirect)
          try {
            const popupUrl = popup.location.href;
            
            // Check if we're back on our domain with session_id
            if (popupUrl.includes(window.location.origin) && popupUrl.includes('session_id=')) {
              const urlParams = new URLSearchParams(popup.location.search);
              const sessionId = urlParams.get('session_id');
              
              if (sessionId) {
                popup.close();
                clearInterval(pollTimer);
                
                // Exchange session_id for token
                const response = await fetch(`${API_URL}/api/auth/${provider}?session_id=${sessionId}`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' }
                });
                
                if (response.ok) {
                  const data = await response.json();
                  localStorage.setItem('auth_token', data.token);
                  toast.success(`Welcome, ${data.user.display_name}!`);
                  window.location.reload();
                } else {
                  toast.error(`${provider} authentication failed`);
                }
                setSocialLoading(null);
              }
            }
          } catch (e) {
            // Cross-origin error is expected while on OAuth provider's domain
          }
        } catch (e) {
          // Ignore errors during polling
        }
      }, 500);

      // Timeout after 5 minutes
      setTimeout(() => {
        clearInterval(pollTimer);
        if (popup && !popup.closed) {
          popup.close();
        }
        setSocialLoading(null);
      }, 300000);

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
              <Button
                variant="outline"
                className="w-full h-12 bg-white hover:bg-gray-100 text-gray-800 border-0"
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
            </div>

            {/* Divider */}
            <div className="relative my-6">
              <Separator className="bg-white/10" />
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#202c33] px-4 text-gray-500 text-sm">
                or
              </span>
            </div>

            {/* Email/Password Form */}
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
                  <a href="#" className="text-sm text-[#00a884] hover:underline">
                    Forgot password?
                  </a>
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

            {/* Toggle Login/Register */}
            <p className="mt-6 text-center text-gray-400">
              {isLogin ? "Don't have an account?" : "Already have an account?"}
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="ml-2 text-[#00a884] hover:underline font-medium"
              >
                {isLogin ? "Sign up" : "Sign in"}
              </button>
            </p>
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
    </div>
  );
}
