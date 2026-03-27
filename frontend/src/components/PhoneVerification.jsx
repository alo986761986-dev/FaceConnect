import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Phone, ArrowLeft, CheckCircle, AlertCircle, Loader2, 
  Shield, MessageSquare, RefreshCw 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useSettings } from "@/context/SettingsContext";
import { haptic } from "@/utils/mobile";

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Country codes for phone number selection
const COUNTRY_CODES = [
  { code: "+1", country: "US/CA", flag: "🇺🇸" },
  { code: "+39", country: "IT", flag: "🇮🇹" },
  { code: "+34", country: "ES", flag: "🇪🇸" },
  { code: "+7", country: "RU", flag: "🇷🇺" },
  { code: "+86", country: "CN", flag: "🇨🇳" },
  { code: "+44", country: "UK", flag: "🇬🇧" },
  { code: "+49", country: "DE", flag: "🇩🇪" },
  { code: "+33", country: "FR", flag: "🇫🇷" },
  { code: "+81", country: "JP", flag: "🇯🇵" },
  { code: "+82", country: "KR", flag: "🇰🇷" },
  { code: "+55", country: "BR", flag: "🇧🇷" },
  { code: "+52", country: "MX", flag: "🇲🇽" },
  { code: "+91", country: "IN", flag: "🇮🇳" },
  { code: "+61", country: "AU", flag: "🇦🇺" },
];

/**
 * PhoneVerification Component
 * Handles phone number verification with SMS OTP
 */
