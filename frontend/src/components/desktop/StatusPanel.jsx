import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Plus, X, ChevronLeft, ChevronRight, Eye, Trash2, Camera, 
  Image as ImageIcon, Video, Upload, Send, Clock, MoreVertical,
  ArrowLeft, Play, Pause, Volume2, VolumeX, Smile, Sticker
} from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

// Status Creation Modal
export function StatusCreationModal({ isOpen, onClose, onStatusCreated, isDark }) {
  const { token, user } = useAuth();
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [captions, setCaptions] = useState({});
  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    const validFiles = files.filter(f => 
      f.type.startsWith('image/') || f.type.startsWith('video/')
    );
    
    if (selectedFiles.length + validFiles.length > 20) {
      toast.error("Maximum 20 items per status");
      return;
    }
    
    const newFiles = validFiles.map(f => ({
      file: f,
      preview: URL.createObjectURL(f),
      type: f.type.startsWith('image/') ? 'image' : 'video',
      id: Date.now() + Math.random()
    }));
    
    setSelectedFiles(prev => [...prev, ...newFiles]);
  };

  const removeFile = (id) => {
    setSelectedFiles(prev => prev.filter(f => f.id !== id));
    const newCaptions = { ...captions };
    delete newCaptions[id];
    setCaptions(newCaptions);
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      toast.error("Select at least one photo or video");
      return;
    }

    setUploading(true);
    try {
      const uploadedItems = [];
      
      for (const fileData of selectedFiles) {
        const formData = new FormData();
        formData.append('file', fileData.file);
        formData.append('token', token);

        const uploadRes = await fetch(`${API_URL}/api/status/upload`, {
          method: 'POST',
          body: formData
        });

        if (!uploadRes.ok) {
          throw new Error(`Failed to upload ${fileData.file.name}`);
        }

        const uploadData = await uploadRes.json();
        uploadedItems.push({
          media_url: uploadData.media_url,
          media_type: uploadData.media_type,
          caption: captions[fileData.id] || null,
          duration: fileData.type === 'video' ? 15 : 5
        });
      }

      // Create status with all uploaded items
      const statusRes = await fetch(`${API_URL}/api/status?token=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: uploadedItems })
      });

      if (!statusRes.ok) {
        throw new Error("Failed to create status");
      }

      toast.success("Status created successfully!");
      setSelectedFiles([]);
      setCaptions({});
      onStatusCreated?.();
      onClose();
    } catch (error) {
      console.error("Status upload error:", error);
      toast.error(error.message || "Failed to create status");
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    selectedFiles.forEach(f => URL.revokeObjectURL(f.preview));
    setSelectedFiles([]);
    setCaptions({});
    onClose();
  };

  if (!isOpen) return null;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      onClick={handleClose}
    >
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className={`w-[500px] max-h-[80vh] rounded-xl overflow-hidden ${isDark ? 'bg-[#1F2937]' : 'bg-white'}`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`flex items-center justify-between p-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Create Status
          </h3>
          <Button variant="ghost" size="icon" onClick={handleClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* File selection area */}
          <div 
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
              isDark ? 'border-gray-600 hover:border-[#00E676]' : 'border-gray-300 hover:border-[#00E676]'
            }`}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              className="hidden"
              onChange={handleFileSelect}
            />
            <div className="flex justify-center gap-4 mb-3">
              <Camera className={`w-8 h-8 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
              <Video className={`w-8 h-8 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
            </div>
            <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              Click to add photos or videos
            </p>
            <p className={`text-sm mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              Maximum 20 items per status
            </p>
          </div>

          {/* Selected files preview */}
          {selectedFiles.length > 0 && (
            <ScrollArea className="mt-4 max-h-[300px]">
              <div className="grid grid-cols-3 gap-3">
                {selectedFiles.map((fileData, index) => (
                  <div key={fileData.id} className="relative group">
                    {fileData.type === 'image' ? (
                      <img 
                        src={fileData.preview}
                        alt=""
                        className="w-full h-24 object-cover rounded-lg"
                      />
                    ) : (
                      <video 
                        src={fileData.preview}
                        className="w-full h-24 object-cover rounded-lg"
                      />
                    )}
                    <div className="absolute top-1 left-1 bg-black/60 px-1.5 py-0.5 rounded text-xs text-white">
                      {index + 1}
                    </div>
                    {fileData.type === 'video' && (
                      <div className="absolute bottom-1 left-1 bg-black/60 px-1.5 py-0.5 rounded">
                        <Video className="w-3 h-3 text-white" />
                      </div>
                    )}
                    <button
                      className="absolute top-1 right-1 bg-red-500 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeFile(fileData.id)}
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ))}
              </div>
              <p className={`text-sm mt-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                {selectedFiles.length}/20 items selected
              </p>
            </ScrollArea>
          )}
        </div>

        {/* Footer */}
        <div className={`flex justify-end gap-2 p-4 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button 
            className="bg-[#00E676] hover:bg-[#00E676]/90 text-white"
            onClick={handleUpload}
            disabled={uploading || selectedFiles.length === 0}
          >
            {uploading ? (
              <span className="flex items-center gap-2">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <Upload className="w-4 h-4" />
                </motion.div>
                Uploading...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Send className="w-4 h-4" />
                Post Status
              </span>
            )}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Full-screen Status Viewer - WhatsApp Style
export function StatusViewer({ status, onClose, onStatusViewed, isDark }) {
  const { token, user } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const videoRef = useRef(null);
  const progressInterval = useRef(null);
  const replyInputRef = useRef(null);

  const items = status?.items || [];
  const currentItem = items[currentIndex];
  const duration = (currentItem?.duration || 5) * 1000; // Convert to ms

  // Mark item as viewed
  const markViewed = useCallback(async () => {
    if (!currentItem || status.user_id === user?.id) return;
    
    try {
      await fetch(`${API_URL}/api/status/${status.id}/view/${currentItem.id}?token=${token}`, {
        method: 'POST'
      });
    } catch (error) {
      console.error("Error marking status as viewed:", error);
    }
  }, [currentItem, status, token, user]);

  useEffect(() => {
    if (currentItem) {
      markViewed();
    }
  }, [currentIndex, markViewed, currentItem]);

  const goNext = useCallback(() => {
    if (currentIndex < items.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      onStatusViewed?.();
      onClose();
    }
  }, [currentIndex, items.length, onStatusViewed, onClose]);

  const goPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  // Progress bar animation
  useEffect(() => {
    if (isPaused) return;

    setProgress(0);
    const startTime = Date.now();
    
    progressInterval.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const newProgress = Math.min((elapsed / duration) * 100, 100);
      setProgress(newProgress);
      
      if (newProgress >= 100) {
        clearInterval(progressInterval.current);
        goNext();
      }
    }, 50);

    return () => clearInterval(progressInterval.current);
  }, [currentIndex, isPaused, duration, goNext]);

  const togglePause = (e) => {
    e?.stopPropagation();
    setIsPaused(prev => !prev);
    if (videoRef.current) {
      if (isPaused) {
        videoRef.current.play();
      } else {
        videoRef.current.pause();
      }
    }
  };

  const toggleMute = (e) => {
    e?.stopPropagation();
    setIsMuted(prev => !prev);
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
    }
  };

  const handleSendReply = async () => {
    if (!replyText.trim()) return;
    
    try {
      // Send reply as a message to the status owner
      await fetch(`${API_URL}/api/messages?token=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient_id: status.user_id,
          content: `📷 Risposta allo stato: ${replyText}`,
          type: 'text'
        })
      });
      setReplyText('');
      toast.success('Risposta inviata');
    } catch (error) {
      console.error('Error sending reply:', error);
      toast.error('Invio risposta fallito');
    }
  };

  const handleContentClick = (e) => {
    // Don't navigate if clicking on controls
    if (e.target.closest('.controls-area')) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    
    if (clickX < width / 3) {
      goPrev();
    } else if (clickX > (width * 2) / 3) {
      goNext();
    } else {
      togglePause(e);
    }
  };

  // Format time ago in Italian
  const getTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    
    if (diffMins < 1) return "Adesso";
    if (diffMins < 60) return `${diffMins} min fa`;
    if (diffHours < 24) return `Oggi alle ore ${date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}`;
    return date.toLocaleDateString('it-IT');
  };

  if (!status || items.length === 0) return null;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] bg-black flex flex-col"
    >
      {/* Top Bar with Progress */}
      <div className="absolute top-0 left-0 right-0 z-30 px-4 pt-2">
        {/* Progress bars */}
        <div className="flex gap-1">
          {items.map((_, idx) => (
            <div 
              key={idx}
              className="flex-1 h-[3px] bg-white/30 rounded-full overflow-hidden"
            >
              <div 
                className="h-full bg-white rounded-full"
                style={{ 
                  width: idx < currentIndex ? '100%' : idx === currentIndex ? `${progress}%` : '0%',
                  transition: idx === currentIndex ? 'none' : 'width 0.3s'
                }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Header */}
      <div className="absolute top-4 left-0 right-0 z-30 px-4 flex items-center justify-between">
        {/* Back button */}
        <button
          onClick={onClose}
          className="p-2 -ml-2 text-white/80 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>

        {/* User info */}
        <div className="flex-1 flex items-center gap-3 ml-2">
          <Avatar className="w-10 h-10 border-2 border-white/50">
            <AvatarImage src={status.user?.avatar} />
            <AvatarFallback className="bg-gradient-to-br from-[#00E676] to-[#00a884] text-white text-sm">
              {status.user?.display_name?.charAt(0)?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-sm truncate">
              {status.user?.display_name || status.user?.username}
            </p>
            <p className="text-white/60 text-xs">
              {getTimeAgo(currentItem?.created_at)}
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="controls-area flex items-center gap-1">
          {/* Pause/Play button */}
          <button
            onClick={togglePause}
            className="p-2 text-white/80 hover:text-white transition-colors"
          >
            {isPaused ? (
              <Play className="w-6 h-6 fill-current" />
            ) : (
              <Pause className="w-6 h-6" />
            )}
          </button>

          {/* Mute button */}
          <button
            onClick={toggleMute}
            className="p-2 text-white/80 hover:text-white transition-colors"
          >
            {isMuted ? (
              <VolumeX className="w-6 h-6" />
            ) : (
              <Volume2 className="w-6 h-6" />
            )}
          </button>

          {/* More options */}
          <button className="p-2 text-white/80 hover:text-white transition-colors">
            <MoreVertical className="w-6 h-6" />
          </button>

          {/* Close button */}
          <button
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div 
        className="flex-1 flex items-center justify-center cursor-pointer"
        onClick={handleContentClick}
      >
        {/* Navigation arrows */}
        <button
          className={`absolute left-4 top-1/2 -translate-y-1/2 p-2 text-white/50 hover:text-white transition-colors z-20 ${
            currentIndex === 0 ? 'opacity-30 cursor-default' : ''
          }`}
          onClick={(e) => { e.stopPropagation(); goPrev(); }}
          disabled={currentIndex === 0}
        >
          <ChevronLeft className="w-8 h-8" />
        </button>

        <button
          className={`absolute right-4 top-1/2 -translate-y-1/2 p-2 text-white/50 hover:text-white transition-colors z-20 ${
            currentIndex === items.length - 1 ? 'opacity-30 cursor-default' : ''
          }`}
          onClick={(e) => { e.stopPropagation(); goNext(); }}
          disabled={currentIndex === items.length - 1}
        >
          <ChevronRight className="w-8 h-8" />
        </button>

        {/* Media content */}
        <div className="max-w-[400px] max-h-[70vh] w-full relative">
          {currentItem?.media_type === 'image' ? (
            <img 
              src={`${API_URL}${currentItem.media_url}`}
              alt=""
              className="w-full h-full object-contain rounded-lg"
              draggable={false}
            />
          ) : (
            <video
              ref={videoRef}
              src={`${API_URL}${currentItem?.media_url}`}
              className="w-full h-full object-contain rounded-lg"
              autoPlay
              muted={isMuted}
              playsInline
              loop={false}
            />
          )}
        </div>
      </div>

      {/* Caption (if any) */}
      {currentItem?.caption && (
        <div className="absolute bottom-24 left-0 right-0 text-center px-8 z-20">
          <p className="text-white text-base bg-black/40 px-4 py-2 rounded-lg inline-block max-w-md">
            {currentItem.caption}
          </p>
        </div>
      )}

      {/* Bottom Reply Bar - WhatsApp Style */}
      <div className="absolute bottom-0 left-0 right-0 z-30 p-4 bg-gradient-to-t from-black/80 to-transparent">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          {/* Emoji button */}
          <button 
            className="p-2 text-white/70 hover:text-white transition-colors"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          >
            <Smile className="w-6 h-6" />
          </button>

          {/* Sticker button */}
          <button className="p-2 text-white/70 hover:text-white transition-colors">
            <Sticker className="w-6 h-6" />
          </button>

          {/* Reply input */}
          <div className="flex-1 relative">
            <input
              ref={replyInputRef}
              type="text"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendReply();
                }
              }}
              onFocus={() => setIsPaused(true)}
              onBlur={() => !replyText && setIsPaused(false)}
              placeholder="Scrivi una risposta..."
              className="w-full px-4 py-3 bg-transparent border-b border-white/30 text-white placeholder:text-white/50 focus:outline-none focus:border-white/60 text-sm"
            />
          </div>

          {/* Send button */}
          <button 
            onClick={handleSendReply}
            disabled={!replyText.trim()}
            className={`p-3 rounded-full transition-all ${
              replyText.trim() 
                ? 'bg-[#00E676] text-white hover:bg-[#00E676]/90' 
                : 'text-white/50'
            }`}
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* View count (for own status) */}
      {status.user_id === user?.id && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex items-center gap-2 text-white/60 z-20">
          <Eye className="w-4 h-4" />
          <span className="text-sm">{status.total_views || 0} visualizzazioni</span>
        </div>
      )}
    </motion.div>
  );
}

// Main Status Panel Component
export default function StatusPanel({ isDark, user, onBack }) {
  const { token } = useAuth();
  const [myStatus, setMyStatus] = useState(null);
  const [contactStatuses, setContactStatuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreationModal, setShowCreationModal] = useState(false);
  const [viewingStatus, setViewingStatus] = useState(null);

  const fetchStatuses = useCallback(async () => {
    if (!token) return;
    
    setLoading(true);
    try {
      // Fetch my status
      const myStatusRes = await fetch(`${API_URL}/api/status/my?token=${token}`);
      if (myStatusRes.ok) {
        const data = await myStatusRes.json();
        setMyStatus(data);
      }

      // Fetch contacts' statuses
      const contactsRes = await fetch(`${API_URL}/api/status/contacts?token=${token}`);
      if (contactsRes.ok) {
        const data = await contactsRes.json();
        setContactStatuses(data || []);
      }
    } catch (error) {
      console.error("Error fetching statuses:", error);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchStatuses();
  }, [fetchStatuses]);

  const handleDeleteMyStatus = async () => {
    if (!myStatus) return;
    
    try {
      const res = await fetch(`${API_URL}/api/status/${myStatus.id}?token=${token}`, {
        method: 'DELETE'
      });
      
      if (res.ok) {
        setMyStatus(null);
        toast.success("Status deleted");
      }
    } catch (error) {
      console.error("Error deleting status:", error);
      toast.error("Failed to delete status");
    }
  };

  const getTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  // Separate viewed and unviewed statuses
  const unviewedStatuses = contactStatuses.filter(s => !s.is_viewed);
  const viewedStatuses = contactStatuses.filter(s => s.is_viewed);

  return (
    <ScrollArea className="flex-1">
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Status Updates
          </h3>
          {onBack && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={onBack}
              className="text-[#00E676]"
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> Back
            </Button>
          )}
        </div>

        {/* My Status */}
        <div 
          className={`flex items-center gap-3 p-3 rounded-lg mb-4 cursor-pointer transition-colors ${
            isDark ? 'hover:bg-[#161B22]' : 'hover:bg-gray-100'
          }`}
          onClick={() => myStatus ? setViewingStatus(myStatus) : setShowCreationModal(true)}
        >
          <div className="relative">
            <div className={`p-0.5 rounded-full ${
              myStatus ? 'bg-gradient-to-r from-[#00E676] to-[#00BFA5]' : ''
            }`}>
              <Avatar className={`w-14 h-14 ${myStatus ? 'border-2 border-[#111b21]' : ''}`}>
                <AvatarImage src={user?.avatar} />
                <AvatarFallback className="bg-[#00E676] text-white">
                  {user?.display_name?.charAt(0) || user?.username?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
            </div>
            {!myStatus && (
              <div className="absolute bottom-0 right-0 w-6 h-6 bg-[#00E676] rounded-full flex items-center justify-center border-2 border-white dark:border-[#111b21]">
                <Plus className="w-4 h-4 text-white" />
              </div>
            )}
          </div>
          <div className="flex-1">
            <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>My Status</p>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              {myStatus 
                ? `${myStatus.items?.length || 0} item${myStatus.items?.length !== 1 ? 's' : ''} • ${myStatus.total_views || 0} views`
                : "Tap to add status update"
              }
            </p>
          </div>
          {myStatus && (
            <Button
              variant="ghost"
              size="icon"
              className={`${isDark ? 'hover:bg-red-500/20 text-red-400' : 'hover:bg-red-100 text-red-500'}`}
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteMyStatus();
              }}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Recent Updates (Unviewed) */}
        {unviewedStatuses.length > 0 && (
          <>
            <p className={`text-xs uppercase font-medium mb-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              Recent updates
            </p>
            <div className="space-y-1 mb-4">
              {unviewedStatuses.map(status => (
                <div
                  key={status.id}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                    isDark ? 'hover:bg-[#161B22]' : 'hover:bg-gray-100'
                  }`}
                  onClick={() => setViewingStatus(status)}
                >
                  <div className="p-0.5 rounded-full bg-gradient-to-r from-[#00E676] to-[#00BFA5]">
                    <Avatar className="w-12 h-12 border-2 border-[#111b21]">
                      <AvatarImage src={status.user?.avatar} />
                      <AvatarFallback className="bg-[#00E676] text-white">
                        {status.user?.display_name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {status.user?.display_name || status.user?.username}
                    </p>
                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      {status.items_count} item{status.items_count !== 1 ? 's' : ''} • {getTimeAgo(status.created_at)}
                    </p>
                  </div>
                  {status.preview_url && (
                    <div className="w-10 h-10 rounded-lg overflow-hidden">
                      {status.preview_type === 'image' ? (
                        <img 
                          src={`${API_URL}${status.preview_url}`}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                          <Video className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {/* Viewed Updates */}
        {viewedStatuses.length > 0 && (
          <>
            <p className={`text-xs uppercase font-medium mb-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              Viewed updates
            </p>
            <div className="space-y-1">
              {viewedStatuses.map(status => (
                <div
                  key={status.id}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors opacity-70 ${
                    isDark ? 'hover:bg-[#161B22]' : 'hover:bg-gray-100'
                  }`}
                  onClick={() => setViewingStatus(status)}
                >
                  <div className="p-0.5 rounded-full bg-gray-500">
                    <Avatar className="w-12 h-12 border-2 border-[#111b21]">
                      <AvatarImage src={status.user?.avatar} />
                      <AvatarFallback className="bg-gray-600 text-white">
                        {status.user?.display_name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {status.user?.display_name || status.user?.username}
                    </p>
                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      {status.items_count} item{status.items_count !== 1 ? 's' : ''} • {getTimeAgo(status.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Empty state */}
        {!loading && contactStatuses.length === 0 && (
          <div className={`text-center py-8 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            <p className="text-sm">No recent updates from your contacts</p>
            <p className="text-xs mt-1">Status updates from your contacts will appear here</p>
          </div>
        )}

        {loading && (
          <div className={`text-center py-8 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="inline-block"
            >
              <Clock className="w-6 h-6" />
            </motion.div>
            <p className="text-sm mt-2">Loading statuses...</p>
          </div>
        )}
      </div>

      {/* Status Creation Modal */}
      <AnimatePresence>
        {showCreationModal && (
          <StatusCreationModal
            isOpen={showCreationModal}
            onClose={() => setShowCreationModal(false)}
            onStatusCreated={fetchStatuses}
            isDark={isDark}
          />
        )}
      </AnimatePresence>

      {/* Status Viewer */}
      <AnimatePresence>
        {viewingStatus && (
          <StatusViewer
            status={viewingStatus}
            onClose={() => setViewingStatus(null)}
            onStatusViewed={() => {
              fetchStatuses();
              setViewingStatus(null);
            }}
            isDark={isDark}
          />
        )}
      </AnimatePresence>
    </ScrollArea>
  );
}
