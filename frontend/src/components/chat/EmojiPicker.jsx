import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Search, Clock, Smile, Heart, ThumbsUp, PartyPopper, Flame, Star, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { haptic } from "@/utils/mobile";

// Emoji categories
const EMOJI_CATEGORIES = {
  recent: { icon: Clock, label: "Recent", emojis: [] },
  smileys: {
    icon: Smile,
    label: "Smileys",
    emojis: ["😀", "😃", "😄", "😁", "😆", "😅", "🤣", "😂", "🙂", "🙃", "😉", "😊", "😇", "🥰", "😍", "🤩", "😘", "😗", "☺️", "😚", "😙", "🥲", "😋", "😛", "😜", "🤪", "😝", "🤑", "🤗", "🤭", "🤫", "🤔", "🤐", "🤨", "😐", "😑", "😶", "😏", "😒", "🙄", "😬", "😮‍💨", "🤥", "😌", "😔", "😪", "🤤", "😴", "😷", "🤒", "🤕", "🤢", "🤮", "🤧", "🥵", "🥶", "🥴", "😵", "🤯", "🤠", "🥳", "🥸", "😎", "🤓", "🧐", "😕", "😟", "🙁", "☹️", "😮", "😯", "😲", "😳", "🥺", "😦", "😧", "😨", "😰", "😥", "😢", "😭", "😱", "😖", "😣", "😞", "😓", "😩", "😫", "🥱", "😤", "😡", "😠", "🤬", "😈", "👿", "💀", "☠️", "💩", "🤡", "👹", "👺", "👻", "👽", "👾", "🤖"]
  },
  love: {
    icon: Heart,
    label: "Love",
    emojis: ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝", "💟", "♥️", "💋", "💌", "💐", "🌹", "🥀", "💑", "👩‍❤️‍👨", "👨‍❤️‍👨", "👩‍❤️‍👩", "💏", "👩‍❤️‍💋‍👨", "💒", "🏩"]
  },
  gestures: {
    icon: ThumbsUp,
    label: "Gestures",
    emojis: ["👍", "👎", "👊", "✊", "🤛", "🤜", "👏", "🙌", "👐", "🤲", "🤝", "🙏", "✍️", "💅", "🤳", "💪", "🦾", "🦿", "🦵", "🦶", "👂", "🦻", "👃", "🧠", "🫀", "🫁", "🦷", "🦴", "👀", "👁️", "👅", "👄", "👋", "🤚", "🖐️", "✋", "🖖", "👌", "🤌", "🤏", "✌️", "🤞", "🤟", "🤘", "🤙", "👈", "👉", "👆", "🖕", "👇", "☝️", "👍🏻", "👍🏼", "👍🏽", "👍🏾", "👍🏿"]
  },
  celebration: {
    icon: PartyPopper,
    label: "Celebration",
    emojis: ["🎉", "🎊", "🎈", "🎁", "🎀", "🎂", "🍰", "🧁", "🎃", "🎄", "🎆", "🎇", "🧨", "✨", "🎋", "🎍", "🎎", "🎏", "🎐", "🎑", "🪅", "🪆", "🎗️", "🎟️", "🎫", "🏆", "🏅", "🥇", "🥈", "🥉", "⚽", "🏀", "🏈", "⚾", "🎾", "🎳", "🎮", "🎰", "🎲"]
  },
  nature: {
    icon: Flame,
    label: "Nature",
    emojis: ["🔥", "💥", "💫", "💦", "💨", "🌈", "☀️", "🌤️", "⛅", "🌥️", "☁️", "🌦️", "🌧️", "⛈️", "🌩️", "🌨️", "❄️", "☃️", "⛄", "🌬️", "💨", "🌪️", "🌫️", "🌊", "💧", "💦", "☔", "🌸", "💮", "🏵️", "🌹", "🥀", "🌺", "🌻", "🌼", "🌷", "🌱", "🪴", "🌲", "🌳", "🌴", "🌵", "🌾", "🌿", "☘️", "🍀", "🍁", "🍂", "🍃", "🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯", "🦁", "🐮", "🐷", "🐸", "🐵"]
  },
  food: {
    icon: Star,
    label: "Food",
    emojis: ["🍕", "🍔", "🍟", "🌭", "🥪", "🌮", "🌯", "🫔", "🥙", "🧆", "🥚", "🍳", "🥘", "🍲", "🫕", "🥣", "🥗", "🍿", "🧈", "🧂", "🥫", "🍱", "🍘", "🍙", "🍚", "🍛", "🍜", "🍝", "🍠", "🍢", "🍣", "🍤", "🍥", "🥮", "🍡", "🥟", "🥠", "🥡", "🦀", "🦞", "🦐", "🦑", "🦪", "🍦", "🍧", "🍨", "🍩", "🍪", "🎂", "🍰", "🧁", "🥧", "🍫", "🍬", "🍭", "🍮", "🍯", "🍼", "🥛", "☕", "🫖", "🍵", "🍶", "🍾", "🍷", "🍸", "🍹", "🍺", "🍻", "🥂", "🥃"]
  },
  objects: {
    icon: Sparkles,
    label: "Objects",
    emojis: ["💎", "💍", "👑", "👒", "🎩", "🧢", "👓", "🕶️", "🥽", "🌂", "💼", "👜", "👝", "🎒", "👞", "👟", "🥾", "🥿", "👠", "👡", "🩴", "👢", "👗", "👔", "👕", "👖", "🧣", "🧤", "🧥", "🧦", "👙", "👘", "🥻", "🩱", "🩲", "🩳", "⌚", "📱", "💻", "⌨️", "🖥️", "🖨️", "🖱️", "💿", "📀", "📷", "📹", "🎥", "📞", "☎️", "📺", "📻", "🎙️", "🎚️", "🎛️", "⏰", "⏱️", "⏲️", "🕰️", "🔋", "🔌", "💡", "🔦", "🕯️"]
  }
};