export default function PhoneVerification({ 
  isOpen, 
  onClose, 
  onVerified,
  token,
  userId,
  existingPhone = null 
}) {
  const { t } = useSettings();
  
  // State
  const [step, setStep] = useState(1); // 1: Enter phone, 2: Enter OTP, 3: Success
  const [countryCode, setCountryCode] = useState("+39"); // Default to Italy
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otpCode, setOtpCode] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendTimer, setResendTimer] = useState(0);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  
  // Refs for OTP inputs
  const otpRefs = useRef([]);

  // Resend timer countdown
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  // Auto-focus first OTP input when step 2
  useEffect(() => {
    if (step === 2 && otpRefs.current[0]) {
      otpRefs.current[0].focus();
    }
  }, [step]);

  // Format phone number for display
  const formatPhoneDisplay = (num) => {
    return num.replace(/(\d{3})(\d{3})(\d{4})/, "$1 $2 $3");
  };

  // Get full phone number
  const getFullPhoneNumber = () => {
    return `${countryCode}${phoneNumber.replace(/\D/g, '')}`;
  };

  // Send OTP
  const handleSendOTP = async () => {
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    
    if (cleanPhone.length < 8) {
      setError("Please enter a valid phone number");
      return;
    }

    setLoading(true);
    setError("");
    haptic.medium();

    try {
      const response = await fetch(`${API_URL}/api/phone/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone_number: getFullPhoneNumber() })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setStep(2);
        setResendTimer(60); // 60 seconds before resend
        toast.success("Verification code sent!");
        haptic.success();
      } else {
        setError(data.detail || "Failed to send verification code");
        toast.error(data.detail || "Failed to send code");
      }
    } catch (err) {
      console.error("Send OTP error:", err);
      setError("Network error. Please try again.");
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  };

  // Handle OTP input
  const handleOTPChange = (index, value) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;

    const newOtp = [...otpCode];
    newOtp[index] = value;
    setOtpCode(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all filled
    if (value && index === 5) {
      const fullCode = newOtp.join('');
      if (fullCode.length === 6) {
        handleVerifyOTP(fullCode);
      }
    }
  };

  // Handle OTP key down (backspace)
  const handleOTPKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otpCode[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  // Handle OTP paste
  const handleOTPPaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, '').slice(0, 6);
    
    if (pastedData.length > 0) {
      const newOtp = [...otpCode];
      for (let i = 0; i < pastedData.length && i < 6; i++) {
        newOtp[i] = pastedData[i];
      }
      setOtpCode(newOtp);
      
      // Focus last filled or next empty
      const lastIndex = Math.min(pastedData.length - 1, 5);
      otpRefs.current[lastIndex]?.focus();
      
      // Auto-submit if complete
      if (pastedData.length === 6) {
        handleVerifyOTP(pastedData);
      }
    }
  };

  // Verify OTP
  const handleVerifyOTP = async (code = null) => {
    const verifyCode = code || otpCode.join('');
    
    if (verifyCode.length !== 6) {
      setError("Please enter the complete 6-digit code");
      return;
    }

    setLoading(true);
    setError("");
    haptic.medium();

    try {
      // If we have userId and token, link to account
      const endpoint = userId && token 
        ? `${API_URL}/api/phone/link-to-account?token=${token}`
        : `${API_URL}/api/phone/verify-otp`;
      
      const body = userId && token
        ? { phone_number: getFullPhoneNumber(), code: verifyCode, user_id: userId }
        : { phone_number: getFullPhoneNumber(), code: verifyCode };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      const data = await response.json();

      if (response.ok && (data.valid || data.success)) {
        setStep(3);
        haptic.success();
        toast.success("Phone number verified!");
        
        // Notify parent
        if (onVerified) {
          onVerified(getFullPhoneNumber());
        }
        
        // Auto-close after success
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        setError(data.detail || "Invalid verification code");
        toast.error(data.detail || "Invalid code");
        // Clear OTP on error
        setOtpCode(["", "", "", "", "", ""]);
        otpRefs.current[0]?.focus();
      }
    } catch (err) {
      console.error("Verify OTP error:", err);
      setError("Network error. Please try again.");
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const handleResendOTP = async () => {
    if (resendTimer > 0) return;
    
    setOtpCode(["", "", "", "", "", ""]);
    await handleSendOTP();
  };

  // Reset and go back
  const handleBack = () => {
    if (step === 2) {
      setStep(1);
      setOtpCode(["", "", "", "", "", ""]);
      setError("");
    } else {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="w-full max-w-md bg-[#1a1a2e] rounded-2xl overflow-hidden shadow-2xl"
          data-testid="phone-verification-modal"
        >
          {/* Header */}
          <div className="relative p-6 pb-4 border-b border-white/10">
            <button
              onClick={handleBack}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full hover:bg-white/10 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <h2 className="text-xl font-semibold text-white text-center">
              {step === 1 && "Verify Phone Number"}
              {step === 2 && "Enter Verification Code"}
              {step === 3 && "Verified!"}
            </h2>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Step 1: Enter Phone Number */}
            {step === 1 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                {/* Icon */}
                <div className="flex justify-center">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500/20 to-cyan-500/20 flex items-center justify-center">
                    <Phone className="w-10 h-10 text-cyan-400" />
                  </div>
                </div>

                {/* Description */}
                <p className="text-gray-400 text-center text-sm">
                  We'll send a verification code to your phone via SMS
                </p>

                {/* Phone Input */}
                <div className="space-y-3">
                  <label className="text-sm text-gray-400">Phone Number</label>
                  <div className="flex gap-2">
                    {/* Country Code Selector */}
                    <div className="relative">
                      <button
                        onClick={() => setShowCountryPicker(!showCountryPicker)}
                        className="h-12 px-3 rounded-xl bg-[#252542] border border-white/10 text-white flex items-center gap-2 hover:border-cyan-500/50 transition-colors"
                      >
                        <span className="text-lg">
                          {COUNTRY_CODES.find(c => c.code === countryCode)?.flag || "🌐"}
                        </span>
                        <span>{countryCode}</span>
                      </button>
                      
                      {/* Country Picker Dropdown */}
                      <AnimatePresence>
                        {showCountryPicker && (
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="absolute top-full left-0 mt-2 w-48 max-h-60 overflow-y-auto bg-[#252542] rounded-xl border border-white/10 shadow-xl z-10"
                          >
                            {COUNTRY_CODES.map((c) => (
                              <button
                                key={c.code}
                                onClick={() => {
                                  setCountryCode(c.code);
                                  setShowCountryPicker(false);
                                }}
                                className={`w-full px-4 py-2 flex items-center gap-3 hover:bg-white/5 transition-colors ${
                                  countryCode === c.code ? 'bg-cyan-500/10 text-cyan-400' : 'text-white'
                                }`}
                              >
                                <span className="text-lg">{c.flag}</span>
                                <span>{c.country}</span>
                                <span className="text-gray-500 ml-auto">{c.code}</span>
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    
                    {/* Phone Number Input */}
                    <Input
                      type="tel"
                      placeholder="123 456 7890"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="flex-1 h-12 bg-[#252542] border-white/10 text-white text-lg tracking-wide"
                      data-testid="phone-input"
                    />
                  </div>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="flex items-center gap-2 text-red-400 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                  </div>
                )}

                {/* Send Button */}
                <Button
                  onClick={handleSendOTP}
                  disabled={loading || phoneNumber.length < 8}
                  className="w-full h-12 bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-700 hover:to-cyan-600 text-white font-medium"
                  data-testid="send-otp-btn"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <MessageSquare className="w-5 h-5 mr-2" />
                      Send Verification Code
                    </>
                  )}
                </Button>

                {/* Privacy Note */}
                <p className="text-xs text-gray-500 text-center">
                  By continuing, you agree to receive SMS messages. Standard rates apply.
                </p>
              </motion.div>
            )}

            {/* Step 2: Enter OTP */}
            {step === 2 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                {/* Icon */}
                <div className="flex justify-center">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500/20 to-cyan-500/20 flex items-center justify-center">
                    <Shield className="w-10 h-10 text-cyan-400" />
                  </div>
                </div>

                {/* Description */}
                <div className="text-center">
                  <p className="text-gray-400 text-sm">
                    Enter the 6-digit code sent to
                  </p>
                  <p className="text-white font-medium mt-1">
                    {countryCode} {formatPhoneDisplay(phoneNumber)}
                  </p>
                </div>

                {/* OTP Input */}
                <div className="flex justify-center gap-2">
                  {otpCode.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => (otpRefs.current[index] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOTPChange(index, e.target.value)}
                      onKeyDown={(e) => handleOTPKeyDown(index, e)}
                      onPaste={index === 0 ? handleOTPPaste : undefined}
                      className={`w-12 h-14 text-center text-2xl font-bold rounded-xl bg-[#252542] border-2 text-white transition-colors ${
                        digit ? 'border-cyan-500' : 'border-white/10'
                      } focus:border-cyan-500 focus:outline-none`}
                      data-testid={`otp-input-${index}`}
                    />
                  ))}
                </div>

                {/* Error Message */}
                {error && (
                  <div className="flex items-center justify-center gap-2 text-red-400 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                  </div>
                )}

                {/* Verify Button */}
                <Button
                  onClick={() => handleVerifyOTP()}
                  disabled={loading || otpCode.join('').length !== 6}
                  className="w-full h-12 bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-700 hover:to-cyan-600 text-white font-medium"
                  data-testid="verify-otp-btn"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    "Verify"
                  )}
                </Button>

                {/* Resend */}
                <div className="text-center">
                  <button
                    onClick={handleResendOTP}
                    disabled={resendTimer > 0 || loading}
                    className={`text-sm ${
                      resendTimer > 0 ? 'text-gray-500' : 'text-cyan-400 hover:text-cyan-300'
                    } transition-colors flex items-center justify-center gap-2 mx-auto`}
                  >
                    <RefreshCw className={`w-4 h-4 ${loading && resendTimer === 0 ? 'animate-spin' : ''}`} />
                    {resendTimer > 0 
                      ? `Resend code in ${resendTimer}s` 
                      : "Resend verification code"
                    }
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 3: Success */}
            {step === 3 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-6 text-center py-8"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", damping: 10 }}
                  className="flex justify-center"
                >
                  <div className="w-24 h-24 rounded-full bg-green-500/20 flex items-center justify-center">
                    <CheckCircle className="w-12 h-12 text-green-500" />
                  </div>
                </motion.div>

                <div>
                  <h3 className="text-xl font-semibold text-white mb-2">
                    Phone Verified!
                  </h3>
                  <p className="text-gray-400 text-sm">
                    Your phone number has been successfully verified
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-[#252542] border border-white/10">
                  <p className="text-white font-medium">
                    {countryCode} {formatPhoneDisplay(phoneNumber)}
                  </p>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
