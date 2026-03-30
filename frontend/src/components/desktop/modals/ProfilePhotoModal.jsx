import { useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Image as ImageIcon, Trash2, RefreshCw } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

export default function ProfilePhotoModal({ 
  isOpen, 
  onClose, 
  isDark, 
  user, 
  token,
  uploadingProfilePhoto,
  onFileSelect,
  onCameraCapture,
  onUserUpdated
}) {
  const fileInputRef = useRef(null);

  const handleRemovePhoto = async () => {
    try {
      const updateRes = await fetch(`${API_URL}/api/profile?token=${token}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatar: null })
      });
      
      if (updateRes.ok) {
        const updatedUser = { ...user, avatar: null };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        window.dispatchEvent(new CustomEvent('user-updated', { detail: updatedUser }));
        onUserUpdated?.(updatedUser);
        toast.success('Profile photo removed');
        onClose();
      }
    } catch (err) {
      toast.error('Failed to remove photo');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", duration: 0.4 }}
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden ${
              isDark ? 'bg-[#1f2c34]' : 'bg-white'
            }`}
          >
            {/* Header */}
            <div className={`p-6 text-center border-b ${isDark ? 'border-[#2a3942]' : 'border-gray-200'}`}>
              <div className="relative mx-auto w-28 h-28 mb-4">
                {/* Current Avatar with Glow */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#00E676] to-[#00a884] rounded-full blur-lg opacity-40" />
                <Avatar className="w-28 h-28 relative border-4 border-[#00E676]">
                  <AvatarImage src={user?.avatar} className="object-cover" />
                  <AvatarFallback className="bg-gradient-to-br from-[#00E676] to-[#00a884] text-white text-3xl">
                    {user?.display_name?.charAt(0)?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                {/* Camera Badge */}
                <div className="absolute bottom-0 right-0 p-2 rounded-full bg-[#00E676] shadow-lg">
                  <Camera className="w-5 h-5 text-white" />
                </div>
              </div>
              <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Change Profile Photo
              </h3>
              <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Select a new photo to update your profile
              </p>
            </div>
            
            {/* Options */}
            <div className="p-4 space-y-3">
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onFileSelect}
              />
              
              {/* Upload from Gallery */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingProfilePhoto}
                className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-colors ${
                  isDark 
                    ? 'bg-[#2a3942] hover:bg-[#3a4a5a] text-white' 
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
                } ${uploadingProfilePhoto ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <ImageIcon className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-semibold">Upload from Gallery</p>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    Choose from your photos
                  </p>
                </div>
                {uploadingProfilePhoto && (
                  <RefreshCw className="w-5 h-5 animate-spin text-[#00E676]" />
                )}
              </motion.button>
              
              {/* Take Photo with Camera */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  onClose();
                  onCameraCapture?.();
                }}
                className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-colors ${
                  isDark 
                    ? 'bg-[#2a3942] hover:bg-[#3a4a5a] text-white' 
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
                }`}
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                  <Camera className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-semibold">Take Photo</p>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    Use your camera
                  </p>
                </div>
              </motion.button>
              
              {/* Remove Current Photo */}
              {user?.avatar && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleRemovePhoto}
                  className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-colors ${
                    isDark 
                      ? 'bg-red-900/20 hover:bg-red-900/30 text-red-400' 
                      : 'bg-red-50 hover:bg-red-100 text-red-600'
                  }`}
                >
                  <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                    <Trash2 className="w-6 h-6 text-red-500" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-semibold">Remove Photo</p>
                    <p className={`text-sm opacity-70`}>
                      Delete current photo
                    </p>
                  </div>
                </motion.button>
              )}
            </div>
            
            {/* Cancel Button */}
            <div className={`p-4 pt-0`}>
              <Button
                variant="ghost"
                onClick={onClose}
                className={`w-full py-3 rounded-2xl ${
                  isDark ? 'text-gray-400 hover:text-white hover:bg-[#2a3942]' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Cancel
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
