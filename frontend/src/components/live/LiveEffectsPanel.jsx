import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, Sticker, Music, Mic2, Volume2, ImageIcon, 
  LayoutGrid, X, Search, ChevronLeft, Wand2, Play, Pause,
  Download
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { haptic } from "@/utils/mobile";

// Effects categories
const EFFECT_CATEGORIES = [
  { id: "beauty", name: "Beauty", icon: "✨" },
  { id: "filters", name: "Filters", icon: "🎨" },
  { id: "ar", name: "AR", icon: "👓" },
  { id: "retouch", name: "Retouch", icon: "💄" },
];

// Available effects
const EFFECTS = {
  beauty: [
    { id: "smooth", name: "Smooth Skin", intensity: 0.5, icon: "✨" },
    { id: "brighten", name: "Brighten", intensity: 0.3, icon: "☀️" },
    { id: "slim_face", name: "Slim Face", intensity: 0.3, icon: "💎" },
    { id: "big_eyes", name: "Big Eyes", intensity: 0.2, icon: "👁️" },
    { id: "lipstick", name: "Lipstick", intensity: 0.5, icon: "💋" },
    { id: "blush", name: "Blush", intensity: 0.3, icon: "🌸" },
  ],
  filters: [
    { id: "warm", name: "Warm", preview: "linear-gradient(45deg, #ff9a56, #ffcd69)", icon: "🔥" },
    { id: "cool", name: "Cool", preview: "linear-gradient(45deg, #00d2ff, #928dab)", icon: "❄️" },
    { id: "vintage", name: "Vintage", preview: "linear-gradient(45deg, #c9a959, #8e7f6f)", icon: "📷" },
    { id: "noir", name: "Noir", preview: "linear-gradient(45deg, #333, #888)", icon: "🎬" },
    { id: "vivid", name: "Vivid", preview: "linear-gradient(45deg, #ff0084, #33001b)", icon: "🌈" },
    { id: "dreamy", name: "Dreamy", preview: "linear-gradient(45deg, #ffc3a0, #ffafbd)", icon: "💭" },
  ],
  ar: [
    { id: "glasses", name: "Glasses", icon: "👓" },
    { id: "bunny", name: "Bunny Ears", icon: "🐰" },
    { id: "cat", name: "Cat", icon: "🐱" },
    { id: "crown", name: "Crown", icon: "👑" },
    { id: "devil", name: "Devil", icon: "😈" },
    { id: "angel", name: "Angel", icon: "😇" },
  ],
  retouch: [
    { id: "teeth_whiten", name: "Whiten Teeth", intensity: 0.5, icon: "😁" },
    { id: "remove_blemish", name: "Remove Blemish", icon: "🩹" },
    { id: "reduce_shine", name: "Reduce Shine", intensity: 0.3, icon: "💫" },
    { id: "enhance_jaw", name: "Jawline", intensity: 0.2, icon: "💪" },
  ]
};

// Sticker categories
const STICKER_CATEGORIES = [
  { id: "trending", name: "Trending", icon: "🔥" },
  { id: "love", name: "Love", icon: "❤️" },
  { id: "fun", name: "Fun", icon: "😂" },
  { id: "animals", name: "Animals", icon: "🐶" },
  { id: "food", name: "Food", icon: "🍕" },
  { id: "celebration", name: "Party", icon: "🎉" },
];

const STICKERS = {
  trending: ["🔥", "💯", "✨", "💪", "🎯", "⚡", "🚀", "💎", "🏆", "🎵"],
  love: ["❤️", "💕", "💖", "💗", "💝", "😍", "🥰", "😘", "💋", "💌"],
  fun: ["😂", "🤣", "😜", "🤪", "😎", "🤩", "🥳", "🤯", "🙈", "🙉"],
  animals: ["🐶", "🐱", "🐰", "🦊", "🐻", "🐼", "🦁", "🐯", "🦄", "🐸"],
  food: ["🍕", "🍔", "🍟", "🌮", "🍩", "🍦", "🍪", "🧁", "☕", "🍺"],
  celebration: ["🎉", "🎊", "🎈", "🎁", "🎂", "🥂", "🍾", "🎆", "🎇", "✨"],
};

