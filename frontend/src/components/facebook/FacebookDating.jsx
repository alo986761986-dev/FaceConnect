/**
 * Facebook Dating Component for FaceConnect
 * Complete dating experience with profiles, matches, and messaging
 */
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import {
  Heart, X, Star, MessageCircle, Settings, ChevronLeft, ChevronRight,
  MapPin, Briefcase, GraduationCap, Music, Film, Coffee, Plane,
  Camera, Book, Dumbbell, Gamepad2, Palette, Code, ChefHat, Mountain,
  Dog, Cat, Wine, Beer, Sparkles, Shield, Eye, EyeOff, Filter,
  Plus, Minus, RefreshCw, Clock, CheckCircle, Info, Zap
} from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { haptic } from "@/utils/mobile";

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Interest Icons
const INTERESTS = [
  { id: 'music', icon: Music, label: 'Music' },
  { id: 'movies', icon: Film, label: 'Movies' },
  { id: 'coffee', icon: Coffee, label: 'Coffee' },
  { id: 'travel', icon: Plane, label: 'Travel' },
  { id: 'photography', icon: Camera, label: 'Photography' },
  { id: 'reading', icon: Book, label: 'Reading' },
  { id: 'fitness', icon: Dumbbell, label: 'Fitness' },
  { id: 'gaming', icon: Gamepad2, label: 'Gaming' },
  { id: 'art', icon: Palette, label: 'Art' },
  { id: 'coding', icon: Code, label: 'Coding' },
  { id: 'cooking', icon: ChefHat, label: 'Cooking' },
  { id: 'hiking', icon: Mountain, label: 'Hiking' },
  { id: 'dogs', icon: Dog, label: 'Dogs' },
  { id: 'cats', icon: Cat, label: 'Cats' },
  { id: 'wine', icon: Wine, label: 'Wine' },
  { id: 'beer', icon: Beer, label: 'Beer' },
];

// Sample Dating Profiles
const SAMPLE_PROFILES = [
  {
    id: '1',
    name: 'Sofia',
    age: 26,
    photos: [
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600',
      'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=600',
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600'
    ],
    location: 'New York, NY',
    distance: '5 miles away',
    bio: 'Coffee enthusiast ☕ | Travel addict ✈️ | Dog mom 🐕\nLooking for someone to explore the city with and try new restaurants!',
    job: 'Product Designer',
    company: 'Tech Startup',
    education: 'NYU',
    interests: ['coffee', 'travel', 'dogs', 'photography', 'art'],
    verified: true,
    height: "5'6\"",
    lookingFor: 'Something serious',
    prompts: [
      { question: 'A perfect first date would be...', answer: 'Exploring a new neighborhood, finding a cozy café, and deep conversations that last for hours' },
      { question: 'My simple pleasures are...', answer: 'Morning coffee, sunset walks, and spontaneous weekend trips' }
    ]
  },
  {
    id: '2',
    name: 'Marco',
    age: 29,
    photos: [
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600',
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=600'
    ],
    location: 'Los Angeles, CA',
    distance: '12 miles away',
    bio: 'Filmmaker 🎬 | Pizza connoisseur 🍕 | Weekend hiker 🏔️\nI believe the best stories happen when you least expect them.',
    job: 'Film Director',
    company: 'Independent',
    education: 'USC Film School',
    interests: ['movies', 'hiking', 'cooking', 'photography'],
    verified: true,
    height: "6'1\"",
    lookingFor: 'Something casual',
    prompts: [
      { question: 'Two truths and a lie...', answer: "I've directed a commercial, I can cook Italian food, and I've never been to Italy" },
      { question: 'I geek out on...', answer: 'Cinema history, especially Italian neorealism and French New Wave' }
    ]
  },
  {
    id: '3',
    name: 'Emma',
    age: 24,
    photos: [
      'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=600',
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600'
    ],
    location: 'Chicago, IL',
    distance: '3 miles away',
    bio: 'Music teacher by day 🎵 | Concert goer by night 🎸\nLooking for my duet partner!',
    job: 'Music Teacher',
    company: 'Chicago Public Schools',
    education: 'Northwestern',
    interests: ['music', 'coffee', 'reading', 'cats'],
    verified: false,
    height: "5'4\"",
    lookingFor: 'Something serious',
    prompts: [
      { question: 'My love language is...', answer: 'Quality time and acts of service. Make me dinner and I\'m yours!' }
    ]
  },
  {
    id: '4',
    name: 'Alex',
    age: 31,
    photos: [
      'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=600',
      'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=600'
    ],
    location: 'Miami, FL',
    distance: '8 miles away',
    bio: 'Tech entrepreneur 💻 | Beach lover 🏖️ | Amateur chef 👨‍🍳\nBuilding startups and building connections.',
    job: 'CEO',
    company: 'AI Startup',
    education: 'MIT',
    interests: ['coding', 'fitness', 'travel', 'cooking', 'wine'],
    verified: true,
    height: "5'10\"",
    lookingFor: 'Not sure yet',
    prompts: [
      { question: 'The key to my heart is...', answer: 'Intellectual curiosity, a sense of humor, and loving good food' }
    ]
  }
];

