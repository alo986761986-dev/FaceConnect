import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Search, Filter, MapPin, Grid, List, Heart, MessageCircle,
  Share2, Bookmark, MoreHorizontal, Plus, Camera, X,
  Car, Home, Smartphone, Shirt, Sofa, Baby, Dumbbell,
  ShoppingBag, Tag, DollarSign, ChevronRight
} from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { useSettings } from "@/context/SettingsContext";
import BottomNav from "@/components/BottomNav";
import FacebookMarketplace from "@/components/facebook/FacebookMarketplace";
import { MarketplaceSkeleton } from "@/components/skeletons";

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Marketplace Page - uses the comprehensive FacebookMarketplace component  
export default function Marketplace() {
  const { user, token } = useAuth();
  const { isDark } = useSettings();

  return (
    <div className="min-h-screen pb-20">
      <FacebookMarketplace isDark={isDark} />
      <BottomNav />
    </div>
  );
}

// Keep legacy code below for reference
const CATEGORIES = [
  { id: "all", label: "All", icon: Grid },
  { id: "vehicles", label: "Vehicles", icon: Car },
  { id: "property", label: "Property", icon: Home },
  { id: "electronics", label: "Electronics", icon: Smartphone },
  { id: "clothing", label: "Clothing", icon: Shirt },
  { id: "furniture", label: "Furniture", icon: Sofa },
  { id: "family", label: "Family", icon: Baby },
  { id: "sports", label: "Sports", icon: Dumbbell },
];

