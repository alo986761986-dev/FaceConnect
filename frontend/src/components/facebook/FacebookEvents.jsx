/**
 * Facebook Events Component for FaceConnect
 * Complete events experience with discovery, creation, and RSVP
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar, Clock, MapPin, Users, Star, Bookmark, Share2, Plus,
  ChevronRight, ChevronLeft, Search, Filter, Check, X, Bell,
  Video, Globe, Lock, Ticket, Music, PartyPopper, Briefcase,
  GraduationCap, Heart, Dumbbell, Utensils, Palette, Camera
} from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { haptic } from "@/utils/mobile";

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Event Categories
const EVENT_CATEGORIES = [
  { id: 'all', label: 'All Events', icon: Calendar },
  { id: 'music', label: 'Music', icon: Music },
  { id: 'party', label: 'Parties', icon: PartyPopper },
  { id: 'business', label: 'Business', icon: Briefcase },
  { id: 'education', label: 'Education', icon: GraduationCap },
  { id: 'fitness', label: 'Fitness', icon: Dumbbell },
  { id: 'food', label: 'Food & Drink', icon: Utensils },
  { id: 'art', label: 'Art', icon: Palette },
  { id: 'dating', label: 'Dating', icon: Heart },
  { id: 'online', label: 'Online', icon: Video },
];

// Sample Events
const SAMPLE_EVENTS = [
  {
    id: '1',
    title: 'Summer Music Festival 2025',
    cover: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=800',
    date: 'SAT, JAN 15',
    time: '4:00 PM - 11:00 PM',
    location: 'Central Park, New York',
    address: '59th to 110th Street, Manhattan, NY',
    organizer: { name: 'Live Nation', avatar: null, verified: true },
    interested: 12500,
    going: 4200,
    category: 'music',
    isOnline: false,
    price: '$45 - $150',
    description: 'Join us for the biggest music festival of the summer! Featuring top artists, food vendors, and an unforgettable experience.',
    userStatus: null, // 'interested', 'going', or null
    saved: false
  },
  {
    id: '2',
    title: 'Tech Startup Networking Mixer',
    cover: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800',
    date: 'THU, JAN 20',
    time: '6:00 PM - 9:00 PM',
    location: 'WeWork Tower',
    address: '123 Innovation Ave, San Francisco, CA',
    organizer: { name: 'StartupSF', avatar: null, verified: true },
    interested: 890,
    going: 234,
    category: 'business',
    isOnline: false,
    price: 'Free',
    description: 'Connect with fellow entrepreneurs, investors, and tech enthusiasts. Free drinks and appetizers!',
    userStatus: 'interested',
    saved: true
  },
  {
    id: '3',
    title: 'Virtual Photography Masterclass',
    cover: 'https://images.unsplash.com/photo-1452587925148-ce544e77e70d?w=800',
    date: 'SUN, JAN 22',
    time: '2:00 PM - 4:00 PM',
    location: 'Online Event',
    address: 'Zoom Meeting',
    organizer: { name: 'Pro Photo Academy', avatar: null, verified: false },
    interested: 2300,
    going: 1100,
    category: 'education',
    isOnline: true,
    price: '$25',
    description: 'Learn advanced photography techniques from industry professionals. All skill levels welcome!',
    userStatus: 'going',
    saved: false
  },
  {
    id: '4',
    title: 'Rooftop Yoga Session',
    cover: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800',
    date: 'SAT, JAN 28',
    time: '7:00 AM - 8:30 AM',
    location: 'Skyline Fitness Center',
    address: '456 Wellness Blvd, Los Angeles, CA',
    organizer: { name: 'Zen Fitness', avatar: null, verified: true },
    interested: 450,
    going: 89,
    category: 'fitness',
    isOnline: false,
    price: '$15',
    description: 'Start your weekend with a peaceful yoga session overlooking the city. Mats provided.',
    userStatus: null,
    saved: false
  },
  {
    id: '5',
    title: 'Wine & Paint Night',
    cover: 'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=800',
    date: 'FRI, FEB 3',
    time: '7:00 PM - 10:00 PM',
    location: 'Art Studio Downtown',
    address: '789 Creative St, Chicago, IL',
    organizer: { name: 'Canvas & Cork', avatar: null, verified: false },
    interested: 320,
    going: 67,
    category: 'art',
    isOnline: false,
    price: '$40',
    description: 'Sip wine while creating your own masterpiece! No experience needed. All materials included.',
    userStatus: null,
    saved: true
  },
];

// Event Card
function EventCard({ event, isDark, onClick, onStatusChange, onSave, compact = false }) {
  const formatCount = (count) => {
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count;
  };

  if (compact) {
    return (
      <motion.button
        onClick={() => onClick?.(event)}
        whileTap={{ scale: 0.98 }}
        className={`w-full flex gap-3 p-3 rounded-xl ${isDark ? 'bg-[#242526]' : 'bg-white'}`}
      >
        {/* Date Badge */}
        <div className="flex-shrink-0 w-14 text-center">
          <div className="text-xs font-bold text-red-500">{event.date.split(',')[0]}</div>
          <div className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {event.date.split(' ')[1]}
          </div>
        </div>
        
        {/* Info */}
        <div className="flex-1 text-left">
          <h3 className={`font-semibold line-clamp-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {event.title}
          </h3>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            {event.time}
          </p>
          <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            {event.location}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <Users className={`w-3 h-3 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
            <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              {formatCount(event.going)} going · {formatCount(event.interested)} interested
            </span>
          </div>
        </div>
        
        {/* Thumbnail */}
        <div className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden">
          <img
            src={event.cover}
            alt={event.title}
            className="w-full h-full object-cover"
          />
        </div>
      </motion.button>
    );
  }

  return (
    <motion.button
      onClick={() => onClick?.(event)}
      whileTap={{ scale: 0.98 }}
      className={`w-full rounded-xl overflow-hidden ${isDark ? 'bg-[#242526]' : 'bg-white'}`}
    >
      {/* Cover */}
      <div className="relative h-40">
        <img
          src={event.cover}
          alt={event.title}
          className="w-full h-full object-cover"
        />
        
        {/* Online Badge */}
        {event.isOnline && (
          <div className="absolute top-2 left-2 px-2 py-0.5 bg-purple-500 rounded text-xs font-medium text-white flex items-center gap-1">
            <Video className="w-3 h-3" />
            Online
          </div>
        )}
        
        {/* Save Button */}
        <button
          onClick={(e) => { e.stopPropagation(); onSave?.(event.id); }}
          className={`absolute top-2 right-2 p-2 rounded-full ${
            event.saved ? 'bg-purple-500' : 'bg-black/50'
          }`}
        >
          <Bookmark className={`w-4 h-4 ${event.saved ? 'text-white fill-white' : 'text-white'}`} />
        </button>
        
        {/* Date Badge */}
        <div className="absolute bottom-2 left-2 px-2 py-1 bg-white rounded-lg text-center">
          <div className="text-xs font-bold text-red-500">{event.date.split(',')[0]}</div>
          <div className="text-sm font-bold text-gray-900">{event.date.split(' ')[1]}</div>
        </div>
      </div>
      
      {/* Content */}
      <div className="p-3 text-left">
        <h3 className={`font-semibold line-clamp-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          {event.title}
        </h3>
        
        <div className="flex items-center gap-1 mt-1">
          <Clock className={`w-3 h-3 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
          <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            {event.time}
          </span>
        </div>
        
        <div className="flex items-center gap-1 mt-0.5">
          <MapPin className={`w-3 h-3 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
          <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            {event.location}
          </span>
        </div>
        
        <div className="flex items-center gap-2 mt-2">
          <Users className={`w-3 h-3 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
          <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            {formatCount(event.going)} going
          </span>
          <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>·</span>
          <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            {event.price}
          </span>
        </div>
        
        {/* RSVP Buttons */}
        <div className="flex gap-2 mt-3">
          <button
            onClick={(e) => { e.stopPropagation(); onStatusChange?.(event.id, 'interested'); }}
            className={`flex-1 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-1 ${
              event.userStatus === 'interested'
                ? 'bg-purple-500/20 text-purple-500 border border-purple-500'
                : isDark ? 'bg-[#3a3b3c] text-gray-200' : 'bg-gray-100 text-gray-700'
            }`}
          >
            <Star className={`w-4 h-4 ${event.userStatus === 'interested' ? 'fill-current' : ''}`} />
            Interested
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onStatusChange?.(event.id, 'going'); }}
            className={`flex-1 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-1 ${
              event.userStatus === 'going'
                ? 'bg-gradient-to-r from-purple-600 to-cyan-500 text-white'
                : isDark ? 'bg-[#3a3b3c] text-gray-200' : 'bg-gray-100 text-gray-700'
            }`}
          >
            <Check className="w-4 h-4" />
            Going
          </button>
        </div>
      </div>
    </motion.button>
  );
}

