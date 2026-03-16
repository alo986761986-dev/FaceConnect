import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, Wand2, Image, Type, Hash, MessageSquare,
  Copy, Check, RefreshCw, Download, X, Palette,
  Lightbulb, PenTool, Zap, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { useSettings } from "@/context/SettingsContext";
import { haptic } from "@/utils/mobile";

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Text generation types
const TEXT_TYPES = [
  { id: "caption", name: "Caption", icon: Type, description: "Post caption" },
  { id: "story_idea", name: "Story Ideas", icon: Lightbulb, description: "3 story ideas" },
  { id: "bio", name: "Bio", icon: PenTool, description: "Profile bio" },
  { id: "hashtags", name: "Hashtags", icon: Hash, description: "Relevant hashtags" },
  { id: "comment_reply", name: "Reply", icon: MessageSquare, description: "Comment reply" }
];

// Image styles
const IMAGE_STYLES = [
  { id: "realistic", name: "Realistic", color: "#00F0FF" },
  { id: "artistic", name: "Artistic", color: "#7000FF" },
  { id: "cartoon", name: "Cartoon", color: "#FF9500" },
  { id: "abstract", name: "Abstract", color: "#FF3366" }
];

// Tone options
const TONES = [
  { id: "friendly", name: "Friendly" },
  { id: "professional", name: "Professional" },
  { id: "funny", name: "Funny" },
  { id: "inspiring", name: "Inspiring" }
];

