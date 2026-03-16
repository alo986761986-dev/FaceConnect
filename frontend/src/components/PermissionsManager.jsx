import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera, Mic, MapPin, Users, Image, Bell, Calendar,
  Bluetooth, Phone, PhoneCall, ChevronRight, Check, X,
  Shield, Loader2, AlertCircle, Settings
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { haptic } from "@/utils/mobile";
import {
  checkPermission,
  requestCameraPermission,
  requestMicrophonePermission,
  requestLocationPermission,
  requestContactsPermission,
  openGallery
} from "@/utils/permissions";

// Permission definitions with metadata
const PERMISSION_TYPES = [
  {
    id: "photos_videos",
    name: "Photos & Videos",
    description: "Access your photo library and videos",
    icon: Image,
    color: "#FF6B6B",
    apiName: null, // Uses file picker
    category: "media"
  },
  {
    id: "notifications",
    name: "Notifications",
    description: "Send you alerts and updates",
    icon: Bell,
    color: "#00F0FF",
    apiName: "notifications",
    category: "communication"
  },
  {
    id: "location",
    name: "Location",
    description: "Access your device location",
    icon: MapPin,
    color: "#00FF88",
    apiName: "geolocation",
    category: "location"
  },
  {
    id: "calendar",
    name: "Calendar",
    description: "Read and write calendar events",
    icon: Calendar,
    color: "#FFB84D",
    apiName: null, // Not available in web
    category: "personal"
  },
  {
    id: "contacts",
    name: "Contacts",
    description: "Access your contact list",
    icon: Users,
    color: "#7000FF",
    apiName: null, // Contact Picker API
    category: "personal"
  },
  {
    id: "nearby_devices",
    name: "Nearby Devices",
    description: "Find and connect to nearby devices",
    icon: Bluetooth,
    color: "#0066FF",
    apiName: null, // Bluetooth API
    category: "connectivity"
  },
  {
    id: "camera",
    name: "Camera",
    description: "Take photos and record videos",
    icon: Camera,
    color: "#FF3366",
    apiName: "camera",
    category: "media"
  },
  {
    id: "microphone",
    name: "Microphone",
    description: "Record audio and voice messages",
    icon: Mic,
    color: "#FF9500",
    apiName: "microphone",
    category: "media"
  },
  {
    id: "call_log",
    name: "Call Log",
    description: "Access your call history",
    icon: PhoneCall,
    color: "#34C759",
    apiName: null, // Not available in web
    category: "communication"
  },
  {
    id: "phone",
    name: "Phone",
    description: "Make and manage phone calls",
    icon: Phone,
    color: "#5856D6",
    apiName: null, // Not available in web
    category: "communication"
  }
];

