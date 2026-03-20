import { useState } from "react";
import { ArrowLeft, Languages, ArrowRightLeft, Copy, Check, Volume2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Common languages for translation
const LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'de', name: 'German', flag: '🇩🇪' },
  { code: 'it', name: 'Italian', flag: '🇮🇹' },
  { code: 'pt', name: 'Portuguese', flag: '🇵🇹' },
  { code: 'ru', name: 'Russian', flag: '🇷🇺' },
  { code: 'zh', name: 'Chinese', flag: '🇨🇳' },
  { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
  { code: 'ko', name: 'Korean', flag: '🇰🇷' },
  { code: 'ar', name: 'Arabic', flag: '🇸🇦' },
  { code: 'hi', name: 'Hindi', flag: '🇮🇳' },
  { code: 'bn', name: 'Bengali', flag: '🇧🇩' },
  { code: 'id', name: 'Indonesian', flag: '🇮🇩' },
  { code: 'ms', name: 'Malay', flag: '🇲🇾' },
  { code: 'th', name: 'Thai', flag: '🇹🇭' },
  { code: 'vi', name: 'Vietnamese', flag: '🇻🇳' },
  { code: 'tr', name: 'Turkish', flag: '🇹🇷' },
  { code: 'pl', name: 'Polish', flag: '🇵🇱' },
  { code: 'nl', name: 'Dutch', flag: '🇳🇱' },
  { code: 'sv', name: 'Swedish', flag: '🇸🇪' },
  { code: 'da', name: 'Danish', flag: '🇩🇰' },
  { code: 'no', name: 'Norwegian', flag: '🇳🇴' },
  { code: 'fi', name: 'Finnish', flag: '🇫🇮' },
  { code: 'el', name: 'Greek', flag: '🇬🇷' },
  { code: 'he', name: 'Hebrew', flag: '🇮🇱' },
  { code: 'uk', name: 'Ukrainian', flag: '🇺🇦' },
  { code: 'cs', name: 'Czech', flag: '🇨🇿' },
  { code: 'ro', name: 'Romanian', flag: '🇷🇴' },
  { code: 'hu', name: 'Hungarian', flag: '🇭🇺' },
];