function MarketplaceLegacy() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState("all");
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState("grid");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedListing, setSelectedListing] = useState(null);

  const fetchListings = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        token,
        page: '1',
        limit: '20'
      });
      if (activeCategory !== 'all') params.append('category', activeCategory);
      if (searchQuery) params.append('search', searchQuery);
      
      const res = await fetch(`${API_URL}/api/marketplace/listings?${params}`);
      if (res.ok) {
        const data = await res.json();
        const listingData = data.listings || [];
        // Use mock data if API returns empty
        setListings(listingData.length > 0 ? listingData : generateMockListings());
      } else {
        // API error - use mock data
        setListings(generateMockListings());
      }
    } catch (err) {
      console.error("Failed to fetch listings:", err);
      setListings(generateMockListings());
    } finally {
      setLoading(false);
    }
  }, [token, activeCategory, searchQuery]);

  // Fetch categories from API
  const [categories, setCategories] = useState(CATEGORIES);
  
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch(`${API_URL}/api/marketplace/categories?token=${token}`);
        if (res.ok) {
          const data = await res.json();
          if (data.categories?.length > 0) {
            const iconMap = {
              grid: Grid,
              car: Car,
              home: Home,
              smartphone: Smartphone,
              sofa: Sofa,
              shirt: Shirt,
              "gamepad-2": Dumbbell,
              dumbbell: Dumbbell,
              book: ShoppingBag,
              "paw-print": Baby,
              gift: Tag,
            };
            setCategories(data.categories.map(cat => ({
              id: cat.id,
              label: cat.name,
              icon: iconMap[cat.icon] || Grid
            })));
          }
        }
      } catch (err) {
        console.error("Failed to fetch categories:", err);
      }
    };
    if (token) fetchCategories();
  }, [token]);

  const handleSaveListing = async (listingId) => {
    try {
      const res = await fetch(`${API_URL}/api/marketplace/listings/${listingId}/save?token=${token}`, {
        method: 'POST'
      });
      if (res.ok) {
        const data = await res.json();
        setListings(prev => prev.map(l => 
          l.id === listingId ? { ...l, is_saved: data.saved } : l
        ));
      }
    } catch (err) {
      console.error("Failed to save listing:", err);
    }
  };

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  const generateMockListings = () => {
    const items = [
      { title: "iPhone 14 Pro Max", price: 899, category: "electronics", image: "https://picsum.photos/400/400?random=1" },
      { title: "2020 Tesla Model 3", price: 35000, category: "vehicles", image: "https://picsum.photos/400/400?random=2" },
      { title: "Modern Sofa Set", price: 1200, category: "furniture", image: "https://picsum.photos/400/400?random=3" },
      { title: "Nike Air Jordan 1", price: 180, category: "clothing", image: "https://picsum.photos/400/400?random=4" },
      { title: "MacBook Pro M2", price: 1999, category: "electronics", image: "https://picsum.photos/400/400?random=5" },
      { title: "3BR Apartment", price: 2500, category: "property", image: "https://picsum.photos/400/400?random=6" },
      { title: "Baby Stroller", price: 150, category: "family", image: "https://picsum.photos/400/400?random=7" },
      { title: "Mountain Bike", price: 450, category: "sports", image: "https://picsum.photos/400/400?random=8" },
    ];
    
    return items.map((item, i) => ({
      id: `listing-${i}`,
      ...item,
      description: `Great condition ${item.title}. Contact for more details.`,
      location: ["New York, NY", "Los Angeles, CA", "Chicago, IL", "Miami, FL"][i % 4],
      user: {
        id: `user-${i}`,
        username: `seller${i}`,
        display_name: `Seller ${i + 1}`,
        avatar: null
      },
      created_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      is_saved: false,
      views: Math.floor(Math.random() * 500)
    }));
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(price);
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[var(--bg-primary)]/95 backdrop-blur-lg border-b border-white/5">
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Marketplace</h1>
          <div className="flex items-center gap-2">
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

        {/* Search Bar */}
        <div className="px-4 pb-3 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            <Input
              placeholder="Search marketplace..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white/5 border-white/10 rounded-full"
            />
          </div>
          <Button variant="outline" size="icon" className="rounded-full border-white/10">
            <Filter className="w-4 h-4" />
          </Button>
          <Button 
            variant="outline" 
            size="icon" 
            className="rounded-full border-white/10"
            onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
          >
            {viewMode === "grid" ? <List className="w-4 h-4" /> : <Grid className="w-4 h-4" />}
          </Button>
        </div>

        {/* Categories */}
        <div className="flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-hide">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl min-w-[70px] transition-all ${
                activeCategory === cat.id
                  ? "bg-[var(--primary)] text-white"
                  : "bg-white/5 text-[var(--text-secondary)] hover:bg-white/10"
              }`}
            >
              <cat.icon className="w-5 h-5" />
              <span className="text-xs font-medium">{cat.label}</span>
            </button>
          ))}
        </div>
      </header>

      {/* Listings */}
      <div className="p-4">
        {loading ? (
          <MarketplaceSkeleton />
        ) : (
          <div className={viewMode === "grid" ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4" : "space-y-4"}>
            {listings.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                viewMode={viewMode}
                formatPrice={formatPrice}
                onClick={() => setSelectedListing(listing)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Listing Detail Modal */}
      <AnimatePresence>
        {selectedListing && (
          <ListingDetail
            listing={selectedListing}
            onClose={() => setSelectedListing(null)}
            formatPrice={formatPrice}
          />
        )}
      </AnimatePresence>

      {/* Create Listing Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <CreateListingModal onClose={() => setShowCreateModal(false)} />
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
}

function ListingCard({ listing, viewMode, formatPrice, onClick }) {
  const [isSaved, setIsSaved] = useState(listing.is_saved);

  if (viewMode === "list") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex gap-4 p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
        onClick={onClick}
      >
        <div className="w-32 h-32 rounded-lg overflow-hidden flex-shrink-0">
          <img src={listing.image} alt={listing.title} className="w-full h-full object-cover" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-[var(--text-primary)] truncate">{listing.title}</h3>
          <p className="text-lg font-bold text-[var(--primary)] mt-1">{formatPrice(listing.price)}</p>
          <div className="flex items-center gap-1 text-sm text-[var(--text-muted)] mt-2">
            <MapPin className="w-3 h-3" />
            <span>{listing.location}</span>
          </div>
          <p className="text-sm text-[var(--text-muted)] mt-1">{getTimeAgo(listing.created_at)}</p>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); setIsSaved(!isSaved); }}
          className="p-2 self-start"
        >
          <Bookmark className={`w-5 h-5 ${isSaved ? 'fill-[var(--primary)] text-[var(--primary)]' : 'text-[var(--text-muted)]'}`} />
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="group cursor-pointer"
      onClick={onClick}
    >
      <div className="relative aspect-square rounded-xl overflow-hidden bg-white/5">
        <img
          src={listing.image}
          alt={listing.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <button
          onClick={(e) => { e.stopPropagation(); setIsSaved(!isSaved); }}
          className="absolute top-2 right-2 p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
        >
          <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-white text-white' : 'text-white'}`} />
        </button>
      </div>
      <div className="mt-2">
        <p className="text-lg font-bold text-[var(--primary)]">{formatPrice(listing.price)}</p>
        <h3 className="font-medium text-[var(--text-primary)] truncate">{listing.title}</h3>
        <div className="flex items-center gap-1 text-xs text-[var(--text-muted)] mt-1">
          <MapPin className="w-3 h-3" />
          <span className="truncate">{listing.location}</span>
        </div>
      </div>
    </motion.div>
  );
}

