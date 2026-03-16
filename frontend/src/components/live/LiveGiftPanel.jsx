import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart, Star, Flame, Diamond, Rocket, Crown, Gift,
  Sparkles, PartyPopper, Gem, Zap, Music, Coffee, Pizza,
  Beer, Flower2, Car, Plane, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { haptic } from "@/utils/mobile";

// Gift categories
const GIFT_CATEGORIES = [
  { id: "popular", name: "Popular", icon: "🔥" },
  { id: "love", name: "Love", icon: "❤️" },
  { id: "fun", name: "Fun", icon: "🎉" },
  { id: "premium", name: "Premium", icon: "💎" },
  { id: "vip", name: "VIP", icon: "👑" },
];

// All available gifts
const GIFTS = {
  popular: [
    { id: "heart", icon: Heart, name: "Heart", coins: 1, color: "#FF3366" },
    { id: "star", icon: Star, name: "Star", coins: 5, color: "#FFD700" },
    { id: "fire", icon: Flame, name: "Fire", coins: 10, color: "#FF9500" },
    { id: "sparkle", icon: Sparkles, name: "Sparkle", coins: 15, color: "#00F0FF" },
    { id: "party", icon: PartyPopper, name: "Party", coins: 20, color: "#7000FF" },
  ],
  love: [
    { id: "heart_big", icon: Heart, name: "Big Heart", coins: 50, color: "#FF3366", scale: 1.5 },
    { id: "rose", icon: Flower2, name: "Rose", coins: 30, color: "#FF1493" },
    { id: "kiss", emoji: "💋", name: "Kiss", coins: 25 },
    { id: "cupid", emoji: "💘", name: "Cupid", coins: 40 },
    { id: "love_letter", emoji: "💌", name: "Love Letter", coins: 35 },
  ],
  fun: [
    { id: "pizza", icon: Pizza, name: "Pizza", coins: 20, color: "#FF6B35" },
    { id: "coffee", icon: Coffee, name: "Coffee", coins: 15, color: "#8B4513" },
    { id: "beer", icon: Beer, name: "Cheers", coins: 25, color: "#FFA500" },
    { id: "music_note", icon: Music, name: "Music", coins: 20, color: "#1DB954" },
    { id: "zap", icon: Zap, name: "Energy", coins: 30, color: "#FFD700" },
  ],
  premium: [
    { id: "diamond", icon: Diamond, name: "Diamond", coins: 100, color: "#00F0FF" },
    { id: "gem", icon: Gem, name: "Gem", coins: 150, color: "#9F7AEA" },
    { id: "rocket", icon: Rocket, name: "Rocket", coins: 200, color: "#7000FF" },
    { id: "car", icon: Car, name: "Sports Car", coins: 500, color: "#FF0000" },
    { id: "plane", icon: Plane, name: "Private Jet", coins: 1000, color: "#4169E1" },
  ],
  vip: [
    { id: "crown", icon: Crown, name: "Crown", coins: 2000, color: "#FFD700" },
    { id: "castle", emoji: "🏰", name: "Castle", coins: 5000 },
    { id: "yacht", emoji: "🛥️", name: "Yacht", coins: 10000 },
    { id: "planet", emoji: "🪐", name: "Planet", coins: 50000 },
    { id: "universe", emoji: "🌌", name: "Universe", coins: 100000 },
  ],
};

// Gift animation presets
const GIFT_ANIMATIONS = {
  heart: { rotate: [0, 10, -10, 0], scale: [1, 1.2, 1] },
  star: { rotate: [0, 180, 360], scale: [1, 1.3, 1] },
  fire: { y: [0, -10, 0], scale: [1, 1.2, 1] },
  rocket: { y: [0, -50, -100], opacity: [1, 1, 0] },
  diamond: { rotate: [0, 360], scale: [1, 1.5, 1] },
};

