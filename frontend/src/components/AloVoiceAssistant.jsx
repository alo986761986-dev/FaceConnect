import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Volume2, VolumeX, Settings, X, Sparkles, User, UserCircle, Minimize2, Maximize2 } from "lucide-react";
import { Button } from "./ui/button";
import { Slider } from "./ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Switch } from "./ui/switch";

// Matrix rain effect component
const MatrixRain = ({ isActive }) => {
  const canvasRef = useRef(null);
  
  useEffect(() => {
    if (!isActive) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    canvas.width = 300;
    canvas.height = 300;
    
    const chars = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const charArray = chars.split('');
    const fontSize = 14;
    const columns = canvas.width / fontSize;
    const drops = Array(Math.floor(columns)).fill(1);
    
    const draw = () => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      ctx.fillStyle = '#00ff00';
      ctx.font = `${fontSize}px monospace`;
      
      for (let i = 0; i < drops.length; i++) {
        const text = charArray[Math.floor(Math.random() * charArray.length)];
        ctx.fillStyle = `rgba(0, ${150 + Math.random() * 105}, ${50 + Math.random() * 50}, ${0.8 + Math.random() * 0.2})`;
        ctx.fillText(text, i * fontSize, drops[i] * fontSize);
        
        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }
    };
    
    const interval = setInterval(draw, 33);
    return () => clearInterval(interval);
  }, [isActive]);
  
  return (
    <canvas 
      ref={canvasRef} 
      className="absolute inset-0 rounded-full opacity-30"
      style={{ mixBlendMode: 'screen' }}
    />
  );
};

// Voice waveform visualization
const VoiceWaveform = ({ isListening, volume }) => {
  const bars = 20;
  
  return (
    <div className="flex items-center justify-center gap-1 h-16">
      {Array.from({ length: bars }).map((_, i) => {
        const delay = i * 0.05;
        const height = isListening 
          ? Math.max(20, Math.random() * 60 * (volume || 0.5))
          : 8;
        
        return (
          <motion.div
            key={i}
            className="w-1 rounded-full bg-gradient-to-t from-[#00ff00] to-[#00ffaa]"
            animate={{ 
              height: isListening ? [height * 0.5, height, height * 0.7] : 8,
              opacity: isListening ? 1 : 0.3
            }}
            transition={{ 
              duration: 0.15, 
              delay,
              repeat: isListening ? Infinity : 0,
              repeatType: "reverse"
            }}
          />
        );
      })}
    </div>
  );
};