// Event Detail Modal
function EventDetailModal({ event, isOpen, onClose, isDark, onStatusChange }) {
  if (!isOpen || !event) return null;

  const formatCount = (count) => {
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count;
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
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25 }}
        className={`absolute bottom-0 left-0 right-0 max-h-[90vh] rounded-t-3xl overflow-hidden ${
          isDark ? 'bg-[#18191a]' : 'bg-white'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cover */}
        <div className="relative h-56">
          <img
            src={event.cover}
            alt={event.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          
          <button
            onClick={onClose}
            className="absolute top-4 left-4 p-2 rounded-full bg-black/50"
          >
            <X className="w-5 h-5 text-white" />
          </button>
          
          <div className="absolute top-4 right-4 flex gap-2">
            <button className="p-2 rounded-full bg-black/50">
              <Share2 className="w-5 h-5 text-white" />
            </button>
            <button className="p-2 rounded-full bg-black/50">
              <Bookmark className="w-5 h-5 text-white" />
            </button>
          </div>
          
          {/* Date Badge */}
          <div className="absolute bottom-4 left-4 px-3 py-2 bg-white rounded-xl text-center">
            <div className="text-sm font-bold text-red-500">{event.date.split(',')[0]}</div>
            <div className="text-xl font-bold text-gray-900">{event.date.split(' ')[1]}</div>
          </div>
        </div>
        
        {/* Content */}
        <ScrollArea className="max-h-[calc(90vh-14rem-5rem)]">
          <div className="p-4">
            <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {event.title}
            </h1>
            
            {/* Organizer */}
            <div className="flex items-center gap-3 mt-4">
              <Avatar className="w-10 h-10">
                <AvatarImage src={event.organizer.avatar} />
                <AvatarFallback className="bg-gradient-to-br from-purple-500 to-cyan-400 text-white">
                  {event.organizer.name[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-1">
                  <span className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {event.organizer.name}
                  </span>
                  {event.organizer.verified && (
                    <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
                      <span className="text-white text-xs">✓</span>
                    </div>
                  )}
                </div>
                <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Organizer
                </span>
              </div>
            </div>
            
            {/* Event Details */}
            <div className={`mt-6 p-4 rounded-xl ${isDark ? 'bg-[#242526]' : 'bg-gray-50'}`}>
              <div className="flex items-start gap-4 mb-4">
                <Calendar className={`w-5 h-5 flex-shrink-0 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                <div>
                  <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {event.date}
                  </p>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {event.time}
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-4 mb-4">
                <MapPin className={`w-5 h-5 flex-shrink-0 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                <div>
                  <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {event.location}
                  </p>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {event.address}
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <Ticket className={`w-5 h-5 flex-shrink-0 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                <div>
                  <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {event.price}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Attendees */}
            <div className="flex items-center gap-4 mt-4">
              <div className="flex -space-x-2">
                {[1, 2, 3, 4].map((i) => (
                  <Avatar key={i} className="w-8 h-8 border-2 border-white">
                    <AvatarFallback className="bg-gradient-to-br from-purple-500 to-cyan-400 text-white text-xs">
                      {i}
                    </AvatarFallback>
                  </Avatar>
                ))}
              </div>
              <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                {formatCount(event.going)} going · {formatCount(event.interested)} interested
              </span>
            </div>
            
            {/* Description */}
            <div className="mt-6">
              <h3 className={`font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                About
              </h3>
              <p className={isDark ? 'text-gray-300' : 'text-gray-600'}>
                {event.description}
              </p>
            </div>
          </div>
        </ScrollArea>
        
        {/* Action Buttons */}
        <div className={`p-4 border-t ${isDark ? 'border-[#3a3b3c]' : 'border-gray-200'} flex gap-3`}>
          <Button
            onClick={() => onStatusChange?.(event.id, 'interested')}
            variant={event.userStatus === 'interested' ? 'default' : 'outline'}
            className={`flex-1 ${event.userStatus === 'interested' ? 'bg-purple-500' : ''}`}
          >
            <Star className={`w-4 h-4 mr-2 ${event.userStatus === 'interested' ? 'fill-current' : ''}`} />
            Interested
          </Button>
          <Button
            onClick={() => onStatusChange?.(event.id, 'going')}
            className={`flex-1 ${
              event.userStatus === 'going' 
                ? 'bg-gradient-to-r from-purple-600 to-cyan-500' 
                : 'bg-gradient-to-r from-purple-600 to-cyan-500'
            } text-white`}
          >
            <Check className="w-4 h-4 mr-2" />
            {event.userStatus === 'going' ? "You're Going!" : 'Going'}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Main Events Component
export default function FacebookEvents({ isDark }) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('discover');
  const [activeCategory, setActiveCategory] = useState('all');
  const [events, setEvents] = useState(SAMPLE_EVENTS);
  const [selectedEvent, setSelectedEvent] = useState(null);

  const handleStatusChange = (eventId, status) => {
    haptic.medium();
    setEvents(prev => prev.map(e => 
      e.id === eventId 
        ? { ...e, userStatus: e.userStatus === status ? null : status }
        : e
    ));
    toast.success(status === 'going' ? "You're going!" : 'Marked as interested');
  };

  const handleSave = (eventId) => {
    haptic.light();
    setEvents(prev => prev.map(e => 
      e.id === eventId ? { ...e, saved: !e.saved } : e
    ));
  };

  const yourEvents = events.filter(e => e.userStatus);
  const filteredEvents = events.filter(e => 
    activeCategory === 'all' || e.category === activeCategory
  );

  return (
    <div className={`min-h-screen ${isDark ? 'bg-[#18191a]' : 'bg-gray-100'}`}>
      {/* Header */}
      <div className={`sticky top-0 z-40 ${isDark ? 'bg-[#242526]' : 'bg-white'} border-b ${isDark ? 'border-[#3a3b3c]' : 'border-gray-200'}`}>
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Events
          </h1>
          <div className="flex items-center gap-2">
            <button className={`p-2 rounded-full ${isDark ? 'bg-[#3a3b3c]' : 'bg-gray-100'}`}>
              <Search className={`w-5 h-5 ${isDark ? 'text-gray-200' : 'text-gray-700'}`} />
            </button>
            <button className={`p-2 rounded-full ${isDark ? 'bg-[#3a3b3c]' : 'bg-gray-100'}`}>
              <Plus className={`w-5 h-5 ${isDark ? 'text-gray-200' : 'text-gray-700'}`} />
            </button>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="flex px-4 gap-2 pb-3">
          {[
            { id: 'discover', label: 'Discover' },
            { id: 'your', label: 'Your Events' },
            { id: 'calendar', label: 'Calendar' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-purple-600 to-cyan-500 text-white'
                  : isDark ? 'bg-[#3a3b3c] text-gray-200' : 'bg-gray-100 text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <ScrollArea className="h-[calc(100vh-140px)]">
        {activeTab === 'discover' && (
          <div className="p-4">
            {/* Categories */}
            <ScrollArea className="w-full mb-4">
              <div className="flex gap-2">
                {EVENT_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm whitespace-nowrap ${
                      activeCategory === cat.id
                        ? 'bg-purple-500/20 text-purple-500 border border-purple-500'
                        : isDark ? 'bg-[#3a3b3c] text-gray-200' : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    <cat.icon className="w-4 h-4" />
                    {cat.label}
                  </button>
                ))}
              </div>
            </ScrollArea>
            
            {/* Events Grid */}
            <h2 className={`text-lg font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Upcoming Events
            </h2>
            <div className="grid grid-cols-1 gap-4">
              {filteredEvents.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  isDark={isDark}
                  onClick={setSelectedEvent}
                  onStatusChange={handleStatusChange}
                  onSave={handleSave}
                />
              ))}
            </div>
          </div>
        )}

        {activeTab === 'your' && (
          <div className="p-4">
            {yourEvents.length > 0 ? (
              <>
                <h2 className={`text-lg font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Your Upcoming Events
                </h2>
                <div className="space-y-3">
                  {yourEvents.map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      isDark={isDark}
                      onClick={setSelectedEvent}
                      onStatusChange={handleStatusChange}
                      onSave={handleSave}
                      compact
                    />
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <Calendar className={`w-12 h-12 mx-auto mb-3 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
                <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>
                  No events yet
                </p>
                <Button
                  onClick={() => setActiveTab('discover')}
                  className="mt-4 bg-gradient-to-r from-purple-600 to-cyan-500 text-white"
                >
                  Discover Events
                </Button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'calendar' && (
          <div className="p-4">
            <div className="text-center py-12">
              <Calendar className={`w-12 h-12 mx-auto mb-3 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
              <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>
                Calendar view coming soon
              </p>
            </div>
          </div>
        )}
      </ScrollArea>

      {/* Create Event FAB */}
      <div className="fixed bottom-24 right-4 z-50">
        <Button className="rounded-full w-14 h-14 bg-gradient-to-r from-purple-600 to-cyan-500 shadow-lg">
          <Plus className="w-6 h-6 text-white" />
        </Button>
      </div>

      {/* Event Detail Modal */}
      <AnimatePresence>
        {selectedEvent && (
          <EventDetailModal
            event={selectedEvent}
            isOpen={!!selectedEvent}
            onClose={() => setSelectedEvent(null)}
            isDark={isDark}
            onStatusChange={handleStatusChange}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export { EventCard, EventDetailModal, EVENT_CATEGORIES };
