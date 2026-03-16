import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Bot, Sparkles, MessageSquare, Image as ImageIcon,
  Shield, Trash2, ToggleLeft, ToggleRight, Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/context/AuthContext";
import { useSettings } from "@/context/SettingsContext";
import { haptic } from "@/utils/mobile";

const API_URL = process.env.REACT_APP_BACKEND_URL;

/**
 * AISettings Component
 * Controls for AI features including:
 * - Enable/disable AI features globally
 * - Smart suggestions toggle
 * - AI history management
 * - Privacy controls
 */

export default function AISettings() {
  const { token } = useAuth();
  const { isDark, settings, updateSetting } = useSettings();
  
  const [clearing, setClearing] = useState(false);

  const aiSettings = {
    aiFeatures: settings?.aiFeatures !== false,
    smartSuggestions: settings?.smartSuggestions !== false,
    quickReplies: settings?.quickReplies !== false,
    aiImageGen: settings?.aiImageGen !== false,
    emotionalSupport: settings?.emotionalSupport !== false
  };

  const handleToggle = (key) => {
    updateSetting(key, !aiSettings[key]);
    haptic.light();
    toast.success(`${key} ${!aiSettings[key] ? 'enabled' : 'disabled'}`);
  };

  const clearAIHistory = async () => {
    if (!window.confirm("This will delete all your AI interaction history. Continue?")) return;
    
    setClearing(true);
    haptic.warning();
    
    try {
      const response = await fetch(`${API_URL}/api/ai/history?token=${token}`, {
        method: "DELETE"
      });
      
      if (response.ok) {
        toast.success("AI history cleared");
      } else {
        throw new Error("Failed to clear");
      }
    } catch (error) {
      toast.error("Failed to clear AI history");
    } finally {
      setClearing(false);
    }
  };

  const settingItems = [
    {
      key: "aiFeatures",
      icon: Bot,
      title: "AI Features",
      description: "Enable or disable all AI-powered features",
      color: "from-[#00F0FF] to-[#7000FF]"
    },
    {
      key: "smartSuggestions",
      icon: Sparkles,
      title: "Smart Suggestions",
      description: "AI-powered text completion while typing",
      color: "from-[#00F0FF] to-[#00D9FF]",
      requires: "aiFeatures"
    },
    {
      key: "quickReplies",
      icon: MessageSquare,
      title: "Quick Replies",
      description: "AI-generated reply suggestions in chat",
      color: "from-[#7000FF] to-[#9000FF]",
      requires: "aiFeatures"
    },
    {
      key: "aiImageGen",
      icon: ImageIcon,
      title: "AI Image Generation",
      description: "Create images from text descriptions",
      color: "from-[#FF6B6B] to-[#FFE66D]",
      requires: "aiFeatures"
    },
    {
      key: "emotionalSupport",
      icon: Shield,
      title: "Emotional Support Mode",
      description: "Access to supportive AI companion",
      color: "from-[#FF758C] to-[#FF7EB3]",
      requires: "aiFeatures"
    }
  ];

  return (
    <div className="space-y-4">
      {/* Main Toggle */}
      <div className={`p-4 rounded-xl ${isDark ? 'bg-[#1A1A1A]' : 'bg-white shadow'}`}>
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl bg-gradient-to-r from-[#00F0FF] to-[#7000FF] flex items-center justify-center`}>
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              AI Assistant
            </h3>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Powered by GPT-5.2 & Gemini
            </p>
          </div>
          <Switch
            checked={aiSettings.aiFeatures}
            onCheckedChange={() => handleToggle("aiFeatures")}
            data-testid="ai-features-toggle"
          />
        </div>
      </div>

      {/* Feature Toggles */}
      <motion.div
        animate={{ opacity: aiSettings.aiFeatures ? 1 : 0.5 }}
        className="space-y-2"
      >
        {settingItems.slice(1).map((item) => {
          const Icon = item.icon;
          const isEnabled = aiSettings[item.key] && (!item.requires || aiSettings[item.requires]);
          const isDisabled = item.requires && !aiSettings[item.requires];
          
          return (
            <div
              key={item.key}
              className={`p-3 rounded-xl ${isDark ? 'bg-[#1A1A1A]' : 'bg-white shadow'} ${
                isDisabled ? 'opacity-50' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-r ${item.color} flex items-center justify-center`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <h4 className={`font-medium text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {item.title}
                  </h4>
                  <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                    {item.description}
                  </p>
                </div>
                <Switch
                  checked={isEnabled}
                  onCheckedChange={() => handleToggle(item.key)}
                  disabled={isDisabled}
                  data-testid={`${item.key}-toggle`}
                />
              </div>
            </div>
          );
        })}
      </motion.div>

      {/* Privacy Section */}
      <div className={`p-4 rounded-xl ${isDark ? 'bg-[#1A1A1A]' : 'bg-white shadow'}`}>
        <h3 className={`font-semibold mb-3 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          <Shield className="w-5 h-5 text-[#00F0FF]" />
          Privacy & Data
        </h3>
        
        <div className={`p-3 rounded-lg mb-3 flex items-start gap-2 ${isDark ? 'bg-[#0A0A0A]' : 'bg-gray-50'}`}>
          <Info className="w-4 h-4 mt-0.5 text-[#00F0FF]" />
          <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            AI interactions are processed securely. Your data is not used to train AI models. 
            You can clear your AI history at any time.
          </p>
        </div>
        
        <Button
          variant="outline"
          onClick={clearAIHistory}
          disabled={clearing}
          className={`w-full ${isDark ? 'border-red-500/30 text-red-400 hover:bg-red-500/10' : 'border-red-300 text-red-600'}`}
          data-testid="clear-ai-history-btn"
        >
          {clearing ? (
            <span className="animate-pulse">Clearing...</span>
          ) : (
            <>
              <Trash2 className="w-4 h-4 mr-2" />
              Clear AI History
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
