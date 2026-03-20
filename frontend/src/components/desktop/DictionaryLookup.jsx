import { useState } from "react";
import { Search, Book, Volume2, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

const API_URL = process.env.REACT_APP_BACKEND_URL;

export function DictionaryLookup({ isDark, initialWord = "", onClose, compact = false }) {
  const [word, setWord] = useState(initialWord);
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const lookupWord = async (searchWord = word) => {
    if (!searchWord.trim() || isLoading) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_URL}/api/assistant/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Define the word "${searchWord.trim()}". Provide:
1. Part of speech (noun, verb, adjective, etc.)
2. Definition(s)
3. Example sentence(s)
4. Synonyms (if applicable)
5. Etymology (brief origin)

Format your response clearly with each section labeled.`,
          session_id: `dictionary-${Date.now()}`,
          ai_model: "gemini"
        })
      });
      
      const data = await response.json();
      setResult({
        word: searchWord.trim(),
        definition: data.response || "No definition found."
      });
    } catch (err) {
      setError("Failed to look up word. Please try again.");
    }
    
    setIsLoading(false);
  };

  const speakWord = () => {
    if ('speechSynthesis' in window && word) {
      const utterance = new SpeechSynthesisUtterance(word);
      utterance.lang = 'en-US';
      window.speechSynthesis.speak(utterance);
    }
  };

  // Auto-lookup if initial word provided
  useState(() => {
    if (initialWord) {
      lookupWord(initialWord);
    }
  }, [initialWord]);

  if (compact) {
    return (
      <div className={`p-4 rounded-xl ${isDark ? 'bg-[#202c33]' : 'bg-gray-100'}`} data-testid="dictionary-compact">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Book className={`w-5 h-5 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
            <span className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Dictionary</span>
          </div>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose} className="h-6 w-6">
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
        
        <div className={`flex items-center gap-2 p-2 rounded-lg mb-3 ${isDark ? 'bg-[#2a3942]' : 'bg-white'}`}>
          <Search className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
          <Input
            placeholder="Look up a word..."
            value={word}
            onChange={(e) => setWord(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && lookupWord()}
            className={`border-0 bg-transparent h-8 focus-visible:ring-0 ${isDark ? 'text-white placeholder:text-gray-500' : ''}`}
          />
          <Button
            size="sm"
            onClick={() => lookupWord()}
            disabled={!word.trim() || isLoading}
            className="bg-amber-500 hover:bg-amber-600 h-7 px-3"
          >
            {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Look up'}
          </Button>
        </div>
        
        {error && (
          <p className="text-red-500 text-sm">{error}</p>
        )}
        
        {result && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {result.word}
              </span>
              <Button variant="ghost" size="icon" onClick={speakWord} className="h-6 w-6">
                <Volume2 className="w-4 h-4" />
              </Button>
            </div>
            <p className={`text-sm whitespace-pre-wrap ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              {result.definition}
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="dictionary-full">
      {/* Search */}
      <div className={`flex items-center gap-2 p-3 rounded-xl ${isDark ? 'bg-[#202c33]' : 'bg-gray-100'}`}>
        <Book className={`w-5 h-5 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
        <Input
          placeholder="Enter a word to look up..."
          value={word}
          onChange={(e) => setWord(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && lookupWord()}
          className={`border-0 bg-transparent focus-visible:ring-0 ${isDark ? 'text-white placeholder:text-gray-500' : ''}`}
          data-testid="dictionary-input"
        />
        <Button
          onClick={() => lookupWord()}
          disabled={!word.trim() || isLoading}
          className="bg-amber-500 hover:bg-amber-600"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
        </Button>
      </div>
      
      {error && (
        <div className={`p-3 rounded-lg ${isDark ? 'bg-red-900/30 text-red-300' : 'bg-red-100 text-red-700'}`}>
          {error}
        </div>
      )}
      
      {result && (
        <div className={`p-4 rounded-xl ${isDark ? 'bg-[#202c33]' : 'bg-amber-50'}`}>
          <div className="flex items-center gap-3 mb-3">
            <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {result.word}
            </h3>
            <Button
              variant="ghost"
              size="icon"
              onClick={speakWord}
              className={`h-8 w-8 ${isDark ? 'text-amber-400 hover:bg-[#2a3942]' : 'text-amber-600 hover:bg-amber-100'}`}
            >
              <Volume2 className="w-5 h-5" />
            </Button>
          </div>
          <div className={`text-sm whitespace-pre-wrap leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            {result.definition}
          </div>
        </div>
      )}
      
      {!result && !error && !isLoading && (
        <div className={`text-center py-8 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
          <Book className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Enter a word to see its definition</p>
        </div>
      )}
    </div>
  );
}

// Context Menu Dictionary Popup
export function DictionaryPopup({ word, position, isDark, onClose }) {
  if (!word || !position) return null;

  return (
    <div
      className={`fixed z-50 w-80 rounded-xl shadow-2xl border ${
        isDark ? 'bg-[#111b21] border-[#2a2a2a]' : 'bg-white border-gray-200'
      }`}
      style={{
        top: Math.min(position.y, window.innerHeight - 300),
        left: Math.min(position.x, window.innerWidth - 320),
      }}
      data-testid="dictionary-popup"
    >
      <DictionaryLookup isDark={isDark} initialWord={word} onClose={onClose} compact />
    </div>
  );
}

export default DictionaryLookup;