// Music tracks (mocked)
const MUSIC_TRACKS = [
  { id: "1", name: "Upbeat Energy", artist: "DJ Vibe", duration: "3:24", genre: "Electronic" },
  { id: "2", name: "Chill Waves", artist: "Relax Mode", duration: "4:12", genre: "Lo-Fi" },
  { id: "3", name: "Pop Hits Mix", artist: "Top Charts", duration: "3:45", genre: "Pop" },
  { id: "4", name: "Hip Hop Beats", artist: "Street Flow", duration: "2:58", genre: "Hip Hop" },
  { id: "5", name: "Acoustic Vibes", artist: "Guitar Soul", duration: "4:32", genre: "Acoustic" },
  { id: "6", name: "Dance Floor", artist: "Club Mix", duration: "3:15", genre: "Dance" },
];

// Voice effects
const VOICE_EFFECTS = [
  { id: "normal", name: "Normal", icon: "🎤" },
  { id: "deep", name: "Deep", icon: "🎸" },
  { id: "high", name: "High Pitch", icon: "🐭" },
  { id: "robot", name: "Robot", icon: "🤖" },
  { id: "echo", name: "Echo", icon: "🔊" },
  { id: "reverb", name: "Reverb", icon: "🏛️" },
  { id: "chipmunk", name: "Chipmunk", icon: "🐿️" },
  { id: "monster", name: "Monster", icon: "👹" },
];

// Sound effects
const SOUND_EFFECTS = [
  { id: "applause", name: "Applause", icon: "👏" },
  { id: "airhorn", name: "Air Horn", icon: "📯" },
  { id: "drumroll", name: "Drum Roll", icon: "🥁" },
  { id: "crickets", name: "Crickets", icon: "🦗" },
  { id: "laugh", name: "Laugh Track", icon: "😂" },
  { id: "boing", name: "Boing", icon: "🎾" },
  { id: "tada", name: "Ta-da!", icon: "🎉" },
  { id: "woosh", name: "Woosh", icon: "💨" },
];

// Virtual backgrounds
const BACKGROUNDS = [
  { id: "none", name: "None", preview: null },
  { id: "blur", name: "Blur", preview: "blur" },
  { id: "beach", name: "Beach", preview: "🏖️" },
  { id: "office", name: "Office", preview: "🏢" },
  { id: "space", name: "Space", preview: "🌌" },
  { id: "nature", name: "Nature", preview: "🌲" },
  { id: "city", name: "City", preview: "🌆" },
  { id: "party", name: "Party", preview: "🎊" },
];

