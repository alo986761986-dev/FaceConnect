import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Plus, X, ChevronLeft, ChevronRight, Eye, Trash2, Camera, 
  Image as ImageIcon, Video, Upload, Send, Clock, MoreVertical 
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

// Full-screen Status Viewer
export function StatusViewer({ status, onClose, onStatusViewed, isDark }) {
  const { token, user } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const videoRef = useRef(null);
  const progressInterval = useRef(null);

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
  }, [currentIndex, markViewed]);

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
  }, [currentIndex, isPaused, duration]);

  const goNext = () => {
    if (currentIndex < items.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      onStatusViewed?.();
      onClose();
    }
  };

  const goPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const handleMouseDown = () => setIsPaused(true);
  const handleMouseUp = () => setIsPaused(false);

  if (!status || items.length === 0) return null;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black flex items-center justify-center"
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onTouchStart={handleMouseDown}
      onTouchEnd={handleMouseUp}
    >
      {/* Progress bars */}
      <div className="absolute top-4 left-4 right-4 flex gap-1 z-10">
        {items.map((_, idx) => (
          <div 
            key={idx}
            className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden"
          >
            <div 
              className="h-full bg-white rounded-full transition-all"
              style={{ 
                width: idx < currentIndex ? '100%' : idx === currentIndex ? `${progress}%` : '0%'
              }}
            />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="absolute top-8 left-4 right-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <Avatar className="w-10 h-10 border-2 border-white">
            <AvatarImage src={status.user?.avatar} />
            <AvatarFallback className="bg-[#00E676] text-white">
              {status.user?.display_name?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-white font-medium text-sm">
              {status.user?.display_name || status.user?.username}
            </p>
            <p className="text-white/60 text-xs flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {new Date(currentItem?.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="icon"
          className="text-white hover:bg-white/20"
          onClick={onClose}
        >
          <X className="w-6 h-6" />
        </Button>
      </div>

      {/* Navigation areas */}
      <div 
        className="absolute left-0 top-0 bottom-0 w-1/3 cursor-pointer z-10"
        onClick={(e) => { e.stopPropagation(); goPrev(); }}
      />
      <div 
        className="absolute right-0 top-0 bottom-0 w-1/3 cursor-pointer z-10"
        onClick={(e) => { e.stopPropagation(); goNext(); }}
      />

      {/* Navigation arrows */}
      {currentIndex > 0 && (
        <button
          className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 p-2 rounded-full hover:bg-white/30 z-20"
          onClick={(e) => { e.stopPropagation(); goPrev(); }}
        >
          <ChevronLeft className="w-6 h-6 text-white" />
        </button>
      )}
      {currentIndex < items.length - 1 && (
        <button
          className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 p-2 rounded-full hover:bg-white/30 z-20"
          onClick={(e) => { e.stopPropagation(); goNext(); }}
        >
          <ChevronRight className="w-6 h-6 text-white" />
        </button>
      )}

      {/* Media content */}
      <div className="max-w-[500px] max-h-[80vh] w-full">
        {currentItem?.media_type === 'image' ? (
          <img 
            src={`${API_URL}${currentItem.media_url}`}
            alt=""
            className="w-full h-full object-contain"
          />
        ) : (
          <video
            ref={videoRef}
            src={`${API_URL}${currentItem?.media_url}`}
            className="w-full h-full object-contain"
            autoPlay
            muted
            playsInline
          />
        )}
      </div>

      {/* Caption */}
      {currentItem?.caption && (
        <div className="absolute bottom-8 left-4 right-4 text-center z-10">
          <p className="text-white text-lg bg-black/40 px-4 py-2 rounded-lg inline-block">
            {currentItem.caption}
          </p>
        </div>
      )}

      {/* View count (for own status) */}
      {status.user_id === user?.id && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 text-white/70 z-10">
          <Eye className="w-4 h-4" />
          <span className="text-sm">{status.total_views || 0} views</span>
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