// Popular GIFs (using GIPHY trending)
const POPULAR_GIFS = [
  { id: "1", url: "https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif", title: "Thumbs Up" },
  { id: "2", url: "https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif", title: "Applause" },
  { id: "3", url: "https://media.giphy.com/media/3oriO0OEd9QIDdllqo/giphy.gif", title: "Excited" },
  { id: "4", url: "https://media.giphy.com/media/xT9IgG50Fb7Mi0prBC/giphy.gif", title: "Party" },
  { id: "5", url: "https://media.giphy.com/media/l4q8cJzGdR9J8w3hS/giphy.gif", title: "Love" },
  { id: "6", url: "https://media.giphy.com/media/l0HlvtIPzPdt2usKs/giphy.gif", title: "Mind Blown" },
  { id: "7", url: "https://media.giphy.com/media/3o7TKU8RvQuomFfUUU/giphy.gif", title: "Thinking" },
  { id: "8", url: "https://media.giphy.com/media/l41lGvinEgARjB2HC/giphy.gif", title: "Dancing" },
];

// Sticker packs
const STICKER_PACKS = [
  {
    id: "reactions",
    name: "Reactions",
    stickers: [
      { id: "r1", url: "https://media.giphy.com/media/3o7TKsQ8UwVFTYWyPK/giphy.gif" },
      { id: "r2", url: "https://media.giphy.com/media/l4q8gHsCDRGTR0MfK/giphy.gif" },
      { id: "r3", url: "https://media.giphy.com/media/3o6Zt6KHxJTbXCnSvu/giphy.gif" },
      { id: "r4", url: "https://media.giphy.com/media/3og0INyCmHlNylks9O/giphy.gif" },
    ]
  },
  {
    id: "cute",
    name: "Cute",
    stickers: [
      { id: "c1", url: "https://media.giphy.com/media/ICOgUNjpvO0PC/giphy.gif" },
      { id: "c2", url: "https://media.giphy.com/media/3oEduSbSGpGaRX2Vri/giphy.gif" },
      { id: "c3", url: "https://media.giphy.com/media/l0HlxJMw7rkPTN8sg/giphy.gif" },
      { id: "c4", url: "https://media.giphy.com/media/3oEdv4hwWTzBhWvaU0/giphy.gif" },
    ]
  }
];

