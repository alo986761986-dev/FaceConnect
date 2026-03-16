import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Radio, Users, Eye, Play, Plus, ArrowLeft, Search,
  Video, RefreshCw, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { useSettings } from "@/context/SettingsContext";
import { haptic } from "@/utils/mobile";
import BottomNav from "@/components/BottomNav";

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Stream Card Component
function StreamCard({ stream, onClick, isDark }) {
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`w-full text-left rounded-xl overflow-hidden ${isDark ? 'bg-[#1A1A1A]' : 'bg-white shadow-md'}`}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video bg-gradient-to-br from-[#7000FF]/30 to-[#00F0FF]/30">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#00F0FF] to-[#7000FF] flex items-center justify-center">
            <span className="text-2xl text-white font-bold">
              {stream.display_name?.[0]?.toUpperCase() || "?"}
            </span>
          </div>
        </div>
        
        {/* Live Badge */}
        <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-1 rounded bg-red-500">
          <Radio className="w-3 h-3 text-white animate-pulse" />
          <span className="text-white text-xs font-bold">LIVE</span>
        </div>
        
        {/* Viewer Count */}
        <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded bg-black/60">
          <Eye className="w-3 h-3 text-white" />
          <span className="text-white text-xs">{stream.viewer_count}</span>
        </div>
        
        {/* Play Button Overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 hover:opacity-100 transition-opacity">
          <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-lg flex items-center justify-center">
            <Play className="w-8 h-8 text-white ml-1" />
          </div>
        </div>
      </div>
      
      {/* Info */}
      <div className="p-3">
        <h3 className={`font-bold truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
          {stream.title}
        </h3>
        <div className="flex items-center gap-2 mt-1">
          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#00F0FF] to-[#7000FF] flex items-center justify-center">
            <span className="text-[10px] text-white font-bold">
              {stream.username?.[0]?.toUpperCase()}
            </span>
          </div>
          <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            {stream.display_name}
          </span>
        </div>
      </div>
    </motion.button>
  );
}

export default function LiveStreams() {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const { isDark, t } = useSettings();
  
  const [streams, setStreams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showStartDialog, setShowStartDialog] = useState(false);
  const [streamTitle, setStreamTitle] = useState("");
  const [streamDescription, setStreamDescription] = useState("");
  const [isStarting, setIsStarting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch live streams
  const fetchStreams = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    
    try {
      const response = await fetch(`${API_URL}/api/streams?token=${token}`);
      if (response.ok) {
        const data = await response.json();
        setStreams(data);
      }
    } catch (error) {
      toast.error("Failed to load streams");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchStreams();
    }
  }, [token]);

  // Start a new stream
  const handleStartStream = async () => {
    if (!streamTitle.trim()) {
      toast.error("Please enter a title for your stream");
      return;
    }
    
    setIsStarting(true);
    haptic.medium();
    
    try {
      const response = await fetch(`${API_URL}/api/streams?token=${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: streamTitle,
          description: streamDescription
        })
      });
      
      if (!response.ok) throw new Error("Failed to start stream");
      
      const data = await response.json();
      haptic.success();
      toast.success("Stream started!");
      navigate(`/live/${data.id}`);
    } catch (error) {
      toast.error("Failed to start stream");
    } finally {
      setIsStarting(false);
    }
  };

  // Filter streams by search
  const filteredStreams = streams.filter(stream =>
    stream.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    stream.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    stream.display_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={`min-h-screen pb-24 ${isDark ? 'bg-[#0A0A0A]' : 'bg-gray-50'}`}>
      {/* Header */}
      <div className={`sticky top-0 z-40 backdrop-blur-lg border-b ${isDark ? 'bg-[#0A0A0A]/95 border-white/5' : 'bg-white/95 border-gray-200'}`}>
        <div className="flex items-center gap-4 px-4 py-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className={isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className={`text-xl font-bold font-['Outfit'] ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Live Streams
          </h1>
          <div className="flex-1" />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => fetchStreams(true)}
            disabled={refreshing}
            className={isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        
        {/* Search */}
        <div className="px-4 pb-4">
          <div className="relative">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
            <Input
              placeholder="Search streams..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`pl-10 ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-gray-100 border-gray-200'}`}
            />
          </div>
        </div>
      </div>

      {/* Go Live Button */}
      <div className="px-4 py-4">
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowStartDialog(true)}
          className="w-full p-4 rounded-xl bg-gradient-to-r from-[#FF3366] to-[#7000FF] flex items-center justify-center gap-3"
        >
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <Video className="w-5 h-5 text-white" />
          </div>
          <div className="text-left">
            <p className="text-white font-bold text-lg">Go Live</p>
            <p className="text-white/70 text-sm">Start streaming to your followers</p>
          </div>
        </motion.button>
      </div>

      {/* Streams Grid */}
      <div className="px-4">
        <h2 className={`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Live Now
        </h2>
        
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-[#00F0FF] animate-spin" />
          </div>
        ) : filteredStreams.length === 0 ? (
          <div className={`text-center py-12 rounded-xl ${isDark ? 'bg-[#121212]' : 'bg-white'}`}>
            <Radio className={`w-12 h-12 mx-auto mb-4 ${isDark ? 'text-gray-600' : 'text-gray-400'}`} />
            <p className={`font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              No live streams right now
            </p>
            <p className={`text-sm mt-1 ${isDark ? 'text-gray-600' : 'text-gray-500'}`}>
              Be the first to go live!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {filteredStreams.map(stream => (
              <StreamCard
                key={stream.id}
                stream={stream}
                isDark={isDark}
                onClick={() => navigate(`/live/${stream.id}`)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Start Stream Dialog */}
      <Dialog open={showStartDialog} onOpenChange={setShowStartDialog}>
        <DialogContent className={`${isDark ? 'bg-[#121212] border-white/10' : 'bg-white border-gray-200'}`}>
          <DialogHeader>
            <DialogTitle className={`flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              <Radio className="w-5 h-5 text-red-500" />
              Start Live Stream
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <label className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Stream Title *
              </label>
              <Input
                placeholder="What's your stream about?"
                value={streamTitle}
                onChange={(e) => setStreamTitle(e.target.value)}
                className={isDark ? 'bg-white/5 border-white/10 text-white' : ''}
              />
            </div>
            
            <div className="space-y-2">
              <label className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Description (optional)
              </label>
              <Input
                placeholder="Add a description..."
                value={streamDescription}
                onChange={(e) => setStreamDescription(e.target.value)}
                className={isDark ? 'bg-white/5 border-white/10 text-white' : ''}
              />
            </div>
            
            <div className={`p-3 rounded-lg ${isDark ? 'bg-yellow-500/10 border border-yellow-500/20' : 'bg-yellow-50 border border-yellow-200'}`}>
              <p className={`text-sm ${isDark ? 'text-yellow-400' : 'text-yellow-700'}`}>
                Your camera and microphone will be used for streaming.
              </p>
            </div>
            
            <Button
              onClick={handleStartStream}
              disabled={isStarting || !streamTitle.trim()}
              className="w-full bg-gradient-to-r from-[#FF3366] to-[#7000FF] hover:opacity-90"
            >
              {isStarting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Starting...
                </>
              ) : (
                <>
                  <Video className="w-4 h-4 mr-2" />
                  Go Live
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
}
