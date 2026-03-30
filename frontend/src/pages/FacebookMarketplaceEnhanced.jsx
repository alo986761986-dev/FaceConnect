/**
 * Enhanced Facebook Marketplace - Italian Style
 * Matches Facebook's Italian Marketplace design with all features
 */
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Search, Plus, X, ChevronRight, ChevronDown, Menu,
  MapPin, Heart, Share2, MessageCircle, MoreHorizontal, Filter,
  Grid, Car, Home, Smartphone, Shirt, Sofa, Bike, Package,
  Briefcase, Baby, Music, Camera, Gamepad2, Book, Dumbbell, Gem,
  Tag, Clock, Eye, Star, Bell, User, Settings, ShoppingBag,
  ArrowLeft, Truck, Shield, CreditCard, Image as ImageIcon, Send
} from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import BottomNav from "@/components/BottomNav";

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Italian Marketplace Categories
const CATEGORIES = [
  { id: 'all', icon: Grid, label: 'Tutto', labelIt: 'Tutto' },
  { id: 'vehicles', icon: Car, label: 'Veicoli', labelIt: 'Veicoli' },
  { id: 'property', icon: Home, label: 'Immobili', labelIt: 'Immobili' },
  { id: 'electronics', icon: Smartphone, label: 'Elettronica', labelIt: 'Elettronica' },
  { id: 'clothing', icon: Shirt, label: 'Abbigliamento', labelIt: 'Abbigliamento' },
  { id: 'furniture', icon: Sofa, label: 'Casa e giardino', labelIt: 'Casa e giardino' },
  { id: 'sports', icon: Bike, label: 'Sport', labelIt: 'Sport' },
  { id: 'jobs', icon: Briefcase, label: 'Lavoro', labelIt: 'Lavoro' },
  { id: 'family', icon: Baby, label: 'Famiglia', labelIt: 'Famiglia' },
  { id: 'hobbies', icon: Music, label: 'Hobby', labelIt: 'Hobby' },
  { id: 'gaming', icon: Gamepad2, label: 'Gaming', labelIt: 'Gaming' },
];

// Sample Italian Listings
const SAMPLE_LISTINGS_IT = [
  {
    id: '1',
    title: 'Samsung s23 256gb',
    price: 230,
    currency: 'EUR',
    location: 'Napoli',
    images: ['https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=400&h=400&fit=crop'],
    seller: { name: 'Marco R.', avatar: null, rating: 4.9, verified: true },
    category: 'electronics',
    condition: 'Come nuovo',
    listed: '2 ore fa',
    saved: false,
    views: 234
  },
  {
    id: '2',
    title: 'Vivo x300 pro 16 512',
    price: 1,
    currency: 'EUR',
    location: 'Napoli',
    images: ['https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&h=400&fit=crop'],
    seller: { name: 'Giuseppe L.', avatar: null, rating: 4.8, verified: false },
    category: 'electronics',
    condition: 'Nuovo',
    listed: '5 ore fa',
    saved: false,
    views: 567
  },
  {
    id: '3',
    title: 'Microsoft surface laptop',
    price: 200,
    currency: 'EUR',
    location: 'Napoli',
    images: ['https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=400&h=400&fit=crop'],
    seller: { name: 'Anna M.', avatar: null, rating: 4.7, verified: true },
    category: 'electronics',
    condition: 'Usato - Buono',
    listed: '1 giorno fa',
    saved: true,
    views: 890
  },
  {
    id: '4',
    title: '2010 Mercedes-Benz Classe B',
    price: 600,
    currency: 'EUR',
    location: 'Napoli',
    images: ['https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=400&h=400&fit=crop'],
    seller: { name: 'Francesco D.', avatar: null, rating: 5.0, verified: true },
    category: 'vehicles',
    condition: 'Usato',
    listed: '3 giorni fa',
    saved: false,
    views: 1234
  },
  {
    id: '5',
    title: 'Vespa Primavera 125',
    price: 2500,
    currency: 'EUR',
    location: 'Napoli',
    images: ['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop'],
    seller: { name: 'Luca B.', avatar: null, rating: 4.6, verified: false },
    category: 'vehicles',
    condition: 'Ottimo',
    listed: '1 settimana fa',
    saved: false,
    views: 456
  },
  {
    id: '6',
    title: 'Lavatrice Samsung 8kg',
    price: 150,
    currency: 'EUR',
    location: 'Napoli',
    images: ['https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?w=400&h=400&fit=crop'],
    seller: { name: 'Maria G.', avatar: null, rating: 4.5, verified: false },
    category: 'furniture',
    condition: 'Usato - Funzionante',
    listed: '2 giorni fa',
    saved: false,
    views: 321
  },
  {
    id: '7',
    title: 'iPhone 14 Pro 128GB',
    price: 750,
    currency: 'EUR',
    location: 'Roma',
    images: ['https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=400&h=400&fit=crop'],
    seller: { name: 'Paolo V.', avatar: null, rating: 4.9, verified: true },
    category: 'electronics',
    condition: 'Come nuovo',
    listed: '4 ore fa',
    saved: false,
    views: 678
  },
  {
    id: '8',
    title: 'Divano angolare grigio',
    price: 400,
    currency: 'EUR',
    location: 'Milano',
    images: ['https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&h=400&fit=crop'],
    seller: { name: 'Sara T.', avatar: null, rating: 4.8, verified: false },
    category: 'furniture',
    condition: 'Ottimo',
    listed: '5 giorni fa',
    saved: true,
    views: 234
  },
];