// Status badge component
function StatusBadge({ status }) {
  const config = {
    granted: { color: "bg-green-500", text: "Allowed", icon: Check },
    denied: { color: "bg-red-500", text: "Denied", icon: X },
    prompt: { color: "bg-yellow-500", text: "Not Set", icon: AlertCircle },
    unsupported: { color: "bg-gray-500", text: "Not Available", icon: X },
    unknown: { color: "bg-gray-500", text: "Unknown", icon: AlertCircle }
  };

  const { color, text, icon: Icon } = config[status] || config.unknown;

  return (
    <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${color} text-white`}>
      <Icon className="w-3 h-3" />
      {text}
    </span>
  );
}

export default function PermissionsManager({ isOpen, onClose }) {
  const [permissions, setPermissions] = useState({});
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(null);
  const [selectedPermission, setSelectedPermission] = useState(null);

  // Check all permissions on mount
  useEffect(() => {
    if (isOpen) {
      checkAllPermissionStatuses();
    }
  }, [isOpen]);

  const checkAllPermissionStatuses = async () => {
    setLoading(true);
    const statuses = {};

    for (const perm of PERMISSION_TYPES) {
      if (perm.apiName) {
        try {
          statuses[perm.id] = await checkPermission(perm.apiName);
        } catch {
          statuses[perm.id] = "unknown";
        }
      } else {
        // Check if API exists for non-standard permissions
        if (perm.id === "photos_videos") {
          statuses[perm.id] = "prompt"; // Always available via file picker
        } else if (perm.id === "contacts") {
          statuses[perm.id] = "contacts" in navigator ? "prompt" : "unsupported";
        } else if (perm.id === "nearby_devices") {
          statuses[perm.id] = "bluetooth" in navigator ? "prompt" : "unsupported";
        } else if (perm.id === "notifications") {
          statuses[perm.id] = "Notification" in window 
            ? Notification.permission 
            : "unsupported";
        } else {
          statuses[perm.id] = "unsupported";
        }
      }
    }

    setPermissions(statuses);
    setLoading(false);
  };

  const handleRequestPermission = async (permission) => {
    setRequesting(permission.id);
    haptic.medium();

    try {
      let result;

      switch (permission.id) {
        case "camera":
          result = await requestCameraPermission();
          break;
        case "microphone":
          result = await requestMicrophonePermission();
          break;
        case "location":
          result = await requestLocationPermission();
          break;
        case "contacts":
          result = await requestContactsPermission();
          break;
        case "notifications":
          if ("Notification" in window) {
            const perm = await Notification.requestPermission();
            result = { granted: perm === "granted", status: perm };
          } else {
            result = { granted: false, status: "unsupported" };
          }
          break;
        case "photos_videos":
          result = await openGallery();
          if (result.granted && result.files.length > 0) {
            toast.success(`Selected ${result.files.length} file(s)`);
          }
          result = { granted: true, status: "granted" };
          break;
        case "nearby_devices":
          if ("bluetooth" in navigator) {
            try {
              await navigator.bluetooth.requestDevice({
                acceptAllDevices: true
              });
              result = { granted: true, status: "granted" };
            } catch (e) {
              result = { granted: false, status: e.name === "NotAllowedError" ? "denied" : "prompt" };
            }
          } else {
            result = { granted: false, status: "unsupported" };
          }
          break;
        default:
          result = { granted: false, status: "unsupported" };
          toast.info(`${permission.name} is not available on web browsers`);
      }

      // Update permission status
      setPermissions(prev => ({
        ...prev,
        [permission.id]: result.status || (result.granted ? "granted" : "denied")
      }));

      if (result.granted) {
        haptic.success();
        toast.success(`${permission.name} permission granted`);
      } else if (result.status === "denied") {
        toast.error(`${permission.name} permission denied`);
      }
    } catch (error) {
      console.error(`Failed to request ${permission.name}:`, error);
      toast.error(`Failed to request ${permission.name} permission`);
    } finally {
      setRequesting(null);
    }
  };

  const handleRequestAll = async () => {
    haptic.medium();
    toast.info("Requesting all available permissions...");

    const requestablePermissions = PERMISSION_TYPES.filter(
      p => permissions[p.id] !== "granted" && permissions[p.id] !== "unsupported"
    );

    for (const perm of requestablePermissions) {
      await handleRequestPermission(perm);
      await new Promise(r => setTimeout(r, 500)); // Small delay between requests
    }

    toast.success("Permission requests complete!");
  };

  const getPermissionsByCategory = () => {
    const categories = {
      media: { name: "Media", permissions: [] },
      communication: { name: "Communication", permissions: [] },
      location: { name: "Location", permissions: [] },
      personal: { name: "Personal Data", permissions: [] },
      connectivity: { name: "Connectivity", permissions: [] }
    };

    PERMISSION_TYPES.forEach(perm => {
      if (categories[perm.category]) {
        categories[perm.category].permissions.push(perm);
      }
    });

    return Object.values(categories).filter(cat => cat.permissions.length > 0);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#121212] border-white/10 text-white max-w-md max-h-[85vh] overflow-hidden p-0">
        <DialogHeader className="p-4 border-b border-white/10">
          <DialogTitle className="text-xl font-['Outfit'] flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#00F0FF]" />
            App Permissions
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Manage what FaceConnect can access on your device
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto max-h-[calc(85vh-180px)] p-4 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 text-[#00F0FF] animate-spin" />
            </div>
          ) : (
            <>
              {/* Quick Actions */}
              <div className="flex gap-2">
                <Button
                  onClick={handleRequestAll}
                  disabled={requesting !== null}
                  className="flex-1 bg-gradient-to-r from-[#00F0FF] to-[#7000FF] hover:opacity-90"
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Allow All
                </Button>
                <Button
                  onClick={checkAllPermissionStatuses}
                  variant="outline"
                  className="border-white/10 text-white hover:bg-white/5"
                >
                  Refresh
                </Button>
              </div>

              {/* Permissions by Category */}
              {getPermissionsByCategory().map((category) => (
                <div key={category.name} className="space-y-2">
                  <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">
                    {category.name}
                  </h3>
                  <div className="rounded-xl bg-[#1A1A1A] border border-white/5 divide-y divide-white/5">
                    {category.permissions.map((perm) => {
                      const Icon = perm.icon;
                      const status = permissions[perm.id] || "unknown";
                      const isRequesting = requesting === perm.id;
                      const isUnsupported = status === "unsupported";

                      return (
                        <motion.button
                          key={perm.id}
                          onClick={() => !isUnsupported && handleRequestPermission(perm)}
                          disabled={isRequesting || isUnsupported}
                          className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          whileTap={{ scale: 0.98 }}
                        >
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-10 h-10 rounded-full flex items-center justify-center"
                              style={{ backgroundColor: `${perm.color}20` }}
                            >
                              {isRequesting ? (
                                <Loader2 className="w-5 h-5 animate-spin" style={{ color: perm.color }} />
                              ) : (
                                <Icon className="w-5 h-5" style={{ color: perm.color }} />
                              )}
                            </div>
                            <div className="text-left">
                              <p className="text-white font-medium">{perm.name}</p>
                              <p className="text-xs text-gray-500">{perm.description}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <StatusBadge status={status} />
                            {!isUnsupported && status !== "granted" && (
                              <ChevronRight className="w-4 h-4 text-gray-500" />
                            )}
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Info Note */}
              <div className="p-3 rounded-lg bg-[#1A1A1A] border border-white/5">
                <p className="text-xs text-gray-500">
                  <AlertCircle className="w-3 h-3 inline mr-1" />
                  Some permissions (Calendar, Call Log, Phone) are only available in native mobile apps. 
                  For denied permissions, you may need to update your browser settings.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10">
          <Button
            onClick={() => onClose(false)}
            variant="outline"
            className="w-full border-white/10 text-white hover:bg-white/5"
          >
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
