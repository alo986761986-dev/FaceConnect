import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { toast } from "sonner";
import { 
  ArrowLeft, Send, Paperclip, Image as ImageIcon, 
  Video, Music, FileText, X, Check, CheckCheck,
  Smile, MoreVertical, Download, Play, Mic, MicOff,
  MapPin, Square, Loader2, Camera, Share2, SwitchCamera,
  FlipHorizontal, Phone, VideoIcon, Trash2, Copy, Reply
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/context/AuthContext";
import { useSettings } from "@/context/SettingsContext";
import { haptic } from "@/utils/mobile";
import { playMessageSound } from "@/utils/sounds";
import EmojiPicker from "./EmojiPicker";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function ChatView({ conversation, onBack }) {
  const { user, token, sendTyping, sendReadReceipt } = useAuth();
  const { isDark, settings } = useSettings();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [otherUserOnline, setOtherUserOnline] = useState(false);
  const [lastSeen, setLastSeen] = useState(null);
  
  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingIntervalRef = useRef(null);
  
  // Location state
  const [sendingLocation, setSendingLocation] = useState(false);
  
  // Camera state
  const [showCamera, setShowCamera] = useState(false);
  const [cameraMode, setCameraMode] = useState("photo"); // photo or video
  const [facingMode, setFacingMode] = useState("user"); // user (front) or environment (back)
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const [videoDuration, setVideoDuration] = useState(0);
  const [capturedMedia, setCapturedMedia] = useState(null); // { type: 'photo' | 'video', blob, preview }
  const [showShareMenu, setShowShareMenu] = useState(false);
  const cameraVideoRef = useRef(null);
  const cameraStreamRef = useRef(null);
  const videoRecorderRef = useRef(null);
  const videoChunksRef = useRef([]);
  const videoIntervalRef = useRef(null);
  
  // Emoji picker state
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  
  // Message context menu state
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [showMessageMenu, setShowMessageMenu] = useState(false);
  const [deletingMessage, setDeletingMessage] = useState(null);
  
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const otherParticipant = conversation?.participants?.find(p => p.id !== user?.id);

  // Initialize online status from conversation
  useEffect(() => {
    if (otherParticipant) {
      setOtherUserOnline(otherParticipant.is_online || false);
      setLastSeen(otherParticipant.last_seen);
    }
  }, [otherParticipant]);

  // Fetch messages
  const fetchMessages = useCallback(async () => {
    if (!token || !conversation) return;
    
    try {
      const response = await axios.get(
        `${API}/conversations/${conversation.id}/messages?token=${token}`
      );
      setMessages(response.data);
      
      // Mark as read
      sendReadReceipt(conversation.id);
    } catch (error) {
      console.error("Failed to fetch messages:", error);
    } finally {
      setLoading(false);
    }
  }, [token, conversation, sendReadReceipt]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Listen for new messages, typing, and online status
  useEffect(() => {
    const handleNewMessage = (e) => {
      if (e.detail.conversation_id === conversation?.id) {
        setMessages(prev => [...prev, e.detail.message]);
        sendReadReceipt(conversation.id);
        
        // Play message sound for incoming messages (not from current user)
        if (e.detail.message.sender_id !== user?.id) {
          playMessageSound(settings);
          haptic.light();
        }
      }
    };

    const handleTyping = (e) => {
      if (e.detail.conversation_id === conversation?.id) {
        if (e.detail.is_typing) {
          setTypingUsers(prev => [...new Set([...prev, e.detail.user_id])]);
        } else {
          setTypingUsers(prev => prev.filter(id => id !== e.detail.user_id));
        }
      }
    };

    // Listen for read receipts to update tick colors in real-time
    const handleReadReceipt = (e) => {
      if (e.detail.conversation_id === conversation?.id) {
        // Update all messages to mark them as read by the recipient
        setMessages(prev => prev.map(msg => {
          if (msg.sender_id === user?.id && !msg.read_by?.includes(e.detail.user_id)) {
            return {
              ...msg,
              read_by: [...(msg.read_by || [msg.sender_id]), e.detail.user_id]
            };
          }
          return msg;
        }));
      }
    };

    // Listen for online/offline status changes
    const handleUserStatus = (e) => {
      const { type, user_id } = e.detail;
      if (user_id === otherParticipant?.id) {
        const isOnline = type === 'user_online';
        setOtherUserOnline(isOnline);
        if (!isOnline) {
          setLastSeen(new Date().toISOString());
        }
      }
    };

    window.addEventListener("chat_message", handleNewMessage);
    window.addEventListener("chat_typing", handleTyping);
    window.addEventListener("chat_read", handleReadReceipt);
    window.addEventListener("user_status", handleUserStatus);

    return () => {
      window.removeEventListener("chat_message", handleNewMessage);
      window.removeEventListener("chat_typing", handleTyping);
      window.removeEventListener("chat_read", handleReadReceipt);
      window.removeEventListener("user_status", handleUserStatus);
    };
  }, [conversation?.id, sendReadReceipt, otherParticipant?.id, user?.id, settings]);

  // Handle typing indicator
  const handleInputChange = (e) => {
    setMessageText(e.target.value);
    
    if (!isTyping) {
      setIsTyping(true);
      sendTyping(conversation.id, true);
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      sendTyping(conversation.id, false);
    }, 2000);
  };

  // Send message
  const handleSendMessage = async (e) => {
    e?.preventDefault();
    
    if (!messageText.trim() || sending) return;
    
    setSending(true);
    haptic.light();

    try {
      const response = await axios.post(
        `${API}/conversations/${conversation.id}/messages?token=${token}`,
        {
          content: messageText.trim(),
          message_type: "text"
        }
      );

      // Message will be added via WebSocket, but add optimistically
      setMessages(prev => [...prev, response.data]);
      setMessageText("");
      sendTyping(conversation.id, false);
      setIsTyping(false);
    } catch (error) {
      toast.error("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  // Handle file upload
  const handleFileUpload = async (e, type) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    setShowAttachMenu(false);
    haptic.medium();

    try {
      // Upload file first
      const formData = new FormData();
      formData.append("file", file);
      formData.append("token", token);

      const uploadResponse = await axios.post(`${API}/upload`, formData);
      
      const { file_url, file_name, file_size, file_type } = uploadResponse.data;

      // Send message with file
      const response = await axios.post(
        `${API}/conversations/${conversation.id}/messages?token=${token}`,
        {
          content: file_name,
          message_type: file_type,
          file_url,
          file_name,
          file_size
        }
      );

      setMessages(prev => [...prev, response.data]);
      toast.success(`${type} sent!`);
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload file");
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Voice recording functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingDuration(0);
      haptic.medium();

      // Start duration timer
      recordingIntervalRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error("Microphone access error:", error);
      toast.error("Could not access microphone. Please allow microphone permission.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      haptic.light();
      
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream?.getTracks().forEach(track => track.stop());
    }
    setIsRecording(false);
    setAudioBlob(null);
    setRecordingDuration(0);
    
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
    }
  };

  const sendVoiceMessage = async () => {
    if (!audioBlob) return;
    
    setUploadingFile(true);
    haptic.success();

    try {
      // Create file from blob
      const audioFile = new File([audioBlob], `voice_${Date.now()}.webm`, { type: 'audio/webm' });
      
      // Upload file
      const formData = new FormData();
      formData.append("file", audioFile);
      formData.append("token", token);

      const uploadResponse = await axios.post(`${API}/upload`, formData);
      const { file_url, file_name, file_size } = uploadResponse.data;

      // Send message with audio
      const response = await axios.post(
        `${API}/conversations/${conversation.id}/messages?token=${token}`,
        {
          content: `Voice message (${formatRecordingDuration(recordingDuration)})`,
          message_type: "audio",
          file_url,
          file_name,
          file_size
        }
      );

      setMessages(prev => [...prev, response.data]);
      setAudioBlob(null);
      setRecordingDuration(0);
      toast.success("Voice message sent!");
    } catch (error) {
      console.error("Voice upload error:", error);
      toast.error("Failed to send voice message");
    } finally {
      setUploadingFile(false);
    }
  };

  const formatRecordingDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Location sharing function
  const sendLocation = async () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }

    setSendingLocation(true);
    haptic.medium();

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        try {
          // Create a Google Maps link
          const mapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
          
          // Send message with location
          const response = await axios.post(
            `${API}/conversations/${conversation.id}/messages?token=${token}`,
            {
              content: mapsUrl,
              message_type: "location",
              metadata: {
                latitude,
                longitude,
                maps_url: mapsUrl
              }
            }
          );

          setMessages(prev => [...prev, response.data]);
          toast.success("Location shared!");
          haptic.success();
        } catch (error) {
          console.error("Location send error:", error);
          toast.error("Failed to send location");
        } finally {
          setSendingLocation(false);
        }
      },
      (error) => {
        console.error("Geolocation error:", error);
        setSendingLocation(false);
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            toast.error("Location permission denied. Please enable location access.");
            break;
          case error.POSITION_UNAVAILABLE:
            toast.error("Location unavailable. Please try again.");
            break;
          case error.TIMEOUT:
            toast.error("Location request timed out. Please try again.");
            break;
          default:
            toast.error("Failed to get location");
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // ========== Camera Functions ==========
  const openCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facingMode },
        audio: cameraMode === "video"
      });
      
      cameraStreamRef.current = stream;
      if (cameraVideoRef.current) {
        cameraVideoRef.current.srcObject = stream;
      }
      
      setShowCamera(true);
      haptic.medium();
    } catch (error) {
      console.error("Camera access error:", error);
      toast.error("Could not access camera. Please allow camera permission.");
    }
  };

  const closeCamera = () => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach(track => track.stop());
      cameraStreamRef.current = null;
    }
    setShowCamera(false);
    setCapturedMedia(null);
    setIsRecordingVideo(false);
    setVideoDuration(0);
    if (videoIntervalRef.current) {
      clearInterval(videoIntervalRef.current);
    }
  };

  const switchCamera = async () => {
    const newFacingMode = facingMode === "user" ? "environment" : "user";
    
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach(track => track.stop());
    }
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: newFacingMode },
        audio: cameraMode === "video"
      });
      
      cameraStreamRef.current = stream;
      if (cameraVideoRef.current) {
        cameraVideoRef.current.srcObject = stream;
      }
      
      setFacingMode(newFacingMode);
      haptic.light();
    } catch (error) {
      toast.error("Failed to switch camera");
    }
  };

  const capturePhoto = () => {
    if (!cameraVideoRef.current) return;
    
    const video = cameraVideoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext("2d");
    
    // Mirror image if using front camera
    if (facingMode === "user") {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    
    ctx.drawImage(video, 0, 0);
    
    canvas.toBlob((blob) => {
      const preview = canvas.toDataURL("image/jpeg");
      setCapturedMedia({ type: "photo", blob, preview });
      haptic.success();
    }, "image/jpeg", 0.9);
  };

  const startVideoRecording = () => {
    if (!cameraStreamRef.current) return;
    
    videoChunksRef.current = [];
    videoRecorderRef.current = new MediaRecorder(cameraStreamRef.current);
    
    videoRecorderRef.current.ondataavailable = (e) => {
      if (e.data.size > 0) {
        videoChunksRef.current.push(e.data);
      }
    };
    
    videoRecorderRef.current.onstop = () => {
      const videoBlob = new Blob(videoChunksRef.current, { type: "video/webm" });
      const preview = URL.createObjectURL(videoBlob);
      setCapturedMedia({ type: "video", blob: videoBlob, preview });
    };
    
    videoRecorderRef.current.start();
    setIsRecordingVideo(true);
    setVideoDuration(0);
    haptic.medium();
    
    videoIntervalRef.current = setInterval(() => {
      setVideoDuration(prev => prev + 1);
    }, 1000);
  };

  const stopVideoRecording = () => {
    if (videoRecorderRef.current && isRecordingVideo) {
      videoRecorderRef.current.stop();
      setIsRecordingVideo(false);
      haptic.success();
      
      if (videoIntervalRef.current) {
        clearInterval(videoIntervalRef.current);
      }
    }
  };

  const sendCapturedMedia = async () => {
    if (!capturedMedia) return;
    
    setUploadingFile(true);
    haptic.medium();
    
    try {
      const fileName = capturedMedia.type === "photo" 
        ? `photo_${Date.now()}.jpg` 
        : `video_${Date.now()}.webm`;
      const mimeType = capturedMedia.type === "photo" ? "image/jpeg" : "video/webm";
      
      const file = new File([capturedMedia.blob], fileName, { type: mimeType });
      
      const formData = new FormData();
      formData.append("file", file);
      formData.append("token", token);
      
      const uploadResponse = await axios.post(`${API}/upload`, formData);
      const { file_url, file_name, file_size } = uploadResponse.data;
      
      const response = await axios.post(
        `${API}/conversations/${conversation.id}/messages?token=${token}`,
        {
          content: file_name,
          message_type: capturedMedia.type === "photo" ? "image" : "video",
          file_url,
          file_name,
          file_size
        }
      );
      
      setMessages(prev => [...prev, response.data]);
      toast.success(`${capturedMedia.type === "photo" ? "Photo" : "Video"} sent!`);
      closeCamera();
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to send media");
    } finally {
      setUploadingFile(false);
    }
  };

  const shareToSocialMedia = async (platform) => {
    if (!capturedMedia) return;
    
    haptic.medium();
    
    // First, upload the media
    try {
      const fileName = capturedMedia.type === "photo" 
        ? `share_${Date.now()}.jpg` 
        : `share_${Date.now()}.webm`;
      const mimeType = capturedMedia.type === "photo" ? "image/jpeg" : "video/webm";
      const file = new File([capturedMedia.blob], fileName, { type: mimeType });
      
      // For native share API
      if (navigator.share && navigator.canShare) {
        try {
          await navigator.share({
            title: "Shared from FaceConnect",
            text: "Check out this from FaceConnect!",
            files: [file]
          });
          toast.success("Shared successfully!");
          setShowShareMenu(false);
          return;
        } catch (e) {
          // Fall through to platform-specific sharing
        }
      }
      
      // Platform-specific URLs
      const shareUrls = {
        whatsapp: `https://wa.me/?text=${encodeURIComponent("Check this out from FaceConnect!")}`,
        telegram: `https://t.me/share/url?url=${encodeURIComponent(window.location.origin)}&text=${encodeURIComponent("Shared from FaceConnect")}`,
        twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent("Check this out from FaceConnect!")}`,
        facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.origin)}`,
        instagram: null, // Instagram doesn't support direct web sharing
        tiktok: null,
      };
      
      if (shareUrls[platform]) {
        window.open(shareUrls[platform], "_blank", "width=600,height=400");
        toast.success(`Opening ${platform}...`);
      } else if (platform === "instagram" || platform === "tiktok") {
        // Download file for manual sharing
        const url = URL.createObjectURL(capturedMedia.blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
        toast.info(`Downloaded! Open ${platform} to share.`);
      }
      
      setShowShareMenu(false);
    } catch (error) {
      toast.error("Failed to share");
    }
  };

  const retakeMedia = () => {
    setCapturedMedia(null);
    setShowShareMenu(false);
    haptic.light();
  };

  // Format message time
  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  // Group messages by date
  const groupMessagesByDate = (msgs) => {
    const groups = {};
    msgs.forEach(msg => {
      const date = new Date(msg.created_at).toLocaleDateString();
      if (!groups[date]) groups[date] = [];
      groups[date].push(msg);
    });
    return groups;
  };

  // Format last seen time
  const formatLastSeen = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} min ago`;
    if (diff < 86400000) return `at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    if (diff < 172800000) return 'yesterday';
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  // Render message content based on type
  const renderMessageContent = (message) => {
    const fullFileUrl = message.file_url?.startsWith("http") 
      ? message.file_url 
      : `${process.env.REACT_APP_BACKEND_URL}${message.file_url}`;

    switch (message.message_type) {
      case "image":
        return (
          <div className="max-w-xs">
            <img
              src={fullFileUrl}
              alt={message.file_name}
              className="rounded-lg max-w-full cursor-pointer hover:opacity-90"
              onClick={() => window.open(fullFileUrl, "_blank")}
            />
          </div>
        );
      case "video":
        return (
          <div className="max-w-xs">
            <video
              src={fullFileUrl}
              controls
              className="rounded-lg max-w-full"
            />
          </div>
        );
      case "audio":
        return (
          <div className="flex items-center gap-3 p-2 bg-white/5 rounded-lg">
            <div className="w-10 h-10 rounded-full bg-[#00F0FF]/20 flex items-center justify-center">
              <Music className="w-5 h-5 text-[#00F0FF]" />
            </div>
            <audio src={fullFileUrl} controls className="h-8" />
          </div>
        );
      case "file":
        return (
          <a
            href={fullFileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <div className="w-10 h-10 rounded-lg bg-[#7000FF]/20 flex items-center justify-center">
              <FileText className="w-5 h-5 text-[#7000FF]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{message.file_name}</p>
              <p className="text-xs text-gray-500">
                {(message.file_size / 1024).toFixed(1)} KB
              </p>
            </div>
            <Download className="w-4 h-4 text-gray-500" />
          </a>
        );
      case "location":
        const mapsUrl = message.metadata?.maps_url || message.content;
        return (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <div className="w-12 h-12 rounded-lg bg-red-500/20 flex items-center justify-center">
              <MapPin className="w-6 h-6 text-red-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">Shared Location</p>
              <p className="text-xs text-gray-500">
                Tap to open in Maps
              </p>
            </div>
          </a>
        );
      default:
        return <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>;
    }
  };

  // Handle emoji selection
  const handleEmojiSelect = (emoji) => {
    setMessageText(prev => prev + emoji);
    haptic.light();
  };

  // Handle GIF selection
  const handleGifSelect = async (gifUrl) => {
    setShowEmojiPicker(false);
    setSending(true);
    haptic.medium();
    
    try {
      const response = await axios.post(
        `${API}/conversations/${conversation.id}/messages?token=${token}`,
        {
          content: gifUrl,
          message_type: "gif"
        }
      );
      
      setMessages(prev => [...prev, response.data]);
    } catch (error) {
      console.error("Failed to send GIF:", error);
      toast.error("Failed to send GIF");
    } finally {
      setSending(false);
    }
  };

  // Handle sticker selection
  const handleStickerSelect = async (stickerUrl) => {
    setShowEmojiPicker(false);
    setSending(true);
    haptic.medium();
    
    try {
      const response = await axios.post(
        `${API}/conversations/${conversation.id}/messages?token=${token}`,
        {
          content: stickerUrl,
          message_type: "sticker"
        }
      );
      
      setMessages(prev => [...prev, response.data]);
    } catch (error) {
      console.error("Failed to send sticker:", error);
      toast.error("Failed to send sticker");
    } finally {
      setSending(false);
    }
  };

  // Handle message deletion
  const handleDeleteMessage = async (messageId) => {
    setDeletingMessage(messageId);
    haptic.warning();
    
    try {
      await axios.delete(`${API}/messages/${messageId}?token=${token}`);
      setMessages(prev => prev.map(m => 
        m.id === messageId 
          ? { ...m, is_deleted: true, content: "This message was deleted" }
          : m
      ));
      toast.success("Message deleted");
    } catch (error) {
      console.error("Failed to delete message:", error);
      toast.error("Failed to delete message");
    } finally {
      setDeletingMessage(null);
      setShowMessageMenu(false);
      setSelectedMessage(null);
    }
  };

  // Handle copy message
  const handleCopyMessage = (content) => {
    navigator.clipboard.writeText(content);
    toast.success("Copied to clipboard");
    haptic.light();
    setShowMessageMenu(false);
    setSelectedMessage(null);
  };

  // Handle long press on message
  const handleMessageLongPress = (message) => {
    if (message.is_deleted) return;
    setSelectedMessage(message);
    setShowMessageMenu(true);
    haptic.medium();
  };

  // Video call handler (placeholder)
  const handleVideoCall = () => {
    haptic.medium();
    toast.info("Video call feature coming soon!");
  };

  // Voice call handler (placeholder)
  const handleVoiceCall = () => {
    haptic.medium();
    toast.info("Voice call feature coming soon!");
  };

  const groupedMessages = groupMessagesByDate(messages);

  if (!conversation) {
    return (
      <div className="h-full flex items-center justify-center bg-[#0A0A0A]">
        <p className="text-gray-500">Select a conversation</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[#0A0A0A]">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-white/5 bg-[#121212]">
        <Button
          data-testid="chat-back-btn"
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="sm:hidden text-gray-400 hover:text-white hover:bg-white/10"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        
        <div className="relative">
          <Avatar className="w-10 h-10">
            <AvatarImage src={otherParticipant?.avatar} alt={otherParticipant?.display_name} />
            <AvatarFallback className="bg-gradient-to-br from-[#00F0FF] to-[#7000FF] text-white">
              {(otherParticipant?.display_name || otherParticipant?.username || "?")[0].toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <motion.span 
            initial={false}
            animate={{ 
              scale: otherUserOnline ? 1 : 0.8,
              opacity: otherUserOnline ? 1 : 0.5
            }}
            className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#121212] ${
              otherUserOnline ? "bg-green-500" : "bg-gray-500"
            }`}
          />
        </div>

        <div className="flex-1">
          <h3 className="font-medium text-white">
            {otherParticipant?.display_name || otherParticipant?.username}
          </h3>
          <p className="text-xs text-gray-500" data-testid="user-status">
            {typingUsers.length > 0 ? (
              <motion.span 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-[#00F0FF] flex items-center gap-1"
              >
                <span className="flex gap-0.5">
                  <span className="w-1 h-1 bg-[#00F0FF] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1 h-1 bg-[#00F0FF] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1 h-1 bg-[#00F0FF] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
                typing
              </motion.span>
            ) : otherUserOnline ? (
              <motion.span 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-green-500"
              >
                online
              </motion.span>
            ) : lastSeen ? (
              <span>last seen {formatLastSeen(lastSeen)}</span>
            ) : (
              "offline"
            )}
          </p>
        </div>

        {/* Video and Call Buttons */}
        <div className="flex items-center gap-1">
          <Button
            data-testid="video-call-btn"
            variant="ghost"
            size="icon"
            onClick={handleVideoCall}
            className="text-gray-400 hover:text-white hover:bg-white/10"
          >
            <VideoIcon className="w-5 h-5" />
          </Button>
          <Button
            data-testid="voice-call-btn"
            variant="ghost"
            size="icon"
            onClick={handleVoiceCall}
            className="text-gray-400 hover:text-white hover:bg-white/10"
          >
            <Phone className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-8 h-8 border-2 border-[#00F0FF] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-gray-500 mb-2">No messages yet</p>
            <p className="text-sm text-gray-600">Say hello!</p>
          </div>
        ) : (
          Object.entries(groupedMessages).map(([date, msgs]) => (
            <div key={date}>
              {/* Date separator */}
              <div className="flex items-center justify-center my-4">
                <span className="px-3 py-1 text-xs text-gray-500 bg-[#1A1A1A] rounded-full">
                  {new Date(date).toLocaleDateString([], { 
                    weekday: "long", 
                    month: "short", 
                    day: "numeric" 
                  })}
                </span>
              </div>

              {/* Messages for this date */}
              {msgs.map((message, index) => {
                const isMine = message.sender_id === user?.id;
                const showAvatar = !isMine && (
                  index === 0 || 
                  msgs[index - 1]?.sender_id !== message.sender_id
                );
                const isDeleted = message.is_deleted;

                return (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex items-end gap-2 mb-2 ${isMine ? "justify-end" : "justify-start"} group`}
                  >
                    {/* Avatar for other user - always show space for alignment */}
                    {!isMine && (
                      <div className="w-8 flex-shrink-0">
                        {showAvatar && (
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={otherParticipant?.avatar} />
                            <AvatarFallback className="bg-gradient-to-br from-[#00F0FF] to-[#7000FF] text-white text-xs">
                              {(otherParticipant?.display_name || otherParticipant?.username || "?")[0].toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                    )}

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <div
                          data-testid={`message-${message.id}`}
                          className={`max-w-[70%] cursor-pointer ${
                            isMine
                              ? isDeleted 
                                ? "bg-gray-600/50 text-gray-400 italic"
                                : "bg-gradient-to-r from-[#00F0FF] to-[#7000FF] text-white"
                              : isDeleted
                                ? "bg-gray-600/30 text-gray-500 italic"
                                : "bg-[#1A1A1A] text-white"
                          } rounded-2xl ${
                            isMine ? "rounded-br-sm" : "rounded-bl-sm"
                          } px-4 py-2 relative`}
                        >
                          {/* GIF/Sticker rendering */}
                          {message.message_type === "gif" || message.message_type === "sticker" ? (
                            <img 
                              src={message.content} 
                              alt={message.message_type}
                              className="max-w-full h-auto rounded-lg"
                              style={{ maxHeight: '200px' }}
                            />
                          ) : (
                            renderMessageContent(message)
                          )}
                          
                          <div className={`flex items-center gap-1 mt-1 ${
                            isMine ? "justify-end" : "justify-start"
                          }`}>
                            <span className={`text-[10px] ${
                              isMine ? "text-white/70" : "text-gray-500"
                            }`}>
                              {formatTime(message.created_at)}
                            </span>
                            {isMine && !isDeleted && (
                              message.read_by?.length > 1 ? (
                                // Double tick - cyan when read by recipient
                                <CheckCheck className="w-3.5 h-3.5 text-[#00F0FF]" />
                              ) : (
                                // Single tick - delivered but not read yet
                                <Check className="w-3 h-3 text-white/70" />
                              )
                            )}
                          </div>
                        </div>
                      </DropdownMenuTrigger>
                      
                      {/* Context Menu for messages */}
                      {!isDeleted && (
                        <DropdownMenuContent 
                          align={isMine ? "end" : "start"} 
                          className="bg-[#1A1A1A] border-white/10"
                        >
                          <DropdownMenuItem
                            data-testid={`copy-message-${message.id}`}
                            onClick={() => handleCopyMessage(message.content)}
                            className="text-white hover:bg-white/10 cursor-pointer"
                          >
                            <Copy className="w-4 h-4 mr-2" />
                            Copy
                          </DropdownMenuItem>
                          {isMine && (
                            <>
                              <DropdownMenuSeparator className="bg-white/10" />
                              <DropdownMenuItem
                                data-testid={`delete-message-${message.id}`}
                                onClick={() => handleDeleteMessage(message.id)}
                                disabled={deletingMessage === message.id}
                                className="text-red-500 hover:bg-white/10 cursor-pointer"
                              >
                                {deletingMessage === message.id ? (
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                  <Trash2 className="w-4 h-4 mr-2" />
                                )}
                                Delete
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      )}
                    </DropdownMenu>

                    {/* Avatar for own messages - profile picture on right side */}
                    {isMine && showAvatar && (
                      <div className="w-8 flex-shrink-0">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={user?.avatar} />
                          <AvatarFallback className="bg-gradient-to-br from-[#7000FF] to-[#FF3366] text-white text-xs">
                            {(user?.display_name || user?.username || "?")[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Uploading indicator */}
      <AnimatePresence>
        {uploadingFile && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="px-4 py-2 bg-[#1A1A1A] border-t border-white/5"
          >
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <div className="w-4 h-4 border-2 border-[#00F0FF] border-t-transparent rounded-full animate-spin" />
              Uploading file...
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input Area */}
      <div className="p-4 border-t border-white/5 bg-[#121212]">
        {/* Attachment Menu */}
        <AnimatePresence>
          {showAttachMenu && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="flex gap-2 mb-3"
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={(e) => handleFileUpload(e, "file")}
              />
              
              <button
                data-testid="attach-image"
                onClick={() => {
                  fileInputRef.current.accept = "image/*";
                  fileInputRef.current.click();
                }}
                className="flex flex-col items-center gap-1 p-3 bg-[#1A1A1A] rounded-xl hover:bg-white/10 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-[#00F0FF]/20 flex items-center justify-center">
                  <ImageIcon className="w-5 h-5 text-[#00F0FF]" />
                </div>
                <span className="text-xs text-gray-500">Photo</span>
              </button>

              <button
                data-testid="attach-video"
                onClick={() => {
                  fileInputRef.current.accept = "video/*";
                  fileInputRef.current.click();
                }}
                className="flex flex-col items-center gap-1 p-3 bg-[#1A1A1A] rounded-xl hover:bg-white/10 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-[#7000FF]/20 flex items-center justify-center">
                  <Video className="w-5 h-5 text-[#7000FF]" />
                </div>
                <span className="text-xs text-gray-500">Video</span>
              </button>

              <button
                data-testid="attach-audio"
                onClick={() => {
                  fileInputRef.current.accept = "audio/*";
                  fileInputRef.current.click();
                }}
                className="flex flex-col items-center gap-1 p-3 bg-[#1A1A1A] rounded-xl hover:bg-white/10 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                  <Music className="w-5 h-5 text-green-500" />
                </div>
                <span className="text-xs text-gray-500">Audio</span>
              </button>

              <button
                data-testid="attach-location"
                onClick={sendLocation}
                disabled={sendingLocation}
                className="flex flex-col items-center gap-1 p-3 bg-[#1A1A1A] rounded-xl hover:bg-white/10 transition-colors disabled:opacity-50"
              >
                <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                  {sendingLocation ? (
                    <Loader2 className="w-5 h-5 text-red-400 animate-spin" />
                  ) : (
                    <MapPin className="w-5 h-5 text-red-400" />
                  )}
                </div>
                <span className="text-xs text-gray-500">Location</span>
              </button>

              <button
                data-testid="attach-file"
                onClick={() => {
                  fileInputRef.current.accept = "*/*";
                  fileInputRef.current.click();
                }}
                className="flex flex-col items-center gap-1 p-3 bg-[#1A1A1A] rounded-xl hover:bg-white/10 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-orange-500" />
                </div>
                <span className="text-xs text-gray-500">File</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Voice Recording UI */}
        <AnimatePresence>
          {isRecording && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="flex items-center gap-3 px-4 py-3 mb-2 bg-red-500/10 border border-red-500/30 rounded-xl"
            >
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              <span className="text-red-400 font-medium">{formatRecordingDuration(recordingDuration)}</span>
              <span className="text-gray-400 text-sm flex-1">Recording...</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={cancelRecording}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={stopRecording}
                className="bg-red-500 hover:bg-red-600 text-white"
              >
                <Square className="w-4 h-4 mr-1" />
                Stop
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Voice Preview UI */}
        <AnimatePresence>
          {audioBlob && !isRecording && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="flex items-center gap-3 px-4 py-3 mb-2 bg-[#1A1A1A] border border-white/10 rounded-xl"
            >
              <div className="w-10 h-10 rounded-full bg-[#00F0FF]/20 flex items-center justify-center">
                <Mic className="w-5 h-5 text-[#00F0FF]" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-white font-medium">Voice message</p>
                <p className="text-xs text-gray-500">{formatRecordingDuration(recordingDuration)}</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => { setAudioBlob(null); setRecordingDuration(0); }}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={sendVoiceMessage}
                disabled={uploadingFile}
                className="bg-gradient-to-r from-[#00F0FF] to-[#7000FF] hover:opacity-90"
              >
                {uploadingFile ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-1" />
                    Send
                  </>
                )}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          <Button
            type="button"
            data-testid="toggle-attach"
            variant="ghost"
            size="icon"
            onClick={() => setShowAttachMenu(!showAttachMenu)}
            className={`text-gray-400 hover:text-white hover:bg-white/10 ${
              showAttachMenu ? "text-[#00F0FF]" : ""
            }`}
          >
            {showAttachMenu ? <X className="w-5 h-5" /> : <Paperclip className="w-5 h-5" />}
          </Button>

          {/* Camera Button */}
          <Button
            type="button"
            data-testid="camera-btn"
            variant="ghost"
            size="icon"
            onClick={openCamera}
            className="text-gray-400 hover:text-white hover:bg-white/10"
          >
            <Camera className="w-5 h-5" />
          </Button>

          {/* Emoji/GIF Button */}
          <Button
            type="button"
            data-testid="emoji-btn"
            variant="ghost"
            size="icon"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className={`text-gray-400 hover:text-white hover:bg-white/10 ${
              showEmojiPicker ? "text-[#00F0FF]" : ""
            }`}
          >
            <Smile className="w-5 h-5" />
          </Button>

          <Input
            data-testid="message-input"
            placeholder="Type a message..."
            value={messageText}
            onChange={handleInputChange}
            className="flex-1 bg-[#1A1A1A] border-white/10 text-white focus:border-[#00F0FF]"
          />

          {/* Voice Button - shows when no text is typed */}
          {!messageText.trim() && !audioBlob && (
            <Button
              type="button"
              data-testid="voice-record-btn"
              variant="ghost"
              size="icon"
              onClick={isRecording ? stopRecording : startRecording}
              className={`hover:bg-white/10 ${
                isRecording ? "text-red-500 bg-red-500/10" : "text-gray-400 hover:text-white"
              }`}
            >
              {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </Button>
          )}

          {/* Location Button - always visible on mobile */}
          <Button
            type="button"
            data-testid="location-btn"
            variant="ghost"
            size="icon"
            onClick={sendLocation}
            disabled={sendingLocation}
            className="text-gray-400 hover:text-white hover:bg-white/10 sm:hidden"
          >
            {sendingLocation ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <MapPin className="w-5 h-5" />
            )}
          </Button>

          <Button
            type="submit"
            data-testid="send-message-btn"
            disabled={(!messageText.trim() && !audioBlob) || sending}
            size="icon"
            className="bg-gradient-to-r from-[#00F0FF] to-[#7000FF] hover:opacity-90 disabled:opacity-50"
          >
            {sending ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </form>
      </div>

      {/* Full-Screen Camera UI */}
      <AnimatePresence>
        {showCamera && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black"
          >
            {/* Camera View or Preview */}
            {!capturedMedia ? (
              <>
                {/* Live Camera Feed */}
                <video
                  ref={cameraVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${facingMode === "user" ? "scale-x-[-1]" : ""}`}
                />
                
                {/* Top Controls */}
                <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between z-10">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={closeCamera}
                    className="text-white bg-black/40 backdrop-blur-lg rounded-full"
                  >
                    <X className="w-6 h-6" />
                  </Button>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={switchCamera}
                      className="text-white bg-black/40 backdrop-blur-lg rounded-full"
                    >
                      <SwitchCamera className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
                
                {/* Recording Indicator */}
                {isRecordingVideo && (
                  <div className="absolute top-20 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 bg-red-500 rounded-full z-10">
                    <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
                    <span className="text-white font-medium">{formatRecordingDuration(videoDuration)}</span>
                  </div>
                )}
                
                {/* Bottom Controls */}
                <div className="absolute bottom-0 left-0 right-0 p-8 z-10">
                  {/* Mode Switcher */}
                  <div className="flex justify-center gap-4 mb-6">
                    <button
                      onClick={() => setCameraMode("photo")}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                        cameraMode === "photo" ? "bg-white text-black" : "bg-white/20 text-white"
                      }`}
                    >
                      Photo
                    </button>
                    <button
                      onClick={() => setCameraMode("video")}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                        cameraMode === "video" ? "bg-white text-black" : "bg-white/20 text-white"
                      }`}
                    >
                      Video
                    </button>
                  </div>
                  
                  {/* Capture Button */}
                  <div className="flex justify-center">
                    {cameraMode === "photo" ? (
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={capturePhoto}
                        className="w-20 h-20 rounded-full bg-white border-4 border-white/50 flex items-center justify-center"
                      >
                        <div className="w-16 h-16 rounded-full bg-white" />
                      </motion.button>
                    ) : (
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={isRecordingVideo ? stopVideoRecording : startVideoRecording}
                        className={`w-20 h-20 rounded-full border-4 flex items-center justify-center transition-colors ${
                          isRecordingVideo 
                            ? "bg-red-500 border-red-500/50" 
                            : "bg-red-500 border-white/50"
                        }`}
                      >
                        {isRecordingVideo ? (
                          <Square className="w-8 h-8 text-white" />
                        ) : (
                          <div className="w-16 h-16 rounded-full bg-red-500" />
                        )}
                      </motion.button>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Captured Media Preview */}
                {capturedMedia.type === "photo" ? (
                  <img 
                    src={capturedMedia.preview} 
                    alt="Captured" 
                    className="w-full h-full object-contain bg-black"
                  />
                ) : (
                  <video
                    src={capturedMedia.preview}
                    autoPlay
                    loop
                    playsInline
                    className="w-full h-full object-contain bg-black"
                  />
                )}
                
                {/* Preview Top Controls */}
                <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between z-10">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={closeCamera}
                    className="text-white bg-black/40 backdrop-blur-lg rounded-full"
                  >
                    <X className="w-6 h-6" />
                  </Button>
                </div>
                
                {/* Preview Bottom Controls */}
                <div className="absolute bottom-0 left-0 right-0 p-6 z-10 bg-gradient-to-t from-black/80 to-transparent">
                  <div className="flex items-center justify-between gap-4">
                    {/* Retake */}
                    <Button
                      variant="ghost"
                      onClick={retakeMedia}
                      className="text-white hover:bg-white/10"
                    >
                      <FlipHorizontal className="w-5 h-5 mr-2" />
                      Retake
                    </Button>
                    
                    {/* Share to Social */}
                    <Button
                      variant="ghost"
                      onClick={() => setShowShareMenu(true)}
                      className="text-white hover:bg-white/10"
                    >
                      <Share2 className="w-5 h-5 mr-2" />
                      Share
                    </Button>
                    
                    {/* Send to Chat */}
                    <Button
                      onClick={sendCapturedMedia}
                      disabled={uploadingFile}
                      className="bg-gradient-to-r from-[#00F0FF] to-[#7000FF] hover:opacity-90"
                    >
                      {uploadingFile ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          <Send className="w-5 h-5 mr-2" />
                          Send
                        </>
                      )}
                    </Button>
                  </div>
                </div>
                
                {/* Share Menu */}
                <AnimatePresence>
                  {showShareMenu && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 z-20 bg-black/60 backdrop-blur-sm flex items-end justify-center"
                      onClick={() => setShowShareMenu(false)}
                    >
                      <motion.div
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full max-w-lg bg-[#121212] rounded-t-3xl p-6"
                      >
                        <div className="w-12 h-1 bg-gray-600 rounded-full mx-auto mb-4" />
                        <h3 className="text-white text-lg font-bold mb-4">Share to</h3>
                        
                        <div className="grid grid-cols-4 gap-4">
                          {[
                            { id: "whatsapp", name: "WhatsApp", color: "#25D366" },
                            { id: "telegram", name: "Telegram", color: "#0088cc" },
                            { id: "instagram", name: "Instagram", color: "#E1306C" },
                            { id: "tiktok", name: "TikTok", color: "#000" },
                            { id: "twitter", name: "X", color: "#1DA1F2" },
                            { id: "facebook", name: "Facebook", color: "#1877F2" },
                          ].map((platform) => (
                            <motion.button
                              key={platform.id}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => shareToSocialMedia(platform.id)}
                              className="flex flex-col items-center gap-2 p-3"
                            >
                              <div 
                                className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-lg"
                                style={{ backgroundColor: platform.color }}
                              >
                                {platform.name[0]}
                              </div>
                              <span className="text-gray-400 text-xs">{platform.name}</span>
                            </motion.button>
                          ))}
                        </div>
                        
                        <Button
                          onClick={() => setShowShareMenu(false)}
                          variant="outline"
                          className="w-full mt-4 border-white/10 text-white"
                        >
                          Cancel
                        </Button>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Emoji/GIF/Sticker Picker */}
      <AnimatePresence>
        {showEmojiPicker && (
          <EmojiPicker
            onSelectEmoji={handleEmojiSelect}
            onSelectGif={handleGifSelect}
            onSelectSticker={handleStickerSelect}
            onClose={() => setShowEmojiPicker(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
