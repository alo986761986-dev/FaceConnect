import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import {
  X, Image, Video, Camera, Radio, Sparkles, 
  FileText, Clock, Play, Mic, MapPin, Users,
  Loader2, Upload, Scan
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { useSettings } from "@/context/SettingsContext";
import { haptic } from "@/utils/mobile";
import {
  requestCameraPermission,
  requestMicrophonePermission,
  requestLocationPermission,
  openGallery
} from "@/utils/permissions";
import AIContentGenerator from "@/components/AIContentGenerator";
import FaceScanner from "@/components/FaceScanner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const CREATE_OPTIONS = [
  { 
    id: "post", 
    label: "Post", 
    icon: FileText, 
    color: "#00F0FF",
    description: "Share a photo or text"
  },
  { 
    id: "story", 
    label: "Story", 
    icon: Clock, 
    color: "#FF6B6B",
    description: "Share a moment (24h)"
  },
  { 
    id: "reel", 
    label: "Reel", 
    icon: Play, 
    color: "#7000FF",
    description: "Create a short video"
  },
  { 
    id: "live", 
    label: "Live", 
    icon: Radio, 
    color: "#FF3366",
    description: "Go live with friends"
  },
  { 
    id: "facescan", 
    label: "FaceScan", 
    icon: Scan, 
    color: "#00F0FF",
    description: "Scan & find people"
  },
  { 
    id: "ai", 
    label: "AI", 
    icon: Sparkles, 
    color: "#00FF88",
    description: "Generate with AI"
  },
];

