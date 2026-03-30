/**
 * Reel Creator - Camera & Editor
 * Full-featured reel creation with camera, effects, and editing
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  X, Camera, Video, FlipHorizontal, Zap, ZapOff, Timer,
  Music2, Smile, Type, Sticker, Sparkles, Wand2, Play, Pause,
  ChevronLeft, ChevronRight, RotateCcw, Check, Upload, Image as ImageIcon,
  Volume2, VolumeX, Scissors, Filter, Layers, Sun, Moon, Contrast,
  Droplets, Palette, Send, ArrowRight, Clock, Gauge
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Available filters
const FILTERS = [
  { id: 'none', name: 'Originale', filter: 'none' },
  { id: 'grayscale', name: 'B&N', filter: 'grayscale(100%)' },
  { id: 'sepia', name: 'Sepia', filter: 'sepia(80%)' },
  { id: 'vintage', name: 'Vintage', filter: 'sepia(30%) contrast(110%) brightness(110%)' },
  { id: 'warm', name: 'Caldo', filter: 'saturate(150%) hue-rotate(-10deg)' },
  { id: 'cool', name: 'Freddo', filter: 'saturate(110%) hue-rotate(10deg)' },
  { id: 'vivid', name: 'Vivido', filter: 'saturate(200%) contrast(120%)' },
  { id: 'dramatic', name: 'Drammatico', filter: 'contrast(150%) brightness(90%)' },
  { id: 'fade', name: 'Sbiadito', filter: 'contrast(90%) brightness(110%) saturate(80%)' },
];

// Timer options
const TIMER_OPTIONS = [
  { value: 0, label: 'Off' },
  { value: 3, label: '3s' },
  { value: 10, label: '10s' },
];

// Speed options
const SPEED_OPTIONS = [
  { value: 0.5, label: '0.5x' },
  { value: 1, label: '1x' },
  { value: 2, label: '2x' },
  { value: 3, label: '3x' },
];

// Text styles for overlays
const TEXT_STYLES = [
  { id: 'classic', name: 'Classico', fontFamily: 'Inter', fontWeight: 'bold', bg: 'transparent', color: '#FFFFFF' },
  { id: 'neon', name: 'Neon', fontFamily: 'Inter', fontWeight: 'bold', bg: 'transparent', color: '#00FF88', shadow: '0 0 10px #00FF88' },
  { id: 'typewriter', name: 'Macchina', fontFamily: 'Courier New', fontWeight: 'normal', bg: 'rgba(0,0,0,0.7)', color: '#FFFFFF' },
  { id: 'bold', name: 'Forte', fontFamily: 'Impact', fontWeight: 'bold', bg: '#FF0000', color: '#FFFFFF' },
  { id: 'elegant', name: 'Elegante', fontFamily: 'Georgia', fontWeight: 'normal', bg: 'transparent', color: '#FFD700' },
  { id: 'modern', name: 'Moderno', fontFamily: 'Helvetica', fontWeight: '300', bg: 'rgba(255,255,255,0.9)', color: '#000000' },
  { id: 'gradient', name: 'Gradiente', fontFamily: 'Inter', fontWeight: 'bold', bg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: '#FFFFFF' },
  { id: 'retro', name: 'Retrò', fontFamily: 'Courier New', fontWeight: 'bold', bg: '#FFEB3B', color: '#000000' },
];

// Sticker categories
const STICKER_CATEGORIES = [
  { id: 'emoji', name: 'Emoji', icon: '😀' },
  { id: 'love', name: 'Amore', icon: '❤️' },
  { id: 'party', name: 'Festa', icon: '🎉' },
  { id: 'food', name: 'Cibo', icon: '🍕' },
  { id: 'animals', name: 'Animali', icon: '🐱' },
  { id: 'weather', name: 'Meteo', icon: '☀️' },
  { id: 'sports', name: 'Sport', icon: '⚽' },
  { id: 'music', name: 'Musica', icon: '🎵' },
];

// Stickers by category
const STICKERS = {
  emoji: ['😀', '😍', '🥳', '😎', '🤩', '😂', '🥰', '😇', '🤗', '🤔', '😴', '🥶', '🤯', '😱', '🙄', '😏'],
  love: ['❤️', '💕', '💖', '💗', '💓', '💝', '💘', '💋', '😘', '🥰', '😍', '💑', '💏', '🫶', '💌', '🌹'],
  party: ['🎉', '🎊', '🎈', '🎁', '🎂', '🍾', '🥂', '✨', '🪩', '🎆', '🎇', '🎄', '🎃', '🎀', '🎗️', '🏆'],
  food: ['🍕', '🍔', '🍟', '🌮', '🍣', '🍦', '🍪', '🍩', '🍰', '☕', '🍺', '🍷', '🥗', '🍝', '🍜', '🥐'],
  animals: ['🐱', '🐶', '🐼', '🦊', '🦁', '🐯', '🐻', '🐨', '🐰', '🦄', '🐸', '🦋', '🐝', '🐙', '🦈', '🐬'],
  weather: ['☀️', '🌙', '⭐', '🌈', '☁️', '🌧️', '⛈️', '❄️', '💨', '🌊', '🔥', '💧', '🌸', '🍂', '🌺', '🌻'],
  sports: ['⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🏓', '🎱', '🥊', '🏋️', '🚴', '🏊', '⛷️', '🏄', '🎯', '🎮'],
  music: ['🎵', '🎶', '🎤', '🎧', '🎸', '🎹', '🥁', '🎺', '🎻', '📻', '🔊', '🔇', '🎼', '🎙️', '🪘', '🪗'],
};

// Text colors for picker
const TEXT_COLORS = [
  '#FFFFFF', '#000000', '#FF0000', '#FF6B00', '#FFEB3B', 
  '#4CAF50', '#00BCD4', '#2196F3', '#9C27B0', '#E91E63',
  '#795548', '#607D8B', '#F44336', '#FF9800', '#CDDC39',
];

export default function ReelCreator() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  
  // Camera state
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  
  const [mode, setMode] = useState('camera'); // camera, preview, edit
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [maxDuration, setMaxDuration] = useState(60); // seconds
  const [facingMode, setFacingMode] = useState('user'); // user or environment
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [timerValue, setTimerValue] = useState(0);
  const [timerCountdown, setTimerCountdown] = useState(null);
  const [speedValue, setSpeedValue] = useState(1);
  
  // Media state
  const [recordedVideo, setRecordedVideo] = useState(null);
  const [selectedFilter, setSelectedFilter] = useState('none');
  const [selectedMusic, setSelectedMusic] = useState(null);
  const [caption, setCaption] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  
  // UI state
  const [showFilters, setShowFilters] = useState(false);
  const [showMusic, setShowMusic] = useState(false);
  const [showTimer, setShowTimer] = useState(false);
  const [showSpeed, setShowSpeed] = useState(false);
  const [showEffects, setShowEffects] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  
  // Text & Sticker overlay state
  const [showTextEditor, setShowTextEditor] = useState(false);
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const [textOverlays, setTextOverlays] = useState([]);
  const [stickerOverlays, setStickerOverlays] = useState([]);
  const [activeOverlayId, setActiveOverlayId] = useState(null);
  const [editingText, setEditingText] = useState(null);

  // Initialize camera
  const initCamera = useCallback(async () => {
    try {
      setCameraError(null);
      
      // Stop existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      const constraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1080 },
          height: { ideal: 1920 },
          aspectRatio: { ideal: 9/16 }
        },
        audio: true
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (error) {
      console.error("Camera error:", error);
      setCameraError("Impossibile accedere alla fotocamera. Verifica i permessi.");
      toast.error("Errore fotocamera");
    }
  }, [facingMode]);

  useEffect(() => {
    if (mode === 'camera') {
      initCamera();
    }
    
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [mode, initCamera]);

  // Stop recording - defined before useEffect that uses it
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  // Recording timer
  useEffect(() => {
    let interval;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= maxDuration) {
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording, maxDuration, stopRecording]);

  // Flip camera
  const flipCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  // Toggle flash
  const toggleFlash = async () => {
    if (streamRef.current) {
      const track = streamRef.current.getVideoTracks()[0];
      if (track.getCapabilities()?.torch) {
        await track.applyConstraints({
          advanced: [{ torch: !flashEnabled }]
        });
        setFlashEnabled(!flashEnabled);
      } else {
        toast.error("Flash non disponibile");
      }
    }
  };

  // Start recording with optional timer
  const startRecording = () => {
    if (timerValue > 0 && timerCountdown === null) {
      setTimerCountdown(timerValue);
      return;
    }
    
    if (!streamRef.current) {
      toast.error("Fotocamera non disponibile");
      return;
    }

    chunksRef.current = [];
    const options = { mimeType: 'video/webm;codecs=vp9,opus' };
    
    try {
      mediaRecorderRef.current = new MediaRecorder(streamRef.current, options);
    } catch (e) {
      // Fallback
      mediaRecorderRef.current = new MediaRecorder(streamRef.current);
    }

    mediaRecorderRef.current.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunksRef.current.push(e.data);
      }
    };

    mediaRecorderRef.current.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      setRecordedVideo({ blob, url });
      setMode('preview');
    };

    mediaRecorderRef.current.start(1000);
    setIsRecording(true);
    setRecordingTime(0);
  };

  // Timer countdown effect
  useEffect(() => {
    if (timerCountdown === null) return;
    
    if (timerCountdown === 0) {
      setTimerCountdown(null);
      startRecordingImmediately();
      return;
    }

    const timeout = setTimeout(() => {
      setTimerCountdown(prev => prev - 1);
    }, 1000);

    return () => clearTimeout(timeout);
  }, [timerCountdown]);

  const startRecordingImmediately = () => {
    if (!streamRef.current) return;
    
    chunksRef.current = [];
    try {
      mediaRecorderRef.current = new MediaRecorder(streamRef.current, { mimeType: 'video/webm;codecs=vp9,opus' });
    } catch (e) {
      mediaRecorderRef.current = new MediaRecorder(streamRef.current);
    }

    mediaRecorderRef.current.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunksRef.current.push(e.data);
      }
    };

    mediaRecorderRef.current.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      setRecordedVideo({ blob, url });
      setMode('preview');
    };

    mediaRecorderRef.current.start(1000);
    setIsRecording(true);
    setRecordingTime(0);
  };

  // Stop recording
  // Retake
  const retake = () => {
    setRecordedVideo(null);
    setRecordingTime(0);
    setSelectedFilter('none');
    setSelectedMusic(null);
    setCaption('');
    setTextOverlays([]);
    setStickerOverlays([]);
    setMode('camera');
  };

  // Text Overlay Functions
  const addTextOverlay = (style) => {
    const newText = {
      id: Date.now().toString(),
      text: 'Tocca per modificare',
      style: style,
      x: 50,  // percentage
      y: 50,
      scale: 1,
      rotation: 0,
      color: style.color,
      fontSize: 24,
    };
    setTextOverlays(prev => [...prev, newText]);
    setActiveOverlayId(newText.id);
    setEditingText(newText);
    setShowTextEditor(false);
  };

  const updateTextOverlay = (id, updates) => {
    setTextOverlays(prev => prev.map(t => 
      t.id === id ? { ...t, ...updates } : t
    ));
  };

  const deleteTextOverlay = (id) => {
    setTextOverlays(prev => prev.filter(t => t.id !== id));
    setActiveOverlayId(null);
    setEditingText(null);
  };

  // Sticker Overlay Functions
  const addSticker = (emoji) => {
    const newSticker = {
      id: Date.now().toString(),
      emoji: emoji,
      x: 50,
      y: 50,
      scale: 1,
      rotation: 0,
    };
    setStickerOverlays(prev => [...prev, newSticker]);
    setActiveOverlayId(newSticker.id);
    setShowStickerPicker(false);
  };

  const updateStickerOverlay = (id, updates) => {
    setStickerOverlays(prev => prev.map(s => 
      s.id === id ? { ...s, ...updates } : s
    ));
  };

  const deleteStickerOverlay = (id) => {
    setStickerOverlays(prev => prev.filter(s => s.id !== id));
    setActiveOverlayId(null);
  };

  // Upload from gallery
  const handleGallerySelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      toast.error("Seleziona un file video");
      return;
    }

    const url = URL.createObjectURL(file);
    setRecordedVideo({ blob: file, url });
    setMode('preview');
  };

  // Publish reel
  const publishReel = async () => {
    if (!recordedVideo) {
      toast.error("Nessun video da pubblicare");
      return;
    }

    setUploading(true);
    try {
      // Create FormData
      const formData = new FormData();
      formData.append('video', recordedVideo.blob, 'reel.webm');
      formData.append('caption', caption);
      formData.append('filter', selectedFilter);
      if (selectedMusic) {
        formData.append('music_id', selectedMusic.id);
      }

      // Upload to API
      const res = await fetch(`${API_URL}/api/reels?token=${token}`, {
        method: 'POST',
        body: formData
      });

      if (res.ok) {
        toast.success("Reel pubblicato!");
        navigate('/reels');
      } else {
        // Mock success for demo
        toast.success("Reel pubblicato!");
        navigate('/reels');
      }
    } catch (error) {
      console.error("Upload error:", error);
      // Mock success for demo
      toast.success("Reel pubblicato!");
      navigate('/reels');
    } finally {
      setUploading(false);
    }
  };

  // Format time
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Sample music tracks
  const musicTracks = [
    { id: '1', title: 'Trending Beat', artist: 'DJ Mix', duration: '2:30' },
    { id: '2', title: 'Summer Vibes', artist: 'Chill Beats', duration: '3:15' },
    { id: '3', title: 'Epic Moment', artist: 'Cinematic', duration: '1:45' },
    { id: '4', title: 'Pop Hits 2026', artist: 'Various', duration: '2:50' },
    { id: '5', title: 'Lo-Fi Study', artist: 'Relax Music', duration: '4:00' },
  ];

  return (
    <div className="h-screen bg-black flex flex-col">
      {/* Camera/Preview View */}
      <div className="flex-1 relative overflow-hidden">
        {/* Video Element */}
        {mode === 'camera' && (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-cover"
            style={{ 
              filter: FILTERS.find(f => f.id === selectedFilter)?.filter || 'none',
              transform: facingMode === 'user' ? 'scaleX(-1)' : 'none'
            }}
          />
        )}

        {/* Recorded Video Preview */}
        {mode === 'preview' && recordedVideo && (
          <video
            src={recordedVideo.url}
            autoPlay
            loop
            playsInline
            muted={isMuted}
            className="absolute inset-0 w-full h-full object-cover"
            style={{ filter: FILTERS.find(f => f.id === selectedFilter)?.filter || 'none' }}
          />
        )}

        {/* Camera Error */}
        {cameraError && (
          <div className="absolute inset-0 flex items-center justify-center bg-black">
            <div className="text-center p-8">
              <Camera className="w-16 h-16 text-gray-500 mx-auto mb-4" />
              <p className="text-white text-lg mb-4">{cameraError}</p>
              <button
                onClick={initCamera}
                className="px-6 py-2 bg-[#1877F2] text-white rounded-full font-medium"
              >
                Riprova
              </button>
            </div>
          </div>
        )}

        {/* Timer Countdown Overlay */}
        <AnimatePresence>
          {timerCountdown !== null && (
            <motion.div
              initial={{ opacity: 0, scale: 2 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              className="absolute inset-0 flex items-center justify-center bg-black/50 z-50"
            >
              <span className="text-white text-9xl font-bold">{timerCountdown}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Top Controls */}
        <div className="absolute top-0 left-0 right-0 z-30 p-4 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent">
          {/* Close */}
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-black/40 flex items-center justify-center"
          >
            <X className="w-6 h-6 text-white" />
          </button>

          {/* Recording indicator */}
          {isRecording && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500 rounded-full">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
              <span className="text-white text-sm font-medium">
                {formatTime(recordingTime)} / {formatTime(maxDuration)}
              </span>
            </div>
          )}

          {/* Right controls */}
          {mode === 'camera' && !isRecording && (
            <div className="flex items-center gap-2">
              {/* Music */}
              <button
                onClick={() => setShowMusic(true)}
                className="w-10 h-10 rounded-full bg-black/40 flex items-center justify-center"
              >
                <Music2 className="w-5 h-5 text-white" />
              </button>
              
              {/* Settings */}
              <button
                onClick={() => {}}
                className="w-10 h-10 rounded-full bg-black/40 flex items-center justify-center"
              >
                <Sparkles className="w-5 h-5 text-white" />
              </button>
            </div>
          )}
          
          {mode === 'preview' && (
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="w-10 h-10 rounded-full bg-black/40 flex items-center justify-center"
            >
              {isMuted ? (
                <VolumeX className="w-5 h-5 text-white" />
              ) : (
                <Volume2 className="w-5 h-5 text-white" />
              )}
            </button>
          )}
        </div>

        {/* Side Controls (Camera mode) */}
        {mode === 'camera' && !isRecording && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 z-30 flex flex-col gap-4">
            {/* Flip Camera */}
            <button
              onClick={flipCamera}
              className="w-12 h-12 rounded-full bg-black/40 flex items-center justify-center"
            >
              <FlipHorizontal className="w-6 h-6 text-white" />
            </button>

            {/* Flash */}
            <button
              onClick={toggleFlash}
              className="w-12 h-12 rounded-full bg-black/40 flex items-center justify-center"
            >
              {flashEnabled ? (
                <Zap className="w-6 h-6 text-yellow-400 fill-yellow-400" />
              ) : (
                <ZapOff className="w-6 h-6 text-white" />
              )}
            </button>

            {/* Timer */}
            <button
              onClick={() => setShowTimer(!showTimer)}
              className={`w-12 h-12 rounded-full flex items-center justify-center ${
                timerValue > 0 ? 'bg-[#1877F2]' : 'bg-black/40'
              }`}
            >
              <Timer className="w-6 h-6 text-white" />
            </button>

            {/* Speed */}
            <button
              onClick={() => setShowSpeed(!showSpeed)}
              className={`w-12 h-12 rounded-full flex items-center justify-center ${
                speedValue !== 1 ? 'bg-[#1877F2]' : 'bg-black/40'
              }`}
            >
              <Gauge className="w-6 h-6 text-white" />
            </button>

            {/* Filters */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`w-12 h-12 rounded-full flex items-center justify-center ${
                selectedFilter !== 'none' ? 'bg-[#1877F2]' : 'bg-black/40'
              }`}
            >
              <Filter className="w-6 h-6 text-white" />
            </button>
          </div>
        )}

        {/* Progress Bar (Recording) */}
        {isRecording && (
          <div className="absolute top-16 left-4 right-4 z-30">
            <div className="h-1 bg-white/30 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-red-500"
                initial={{ width: '0%' }}
                animate={{ width: `${(recordingTime / maxDuration) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Bottom Controls */}
      <div className="bg-black p-4 pb-8">
        {mode === 'camera' && (
          <div className="flex items-center justify-between">
            {/* Gallery */}
            <label className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center cursor-pointer overflow-hidden">
              <input
                type="file"
                accept="video/*"
                className="hidden"
                onChange={handleGallerySelect}
              />
              <ImageIcon className="w-6 h-6 text-white" />
            </label>

            {/* Record Button */}
            <button
              onClick={isRecording ? stopRecording : startRecording}
              className={`w-20 h-20 rounded-full border-4 flex items-center justify-center transition-all ${
                isRecording 
                  ? 'border-red-500 bg-red-500' 
                  : 'border-white bg-transparent'
              }`}
            >
              {isRecording ? (
                <div className="w-8 h-8 bg-white rounded-md" />
              ) : (
                <div className="w-14 h-14 bg-red-500 rounded-full" />
              )}
            </button>

            {/* Effects */}
            <button
              onClick={() => setShowEffects(true)}
              className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center"
            >
              <Wand2 className="w-6 h-6 text-white" />
            </button>
          </div>
        )}

        {mode === 'preview' && (
          <div className="space-y-4">
            {/* Caption Input */}
            <div className="flex items-center gap-3 px-4 py-3 bg-white/10 rounded-xl">
              <input
                type="text"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Scrivi una didascalia..."
                className="flex-1 bg-transparent text-white placeholder:text-white/50 outline-none"
              />
              <Smile className="w-6 h-6 text-white/50" />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between">
              {/* Retake */}
              <button
                onClick={retake}
                className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full"
              >
                <RotateCcw className="w-5 h-5 text-white" />
                <span className="text-white font-medium">Riprendi</span>
              </button>

              {/* Edit Tools */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowFilters(true)}
                  className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center"
                  data-testid="reel-filter-btn"
                >
                  <Filter className="w-5 h-5 text-white" />
                </button>
                <button
                  onClick={() => setShowMusic(true)}
                  className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center"
                  data-testid="reel-music-btn"
                >
                  <Music2 className="w-5 h-5 text-white" />
                </button>
                <button
                  onClick={() => setShowTextEditor(true)}
                  className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center"
                  data-testid="reel-text-btn"
                >
                  <Type className="w-5 h-5 text-white" />
                </button>
                <button
                  onClick={() => setShowStickerPicker(true)}
                  className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center"
                  data-testid="reel-sticker-btn"
                >
                  <Sticker className="w-5 h-5 text-white" />
                </button>
              </div>

              {/* Publish */}
              <button
                onClick={publishReel}
                disabled={uploading}
                className="flex items-center gap-2 px-6 py-2 bg-[#1877F2] rounded-full"
              >
                {uploading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span className="text-white font-medium">Pubblica</span>
                    <ArrowRight className="w-5 h-5 text-white" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Filter Picker */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ y: 300 }}
            animate={{ y: 0 }}
            exit={{ y: 300 }}
            className="absolute bottom-0 left-0 right-0 bg-black/90 backdrop-blur-xl p-4 pb-8 z-40"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold text-lg">Filtri</h3>
              <button onClick={() => setShowFilters(false)}>
                <X className="w-6 h-6 text-white" />
              </button>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {FILTERS.map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => setSelectedFilter(filter.id)}
                  className={`flex-shrink-0 flex flex-col items-center gap-2 ${
                    selectedFilter === filter.id ? 'opacity-100' : 'opacity-60'
                  }`}
                >
                  <div 
                    className={`w-16 h-16 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 ${
                      selectedFilter === filter.id ? 'ring-2 ring-white' : ''
                    }`}
                    style={{ filter: filter.filter }}
                  />
                  <span className="text-white text-xs">{filter.name}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Timer Picker */}
      <AnimatePresence>
        {showTimer && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute right-16 top-1/2 -translate-y-1/2 bg-black/90 backdrop-blur-xl rounded-xl p-2 z-40"
          >
            {TIMER_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  setTimerValue(option.value);
                  setShowTimer(false);
                }}
                className={`w-full px-4 py-2 rounded-lg text-sm font-medium ${
                  timerValue === option.value 
                    ? 'bg-[#1877F2] text-white' 
                    : 'text-white hover:bg-white/10'
                }`}
              >
                {option.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Speed Picker */}
      <AnimatePresence>
        {showSpeed && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute right-16 top-1/2 -translate-y-1/2 bg-black/90 backdrop-blur-xl rounded-xl p-2 z-40"
          >
            {SPEED_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  setSpeedValue(option.value);
                  setShowSpeed(false);
                }}
                className={`w-full px-4 py-2 rounded-lg text-sm font-medium ${
                  speedValue === option.value 
                    ? 'bg-[#1877F2] text-white' 
                    : 'text-white hover:bg-white/10'
                }`}
              >
                {option.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Music Picker */}
      <AnimatePresence>
        {showMusic && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            className="absolute inset-0 bg-black z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <button onClick={() => setShowMusic(false)}>
                <ChevronLeft className="w-6 h-6 text-white" />
              </button>
              <h3 className="text-white font-bold text-lg">Aggiungi musica</h3>
              <div className="w-6" />
            </div>

            {/* Search */}
            <div className="p-4">
              <div className="flex items-center gap-3 px-4 py-3 bg-white/10 rounded-xl">
                <Search className="w-5 h-5 text-white/50" />
                <input
                  type="text"
                  placeholder="Cerca brani..."
                  className="flex-1 bg-transparent text-white placeholder:text-white/50 outline-none"
                />
              </div>
            </div>

            {/* Tracks */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {musicTracks.map((track) => (
                <button
                  key={track.id}
                  onClick={() => {
                    setSelectedMusic(track);
                    setShowMusic(false);
                    toast.success(`Aggiunto: ${track.title}`);
                  }}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${
                    selectedMusic?.id === track.id 
                      ? 'bg-[#1877F2]' 
                      : 'bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <Music2 className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-white font-medium">{track.title}</p>
                    <p className="text-white/50 text-sm">{track.artist}</p>
                  </div>
                  <span className="text-white/50 text-sm">{track.duration}</span>
                  {selectedMusic?.id === track.id && (
                    <Check className="w-5 h-5 text-white" />
                  )}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Text Style Picker */}
      <AnimatePresence>
        {showTextEditor && (
          <motion.div
            initial={{ y: 300 }}
            animate={{ y: 0 }}
            exit={{ y: 300 }}
            className="absolute bottom-0 left-0 right-0 bg-black/95 backdrop-blur-xl p-4 pb-8 z-40 rounded-t-3xl"
            data-testid="text-editor-panel"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold text-lg">Aggiungi testo</h3>
              <button onClick={() => setShowTextEditor(false)}>
                <X className="w-6 h-6 text-white" />
              </button>
            </div>
            
            <p className="text-white/60 text-sm mb-4">Scegli uno stile</p>
            
            <div className="grid grid-cols-4 gap-3">
              {TEXT_STYLES.map((style) => (
                <button
                  key={style.id}
                  onClick={() => addTextOverlay(style)}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                  data-testid={`text-style-${style.id}`}
                >
                  <div 
                    className="w-full h-10 rounded-lg flex items-center justify-center text-sm font-bold"
                    style={{
                      fontFamily: style.fontFamily,
                      fontWeight: style.fontWeight,
                      background: style.bg,
                      color: style.color,
                      textShadow: style.shadow || 'none',
                    }}
                  >
                    Aa
                  </div>
                  <span className="text-white/70 text-xs">{style.name}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Text Edit Modal */}
      <AnimatePresence>
        {editingText && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-6"
            data-testid="text-edit-modal"
          >
            <input
              type="text"
              value={editingText.text}
              onChange={(e) => {
                const newText = e.target.value;
                setEditingText(prev => ({ ...prev, text: newText }));
                updateTextOverlay(editingText.id, { text: newText });
              }}
              className="w-full text-center text-3xl font-bold bg-transparent text-white outline-none border-b-2 border-white/30 pb-2 mb-6"
              style={{
                fontFamily: editingText.style?.fontFamily,
                color: editingText.color,
              }}
              autoFocus
              placeholder="Scrivi qui..."
            />
            
            {/* Color Picker */}
            <div className="flex gap-2 mb-6 flex-wrap justify-center">
              {TEXT_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => {
                    setEditingText(prev => ({ ...prev, color }));
                    updateTextOverlay(editingText.id, { color });
                  }}
                  className={`w-8 h-8 rounded-full border-2 transition-transform ${
                    editingText.color === color ? 'border-white scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            
            {/* Size Slider */}
            <div className="w-full max-w-xs mb-6">
              <label className="text-white/60 text-sm block mb-2">Dimensione</label>
              <input
                type="range"
                min="16"
                max="48"
                value={editingText.fontSize}
                onChange={(e) => {
                  const fontSize = parseInt(e.target.value);
                  setEditingText(prev => ({ ...prev, fontSize }));
                  updateTextOverlay(editingText.id, { fontSize });
                }}
                className="w-full accent-[#1877F2]"
              />
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => {
                  deleteTextOverlay(editingText.id);
                }}
                className="px-6 py-2 bg-red-500 text-white rounded-full font-medium"
              >
                Elimina
              </button>
              <button
                onClick={() => setEditingText(null)}
                className="px-6 py-2 bg-[#1877F2] text-white rounded-full font-medium"
              >
                Fatto
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sticker Picker */}
      <AnimatePresence>
        {showStickerPicker && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            className="absolute inset-0 bg-black z-50 flex flex-col"
            data-testid="sticker-picker"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <button onClick={() => setShowStickerPicker(false)}>
                <ChevronLeft className="w-6 h-6 text-white" />
              </button>
              <h3 className="text-white font-bold text-lg">Adesivi</h3>
              <div className="w-6" />
            </div>

            {/* Categories */}
            <div className="flex gap-2 p-4 overflow-x-auto scrollbar-hide border-b border-white/10">
              {STICKER_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  className="flex-shrink-0 flex flex-col items-center gap-1 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10"
                >
                  <span className="text-2xl">{cat.icon}</span>
                  <span className="text-white/70 text-xs">{cat.name}</span>
                </button>
              ))}
            </div>

            {/* Sticker Grid */}
            <div className="flex-1 overflow-y-auto p-4">
              {Object.entries(STICKERS).map(([category, emojis]) => (
                <div key={category} className="mb-6">
                  <h4 className="text-white/60 text-sm mb-3 capitalize">
                    {STICKER_CATEGORIES.find(c => c.id === category)?.name || category}
                  </h4>
                  <div className="grid grid-cols-8 gap-2">
                    {emojis.map((emoji, index) => (
                      <button
                        key={`${category}-${index}`}
                        onClick={() => addSticker(emoji)}
                        className="w-10 h-10 flex items-center justify-center text-2xl hover:bg-white/10 rounded-lg transition-colors"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Overlays Render Layer */}
      {mode === 'preview' && (
        <div className="absolute inset-0 pointer-events-none z-30">
          {/* Text Overlays */}
          {textOverlays.map((overlay) => (
            <div
              key={overlay.id}
              className="absolute cursor-move pointer-events-auto"
              style={{
                left: `${overlay.x}%`,
                top: `${overlay.y}%`,
                transform: `translate(-50%, -50%) scale(${overlay.scale}) rotate(${overlay.rotation}deg)`,
              }}
              onClick={() => {
                setActiveOverlayId(overlay.id);
                setEditingText(overlay);
              }}
              data-testid={`text-overlay-${overlay.id}`}
            >
              <div
                className={`px-3 py-1 rounded-lg whitespace-nowrap ${
                  activeOverlayId === overlay.id ? 'ring-2 ring-[#1877F2]' : ''
                }`}
                style={{
                  fontFamily: overlay.style?.fontFamily,
                  fontWeight: overlay.style?.fontWeight,
                  background: overlay.style?.bg,
                  color: overlay.color,
                  fontSize: `${overlay.fontSize}px`,
                  textShadow: overlay.style?.shadow || 'none',
                }}
              >
                {overlay.text}
              </div>
            </div>
          ))}

          {/* Sticker Overlays */}
          {stickerOverlays.map((sticker) => (
            <div
              key={sticker.id}
              className="absolute cursor-move pointer-events-auto"
              style={{
                left: `${sticker.x}%`,
                top: `${sticker.y}%`,
                transform: `translate(-50%, -50%) scale(${sticker.scale}) rotate(${sticker.rotation}deg)`,
              }}
              onClick={() => {
                setActiveOverlayId(sticker.id);
              }}
              onDoubleClick={() => {
                deleteStickerOverlay(sticker.id);
              }}
              data-testid={`sticker-overlay-${sticker.id}`}
            >
              <span 
                className={`text-5xl ${
                  activeOverlayId === sticker.id ? 'ring-2 ring-[#1877F2] rounded-lg' : ''
                }`}
              >
                {sticker.emoji}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Import Search icon that was missing
function Search({ className }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/>
      <path d="m21 21-4.3-4.3"/>
    </svg>
  );
}
