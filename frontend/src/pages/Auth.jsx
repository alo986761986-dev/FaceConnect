import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Mail, Lock, User, ArrowRight, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";

export default function Auth() {
  const navigate = useNavigate();
  const { login, register } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    username: "",
    displayName: ""
  });

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

  const handleChange = (field) => (e) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4">
            <img 
              src="/icons/icon-192x192.png" 
              alt="FaceConnect Logo" 
              className="w-full h-full object-contain"
            />
          </div>
          <h1 className="text-3xl font-bold text-white font-['Outfit']">FaceConnect</h1>
          <p className="text-gray-500 mt-2">Social Network Tracker</p>
        </div>

        {/* Auth Card */}
        <div className="bg-[#121212] border border-white/10 rounded-2xl p-6">
          {/* Tabs */}
          <div className="flex gap-2 mb-6 p-1 bg-[#0A0A0A] rounded-lg">
            <button
              data-testid="login-tab"
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                isLogin
                  ? "bg-gradient-to-r from-[#00F0FF] to-[#7000FF] text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Sign In
            </button>
            <button
              data-testid="register-tab"
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                !isLogin
                  ? "bg-gradient-to-r from-[#00F0FF] to-[#7000FF] text-white"
                  : "text-gray-400 hover:text-white"
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
                    <Label htmlFor="username" className="text-gray-400 mb-2 block">
                      Username
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <Input
                        id="username"
                        data-testid="username-input"
                        placeholder="Choose a username"
                        value={formData.username}
                        onChange={handleChange("username")}
                        className="pl-10 bg-[#1A1A1A] border-white/10 text-white focus:border-[#00F0FF]"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="displayName" className="text-gray-400 mb-2 block">
                      Display Name (optional)
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <Input
                        id="displayName"
                        data-testid="display-name-input"
                        placeholder="Your display name"
                        value={formData.displayName}
                        onChange={handleChange("displayName")}
                        className="pl-10 bg-[#1A1A1A] border-white/10 text-white focus:border-[#00F0FF]"
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div>
              <Label htmlFor="email" className="text-gray-400 mb-2 block">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  id="email"
                  type="email"
                  data-testid="email-input"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={handleChange("email")}
                  required
                  className="pl-10 bg-[#1A1A1A] border-white/10 text-white focus:border-[#00F0FF]"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="password" className="text-gray-400 mb-2 block">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  data-testid="password-input"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange("password")}
                  required
                  className="pl-10 pr-10 bg-[#1A1A1A] border-white/10 text-white focus:border-[#00F0FF]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              data-testid="auth-submit-btn"
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#00F0FF] to-[#7000FF] hover:opacity-90 text-white font-medium py-5"
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
        </div>

        {/* Skip Auth - temporary for development */}
        <p className="text-center mt-6 text-gray-500 text-sm">
          By continuing, you agree to our Terms of Service
        </p>
      </motion.div>
    </div>
  );
}