export default function AloVoiceAssistant({ isOpen, onClose, isDark }) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [response, setResponse] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [volume, setVolume] = useState(0);
  const [conversationHistory, setConversationHistory] = useState([]);
  const [micPermissionGranted, setMicPermissionGranted] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false); // Minimized state
  const [aiModel, setAiModel] = useState("auto"); // "auto", "gemini", or "copilot"
  const [lastUsedModel, setLastUsedModel] = useState(""); // Track which model responded
  
  // Voice settings
  const [selectedVoice, setSelectedVoice] = useState("");
  const [voiceRate, setVoiceRate] = useState([1]);
  const [voicePitch, setVoicePitch] = useState([1]);
  const [voiceVolume, setVoiceVolume] = useState([0.8]);
  const [voiceGender, setVoiceGender] = useState("female"); // male or female
  const [availableVoices, setAvailableVoices] = useState([]);
  const [maleVoices, setMaleVoices] = useState([]);
  const [femaleVoices, setFemaleVoices] = useState([]);
  
  const recognitionRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);
  const audioContextRef = useRef(null);
  const streamRef = useRef(null);
  
  // Load and categorize available voices
  useEffect(() => {
    const loadVoices = () => {
      const voices = synthRef.current.getVoices();
      
      // Categorize voices by gender (heuristic based on name)
      const male = voices.filter(v => 
        v.name.toLowerCase().includes('male') ||
        v.name.toLowerCase().includes('david') ||
        v.name.toLowerCase().includes('james') ||
        v.name.toLowerCase().includes('mark') ||
        v.name.toLowerCase().includes('paul') ||
        v.name.toLowerCase().includes('daniel') ||
        v.name.toLowerCase().includes('george') ||
        v.name.toLowerCase().includes('richard') ||
        v.name.toLowerCase().includes('microsoft david') ||
        v.name.toLowerCase().includes('google uk english male')
      );
      
      const female = voices.filter(v => 
        v.name.toLowerCase().includes('female') ||
        v.name.toLowerCase().includes('samantha') ||
        v.name.toLowerCase().includes('victoria') ||
        v.name.toLowerCase().includes('karen') ||
        v.name.toLowerCase().includes('susan') ||
        v.name.toLowerCase().includes('zira') ||
        v.name.toLowerCase().includes('hazel') ||
        v.name.toLowerCase().includes('microsoft zira') ||
        v.name.toLowerCase().includes('google uk english female') ||
        (!v.name.toLowerCase().includes('male') && v.lang.startsWith('en'))
      );
      
      // If categorization doesn't work well, split by index
      if (male.length === 0 && female.length === 0) {
        const englishVoices = voices.filter(v => v.lang.startsWith('en'));
        const half = Math.ceil(englishVoices.length / 2);
        setMaleVoices(englishVoices.slice(0, half));
        setFemaleVoices(englishVoices.slice(half));
      } else {
        setMaleVoices(male.length > 0 ? male : voices.slice(0, 5));
        setFemaleVoices(female.length > 0 ? female : voices.slice(5, 10));
      }
      
      setAvailableVoices(voices);
      
      // Set default voice based on gender
      const defaultVoices = voiceGender === 'male' ? male : female;
      if (defaultVoices.length > 0 && !selectedVoice) {
        setSelectedVoice(defaultVoices[0].name);
      } else if (voices.length > 0 && !selectedVoice) {
        setSelectedVoice(voices[0].name);
      }
    };
    
    loadVoices();
    synthRef.current.onvoiceschanged = loadVoices;
  }, [voiceGender]);
  
  // Update selected voice when gender changes
  useEffect(() => {
    const voices = voiceGender === 'male' ? maleVoices : femaleVoices;
    if (voices.length > 0) {
      setSelectedVoice(voices[0].name);
    }
  }, [voiceGender, maleVoices, femaleVoices]);
  
  // Request microphone permission
  const requestMicPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setMicPermissionGranted(true);
      return true;
    } catch (err) {
      console.error('Microphone permission denied:', err);
      setMicPermissionGranted(false);
      return false;
    }
  };
  
  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';
      
      recognitionRef.current.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }
        
        setTranscript(finalTranscript || interimTranscript);
        
        if (finalTranscript) {
          handleUserInput(finalTranscript);
        }
      };
      
      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        if (event.error !== 'no-speech') {
          setIsListening(false);
        }
      };
      
      recognitionRef.current.onend = () => {
        if (isListening) {
          try {
            recognitionRef.current.start();
          } catch (e) {
            console.log('Recognition restart error:', e);
          }
        }
      };
    }
    
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [isListening]);
  
  // Audio analyzer for volume visualization
  useEffect(() => {
    let analyser;
    let animationId;
    
    const setupAudio = async () => {
      if (isListening && streamRef.current) {
        try {
          audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
          analyser = audioContextRef.current.createAnalyser();
          const microphone = audioContextRef.current.createMediaStreamSource(streamRef.current);
          microphone.connect(analyser);
          analyser.fftSize = 256;
          
          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          
          const updateVolume = () => {
            analyser.getByteFrequencyData(dataArray);
            const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
            setVolume(average / 255);
            animationId = requestAnimationFrame(updateVolume);
          };
          
          updateVolume();
        } catch (err) {
          console.error('Audio setup error:', err);
        }
      }
    };
    
    setupAudio();
    
    return () => {
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, [isListening]);
  
  // API URL
  const API_URL = process.env.REACT_APP_BACKEND_URL || 'https://faceconnect-api.onrender.com';
  
  // ALO responses - powered by Gemini AI + Microsoft Copilot
  const generateResponse = useCallback(async (input) => {
    const lowerInput = input.toLowerCase().trim();
    
    // Quick local responses for common commands
    if (lowerInput === 'alo' || lowerInput === 'hello alo' || lowerInput === 'hey alo' || lowerInput === 'hi alo') {
      setLastUsedModel("ALO");
      return "Hello! I'm ALO, your AI assistant powered by Google Gemini and Microsoft Copilot. How can I help you today?";
    }
    
    // Time - respond locally for speed
    if (lowerInput.includes('time') && lowerInput.length < 20) {
      setLastUsedModel("Local");
      return `The current time is ${new Date().toLocaleTimeString()}.`;
    }
    
    // Date - respond locally for speed
    if ((lowerInput.includes('date') || lowerInput === 'today') && lowerInput.length < 20) {
      setLastUsedModel("Local");
      return `Today is ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.`;
    }
    
    // For all other queries, use AI (Gemini + Copilot)
    try {
      const response = await fetch(`${API_URL}/api/assistant/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input,
          session_id: 'alo-voice-session',
          conversation_history: conversationHistory.slice(-10),
          ai_model: aiModel // "auto", "gemini", or "copilot"
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setLastUsedModel(data.model_used || data.powered_by);
        return data.response;
      }
    } catch (error) {
      console.log('AI API error, using fallback:', error);
    }
    
    // Fallback responses
    const fallbackResponses = [
      "I'm here to help! What would you like to know?",
      "That's an interesting question. Let me think about that.",
      "I understand. Is there something specific I can help you with?",
      "I'm processing that. Could you tell me more?",
    ];
    
    return fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
  }, [conversationHistory, aiModel]);
  
  // Handle user input and generate response
  const handleUserInput = useCallback(async (input) => {
    const userMessage = { role: 'user', text: input, timestamp: new Date() };
    setConversationHistory(prev => [...prev, userMessage]);
    
    // Show "thinking" state
    setResponse("Thinking...");
    
    // Get AI response (now async with Gemini)
    const aiResponse = await generateResponse(input);
    const aiMessage = { role: 'assistant', text: aiResponse, timestamp: new Date() };
    
    setConversationHistory(prev => [...prev, aiMessage]);
    setResponse(aiResponse);
    
    // Speak the response if not muted
    if (!isMuted) {
      speak(aiResponse);
    }
  }, [generateResponse, isMuted]);
  
  // Text-to-speech function
  const speak = useCallback((text) => {
    if (synthRef.current.speaking) {
      synthRef.current.cancel();
    }
    
    const utterance = new SpeechSynthesisUtterance(text);
    const voice = availableVoices.find(v => v.name === selectedVoice);
    if (voice) utterance.voice = voice;
    utterance.rate = voiceRate[0];
    utterance.pitch = voicePitch[0];
    utterance.volume = voiceVolume[0];
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    
    synthRef.current.speak(utterance);
  }, [selectedVoice, voiceRate, voicePitch, voiceVolume, availableVoices]);
  
  // Toggle listening - activated by mouse click
  const toggleListening = async () => {
    if (isListening) {
      try {
        recognitionRef.current?.stop();
      } catch (e) {}
      setIsListening(false);
    } else {
      // Request permission first if not granted
      if (!micPermissionGranted) {
        const granted = await requestMicPermission();
        if (!granted) {
          setResponse("Please allow microphone access to use voice commands.");
          if (!isMuted) speak("Please allow microphone access to use voice commands.");
          return;
        }
      }
      
      setTranscript("");
      try {
        recognitionRef.current?.start();
        setIsListening(true);
      } catch (e) {
        console.error('Failed to start recognition:', e);
      }
    }
  };
  
  // Get voices for current gender
  const currentVoices = voiceGender === 'male' ? maleVoices : femaleVoices;
  
  if (!isOpen) return null;
  
  // Minimized View - Small floating button
  if (isMinimized) {
    return (
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
        className="fixed bottom-24 right-6 z-[100]"
      >
        <motion.button
          onClick={() => setIsMinimized(false)}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          className="relative w-16 h-16 rounded-full bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] shadow-2xl border border-cyan-500/30 flex items-center justify-center group"
        >
          {/* Animated glow ring */}
          <motion.div
            className="absolute inset-0 rounded-full"
            animate={{
              boxShadow: [
                '0 0 10px rgba(6,182,212,0.3), 0 0 20px rgba(139,92,246,0.2)',
                '0 0 20px rgba(6,182,212,0.5), 0 0 40px rgba(139,92,246,0.4)',
                '0 0 10px rgba(6,182,212,0.3), 0 0 20px rgba(139,92,246,0.2)'
              ]
            }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          
          {/* Icon */}
          <motion.div
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Sparkles className="w-7 h-7 text-cyan-400" />
          </motion.div>
          
          {/* Listening indicator */}
          {isListening && (
            <motion.div
              className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-[#1a1a2e]"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.5, repeat: Infinity }}
            />
          )}
          
          {/* Expand icon on hover */}
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            whileHover={{ opacity: 1, scale: 1 }}
            className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center"
          >
            <Maximize2 className="w-6 h-6 text-white" />
          </motion.div>
          
          {/* Tooltip */}
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            Click to expand ALO
          </div>
        </motion.button>
        
        {/* Close button */}
        <motion.button
          onClick={onClose}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-lg"
        >
          <X className="w-3 h-3 text-white" />
        </motion.button>
      </motion.div>
    );
  }
  
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-[450px] rounded-3xl overflow-hidden bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] shadow-2xl border border-white/10"
        >
          {/* Animated Background Glow */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-cyan-500/20 rounded-full blur-3xl animate-pulse" />
            <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-60 h-60 bg-blue-500/10 rounded-full blur-3xl" />
          </div>
          
          {/* Header */}
          <div className="relative flex items-center justify-between p-4 border-b border-white/10 bg-white/5 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-cyan-500/25">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                {isListening && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse" />
                )}
              </div>
              <div>
                <h2 className="text-white font-bold text-xl tracking-wide flex items-center gap-2 flex-wrap">
                  ALO
                  <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 border border-cyan-500/30">
                    Gemini
                  </span>
                  <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-purple-300 border border-purple-500/30">
                    Copilot
                  </span>
                </h2>
                <p className="text-white/60 text-xs flex items-center gap-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${micPermissionGranted ? 'bg-green-400' : 'bg-yellow-400'}`} />
                  {micPermissionGranted ? 'Ready to listen' : 'Click mic to start'}
                  {lastUsedModel && <span className="ml-2 text-cyan-400/60">• {lastUsedModel}</span>}
                </p>
              </div>
            </div>
            <div className="flex gap-1">
              <Button 
                variant="ghost" 
                size="icon" 
                className={`rounded-xl ${isMuted ? 'text-red-400 bg-red-500/10' : 'text-cyan-400 hover:bg-cyan-500/10'}`}
                onClick={() => setIsMuted(!isMuted)}
                title={isMuted ? 'Unmute ALO' : 'Mute ALO'}
              >
                {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-white/70 hover:text-white hover:bg-white/10 rounded-xl"
                onClick={() => setShowSettings(!showSettings)}
              >
                <Settings className="w-5 h-5" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/10 rounded-xl"
                onClick={() => setIsMinimized(true)}
                title="Minimize ALO"
              >
                <Minimize2 className="w-5 h-5" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-white/70 hover:text-white hover:bg-white/10 rounded-xl"
                onClick={onClose}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>
          
          {/* Settings Panel */}
          <AnimatePresence>
            {showSettings && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="relative border-b border-white/10 overflow-hidden bg-white/5"
              >
                <div className="p-4 space-y-4">
                  {/* AI Model Selection */}
                  <div>
                    <label className="text-white/80 text-sm mb-2 block">AI Engine</label>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => setAiModel('auto')}
                        className={aiModel === 'auto' 
                          ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white flex-1' 
                          : 'bg-white/5 border border-white/20 text-white/70 hover:bg-white/10 flex-1'
                        }
                      >
                        🤖 Auto
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => setAiModel('gemini')}
                        className={aiModel === 'gemini' 
                          ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white flex-1' 
                          : 'bg-white/5 border border-white/20 text-white/70 hover:bg-white/10 flex-1'
                        }
                      >
                        ✨ Gemini
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => setAiModel('copilot')}
                        className={aiModel === 'copilot' 
                          ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white flex-1' 
                          : 'bg-white/5 border border-white/20 text-white/70 hover:bg-white/10 flex-1'
                        }
                      >
                        🚀 Copilot
                      </Button>
                    </div>
                    <p className="text-white/40 text-xs mt-1">
                      {aiModel === 'auto' && 'Auto selects best AI for your query'}
                      {aiModel === 'gemini' && 'Google Gemini - Great for conversations'}
                      {aiModel === 'copilot' && 'Microsoft Copilot - Great for coding & productivity'}
                    </p>
                  </div>
                  
                  {/* Voice Gender Toggle with Preview */}
                  <div>
                    <label className="text-white/80 text-sm mb-3 block flex items-center gap-2">
                      <span>Voice Gender</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300">
                        {voiceGender === 'male' ? 'Male Selected' : 'Female Selected'}
                      </span>
                    </label>
                    <div className="flex gap-2">
                      <Button
                        variant={voiceGender === 'male' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => {
                          setVoiceGender('male');
                          // Preview male voice
                          setTimeout(() => speak("Hello! This is a male voice. I'm ALO, ready to assist you."), 100);
                        }}
                        className={voiceGender === 'male' 
                          ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:from-cyan-600 hover:to-blue-600 border-0 flex-1' 
                          : 'border-white/20 text-white/70 hover:bg-white/10 hover:text-white flex-1'
                        }
                      >
                        <User className="w-4 h-4 mr-2" /> Male Voice
                      </Button>
                      <Button
                        variant={voiceGender === 'female' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => {
                          setVoiceGender('female');
                          // Preview female voice
                          setTimeout(() => speak("Hello! This is a female voice. I'm ALO, ready to assist you."), 100);
                        }}
                        className={voiceGender === 'female' 
                          ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 border-0 flex-1' 
                          : 'border-white/20 text-white/70 hover:bg-white/10 hover:text-white flex-1'
                        }
                      >
                        <UserCircle className="w-4 h-4 mr-2" /> Female Voice
                      </Button>
                    </div>
                  </div>
                  
                  {/* Voice Selection with Preview Button */}
                  <div>
                    <label className="text-white/80 text-sm mb-2 block">Select Voice</label>
                    <div className="flex gap-2">
                      <Select value={selectedVoice} onValueChange={(voice) => {
                        setSelectedVoice(voice);
                      }}>
                        <SelectTrigger className="bg-white/5 border-white/20 text-white flex-1">
                          <SelectValue placeholder="Select voice" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1a1a2e] border-white/20 max-h-48">
                          {currentVoices.map((voice) => (
                            <SelectItem 
                              key={voice.name} 
                              value={voice.name}
                              className="text-white focus:bg-cyan-500/20"
                            >
                              {voice.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        size="sm"
                        onClick={() => speak("This is how I sound with the current voice settings. How do you like it?")}
                        className="bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600 px-4"
                      >
                        <Volume2 className="w-4 h-4 mr-1" /> Preview
                      </Button>
                    </div>
                    <p className="text-white/40 text-xs mt-1">
                      {currentVoices.length} {voiceGender} voices available
                    </p>
                  </div>
                  
                  {/* Volume Control */}
                  <div>
                    <label className="text-white/80 text-sm mb-2 block">
                      ALO Volume: {Math.round(voiceVolume[0] * 100)}%
                    </label>
                    <Slider
                      value={voiceVolume}
                      onValueChange={setVoiceVolume}
                      min={0}
                      max={1}
                      step={0.1}
                      className="[&_[role=slider]]:bg-cyan-400"
                    />
                  </div>
                  
                  {/* Speed Control */}
                  <div>
                    <label className="text-white/80 text-sm mb-2 block">Speed: {voiceRate[0].toFixed(1)}x</label>
                    <Slider
                      value={voiceRate}
                      onValueChange={setVoiceRate}
                      min={0.5}
                      max={2}
                      step={0.1}
                      className="[&_[role=slider]]:bg-purple-400"
                    />
                  </div>
                  
                  {/* Pitch Control */}
                  <div>
                    <label className="text-white/80 text-sm mb-2 block">Pitch: {voicePitch[0].toFixed(1)}</label>
                    <Slider
                      value={voicePitch}
                      onValueChange={setVoicePitch}
                      min={0.5}
                      max={2}
                      step={0.1}
                      className="[&_[role=slider]]:bg-pink-400"
                    />
                  </div>
                  
                  {/* Voice Action Buttons */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      onClick={() => speak("Hello! I'm ALO, your AI assistant powered by Google Gemini. I can answer any question you have about science, history, math, technology, or anything else. Just ask me!")}
                      className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:from-cyan-600 hover:to-blue-600"
                    >
                      <Volume2 className="w-4 h-4 mr-2" /> Full Preview
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        speak("Voice settings confirmed. I'm ready to help you!");
                        setShowSettings(false);
                      }}
                      className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600"
                    >
                      ✓ Confirm Voice
                    </Button>
                  </div>
                  
                  {/* Voice Info */}
                  <div className="pt-2 border-t border-white/10">
                    <p className="text-white/50 text-xs text-center">
                      Current: {selectedVoice || 'Default'} • {voiceGender === 'male' ? '♂ Male' : '♀ Female'}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Main Content */}
          <div className="relative p-6">
            {/* Matrix Button - Click to Listen */}
            <div className="flex justify-center mb-6">
              <motion.button
                onClick={toggleListening}
                className={`relative w-44 h-44 rounded-full overflow-hidden cursor-pointer shadow-xl ${
                  isListening 
                    ? 'bg-gradient-to-br from-cyan-900 to-blue-900 shadow-cyan-500/30' 
                    : 'bg-gradient-to-br from-[#1a1a2e] to-[#16213e] shadow-purple-500/20'
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                animate={isListening ? {
                  boxShadow: ['0 0 20px rgba(6, 182, 212, 0.3)', '0 0 40px rgba(6, 182, 212, 0.5)', '0 0 20px rgba(6, 182, 212, 0.3)']
                } : {}}
                transition={isListening ? { duration: 1.5, repeat: Infinity } : {}}
              >
                {/* Animated rings when listening */}
                {isListening && (
                  <>
                    <motion.div
                      className="absolute inset-0 rounded-full border-2 border-cyan-400/50"
                      animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                    <motion.div
                      className="absolute inset-0 rounded-full border-2 border-purple-400/50"
                      animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                      transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                    />
                  </>
                )}
                
                {/* Center icon */}
                <div className="absolute inset-0 flex items-center justify-center">
                  {isListening ? (
                    <motion.div
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 0.5, repeat: Infinity }}
                    >
                      <Mic className="w-16 h-16 text-cyan-400" />
                    </motion.div>
                  ) : (
                    <div className="text-center">
                      <Mic className="w-12 h-12 text-white/60 mx-auto mb-2" />
                      <span className="text-white/40 text-xs">Tap to speak</span>
                    </div>
                  )}
                </div>
                
                {/* Volume visualizer */}
                {isListening && (
                  <motion.div
                    className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1"
                  >
                    {[...Array(5)].map((_, i) => (
                      <motion.div
                        key={i}
                        className="w-1.5 bg-gradient-to-t from-cyan-400 to-purple-400 rounded-full"
                        animate={{
                          height: [8, 8 + volume * 40 * (Math.random() + 0.5), 8]
                        }}
                        transition={{ duration: 0.15, repeat: Infinity, delay: i * 0.05 }}
                      />
                    ))}
                  </motion.div>
                )}
              </motion.button>
            </div>
            
            {/* Transcript */}
            {transcript && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 p-4 rounded-xl bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 backdrop-blur-sm"
              >
                <p className="text-cyan-400/80 text-xs mb-1 flex items-center gap-1">
                  <Mic className="w-3 h-3" /> You said:
                </p>
                <p className="text-white font-medium">{transcript}</p>
              </motion.div>
            )}
            
            {/* Response */}
            {response && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-3 p-4 rounded-xl bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 backdrop-blur-sm"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-r from-cyan-400 to-purple-500 flex items-center justify-center">
                    <Sparkles className="w-3 h-3 text-white" />
                  </div>
                  <p className="text-purple-400/80 text-xs font-semibold">ALO</p>
                  {isSpeaking && <Volume2 className="w-3 h-3 text-cyan-400 animate-pulse" />}
                  {isMuted && <VolumeX className="w-3 h-3 text-red-400" />}
                </div>
                <p className="text-white text-sm leading-relaxed">{response}</p>
              </motion.div>
            )}
          </div>
          
          {/* Footer */}
          <div className="relative px-6 pb-4">
            <div className="flex items-center justify-center gap-2 text-white/30 text-xs">
              <span className="px-2 py-1 rounded-full bg-white/5 border border-white/10">ALO v2.0</span>
              <span>•</span>
              <span>Powered by Google Gemini</span>
              <span>•</span>
              <span>FaceConnect</span>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
