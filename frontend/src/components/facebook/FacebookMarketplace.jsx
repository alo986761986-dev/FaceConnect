/**
 * Facebook Marketplace Component for FaceConnect
 * Complete marketplace experience with listings, categories, and search
 */
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Search, Plus, X, ChevronRight, ChevronLeft, ChevronDown,
  MapPin, Heart, Share2, MessageCircle, MoreHorizontal, Filter,
  Grid, List, Car, Home, Smartphone, Shirt, Sofa, Bike, Package,
  Briefcase, Baby, Music, Camera, Gamepad2, Book, Dumbbell, Gem,
  Tag, Clock, Eye, Star, Truck, Shield, CreditCard, RefreshCw
} from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { useSettings } from "@/context/SettingsContext";
import { haptic } from "@/utils/mobile";

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Marketplace Categories
const MARKETPLACE_CATEGORIES = [
  { id: 'all', icon: Grid, label: 'Browse All', color: 'from-purple-500 to-cyan-500' },
  { id: 'vehicles', icon: Car, label: 'Vehicles', color: 'from-blue-500 to-blue-600' },
  { id: 'property', icon: Home, label: 'Property', color: 'from-green-500 to-green-600' },
  { id: 'electronics', icon: Smartphone, label: 'Electronics', color: 'from-purple-500 to-purple-600' },
  { id: 'clothing', icon: Shirt, label: 'Apparel', color: 'from-pink-500 to-pink-600' },
  { id: 'furniture', icon: Sofa, label: 'Furniture', color: 'from-amber-500 to-amber-600' },
  { id: 'sports', icon: Bike, label: 'Sports', color: 'from-cyan-500 to-cyan-600' },
  { id: 'jobs', icon: Briefcase, label: 'Jobs', color: 'from-indigo-500 to-indigo-600' },
  { id: 'family', icon: Baby, label: 'Family', color: 'from-rose-500 to-rose-600' },
  { id: 'hobbies', icon: Music, label: 'Hobbies', color: 'from-violet-500 to-violet-600' },
  { id: 'gaming', icon: Gamepad2, label: 'Gaming', color: 'from-red-500 to-red-600' },
  { id: 'books', icon: Book, label: 'Books', color: 'from-teal-500 to-teal-600' },
  { id: 'fitness', icon: Dumbbell, label: 'Fitness', color: 'from-orange-500 to-orange-600' },
  { id: 'jewelry', icon: Gem, label: 'Jewelry', color: 'from-yellow-500 to-yellow-600' },
];

// Sample Marketplace Listings
const SAMPLE_LISTINGS = [
  {
    id: '1',
    title: 'iPhone 15 Pro Max 256GB',
    price: 899,
    currency: 'USD',
    location: 'New York, NY',
    distance: '5 mi',
    images: ['https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=400'],
    seller: { name: 'Tech Store', avatar: null, rating: 4.9, verified: true },
    category: 'electronics',
    condition: 'Like New',
    listed: '2 hours ago',
    saved: false,
    views: 234,
    featured: true
  },
  {
    id: '2',
    title: '2022 Tesla Model 3 Long Range',
    price: 42000,
    currency: 'USD',
    location: 'Los Angeles, CA',
    distance: '12 mi',
    images: ['https://images.unsplash.com/photo-1560958089-b8a1929cea89?w=400'],
    seller: { name: 'Premium Auto', avatar: null, rating: 4.8, verified: true },
    category: 'vehicles',
    condition: 'Excellent',
    listed: '1 day ago',
    saved: true,
    views: 1234,
    featured: true
  },
  {
    id: '3',
    title: 'Modern Leather Sofa Set',
    price: 1200,
    currency: 'USD',
    location: 'Chicago, IL',
    distance: '3 mi',
    images: ['https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400'],
    seller: { name: 'Home Decor Plus', avatar: null, rating: 4.7, verified: false },
    category: 'furniture',
    condition: 'New',
    listed: '3 days ago',
    saved: false,
    views: 567
  },
  {
    id: '4',
    title: 'Nike Air Jordan 1 Retro High',
    price: 180,
    currency: 'USD',
    location: 'Miami, FL',
    distance: '8 mi',
    images: ['https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400'],
    seller: { name: 'Sneaker Head', avatar: null, rating: 4.6, verified: true },
    category: 'clothing',
    condition: 'New',
    listed: '5 hours ago',
    saved: false,
    views: 892
  },
  {
    id: '5',
    title: 'PlayStation 5 Digital Edition',
    price: 399,
    currency: 'USD',
    location: 'Seattle, WA',
    distance: '2 mi',
    images: ['https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=400'],
    seller: { name: 'Gamer Zone', avatar: null, rating: 4.9, verified: true },
    category: 'gaming',
    condition: 'Like New',
    listed: '6 hours ago',
    saved: true,
    views: 1567
  },
  {
    id: '6',
    title: 'Mountain Bike - Trek X-Caliber',
    price: 750,
    currency: 'USD',
    location: 'Denver, CO',
    distance: '15 mi',
    images: ['https://images.unsplash.com/photo-1576435728678-68d0fbf94e91?w=400'],
    seller: { name: 'Outdoor Adventures', avatar: null, rating: 4.5, verified: false },
    category: 'sports',
    condition: 'Good',
    listed: '2 days ago',
    saved: false,
    views: 345
  },
];

