/**
 * Enhanced Facebook Dating Component for FaceConnect
 * Matches Facebook Dating Italian UI design exactly
 * Features: Profile browsing, matches, friendship mode, notifications
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import {
  Heart, X, Star, MessageCircle, Settings, ChevronLeft, ChevronRight,
  MapPin, Briefcase, GraduationCap, Menu, User, Flame, Clock,
  Smile, Shield, Instagram, Sparkles, Bell, Home, Play, ShoppingBag,
  MoreHorizontal, Eye, Users
} from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { haptic } from "@/utils/mobile";

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Zodiac Signs in Italian
const ZODIAC_SIGNS = {
  aries: 'Ariete',
  taurus: 'Toro',
  gemini: 'Gemelli',
  cancer: 'Cancro',
  leo: 'Leone',
  virgo: 'Vergine',
  libra: 'Bilancia',
  scorpio: 'Scorpione',
  sagittarius: 'Sagittario',
  capricorn: 'Capricorno',
  aquarius: 'Acquario',
  pisces: 'Pesci'
};

// Sample Dating Profiles matching Italian Facebook Dating
const SAMPLE_PROFILES = [
  {
    id: '1',
    name: 'Nadia',
    age: 39,
    zodiac: 'scorpio',
    photos: [
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=800&fit=crop',
      'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=600&h=800&fit=crop'
    ],
    location: 'Napoli',
    distance: '5 km',
    bio: 'Amo viaggiare e scoprire posti nuovi. Cerco qualcuno con cui condividere avventure.',
    job: 'Architetto',
    verified: true,
    isNew: true
  },
  {
    id: '2',
    name: 'Giulia',
    age: 28,
    zodiac: 'leo',
    photos: [
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600&h=800&fit=crop',
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&h=800&fit=crop'
    ],
    location: 'Roma',
    distance: '12 km',
    bio: 'Appassionata di arte e musica. Cerco una connessione autentica.',
    job: 'Designer',
    verified: true,
    isNew: false
  },
  {
    id: '3',
    name: 'Sofia',
    age: 32,
    zodiac: 'pisces',
    photos: [
      'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=600&h=800&fit=crop',
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&h=800&fit=crop'
    ],
    location: 'Milano',
    distance: '8 km',
    bio: 'Chef e amante del buon cibo. La via per il cuore passa dallo stomaco!',
    job: 'Chef',
    verified: false,
    isNew: true
  },
  {
    id: '4',
    name: 'Valentina',
    age: 26,
    zodiac: 'taurus',
    photos: [
      'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=600&h=800&fit=crop'
    ],
    location: 'Firenze',
    distance: '3 km',
    bio: 'Yoga instructor. Cerco equilibrio in tutto, anche in amore.',
    job: 'Istruttrice Yoga',
    verified: true,
    isNew: false
  },
  {
    id: '5',
    name: 'Chiara',
    age: 30,
    zodiac: 'gemini',
    photos: [
      'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=600&h=800&fit=crop'
    ],
    location: 'Torino',
    distance: '15 km',
    bio: 'Avvocato di giorno, DJ di notte. La vita è troppo breve per essere noiosi!',
    job: 'Avvocato',
    verified: true,
    isNew: true
  }
];

// Sample matches for the notification
const SAMPLE_MATCHES = [
  {
    id: 'm1',
    name: 'Rosa',
    photo: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=200&h=200&fit=crop',
    type: 'amicizia',
    hasMessage: true,
    lastMessage: 'Ciao! Come stai?'
  },
  {
    id: 'm2',
    name: 'Laura',
    photo: 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=200&h=200&fit=crop',
    type: 'dating',
    hasMessage: false
  }
];

// Feature buttons data
const FEATURE_BUTTONS = [
  { id: 'serie', icon: Flame, label: 'La tua serie', count: 11, color: 'bg-purple-600' },
  { id: 'spotlight', icon: Clock, label: 'In primo piano', timer: '13:49:45', color: 'bg-purple-600' },
  { id: 'amicizia', icon: Smile, label: 'Amicizia', color: 'bg-purple-600' },
  { id: 'crush', icon: Shield, label: 'Crush', color: 'bg-purple-600' },
  { id: 'instagram', icon: Instagram, label: 'Instagram', color: 'bg-purple-600' }
];

// Swipeable Profile Card
function ProfileCard({ profile, onLike, onPass, onViewProfile }) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-25, 25]);
  const likeOpacity = useTransform(x, [0, 100], [0, 1]);
  const nopeOpacity = useTransform(x, [-100, 0], [1, 0]);
  const [currentPhoto, setCurrentPhoto] = useState(0);

  const handleDragEnd = (_, info) => {
    if (info.offset.x > 100) {
      onLike(profile);
    } else if (info.offset.x < -100) {
      onPass(profile);
    }
  };

  return (
    <motion.div
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={handleDragEnd}
      style={{ x, rotate }}
      className="relative w-full aspect-[3/4] rounded-3xl overflow-hidden shadow-2xl cursor-grab active:cursor-grabbing"
      whileDrag={{ scale: 1.02 }}
      data-testid="dating-profile-card"
    >
      {/* Photo */}
      <div className="relative w-full h-full" onClick={() => onViewProfile(profile)}>
        <img
          src={profile.photos[currentPhoto]}
          alt={profile.name}
          className="w-full h-full object-cover"
        />
        
        {/* Photo Navigation Dots */}
        {profile.photos.length > 1 && (
          <div className="absolute top-4 left-4 right-4 flex gap-1">
            {profile.photos.map((_, i) => (
              <div
                key={i}
                className={`flex-1 h-1 rounded-full transition-all ${
                  i === currentPhoto ? 'bg-white' : 'bg-white/40'
                }`}
              />
            ))}
          </div>
        )}
        
        {/* Photo Navigation Areas */}
        <button
          onClick={(e) => { 
            e.stopPropagation(); 
            setCurrentPhoto(Math.max(0, currentPhoto - 1)); 
          }}
          className="absolute left-0 top-0 bottom-0 w-1/3"
        />
        <button
          onClick={(e) => { 
            e.stopPropagation(); 
            setCurrentPhoto(Math.min(profile.photos.length - 1, currentPhoto + 1)); 
          }}
          className="absolute right-0 top-0 bottom-0 w-1/3"
        />
        
        {/* Like/Nope Stamps */}
        <motion.div
          style={{ opacity: likeOpacity }}
          className="absolute top-20 left-6 px-4 py-2 border-4 border-green-400 rounded-lg rotate-[-15deg]"
        >
          <span className="text-green-400 text-3xl font-bold">MI PIACE</span>
        </motion.div>
        <motion.div
          style={{ opacity: nopeOpacity }}
          className="absolute top-20 right-6 px-4 py-2 border-4 border-red-500 rounded-lg rotate-[15deg]"
        >
          <span className="text-red-500 text-3xl font-bold">NO</span>
        </motion.div>
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        
        {/* Profile Info */}
        <div className="absolute bottom-24 left-0 right-0 px-5 text-white">
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-3xl font-bold">{profile.name}, {profile.age}</h2>
            {profile.verified && (
              <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            )}
          </div>
          <p className="text-lg text-gray-200">{ZODIAC_SIGNS[profile.zodiac]}</p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-8 px-6">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={(e) => { e.stopPropagation(); onPass(profile); }}
          className="w-16 h-16 rounded-full bg-white shadow-xl flex items-center justify-center"
          data-testid="dating-pass-btn"
        >
          <X className="w-8 h-8 text-purple-600" strokeWidth={3} />
        </motion.button>
        
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={(e) => { e.stopPropagation(); onLike(profile); }}
          className="w-16 h-16 rounded-full bg-purple-600 shadow-xl flex items-center justify-center"
          data-testid="dating-like-btn"
        >
          <Heart className="w-8 h-8 text-white" fill="white" />
        </motion.button>
      </div>
    </motion.div>
  );
}

