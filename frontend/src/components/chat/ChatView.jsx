import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { toast } from "sonner";
import { 
  ArrowLeft, Send, Paperclip, Image as ImageIcon, 
  Video, Music, FileText, X, Check, CheckCheck,
  Smile, MoreVertical, Download, Play
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
  
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const otherParticipant = conversation?.participants?.find(p => p.id !== user?.id);

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

  // Listen for new messages
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

    window.addEventListener("chat_message", handleNewMessage);
    window.addEventListener("chat_typing", handleTyping);

    return () => {
      window.removeEventListener("chat_message", handleNewMessage);
      window.removeEventListener("chat_typing", handleTyping);
    };
  }, [conversation?.id, sendReadReceipt]);

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
          {otherParticipant?.is_online && (
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[#121212]" />
          )}
        </div>

        <div className="flex-1">
          <h3 className="font-medium text-white">
            {otherParticipant?.display_name || otherParticipant?.username}
          </h3>
          <p className="text-xs text-gray-500">
            {typingUsers.length > 0 ? (
              <span className="text-[#00F0FF]">typing...</span>
            ) : otherParticipant?.is_online ? (
              <span className="text-green-500">online</span>
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

          <Button
            type="submit"
            data-testid="send-message-btn"
            disabled={!messageText.trim() || sending}
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
