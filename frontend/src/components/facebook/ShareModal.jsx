import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, Share2, Link2, Facebook, Twitter, MessageCircle, 
  Mail, Copy, Check, BookmarkPlus, Users, Globe,
  Heart, MessageSquare, Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Post Preview Card Component
function PostPreviewCard({ post }) {
  if (!post) return null;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, duration: 0.3 }}
      className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3 mb-4 border border-gray-200 dark:border-gray-600"
    >
      <div className="flex items-start gap-3">
        {/* Post Image Thumbnail */}
        {post.media_url && (
          <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-gray-200 dark:bg-gray-600">
            {post.media_type === 'video' ? (
              <video 
                src={post.media_url.startsWith('http') ? post.media_url : `${API_URL}${post.media_url}`}
                className="w-full h-full object-cover"
                muted
              />
            ) : (
              <img 
                src={post.media_url.startsWith('http') ? post.media_url : `${API_URL}${post.media_url}`}
                alt="Post"
                className="w-full h-full object-cover"
              />
            )}
          </div>
        )}
        
        {/* Post Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Avatar className="w-6 h-6">
              <AvatarImage src={post.avatar ? `${API_URL}${post.avatar}` : undefined} />
              <AvatarFallback className="bg-blue-500 text-white text-xs">
                {post.username?.[0]?.toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
            <span className="font-semibold text-sm text-gray-900 dark:text-white truncate">
              {post.username || post.author?.username || 'User'}
            </span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
            {post.content || 'No caption'}
          </p>
          
          {/* Post Stats */}
          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1">
              <Heart className="w-3 h-3" />
              {post.likes_count || 0}
            </span>
            <span className="flex items-center gap-1">
              <MessageSquare className="w-3 h-3" />
              {post.comments_count || 0}
            </span>
            <span className="flex items-center gap-1">
              <Eye className="w-3 h-3" />
              {post.views_count || 0}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function ShareModal({ 
  isOpen, 
  onClose, 
  post,
  onShareToStory,
  onShareToMessenger,
  currentUser
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFriends, setSelectedFriends] = useState([]);
  const [copied, setCopied] = useState(false);
  const [shareCaption, setShareCaption] = useState("");

  const shareUrl = `${window.location.origin}/post/${post?.id}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Failed to copy link");
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${post?.author?.username}'s post on FaceConnect`,
          text: post?.content?.slice(0, 100) || "Check out this post!",
          url: shareUrl
        });
      } catch (error) {
        if (error.name !== "AbortError") {
          toast.error("Failed to share");
        }
      }
    } else {
      handleCopyLink();
    }
  };

  const handleShareToFeed = () => {
    toast.success("Shared to your feed!");
    onClose();
  };

  const shareOptions = [
    {
      id: "feed",
      icon: Globe,
      label: "Share to Feed",
      sublabel: "Share on your timeline",
      color: "bg-blue-500",
      action: handleShareToFeed
    },
    {
      id: "story",
      icon: BookmarkPlus,
      label: "Share to Story",
      sublabel: "Share as a story for 24h",
      color: "bg-gradient-to-r from-pink-500 to-orange-500",
      action: () => {
        onShareToStory?.(post);
        onClose();
      }
    },
    {
      id: "messenger",
      icon: MessageCircle,
      label: "Send in Messenger",
      sublabel: "Share with friends privately",
      color: "bg-[#0084FF]",
      action: () => {
        onShareToMessenger?.(post);
        onClose();
      }
    }
  ];

  const externalShareOptions = [
    {
      id: "facebook",
      icon: Facebook,
      label: "Facebook",
      color: "#1877F2",
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`
    },
    {
      id: "twitter",
      icon: Twitter,
      label: "Twitter",
      color: "#1DA1F2",
      url: `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(post?.content?.slice(0, 100) || "")}`
    },
    {
      id: "email",
      icon: Mail,
      label: "Email",
      color: "#EA4335",
      url: `mailto:?subject=Check this post&body=${encodeURIComponent(shareUrl)}`
    }
  ];

  // Mock friends data - in real app, this would come from API
  const friends = [
    { id: 1, username: "john_doe", full_name: "John Doe", avatar: null },
    { id: 2, username: "jane_smith", full_name: "Jane Smith", avatar: null },
    { id: 3, username: "mike_wilson", full_name: "Mike Wilson", avatar: null },
  ];

  const filteredFriends = friends.filter(f => 
    f.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleFriend = (friendId) => {
    setSelectedFriends(prev => 
      prev.includes(friendId) 
        ? prev.filter(id => id !== friendId)
        : [...prev, friendId]
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop with fade-in */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Modal with enhanced fade-in animation */}
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.9 }}
            transition={{ 
              type: "spring", 
              damping: 30, 
              stiffness: 350,
              opacity: { duration: 0.25 }
            }}
            className="fixed inset-x-4 bottom-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl z-50 max-h-[85vh] overflow-hidden md:w-[500px]"
          >
            {/* Header */}
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700"
            >
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Share Post</h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </motion.div>

            <div className="overflow-y-auto max-h-[calc(85vh-60px)]">
              {/* Post Preview Section */}
              <div className="p-4 pb-0">
                <PostPreviewCard post={post} />
              </div>

              {/* Share Options */}
              <div className="p-4 pt-0 space-y-2">
                {shareOptions.map((option) => (
                  <motion.button
                    key={option.id}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={option.action}
                    className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-xl transition-colors"
                  >
                    <div className={`w-10 h-10 ${option.color} rounded-full flex items-center justify-center`}>
                      <option.icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="text-left">
                      <div className="font-medium text-gray-900 dark:text-white">{option.label}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">{option.sublabel}</div>
                    </div>
                  </motion.button>
                ))}
              </div>

              {/* Divider */}
              <div className="border-t border-gray-200 dark:border-gray-700" />

              {/* Send to Friends */}
              <div className="p-4">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  Send to Friends
                </h3>
                
                {/* Search */}
                <Input
                  placeholder="Search friends..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="mb-3"
                />

                {/* Friends List */}
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {filteredFriends.map((friend) => (
                    <motion.button
                      key={friend.id}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => toggleFriend(friend.id)}
                      className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors ${
                        selectedFriends.includes(friend.id)
                          ? "bg-blue-50 dark:bg-blue-900/30"
                          : "hover:bg-gray-50 dark:hover:bg-gray-700/50"
                      }`}
                    >
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={friend.avatar} />
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                          {friend.username[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 text-left">
                        <div className="font-medium text-gray-900 dark:text-white">
                          {friend.full_name}
                        </div>
                        <div className="text-sm text-gray-500">@{friend.username}</div>
                      </div>
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                        selectedFriends.includes(friend.id)
                          ? "bg-blue-500 border-blue-500"
                          : "border-gray-300 dark:border-gray-600"
                      }`}>
                        {selectedFriends.includes(friend.id) && (
                          <Check className="w-4 h-4 text-white" />
                        )}
                      </div>
                    </motion.button>
                  ))}
                </div>

                {selectedFriends.length > 0 && (
                  <Button 
                    className="w-full mt-3 bg-blue-500 hover:bg-blue-600"
                    onClick={() => {
                      toast.success(`Sent to ${selectedFriends.length} friend(s)!`);
                      onClose();
                    }}
                  >
                    Send to {selectedFriends.length} friend{selectedFriends.length !== 1 ? 's' : ''}
                  </Button>
                )}
              </div>

              {/* Divider */}
              <div className="border-t border-gray-200 dark:border-gray-700" />

              {/* External Share & Copy Link */}
              <div className="p-4">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  Share to Other Apps
                </h3>
                
                <div className="flex gap-4 justify-center mb-4">
                  {externalShareOptions.map((option) => (
                    <motion.a
                      key={option.id}
                      href={option.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      className="flex flex-col items-center gap-1"
                    >
                      <div 
                        className="w-12 h-12 rounded-full flex items-center justify-center text-white"
                        style={{ backgroundColor: option.color }}
                      >
                        <option.icon className="w-6 h-6" />
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {option.label}
                      </span>
                    </motion.a>
                  ))}
                </div>

                {/* Copy Link */}
                <div className="flex gap-2">
                  <Input
                    value={shareUrl}
                    readOnly
                    className="flex-1 bg-gray-50 dark:bg-gray-700"
                  />
                  <Button
                    variant="outline"
                    onClick={handleCopyLink}
                    className="shrink-0"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
