import { ArrowLeft, Bot, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function AIPanel({ 
  isDark, 
  onBack, 
  aiMessages, 
  aiInput, 
  setAiInput, 
  handleSendAiMessage 
}) {
  return (
    <div className="flex-1 flex flex-col" data-testid="ai-panel">
      {/* AI Header with Back Button */}
      <div className={`flex items-center justify-between p-4 border-b ${isDark ? 'border-[#2a2a2a]' : 'border-gray-200'}`}>
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={onBack}
            className={`rounded-full ${isDark ? 'hover:bg-[#2a3942]' : 'hover:bg-gray-100'}`}
            data-testid="ai-back-btn"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00a884] to-[#0088cc] flex items-center justify-center">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>FaceConnect AI</h3>
            <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Always here to help</p>
          </div>
        </div>
      </div>
      
      {/* AI Chat Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {aiMessages.map((msg) => (
            <div 
              key={msg.id}
              className={`flex ${msg.isAi ? 'justify-start' : 'justify-end'}`}
            >
              <div className={`p-3 rounded-2xl max-w-[85%] ${
                msg.isAi 
                  ? (isDark ? 'bg-[#202c33]' : 'bg-gray-100')
                  : 'bg-[#00a884] text-white'
              }`}>
                {msg.isAi && (
                  <div className="flex items-center gap-2 mb-2">
                    <Bot className="w-4 h-4 text-[#00a884]" />
                    <span className={`text-xs font-medium ${isDark ? 'text-[#00a884]' : 'text-[#00a884]'}`}>AI Assistant</span>
                  </div>
                )}
                <p className={`text-sm whitespace-pre-wrap ${msg.isAi ? (isDark ? 'text-gray-200' : 'text-gray-800') : ''}`}>
                  {msg.text}
                </p>
              </div>
            </div>
          ))}
        </div>
        
        {/* Quick Actions (only show if no user messages yet) */}
        {aiMessages.length === 1 && (
          <div className="mt-4 space-y-2">
            <p className={`text-xs uppercase font-medium mb-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Quick Actions</p>
            {[
              { text: 'Help me write a message', icon: '✍️' },
              { text: 'Translate to another language', icon: '🌐' },
              { text: 'Summarize my conversations', icon: '📝' },
              { text: 'Generate creative ideas', icon: '💡' },
            ].map((action, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setAiInput(action.text);
                  handleSendAiMessage();
                }}
                className={`w-full p-3 rounded-xl text-left text-sm transition-all flex items-center gap-3 ${
                  isDark 
                    ? 'bg-[#202c33] text-gray-300 hover:bg-[#2a3942]' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                data-testid={`ai-quick-action-${idx}`}
              >
                <span className="text-xl">{action.icon}</span>
                {action.text}
              </button>
            ))}
          </div>
        )}
      </ScrollArea>
      
      {/* AI Input */}
      <div className={`p-4 border-t ${isDark ? 'border-[#2a2a2a]' : 'border-gray-200'}`}>
        <div className={`flex items-center gap-2 p-2 rounded-full ${isDark ? 'bg-[#202c33]' : 'bg-gray-100'}`}>
          <Input 
            placeholder="Ask FaceConnect AI anything..."
            value={aiInput}
            onChange={(e) => setAiInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendAiMessage()}
            className={`flex-1 border-0 bg-transparent focus-visible:ring-0 ${isDark ? 'text-white placeholder:text-gray-500' : ''}`}
            data-testid="ai-input"
          />
          <Button 
            size="icon" 
            className="rounded-full bg-[#00a884] hover:bg-[#00a884]/90 h-9 w-9"
            onClick={handleSendAiMessage}
            disabled={!aiInput.trim()}
            data-testid="ai-send-btn"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        <p className={`text-xs text-center mt-2 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
          AI responses are generated and may not always be accurate
        </p>
      </div>
    </div>
  );
}