export default function LiveEffectsPanel({ isOpen, onClose, onApplyEffect, onApplySticker, onApplyMusic, onApplyVoiceEffect, onApplySoundEffect, onApplyBackground }) {
  const [activeTab, setActiveTab] = useState("effects");
  const [selectedEffectCategory, setSelectedEffectCategory] = useState("beauty");
  const [selectedStickerCategory, setSelectedStickerCategory] = useState("trending");
  const [activeEffects, setActiveEffects] = useState({});
  const [selectedVoiceEffect, setSelectedVoiceEffect] = useState("normal");
  const [selectedBackground, setSelectedBackground] = useState("none");
  const [selectedMusic, setSelectedMusic] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const handleEffectToggle = (effect) => {
    haptic.light();
    setActiveEffects(prev => {
      const newEffects = { ...prev };
      if (newEffects[effect.id]) {
        delete newEffects[effect.id];
      } else {
        newEffects[effect.id] = effect.intensity || 1;
      }
      onApplyEffect?.(newEffects);
      return newEffects;
    });
  };

  const handleEffectIntensity = (effectId, intensity) => {
    setActiveEffects(prev => ({
      ...prev,
      [effectId]: intensity[0] / 100
    }));
    onApplyEffect?.(activeEffects);
  };

  const handleStickerSelect = (sticker) => {
    haptic.medium();
    onApplySticker?.(sticker);
    toast.success("Sticker added!");
  };

  const handleMusicSelect = (track) => {
    haptic.medium();
    setSelectedMusic(track);
    setIsPlaying(true);
    onApplyMusic?.(track);
  };

  const handleVoiceEffectSelect = (effect) => {
    haptic.medium();
    setSelectedVoiceEffect(effect.id);
    onApplyVoiceEffect?.(effect);
    toast.success(`Voice: ${effect.name}`);
  };

  const handleSoundEffectPlay = (effect) => {
    haptic.success();
    onApplySoundEffect?.(effect);
    toast.success(`Playing: ${effect.name}`);
  };

  const handleBackgroundSelect = (bg) => {
    haptic.medium();
    setSelectedBackground(bg.id);
    onApplyBackground?.(bg);
    toast.success(bg.id === "none" ? "Background removed" : `Background: ${bg.name}`);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="absolute bottom-0 left-0 right-0 bg-[#0A0A0A] rounded-t-3xl max-h-[75vh] overflow-hidden"
        >
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-12 h-1 bg-white/20 rounded-full" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-4 pb-3 border-b border-white/10">
            <h2 className="text-lg font-bold text-white">Effects Studio</h2>
            <Button variant="ghost" size="icon" onClick={onClose} className="text-gray-400">
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
            <TabsList className="w-full justify-start px-2 py-2 bg-transparent border-b border-white/5 overflow-x-auto">
              <TabsTrigger value="effects" className="data-[state=active]:bg-[#00F0FF]/20 data-[state=active]:text-[#00F0FF] rounded-full px-4">
                <Sparkles className="w-4 h-4 mr-2" />
                Effects
              </TabsTrigger>
              <TabsTrigger value="stickers" className="data-[state=active]:bg-[#00F0FF]/20 data-[state=active]:text-[#00F0FF] rounded-full px-4">
                <Sticker className="w-4 h-4 mr-2" />
                Stickers
              </TabsTrigger>
              <TabsTrigger value="music" className="data-[state=active]:bg-[#00F0FF]/20 data-[state=active]:text-[#00F0FF] rounded-full px-4">
                <Music className="w-4 h-4 mr-2" />
                Music
              </TabsTrigger>
              <TabsTrigger value="voice" className="data-[state=active]:bg-[#00F0FF]/20 data-[state=active]:text-[#00F0FF] rounded-full px-4">
                <Mic2 className="w-4 h-4 mr-2" />
                Voice
              </TabsTrigger>
              <TabsTrigger value="sounds" className="data-[state=active]:bg-[#00F0FF]/20 data-[state=active]:text-[#00F0FF] rounded-full px-4">
                <Volume2 className="w-4 h-4 mr-2" />
                Sounds
              </TabsTrigger>
              <TabsTrigger value="background" className="data-[state=active]:bg-[#00F0FF]/20 data-[state=active]:text-[#00F0FF] rounded-full px-4">
                <ImageIcon className="w-4 h-4 mr-2" />
                Background
              </TabsTrigger>
            </TabsList>

            {/* Effects Tab */}
            <TabsContent value="effects" className="mt-0 p-4">
              {/* Effect Categories */}
              <ScrollArea className="w-full mb-4">
                <div className="flex gap-2 pb-2">
                  {EFFECT_CATEGORIES.map((cat) => (
                    <Button
                      key={cat.id}
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedEffectCategory(cat.id)}
                      className={`rounded-full whitespace-nowrap ${
                        selectedEffectCategory === cat.id 
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

              {/* Effects Grid */}
              <div className="grid grid-cols-3 gap-3 max-h-[300px] overflow-y-auto">
                {EFFECTS[selectedEffectCategory]?.map((effect) => (
                  <motion.button
                    key={effect.id}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleEffectToggle(effect)}
                    className={`flex flex-col items-center gap-2 p-3 rounded-xl ${
                      activeEffects[effect.id] 
                        ? 'bg-[#00F0FF]/20 border border-[#00F0FF]' 
                        : 'bg-white/5'
                    }`}
                  >
                    <span className="text-2xl">{effect.icon}</span>
                    <span className="text-xs text-white">{effect.name}</span>
                    {activeEffects[effect.id] && effect.intensity && (
                      <div className="w-full mt-1">
                        <Slider
                          value={[activeEffects[effect.id] * 100]}
                          onValueChange={(val) => handleEffectIntensity(effect.id, val)}
                          max={100}
                          step={1}
                          className="w-full"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    )}
                  </motion.button>
                ))}
              </div>
            </TabsContent>

            {/* Stickers Tab */}
            <TabsContent value="stickers" className="mt-0 p-4">
              {/* Search */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search stickers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-white/5 border-white/10 text-white"
                />
              </div>

              {/* Sticker Categories */}
              <ScrollArea className="w-full mb-4">
                <div className="flex gap-2 pb-2">
                  {STICKER_CATEGORIES.map((cat) => (
                    <Button
                      key={cat.id}
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedStickerCategory(cat.id)}
                      className={`rounded-full whitespace-nowrap ${
                        selectedStickerCategory === cat.id 
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

              {/* Stickers Grid */}
              <div className="grid grid-cols-5 gap-3 max-h-[250px] overflow-y-auto">
                {STICKERS[selectedStickerCategory]?.map((sticker, idx) => (
                  <motion.button
                    key={idx}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleStickerSelect(sticker)}
                    className="w-14 h-14 rounded-xl bg-white/5 flex items-center justify-center text-3xl hover:bg-white/10"
                  >
                    {sticker}
                  </motion.button>
                ))}
              </div>
            </TabsContent>

            {/* Music Tab */}
            <TabsContent value="music" className="mt-0 p-4">
              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                {MUSIC_TRACKS.map((track) => (
                  <motion.button
                    key={track.id}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleMusicSelect(track)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl ${
                      selectedMusic?.id === track.id 
                        ? 'bg-[#00F0FF]/20 border border-[#00F0FF]' 
                        : 'bg-white/5'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#00F0FF] to-[#7000FF] flex items-center justify-center">
                      <Music className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-white font-medium">{track.name}</p>
                      <p className="text-gray-400 text-sm">{track.artist}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-gray-400 text-xs">{track.duration}</p>
                      <span className="text-xs text-[#00F0FF]">{track.genre}</span>
                    </div>
                    {selectedMusic?.id === track.id && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={(e) => { e.stopPropagation(); setIsPlaying(!isPlaying); }}
                        className="text-[#00F0FF]"
                      >
                        {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                      </Button>
                    )}
                  </motion.button>
                ))}
              </div>
            </TabsContent>

            {/* Voice Effects Tab */}
            <TabsContent value="voice" className="mt-0 p-4">
              <div className="grid grid-cols-4 gap-3">
                {VOICE_EFFECTS.map((effect) => (
                  <motion.button
                    key={effect.id}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleVoiceEffectSelect(effect)}
                    className={`flex flex-col items-center gap-2 p-3 rounded-xl ${
                      selectedVoiceEffect === effect.id 
                        ? 'bg-[#00F0FF]/20 border border-[#00F0FF]' 
                        : 'bg-white/5'
                    }`}
                  >
                    <span className="text-2xl">{effect.icon}</span>
                    <span className="text-xs text-white">{effect.name}</span>
                  </motion.button>
                ))}
              </div>
            </TabsContent>

            {/* Sound Effects Tab */}
            <TabsContent value="sounds" className="mt-0 p-4">
              <div className="grid grid-cols-4 gap-3">
                {SOUND_EFFECTS.map((effect) => (
                  <motion.button
                    key={effect.id}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleSoundEffectPlay(effect)}
                    className="flex flex-col items-center gap-2 p-3 rounded-xl bg-white/5 hover:bg-white/10 active:bg-[#00F0FF]/20"
                  >
                    <span className="text-2xl">{effect.icon}</span>
                    <span className="text-xs text-white">{effect.name}</span>
                  </motion.button>
                ))}
              </div>
            </TabsContent>

            {/* Background Tab */}
            <TabsContent value="background" className="mt-0 p-4">
              <div className="grid grid-cols-4 gap-3">
                {BACKGROUNDS.map((bg) => (
                  <motion.button
                    key={bg.id}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleBackgroundSelect(bg)}
                    className={`flex flex-col items-center gap-2 p-3 rounded-xl ${
                      selectedBackground === bg.id 
                        ? 'bg-[#00F0FF]/20 border border-[#00F0FF]' 
                        : 'bg-white/5'
                    }`}
                  >
                    {bg.preview === "blur" ? (
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-gray-400 to-gray-600 blur-sm" />
                    ) : bg.preview ? (
                      <span className="text-2xl">{bg.preview}</span>
                    ) : (
                      <X className="w-6 h-6 text-gray-400" />
                    )}
                    <span className="text-xs text-white">{bg.name}</span>
                  </motion.button>
                ))}
              </div>
            </TabsContent>
          </Tabs>

          {/* Enhance Button */}
          <div className="p-4 border-t border-white/10">
            <Button
              onClick={() => {
                haptic.success();
                toast.success("AI Enhancement applied!");
              }}
              className="w-full bg-gradient-to-r from-[#00F0FF] to-[#7000FF] hover:opacity-90 py-6"
            >
              <Wand2 className="w-5 h-5 mr-2" />
              AI Enhance
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
