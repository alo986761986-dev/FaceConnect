import { useState, useRef } from "react";
import { ArrowLeft, Sparkles, ExternalLink, Brain, Wand2, ImageIcon, FileText, Send, Mic, MicOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function CopilotPanel({ isDark, onBack, openExternalLink, token }) {
  const [messages, setMessages] = useState([
    { id: 1, text: "Hello! I'm Microsoft Copilot powered by GPT-4o. I can help you with writing, coding, analysis, and creative tasks. What would you like help with?", isAi: true }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showChat, setShowChat] = useState(false);
  
  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  const handleSendMessage = async (messageText = null) => {
    const textToSend = messageText || input.trim();
    if (!textToSend || isLoading) return;
    
    setInput("");
    
    // Add user message
    setMessages(prev => [...prev, { id: Date.now(), text: textToSend, isAi: false }]);
    setIsLoading(true);
    
    try {
      const response = await fetch(`${API_URL}/api/assistant/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          session_id: `copilot-${Date.now()}`,
          ai_model: "copilot"
        })
      });
      
      const data = await response.json();
      
      setMessages(prev => [...prev, { 
        id: Date.now() + 1, 
        text: data.response || "I apologize, but I couldn't process that request. Please try again.", 
        isAi: true 
      }]);
    } catch (error) {
      setMessages(prev => [...prev, { 
        id: Date.now() + 1, 
        text: "Sorry, I'm having trouble connecting. Please try again later.", 
        isAi: true 
      }]);
    }
    
    setIsLoading(false);
  };

  // Voice recording functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(track => track.stop());
        await transcribeAudio(audioBlob);
      };
      
      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Microphone access denied:', error);
      setMessages(prev => [...prev, { 
        id: Date.now(), 
        text: "Microphone access denied. Please allow microphone permissions to use voice input.", 
        isAi: true 
      }]);
    }
  };
  
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };
  
  const transcribeAudio = async (audioBlob) => {
    setIsTranscribing(true);
    
    try {
      const formData = new FormData();
      formData.append('file', audioBlob, 'recording.webm');
      
      const response = await fetch(`${API_URL}/api/speech/transcribe`, {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error('Transcription failed');
      }
      
      const data = await response.json();
      
      if (data.text && data.text.trim()) {
        // Automatically send the transcribed message
        handleSendMessage(data.text.trim());
      } else {
        setMessages(prev => [...prev, { 
          id: Date.now(), 
          text: "I couldn't understand that. Please try speaking again.", 
          isAi: true 
        }]);
      }
    } catch (error) {
      console.error('Transcription error:', error);
      setMessages(prev => [...prev, { 
        id: Date.now(), 
        text: "Voice transcription failed. Please try again or type your message.", 
        isAi: true 
      }]);
    }
    
    setIsTranscribing(false);
  };

  // Chat view
  if (showChat) {
    return (
      <div className="flex-1 flex flex-col" data-testid="copilot-chat-panel">
        {/* Chat Header */}
        <div className={`flex items-center justify-between p-4 border-b ${isDark ? 'border-[#2a2a2a]' : 'border-gray-200'}`}>
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setShowChat(false)}
              className={`rounded-full ${isDark ? 'hover:bg-[#2a3942]' : 'hover:bg-gray-100'}`}
              data-testid="copilot-chat-back-btn"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#0078d4] to-[#00bcf2] flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Microsoft Copilot</h3>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Powered by GPT-4o</p>
            </div>
          </div>
        </div>
        
        {/* Chat Messages */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.map((msg) => (
              <div 
                key={msg.id}
                className={`flex ${msg.isAi ? 'justify-start' : 'justify-end'}`}
              >
                <div className={`p-3 rounded-2xl max-w-[85%] ${
                  msg.isAi 
                    ? (isDark ? 'bg-[#202c33]' : 'bg-gray-100')
                    : 'bg-gradient-to-r from-[#0078d4] to-[#00bcf2] text-white'
                }`}>
                  {msg.isAi && (
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="w-4 h-4 text-[#0078d4]" />
                      <span className={`text-xs font-medium ${isDark ? 'text-[#00bcf2]' : 'text-[#0078d4]'}`}>Copilot</span>
                    </div>
                  )}
                  <p className={`text-sm whitespace-pre-wrap ${msg.isAi ? (isDark ? 'text-gray-200' : 'text-gray-800') : ''}`}>
                    {msg.text}
                  </p>
                </div>
              </div>
            ))}
            {(isLoading || isTranscribing) && (
              <div className="flex justify-start">
                <div className={`p-3 rounded-2xl ${isDark ? 'bg-[#202c33]' : 'bg-gray-100'}`}>
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#0078d4] animate-pulse" />
                    <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      {isTranscribing ? 'Transcribing...' : 'Thinking...'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
        
        {/* Chat Input with Voice */}
        <div className={`p-4 border-t ${isDark ? 'border-[#2a2a2a]' : 'border-gray-200'}`}>
          <div className={`flex items-center gap-2 p-2 rounded-full ${isDark ? 'bg-[#202c33]' : 'bg-gray-100'}`}>
            {/* Voice Input Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isLoading || isTranscribing}
              className={`rounded-full h-9 w-9 ${
                isRecording 
                  ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse' 
                  : isDark ? 'hover:bg-[#2a3942]' : 'hover:bg-gray-200'
              }`}
              data-testid="copilot-voice-btn"
            >
              {isTranscribing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isRecording ? (
                <MicOff className="w-4 h-4" />
              ) : (
                <Mic className="w-4 h-4" />
              )}
            </Button>
            
            <Input 
              placeholder={isRecording ? "Listening..." : "Ask Copilot anything..."}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              disabled={isRecording || isTranscribing}
              className={`flex-1 border-0 bg-transparent focus-visible:ring-0 ${isDark ? 'text-white placeholder:text-gray-500' : ''}`}
              data-testid="copilot-chat-input"
            />
            <Button 
              size="icon" 
              className="rounded-full bg-gradient-to-r from-[#0078d4] to-[#00bcf2] hover:opacity-90 h-9 w-9"
              onClick={() => handleSendMessage()}
              disabled={!input.trim() || isLoading || isRecording || isTranscribing}
              data-testid="copilot-chat-send-btn"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <p className={`text-xs text-center mt-2 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
            {isRecording ? '🔴 Recording... Click mic to stop' : 'Tap the mic to speak or type your message'}
          </p>
        </div>
      </div>
    );
  }

  // Main panel view
  return (
    <div className="flex-1 flex flex-col" data-testid="copilot-panel">
      {/* Copilot Header */}
      <div className={`flex items-center justify-between p-4 border-b ${isDark ? 'border-[#2a2a2a]' : 'border-gray-200'}`}>
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={onBack}
            className={`rounded-full ${isDark ? 'hover:bg-[#2a3942]' : 'hover:bg-gray-100'}`}
            data-testid="copilot-back-btn"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#0078d4] to-[#00bcf2] flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Microsoft Copilot</h3>
            <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Your AI companion</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openExternalLink('https://copilot.microsoft.com')}
            className={`text-xs ${isDark ? 'text-blue-400 hover:bg-[#2a3942]' : 'text-blue-600 hover:bg-gray-100'}`}
            data-testid="copilot-open-web"
          >
            <ExternalLink className="w-3 h-3 mr-1" />
            Open in Browser
          </Button>
        </div>
      </div>
      
      {/* Copilot Content */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Welcome Section */}
          <div className={`p-6 rounded-2xl text-center ${isDark ? 'bg-gradient-to-br from-[#0078d4]/20 to-[#00bcf2]/20' : 'bg-gradient-to-br from-blue-50 to-cyan-50'}`}>
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-[#0078d4] to-[#00bcf2] flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h2 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Microsoft Copilot
            </h2>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Your everyday AI companion for productivity, creativity, and more
            </p>
          </div>

          {/* Start Chat Button */}
          <Button
            onClick={() => setShowChat(true)}
            className="w-full py-6 bg-gradient-to-r from-[#0078d4] to-[#00bcf2] hover:from-[#006cbd] hover:to-[#00a8d6] text-white font-semibold rounded-xl"
            data-testid="copilot-start-chat-btn"
          >
            <Sparkles className="w-5 h-5 mr-2" />
            Start Chat with Copilot
          </Button>

          {/* Voice Feature Highlight */}
          <div className={`p-4 rounded-xl flex items-center gap-3 ${isDark ? 'bg-[#202c33]' : 'bg-white shadow-sm'}`}>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#0078d4] to-[#00bcf2] flex items-center justify-center">
              <Mic className="w-5 h-5 text-white" />
            </div>
            <div>
              <h4 className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>Voice Input Available</h4>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Speak to Copilot using Whisper AI transcription</p>
            </div>
          </div>

          {/* Quick Actions Grid */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: '✍️', title: 'Write', desc: 'Draft emails, essays & more', action: 'https://copilot.microsoft.com/?FORM=undexpand&showconv=1' },
              { icon: '🎨', title: 'Design', desc: 'Create images & art', action: 'https://copilot.microsoft.com/images/create' },
              { icon: '💻', title: 'Code', desc: 'Get coding help', action: 'https://copilot.microsoft.com/?FORM=undexpand&showconv=1' },
              { icon: '📊', title: 'Analyze', desc: 'Data insights & summaries', action: 'https://copilot.microsoft.com/?FORM=undexpand&showconv=1' },
            ].map((item, idx) => (
              <button
                key={idx}
                onClick={() => openExternalLink(item.action)}
                className={`p-4 rounded-xl text-left transition-all hover:scale-[1.02] ${
                  isDark 
                    ? 'bg-[#202c33] hover:bg-[#2a3942]' 
                    : 'bg-white hover:bg-gray-50 shadow-sm'
                }`}
                data-testid={`copilot-action-${item.title.toLowerCase()}`}
              >
                <span className="text-2xl mb-2 block">{item.icon}</span>
                <h4 className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>{item.title}</h4>
                <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>{item.desc}</p>
              </button>
            ))}
          </div>

          {/* Copilot Features */}
          <div className={`p-4 rounded-xl ${isDark ? 'bg-[#202c33]' : 'bg-white shadow-sm'}`}>
            <h3 className={`font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>What Copilot can do</h3>
            <div className="space-y-3">
              {[
                { icon: Brain, text: 'Answer questions with web search' },
                { icon: Wand2, text: 'Generate creative content' },
                { icon: ImageIcon, text: 'Create AI-generated images' },
                { icon: FileText, text: 'Summarize documents & articles' },
              ].map((feature, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDark ? 'bg-[#2a3942]' : 'bg-blue-50'}`}>
                    <feature.icon className={`w-4 h-4 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                  </div>
                  <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{feature.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Info Footer */}
          <p className={`text-xs text-center ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
            Chat is powered by GPT-4o • Voice by OpenAI Whisper
          </p>
        </div>
      </ScrollArea>
    </div>
  );
}