export default function FacebookMarketplaceEnhanced() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('per-te');
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [showCreateListing, setShowCreateListing] = useState(false);
  const [selectedListing, setSelectedListing] = useState(null);
  const [savedListings, setSavedListings] = useState(new Set());
  const [userLocation, setUserLocation] = useState('Napoli');
  const [recentlyViewed, setRecentlyViewed] = useState(null);

  // Tabs matching Facebook Italian
  const tabs = [
    { id: 'vendi', label: 'Vendi' },
    { id: 'per-te', label: 'Per te' },
    { id: 'locale', label: 'Locale' },
    { id: 'altro', label: 'Altro', hasDropdown: true },
  ];

  const fetchListings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/marketplace/listings?token=${token}&limit=20`);
      if (res.ok) {
        const data = await res.json();
        setListings(data.listings?.length > 0 ? data.listings : SAMPLE_LISTINGS_IT);
      } else {
        setListings(SAMPLE_LISTINGS_IT);
      }
    } catch (error) {
      setListings(SAMPLE_LISTINGS_IT);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchListings();
    // Set a recently viewed item for "Novità per te"
    setRecentlyViewed({
      title: 'Samsung Galaxy Z Fold 3 — PER RICAMBI — Display OK',
      image: 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=100&h=100&fit=crop',
      count: 2
    });
  }, [activeTab, fetchListings]);

  const toggleSave = (listingId) => {
    setSavedListings(prev => {
      const newSet = new Set(prev);
      if (newSet.has(listingId)) {
        newSet.delete(listingId);
        toast.success("Rimosso dai salvati");
      } else {
        newSet.add(listingId);
        toast.success("Salvato");
      }
      return newSet;
    });
  };

  const handleListingClick = (listing) => {
    setSelectedListing(listing);
  };

  return (
    <div className="min-h-screen bg-white pb-20">
      {/* Facebook-style Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200">
        {/* Top Row */}
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button onClick={() => setShowMenu(true)} className="p-1">
              <Menu className="w-6 h-6 text-gray-800" />
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Marketplace</h1>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => navigate('/profile')}
              className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center"
            >
              <User className="w-5 h-5 text-gray-600" />
            </button>
            <button 
              onClick={() => {}}
              className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center"
            >
              <Search className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Tabs Row */}
        <div className="flex items-center gap-2 px-4 pb-3 overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap flex items-center gap-1 transition-colors ${
                activeTab === tab.id
                  ? 'bg-[#1877F2] text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {tab.label}
              {tab.hasDropdown && <ChevronDown className="w-4 h-4" />}
            </button>
          ))}
        </div>
      </div>

      {/* Recently Viewed Notification - "Novità per te" */}
      {recentlyViewed && activeTab === 'per-te' && (
        <div className="px-4 py-3 bg-white border-b border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-base font-semibold text-gray-900">Novità per te</h3>
            <button className="text-[#1877F2] text-sm font-medium">
              Mostra tutte ({recentlyViewed.count})
            </button>
          </div>
          <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
            <img 
              src={recentlyViewed.image}
              alt=""
              className="w-14 h-14 rounded-lg object-cover"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-700 line-clamp-2">
                L'articolo "{recentlyViewed.title}" che hai visualizzato è an...
              </p>
            </div>
            <button className="p-2">
              <MoreHorizontal className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>
      )}

      {/* Section Header - "Consigliati oggi" */}
      <div className="flex items-center justify-between px-4 py-3 bg-white">
        <h2 className="text-lg font-bold text-gray-900">Consigliati oggi</h2>
        <button className="flex items-center gap-1 text-[#1877F2] font-medium text-sm">
          <MapPin className="w-4 h-4" />
          {userLocation}
        </button>
      </div>

      {/* Listings Grid */}
      {loading ? (
        <div className="px-4 grid grid-cols-2 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-square bg-gray-200 rounded-lg mb-2" />
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-1" />
              <div className="h-3 bg-gray-200 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : (
        <div className="px-4 grid grid-cols-2 gap-3">
          {listings.map((listing) => (
            <motion.div
              key={listing.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-lg overflow-hidden"
              onClick={() => handleListingClick(listing)}
            >
              {/* Image Container */}
              <div className="relative aspect-square">
                <img
                  src={listing.images?.[0] || 'https://via.placeholder.com/400'}
                  alt={listing.title}
                  className="w-full h-full object-cover rounded-lg"
                />
                {/* Save button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSave(listing.id);
                  }}
                  className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 flex items-center justify-center shadow-sm"
                >
                  <Heart 
                    className={`w-5 h-5 ${
                      savedListings.has(listing.id) 
                        ? 'fill-red-500 text-red-500' 
                        : 'text-gray-600'
                    }`} 
                  />
                </button>
              </div>
              
              {/* Info */}
              <div className="py-2">
                <p className="text-base font-bold text-gray-900">
                  € {listing.price?.toLocaleString('it-IT')} · {listing.title?.length > 20 ? listing.title.slice(0, 20) + '...' : listing.title}
                </p>
                {listing.location && (
                  <p className="text-xs text-gray-500 mt-0.5">{listing.location}</p>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Floating Create Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setShowCreateListing(true)}
        className="fixed bottom-24 right-4 w-14 h-14 rounded-full bg-[#1877F2] text-white shadow-lg flex items-center justify-center z-30"
      >
        <Plus className="w-7 h-7" />
      </motion.button>

      {/* Bottom Navigation */}
      <BottomNav activeTab="marketplace" />

      {/* Menu Sidebar */}
      <AnimatePresence>
        {showMenu && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50"
              onClick={() => setShowMenu(false)}
            />
            <motion.div
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              className="fixed left-0 top-0 bottom-0 w-80 bg-white z-50 flex flex-col"
            >
              {/* Menu Header */}
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-xl font-bold">Menu Marketplace</h2>
                <button onClick={() => setShowMenu(false)}>
                  <X className="w-6 h-6 text-gray-500" />
                </button>
              </div>
              
              {/* Menu Items */}
              <div className="flex-1 p-2 overflow-y-auto">
                {[
                  { icon: ShoppingBag, label: 'I tuoi articoli', badge: null },
                  { icon: Heart, label: 'Salvati', badge: savedListings.size || null },
                  { icon: MessageCircle, label: 'Messaggi', badge: 3 },
                  { icon: Bell, label: 'Notifiche', badge: 5 },
                  { icon: Clock, label: 'Cronologia ricerche', badge: null },
                  { icon: Settings, label: 'Impostazioni', badge: null },
                ].map((item, i) => (
                  <button
                    key={i}
                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                      <item.icon className="w-5 h-5 text-gray-600" />
                    </div>
                    <span className="flex-1 text-left font-medium text-gray-800">{item.label}</span>
                    {item.badge && (
                      <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">
                        {item.badge}
                      </span>
                    )}
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </button>
                ))}
                
                {/* Categories Section */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h3 className="px-3 text-sm font-semibold text-gray-500 uppercase mb-2">
                    Categorie
                  </h3>
                  {CATEGORIES.slice(0, 8).map((cat, i) => (
                    <button
                      key={i}
                      className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <cat.icon className="w-5 h-5 text-gray-600" />
                      <span className="flex-1 text-left text-gray-800">{cat.labelIt}</span>
                    </button>
                  ))}
                </div>
              </div>
              
              {/* User Profile */}
              <div className="p-4 border-t border-gray-200">
                <div className="flex items-center gap-3">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={user?.avatar} />
                    <AvatarFallback className="bg-[#1877F2] text-white">
                      {user?.display_name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-gray-900">{user?.display_name || 'Utente'}</p>
                    <p className="text-sm text-gray-500">Visualizza il tuo profilo</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Create Listing Modal */}
      <AnimatePresence>
        {showCreateListing && (
          <CreateListingModal
            isOpen={showCreateListing}
            onClose={() => setShowCreateListing(false)}
            onCreated={(newListing) => {
              setListings([newListing, ...listings]);
              setShowCreateListing(false);
            }}
          />
        )}
      </AnimatePresence>

      {/* Listing Detail Modal */}
      <AnimatePresence>
        {selectedListing && (
          <ListingDetailModal
            listing={selectedListing}
            onClose={() => setSelectedListing(null)}
            isSaved={savedListings.has(selectedListing.id)}
            onToggleSave={() => toggleSave(selectedListing.id)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// Create Listing Modal
function CreateListingModal({ isOpen, onClose, onCreated }) {
  const { user, token } = useAuth();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    title: '',
    price: '',
    description: '',
    category: '',
    condition: 'used',
    location: 'Napoli',
    images: []
  });
  const [uploading, setUploading] = useState(false);

  const conditions = [
    { id: 'new', label: 'Nuovo' },
    { id: 'like_new', label: 'Come nuovo' },
    { id: 'good', label: 'Buone condizioni' },
    { id: 'fair', label: 'Condizioni accettabili' },
  ];

  const handleImageSelect = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    
    // Preview images
    const previews = files.map(file => URL.createObjectURL(file));
    setFormData(prev => ({
      ...prev,
      images: [...prev.images, ...previews].slice(0, 10)
    }));
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.price) {
      toast.error("Compila tutti i campi obbligatori");
      return;
    }

    setUploading(true);
    try {
      // Create listing
      const newListing = {
        id: Date.now().toString(),
        ...formData,
        price: parseFloat(formData.price),
        currency: 'EUR',
        images: formData.images.length > 0 ? formData.images : ['https://via.placeholder.com/400'],
        seller: {
          name: user?.display_name || 'Utente',
          avatar: user?.avatar,
          rating: 5.0,
          verified: false
        },
        listed: 'Adesso',
        views: 0,
        saved: false
      };

      onCreated(newListing);
      toast.success("Articolo pubblicato!");
    } catch (error) {
      toast.error("Errore durante la pubblicazione");
    } finally {
      setUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-[60] flex items-end justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        className="w-full max-w-lg bg-white rounded-t-2xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <button onClick={onClose}>
            <X className="w-6 h-6 text-gray-500" />
          </button>
          <h2 className="text-lg font-bold">Nuovo articolo</h2>
          <button
            onClick={handleSubmit}
            disabled={uploading || !formData.title || !formData.price}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold ${
              formData.title && formData.price
                ? 'bg-[#1877F2] text-white'
                : 'bg-gray-200 text-gray-400'
            }`}
          >
            {uploading ? '...' : 'Pubblica'}
          </button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Images */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Foto (fino a 10)
            </label>
            <div className="flex gap-2 flex-wrap">
              {formData.images.map((img, i) => (
                <div key={i} className="w-20 h-20 rounded-lg overflow-hidden relative">
                  <img src={img} alt="" className="w-full h-full object-cover" />
                  <button
                    onClick={() => setFormData(prev => ({
                      ...prev,
                      images: prev.images.filter((_, idx) => idx !== i)
                    }))}
                    className="absolute top-1 right-1 w-5 h-5 bg-black/50 rounded-full flex items-center justify-center"
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
              ))}
              {formData.images.length < 10 && (
                <label className="w-20 h-20 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-[#1877F2]">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleImageSelect}
                  />
                  <Camera className="w-6 h-6 text-gray-400" />
                </label>
              )}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Titolo *
            </label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Cosa stai vendendo?"
              className="bg-gray-100 border-0"
            />
          </div>

          {/* Price */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Prezzo *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">€</span>
              <Input
                type="number"
                value={formData.price}
                onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                placeholder="0"
                className="bg-gray-100 border-0 pl-8"
              />
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Categoria
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
              className="w-full p-3 bg-gray-100 rounded-lg border-0 text-gray-800"
            >
              <option value="">Seleziona categoria</option>
              {CATEGORIES.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.labelIt}</option>
              ))}
            </select>
          </div>

          {/* Condition */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Condizione
            </label>
            <div className="flex flex-wrap gap-2">
              {conditions.map(cond => (
                <button
                  key={cond.id}
                  onClick={() => setFormData(prev => ({ ...prev, condition: cond.id }))}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    formData.condition === cond.id
                      ? 'bg-[#1877F2] text-white'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {cond.label}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descrizione
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Descrivi il tuo articolo..."
              rows={4}
              className="w-full p-3 bg-gray-100 rounded-lg border-0 text-gray-800 resize-none"
            />
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Posizione
            </label>
            <div className="flex items-center gap-2 p-3 bg-gray-100 rounded-lg">
              <MapPin className="w-5 h-5 text-gray-500" />
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                className="flex-1 bg-transparent border-0 outline-none"
                placeholder="Inserisci città"
              />
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Listing Detail Modal
function ListingDetailModal({ listing, onClose, isSaved, onToggleSave }) {
  const navigate = useNavigate();
  const [currentImage, setCurrentImage] = useState(0);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-white z-[60] flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <button onClick={onClose}>
          <ArrowLeft className="w-6 h-6 text-gray-800" />
        </button>
        <div className="flex items-center gap-2">
          <button onClick={onToggleSave} className="p-2">
            <Heart className={`w-6 h-6 ${isSaved ? 'fill-red-500 text-red-500' : 'text-gray-600'}`} />
          </button>
          <button className="p-2">
            <Share2 className="w-6 h-6 text-gray-600" />
          </button>
          <button className="p-2">
            <MoreHorizontal className="w-6 h-6 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Images */}
        <div className="relative aspect-square bg-gray-100">
          <img
            src={listing.images?.[currentImage] || 'https://via.placeholder.com/400'}
            alt={listing.title}
            className="w-full h-full object-contain"
          />
          {listing.images?.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1">
              {listing.images.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentImage(i)}
                  className={`w-2 h-2 rounded-full ${i === currentImage ? 'bg-white' : 'bg-white/50'}`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-4">
          <h1 className="text-2xl font-bold text-gray-900">
            € {listing.price?.toLocaleString('it-IT')}
          </h1>
          <p className="text-lg text-gray-800 mt-1">{listing.title}</p>
          
          <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
            {listing.condition && <span>{listing.condition}</span>}
            {listing.listed && <span>Pubblicato {listing.listed}</span>}
          </div>

          {/* Seller */}
          <div className="flex items-center gap-3 mt-4 p-3 bg-gray-50 rounded-lg">
            <Avatar className="w-12 h-12">
              <AvatarImage src={listing.seller?.avatar} />
              <AvatarFallback className="bg-[#1877F2] text-white">
                {listing.seller?.name?.charAt(0) || 'V'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-semibold text-gray-900">{listing.seller?.name}</p>
              {listing.seller?.rating && (
                <div className="flex items-center gap-1 text-sm text-gray-500">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span>{listing.seller.rating}</span>
                  {listing.seller.verified && (
                    <span className="text-[#1877F2]">• Verificato</span>
                  )}
                </div>
              )}
            </div>
            <button className="px-4 py-2 bg-gray-200 rounded-full text-sm font-medium">
              Visualizza
            </button>
          </div>

          {/* Location */}
          {listing.location && (
            <div className="flex items-center gap-2 mt-4 text-gray-600">
              <MapPin className="w-5 h-5" />
              <span>{listing.location}</span>
            </div>
          )}

          {/* Description */}
          {listing.description && (
            <div className="mt-4">
              <h3 className="font-semibold text-gray-900 mb-2">Descrizione</h3>
              <p className="text-gray-600">{listing.description}</p>
            </div>
          )}

          {/* Stats */}
          <div className="flex items-center gap-4 mt-4 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <Eye className="w-4 h-4" />
              {listing.views || 0} visualizzazioni
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="p-4 border-t border-gray-200 flex gap-3">
        <Button
          variant="outline"
          className="flex-1 h-12 rounded-full"
          onClick={() => toast.info("Funzione in arrivo")}
        >
          <MessageCircle className="w-5 h-5 mr-2" />
          Messaggio
        </Button>
        <Button
          className="flex-1 h-12 rounded-full bg-[#1877F2] hover:bg-[#1877F2]/90"
          onClick={() => toast.success("Offerta inviata!")}
        >
          Fai un'offerta
        </Button>
      </div>
    </motion.div>
  );
}