export default function LiveGiftPanel({ 
  isOpen, 
  onClose, 
  onSendGift,
  userCoins = 1000 // User's coin balance
}) {
  const [selectedCategory, setSelectedCategory] = useState("popular");
  const [selectedGift, setSelectedGift] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [sending, setSending] = useState(false);

  const handleSendGift = async () => {
    if (!selectedGift) return;
    
    const totalCost = selectedGift.coins * quantity;
    if (totalCost > userCoins) {
      toast.error("Not enough coins!");
      return;
    }
    
    setSending(true);
    haptic.success();
    
    try {
      await onSendGift?.({
        gift: selectedGift,
        quantity,
        totalCost
      });
      
      toast.success(`Sent ${quantity}x ${selectedGift.name}!`);
      setSelectedGift(null);
      setQuantity(1);
      onClose();
    } catch (error) {
      toast.error("Failed to send gift");
    } finally {
      setSending(false);
    }
  };

  const GiftIcon = ({ gift, size = "w-8 h-8" }) => {
    if (gift.emoji) {
      return <span className="text-3xl">{gift.emoji}</span>;
    }
    const Icon = gift.icon;
    return <Icon className={size} style={{ color: gift.color }} />;
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="absolute bottom-0 left-0 right-0 bg-[#0A0A0A] rounded-t-3xl max-h-[70vh] overflow-hidden"
        >
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-12 h-1 bg-white/20 rounded-full" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-4 pb-3">
            <div>
              <h2 className="text-lg font-bold text-white">Send a Gift</h2>
              <p className="text-sm text-gray-400">
                Balance: <span className="text-[#FFD700] font-bold">{userCoins.toLocaleString()}</span> coins
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="text-gray-400">
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Category Tabs */}
          <ScrollArea className="w-full border-b border-white/5">
            <div className="flex gap-2 px-4 pb-3">
              {GIFT_CATEGORIES.map((cat) => (
                <Button
                  key={cat.id}
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`rounded-full whitespace-nowrap ${
                    selectedCategory === cat.id 
                      ? 'bg-[#00F0FF]/20 text-[#00F0FF]' 
                      : 'text-gray-400'
                  }`}
                >
                  <span className="mr-2">{cat.icon}</span>
                  {cat.name}
                </Button>
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>

          {/* Gifts Grid */}
          <ScrollArea className="h-[250px] p-4">
            <div className="grid grid-cols-4 gap-3">
              {GIFTS[selectedCategory]?.map((gift) => (
                <motion.button
                  key={gift.id}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setSelectedGift(gift);
                    haptic.light();
                  }}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl ${
                    selectedGift?.id === gift.id 
                      ? 'bg-[#00F0FF]/20 border border-[#00F0FF]' 
                      : 'bg-white/5'
                  }`}
                >
                  <motion.div
                    animate={selectedGift?.id === gift.id ? GIFT_ANIMATIONS[gift.id] || { scale: [1, 1.1, 1] } : {}}
                    transition={{ duration: 0.5, repeat: selectedGift?.id === gift.id ? Infinity : 0 }}
                  >
                    <GiftIcon gift={gift} />
                  </motion.div>
                  <span className="text-[10px] text-white">{gift.name}</span>
                  <span className="text-[10px] text-[#FFD700] font-bold">{gift.coins}</span>
                </motion.button>
              ))}
            </div>
          </ScrollArea>

          {/* Quantity Selector & Send Button */}
          {selectedGift && (
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="p-4 border-t border-white/10"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <GiftIcon gift={selectedGift} size="w-6 h-6" />
                  <span className="text-white font-medium">{selectedGift.name}</span>
                </div>
                
                {/* Quantity Buttons */}
                <div className="flex items-center gap-2">
                  {[1, 5, 10, 50, 100].map((q) => (
                    <Button
                      key={q}
                      size="sm"
                      variant="ghost"
                      onClick={() => setQuantity(q)}
                      className={`rounded-full min-w-[40px] ${
                        quantity === q 
                          ? 'bg-[#00F0FF] text-black' 
                          : 'bg-white/10 text-white'
                      }`}
                    >
                      {q}
                    </Button>
                  ))}
                </div>
              </div>
              
              <Button
                onClick={handleSendGift}
                disabled={sending || (selectedGift.coins * quantity) > userCoins}
                className="w-full bg-gradient-to-r from-[#FFD700] to-[#FF9500] hover:opacity-90 py-6 text-black font-bold"
              >
                <Gift className="w-5 h-5 mr-2" />
                Send {quantity}x for {(selectedGift.coins * quantity).toLocaleString()} coins
              </Button>
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// Gift Animation Component (for displaying received gifts)
export function GiftAnimation({ gift, quantity, fromUsername, onComplete }) {
  const GiftIcon = gift.emoji ? (
    <span className="text-6xl">{gift.emoji}</span>
  ) : (
    <gift.icon className="w-16 h-16" style={{ color: gift.color }} />
  );

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ duration: 0.5 }}
      onAnimationComplete={() => setTimeout(onComplete, 3000)}
      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50"
    >
      <div className="flex flex-col items-center gap-3 p-8 rounded-3xl bg-black/80 backdrop-blur-xl border border-white/20">
        <motion.div
          animate={{ 
            rotate: [0, 15, -15, 0], 
            scale: [1, 1.2, 1],
            y: [0, -10, 0]
          }}
          transition={{ duration: 0.5, repeat: 3 }}
        >
          {GiftIcon}
        </motion.div>
        
        <div className="text-center">
          <p className="text-white font-bold text-lg">{fromUsername}</p>
          <p className="text-gray-400">
            sent <span className="text-[#FFD700] font-bold">{quantity}x {gift.name}</span>
          </p>
        </div>
        
        {/* Sparkle effects */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 1, repeat: 3 }}
        >
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 bg-[#FFD700] rounded-full"
              style={{
                top: `${20 + Math.random() * 60}%`,
                left: `${20 + Math.random() * 60}%`,
              }}
              animate={{
                scale: [0, 1, 0],
                opacity: [0, 1, 0],
              }}
              transition={{
                duration: 0.8,
                delay: i * 0.1,
                repeat: 3,
              }}
            />
          ))}
        </motion.div>
      </div>
    </motion.div>
  );
}
