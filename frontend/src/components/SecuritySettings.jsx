import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Fingerprint, Shield, Clock, Trash2, 
  Check, AlertTriangle, Lock, Smartphone
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  isBiometricSupported,
  isPlatformAuthenticatorAvailable,
  isBiometricEnabled,
  registerBiometric,
  disableBiometric,
  getAuthTimeout,
  setAuthTimeout
} from "@/utils/biometric";
import { haptic } from "@/utils/mobile";

export const SecuritySettings = ({ isOpen, onClose }) => {
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [authTimeout, setAuthTimeoutState] = useState(5);
  const [registering, setRegistering] = useState(false);
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");

  useEffect(() => {
    const checkSupport = async () => {
      const available = await isPlatformAuthenticatorAvailable();
      setBiometricSupported(available);
      setBiometricEnabled(isBiometricEnabled());
      setAuthTimeoutState(getAuthTimeout());
    };
    
    if (isOpen) {
      checkSupport();
    }
  }, [isOpen]);

  const handleBiometricToggle = async (enabled) => {
    haptic.light();
    
    if (enabled) {
      setRegistering(true);
      try {
        const result = await registerBiometric();
        if (result.success) {
          setBiometricEnabled(true);
          haptic.success();
          toast.success("Biometric authentication enabled!");
        } else {
          haptic.error();
          toast.error(result.error || "Failed to enable biometrics");
        }
      } catch (err) {
        haptic.error();
        toast.error(err.message);
      } finally {
        setRegistering(false);
      }
    } else {
      disableBiometric();
      setBiometricEnabled(false);
      toast.success("Biometric authentication disabled");
    }
  };

  const handleTimeoutChange = (value) => {
    const minutes = parseInt(value, 10);
    setAuthTimeoutState(minutes);
    setAuthTimeout(minutes);
    haptic.light();
    toast.success(`Lock timeout set to ${minutes} minutes`);
  };

  const handleSavePin = () => {
    if (newPin.length < 4) {
      toast.error("PIN must be at least 4 digits");
      return;
    }
    
    if (newPin !== confirmPin) {
      toast.error("PINs don't match");
      return;
    }
    
    localStorage.setItem('app_pin', newPin);
    haptic.success();
    toast.success("PIN updated successfully");
    setShowPinSetup(false);
    setNewPin("");
    setConfirmPin("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#121212] border-white/10 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-['Outfit'] flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00F0FF] to-[#7000FF] flex items-center justify-center">
              <Shield className="w-4 h-4" />
            </div>
            Security Settings
          </DialogTitle>
          <DialogDescription className="text-gray-500">
            Configure app lock and biometric authentication
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Biometric Authentication */}
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-xl bg-[#1A1A1A] border border-white/5">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  biometricEnabled ? 'bg-[#00F0FF]/20' : 'bg-white/5'
                }`}>
                  <Fingerprint className={`w-5 h-5 ${
                    biometricEnabled ? 'text-[#00F0FF]' : 'text-gray-500'
                  }`} />
                </div>
                <div>
                  <p className="text-white font-medium">Biometric Unlock</p>
                  <p className="text-gray-500 text-sm">
                    {biometricSupported 
                      ? 'Use fingerprint or Face ID' 
                      : 'Not available on this device'}
                  </p>
                </div>
              </div>
              <Switch
                data-testid="biometric-toggle"
                checked={biometricEnabled}
                onCheckedChange={handleBiometricToggle}
                disabled={!biometricSupported || registering}
              />
            </div>

            {/* Status Indicator */}
            {biometricEnabled && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500/10 border border-green-500/30"
              >
                <Check className="w-4 h-4 text-green-400" />
                <span className="text-green-400 text-sm">Biometric authentication active</span>
              </motion.div>
            )}
          </div>

          {/* Lock Timeout */}
          <div className="space-y-3">
            <Label className="text-gray-400">Auto-lock after</Label>
            <Select value={authTimeout.toString()} onValueChange={handleTimeoutChange}>
              <SelectTrigger className="bg-[#1A1A1A] border-white/10 text-white">
                <Clock className="w-4 h-4 mr-2 text-gray-500" />
                <SelectValue placeholder="Select timeout" />
              </SelectTrigger>
              <SelectContent className="bg-[#1A1A1A] border-white/10">
                <SelectItem value="1">1 minute</SelectItem>
                <SelectItem value="5">5 minutes</SelectItem>
                <SelectItem value="15">15 minutes</SelectItem>
                <SelectItem value="30">30 minutes</SelectItem>
                <SelectItem value="60">1 hour</SelectItem>
                <SelectItem value="0">Never</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* PIN Settings */}
          <div className="space-y-3">
            <Label className="text-gray-400">PIN Code</Label>
            <div className="flex items-center justify-between p-4 rounded-xl bg-[#1A1A1A] border border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#7000FF]/20 flex items-center justify-center">
                  <Lock className="w-5 h-5 text-[#7000FF]" />
                </div>
                <div>
                  <p className="text-white font-medium">Backup PIN</p>
                  <p className="text-gray-500 text-sm">Fallback authentication method</p>
                </div>
              </div>
              <Button
                data-testid="change-pin-btn"
                variant="outline"
                size="sm"
                onClick={() => setShowPinSetup(true)}
                className="bg-transparent border-white/10 text-white hover:bg-white/5"
              >
                Change
              </Button>
            </div>
          </div>

          {/* Security Tips */}
          <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-yellow-400 font-medium text-sm">Security Tip</p>
                <p className="text-yellow-400/80 text-sm mt-1">
                  Enable biometric authentication for the most secure and convenient access to your data.
                </p>
              </div>
            </div>
          </div>

          {/* Reset Security */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                className="w-full text-red-400 hover:text-red-300 hover:bg-red-500/10"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Reset All Security Settings
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-[#121212] border-white/10">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-white">Reset Security Settings?</AlertDialogTitle>
                <AlertDialogDescription className="text-gray-400">
                  This will disable biometric authentication and reset your PIN. You'll need to set them up again.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="bg-transparent border-white/10 text-white hover:bg-white/5">
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    disableBiometric();
                    localStorage.removeItem('app_pin');
                    setBiometricEnabled(false);
                    haptic.medium();
                    toast.success("Security settings reset");
                  }}
                  className="bg-red-500 hover:bg-red-600 text-white"
                >
                  Reset
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </DialogContent>

      {/* PIN Setup Dialog */}
      <Dialog open={showPinSetup} onOpenChange={setShowPinSetup}>
        <DialogContent className="bg-[#121212] border-white/10 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-lg font-['Outfit']">Set PIN Code</DialogTitle>
            <DialogDescription className="text-gray-500">
              Enter a 4-6 digit PIN for backup authentication
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-gray-400">New PIN</Label>
              <Input
                data-testid="new-pin-input"
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                placeholder="Enter PIN"
                className="bg-[#1A1A1A] border-white/10 text-white text-center text-xl tracking-widest"
                maxLength={6}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-gray-400">Confirm PIN</Label>
              <Input
                data-testid="confirm-pin-input"
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                placeholder="Confirm PIN"
                className="bg-[#1A1A1A] border-white/10 text-white text-center text-xl tracking-widest"
                maxLength={6}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowPinSetup(false);
                setNewPin("");
                setConfirmPin("");
              }}
              className="bg-transparent border-white/10 text-white hover:bg-white/5"
            >
              Cancel
            </Button>
            <Button
              data-testid="save-pin-btn"
              onClick={handleSavePin}
              disabled={newPin.length < 4}
              className="bg-gradient-to-r from-[#00F0FF] to-[#7000FF] hover:opacity-90 text-white"
            >
              Save PIN
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
};

export default SecuritySettings;
