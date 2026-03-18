import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { 
  UserPlus, MessageCircle, Users, MapPin, Briefcase, 
  GraduationCap, Heart, X 
} from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { VerifiedBadge } from "@/components/PremiumGate";
import { ProfileCardSkeleton } from "./LoadingSkeleton";

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function ProfileHoverCard({ 
  userId, 
  username,
  children, 
  position = "bottom",
  delay = 500 
}) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [timeoutId, setTimeoutId] = useState(null);

  const fetchProfile = useCallback(async () => {
    if (profile || loading) return;
    
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/users/${userId}`);
      if (response.ok) {
        const data = await response.json();
        setProfile(data);
      }
    } catch (error) {
      console.error("Failed to fetch profile:", error);
    } finally {
      setLoading(false);
    }
  }, [userId, profile, loading]);

  const handleMouseEnter = () => {
    const id = setTimeout(() => {
      setIsOpen(true);
      fetchProfile();
    }, delay);
    setTimeoutId(id);
  };

  const handleMouseLeave = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    setIsOpen(false);
  };

  const positionClasses = {
    top: "bottom-full mb-2",
    bottom: "top-full mt-2",
    left: "right-full mr-2",
    right: "left-full ml-2",
  };

  const mutualFriends = profile?.mutual_friends || [];
  const isVerified = profile?.is_premium || profile?.is_verified;

  return (
    <div 
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: position === "top" ? 10 : -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: position === "top" ? 10 : -10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className={`absolute ${positionClasses[position]} left-0 z-50`}
            onMouseEnter={() => setIsOpen(true)}
            onMouseLeave={handleMouseLeave}
          >
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden w-80">
              {loading ? (
                <ProfileCardSkeleton />
              ) : profile ? (
                <>
                  {/* Cover Photo */}
                  <div className="h-24 bg-gradient-to-r from-blue-500 to-purple-600 relative">
                    {profile.cover_photo && (
                      <img 
                        src={`${API_URL}${profile.cover_photo}`}
                        alt="Cover"
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>

                  {/* Avatar - overlapping */}
                  <div className="relative -mt-12 px-4">
                    <div className="relative inline-block">
                      <Avatar className="w-20 h-20 border-4 border-white dark:border-gray-800 shadow-lg">
                        <AvatarImage 
                          src={profile.avatar ? `${API_URL}${profile.avatar}` : undefined}
                          alt={profile.username}
                        />
                        <AvatarFallback className="text-2xl bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                          {profile.username?.[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {profile.is_online && (
                        <span className="absolute bottom-1 right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white dark:border-gray-800" />
                      )}
                    </div>
                  </div>

                  {/* Profile Info */}
                  <div className="p-4 pt-2">
                    <div className="flex items-center gap-2">
                      <h3 
                        className="text-lg font-bold text-gray-900 dark:text-white cursor-pointer hover:underline"
                        onClick={() => navigate(`/profile/${profile.id}`)}
                      >
                        {profile.full_name || profile.username}
                      </h3>
                      {isVerified && <VerifiedBadge />}
                    </div>
                    
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      @{profile.username}
                    </p>

                    {/* Bio */}
                    {profile.bio && (
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 line-clamp-2">
                        {profile.bio}
                      </p>
                    )}

                    {/* Details */}
                    <div className="mt-3 space-y-1.5">
                      {profile.location && (
                        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                          <MapPin className="w-4 h-4" />
                          <span>{profile.location}</span>
                        </div>
                      )}
                      {profile.work && (
                        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                          <Briefcase className="w-4 h-4" />
                          <span>{profile.work}</span>
                        </div>
                      )}
                      {profile.education && (
                        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                          <GraduationCap className="w-4 h-4" />
                          <span>{profile.education}</span>
                        </div>
                      )}
                    </div>

                    {/* Stats */}
                    <div className="flex justify-between mt-4 py-3 border-t border-gray-100 dark:border-gray-700">
                      <div className="text-center">
                        <div className="font-bold text-gray-900 dark:text-white">
                          {profile.posts_count || 0}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Posts</div>
                      </div>
                      <div className="text-center">
                        <div className="font-bold text-gray-900 dark:text-white">
                          {profile.followers_count || 0}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Followers</div>
                      </div>
                      <div className="text-center">
                        <div className="font-bold text-gray-900 dark:text-white">
                          {profile.following_count || 0}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Following</div>
                      </div>
                    </div>

                    {/* Mutual Friends */}
                    {mutualFriends.length > 0 && (
                      <div className="flex items-center gap-2 py-2 text-sm text-gray-500 dark:text-gray-400">
                        <div className="flex -space-x-2">
                          {mutualFriends.slice(0, 3).map((friend, i) => (
                            <Avatar key={i} className="w-6 h-6 border-2 border-white dark:border-gray-800">
                              <AvatarImage src={friend.avatar} />
                              <AvatarFallback className="text-xs">
                                {friend.username?.[0]}
                              </AvatarFallback>
                            </Avatar>
                          ))}
                        </div>
                        <span>
                          {mutualFriends.length} mutual friend{mutualFriends.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-2 mt-3">
                      <Button 
                        className="flex-1 bg-[#1877F2] hover:bg-[#1565c0] text-white"
                        size="sm"
                      >
                        <UserPlus className="w-4 h-4 mr-1" />
                        {profile.is_friend ? "Friends" : "Add Friend"}
                      </Button>
                      <Button 
                        variant="outline" 
                        className="flex-1"
                        size="sm"
                        onClick={() => navigate(`/chat?user=${profile.id}`)}
                      >
                        <MessageCircle className="w-4 h-4 mr-1" />
                        Message
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="p-8 text-center text-gray-500">
                  Failed to load profile
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