function ListingDetail({ listing, onClose, formatPrice }) {
  const navigate = useNavigate();
  const [isSaved, setIsSaved] = useState(listing.is_saved);

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
        {/* Image */}
        <div className="relative aspect-square">
          <img src={listing.image} alt={listing.title} className="w-full h-full object-cover" />
          <button
            onClick={onClose}
            className="absolute top-4 left-4 p-2 rounded-full bg-black/50"
          >
            <X className="w-5 h-5 text-white" />
          </button>
          <button
            onClick={() => setIsSaved(!isSaved)}
            className="absolute top-4 right-4 p-2 rounded-full bg-black/50"
          >
            <Bookmark className={`w-5 h-5 ${isSaved ? 'fill-white text-white' : 'text-white'}`} />
          </button>
        </div>

        {/* Details */}
        <div className="p-4">
          <p className="text-2xl font-bold text-[var(--primary)]">{formatPrice(listing.price)}</p>
          <h2 className="text-xl font-semibold text-[var(--text-primary)] mt-1">{listing.title}</h2>
          
          <div className="flex items-center gap-2 text-sm text-[var(--text-muted)] mt-2">
            <MapPin className="w-4 h-4" />
            <span>{listing.location}</span>
            <span>•</span>
            <span>{getTimeAgo(listing.created_at)}</span>
          </div>

          <p className="text-[var(--text-secondary)] mt-4">{listing.description}</p>

          {/* Seller */}
          <div className="flex items-center gap-3 mt-6 p-3 bg-white/5 rounded-xl">
            <Avatar className="w-12 h-12">
              <AvatarFallback className="bg-gradient-to-br from-[var(--primary)] to-[var(--accent-purple)] text-white">
                {listing.user.username?.[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-semibold text-[var(--text-primary)]">{listing.user.display_name}</p>
              <p className="text-sm text-[var(--text-muted)]">@{listing.user.username}</p>
            </div>
            <ChevronRight className="w-5 h-5 text-[var(--text-muted)]" />
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-6">
            <Button className="flex-1 bg-[var(--primary)] hover:bg-[var(--primary-hover)]">
              <MessageCircle className="w-4 h-4 mr-2" />
              Message
            </Button>
            <Button variant="outline" className="flex-1 border-white/10">
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function CreateListingModal({ onClose }) {
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("electronics");
  const [description, setDescription] = useState("");

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
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Create Listing</h2>
          <button onClick={onClose}>
            <X className="w-5 h-5 text-[var(--text-muted)]" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Image upload */}
          <div className="aspect-video bg-white/5 rounded-xl flex flex-col items-center justify-center border-2 border-dashed border-white/20 cursor-pointer hover:border-[var(--primary)] transition-colors">
            <Camera className="w-10 h-10 text-[var(--text-muted)] mb-2" />
            <p className="text-[var(--text-muted)]">Add Photos</p>
          </div>

          <Input
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="bg-white/5 border-white/10"
          />

          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            <Input
              placeholder="Price"
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="pl-10 bg-white/5 border-white/10"
            />
          </div>

          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full p-3 bg-white/5 border border-white/10 rounded-lg text-[var(--text-primary)]"
          >
            {CATEGORIES.filter(c => c.id !== "all").map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.label}</option>
            ))}
          </select>

          <textarea
            placeholder="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="w-full p-3 bg-white/5 border border-white/10 rounded-lg text-[var(--text-primary)] resize-none"
          />

          <Button className="w-full bg-[var(--primary)] hover:bg-[var(--primary-hover)]">
            Post Listing
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function getTimeAgo(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);
  
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return `${Math.floor(seconds / 604800)}w ago`;
}
