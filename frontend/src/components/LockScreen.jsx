import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Fingerprint, Shield, AlertCircle, Unlock, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  authenticateWithBiometric, 
  isBiometricEnabled,
  isPlatformAuthenticatorAvailable,
  refreshAuthSession
} from "@/utils/biometric";
import { haptic } from "@/utils/mobile";

export const LockScreen = ({ onUnlock }) => {
  const [authenticating, setAuthenticating] = useState(false);
  const [error, setError] = useState(null);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [showPinFallback, setShowPinFallback] = useState(false);
  const [pin, setPin] = useState("");
  const [attempts, setAttempts] = useState(0);

  // Check biometric availability
  useEffect(() => {
    const checkBiometric = async () => {
      const available = await isPlatformAuthenticatorAvailable();
      setBiometricAvailable(available && isBiometricEnabled());
    };
    checkBiometric();
  }, []);

  // Auto-trigger biometric on mount
  useEffect(() => {
    if (biometricAvailable) {
      handleBiometricAuth();
    }
  }, [biometricAvailable]);

  const handleBiometricAuth = async () => {
    if (authenticating) return;
    
    setAuthenticating(true);
    setError(null);
    haptic.light();

    try {
      const result = await authenticateWithBiometric();
      
      if (result.success) {
        haptic.success();
        refreshAuthSession();
        onUnlock();
      } else {
        haptic.error();
        setError(result.error || "Authentication failed");
        setAttempts(prev => prev + 1);
      }
    } catch (err) {
      haptic.error();
      setError(err.message);
      setAttempts(prev => prev + 1);
    } finally {
      setAuthenticating(false);
    }
  };

  const handlePinSubmit = (e) => {
    e.preventDefault();
    
    // Simple PIN verification (stored in localStorage for demo)
    const storedPin = localStorage.getItem('app_pin') || '1234';
    
    if (pin === storedPin) {
      haptic.success();
      refreshAuthSession();
      onUnlock();
    } else {
      haptic.error();
      setError("Incorrect PIN");
      setPin("");
      setAttempts(prev => prev + 1);
    }
  };

  const handlePinChange = (value) => {
    // Only allow numbers
    const numericValue = value.replace(/[^0-9]/g, '');
    if (numericValue.length <= 6) {
      setPin(numericValue);
      setError(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] bg-[#0A0A0A] flex flex-col items-center justify-center p-6"
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 grid-texture opacity-30" />
      
      {/* Glow Effect */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-[#00F0FF]/10 rounded-full blur-[100px]" />

      <div className="relative z-10 w-full max-w-sm">
        {/* Logo */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col items-center mb-8"
        >
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#00F0FF] to-[#7000FF] flex items-center justify-center mb-4 shadow-lg shadow-[#00F0FF]/30">
            <Shield className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white font-['Outfit']">FaceConnect</h1>
          <p className="text-gray-500 text-sm mt-1">Unlock to continue</p>
        </motion.div>

        {/* Error Message */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6 p-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-3"
            >
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <p className="text-red-400 text-sm">{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Biometric Authentication */}
        {!showPinFallback && biometricAvailable && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-4"
          >
            <button
              data-testid="biometric-unlock-btn"
              onClick={handleBiometricAuth}
              disabled={authenticating}
              className="w-full p-6 rounded-2xl bg-[#1A1A1A] border border-white/10 hover:border-[#00F0FF]/30 transition-colors flex flex-col items-center gap-4 group"
            >
              <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${
                authenticating 
                  ? 'bg-[#00F0FF]/20 animate-pulse' 
                  : 'bg-[#00F0FF]/10 group-hover:bg-[#00F0FF]/20'
              }`}>
                <Fingerprint className={`w-8 h-8 ${
                  authenticating ? 'text-[#00F0FF] animate-pulse' : 'text-[#00F0FF]'
                }`} />
              </div>
              <div className="text-center">
                <p className="text-white font-medium">
                  {authenticating ? 'Authenticating...' : 'Touch to unlock'}
                </p>
                <p className="text-gray-500 text-sm mt-1">
                  Use fingerprint or Face ID
                </p>
              </div>
            </button>

            <button
              onClick={() => setShowPinFallback(true)}
              className="w-full py-3 text-gray-500 hover:text-gray-400 text-sm transition-colors"
            >
              Use PIN instead
            </button>
          </motion.div>
        )}

        {/* PIN Fallback */}
        {(showPinFallback || !biometricAvailable) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <form onSubmit={handlePinSubmit} className="space-y-4">
              <div className="relative">
                <Input
                  data-testid="pin-input"
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={pin}
                  onChange={(e) => handlePinChange(e.target.value)}
                  placeholder="Enter PIN"
                  className="bg-[#1A1A1A] border-white/10 text-white text-center text-2xl tracking-[0.5em] h-14 focus:border-[#00F0FF]"
                  maxLength={6}
                  autoFocus
                />
              </div>

              {/* PIN Dots Indicator */}
              <div className="flex justify-center gap-3">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className={`w-3 h-3 rounded-full transition-colors ${
                      i < pin.length ? 'bg-[#00F0FF]' : 'bg-white/10'
                    }`}
                  />
                ))}
              </div>

              <Button
                data-testid="pin-submit-btn"
                type="submit"
                disabled={pin.length < 4}
                className="w-full bg-gradient-to-r from-[#00F0FF] to-[#7000FF] hover:opacity-90 text-white h-12"
              >
                <Unlock className="w-5 h-5 mr-2" />
                Unlock
              </Button>
            </form>

            {biometricAvailable && (
              <button
                onClick={() => {
                  setShowPinFallback(false);
                  setPin("");
                  setError(null);
                }}
                className="w-full py-3 text-gray-500 hover:text-gray-400 text-sm transition-colors flex items-center justify-center gap-2"
              >
                <Fingerprint className="w-4 h-4" />
                Use biometrics instead
              </button>
            )}
          </motion.div>
        )}

        {/* Too Many Attempts Warning */}
        {attempts >= 3 && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-6 text-center text-yellow-500 text-sm"
          >
            Too many failed attempts. Please try again later.
          </motion.p>
        )}
      </div>

      {/* Version */}
      <p className="absolute bottom-6 text-gray-600 text-xs">
        FaceConnect v1.0
      </p>
    </motion.div>
  );
};

export default LockScreen;
