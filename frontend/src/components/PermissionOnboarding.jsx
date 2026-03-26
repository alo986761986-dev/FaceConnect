// Permission onboarding screen - explains why permissions are needed
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Camera, Mic, MapPin, Bell, Shield, ChevronRight, 
  Check, X, AlertCircle, Smartphone
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  requestCameraPermission,
  requestMicrophonePermission,
  requestLocationPermission,
  requestNotificationPermission,
  requestLocalNotificationPermission,
  isNative
} from '@/utils/permissions';

const PERMISSIONS_CONFIG = [
  {
    id: 'camera',
    icon: Camera,
    title: 'Camera',
    description: 'Take photos, record videos, and video calls',
    color: 'from-cyan-500 to-blue-500',
    request: requestCameraPermission
  },
  {
    id: 'microphone',
    icon: Mic,
    title: 'Microphone',
    description: 'Voice messages and video calls',
    color: 'from-purple-500 to-pink-500',
    request: requestMicrophonePermission
  },
  {
    id: 'location',
    icon: MapPin,
    title: 'Location',
    description: 'Find nearby friends and share location',
    color: 'from-green-500 to-emerald-500',
    request: requestLocationPermission
  },
  {
    id: 'notifications',
    icon: Bell,
    title: 'Notifications',
    description: 'Get alerts for messages and updates',
    color: 'from-orange-500 to-red-500',
    request: requestNotificationPermission
  },
  {
    id: 'localNotifications',
    icon: Bell,
    title: 'Local Alerts',
    description: 'Reminders and scheduled notifications',
    color: 'from-yellow-500 to-orange-500',
    request: requestLocalNotificationPermission
  }
];