export default function TranslationPanel({ isDark, onBack }) {
  const [sourceText, setSourceText] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [sourceLang, setSourceLang] = useState("auto");
  const [targetLang, setTargetLang] = useState("en");
  const [isTranslating, setIsTranslating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState([]);

  const handleTranslate = async () => {
    if (!sourceText.trim() || isTranslating) return;
    
    setIsTranslating(true);
    
    try {
      const response = await fetch(`${API_URL}/api/assistant/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Translate the following text ${sourceLang !== 'auto' ? `from ${LANGUAGES.find(l => l.code === sourceLang)?.name || sourceLang}` : ''} to ${LANGUAGES.find(l => l.code === targetLang)?.name || targetLang}. Only respond with the translation, nothing else:\n\n${sourceText}`,
          session_id: `translate-${Date.now()}`,
          ai_model: "gemini"
        })
      });
      
      const data = await response.json();
      const translation = data.response || "Translation failed. Please try again.";
      setTranslatedText(translation);
      
      // Add to history
      setHistory(prev => [{
        id: Date.now(),
        source: sourceText,
        translated: translation,
        from: sourceLang,
        to: targetLang,
        timestamp: new Date().toLocaleTimeString()
      }, ...prev.slice(0, 9)]); // Keep last 10
      
    } catch (error) {
      setTranslatedText("Translation failed. Please check your connection.");
    }
    
    setIsTranslating(false);
  };

  const swapLanguages = () => {
    if (sourceLang !== 'auto') {
      const temp = sourceLang;
      setSourceLang(targetLang);
      setTargetLang(temp);
      setSourceText(translatedText);
      setTranslatedText(sourceText);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(translatedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const speakText = (text, lang) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="flex-1 flex flex-col" data-testid="translation-panel">
      {/* Header */}
      <div className={`flex items-center justify-between p-4 border-b ${isDark ? 'border-[#2a2a2a]' : 'border-gray-200'}`}>
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={onBack}
            className={`rounded-full ${isDark ? 'hover:bg-[#2a3942]' : 'hover:bg-gray-100'}`}
            data-testid="translation-back-btn"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <Languages className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Translator</h3>
            <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Powered by Gemini AI</p>
          </div>
        </div>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Language Selectors */}
          <div className="flex items-center gap-2">
            <Select value={sourceLang} onValueChange={setSourceLang}>
              <SelectTrigger className={`flex-1 ${isDark ? 'bg-[#202c33] border-[#2a2a2a] text-white' : ''}`}>
                <SelectValue placeholder="From" />
              </SelectTrigger>
              <SelectContent className={isDark ? 'bg-[#202c33] border-[#2a2a2a]' : ''}>
                <SelectItem value="auto" className={isDark ? 'text-white hover:bg-[#2a3942]' : ''}>
                  🔍 Detect Language
                </SelectItem>
                {LANGUAGES.map(lang => (
                  <SelectItem key={lang.code} value={lang.code} className={isDark ? 'text-white hover:bg-[#2a3942]' : ''}>
                    {lang.flag} {lang.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={swapLanguages}
              disabled={sourceLang === 'auto'}
              className={`rounded-full ${isDark ? 'hover:bg-[#2a3942]' : 'hover:bg-gray-100'}`}
              data-testid="swap-languages-btn"
            >
              <ArrowRightLeft className="w-4 h-4" />
            </Button>
            
            <Select value={targetLang} onValueChange={setTargetLang}>
              <SelectTrigger className={`flex-1 ${isDark ? 'bg-[#202c33] border-[#2a2a2a] text-white' : ''}`}>
                <SelectValue placeholder="To" />
              </SelectTrigger>
              <SelectContent className={isDark ? 'bg-[#202c33] border-[#2a2a2a]' : ''}>
                {LANGUAGES.map(lang => (
                  <SelectItem key={lang.code} value={lang.code} className={isDark ? 'text-white hover:bg-[#2a3942]' : ''}>
                    {lang.flag} {lang.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Source Text */}
          <div className={`rounded-xl p-3 ${isDark ? 'bg-[#202c33]' : 'bg-gray-100'}`}>
            <Textarea
              placeholder="Enter text to translate..."
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
              className={`min-h-[120px] border-0 bg-transparent resize-none focus-visible:ring-0 ${isDark ? 'text-white placeholder:text-gray-500' : ''}`}
              data-testid="source-text-input"
            />
            <div className="flex items-center justify-between mt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => speakText(sourceText, sourceLang)}
                disabled={!sourceText}
                className={isDark ? 'text-gray-400 hover:text-white' : ''}
              >
                <Volume2 className="w-4 h-4" />
              </Button>
              <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                {sourceText.length} characters
              </span>
            </div>
          </div>
          
          {/* Translate Button */}
          <Button
            onClick={handleTranslate}
            disabled={!sourceText.trim() || isTranslating}
            className="w-full py-5 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold rounded-xl"
            data-testid="translate-btn"
          >
            {isTranslating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Translating...
              </>
            ) : (
              <>
                <Languages className="w-4 h-4 mr-2" />
                Translate
              </>
            )}
          </Button>
          
          {/* Translated Text */}
          {translatedText && (
            <div className={`rounded-xl p-3 ${isDark ? 'bg-[#2a3942]' : 'bg-blue-50'}`}>
              <p className={`text-sm whitespace-pre-wrap ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {translatedText}
              </p>
              <div className="flex items-center justify-between mt-3 pt-2 border-t border-opacity-20 ${isDark ? 'border-gray-600' : 'border-gray-300'}">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => speakText(translatedText, targetLang)}
                  className={isDark ? 'text-gray-400 hover:text-white' : ''}
                >
                  <Volume2 className="w-4 h-4 mr-1" />
                  Listen
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={copyToClipboard}
                  className={isDark ? 'text-gray-400 hover:text-white' : ''}
                >
                  {copied ? <Check className="w-4 h-4 mr-1 text-green-500" /> : <Copy className="w-4 h-4 mr-1" />}
                  {copied ? 'Copied!' : 'Copy'}
                </Button>
              </div>
            </div>
          )}
          
          {/* Translation History */}
          {history.length > 0 && (
            <div className="mt-6">
              <p className={`text-xs uppercase font-medium mb-3 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                Recent Translations
              </p>
              <div className="space-y-2">
                {history.map(item => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setSourceText(item.source);
                      setTranslatedText(item.translated);
                      setSourceLang(item.from);
                      setTargetLang(item.to);
                    }}
                    className={`w-full p-3 rounded-lg text-left transition-colors ${
                      isDark ? 'bg-[#202c33] hover:bg-[#2a3942]' : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                  >
                    <p className={`text-sm truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {item.source}
                    </p>
                    <p className={`text-xs truncate mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      → {item.translated}
                    </p>
                    <p className={`text-xs mt-1 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                      {item.timestamp}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
