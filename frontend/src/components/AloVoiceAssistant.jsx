import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Volume2, Settings, X, Sparkles } from "lucide-react";
import { Button } from "./ui/button";
import { Slider } from "./ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

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
  
  // Voice settings
  const [selectedVoice, setSelectedVoice] = useState("");
  const [voiceRate, setVoiceRate] = useState([1]);
  const [voicePitch, setVoicePitch] = useState([1]);
  const [availableVoices, setAvailableVoices] = useState([]);
  
  const recognitionRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);
  
  // Load available voices
  useEffect(() => {
    const loadVoices = () => {
      const voices = synthRef.current.getVoices();
      const goodVoices = voices.filter(v => 
        v.lang.startsWith('en') || 
        v.name.includes('Google') || 
        v.name.includes('Microsoft') ||
        v.name.includes('Samantha') ||
        v.name.includes('Alex')
      );
      setAvailableVoices(goodVoices.length > 0 ? goodVoices : voices.slice(0, 10));
      if (goodVoices.length > 0 && !selectedVoice) {
        setSelectedVoice(goodVoices[0].name);
      }
    };
    
    loadVoices();
    synthRef.current.onvoiceschanged = loadVoices;
  }, []);
  
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
        setIsListening(false);
      };
      
      recognitionRef.current.onend = () => {
        if (isListening) {
          recognitionRef.current.start();
        }
      };
    }
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [isListening]);
  
  // Audio analyzer for volume visualization
  useEffect(() => {
    let audioContext;
    let analyser;
    let microphone;
    let animationId;
    
    const setupAudio = async () => {
      if (isListening) {
        try {
          audioContext = new (window.AudioContext || window.webkitAudioContext)();
          analyser = audioContext.createAnalyser();
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          microphone = audioContext.createMediaStreamSource(stream);
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
      if (audioContext) audioContext.close();
    };
  }, [isListening]);
  
  // ALO responses based on user input
  const generateResponse = useCallback((input) => {
    const lowerInput = input.toLowerCase();
    
    // Greetings
    if (lowerInput.includes('hello') || lowerInput.includes('hi') || lowerInput.includes('hey')) {
      return "Hello! I'm ALO, your personal voice assistant. How can I help you today?";
    }
    
    // Name
    if (lowerInput.includes('your name') || lowerInput.includes('who are you')) {
      return "I am ALO, your advanced voice assistant powered by FaceConnect. I'm here to help you with anything you need!";
    }
    
    // Time
    if (lowerInput.includes('time')) {
      return `The current time is ${new Date().toLocaleTimeString()}.`;
    }
    
    // Date
    if (lowerInput.includes('date') || lowerInput.includes('today')) {
      return `Today is ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.`;
    }
    
    // Weather (simulated)
    if (lowerInput.includes('weather')) {
      return "I don't have access to real-time weather data, but I can help you open a weather website. Would you like me to do that?";
    }
    
    // Jokes
    if (lowerInput.includes('joke') || lowerInput.includes('funny')) {
      const jokes = [
        "Why do programmers prefer dark mode? Because light attracts bugs!",
        "Why did the developer go broke? Because he used up all his cache!",
        "There are only 10 types of people in the world: those who understand binary and those who don't.",
        "A SQL query walks into a bar, walks up to two tables and asks, 'Can I join you?'",
      ];
      return jokes[Math.floor(Math.random() * jokes.length)];
    }
    
    // Thank you
    if (lowerInput.includes('thank')) {
      return "You're welcome! Is there anything else I can help you with?";
    }
    
    // Goodbye
    if (lowerInput.includes('bye') || lowerInput.includes('goodbye')) {
      return "Goodbye! It was nice talking to you. Have a great day!";
    }
    
    // Help
    if (lowerInput.includes('help') || lowerInput.includes('what can you do')) {
      return "I can help you with many things! Try asking me about the time, date, tell you a joke, or just have a conversation. I'm always learning new things!";
    }
    
    // Music
    if (lowerInput.includes('music') || lowerInput.includes('song')) {
      return "I'd love to play music for you! You can use the social links to open YouTube or Spotify for your favorite tunes.";
    }
    
    // Default responses
    const defaultResponses = [
      "That's interesting! Tell me more about that.",
      "I understand. Is there something specific I can help you with?",
      "I'm processing that information. What would you like to know?",
      "That's a great question! Let me think about the best way to help you.",
      "I'm here to assist you. Could you provide more details?",
    ];
    
    return defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
  }, []);
  
  // Handle user input and generate response
  const handleUserInput = useCallback((input) => {
    const userMessage = { role: 'user', text: input, timestamp: new Date() };
    const aiResponse = generateResponse(input);
    const aiMessage = { role: 'assistant', text: aiResponse, timestamp: new Date() };
    
    setConversationHistory(prev => [...prev, userMessage, aiMessage]);
    setResponse(aiResponse);
    
    // Speak the response
    speak(aiResponse);
  }, [generateResponse]);
  
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
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    
    synthRef.current.speak(utterance);
  }, [selectedVoice, voiceRate, voicePitch, availableVoices]);
  
  // Toggle listening
  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      setTranscript("");
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };
  
  if (!isOpen) return null;
  
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
          className={`relative w-[400px] rounded-3xl overflow-hidden ${isDark ? 'bg-[#0a0a0a]' : 'bg-gray-900'} shadow-2xl border border-[#00ff00]/20`}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-[#00ff00]/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00ff00] to-[#00aa00] flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-black" />
              </div>
              <div>
                <h2 className="text-[#00ff00] font-bold text-lg tracking-wider">ALO</h2>
                <p className="text-[#00ff00]/60 text-xs">Voice Assistant</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-[#00ff00] hover:bg-[#00ff00]/10"
                onClick={() => setShowSettings(!showSettings)}
              >
                <Settings className="w-5 h-5" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-[#00ff00] hover:bg-[#00ff00]/10"
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
                className="border-b border-[#00ff00]/20 overflow-hidden"
              >
                <div className="p-4 space-y-4">
                  <div>
                    <label className="text-[#00ff00]/80 text-sm mb-2 block">Voice</label>
                    <Select value={selectedVoice} onValueChange={setSelectedVoice}>
                      <SelectTrigger className="bg-black/50 border-[#00ff00]/30 text-[#00ff00]">
                        <SelectValue placeholder="Select voice" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-900 border-[#00ff00]/30">
                        {availableVoices.map((voice) => (
                          <SelectItem 
                            key={voice.name} 
                            value={voice.name}
                            className="text-[#00ff00] focus:bg-[#00ff00]/20"
                          >
                            {voice.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="text-[#00ff00]/80 text-sm mb-2 block">Speed: {voiceRate[0].toFixed(1)}x</label>
                    <Slider
                      value={voiceRate}
                      onValueChange={setVoiceRate}
                      min={0.5}
                      max={2}
                      step={0.1}
                      className="[&_[role=slider]]:bg-[#00ff00]"
                    />
                  </div>
                  
                  <div>
                    <label className="text-[#00ff00]/80 text-sm mb-2 block">Pitch: {voicePitch[0].toFixed(1)}</label>
                    <Slider
                      value={voicePitch}
                      onValueChange={setVoicePitch}
                      min={0.5}
                      max={2}
                      step={0.1}
                      className="[&_[role=slider]]:bg-[#00ff00]"
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Main Content */}
          <div className="p-6">
            {/* Matrix Button */}
            <div className="flex justify-center mb-6">
              <motion.button
                onClick={toggleListening}
                className={`relative w-40 h-40 rounded-full overflow-hidden ${
                  isListening 
                    ? 'bg-gradient-to-br from-[#001100] to-[#003300]' 
                    : 'bg-gradient-to-br from-[#0a0a0a] to-[#1a1a1a]'
                } border-2 ${isListening ? 'border-[#00ff00]' : 'border-[#00ff00]/30'} shadow-lg ${
                  isListening ? 'shadow-[#00ff00]/50' : ''
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                animate={isListening ? { 
                  boxShadow: ['0 0 20px #00ff00', '0 0 40px #00ff00', '0 0 20px #00ff00']
                } : {}}
                transition={{ duration: 1, repeat: isListening ? Infinity : 0 }}
              >
                <MatrixRain isActive={isListening} />
                
                <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
                  {isListening ? (
                    <Mic className="w-12 h-12 text-[#00ff00] animate-pulse" />
                  ) : (
                    <MicOff className="w-12 h-12 text-[#00ff00]/50" />
                  )}
                  <span className={`text-sm mt-2 font-mono ${isListening ? 'text-[#00ff00]' : 'text-[#00ff00]/50'}`}>
                    {isListening ? 'LISTENING...' : 'TAP TO SPEAK'}
                  </span>
                </div>
                
                {/* Pulse rings */}
                {isListening && (
                  <>
                    <motion.div
                      className="absolute inset-0 rounded-full border-2 border-[#00ff00]"
                      animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    />
                    <motion.div
                      className="absolute inset-0 rounded-full border-2 border-[#00ff00]"
                      animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
                    />
                  </>
                )}
              </motion.button>
            </div>
            
            {/* Waveform */}
            <VoiceWaveform isListening={isListening} volume={volume} />
            
            {/* Transcript */}
            {transcript && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 p-3 rounded-lg bg-[#00ff00]/10 border border-[#00ff00]/20"
              >
                <p className="text-[#00ff00]/60 text-xs mb-1">You said:</p>
                <p className="text-[#00ff00] font-mono">{transcript}</p>
              </motion.div>
            )}
            
            {/* Response */}
            {response && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-3 p-3 rounded-lg bg-[#003300]/30 border border-[#00ff00]/30"
              >
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-[#00ff00]/60 text-xs">ALO:</p>
                  {isSpeaking && <Volume2 className="w-3 h-3 text-[#00ff00] animate-pulse" />}
                </div>
                <p className="text-[#00ff00] font-mono text-sm">{response}</p>
              </motion.div>
            )}
          </div>
          
          {/* Footer */}
          <div className="px-6 pb-4">
            <p className="text-[#00ff00]/30 text-xs text-center font-mono">
              ALO v1.0 • Powered by FaceConnect
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