// Marketplace Header
function MarketplaceHeader({ isDark, onSearch, onFilter, searchQuery, setSearchQuery }) {
  return (
    <div className={`sticky top-0 z-40 ${isDark ? 'bg-[#242526]' : 'bg-white'} border-b ${isDark ? 'border-[#3a3b3c]' : 'border-gray-200'}`}>
      {/* Title Row */}
      <div className="flex items-center justify-between px-4 py-3">
        <h1 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Marketplace
        </h1>
        <div className="flex items-center gap-2">
          <button 
            onClick={onFilter}
            className={`p-2 rounded-full ${isDark ? 'bg-[#3a3b3c] hover:bg-[#4a4b4c]' : 'bg-gray-100 hover:bg-gray-200'}`}
          >
            <Filter className={`w-5 h-5 ${isDark ? 'text-gray-200' : 'text-gray-700'}`} />
          </button>
          <button className={`p-2 rounded-full ${isDark ? 'bg-[#3a3b3c] hover:bg-[#4a4b4c]' : 'bg-gray-100 hover:bg-gray-200'}`}>
            <Plus className={`w-5 h-5 ${isDark ? 'text-gray-200' : 'text-gray-700'}`} />
          </button>
        </div>
      </div>
      
      {/* Search Bar */}
      <div className="px-4 pb-3">
        <div className={`flex items-center gap-2 px-4 py-2.5 rounded-full ${isDark ? 'bg-[#3a3b3c]' : 'bg-gray-100'}`}>
          <Search className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
          <input
            type="text"
            placeholder="Search Marketplace"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`flex-1 bg-transparent outline-none ${isDark ? 'text-white placeholder-gray-400' : 'text-gray-900 placeholder-gray-500'}`}
          />
        </div>
      </div>
      
      {/* Quick Filters */}
      <div className="px-4 pb-3">
        <ScrollArea className="w-full">
          <div className="flex gap-2">
            {['All', 'Vehicles', 'Electronics', 'Clothing', 'Property', 'Free'].map((filter) => (
              <button
                key={filter}
                className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap ${
                  filter === 'All'
                    ? 'bg-gradient-to-r from-purple-600 to-cyan-500 text-white'
                    : isDark ? 'bg-[#3a3b3c] text-gray-200' : 'bg-gray-100 text-gray-700'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

// Category Grid
function CategoryGrid({ isDark, onSelectCategory }) {
  return (
    <div className={`${isDark ? 'bg-[#242526]' : 'bg-white'} p-4 mb-2`}>
      <h2 className={`text-lg font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
        Categories
      </h2>
      <div className="grid grid-cols-4 gap-3">
        {MARKETPLACE_CATEGORIES.slice(0, 8).map((cat) => (
          <button
            key={cat.id}
            onClick={() => onSelectCategory(cat.id)}
            className="flex flex-col items-center gap-1.5"
          >
            <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${cat.color} flex items-center justify-center`}>
              <cat.icon className="w-6 h-6 text-white" />
            </div>
            <span className={`text-xs text-center ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              {cat.label}
            </span>
          </button>
        ))}
      </div>
      
      {/* See All Button */}
      <button className={`w-full mt-4 py-2 rounded-lg text-sm font-medium ${
        isDark ? 'bg-[#3a3b3c] text-gray-200' : 'bg-gray-100 text-gray-700'
      }`}>
        See All Categories
      </button>
    </div>
  );
}

// Listing Card
function ListingCard({ listing, isDark, onSave, onClick }) {
  const [saved, setSaved] = useState(listing.saved);
  
  const handleSave = (e) => {
    e.stopPropagation();
    haptic.light();
    setSaved(!saved);
    onSave?.(listing.id, !saved);
    toast.success(saved ? 'Removed from saved' : 'Saved to your list');
  };
  
  const formatPrice = (price, currency) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      maximumFractionDigits: 0
    }).format(price);
  };

  return (
    <motion.button
      onClick={() => onClick?.(listing)}
      whileTap={{ scale: 0.98 }}
      className={`relative rounded-xl overflow-hidden ${isDark ? 'bg-[#242526]' : 'bg-white'} shadow-sm w-full text-left`}
    >
      {/* Image */}
      <div className="relative aspect-square">
        <img
          src={listing.images[0]}
          alt={listing.title}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.target.src = 'https://via.placeholder.com/400?text=No+Image';
          }}
        />
        
        {/* Featured Badge */}
        {listing.featured && (
          <div className="absolute top-2 left-2 px-2 py-0.5 bg-gradient-to-r from-purple-600 to-cyan-500 rounded text-xs font-medium text-white">
            Featured
          </div>
        )}
        
        {/* Save Button */}
        <button
          onClick={handleSave}
          className={`absolute top-2 right-2 p-2 rounded-full ${
            saved ? 'bg-purple-500' : isDark ? 'bg-black/50' : 'bg-white/80'
          }`}
        >
          <Heart className={`w-4 h-4 ${saved ? 'text-white fill-white' : isDark ? 'text-white' : 'text-gray-700'}`} />
        </button>
      </div>
      
      {/* Content */}
      <div className="p-3">
        <p className={`font-bold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>
          {formatPrice(listing.price, listing.currency)}
        </p>
        <p className={`text-sm truncate ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
          {listing.title}
        </p>
        <div className="flex items-center gap-1 mt-1">
          <MapPin className={`w-3 h-3 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
          <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            {listing.location} · {listing.distance}
          </span>
        </div>
        
        {/* Seller Info */}
        <div className="flex items-center gap-2 mt-2">
          <div className="flex items-center gap-1">
            {listing.seller.verified && (
              <Shield className="w-3 h-3 text-blue-500" />
            )}
            <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              {listing.seller.name}
            </span>
          </div>
          <div className="flex items-center gap-0.5">
            <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
            <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              {listing.seller.rating}
            </span>
          </div>
        </div>
      </div>
    </motion.button>
  );
}

// Listing Detail Modal
function ListingDetailModal({ listing, isOpen, onClose, isDark, user }) {
  if (!isOpen || !listing) return null;
  
  const formatPrice = (price, currency) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      maximumFractionDigits: 0
    }).format(price);
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
        {/* Image Carousel */}
        <div className="relative h-64">
          <img
            src={listing.images[0]}
            alt={listing.title}
            className="w-full h-full object-cover"
          />
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
              <Heart className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
        
        {/* Content */}
        <ScrollArea className="max-h-[calc(90vh-16rem)]">
          <div className="p-4">
            {/* Price & Title */}
            <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {formatPrice(listing.price, listing.currency)}
            </h2>
            <h3 className={`text-lg mt-1 ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
              {listing.title}
            </h3>
            
            {/* Location & Time */}
            <div className="flex items-center gap-4 mt-3">
              <div className="flex items-center gap-1">
                <MapPin className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  {listing.location}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  {listing.listed}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Eye className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  {listing.views} views
                </span>
              </div>
            </div>
            
            {/* Condition Badge */}
            <div className="flex gap-2 mt-4">
              <span className={`px-3 py-1 rounded-full text-sm ${
                isDark ? 'bg-[#3a3b3c] text-gray-200' : 'bg-gray-100 text-gray-700'
              }`}>
                {listing.condition}
              </span>
              <span className={`px-3 py-1 rounded-full text-sm ${
                isDark ? 'bg-[#3a3b3c] text-gray-200' : 'bg-gray-100 text-gray-700'
              }`}>
                {MARKETPLACE_CATEGORIES.find(c => c.id === listing.category)?.label || 'Other'}
              </span>
            </div>
            
            {/* Seller Info */}
            <div className={`mt-6 p-4 rounded-xl ${isDark ? 'bg-[#242526]' : 'bg-gray-50'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={listing.seller.avatar} />
                    <AvatarFallback className="bg-gradient-to-br from-purple-500 to-cyan-400 text-white">
                      {listing.seller.name[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-1">
                      <span className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {listing.seller.name}
                      </span>
                      {listing.seller.verified && (
                        <Shield className="w-4 h-4 text-blue-500" />
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                      <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        {listing.seller.rating} · Seller
                      </span>
                    </div>
                  </div>
                </div>
                <ChevronRight className={`w-5 h-5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
              </div>
            </div>
            
            {/* Safety Tips */}
            <div className={`mt-4 p-4 rounded-xl ${isDark ? 'bg-[#242526]' : 'bg-blue-50'}`}>
              <div className="flex items-start gap-3">
                <Shield className={`w-5 h-5 flex-shrink-0 ${isDark ? 'text-blue-400' : 'text-blue-500'}`} />
                <div>
                  <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Safety Tips
                  </p>
                  <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    Meet in a public place. Inspect items before paying. Use secure payment methods.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
        
        {/* Action Buttons */}
        <div className={`p-4 border-t ${isDark ? 'border-[#3a3b3c]' : 'border-gray-200'} flex gap-3`}>
          <Button
            variant="outline"
            className="flex-1"
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            Message
          </Button>
          <Button className="flex-1 bg-gradient-to-r from-purple-600 to-cyan-500 text-white">
            <CreditCard className="w-4 h-4 mr-2" />
            Buy Now
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Main Marketplace Component
export default function FacebookMarketplace({ isDark }) {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [listings, setListings] = useState(SAMPLE_LISTINGS);
  const [selectedListing, setSelectedListing] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const filteredListings = listings.filter(listing => {
    const matchesSearch = listing.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || listing.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className={`min-h-screen ${isDark ? 'bg-[#18191a]' : 'bg-gray-100'}`}>
      <MarketplaceHeader
        isDark={isDark}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onFilter={() => {}}
      />
      
      <ScrollArea className="h-[calc(100vh-180px)]">
        {/* Categories */}
        <CategoryGrid
          isDark={isDark}
          onSelectCategory={setSelectedCategory}
        />
        
        {/* Today's Picks */}
        <div className={`${isDark ? 'bg-[#242526]' : 'bg-white'} p-4 mb-2`}>
          <div className="flex items-center justify-between mb-3">
            <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Today's Picks
            </h2>
            <button className="flex items-center gap-1 text-purple-500 text-sm font-medium">
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
          
          {/* Listings Grid */}
          <div className="grid grid-cols-2 gap-3">
            {filteredListings.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                isDark={isDark}
                onClick={setSelectedListing}
                onSave={(id, saved) => {
                  setListings(prev => prev.map(l => l.id === id ? { ...l, saved } : l));
                }}
              />
            ))}
          </div>
          
          {filteredListings.length === 0 && (
            <div className="text-center py-12">
              <Package className={`w-12 h-12 mx-auto mb-3 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
              <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>
                No listings found
              </p>
            </div>
          )}
        </div>
        
        {/* Sell Button */}
        <div className="fixed bottom-24 right-4 z-50">
          <Button className="rounded-full w-14 h-14 bg-gradient-to-r from-purple-600 to-cyan-500 shadow-lg">
            <Plus className="w-6 h-6 text-white" />
          </Button>
        </div>
      </ScrollArea>
      
      {/* Listing Detail Modal */}
      <AnimatePresence>
        {selectedListing && (
          <ListingDetailModal
            listing={selectedListing}
            isOpen={!!selectedListing}
            onClose={() => setSelectedListing(null)}
            isDark={isDark}
            user={user}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export { MarketplaceHeader, CategoryGrid, ListingCard, MARKETPLACE_CATEGORIES };