export default function CreateMenu({ isOpen, onClose }) {
  const navigate = useNavigate();
  const { token } = useAuth();
  const { isDark } = useSettings();
  const [selectedType, setSelectedType] = useState(null);
  const [content, setContent] = useState("");
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [requestingPermissions, setRequestingPermissions] = useState(false);
  const [showAIGenerator, setShowAIGenerator] = useState(false);
  const [showFaceScanner, setShowFaceScanner] = useState(false);
  const fileInputRef = useRef(null);

  const handleSelectType = async (type) => {
    haptic.medium();
    
    // Handle FaceScan separately
    if (type === "facescan") {
      setShowFaceScanner(true);
      return;
    }
    
    if (type === "reel") {
      // Navigate to reels page with upload modal
      onClose();
      navigate("/reels");
      return;
    }
    
    if (type === "live") {
      // Navigate to live streams page
      onClose();
      navigate("/live");
      return;
    }
    
    if (type === "ai") {
      setShowAIGenerator(true);
      return;
    }
    
    setSelectedType(type);
  };

  const handleAIContentGenerated = ({ content: aiContent, type }) => {
    if (type === "text") {
      setContent(aiContent);
      setSelectedType("post");
    } else if (type === "image") {
      // Set the AI generated image URL
      setMediaPreview(aiContent);
      setSelectedType("post");
    }
    setShowAIGenerator(false);
  };

  const handleMediaSelect = async () => {
    haptic.light();
    
    const accept = selectedType === "story" ? "image/*,video/*" : "image/*";
    const result = await openGallery(accept);
    
    if (result.granted && result.files.length > 0) {
      const file = result.files[0];
      setMediaFile(file);
      setMediaPreview(URL.createObjectURL(file));
    }
  };

  const handleCameraCapture = async () => {
    haptic.light();
    
    const result = await requestCameraPermission();
    if (!result.granted) {
      toast.error("Camera access denied");
      return;
    }
    
    // Create camera input
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = selectedType === "story" ? "image/*,video/*" : "image/*";
    input.capture = 'environment';
    
    input.onchange = (e) => {
      const file = e.target.files?.[0];
      if (file) {
        setMediaFile(file);
        setMediaPreview(URL.createObjectURL(file));
      }
    };
    
    input.click();
  };

  const handleAddLocation = async () => {
    haptic.light();
    
    const result = await requestLocationPermission();
    if (result.granted) {
      toast.success(`Location: ${result.position.latitude.toFixed(4)}, ${result.position.longitude.toFixed(4)}`);
    } else {
      toast.error(result.error || "Location access denied");
    }
  };

  const handleSubmit = async () => {
    if (!content.trim() && !mediaFile) {
      toast.error("Please add some content");
      return;
    }

    setUploading(true);
    haptic.medium();

    try {
      let mediaUrl = null;

      // Upload media if exists
      if (mediaFile) {
        const formData = new FormData();
        formData.append("file", mediaFile);
        formData.append("token", token);
        
        const uploadResponse = await axios.post(`${API}/upload`, formData);
        mediaUrl = uploadResponse.data.file_url;
      }

      // Create post/story
      const response = await axios.post(`${API}/posts?token=${token}`, {
        type: selectedType,
        content: content.trim(),
        media_url: mediaUrl,
        media_type: mediaFile?.type?.startsWith("video") ? "video" : "image"
      });

      haptic.success();
      toast.success(`${selectedType === "story" ? "Story" : "Post"} created!`);
      
      // Reset and close
      setContent("");
      setMediaFile(null);
      setMediaPreview(null);
      setSelectedType(null);
      onClose();
    } catch (error) {
      console.error("Create error:", error);
      toast.error("Failed to create. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setSelectedType(null);
    setContent("");
    setMediaFile(null);
    setMediaPreview(null);
    setShowAIGenerator(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm"
          onClick={handleClose}
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className={`absolute bottom-0 left-0 right-0 rounded-t-3xl overflow-hidden max-h-[90vh] ${isDark ? 'bg-[#121212]' : 'bg-white'}`}
          >
            {/* Header */}
            <div className={`flex items-center justify-between px-4 py-4 border-b ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
              <h2 className={`text-xl font-bold font-['Outfit'] ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {selectedType ? `Create ${selectedType.charAt(0).toUpperCase() + selectedType.slice(1)}` : "Create"}
              </h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClose}
                className={isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Content */}
            <div className="p-4 overflow-y-auto max-h-[calc(90vh-80px)]">
              {!selectedType ? (
                // Type Selection
                <div className="grid grid-cols-5 gap-3">
                  {CREATE_OPTIONS.map((option) => (
                    <motion.button
                      key={option.id}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleSelectType(option.id)}
                      disabled={requestingPermissions}
                      className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-colors disabled:opacity-50 ${
                        isDark 
                          ? 'bg-[#1A1A1A] border-white/5 hover:border-white/20' 
                          : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div 
                        className="w-12 h-12 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: `${option.color}20` }}
                      >
                        <option.icon 
                          className="w-6 h-6" 
                          style={{ color: option.color }}
                        />
                      </div>
                      <span className={`text-xs font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{option.label}</span>
                    </motion.button>
                  ))}
                </div>
              ) : (
              // Post/Story Creation
              <div className="space-y-4">
                {/* Media Preview */}
                {mediaPreview ? (
                  <div className="relative aspect-square max-h-64 rounded-xl overflow-hidden bg-black">
                    {mediaFile?.type?.startsWith("video") ? (
                      <video
                        src={mediaPreview}
                        className="w-full h-full object-contain"
                        controls
                      />
                    ) : (
                      <img
                        src={mediaPreview}
                        alt="Preview"
                        className="w-full h-full object-contain"
                      />
                    )}
                    <button
                      onClick={() => {
                        setMediaFile(null);
                        setMediaPreview(null);
                      }}
                      className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/70 flex items-center justify-center"
                    >
                      <X className="w-4 h-4 text-white" />
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-3">
                    <button
                      onClick={handleMediaSelect}
                      className={`flex-1 aspect-square max-h-32 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 hover:border-[#00F0FF]/50 transition-colors ${
                        isDark ? 'bg-[#1A1A1A] border-white/20' : 'bg-gray-50 border-gray-300'
                      }`}
                    >
                      <Image className={`w-8 h-8 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                      <span className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Gallery</span>
                    </button>
                    <button
                      onClick={handleCameraCapture}
                      className={`flex-1 aspect-square max-h-32 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 hover:border-[#00F0FF]/50 transition-colors ${
                        isDark ? 'bg-[#1A1A1A] border-white/20' : 'bg-gray-50 border-gray-300'
                      }`}
                    >
                      <Camera className={`w-8 h-8 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                      <span className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Camera</span>
                    </button>
                  </div>
                )}

                {/* Caption */}
                <Textarea
                  placeholder={selectedType === "story" ? "Add to your story..." : "What's on your mind?"}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className={`min-h-[100px] ${isDark ? 'bg-[#1A1A1A] border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                />

                {/* Quick Actions */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAddLocation}
                    className={isDark ? 'border-white/10 text-gray-400 hover:text-white' : 'border-gray-200 text-gray-600'}
                  >
                    <MapPin className="w-4 h-4 mr-1" />
                    Location
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className={isDark ? 'border-white/10 text-gray-400 hover:text-white' : 'border-gray-200 text-gray-600'}
                  >
                    <Users className="w-4 h-4 mr-1" />
                    Tag Friends
                  </Button>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setSelectedType(null)}
                    className={isDark ? 'flex-1 border-white/10 text-white' : 'flex-1 border-gray-200'}
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={uploading || (!content.trim() && !mediaFile)}
                    className="flex-1 bg-gradient-to-r from-[#00F0FF] to-[#7000FF] text-white"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Posting...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        {selectedType === "story" ? "Share Story" : "Post"}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>

      {/* AI Content Generator */}
      <AIContentGenerator
        isOpen={showAIGenerator}
        onClose={() => setShowAIGenerator(false)}
        onContentGenerated={handleAIContentGenerated}
      />
      
      {/* Face Scanner */}
      <FaceScanner
        isOpen={showFaceScanner}
        onClose={() => setShowFaceScanner(false)}
      />
    </>
  );
}
