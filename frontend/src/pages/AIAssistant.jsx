import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Bot, Send, Sparkles, Image as ImageIcon, MessageSquare,
  Loader2, User, Wand2, Heart, Briefcase, Palette,
  X, Download, Copy, RefreshCw, Search, Mic, MicOff,
  ChevronDown, Settings, History, Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/context/AuthContext";
import { useSettings } from "@/context/SettingsContext";
import { haptic } from "@/utils/mobile";
import BottomNav from "@/components/BottomNav";

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Persona icons and colors
const PERSONA_CONFIG = {
  assistant: { icon: Bot, color: "from-[#00F0FF] to-[#7000FF]", name: "FaceConnect AI" },
  creative: { icon: Palette, color: "from-[#FF6B6B] to-[#FFE66D]", name: "Creative Muse" },
  professional: { icon: Briefcase, color: "from-[#4ECDC4] to-[#556270]", name: "Pro Assistant" },
  emotional_support: { icon: Heart, color: "from-[#FF758C] to-[#FF7EB3]", name: "Supportive Friend" }
};

export default function AIAssistant() {
  const { token, user } = useAuth();
  const { isDark, t } = useSettings();
  
  const [activeTab, setActiveTab] = useState("chat");
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedPersona, setSelectedPersona] = useState("assistant");
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  
  // Image generation state
  const [imagePrompt, setImagePrompt] = useState("");
  const [imageStyle, setImageStyle] = useState("realistic");
  const [generatedImage, setGeneratedImage] = useState(null);
  const [generatingImage, setGeneratingImage] = useState(false);
  
  // Caption generation state
  const [captionContext, setCaptionContext] = useState("");
  const [captionMood, setCaptionMood] = useState("casual");
  const [generatedCaption, setGeneratedCaption] = useState("");
  const [generatingCaption, setGeneratingCaption] = useState(false);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResult, setSearchResult] = useState(null);
  const [searching, setSearching] = useState(false);
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Send chat message
  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!inputText.trim() || loading) return;
    
    const userMessage = inputText.trim();
    setInputText("");
    setLoading(true);
    haptic.light();
    
    // Add user message
    setMessages(prev => [...prev, {
      id: Date.now(),
      type: "user",
      content: userMessage
    }]);
    
    try {
      const response = await fetch(`${API_URL}/api/ai/chat?token=${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          persona: selectedPersona
        })
      });
      
      if (!response.ok) throw new Error("Chat failed");
      
      const data = await response.json();
      
      // Add AI response
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        type: "ai",
        content: data.response,
        persona: data.persona,
        persona_name: data.persona_name
      }]);
      
      haptic.success();
    } catch (error) {
      console.error("Chat error:", error);
      toast.error("Failed to get response");
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        type: "error",
        content: "Sorry, I couldn't process your message. Please try again."
      }]);
    } finally {
      setLoading(false);
    }
  };

  // Generate image
  const handleGenerateImage = async () => {
    if (!imagePrompt.trim() || generatingImage) return;
    
    setGeneratingImage(true);
    setGeneratedImage(null);
    haptic.medium();
    
    try {
      const response = await fetch(`${API_URL}/api/ai/generate-image?token=${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: imagePrompt,
          style: imageStyle
        })
      });
      
      if (!response.ok) throw new Error("Image generation failed");
      
      const data = await response.json();
      setGeneratedImage(data);
      haptic.success();
      toast.success("Image generated!");
    } catch (error) {
      console.error("Image generation error:", error);
      toast.error("Failed to generate image");
    } finally {
      setGeneratingImage(false);
    }
  };

  // Generate caption
  const handleGenerateCaption = async () => {
    if (!captionContext.trim() || generatingCaption) return;
    
    setGeneratingCaption(true);
    haptic.light();
    
    try {
      const response = await fetch(`${API_URL}/api/ai/caption?token=${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          context: captionContext,
          mood: captionMood,
          include_hashtags: true
        })
      });
      
      if (!response.ok) throw new Error("Caption generation failed");
      
      const data = await response.json();
      setGeneratedCaption(data.caption);
      haptic.success();
    } catch (error) {
      console.error("Caption error:", error);
      toast.error("Failed to generate caption");
    } finally {
      setGeneratingCaption(false);
    }
  };

  // AI Search
  const handleAISearch = async () => {
    if (!searchQuery.trim() || searching) return;
    
    setSearching(true);
    haptic.light();
    
    try {
      const response = await fetch(`${API_URL}/api/ai/search?token=${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchQuery })
      });
      
      if (!response.ok) throw new Error("Search failed");
      
      const data = await response.json();
      setSearchResult(data);
    } catch (error) {
      console.error("Search error:", error);
      toast.error("Search failed");
    } finally {
      setSearching(false);
    }
  };

  // Load history
  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const response = await fetch(`${API_URL}/api/ai/history?token=${token}&limit=50`);
      if (response.ok) {
        const data = await response.json();
        setHistory(data.interactions || []);
      }
    } catch (error) {
      console.error("Failed to load history:", error);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Clear history
  const clearHistory = async () => {
    if (!window.confirm("Clear all AI interaction history?")) return;
    
    try {
      const response = await fetch(`${API_URL}/api/ai/history?token=${token}`, {
        method: "DELETE"
      });
      if (response.ok) {
        setHistory([]);
        toast.success("History cleared");
      }
    } catch (error) {
      toast.error("Failed to clear history");
    }
  };

  // Copy to clipboard
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
    haptic.light();
  };

  const PersonaIcon = PERSONA_CONFIG[selectedPersona]?.icon || Bot;

  return (
    <div className={`min-h-screen ${isDark ? 'bg-[#0A0A0A]' : 'bg-gray-50'} pb-20`}>
      {/* Header */}
      <div className={`sticky top-0 z-40 px-4 py-3 backdrop-blur-lg border-b ${isDark ? 'bg-[#0A0A0A]/95 border-white/5' : 'bg-white/95 border-gray-100'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full bg-gradient-to-r ${PERSONA_CONFIG[selectedPersona]?.color} flex items-center justify-center`}>
              <PersonaIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {t('aiAssistant') || 'AI Assistant'}
              </h1>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                {PERSONA_CONFIG[selectedPersona]?.name}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => { setShowHistory(true); loadHistory(); }}
              className={isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600'}
            >
              <History className="w-5 h-5" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className={isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600'}>
                  <Settings className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className={isDark ? 'bg-[#1A1A1A] border-white/10' : ''}>
                {Object.entries(PERSONA_CONFIG).map(([key, config]) => (
                  <DropdownMenuItem
                    key={key}
                    onClick={() => setSelectedPersona(key)}
                    className={`cursor-pointer ${selectedPersona === key ? 'bg-[#00F0FF]/20' : ''}`}
                  >
                    <config.icon className="w-4 h-4 mr-2" />
                    {config.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className={`w-full justify-start px-4 pt-2 gap-2 ${isDark ? 'bg-transparent' : 'bg-transparent'}`}>
          <TabsTrigger value="chat" className="data-[state=active]:bg-[#00F0FF]/20">
            <MessageSquare className="w-4 h-4 mr-1" /> Chat
          </TabsTrigger>
          <TabsTrigger value="image" className="data-[state=active]:bg-[#00F0FF]/20">
            <ImageIcon className="w-4 h-4 mr-1" /> Create
          </TabsTrigger>
          <TabsTrigger value="search" className="data-[state=active]:bg-[#00F0FF]/20">
            <Search className="w-4 h-4 mr-1" /> Search
          </TabsTrigger>
        </TabsList>

        {/* Chat Tab */}
        <TabsContent value="chat" className="mt-0 px-4">
          <ScrollArea className="h-[calc(100vh-280px)]">
            <div className="space-y-4 py-4">
              {messages.length === 0 && (
                <div className={`text-center py-12 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                  <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">How can I help you today?</p>
                  <p className="text-sm">Ask me anything or try these:</p>
                  <div className="flex flex-wrap justify-center gap-2 mt-4">
                    {["Write a caption", "Help me post", "Suggest ideas", "Emotional support"].map((suggestion) => (
                      <Button
                        key={suggestion}
                        variant="outline"
                        size="sm"
                        onClick={() => setInputText(suggestion)}
                        className={isDark ? 'border-white/10 hover:bg-white/10' : ''}
                      >
                        {suggestion}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
              
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[85%] ${
                    msg.type === 'user'
                      ? 'bg-gradient-to-r from-[#00F0FF] to-[#7000FF] text-white'
                      : msg.type === 'error'
                        ? 'bg-red-500/20 text-red-400'
                        : isDark ? 'bg-[#1A1A1A] text-white' : 'bg-white text-gray-900 shadow'
                  } rounded-2xl px-4 py-3`}>
                    {msg.type === 'ai' && (
                      <div className="flex items-center gap-2 mb-2 text-xs text-[#00F0FF]">
                        <Bot className="w-3 h-3" />
                        {msg.persona_name}
                      </div>
                    )}
                    <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
                    {msg.type === 'ai' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(msg.content)}
                        className="mt-2 h-6 text-xs opacity-60 hover:opacity-100"
                      >
                        <Copy className="w-3 h-3 mr-1" /> Copy
                      </Button>
                    )}
                  </div>
                </motion.div>
              ))}
              
              {loading && (
                <div className="flex justify-start">
                  <div className={`${isDark ? 'bg-[#1A1A1A]' : 'bg-white shadow'} rounded-2xl px-4 py-3`}>
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-[#00F0FF]" />
                      <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        Thinking...
                      </span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Chat Input */}
          <form onSubmit={handleSendMessage} className="flex gap-2 pt-2">
            <Input
              ref={inputRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ask me anything..."
              className={`flex-1 ${isDark ? 'bg-[#1A1A1A] border-white/10' : ''}`}
              data-testid="ai-chat-input"
            />
            <Button
              type="submit"
              disabled={!inputText.trim() || loading}
              className="bg-gradient-to-r from-[#00F0FF] to-[#7000FF]"
              data-testid="ai-send-btn"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </form>
        </TabsContent>

        {/* Image/Create Tab */}
        <TabsContent value="image" className="mt-0 px-4 space-y-6 py-4">
          {/* Image Generation */}
          <div className={`p-4 rounded-xl ${isDark ? 'bg-[#1A1A1A]' : 'bg-white shadow'}`}>
            <h3 className={`font-semibold mb-3 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              <Wand2 className="w-5 h-5 text-[#00F0FF]" /> Generate Image
            </h3>
            <Textarea
              value={imagePrompt}
              onChange={(e) => setImagePrompt(e.target.value)}
              placeholder="Describe the image you want to create..."
              className={`mb-3 ${isDark ? 'bg-[#0A0A0A] border-white/10' : ''}`}
              rows={3}
              data-testid="image-prompt-input"
            />
            <div className="flex gap-2 mb-3">
              {["realistic", "artistic", "cartoon", "minimal"].map((style) => (
                <Button
                  key={style}
                  variant={imageStyle === style ? "default" : "outline"}
                  size="sm"
                  onClick={() => setImageStyle(style)}
                  className={imageStyle === style ? 'bg-[#00F0FF]/20 text-[#00F0FF]' : ''}
                >
                  {style}
                </Button>
              ))}
            </div>
            <Button
              onClick={handleGenerateImage}
              disabled={!imagePrompt.trim() || generatingImage}
              className="w-full bg-gradient-to-r from-[#00F0FF] to-[#7000FF]"
              data-testid="generate-image-btn"
            >
              {generatingImage ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating (may take up to 1 min)...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Image
                </>
              )}
            </Button>
            
            {generatedImage && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mt-4"
              >
                <img
                  src={`data:image/png;base64,${generatedImage.image_base64}`}
                  alt="Generated"
                  className="w-full rounded-lg"
                />
                <div className="flex gap-2 mt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = `data:image/png;base64,${generatedImage.image_base64}`;
                      link.download = 'ai-generated.png';
                      link.click();
                    }}
                    className={isDark ? 'border-white/10' : ''}
                  >
                    <Download className="w-4 h-4 mr-1" /> Download
                  </Button>
                </div>
              </motion.div>
            )}
          </div>

          {/* Caption Generation */}
          <div className={`p-4 rounded-xl ${isDark ? 'bg-[#1A1A1A]' : 'bg-white shadow'}`}>
            <h3 className={`font-semibold mb-3 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              <MessageSquare className="w-5 h-5 text-[#7000FF]" /> Generate Caption
            </h3>
            <Input
              value={captionContext}
              onChange={(e) => setCaptionContext(e.target.value)}
              placeholder="What's your post about?"
              className={`mb-3 ${isDark ? 'bg-[#0A0A0A] border-white/10' : ''}`}
              data-testid="caption-context-input"
            />
            <div className="flex gap-2 mb-3">
              {["casual", "funny", "inspiring", "professional"].map((mood) => (
                <Button
                  key={mood}
                  variant={captionMood === mood ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCaptionMood(mood)}
                  className={captionMood === mood ? 'bg-[#7000FF]/20 text-[#7000FF]' : ''}
                >
                  {mood}
                </Button>
              ))}
            </div>
            <Button
              onClick={handleGenerateCaption}
              disabled={!captionContext.trim() || generatingCaption}
              className="w-full bg-gradient-to-r from-[#7000FF] to-[#FF3366]"
              data-testid="generate-caption-btn"
            >
              {generatingCaption ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 mr-2" />
              )}
              Generate Caption
            </Button>
            
            {generatedCaption && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={`mt-4 p-3 rounded-lg ${isDark ? 'bg-[#0A0A0A]' : 'bg-gray-50'}`}
              >
                <p className={isDark ? 'text-white' : 'text-gray-900'}>{generatedCaption}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(generatedCaption)}
                  className="mt-2"
                >
                  <Copy className="w-4 h-4 mr-1" /> Copy
                </Button>
              </motion.div>
            )}
          </div>
        </TabsContent>

        {/* Search Tab */}
        <TabsContent value="search" className="mt-0 px-4 py-4">
          <div className={`p-4 rounded-xl ${isDark ? 'bg-[#1A1A1A]' : 'bg-white shadow'}`}>
            <h3 className={`font-semibold mb-3 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              <Search className="w-5 h-5 text-[#00F0FF]" /> AI-Powered Search
            </h3>
            <p className={`text-sm mb-3 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Ask questions in natural language to find content
            </p>
            <div className="flex gap-2">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="e.g., Find posts about travel from last week"
                className={`flex-1 ${isDark ? 'bg-[#0A0A0A] border-white/10' : ''}`}
                onKeyDown={(e) => e.key === 'Enter' && handleAISearch()}
                data-testid="ai-search-input"
              />
              <Button
                onClick={handleAISearch}
                disabled={!searchQuery.trim() || searching}
                className="bg-gradient-to-r from-[#00F0FF] to-[#7000FF]"
              >
                {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              </Button>
            </div>
            
            {searchResult && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 space-y-3"
              >
                <div className={`p-3 rounded-lg ${isDark ? 'bg-[#0A0A0A]' : 'bg-gray-50'}`}>
                  <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Understanding:
                  </p>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    {searchResult.interpretation}
                  </p>
                </div>
                
                {searchResult.suggestions?.length > 0 && (
                  <div>
                    <p className={`text-sm font-medium mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      Try also:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {searchResult.suggestions.map((suggestion, i) => (
                        <Button
                          key={i}
                          variant="outline"
                          size="sm"
                          onClick={() => setSearchQuery(suggestion)}
                          className={isDark ? 'border-white/10' : ''}
                        >
                          {suggestion}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* History Dialog */}
      <Dialog open={showHistory} onOpenChange={setShowHistory}>
        <DialogContent className={`${isDark ? 'bg-[#121212] border-white/10' : ''} max-w-md`}>
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>AI History</span>
              {history.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearHistory}
                  className="text-red-500"
                >
                  <Trash2 className="w-4 h-4 mr-1" /> Clear
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            {loadingHistory ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-[#00F0FF]" />
              </div>
            ) : history.length === 0 ? (
              <p className={`text-center py-8 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                No AI interactions yet
              </p>
            ) : (
              <div className="space-y-3">
                {history.map((item) => (
                  <div
                    key={item.id}
                    className={`p-3 rounded-lg ${isDark ? 'bg-[#1A1A1A]' : 'bg-gray-50'}`}
                  >
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                      <span className="capitalize">{item.persona}</span>
                      <span>•</span>
                      <span>{new Date(item.created_at).toLocaleDateString()}</span>
                    </div>
                    <p className={`text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      Q: {item.message}
                    </p>
                    <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      A: {item.response?.substring(0, 100)}...
                    </p>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
}
