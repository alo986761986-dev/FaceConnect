import { useState } from "react";
import { motion } from "framer-motion";
import { Bell, BellOff, AlertCircle, CheckCircle, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

export default function NotificationSettings() {
  const { 
    pushEnabled, 
    pushPermission, 
    isPushSupported,
    enablePushNotifications,
    disablePushNotifications 
  } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    setLoading(true);
    
    try {
      if (pushEnabled) {
        await disablePushNotifications();
        toast.success("Push notifications disabled");
      } else {
        const result = await enablePushNotifications();
        
        if (result.success) {
          toast.success("Push notifications enabled!");
        } else if (result.reason === 'Permission denied') {
          toast.error("Please allow notifications in your browser settings");
        } else {
          toast.error("Failed to enable notifications");
        }
      }
    } catch (error) {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  if (!isPushSupported) {
    return (
      <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-yellow-400 font-medium">Not Supported</p>
            <p className="text-xs text-gray-500 mt-1">
              Push notifications are not supported in this browser. Try using Chrome, Firefox, or Safari on a mobile device.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Main Toggle */}
      <div className="p-4 rounded-xl bg-[#1A1A1A] border border-white/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              pushEnabled ? "bg-[#00F0FF]/20" : "bg-gray-500/20"
            }`}>
              {pushEnabled ? (
                <Bell className="w-5 h-5 text-[#00F0FF]" />
              ) : (
                <BellOff className="w-5 h-5 text-gray-500" />
              )}
            </div>
            <div>
              <p className="font-medium text-white">Push Notifications</p>
              <p className="text-xs text-gray-500">
                Receive alerts when you get new messages
              </p>
            </div>
          </div>
          <Switch
            data-testid="push-notification-toggle"
            checked={pushEnabled}
            onCheckedChange={handleToggle}
            disabled={loading || pushPermission === 'denied'}
          />
        </div>
      </div>

      {/* Status Info */}
      {pushPermission === 'denied' && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl bg-red-500/10 border border-red-500/20"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-red-400 font-medium">Notifications Blocked</p>
              <p className="text-xs text-gray-500 mt-1">
                You've blocked notifications for this site. To enable them, click the lock icon in your browser's address bar and allow notifications.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {pushEnabled && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl bg-green-500/10 border border-green-500/20"
        >
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-green-400 font-medium">Notifications Active</p>
              <p className="text-xs text-gray-500 mt-1">
                You'll receive push notifications for new messages, even when the app is closed.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Info Box */}
      <div className="p-4 rounded-xl bg-[#0F0F0F] border border-white/5">
        <div className="flex items-start gap-3">
          <Smartphone className="w-5 h-5 text-gray-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-gray-400">Mobile App Experience</p>
            <p className="text-xs text-gray-600 mt-1">
              For the best experience, install FaceConnect on your home screen. Notifications work even when the app is in the background or closed.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
