import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { 
  ThumbsUp, MessageCircle, Send, Bookmark, Music2, 
  MoreHorizontal, Play, Pause, Volume2, VolumeX,
  Menu, Camera, Search, User, Heart, Share2, X,
  UserPlus, Flag, Eye, Download, Link2, Copy, Users
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import BottomNav from "@/components/BottomNav";

const API = process.env.REACT_APP_BACKEND_URL;

export default function FacebookReels() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [reels, setReels] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const containerRef = useRef(null);
  const observerRef = useRef(null);

  // Generate mock reels for demo
  const generateMockReels = useCallback(() => {
    return Array.from({ length: 10 }, (_, i) => ({
      id: `mock-${i}`,
      video_url: `https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4`,
      thumbnail_url: `https://picsum.photos/400/700?random=${i}`,
      caption: [
        "Stay till the end... it's worth it",
        "Can't believe this happened! 😱",
        "POV: quando ti svegli la mattina ☀️",
        "This trend is everything 💫",
        "Wait for it... 👀",
        "Tag someone who needs to see this!",
        "The best moment of my life ❤️",
        "Tutorial: Come fare la pasta perfetta 🍝",
        "Questo è il mio posto preferito 🏖️",
        "Live your best life ✨"
      ][i % 10],
      user: {
        id: `user-${i}`,
        username: ["pinki_kumari", "marco_italy", "giulia.style", "alessandro_fit", "sara.traveler", "luca.music", "elena_beauty", "matteo.chef", "chiara_art", "roberto_comedy"][i % 10],
        display_name: ["Pinki Kumari", "Marco Italy", "Giulia Style", "Alessandro Fit", "Sara Traveler", "Luca Music", "Elena Beauty", "Matteo Chef", "Chiara Art", "Roberto Comedy"][i % 10],
        avatar_url: `https://i.pravatar.cc/150?img=${20 + i}`,
        is_verified: i % 3 === 0
      },
      likes_count: Math.floor(Math.random() * 50000) + 1000,
      comments_count: Math.floor(Math.random() * 5000) + 100,
      shares_count: Math.floor(Math.random() * 1000) + 50,
      saves_count: Math.floor(Math.random() * 2000) + 100,
      views_count: Math.floor(Math.random() * 100000) + 10000,
      liked_by: [],
      created_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
      audio: {
        id: `audio-${i}`,
        title: ["Original Sound", "Trending Beat", "Viral Song 2026", "Summer Vibes", "Epic Music"][i % 5],
        artist: ["Creator", "DJ Mix", "Pop Artist", "EDM Producer", "Classical"][i % 5],
        cover_url: `https://picsum.photos/100/100?random=${100 + i}`
      }
    }));
  }, []);

  const fetchReels = useCallback(async () => {
    try {
      const response = await fetch(
        `${API}/api/reels-enhanced/feed?user_id=${user?.id || ""}&limit=20`
      );
      if (response.ok) {
        const data = await response.json();
        if (data.length === 0) {
          setReels(generateMockReels());
        } else {
          setReels(data);
        }
      } else {
        setReels(generateMockReels());
      }
    } catch (error) {
      console.error("Error fetching reels:", error);
      setReels(generateMockReels());
    } finally {
      setLoading(false);
    }
  }, [user?.id, generateMockReels]);

  useEffect(() => {
    fetchReels();
  }, [fetchReels]);

  // Intersection observer for auto-play
  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const video = entry.target.querySelector("video");
          if (video) {
            if (entry.isIntersecting) {
              video.play().catch(() => {});
            } else {
              video.pause();
            }
          }
        });
      },
      { threshold: 0.7 }
    );

    return () => observerRef.current?.disconnect();
  }, []);

  const recordView = useCallback(async (reelId) => {
    if (!reelId || !user?.id || reelId.startsWith('mock-')) return;
    try {
      await fetch(`${API}/api/reels-enhanced/reels/${reelId}/view`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.id, watch_time: 0 })
      });
    } catch (error) {
      // Silent fail
    }
  }, [user?.id]);

  // Handle scroll snap
  const handleScroll = useCallback((e) => {
    const container = e.target;
    const scrollTop = container.scrollTop;
    const height = container.clientHeight;
    const newIndex = Math.round(scrollTop / height);
    
    if (newIndex !== currentIndex && newIndex >= 0 && newIndex < reels.length) {
      setCurrentIndex(newIndex);
      recordView(reels[newIndex]?.id);
    }
  }, [currentIndex, reels, recordView]);

  if (loading) {
    return (
      <div className="h-screen bg-black flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-white/20 border-t-[#1877F2] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen bg-black relative">
      {/* Facebook-style Header */}
      <div className="absolute top-0 left-0 right-0 z-50 px-4 py-3 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent">
        {/* Left: Menu & Title */}
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowSidebar(true)}
            className="p-2 text-white"
          >
            <Menu className="w-6 h-6" />
          </button>
          <h1 className="text-white text-xl font-bold">Reels</h1>
        </div>
        
        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          <button 
            onClick={() => navigate('/reels/create')}
            className="p-2 text-white"
          >
            <Camera className="w-6 h-6" />
          </button>
          <button 
            onClick={() => navigate('/search')}
            className="p-2 text-white"
          >
            <Search className="w-6 h-6" />
          </button>
          <button 
            onClick={() => navigate('/profile')}
            className="p-2 text-white"
          >
            <User className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Reels Container */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="h-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
        style={{ scrollSnapType: 'y mandatory' }}
      >
        {reels.map((reel, index) => (
          <FacebookReelItem
            key={reel.id}
            reel={reel}
            isActive={index === currentIndex}
            isMuted={isMuted}
            onToggleMute={() => setIsMuted(!isMuted)}
            user={user}
            token={token}
            observerRef={observerRef}
          />
        ))}

        {reels.length === 0 && (
          <div className="h-screen flex items-center justify-center">
            <p className="text-white/60">Nessun reel disponibile</p>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <BottomNav activeTab="reels" />

      {/* Sidebar Menu */}
      <AnimatePresence>
        {showSidebar && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-[60]"
              onClick={() => setShowSidebar(false)}
            />
            <motion.div
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              className="fixed left-0 top-0 bottom-0 w-72 bg-[#1a1a1a] z-[70] flex flex-col"
            >
              {/* Sidebar Header */}
              <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <h2 className="text-white font-bold text-lg">Menu Reels</h2>
                <button 
                  onClick={() => setShowSidebar(false)}
                  className="p-1 text-white/60 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              {/* Sidebar Items */}
              <div className="flex-1 p-2">
                {[
                  { icon: Play, label: "Per Te", active: true },
                  { icon: Users, label: "Seguiti" },
                  { icon: Heart, label: "Piaciuti" },
                  { icon: Bookmark, label: "Salvati" },
                  { icon: Camera, label: "I Tuoi Reels" },
                  { icon: Music2, label: "Audio Salvati" },
                ].map((item, i) => (
                  <button
                    key={i}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                      item.active 
                        ? 'bg-[#1877F2] text-white' 
                        : 'text-white/70 hover:bg-white/10'
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </button>
                ))}
              </div>

              {/* User Profile */}
              <div className="p-4 border-t border-white/10">
                <div className="flex items-center gap-3">
                  <img 
                    src={user?.avatar || `https://i.pravatar.cc/150?img=1`}
                    alt=""
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div className="flex-1">
                    <p className="text-white font-medium">{user?.display_name || 'Utente'}</p>
                    <p className="text-white/50 text-sm">@{user?.username || 'utente'}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function FacebookReelItem({ reel, isActive, isMuted, onToggleMute, user, token, observerRef }) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [liked, setLiked] = useState(reel.liked_by?.includes(user?.id));
  const [likesCount, setLikesCount] = useState(reel.likes_count || 0);
  const [saved, setSaved] = useState(false);
  const [savesCount, setSavesCount] = useState(reel.saves_count || 0);
  const [showComments, setShowComments] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [progress, setProgress] = useState(0);
  const [following, setFollowing] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    const observer = observerRef.current;
    
    if (container && observer) {
      observer.observe(container);
    }
    return () => {
      if (container && observer) {
        observer.unobserve(container);
      }
    };
  }, [observerRef]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
    }
  }, [isMuted]);

  // Update progress bar
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateProgress = () => {
      if (video.duration) {
        setProgress((video.currentTime / video.duration) * 100);
      }
    };

    video.addEventListener('timeupdate', updateProgress);
    video.addEventListener('play', () => setIsPlaying(true));
    video.addEventListener('pause', () => setIsPlaying(false));

    return () => {
      video.removeEventListener('timeupdate', updateProgress);
      video.removeEventListener('play', () => setIsPlaying(true));
      video.removeEventListener('pause', () => setIsPlaying(false));
    };
  }, []);

  const togglePlay = () => {
    if (!videoRef.current) return;
    
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleLike = async () => {
    if (!user) {
      toast.error("Accedi per mettere mi piace");
      return;
    }
    
    const newLiked = !liked;
    setLiked(newLiked);
    setLikesCount(prev => newLiked ? prev + 1 : prev - 1);

    if (!reel.id.startsWith('mock-')) {
      try {
        await fetch(`${API}/api/reels/${reel.id}/like`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token })
        });
      } catch (error) {
        setLiked(!newLiked);
        setLikesCount(prev => newLiked ? prev - 1 : prev + 1);
      }
    }
  };

  const handleSave = () => {
    const newSaved = !saved;
    setSaved(newSaved);
    setSavesCount(prev => newSaved ? prev + 1 : prev - 1);
    toast.success(newSaved ? "Reel salvato" : "Reel rimosso dai salvati");
  };

  const handleShare = async () => {
    setShowShareMenu(true);
  };

  const shareAction = async (type) => {
    setShowShareMenu(false);
    
    try {
      if (type === 'copy') {
        await navigator.clipboard.writeText(`${window.location.origin}/reels/${reel.id}`);
        toast.success("Link copiato!");
      } else if (type === 'native' && navigator.share) {
        await navigator.share({
          title: reel.caption || "Guarda questo reel!",
          url: `${window.location.origin}/reels/${reel.id}`
        });
      }
    } catch (error) {
      // Silent fail
    }
  };

  const handleFollow = () => {
    setFollowing(!following);
    toast.success(following ? "Non segui più" : `Ora segui ${reel.user?.display_name}`);
  };

  const handleDoubleTap = () => {
    if (!liked) {
      handleLike();
      // Show heart animation
      const heart = document.createElement('div');
      heart.innerHTML = '❤️';
      heart.className = 'fixed text-6xl z-[100] pointer-events-none animate-ping';
      heart.style.left = '50%';
      heart.style.top = '50%';
      heart.style.transform = 'translate(-50%, -50%)';
      document.body.appendChild(heart);
      setTimeout(() => heart.remove(), 800);
    }
  };

  return (
    <div
      ref={containerRef}
      className="h-screen w-full snap-start relative flex items-center justify-center bg-black"
      onDoubleClick={handleDoubleTap}
    >
      {/* Video */}
      <video
        ref={videoRef}
        src={reel.video_url}
        className="h-full w-full object-cover"
        loop
        playsInline
        muted={isMuted}
        poster={reel.thumbnail_url}
        onClick={togglePlay}
      />

      {/* Play/Pause overlay */}
      <AnimatePresence>
        {!isPlaying && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none"
          >
            <Play className="w-20 h-20 text-white/80 fill-white/80" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top gradient */}
      <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />

      {/* Bottom gradient */}
      <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />

      {/* Right side actions - Facebook Style */}
      <div className="absolute right-3 bottom-36 flex flex-col items-center gap-5">
        {/* Like */}
        <button onClick={handleLike} className="flex flex-col items-center">
          <motion.div 
            whileTap={{ scale: 0.8 }}
            className={`w-11 h-11 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center ${liked ? "text-[#1877F2]" : "text-white"}`}
          >
            <ThumbsUp className={`w-6 h-6 ${liked ? "fill-[#1877F2]" : ""}`} />
          </motion.div>
          <span className="text-white text-xs font-semibold mt-1">{formatCount(likesCount)}</span>
        </button>

        {/* Comments */}
        <button onClick={() => setShowComments(true)} className="flex flex-col items-center">
          <motion.div 
            whileTap={{ scale: 0.8 }}
            className="w-11 h-11 rounded-full bg-white/10 backdrop-blur-sm text-white flex items-center justify-center"
          >
            <MessageCircle className="w-6 h-6" />
          </motion.div>
          <span className="text-white text-xs font-semibold mt-1">{formatCount(reel.comments_count || 0)}</span>
        </button>

        {/* Share */}
        <button onClick={handleShare} className="flex flex-col items-center">
          <motion.div 
            whileTap={{ scale: 0.8 }}
            className="w-11 h-11 rounded-full bg-white/10 backdrop-blur-sm text-white flex items-center justify-center"
          >
            <Send className="w-6 h-6 rotate-12" />
          </motion.div>
          <span className="text-white text-xs font-semibold mt-1">{formatCount(reel.shares_count || 0)}</span>
        </button>

        {/* Save / Bookmark */}
        <button onClick={handleSave} className="flex flex-col items-center">
          <motion.div 
            whileTap={{ scale: 0.8 }}
            className={`w-11 h-11 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center ${saved ? "text-yellow-400" : "text-white"}`}
          >
            <Bookmark className={`w-6 h-6 ${saved ? "fill-yellow-400" : ""}`} />
          </motion.div>
          <span className="text-white text-xs font-semibold mt-1">{formatCount(savesCount)}</span>
        </button>

        {/* More options */}
        <button onClick={() => setShowMoreMenu(true)} className="flex flex-col items-center">
          <motion.div 
            whileTap={{ scale: 0.8 }}
            className="w-11 h-11 rounded-full bg-white/10 backdrop-blur-sm text-white flex items-center justify-center"
          >
            <MoreHorizontal className="w-6 h-6" />
          </motion.div>
        </button>
      </div>

      {/* Bottom info - Facebook Style */}
      <div className="absolute bottom-20 left-4 right-16">
        {/* User info with Follow button */}
        <div className="flex items-center gap-3 mb-3">
          <img
            src={reel.user?.avatar_url || "/default-avatar.png"}
            alt=""
            className="w-10 h-10 rounded-full object-cover border-2 border-white"
          />
          <div className="flex items-center gap-2">
            <span className="text-white font-bold">{reel.user?.display_name || reel.user?.username}</span>
            {reel.user?.is_verified && (
              <span className="text-[#1877F2]">⚙️</span>
            )}
          </div>
          <button 
            onClick={handleFollow}
            className={`px-4 py-1.5 rounded-md text-sm font-bold transition-colors ${
              following 
                ? 'bg-white/20 text-white' 
                : 'bg-white text-black'
            }`}
          >
            {following ? "Seguito" : "Segui"}
          </button>
        </div>

        {/* Caption */}
        {reel.caption && (
          <p className="text-white text-sm mb-2 line-clamp-2 pr-4">
            {reel.caption}
          </p>
        )}

        {/* Progress bar */}
        <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden mt-3">
          <motion.div
            className="h-full bg-[#1877F2] rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Audio info */}
        {reel.audio && (
          <div className="flex items-center gap-2 mt-2">
            <Music2 className="w-4 h-4 text-white" />
            <div className="flex-1 overflow-hidden">
              <p className="text-white text-xs truncate animate-marquee">
                🎵 {reel.audio?.title} - {reel.audio?.artist}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Mute toggle */}
      <button
        onClick={onToggleMute}
        className="absolute top-16 right-4 w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center"
      >
        {isMuted ? (
          <VolumeX className="w-5 h-5 text-white" />
        ) : (
          <Volume2 className="w-5 h-5 text-white" />
        )}
      </button>

      {/* Share Menu */}
      <AnimatePresence>
        {showShareMenu && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-[100] flex items-end justify-center"
            onClick={() => setShowShareMenu(false)}
          >
            <motion.div
              initial={{ y: 300 }}
              animate={{ y: 0 }}
              exit={{ y: 300 }}
              className="w-full max-w-lg bg-[#242526] rounded-t-2xl p-4"
              onClick={e => e.stopPropagation()}
            >
              <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-4" />
              <h3 className="text-white font-bold text-lg mb-4">Condividi</h3>
              
              <div className="grid grid-cols-4 gap-4 mb-4">
                {[
                  { icon: Copy, label: "Copia link", action: 'copy' },
                  { icon: Send, label: "Messaggio", action: 'message' },
                  { icon: Share2, label: "Condividi", action: 'native' },
                  { icon: Download, label: "Scarica", action: 'download' },
                ].map((item, i) => (
                  <button 
                    key={i}
                    onClick={() => shareAction(item.action)}
                    className="flex flex-col items-center gap-2"
                  >
                    <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center">
                      <item.icon className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-white text-xs">{item.label}</span>
                  </button>
                ))}
              </div>
              
              <button
                onClick={() => setShowShareMenu(false)}
                className="w-full py-3 text-white font-medium bg-white/10 rounded-lg"
              >
                Annulla
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* More Options Menu */}
      <AnimatePresence>
        {showMoreMenu && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-[100] flex items-end justify-center"
            onClick={() => setShowMoreMenu(false)}
          >
            <motion.div
              initial={{ y: 300 }}
              animate={{ y: 0 }}
              exit={{ y: 300 }}
              className="w-full max-w-lg bg-[#242526] rounded-t-2xl p-4"
              onClick={e => e.stopPropagation()}
            >
              <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-4" />
              
              <div className="space-y-1">
                {[
                  { icon: Bookmark, label: saved ? "Rimuovi dai salvati" : "Salva reel", onClick: handleSave },
                  { icon: Flag, label: "Segnala", onClick: () => toast.info("Segnalazione inviata") },
                  { icon: UserPlus, label: following ? "Non seguire più" : "Segui", onClick: handleFollow },
                  { icon: Link2, label: "Copia link", onClick: () => shareAction('copy') },
                  { icon: Eye, label: `${formatCount(reel.views_count || 0)} visualizzazioni` },
                ].map((item, i) => (
                  <button 
                    key={i}
                    onClick={item.onClick}
                    className="w-full flex items-center gap-4 p-3 rounded-lg hover:bg-white/10 transition-colors"
                  >
                    <item.icon className="w-6 h-6 text-white" />
                    <span className="text-white">{item.label}</span>
                  </button>
                ))}
              </div>
              
              <button
                onClick={() => setShowMoreMenu(false)}
                className="w-full py-3 mt-4 text-white font-medium bg-white/10 rounded-lg"
              >
                Annulla
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Comments Panel */}
      <AnimatePresence>
        {showComments && (
          <CommentsPanel 
            reel={reel} 
            user={user}
            token={token}
            onClose={() => setShowComments(false)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function CommentsPanel({ reel, user, token, onClose }) {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Generate mock comments
    const mockComments = Array.from({ length: 15 }, (_, i) => ({
      id: `comment-${i}`,
      user: {
        username: ["user1", "maria_italy", "luca92", "sara_style", "marco"][i % 5],
        display_name: ["User One", "Maria Italy", "Luca92", "Sara Style", "Marco"][i % 5],
        avatar_url: `https://i.pravatar.cc/100?img=${30 + i}`
      },
      text: [
        "Fantastico! 🔥",
        "Questo è incredibile!",
        "Ti seguo sempre ❤️",
        "Dove posso trovare di più?",
        "👏👏👏",
        "Il migliore!",
        "Troppo bello 😍",
        "Tutorial please!",
        "Sono d'accordo",
        "Wow wow wow"
      ][i % 10],
      likes_count: Math.floor(Math.random() * 500),
      created_at: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
      liked: false
    }));
    setComments(mockComments);
    setLoading(false);
  }, []);

  const handleSubmitComment = () => {
    if (!newComment.trim()) return;
    
    const comment = {
      id: `comment-new-${Date.now()}`,
      user: {
        username: user?.username || 'utente',
        display_name: user?.display_name || 'Utente',
        avatar_url: user?.avatar
      },
      text: newComment,
      likes_count: 0,
      created_at: new Date().toISOString(),
      liked: false
    };
    
    setComments([comment, ...comments]);
    setNewComment("");
    toast.success("Commento pubblicato");
  };

  const toggleCommentLike = (commentId) => {
    setComments(comments.map(c => 
      c.id === commentId 
        ? { ...c, liked: !c.liked, likes_count: c.liked ? c.likes_count - 1 : c.likes_count + 1 }
        : c
    ));
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 z-[100] flex items-end justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: "spring", damping: 25 }}
        className="w-full h-[70vh] bg-[#242526] rounded-t-2xl flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <h3 className="text-white font-bold text-lg">
            Commenti ({formatCount(reel.comments_count || comments.length)})
          </h3>
          <button onClick={onClose} className="p-1 text-white/60">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Comments List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            </div>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="flex gap-3">
                <img
                  src={comment.user.avatar_url || "/default-avatar.png"}
                  alt=""
                  className="w-9 h-9 rounded-full object-cover"
                />
                <div className="flex-1">
                  <div className="bg-white/10 rounded-2xl px-3 py-2">
                    <p className="text-white text-sm font-semibold">{comment.user.display_name}</p>
                    <p className="text-white text-sm">{comment.text}</p>
                  </div>
                  <div className="flex items-center gap-4 mt-1 px-2">
                    <span className="text-white/50 text-xs">
                      {getTimeAgo(comment.created_at)}
                    </span>
                    <button 
                      onClick={() => toggleCommentLike(comment.id)}
                      className={`text-xs font-semibold ${comment.liked ? 'text-[#1877F2]' : 'text-white/50'}`}
                    >
                      Mi piace {comment.likes_count > 0 && `(${comment.likes_count})`}
                    </button>
                    <button className="text-white/50 text-xs font-semibold">
                      Rispondi
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Comment Input */}
        <div className="p-4 border-t border-white/10 flex items-center gap-3">
          <img
            src={user?.avatar || "/default-avatar.png"}
            alt=""
            className="w-9 h-9 rounded-full object-cover"
          />
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Scrivi un commento..."
            className="flex-1 bg-white/10 text-white placeholder:text-white/50 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1877F2]"
            onKeyDown={(e) => e.key === 'Enter' && handleSubmitComment()}
          />
          <button
            onClick={handleSubmitComment}
            disabled={!newComment.trim()}
            className={`p-2 rounded-full ${newComment.trim() ? 'text-[#1877F2]' : 'text-white/30'}`}
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function formatCount(count) {
  if (count >= 1000000) {
    return (count / 1000000).toFixed(1).replace('.0', '') + "M";
  }
  if (count >= 1000) {
    return (count / 1000).toFixed(1).replace('.0', '') + "K";
  }
  return count.toString();
}

function getTimeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffMins < 1) return "Adesso";
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}g`;
  return date.toLocaleDateString('it-IT');
}
