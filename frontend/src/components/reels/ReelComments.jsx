import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import axios from "axios";
import { toast } from "sonner";
import { X, Heart, Send, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/context/AuthContext";
import { haptic } from "@/utils/mobile";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function ReelComments({ reel, onClose, onCommentsUpdate }) {
  const { user, token } = useAuth();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [sending, setSending] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    fetchComments();
  }, [reel.id]);

  const fetchComments = async () => {
    try {
      const response = await axios.get(`${API}/reels/${reel.id}/comments?token=${token}`);
      setComments(response.data);
    } catch (error) {
      console.error("Failed to fetch comments:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || sending) return;

    setSending(true);
    haptic.light();

    try {
      const response = await axios.post(
        `${API}/reels/${reel.id}/comments?token=${token}`,
        { content: newComment.trim() }
      );
      
      setComments(prev => [response.data, ...prev]);
      setNewComment("");
      onCommentsUpdate(comments.length + 1);
      toast.success("Comment added!");
    } catch (error) {
      toast.error("Failed to add comment");
    } finally {
      setSending(false);
    }
  };

  const handleLikeComment = async (commentId) => {
    haptic.light();
    
    try {
      const response = await axios.post(
        `${API}/reels/${reel.id}/comments/${commentId}/like?token=${token}`
      );
      
      setComments(prev => prev.map(c => 
        c.id === commentId ? { 
          ...c, 
          is_liked: response.data.liked, 
          likes_count: response.data.likes_count 
        } : c
      ));
    } catch (error) {
      toast.error("Failed to like comment");
    }
  };

  const handleDeleteComment = async (commentId) => {
    haptic.medium();
    
    try {
      await axios.delete(`${API}/reels/${reel.id}/comments/${commentId}?token=${token}`);
      setComments(prev => prev.filter(c => c.id !== commentId));
      onCommentsUpdate(comments.length - 1);
      toast.success("Comment deleted");
    } catch (error) {
      toast.error("Failed to delete comment");
    }
  };

  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return "now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d`;
    return date.toLocaleDateString();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className="absolute bottom-0 left-0 right-0 max-h-[70vh] bg-[#121212] rounded-t-3xl overflow-hidden"
      >
        {/* Header */}
        <div className="sticky top-0 bg-[#121212] border-b border-white/10 px-4 py-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">
            {comments.length} Comments
          </h3>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Comments List */}
        <div className="overflow-y-auto max-h-[calc(70vh-130px)] p-4 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-white animate-spin" />
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No comments yet</p>
              <p className="text-gray-600 text-sm mt-1">Be the first to comment!</p>
            </div>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="flex gap-3">
                <Avatar className="w-9 h-9 flex-shrink-0">
                  <AvatarImage src={comment.user?.avatar} />
                  <AvatarFallback className="bg-gradient-to-br from-[#00F0FF] to-[#7000FF] text-white text-sm">
                    {(comment.user?.display_name || comment.user?.username || "?")[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-white text-sm font-medium">
                      {comment.user?.display_name || comment.user?.username}
                    </span>
                    <span className="text-gray-500 text-xs">
                      {formatTime(comment.created_at)}
                    </span>
                  </div>
                  <p className="text-white text-sm mt-0.5">{comment.content}</p>
                  
                  <div className="flex items-center gap-4 mt-2">
                    <button
                      onClick={() => handleLikeComment(comment.id)}
                      className="flex items-center gap-1 text-gray-500 hover:text-white text-xs"
                    >
                      <Heart 
                        className={`w-4 h-4 ${comment.is_liked ? "text-red-500 fill-red-500" : ""}`} 
                      />
                      {comment.likes_count > 0 && (
                        <span className={comment.is_liked ? "text-red-500" : ""}>
                          {comment.likes_count}
                        </span>
                      )}
                    </button>
                    
                    {comment.user_id === user?.id && (
                      <button
                        onClick={() => handleDeleteComment(comment.id)}
                        className="text-gray-500 hover:text-red-500 text-xs"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Comment Input */}
        <div className="sticky bottom-0 bg-[#121212] border-t border-white/10 p-4">
          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <Avatar className="w-8 h-8 flex-shrink-0">
              <AvatarImage src={user?.avatar} />
              <AvatarFallback className="bg-gradient-to-br from-[#00F0FF] to-[#7000FF] text-white text-sm">
                {(user?.display_name || user?.username || "?")[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            <Input
              ref={inputRef}
              data-testid="comment-input"
              placeholder="Add a comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="flex-1 bg-[#1A1A1A] border-white/10 text-white"
            />
            
            <Button
              type="submit"
              size="icon"
              disabled={!newComment.trim() || sending}
              className="bg-gradient-to-r from-[#00F0FF] to-[#7000FF] hover:opacity-90 disabled:opacity-50"
            >
              {sending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </form>
        </div>
      </motion.div>
    </motion.div>
  );
}