// Swipeable Card Component
function SwipeableCard({ profile, onSwipe, isDark, isTop }) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-30, 30]);
  const likeOpacity = useTransform(x, [0, 100], [0, 1]);
  const nopeOpacity = useTransform(x, [-100, 0], [1, 0]);
  const [currentPhoto, setCurrentPhoto] = useState(0);

  const handleDragEnd = (_, info) => {
    if (info.offset.x > 100) {
      onSwipe('right', profile);
    } else if (info.offset.x < -100) {
      onSwipe('left', profile);
    }
  };

  if (!isTop) {
    return (
      <div className="absolute inset-4 rounded-3xl overflow-hidden">
        <img
          src={profile.photos[0]}
          alt={profile.name}
          className="w-full h-full object-cover scale-95 opacity-50"
        />
      </div>
    );
  }

  return (
    <motion.div
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={handleDragEnd}
      style={{ x, rotate }}
      className="absolute inset-4 rounded-3xl overflow-hidden shadow-2xl cursor-grab active:cursor-grabbing"
      whileDrag={{ scale: 1.02 }}
    >
      {/* Photo */}
      <div className="relative w-full h-full">
        <img
          src={profile.photos[currentPhoto]}
          alt={profile.name}
          className="w-full h-full object-cover"
        />
        
        {/* Photo Navigation */}
        <div className="absolute top-4 left-4 right-4 flex gap-1">
          {profile.photos.map((_, i) => (
            <div
              key={i}
              className={`flex-1 h-1 rounded-full ${
                i === currentPhoto ? 'bg-white' : 'bg-white/40'
              }`}
            />
          ))}
        </div>
        
        {/* Photo Arrows */}
        <button
          onClick={(e) => { e.stopPropagation(); setCurrentPhoto(Math.max(0, currentPhoto - 1)); }}
          className="absolute left-0 top-0 bottom-0 w-1/3"
        />
        <button
          onClick={(e) => { e.stopPropagation(); setCurrentPhoto(Math.min(profile.photos.length - 1, currentPhoto + 1)); }}
          className="absolute right-0 top-0 bottom-0 w-1/3"
        />
        
        {/* Like/Nope Stamps */}
        <motion.div
          style={{ opacity: likeOpacity }}
          className="absolute top-20 left-8 px-4 py-2 border-4 border-green-500 rounded-lg rotate-[-20deg]"
        >
          <span className="text-green-500 text-4xl font-bold">LIKE</span>
        </motion.div>
        <motion.div
          style={{ opacity: nopeOpacity }}
          className="absolute top-20 right-8 px-4 py-2 border-4 border-red-500 rounded-lg rotate-[20deg]"
        >
          <span className="text-red-500 text-4xl font-bold">NOPE</span>
        </motion.div>
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        
        {/* Profile Info */}
        <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-3xl font-bold">{profile.name}, {profile.age}</h2>
            {profile.verified && (
              <Shield className="w-6 h-6 text-blue-400" />
            )}
          </div>
          
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="w-4 h-4" />
            <span className="text-sm">{profile.distance}</span>
          </div>
          
          {profile.job && (
            <div className="flex items-center gap-2 mb-2">
              <Briefcase className="w-4 h-4" />
              <span className="text-sm">{profile.job} at {profile.company}</span>
            </div>
          )}
          
          <div className="flex flex-wrap gap-2 mt-3">
            {profile.interests.slice(0, 4).map((interest) => {
              const interestData = INTERESTS.find(i => i.id === interest);
              if (!interestData) return null;
              return (
                <span
                  key={interest}
                  className="px-3 py-1 bg-white/20 backdrop-blur rounded-full text-xs flex items-center gap-1"
                >
                  <interestData.icon className="w-3 h-3" />
                  {interestData.label}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// Profile Detail Modal
function ProfileDetailModal({ profile, isOpen, onClose, isDark, onLike, onPass }) {
  const [currentPhoto, setCurrentPhoto] = useState(0);
  
  if (!isOpen || !profile) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black"
    >
      <ScrollArea className="h-full">
        {/* Photos */}
        <div className="relative aspect-[3/4] max-h-[70vh]">
          <img
            src={profile.photos[currentPhoto]}
            alt={profile.name}
            className="w-full h-full object-cover"
          />
          
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-black/50"
          >
            <X className="w-6 h-6 text-white" />
          </button>
          
          {/* Photo Navigation */}
          <div className="absolute top-4 left-4 right-16 flex gap-1">
            {profile.photos.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentPhoto(i)}
                className={`flex-1 h-1 rounded-full ${
                  i === currentPhoto ? 'bg-white' : 'bg-white/40'
                }`}
              />
            ))}
          </div>
          
          {/* Gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
          
          {/* Basic Info */}
          <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
            <div className="flex items-center gap-2">
              <h2 className="text-3xl font-bold">{profile.name}, {profile.age}</h2>
              {profile.verified && <Shield className="w-6 h-6 text-blue-400" />}
            </div>
          </div>
        </div>
        
        {/* Details */}
        <div className={`p-6 ${isDark ? 'bg-[#18191a]' : 'bg-white'}`}>
          {/* Location & Looking For */}
          <div className="space-y-3 mb-6">
            <div className="flex items-center gap-3">
              <MapPin className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
              <span className={isDark ? 'text-gray-200' : 'text-gray-700'}>{profile.location}</span>
            </div>
            <div className="flex items-center gap-3">
              <Heart className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
              <span className={isDark ? 'text-gray-200' : 'text-gray-700'}>{profile.lookingFor}</span>
            </div>
            {profile.job && (
              <div className="flex items-center gap-3">
                <Briefcase className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                <span className={isDark ? 'text-gray-200' : 'text-gray-700'}>{profile.job} at {profile.company}</span>
              </div>
            )}
            {profile.education && (
              <div className="flex items-center gap-3">
                <GraduationCap className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                <span className={isDark ? 'text-gray-200' : 'text-gray-700'}>{profile.education}</span>
              </div>
            )}
          </div>
          
          {/* Bio */}
          <div className="mb-6">
            <h3 className={`text-lg font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              About
            </h3>
            <p className={`whitespace-pre-line ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              {profile.bio}
            </p>
          </div>
          
          {/* Interests */}
          <div className="mb-6">
            <h3 className={`text-lg font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Interests
            </h3>
            <div className="flex flex-wrap gap-2">
              {profile.interests.map((interest) => {
                const interestData = INTERESTS.find(i => i.id === interest);
                if (!interestData) return null;
                return (
                  <span
                    key={interest}
                    className={`px-4 py-2 rounded-full text-sm flex items-center gap-2 ${
                      isDark ? 'bg-[#3a3b3c] text-gray-200' : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    <interestData.icon className="w-4 h-4" />
                    {interestData.label}
                  </span>
                );
              })}
            </div>
          </div>
          
          {/* Prompts */}
          {profile.prompts && profile.prompts.length > 0 && (
            <div className="mb-6 space-y-4">
              {profile.prompts.map((prompt, i) => (
                <div
                  key={i}
                  className={`p-4 rounded-xl ${isDark ? 'bg-[#242526]' : 'bg-gray-50'}`}
                >
                  <p className={`text-sm mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {prompt.question}
                  </p>
                  <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {prompt.answer}
                  </p>
                </div>
              ))}
            </div>
          )}
          
          {/* Spacer for action buttons */}
          <div className="h-24" />
        </div>
      </ScrollArea>
      
      {/* Action Buttons */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black to-transparent">
        <div className="flex items-center justify-center gap-6">
          <button
            onClick={() => { onPass(); onClose(); }}
            className="w-16 h-16 rounded-full bg-white shadow-lg flex items-center justify-center"
          >
            <X className="w-8 h-8 text-red-500" />
          </button>
          <button
            onClick={() => { onLike(); onClose(); }}
            className="w-20 h-20 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 shadow-lg flex items-center justify-center"
          >
            <Heart className="w-10 h-10 text-white fill-white" />
          </button>
          <button className="w-16 h-16 rounded-full bg-white shadow-lg flex items-center justify-center">
            <Star className="w-8 h-8 text-purple-500" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// Match Modal
function MatchModal({ isOpen, onClose, profile, isDark }) {
  if (!isOpen || !profile) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="fixed inset-0 z-[150] flex items-center justify-center bg-gradient-to-br from-pink-500/90 to-purple-600/90 backdrop-blur"
    >
      <div className="text-center text-white p-8">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring' }}
        >
          <Sparkles className="w-16 h-16 mx-auto mb-4" />
        </motion.div>
        
        <h1 className="text-4xl font-bold mb-2">It's a Match!</h1>
        <p className="text-lg opacity-80 mb-8">
          You and {profile.name} liked each other
        </p>
        
        <div className="flex justify-center gap-4 mb-8">
          <img
            src={profile.photos[0]}
            alt={profile.name}
            className="w-24 h-24 rounded-full object-cover border-4 border-white"
          />
        </div>
        
        <div className="flex flex-col gap-3">
          <Button className="bg-white text-pink-500 hover:bg-gray-100">
            <MessageCircle className="w-5 h-5 mr-2" />
            Send a Message
          </Button>
          <Button
            variant="outline"
            className="border-white text-white hover:bg-white/10"
            onClick={onClose}
          >
            Keep Swiping
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

// Main Dating Component
export default function FacebookDating({ isDark }) {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState(SAMPLE_PROFILES);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showDetail, setShowDetail] = useState(false);
  const [matchProfile, setMatchProfile] = useState(null);
  const [likes, setLikes] = useState([]);
  const [matches, setMatches] = useState([]);

  const currentProfile = profiles[currentIndex];
  const nextProfile = profiles[currentIndex + 1];

  const handleSwipe = (direction, profile) => {
    haptic.medium();
    
    if (direction === 'right') {
      // Like - 30% chance of match for demo
      const isMatch = Math.random() < 0.3;
      if (isMatch) {
        setMatchProfile(profile);
        setMatches(prev => [...prev, profile]);
      }
      setLikes(prev => [...prev, profile.id]);
      toast.success(`You liked ${profile.name}!`);
    } else {
      toast(`Passed on ${profile.name}`);
    }
    
    setTimeout(() => {
      setCurrentIndex(prev => prev + 1);
    }, 200);
  };

  const handleLike = () => {
    if (currentProfile) {
      handleSwipe('right', currentProfile);
    }
  };

  const handlePass = () => {
    if (currentProfile) {
      handleSwipe('left', currentProfile);
    }
  };

  const resetProfiles = () => {
    setCurrentIndex(0);
    setProfiles([...SAMPLE_PROFILES].sort(() => Math.random() - 0.5));
    haptic.light();
  };

  return (
    <div className={`min-h-screen ${isDark ? 'bg-[#18191a]' : 'bg-gray-100'}`}>
      {/* Header */}
      <div className={`sticky top-0 z-40 ${isDark ? 'bg-[#242526]' : 'bg-white'} border-b ${isDark ? 'border-[#3a3b3c]' : 'border-gray-200'}`}>
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
            Dating
          </h1>
          <div className="flex items-center gap-2">
            <button className={`p-2 rounded-full ${isDark ? 'bg-[#3a3b3c]' : 'bg-gray-100'}`}>
              <Filter className={`w-5 h-5 ${isDark ? 'text-gray-200' : 'text-gray-700'}`} />
            </button>
            <button className={`p-2 rounded-full ${isDark ? 'bg-[#3a3b3c]' : 'bg-gray-100'}`}>
              <Settings className={`w-5 h-5 ${isDark ? 'text-gray-200' : 'text-gray-700'}`} />
            </button>
          </div>
        </div>
        
        {/* Matches Row */}
        {matches.length > 0 && (
          <div className="px-4 pb-3">
            <ScrollArea className="w-full">
              <div className="flex gap-3">
                {matches.map((match) => (
                  <button
                    key={match.id}
                    className="flex-shrink-0"
                  >
                    <div className="w-16 h-16 rounded-full p-0.5 bg-gradient-to-br from-pink-500 to-purple-500">
                      <img
                        src={match.photos[0]}
                        alt={match.name}
                        className="w-full h-full rounded-full object-cover border-2 border-white"
                      />
                    </div>
                    <p className={`text-xs text-center mt-1 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                      {match.name}
                    </p>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </div>

      {/* Card Stack */}
      <div className="relative h-[calc(100vh-200px)] max-h-[600px]">
        {currentIndex < profiles.length ? (
          <>
            {nextProfile && (
              <SwipeableCard
                profile={nextProfile}
                isDark={isDark}
                isTop={false}
                onSwipe={() => {}}
              />
            )}
            <SwipeableCard
              key={currentProfile.id}
              profile={currentProfile}
              isDark={isDark}
              isTop={true}
              onSwipe={handleSwipe}
            />
          </>
        ) : (
          <div className="absolute inset-4 flex flex-col items-center justify-center">
            <RefreshCw className={`w-16 h-16 mb-4 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
            <h3 className={`text-xl font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              No more profiles
            </h3>
            <p className={`text-center mb-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Check back later for more matches
            </p>
            <Button
              onClick={resetProfiles}
              className="bg-gradient-to-r from-pink-500 to-purple-500 text-white"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Start Over
            </Button>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      {currentIndex < profiles.length && (
        <div className="flex items-center justify-center gap-6 py-4">
          <button
            onClick={handlePass}
            className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center ${
              isDark ? 'bg-[#3a3b3c]' : 'bg-white'
            }`}
          >
            <X className="w-7 h-7 text-red-500" />
          </button>
          
          <button
            onClick={() => setShowDetail(true)}
            className={`w-12 h-12 rounded-full shadow-lg flex items-center justify-center ${
              isDark ? 'bg-[#3a3b3c]' : 'bg-white'
            }`}
          >
            <Info className={`w-6 h-6 ${isDark ? 'text-gray-300' : 'text-gray-600'}`} />
          </button>
          
          <button
            onClick={handleLike}
            className="w-16 h-16 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 shadow-lg flex items-center justify-center"
          >
            <Heart className="w-8 h-8 text-white" />
          </button>
          
          <button className={`w-12 h-12 rounded-full shadow-lg flex items-center justify-center ${
            isDark ? 'bg-[#3a3b3c]' : 'bg-white'
          }`}>
            <Star className="w-6 h-6 text-purple-500" />
          </button>
          
          <button className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center ${
            isDark ? 'bg-[#3a3b3c]' : 'bg-white'
          }`}>
            <Zap className="w-7 h-7 text-cyan-500" />
          </button>
        </div>
      )}

      {/* Profile Detail Modal */}
      <AnimatePresence>
        {showDetail && currentProfile && (
          <ProfileDetailModal
            profile={currentProfile}
            isOpen={showDetail}
            onClose={() => setShowDetail(false)}
            isDark={isDark}
            onLike={handleLike}
            onPass={handlePass}
          />
        )}
      </AnimatePresence>

      {/* Match Modal */}
      <AnimatePresence>
        {matchProfile && (
          <MatchModal
            isOpen={!!matchProfile}
            onClose={() => setMatchProfile(null)}
            profile={matchProfile}
            isDark={isDark}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export { SwipeableCard, ProfileDetailModal, MatchModal, INTERESTS };
