import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Image, Video, Smile, MapPin, Users, MoreHorizontal,
  X, Camera
} from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/context/AuthContext";

const API_URL = process.env.REACT_APP_BACKEND_URL;

export function CreatePostWidget({ onCreatePost }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(false);

  const handleClick = () => {
    // Navigate to create post page or expand widget
    navigate('/post/create');
  };

  const quickActions = [
    { icon: Video, label: "Live video", color: "#F43F5E", action: () => navigate('/live') },
    { icon: Image, label: "Photo/video", color: "#22C55E", action: () => navigate('/post/create') },
    { icon: Smile, label: "Feeling/activity", color: "#F7B928", action: () => navigate('/post/create') },
  ];

  return (
    <div className="bg-[var(--bg-secondary)] rounded-xl border border-white/5 mb-4 mx-4 lg:mx-0">
      {/* Main Input Area */}
      <div className="flex items-center gap-3 p-3">
        <Avatar className="h-10 w-10 flex-shrink-0">
          <AvatarImage src={user?.avatar ? `${API_URL}${user.avatar}` : undefined} />
          <AvatarFallback className="bg-gradient-to-br from-[var(--primary)] to-[var(--accent-purple)] text-white text-sm">
            {user?.username?.[0]?.toUpperCase()}
          </AvatarFallback>
        </Avatar>
        
        <button
          onClick={handleClick}
          className="flex-1 text-left px-4 py-2.5 bg-white/5 hover:bg-white/10 rounded-full text-[var(--text-muted)] transition-colors"
        >
          What's on your mind, {user?.display_name?.split(' ')[0] || user?.username}?
        </button>
      </div>

      {/* Divider */}
      <div className="h-px bg-white/5 mx-3" />

      {/* Quick Actions */}
      <div className="flex items-center justify-around p-1">
        {quickActions.map((action, idx) => (
          <button
            key={idx}
            onClick={action.action}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg hover:bg-white/5 transition-colors flex-1 justify-center"
          >
            <action.icon className="w-5 h-5" style={{ color: action.color }} />
            <span className="text-[var(--text-secondary)] text-sm font-medium hidden sm:inline">
              {action.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

// Stories Create Card (for stories bar)
export function CreateStoryCard({ onClick }) {
  const { user } = useAuth();

  return (
    <button
      onClick={onClick}
      className="relative flex-shrink-0 w-28 h-48 rounded-xl overflow-hidden group"
    >
      {/* User Avatar Background */}
      <div className="absolute inset-0">
        {user?.avatar ? (
          <img
            src={`${API_URL}${user.avatar}`}
            alt=""
            className="w-full h-3/5 object-cover"
          />
        ) : (
          <div className="w-full h-3/5 bg-gradient-to-br from-[var(--primary)] to-[var(--accent-purple)]" />
        )}
        <div className="w-full h-2/5 bg-[var(--bg-secondary)]" />
      </div>

      {/* Create Button */}
      <div className="absolute top-[55%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
        <div className="w-10 h-10 rounded-full bg-[var(--primary)] border-4 border-[var(--bg-secondary)] flex items-center justify-center group-hover:scale-110 transition-transform">
          <span className="text-white text-2xl font-light">+</span>
        </div>
      </div>

      {/* Label */}
      <div className="absolute bottom-3 left-0 right-0 text-center">
        <span className="text-[var(--text-primary)] text-xs font-medium">Create story</span>
      </div>

      {/* Hover Overlay */}
      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
}

export default CreatePostWidget;
