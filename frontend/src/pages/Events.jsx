import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Calendar, Clock, MapPin, Users, Plus, Search, Bell,
  ChevronLeft, ChevronRight, MoreHorizontal, X, Star,
  Share2, Bookmark, Check, UserPlus
} from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { useSettings } from "@/context/SettingsContext";
import BottomNav from "@/components/BottomNav";
import FacebookEvents from "@/components/facebook/FacebookEvents";
import { EventsSkeleton } from "@/components/skeletons";

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Events Page - uses the comprehensive FacebookEvents component
export default function Events() {
  const { user, token } = useAuth();
  const { isDark } = useSettings();

  return (
    <div className="min-h-screen pb-20">
      <FacebookEvents isDark={isDark} />
      <BottomNav />
    </div>
  );
}

// Keep legacy code below for reference
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function EventsLegacy() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("upcoming");
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/events`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events || data || []);
      }
    } catch (err) {
      console.error("Failed to fetch events:", err);
      setEvents(generateMockEvents());
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const generateMockEvents = () => {
    const eventTemplates = [
      { title: "Tech Meetup 2024", category: "Technology", location: "San Francisco, CA" },
      { title: "Live Concert Night", category: "Music", location: "Los Angeles, CA" },
      { title: "Art Exhibition Opening", category: "Art", location: "New York, NY" },
      { title: "Fitness Bootcamp", category: "Sports", location: "Miami, FL" },
      { title: "Food Festival", category: "Food", location: "Chicago, IL" },
      { title: "Photography Workshop", category: "Education", location: "Seattle, WA" },
    ];

    return eventTemplates.map((template, i) => {
      const date = new Date();
      date.setDate(date.getDate() + Math.floor(Math.random() * 30));
      date.setHours(10 + Math.floor(Math.random() * 10));
      
      return {
        id: `event-${i}`,
        ...template,
        description: `Join us for an amazing ${template.category.toLowerCase()} event! Great opportunity to network and learn.`,
        date: date.toISOString(),
        end_date: new Date(date.getTime() + 3 * 60 * 60 * 1000).toISOString(),
        cover: `https://picsum.photos/800/400?random=${i + 20}`,
        host: {
          username: `host${i}`,
          display_name: `Event Host ${i + 1}`,
          avatar: null
        },
        attendees: Math.floor(Math.random() * 500) + 50,
        interested: Math.floor(Math.random() * 1000) + 100,
        is_online: Math.random() > 0.7,
        is_free: Math.random() > 0.5,
        price: Math.random() > 0.5 ? Math.floor(Math.random() * 100) + 10 : 0,
        is_going: false,
        is_interested: false
      };
    });
  };

  const getCalendarDays = () => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPadding = firstDay.getDay();
    
    const days = [];
    
    // Previous month padding
    for (let i = startPadding - 1; i >= 0; i--) {
      const d = new Date(year, month, -i);
      days.push({ date: d, isCurrentMonth: false });
    }
    
    // Current month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const d = new Date(year, month, i);
      days.push({ date: d, isCurrentMonth: true });
    }
    
    // Next month padding
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      days.push({ date: d, isCurrentMonth: false });
    }
    
    return days;
  };

  const hasEventOnDate = (date) => {
    return events.some(e => {
      const eventDate = new Date(e.date);
      return eventDate.toDateString() === date.toDateString();
    });
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[var(--bg-primary)]/95 backdrop-blur-lg border-b border-white/5">
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Events</h1>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="rounded-full">
              <Search className="w-5 h-5" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="rounded-full"
              onClick={() => setShowCreateModal(true)}
            >
              <Plus className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-4 pb-3">
          {[
            { id: "upcoming", label: "Upcoming" },
            { id: "calendar", label: "Calendar" },
            { id: "your-events", label: "Your Events" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2 px-4 rounded-full text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? "bg-[var(--primary)] text-white"
                  : "bg-white/5 text-[var(--text-secondary)] hover:bg-white/10"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      {/* Content */}
      <div className="p-4">
        {activeTab === "calendar" && (
          <div className="mb-6">
            {/* Month Navigation */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1))}
                className="p-2 hover:bg-white/10 rounded-full"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                {MONTHS[selectedDate.getMonth()]} {selectedDate.getFullYear()}
              </h2>
              <button
                onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1))}
                className="p-2 hover:bg-white/10 rounded-full"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1">
              {DAYS.map(day => (
                <div key={day} className="text-center text-xs text-[var(--text-muted)] py-2">
                  {day}
                </div>
              ))}
              {getCalendarDays().map((day, i) => {
                const isToday = day.date.toDateString() === new Date().toDateString();
                const hasEvent = hasEventOnDate(day.date);
                
                return (
                  <button
                    key={i}
                    className={`aspect-square flex flex-col items-center justify-center rounded-lg text-sm transition-colors ${
                      !day.isCurrentMonth ? 'text-[var(--text-muted)]/50' :
                      isToday ? 'bg-[var(--primary)] text-white' :
                      'text-[var(--text-primary)] hover:bg-white/10'
                    }`}
                  >
                    <span>{day.date.getDate()}</span>
                    {hasEvent && (
                      <div className={`w-1 h-1 rounded-full mt-0.5 ${isToday ? 'bg-white' : 'bg-[var(--primary)]'}`} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Events List */}
        {loading ? (
          <EventsSkeleton />
        ) : (
          <div className="space-y-4">
            {(activeTab === "your-events" 
              ? events.filter(e => e.is_going || e.is_interested) 
              : events
            ).map((event) => (
              <EventCard
                key={event.id}
                event={event}
                onClick={() => setSelectedEvent(event)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Event Detail Modal */}
      <AnimatePresence>
        {selectedEvent && (
          <EventDetail
            event={selectedEvent}
            onClose={() => setSelectedEvent(null)}
          />
        )}
      </AnimatePresence>

      {/* Create Event Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <CreateEventModal onClose={() => setShowCreateModal(false)} />
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
}

function EventCard({ event, onClick }) {
  const [isInterested, setIsInterested] = useState(event.is_interested);
  const [isGoing, setIsGoing] = useState(event.is_going);
  const eventDate = new Date(event.date);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/5 rounded-xl overflow-hidden hover:bg-white/10 transition-colors cursor-pointer"
      onClick={onClick}
    >
      {/* Cover */}
      <div className="relative h-40">
        <img src={event.cover} alt="" className="w-full h-full object-cover" />
        <div className="absolute top-3 left-3 bg-white rounded-lg px-2 py-1 text-center">
          <p className="text-xs font-bold text-[var(--primary)]">{MONTHS[eventDate.getMonth()].slice(0, 3).toUpperCase()}</p>
          <p className="text-lg font-bold text-gray-900">{eventDate.getDate()}</p>
        </div>
        {event.is_online && (
          <div className="absolute top-3 right-3 px-2 py-1 bg-[var(--primary)] rounded-full">
            <span className="text-xs font-medium text-white">Online</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-[var(--primary)] font-medium uppercase">
              {eventDate.toLocaleDateString('en-US', { weekday: 'short' })} at {eventDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
            </p>
            <h3 className="font-semibold text-[var(--text-primary)] mt-1 truncate">{event.title}</h3>
            <div className="flex items-center gap-1 text-sm text-[var(--text-muted)] mt-1">
              <MapPin className="w-3 h-3" />
              <span className="truncate">{event.location}</span>
            </div>
            <div className="flex items-center gap-1 text-sm text-[var(--text-muted)] mt-1">
              <Users className="w-3 h-3" />
              <span>{event.attendees} going · {event.interested} interested</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-3" onClick={(e) => e.stopPropagation()}>
          <Button
            size="sm"
            variant={isGoing ? "default" : "outline"}
            className={`flex-1 ${isGoing ? 'bg-[var(--primary)]' : 'border-white/10'}`}
            onClick={() => { setIsGoing(!isGoing); setIsInterested(false); }}
          >
            {isGoing ? <Check className="w-4 h-4 mr-1" /> : null}
            Going
          </Button>
          <Button
            size="sm"
            variant={isInterested ? "default" : "outline"}
            className={`flex-1 ${isInterested ? 'bg-[var(--accent-purple)]' : 'border-white/10'}`}
            onClick={() => { setIsInterested(!isInterested); setIsGoing(false); }}
          >
            {isInterested ? <Star className="w-4 h-4 mr-1 fill-current" /> : <Star className="w-4 h-4 mr-1" />}
            Interested
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

function EventDetail({ event, onClose }) {
  const eventDate = new Date(event.date);
  const endDate = new Date(event.end_date);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/80 flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        className="w-full max-w-lg bg-[var(--bg-primary)] rounded-t-3xl sm:rounded-3xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cover */}
        <div className="relative h-48">
          <img src={event.cover} alt="" className="w-full h-full object-cover" />
          <button
            onClick={onClose}
            className="absolute top-4 left-4 p-2 rounded-full bg-black/50"
          >
            <X className="w-5 h-5 text-white" />
          </button>
          <button className="absolute top-4 right-4 p-2 rounded-full bg-black/50">
            <Share2 className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Info */}
        <div className="p-4">
          <p className="text-sm text-[var(--primary)] font-medium">
            {eventDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
          <h2 className="text-xl font-bold text-[var(--text-primary)] mt-1">{event.title}</h2>
          
          <div className="flex items-center gap-2 mt-4">
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-[var(--text-muted)]" />
            </div>
            <div>
              <p className="text-[var(--text-primary)]">
                {eventDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} - {endDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
              </p>
              <p className="text-sm text-[var(--text-muted)]">{eventDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-3">
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-[var(--text-muted)]" />
            </div>
            <div>
              <p className="text-[var(--text-primary)]">{event.is_online ? "Online Event" : event.location}</p>
              {!event.is_online && <p className="text-sm text-[var(--text-muted)]">View map</p>}
            </div>
          </div>

          <p className="text-[var(--text-secondary)] mt-4">{event.description}</p>

          {/* Host */}
          <div className="flex items-center gap-3 mt-6 p-3 bg-white/5 rounded-xl">
            <Avatar className="w-10 h-10">
              <AvatarFallback className="bg-gradient-to-br from-[var(--primary)] to-[var(--accent-purple)] text-white">
                {event.host.username?.[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="text-sm text-[var(--text-muted)]">Hosted by</p>
              <p className="font-semibold text-[var(--text-primary)]">{event.host.display_name}</p>
            </div>
          </div>

          {/* Price */}
          {!event.is_free && (
            <div className="mt-4 p-3 bg-white/5 rounded-xl">
              <p className="text-sm text-[var(--text-muted)]">Ticket price</p>
              <p className="text-xl font-bold text-[var(--primary)]">${event.price}</p>
            </div>
          )}

          <div className="flex gap-3 mt-6">
            <Button className="flex-1 bg-[var(--primary)]">
              <Check className="w-4 h-4 mr-2" />
              Going
            </Button>
            <Button variant="outline" className="flex-1 border-white/10">
              <Star className="w-4 h-4 mr-2" />
              Interested
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function CreateEventModal({ onClose }) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [isOnline, setIsOnline] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/80 flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        className="w-full max-w-lg bg-[var(--bg-primary)] rounded-t-3xl sm:rounded-3xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Create Event</h2>
          <button onClick={onClose}>
            <X className="w-5 h-5 text-[var(--text-muted)]" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <Input
            placeholder="Event name"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="bg-white/5 border-white/10"
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-white/5 border-white/10"
            />
            <Input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="bg-white/5 border-white/10"
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
            <span className="text-[var(--text-primary)]">Online event</span>
            <button
              onClick={() => setIsOnline(!isOnline)}
              className={`w-12 h-6 rounded-full transition-colors ${isOnline ? 'bg-[var(--primary)]' : 'bg-white/20'}`}
            >
              <div className={`w-5 h-5 rounded-full bg-white transition-transform ${isOnline ? 'translate-x-6' : 'translate-x-0.5'}`} />
            </button>
          </div>

          {!isOnline && (
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
              <Input
                placeholder="Location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="pl-10 bg-white/5 border-white/10"
              />
            </div>
          )}

          <textarea
            placeholder="Description"
            rows={3}
            className="w-full p-3 bg-white/5 border border-white/10 rounded-lg text-[var(--text-primary)] resize-none"
          />

          <Button className="w-full bg-[var(--primary)]">
            Create Event
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
