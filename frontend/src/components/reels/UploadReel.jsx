import { useState, useRef } from "react";
import { motion } from "framer-motion";
import axios from "axios";
import { toast } from "sonner";
import { X, Upload, Video, Loader2, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/AuthContext";
import { haptic } from "@/utils/mobile";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function UploadReel({ onClose, onSuccess }) {
  const { token } = useAuth();
  const [videoFile, setVideoFile] = useState(null);
  const [videoPreview, setVideoPreview] = useState(null);
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("video/")) {
      toast.error("Please select a video file");
      return;
    }

    // Validate file size (max 100MB)
    if (file.size > 100 * 1024 * 1024) {
      toast.error("Video must be less than 100MB");
      return;
    }

    setVideoFile(file);
    setVideoPreview(URL.createObjectURL(file));
    haptic.light();
  };

  const handleUpload = async () => {
    if (!videoFile) {
      toast.error("Please select a video");
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    haptic.medium();

    try {
      // Upload video file
      const formData = new FormData();
      formData.append("file", videoFile);
      formData.append("token", token);

      const uploadResponse = await axios.post(`${API}/upload`, formData, {
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(progress);
        }
      });

      const { file_url } = uploadResponse.data;

      // Get video duration
      let duration = null;
      if (videoRef.current) {
        duration = videoRef.current.duration;
      }

      // Create reel
      const reelResponse = await axios.post(`${API}/reels?token=${token}`, {
        video_url: file_url,
        caption: caption.trim() || null,
        duration
      });

      haptic.success();
      onSuccess(reelResponse.data);
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload reel");
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveVideo = () => {
    setVideoFile(null);
    setVideoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-[#121212] rounded-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <h3 className="text-lg font-semibold text-white">Upload Reel</h3>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            disabled={uploading}
            className="text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Video Preview / Upload Area */}
          {videoPreview ? (
            <div className="relative aspect-[9/16] max-h-80 bg-black rounded-xl overflow-hidden">
              <video
                ref={videoRef}
                src={videoPreview}
                className="w-full h-full object-contain"
                controls
                playsInline
              />
              {!uploading && (
                <button
                  onClick={handleRemoveVideo}
                  className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/70 flex items-center justify-center"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              )}
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="aspect-[9/16] max-h-80 bg-[#1A1A1A] rounded-xl border-2 border-dashed border-white/20 flex flex-col items-center justify-center cursor-pointer hover:border-[#00F0FF]/50 transition-colors"
            >
              <div className="w-16 h-16 rounded-full bg-[#00F0FF]/20 flex items-center justify-center mb-4">
                <Video className="w-8 h-8 text-[#00F0FF]" />
              </div>
              <p className="text-white font-medium mb-1">Select Video</p>
              <p className="text-gray-500 text-sm">MP4, MOV up to 100MB</p>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* Caption Input */}
          <div>
            <label className="text-sm text-gray-400 mb-2 block">Caption</label>
            <Textarea
              data-testid="reel-caption"
              placeholder="Write a caption..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              maxLength={500}
              className="bg-[#1A1A1A] border-white/10 text-white resize-none"
              rows={3}
            />
            <p className="text-xs text-gray-500 mt-1 text-right">{caption.length}/500</p>
          </div>

          {/* Upload Progress */}
          {uploading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Uploading...</span>
                <span className="text-[#00F0FF]">{uploadProgress}%</span>
              </div>
              <div className="h-2 bg-[#1A1A1A] rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${uploadProgress}%` }}
                  className="h-full bg-gradient-to-r from-[#00F0FF] to-[#7000FF]"
                />
              </div>
            </div>
          )}

          {/* Upload Button */}
          <Button
            data-testid="upload-reel-submit"
            onClick={handleUpload}
            disabled={!videoFile || uploading}
            className="w-full bg-gradient-to-r from-[#00F0FF] to-[#7000FF] hover:opacity-90 disabled:opacity-50"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Upload Reel
              </>
            )}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