export default function AIContentGenerator({ isOpen, onClose, onContentGenerated }) {
  const { token } = useAuth();
  const { isDark, t } = useSettings();
  
  const [activeTab, setActiveTab] = useState("text");
  
  // Text generation state
  const [textType, setTextType] = useState("caption");
  const [textContext, setTextContext] = useState("");
  const [textTone, setTextTone] = useState("friendly");
  const [generatedText, setGeneratedText] = useState("");
  const [isGeneratingText, setIsGeneratingText] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Image generation state
  const [imagePrompt, setImagePrompt] = useState("");
  const [imageStyle, setImageStyle] = useState("realistic");
  const [generatedImage, setGeneratedImage] = useState(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  
  // Enhancement state
  const [enhanceContent, setEnhanceContent] = useState("");
  const [enhanceType, setEnhanceType] = useState("improve");
  const [enhancedContent, setEnhancedContent] = useState("");
  const [isEnhancing, setIsEnhancing] = useState(false);

  // Generate text content
  const handleGenerateText = async () => {
    if (!textContext.trim() && textType !== "bio") {
      toast.error("Please provide some context");
      return;
    }
    
    setIsGeneratingText(true);
    haptic.medium();
    
    try {
      const response = await fetch(`${API_URL}/api/ai/generate-text?token=${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt_type: textType,
          context: textContext,
          tone: textTone
        })
      });
      
      if (!response.ok) throw new Error("Generation failed");
      
      const data = await response.json();
      setGeneratedText(data.content);
      haptic.success();
      toast.success("Content generated!");
    } catch (error) {
      toast.error("Failed to generate content");
    } finally {
      setIsGeneratingText(false);
    }
  };

  // Generate image
  const handleGenerateImage = async () => {
    if (!imagePrompt.trim()) {
      toast.error("Please describe your image");
      return;
    }
    
    setIsGeneratingImage(true);
    haptic.medium();
    toast.info("Generating image... This may take a minute");
    
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
      toast.error("Failed to generate image");
    } finally {
      setIsGeneratingImage(false);
    }
  };

  // Enhance content
  const handleEnhance = async () => {
    if (!enhanceContent.trim()) {
      toast.error("Please enter content to enhance");
      return;
    }
    
    setIsEnhancing(true);
    haptic.medium();
    
    try {
      const response = await fetch(
        `${API_URL}/api/ai/enhance-content?token=${token}&content=${encodeURIComponent(enhanceContent)}&enhancement_type=${enhanceType}`,
        { method: "POST" }
      );
      
      if (!response.ok) throw new Error("Enhancement failed");
      
      const data = await response.json();
      setEnhancedContent(data.enhanced);
      haptic.success();
      toast.success("Content enhanced!");
    } catch (error) {
      toast.error("Failed to enhance content");
    } finally {
      setIsEnhancing(false);
    }
  };

  // Copy to clipboard
  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    haptic.light();
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  // Use generated content
  const handleUseContent = (content, type = "text") => {
    onContentGenerated?.({ content, type });
    haptic.success();
    toast.success("Content added!");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`max-w-lg max-h-[90vh] overflow-hidden p-0 ${isDark ? 'bg-[#121212] border-white/10' : 'bg-white border-gray-200'}`}>
        <DialogHeader className="p-4 border-b border-white/10">
          <DialogTitle className={`text-xl font-['Outfit'] flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            <Sparkles className="w-5 h-5 text-[#00F0FF]" />
            AI Content Generator
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
          <TabsList className={`w-full justify-start px-4 py-2 rounded-none border-b ${isDark ? 'bg-transparent border-white/10' : 'bg-gray-50 border-gray-200'}`}>
            <TabsTrigger value="text" className="flex items-center gap-2">
              <Type className="w-4 h-4" />
              Text
            </TabsTrigger>
            <TabsTrigger value="image" className="flex items-center gap-2">
              <Image className="w-4 h-4" />
              Image
            </TabsTrigger>
            <TabsTrigger value="enhance" className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Enhance
            </TabsTrigger>
          </TabsList>

          <div className="overflow-y-auto max-h-[calc(90vh-140px)]">
            {/* Text Generation Tab */}
            <TabsContent value="text" className="p-4 space-y-4 m-0">
              {/* Type Selection */}
              <div className="grid grid-cols-5 gap-2">
                {TEXT_TYPES.map(({ id, name, icon: Icon }) => (
                  <motion.button
                    key={id}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setTextType(id)}
                    className={`flex flex-col items-center gap-1 p-3 rounded-xl transition-colors ${
                      textType === id 
                        ? 'bg-[#00F0FF]/20 border-2 border-[#00F0FF]' 
                        : isDark ? 'bg-white/5 border border-white/10' : 'bg-gray-100 border border-gray-200'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${textType === id ? 'text-[#00F0FF]' : isDark ? 'text-gray-400' : 'text-gray-600'}`} />
                    <span className={`text-xs ${textType === id ? 'text-[#00F0FF]' : isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      {name}
                    </span>
                  </motion.button>
                ))}
              </div>

              {/* Context Input */}
              <div className="space-y-2">
                <Label className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                  {textType === "comment_reply" ? "Comment to reply to:" : "Context / Topic:"}
                </Label>
                <Textarea
                  placeholder={textType === "hashtags" ? "Describe your post..." : "What's your content about?"}
                  value={textContext}
                  onChange={(e) => setTextContext(e.target.value)}
                  className={`min-h-[80px] ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                />
              </div>

              {/* Tone Selection */}
              <div className="space-y-2">
                <Label className={isDark ? 'text-gray-300' : 'text-gray-700'}>Tone:</Label>
                <Select value={textTone} onValueChange={setTextTone}>
                  <SelectTrigger className={isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-gray-50 border-gray-200'}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className={isDark ? 'bg-[#1A1A1A] border-white/10' : ''}>
                    {TONES.map(tone => (
                      <SelectItem key={tone.id} value={tone.id}>{tone.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Generate Button */}
              <Button
                onClick={handleGenerateText}
                disabled={isGeneratingText}
                className="w-full bg-gradient-to-r from-[#00F0FF] to-[#7000FF] hover:opacity-90"
              >
                {isGeneratingText ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4 mr-2" />
                    Generate
                  </>
                )}
              </Button>

              {/* Generated Result */}
              <AnimatePresence>
                {generatedText && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className={`p-4 rounded-xl space-y-3 ${isDark ? 'bg-white/5 border border-white/10' : 'bg-gray-50 border border-gray-200'}`}
                  >
                    <p className={`whitespace-pre-wrap ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {generatedText}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCopy(generatedText)}
                        className={isDark ? 'border-white/10 text-white hover:bg-white/5' : ''}
                      >
                        {copied ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
                        {copied ? "Copied" : "Copy"}
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleUseContent(generatedText, "text")}
                        className="bg-[#00F0FF] hover:bg-[#00F0FF]/80 text-black"
                      >
                        Use This
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleGenerateText}
                        className={isDark ? 'text-gray-400 hover:text-white' : ''}
                      >
                        <RefreshCw className="w-4 h-4" />
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </TabsContent>

            {/* Image Generation Tab */}
            <TabsContent value="image" className="p-4 space-y-4 m-0">
              {/* Style Selection */}
              <div className="space-y-2">
                <Label className={isDark ? 'text-gray-300' : 'text-gray-700'}>Style:</Label>
                <div className="flex gap-2">
                  {IMAGE_STYLES.map(({ id, name, color }) => (
                    <motion.button
                      key={id}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setImageStyle(id)}
                      className={`flex-1 py-2 px-3 rounded-lg font-medium text-sm transition-colors ${
                        imageStyle === id 
                          ? 'text-white' 
                          : isDark ? 'bg-white/5 text-gray-400' : 'bg-gray-100 text-gray-600'
                      }`}
                      style={{ backgroundColor: imageStyle === id ? color : undefined }}
                    >
                      {name}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Prompt Input */}
              <div className="space-y-2">
                <Label className={isDark ? 'text-gray-300' : 'text-gray-700'}>Describe your image:</Label>
                <Textarea
                  placeholder="A serene sunset over mountains with a calm lake..."
                  value={imagePrompt}
                  onChange={(e) => setImagePrompt(e.target.value)}
                  className={`min-h-[100px] ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                />
              </div>

              {/* Generate Button */}
              <Button
                onClick={handleGenerateImage}
                disabled={isGeneratingImage}
                className="w-full bg-gradient-to-r from-[#7000FF] to-[#FF3366] hover:opacity-90"
              >
                {isGeneratingImage ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating Image...
                  </>
                ) : (
                  <>
                    <Image className="w-4 h-4 mr-2" />
                    Generate Image
                  </>
                )}
              </Button>

              {/* Generated Image */}
              <AnimatePresence>
                {generatedImage && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="space-y-3"
                  >
                    <div className="relative rounded-xl overflow-hidden">
                      <img 
                        src={generatedImage.image_base64} 
                        alt="AI Generated"
                        className="w-full h-auto"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = generatedImage.image_base64;
                          link.download = 'ai-generated-image.png';
                          link.click();
                        }}
                        className={isDark ? 'border-white/10 text-white hover:bg-white/5' : ''}
                      >
                        <Download className="w-4 h-4 mr-1" />
                        Download
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleUseContent(generatedImage.image_url, "image")}
                        className="bg-[#7000FF] hover:bg-[#7000FF]/80"
                      >
                        Use in Post
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </TabsContent>

            {/* Enhance Tab */}
            <TabsContent value="enhance" className="p-4 space-y-4 m-0">
              {/* Content to Enhance */}
              <div className="space-y-2">
                <Label className={isDark ? 'text-gray-300' : 'text-gray-700'}>Your content:</Label>
                <Textarea
                  placeholder="Paste your content here to enhance..."
                  value={enhanceContent}
                  onChange={(e) => setEnhanceContent(e.target.value)}
                  className={`min-h-[100px] ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                />
              </div>

              {/* Enhancement Type */}
              <div className="space-y-2">
                <Label className={isDark ? 'text-gray-300' : 'text-gray-700'}>Enhancement type:</Label>
                <Select value={enhanceType} onValueChange={setEnhanceType}>
                  <SelectTrigger className={isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-gray-50 border-gray-200'}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className={isDark ? 'bg-[#1A1A1A] border-white/10' : ''}>
                    <SelectItem value="improve">Improve</SelectItem>
                    <SelectItem value="shorten">Shorten</SelectItem>
                    <SelectItem value="expand">Expand</SelectItem>
                    <SelectItem value="professional">Make Professional</SelectItem>
                    <SelectItem value="casual">Make Casual</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Enhance Button */}
              <Button
                onClick={handleEnhance}
                disabled={isEnhancing}
                className="w-full bg-gradient-to-r from-[#FF9500] to-[#FF3366] hover:opacity-90"
              >
                {isEnhancing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Enhancing...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 mr-2" />
                    Enhance Content
                  </>
                )}
              </Button>

              {/* Enhanced Result */}
              <AnimatePresence>
                {enhancedContent && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className={`p-4 rounded-xl space-y-3 ${isDark ? 'bg-white/5 border border-white/10' : 'bg-gray-50 border border-gray-200'}`}
                  >
                    <p className={`whitespace-pre-wrap ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {enhancedContent}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCopy(enhancedContent)}
                        className={isDark ? 'border-white/10 text-white hover:bg-white/5' : ''}
                      >
                        {copied ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
                        Copy
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleUseContent(enhancedContent, "text")}
                        className="bg-[#FF9500] hover:bg-[#FF9500]/80 text-white"
                      >
                        Use This
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
