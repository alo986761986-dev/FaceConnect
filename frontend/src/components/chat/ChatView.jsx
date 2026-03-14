import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { toast } from "sonner";
import { 
  ArrowLeft, Send, Paperclip, Image as ImageIcon, 
  Video, Music, FileText, X, Check, CheckCheck,
  Smile, MoreVertical, Download, Play, Mic, MicOff,
  MapPin, Square, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/context/AuthContext";
import { haptic } from "@/utils/mobile";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function ChatView({ conversation, onBack }) {
  const { user, token, sendTyping, sendReadReceipt } = useAuth();
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
    window.addEventListener("user_status", handleUserStatus);

    return () => {
      window.removeEventListener("chat_message", handleNewMessage);
      window.removeEventListener("chat_typing", handleTyping);
      window.removeEventListener("user_status", handleUserStatus);
    };
  }, [conversation?.id, sendReadReceipt, otherParticipant?.id]);

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

                return (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex items-end gap-2 ${isMine ? "justify-end" : "justify-start"}`}
                  >
                    {!isMine && (
                      <div className="w-8">
                        {showAvatar && (
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={message.sender?.avatar} />
                            <AvatarFallback className="bg-gradient-to-br from-[#00F0FF] to-[#7000FF] text-white text-xs">
                              {(message.sender?.display_name || message.sender?.username || "?")[0].toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                    )}

                    <div
                      className={`max-w-[70%] ${
                        isMine
                          ? "bg-gradient-to-r from-[#00F0FF] to-[#7000FF] text-white"
                          : "bg-[#1A1A1A] text-white"
                      } rounded-2xl ${
                        isMine ? "rounded-br-sm" : "rounded-bl-sm"
                      } px-4 py-2`}
                    >
                      {renderMessageContent(message)}
                      
                      <div className={`flex items-center gap-1 mt-1 ${
                        isMine ? "justify-end" : "justify-start"
                      }`}>
                        <span className={`text-[10px] ${
                          isMine ? "text-white/70" : "text-gray-500"
                        }`}>
                          {formatTime(message.created_at)}
                        </span>
                        {isMine && (
                          message.read_by?.length > 1 ? (
                            <CheckCheck className="w-3 h-3 text-white/70" />
                          ) : (
                            <Check className="w-3 h-3 text-white/70" />
                          )
                        )}
                      </div>
                    </div>
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
    </div>
  );
}