// Match Notification Banner
function MatchNotification({ match, onDismiss, onView }) {
  if (!match) return null;
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="mx-4 mb-4 p-3 rounded-2xl bg-purple-100 flex items-center gap-3"
      data-testid="match-notification"
    >
      <img
        src={match.photo}
        alt={match.name}
        className="w-12 h-12 rounded-full object-cover border-2 border-purple-400"
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-800">
          Il tuo match di {match.type === 'amicizia' ? 'Amicizia' : 'Dating'}, <strong>{match.name}</strong>, ti ha inviato un messaggio.
        </p>
        <button 
          onClick={onView}
          className="text-sm text-purple-600 font-medium"
        >
          Vedi altri aggiornamenti
        </button>
      </div>
      <button 
        onClick={onDismiss}
        className="p-1 text-purple-600"
      >
        <X className="w-5 h-5" />
      </button>
    </motion.div>
  );
}

// Feature Button Row
function FeatureButtonRow() {
  const [spotlightTime, setSpotlightTime] = useState('13:49:45');

  // Countdown timer for spotlight
  useEffect(() => {
    const interval = setInterval(() => {
      const [h, m, s] = spotlightTime.split(':').map(Number);
      let totalSeconds = h * 3600 + m * 60 + s - 1;
      if (totalSeconds <= 0) totalSeconds = 50385; // Reset to ~14 hours
      const newH = Math.floor(totalSeconds / 3600);
      const newM = Math.floor((totalSeconds % 3600) / 60);
      const newS = totalSeconds % 60;
      setSpotlightTime(`${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}:${String(newS).padStart(2, '0')}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [spotlightTime]);

  return (
    <div className="px-4 py-3 bg-white border-t border-gray-100">
      <ScrollArea className="w-full">
        <div className="flex gap-4 pb-1">
          {/* La tua serie */}
          <button className="flex flex-col items-center min-w-[64px]" data-testid="feature-serie">
            <div className="relative">
              <div className="w-14 h-14 rounded-full bg-purple-600 flex items-center justify-center">
                <Flame className="w-7 h-7 text-white" />
              </div>
              <span className="absolute -top-1 -right-1 bg-purple-800 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                11
              </span>
            </div>
            <span className="text-xs text-gray-600 mt-1 text-center">La tua serie</span>
          </button>

          {/* In primo piano */}
          <button className="flex flex-col items-center min-w-[64px]" data-testid="feature-spotlight">
            <div className="relative">
              <div className="w-14 h-14 rounded-full bg-purple-600 flex items-center justify-center">
                <Sparkles className="w-7 h-7 text-white" />
              </div>
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-purple-800 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                {spotlightTime}
              </span>
            </div>
            <span className="text-xs text-gray-600 mt-2 text-center">In primo piano</span>
          </button>

          {/* Amicizia */}
          <button className="flex flex-col items-center min-w-[64px]" data-testid="feature-amicizia">
            <div className="w-14 h-14 rounded-full bg-purple-600 flex items-center justify-center">
              <Smile className="w-7 h-7 text-white" />
            </div>
            <span className="text-xs text-gray-600 mt-1 text-center">Amicizia</span>
          </button>

          {/* Crush */}
          <button className="flex flex-col items-center min-w-[64px]" data-testid="feature-crush">
            <div className="w-14 h-14 rounded-full bg-purple-600 flex items-center justify-center">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <span className="text-xs text-gray-600 mt-1 text-center">Crush</span>
          </button>

          {/* Instagram */}
          <button className="flex flex-col items-center min-w-[64px]" data-testid="feature-instagram">
            <div className="w-14 h-14 rounded-full bg-purple-600 flex items-center justify-center">
              <Instagram className="w-7 h-7 text-white" />
            </div>
            <span className="text-xs text-gray-600 mt-1 text-center">Instagram</span>
          </button>
        </div>
      </ScrollArea>
    </div>
  );
}

// Profile Detail Modal
function ProfileDetailModal({ profile, isOpen, onClose, onLike, onPass }) {
  const [currentPhoto, setCurrentPhoto] = useState(0);
  
  if (!isOpen || !profile) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black"
      data-testid="profile-detail-modal"
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
              {profile.verified && (
                <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </div>
            <p className="text-lg text-gray-300 mt-1">{ZODIAC_SIGNS[profile.zodiac]}</p>
          </div>
        </div>
        
        {/* Details */}
        <div className="p-6 bg-white">
          {/* Location */}
          <div className="flex items-center gap-3 mb-4">
            <MapPin className="w-5 h-5 text-gray-500" />
            <span className="text-gray-700">{profile.location} · {profile.distance}</span>
          </div>
          
          {/* Job */}
          {profile.job && (
            <div className="flex items-center gap-3 mb-4">
              <Briefcase className="w-5 h-5 text-gray-500" />
              <span className="text-gray-700">{profile.job}</span>
            </div>
          )}
          
          {/* Bio */}
          {profile.bio && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2 text-gray-900">Chi sono</h3>
              <p className="text-gray-600 whitespace-pre-line">{profile.bio}</p>
            </div>
          )}
          
          {/* Spacer for action buttons */}
          <div className="h-24" />
        </div>
      </ScrollArea>
      
      {/* Action Buttons */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-white via-white to-transparent">
        <div className="flex items-center justify-center gap-8">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => { onPass(); onClose(); }}
            className="w-16 h-16 rounded-full bg-white shadow-xl border-2 border-gray-200 flex items-center justify-center"
          >
            <X className="w-8 h-8 text-purple-600" strokeWidth={3} />
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => { onLike(); onClose(); }}
            className="w-20 h-20 rounded-full bg-purple-600 shadow-xl flex items-center justify-center"
          >
            <Heart className="w-10 h-10 text-white" fill="white" />
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.9 }}
            className="w-16 h-16 rounded-full bg-white shadow-xl border-2 border-gray-200 flex items-center justify-center"
          >
            <Star className="w-8 h-8 text-yellow-500" fill="#EAB308" />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

// Match Celebration Modal
function MatchModal({ isOpen, onClose, profile, matchType }) {
  if (!isOpen || !profile) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="fixed inset-0 z-[150] flex items-center justify-center bg-gradient-to-br from-purple-600/95 to-pink-500/95 backdrop-blur"
      data-testid="match-modal"
    >
      <div className="text-center text-white p-8">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring' }}
        >
          <Sparkles className="w-16 h-16 mx-auto mb-4" />
        </motion.div>
        
        <h1 className="text-4xl font-bold mb-2">
          {matchType === 'amicizia' ? 'Nuova amicizia!' : "È un match!"}
        </h1>
        <p className="text-lg opacity-90 mb-8">
          Tu e {profile.name} vi piacete a vicenda
        </p>
        
        <div className="flex justify-center gap-4 mb-8">
          <img
            src={profile.photos[0]}
            alt={profile.name}
            className="w-28 h-28 rounded-full object-cover border-4 border-white shadow-lg"
          />
        </div>
        
        <div className="flex flex-col gap-3 max-w-xs mx-auto">
          <Button className="bg-white text-purple-600 hover:bg-gray-100 h-12 text-base font-semibold">
            <MessageCircle className="w-5 h-5 mr-2" />
            Invia un messaggio
          </Button>
          <Button
            variant="outline"
            className="border-white text-white hover:bg-white/10 h-12 text-base"
            onClick={onClose}
          >
            Continua a sfogliare
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

// Main Enhanced Dating Component
export default function FacebookDatingEnhanced({ isDark }) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('amicizia');
  const [profiles, setProfiles] = useState(SAMPLE_PROFILES);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showDetail, setShowDetail] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [matchProfile, setMatchProfile] = useState(null);
  const [matchType, setMatchType] = useState('dating');
  const [showNotification, setShowNotification] = useState(true);
  const [currentNotification, setCurrentNotification] = useState(SAMPLE_MATCHES[0]);

  const currentProfile = profiles[currentIndex];
  const tabs = [
    { id: 'likes', label: 'Persone a cui piaci' },
    { id: 'amicizia', label: 'Amicizia', active: true },
    { id: 'match', label: 'Match' }
  ];

  const handleLike = useCallback((profile) => {
    haptic.medium();
    
    // 40% chance of match for demo
    const isMatch = Math.random() < 0.4;
    if (isMatch) {
      setMatchProfile(profile);
      setMatchType(activeTab === 'amicizia' ? 'amicizia' : 'dating');
    } else {
      toast.success(`Ti piace ${profile.name}!`, {
        icon: '💜',
        duration: 2000
      });
    }
    
    setTimeout(() => {
      setCurrentIndex(prev => prev + 1);
    }, 300);
  }, [activeTab]);

  const handlePass = useCallback((profile) => {
    haptic.light();
    setCurrentIndex(prev => prev + 1);
  }, []);

  const handleViewProfile = useCallback((profile) => {
    setSelectedProfile(profile);
    setShowDetail(true);
  }, []);

  const resetProfiles = () => {
    setCurrentIndex(0);
    setProfiles([...SAMPLE_PROFILES].sort(() => Math.random() - 0.5));
    haptic.light();
  };

  const dismissNotification = () => {
    setShowNotification(false);
    setCurrentNotification(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col" data-testid="facebook-dating-page">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="flex items-center justify-between px-4 py-3">
          <button className="p-2 -ml-2" data-testid="dating-menu-btn">
            <Menu className="w-6 h-6 text-gray-700" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">Dating</h1>
          <button className="p-2 -mr-2" data-testid="dating-profile-btn">
            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
              <User className="w-5 h-5 text-gray-600" />
            </div>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex px-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-3 px-2 text-sm font-medium transition-colors relative ${
                activeTab === tab.id
                  ? 'text-purple-600'
                  : 'text-gray-500'
              }`}
              data-testid={`tab-${tab.id}`}
            >
              {activeTab === tab.id && tab.id === 'amicizia' && (
                <span className="absolute top-2 left-1/2 -translate-x-1/2 w-2 h-2 bg-red-500 rounded-full" />
              )}
              <span className={`${
                activeTab === tab.id 
                  ? 'bg-purple-100 px-4 py-2 rounded-full' 
                  : ''
              }`}>
                {tab.label}
              </span>
            </button>
          ))}
        </div>
      </header>

      {/* Notification Banner */}
      <AnimatePresence>
        {showNotification && currentNotification && (
          <MatchNotification
            match={currentNotification}
            onDismiss={dismissNotification}
            onView={() => {
              toast.info('Apertura messaggi...');
              dismissNotification();
            }}
          />
        )}
      </AnimatePresence>

      {/* Profile Card Area */}
      <div className="flex-1 px-4 py-4 overflow-hidden">
        {currentIndex < profiles.length ? (
          <ProfileCard
            key={currentProfile.id}
            profile={currentProfile}
            onLike={handleLike}
            onPass={handlePass}
            onViewProfile={handleViewProfile}
          />
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center px-6">
            <div className="w-24 h-24 rounded-full bg-purple-100 flex items-center justify-center mb-6">
              <Users className="w-12 h-12 text-purple-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Nessun altro profilo
            </h3>
            <p className="text-gray-500 mb-6">
              Hai visto tutti i profili disponibili. Torna più tardi per scoprirne di nuovi!
            </p>
            <Button
              onClick={resetProfiles}
              className="bg-purple-600 hover:bg-purple-700 text-white px-6"
              data-testid="reset-profiles-btn"
            >
              Ricomincia da capo
            </Button>
          </div>
        )}
      </div>

      {/* Feature Buttons Row */}
      <FeatureButtonRow />

      {/* Profile Detail Modal */}
      <AnimatePresence>
        {showDetail && selectedProfile && (
          <ProfileDetailModal
            profile={selectedProfile}
            isOpen={showDetail}
            onClose={() => {
              setShowDetail(false);
              setSelectedProfile(null);
            }}
            onLike={() => handleLike(selectedProfile)}
            onPass={() => handlePass(selectedProfile)}
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
            matchType={matchType}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