export default function EmojiPicker({ isOpen, onClose, onSelect, isDark = true }) {
  const [activeTab, setActiveTab] = useState("emojis");
  const [searchQuery, setSearchQuery] = useState("");
  const [recentEmojis, setRecentEmojis] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("smileys");

  // Load recent emojis from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("recent_emojis");
    if (saved) {
      try {
        setRecentEmojis(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);

  const handleEmojiSelect = (emoji) => {
    haptic.light();
    
    // Add to recent
    const updated = [emoji, ...recentEmojis.filter(e => e !== emoji)].slice(0, 24);
    setRecentEmojis(updated);
    localStorage.setItem("recent_emojis", JSON.stringify(updated));
    
    onSelect({ type: "emoji", content: emoji });
  };

  const handleGifSelect = (gif) => {
    haptic.medium();
    onSelect({ type: "gif", content: gif.url, title: gif.title });
  };

  const handleStickerSelect = (sticker) => {
    haptic.medium();
    onSelect({ type: "sticker", content: sticker.url });
  };

  // Filter emojis based on search
  const filteredEmojis = searchQuery
    ? Object.values(EMOJI_CATEGORIES).flatMap(cat => 
        cat.emojis.filter(e => e.includes(searchQuery))
      )
    : [];

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className={`absolute bottom-full left-0 right-0 mb-2 rounded-2xl border overflow-hidden z-50 ${
          isDark ? 'bg-[#1A1A1A] border-white/10' : 'bg-white border-gray-200'
        }`}
        style={{ height: "350px" }}
        data-testid="emoji-picker"
      >
        {/* Header with Tabs */}
        <div className={`border-b ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full justify-start bg-transparent gap-0 p-0">
              <TabsTrigger 
                value="emojis" 
                className={`flex-1 rounded-none border-b-2 ${activeTab === 'emojis' ? 'border-[#00F0FF]' : 'border-transparent'}`}
              >
                😀 Emojis
              </TabsTrigger>
              <TabsTrigger 
                value="stickers"
                className={`flex-1 rounded-none border-b-2 ${activeTab === 'stickers' ? 'border-[#00F0FF]' : 'border-transparent'}`}
              >
                🎨 Stickers
              </TabsTrigger>
              <TabsTrigger 
                value="gifs"
                className={`flex-1 rounded-none border-b-2 ${activeTab === 'gifs' ? 'border-[#00F0FF]' : 'border-transparent'}`}
              >
                🎬 GIFs
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Search */}
        <div className="p-2">
          <div className="relative">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className={`pl-9 ${isDark ? 'bg-[#0A0A0A] border-white/10 text-white' : 'bg-gray-50 border-gray-200'}`}
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden" style={{ height: "240px" }}>
          {activeTab === "emojis" && (
            <div className="flex h-full">
              {/* Category sidebar */}
              <div className={`w-12 border-r flex flex-col py-2 ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                {recentEmojis.length > 0 && (
                  <button
                    onClick={() => setSelectedCategory("recent")}
                    className={`p-2 mx-1 rounded-lg transition-colors ${
                      selectedCategory === "recent" 
                        ? 'bg-[#00F0FF]/20' 
                        : isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'
                    }`}
                  >
                    <Clock className="w-5 h-5 text-gray-400" />
                  </button>
                )}
                {Object.entries(EMOJI_CATEGORIES).filter(([k]) => k !== 'recent').map(([key, cat]) => (
                  <button
                    key={key}
                    onClick={() => setSelectedCategory(key)}
                    className={`p-2 mx-1 rounded-lg transition-colors ${
                      selectedCategory === key 
                        ? 'bg-[#00F0FF]/20' 
                        : isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'
                    }`}
                  >
                    <cat.icon className={`w-5 h-5 ${selectedCategory === key ? 'text-[#00F0FF]' : 'text-gray-400'}`} />
                  </button>
                ))}
              </div>

              {/* Emoji grid */}
              <ScrollArea className="flex-1 h-full">
                <div className="p-2">
                  {searchQuery ? (
                    <div className="grid grid-cols-8 gap-1">
                      {filteredEmojis.map((emoji, i) => (
                        <button
                          key={i}
                          onClick={() => handleEmojiSelect(emoji)}
                          className={`p-2 text-2xl rounded-lg transition-colors ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  ) : selectedCategory === "recent" ? (
                    <div className="grid grid-cols-8 gap-1">
                      {recentEmojis.map((emoji, i) => (
                        <button
                          key={i}
                          onClick={() => handleEmojiSelect(emoji)}
                          className={`p-2 text-2xl rounded-lg transition-colors ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-8 gap-1">
                      {EMOJI_CATEGORIES[selectedCategory]?.emojis.map((emoji, i) => (
                        <button
                          key={i}
                          onClick={() => handleEmojiSelect(emoji)}
                          className={`p-2 text-2xl rounded-lg transition-colors ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          )}

          {activeTab === "stickers" && (
            <ScrollArea className="h-full">
              <div className="p-2 space-y-4">
                {STICKER_PACKS.map(pack => (
                  <div key={pack.id}>
                    <h4 className={`text-sm font-medium mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      {pack.name}
                    </h4>
                    <div className="grid grid-cols-4 gap-2">
                      {pack.stickers.map(sticker => (
                        <button
                          key={sticker.id}
                          onClick={() => handleStickerSelect(sticker)}
                          className={`aspect-square rounded-xl overflow-hidden ${isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-gray-100 hover:bg-gray-200'}`}
                        >
                          <img src={sticker.url} alt="" className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}

          {activeTab === "gifs" && (
            <ScrollArea className="h-full">
              <div className="p-2">
                <div className="grid grid-cols-2 gap-2">
                  {POPULAR_GIFS.map(gif => (
                    <button
                      key={gif.id}
                      onClick={() => handleGifSelect(gif)}
                      className="aspect-video rounded-xl overflow-hidden"
                    >
                      <img src={gif.url} alt={gif.title} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            </ScrollArea>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