export default function PermissionOnboarding({ onComplete, onSkip }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [results, setResults] = useState({});
  const [isRequesting, setIsRequesting] = useState(false);
  const [showSummary, setShowSummary] = useState(false);

  const currentPermission = PERMISSIONS_CONFIG[currentStep];
  const totalPermissions = PERMISSIONS_CONFIG.length;
  const grantedCount = Object.values(results).filter(r => r?.granted).length;

  const handleAllow = async () => {
    if (!currentPermission) return;
    
    setIsRequesting(true);
    try {
      const result = await currentPermission.request();
      setResults(prev => ({
        ...prev,
        [currentPermission.id]: result
      }));
      
      // Move to next permission or show summary
      if (currentStep < totalPermissions - 1) {
        setCurrentStep(currentStep + 1);
      } else {
        setShowSummary(true);
      }
    } catch (error) {
      console.error('Permission error:', error);
      setResults(prev => ({
        ...prev,
        [currentPermission.id]: { granted: false, error: error.message }
      }));
    } finally {
      setIsRequesting(false);
    }
  };

  const handleSkipPermission = () => {
    setResults(prev => ({
      ...prev,
      [currentPermission.id]: { granted: false, skipped: true }
    }));
    
    if (currentStep < totalPermissions - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      setShowSummary(true);
    }
  };

  const handleAllowAll = async () => {
    setIsRequesting(true);
    const allResults = {};
    
    for (const perm of PERMISSIONS_CONFIG) {
      try {
        const result = await perm.request();
        allResults[perm.id] = result;
      } catch (error) {
        allResults[perm.id] = { granted: false, error: error.message };
      }
    }
    
    setResults(allResults);
    setIsRequesting(false);
    setShowSummary(true);
  };

  const handleComplete = () => {
    // Store results
    localStorage.setItem('permissionsRequested', 'true');
    localStorage.setItem('permissionResults', JSON.stringify(results));
    localStorage.setItem('permissionOnboardingComplete', 'true');
    onComplete?.(results);
  };

  // Summary screen
  if (showSummary) {
    return (
      <div className="fixed inset-0 bg-[#0A0A1A] z-[9999] flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-20 h-20 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center mb-6"
          >
            <Check className="w-10 h-10 text-white" />
          </motion.div>
          
          <h1 className="text-2xl font-bold text-white mb-2">All Set!</h1>
          <p className="text-gray-400 text-center mb-8">
            {grantedCount}/{totalPermissions} permissions enabled
          </p>

          <div className="w-full max-w-sm space-y-3 mb-8">
            {PERMISSIONS_CONFIG.map((perm) => {
              const result = results[perm.id];
              const granted = result?.granted;
              const Icon = perm.icon;
              
              return (
                <div 
                  key={perm.id}
                  className={`flex items-center gap-3 p-3 rounded-xl ${
                    granted ? 'bg-green-500/10 border border-green-500/30' : 'bg-white/5 border border-white/10'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${perm.color} flex items-center justify-center`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <span className="flex-1 text-white">{perm.title}</span>
                  {granted ? (
                    <Check className="w-5 h-5 text-green-500" />
                  ) : (
                    <X className="w-5 h-5 text-gray-500" />
                  )}
                </div>
              );
            })}
          </div>

          {grantedCount < totalPermissions && (
            <p className="text-sm text-gray-500 text-center mb-4">
              You can enable more permissions later in Settings
            </p>
          )}

          <Button
            onClick={handleComplete}
            className="w-full max-w-sm h-14 bg-gradient-to-r from-[#00D9FF] to-[#00FFFF] text-black font-semibold rounded-2xl"
          >
            Continue to FaceConnect
          </Button>
        </div>
      </div>
    );
  }

  // Permission request screen
  return (
    <div className="fixed inset-0 bg-[#0A0A1A] z-[9999] flex flex-col">
      {/* Progress bar */}
      <div className="h-1 bg-white/10">
        <motion.div 
          className="h-full bg-gradient-to-r from-[#00D9FF] to-[#00FFFF]"
          initial={{ width: 0 }}
          animate={{ width: `${((currentStep + 1) / totalPermissions) * 100}%` }}
        />
      </div>

      {/* Skip button */}
      <div className="flex justify-end p-4">
        <button 
          onClick={onSkip}
          className="text-gray-500 text-sm"
        >
          Skip All
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col items-center"
          >
            {/* Icon */}
            <div className={`w-24 h-24 rounded-full bg-gradient-to-br ${currentPermission?.color} flex items-center justify-center mb-8 shadow-lg`}>
              {currentPermission && <currentPermission.icon className="w-12 h-12 text-white" />}
            </div>

            {/* Title */}
            <h1 className="text-2xl font-bold text-white mb-3">
              Enable {currentPermission?.title}
            </h1>

            {/* Description */}
            <p className="text-gray-400 text-center mb-8 max-w-xs">
              {currentPermission?.description}
            </p>

            {/* Progress indicator */}
            <div className="flex gap-2 mb-8">
              {PERMISSIONS_CONFIG.map((_, idx) => (
                <div 
                  key={idx}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    idx === currentStep 
                      ? 'bg-[#00D9FF]' 
                      : idx < currentStep 
                        ? 'bg-[#00D9FF]/50' 
                        : 'bg-white/20'
                  }`}
                />
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Action buttons */}
      <div className="p-6 space-y-3">
        <Button
          onClick={handleAllow}
          disabled={isRequesting}
          className="w-full h-14 bg-gradient-to-r from-[#00D9FF] to-[#00FFFF] text-black font-semibold rounded-2xl"
        >
          {isRequesting ? 'Requesting...' : 'Allow'}
        </Button>

        <div className="flex gap-3">
          <Button
            onClick={handleSkipPermission}
            variant="outline"
            className="flex-1 h-12 border-white/20 text-white rounded-xl"
          >
            Not Now
          </Button>
          
          {currentStep === 0 && (
            <Button
              onClick={handleAllowAll}
              disabled={isRequesting}
              variant="outline"
              className="flex-1 h-12 border-[#00D9FF]/50 text-[#00D9FF] rounded-xl"
            >
              Allow All
            </Button>
          )}
        </div>
      </div>

      {/* Info footer */}
      <div className="p-4 flex items-center justify-center gap-2 text-gray-500 text-xs">
        <Shield className="w-4 h-4" />
        <span>Your privacy is protected. We never share your data.</span>
      </div>
    </div>
  );
}
