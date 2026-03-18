import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  BarChart2, MessageCircle, MapPin, AtSign, 
  Clock, Smile, HelpCircle, ListChecks, X 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Sticker types
const STICKER_TYPES = [
  { id: "poll", name: "Poll", icon: BarChart2, color: "bg-pink-500" },
  { id: "question", name: "Question", icon: HelpCircle, color: "bg-purple-500" },
  { id: "quiz", name: "Quiz", icon: ListChecks, color: "bg-blue-500" },
  { id: "mention", name: "Mention", icon: AtSign, color: "bg-green-500" },
  { id: "location", name: "Location", icon: MapPin, color: "bg-red-500" },
  { id: "countdown", name: "Countdown", icon: Clock, color: "bg-orange-500" },
  { id: "emoji_slider", name: "Emoji Slider", icon: Smile, color: "bg-yellow-500" },
];

export function StoryStickerPicker({ onSelect, onClose }) {
  const [selectedType, setSelectedType] = useState(null);
  const [stickerData, setStickerData] = useState({});

  const handleStickerTypeSelect = (type) => {
    setSelectedType(type);
    setStickerData({});
  };

  const handleCreateSticker = () => {
    if (!selectedType) return;

    const sticker = {
      type: selectedType.id,
      data: stickerData,
      position: { x: 0.5, y: 0.5, width: 0.8, height: 0.15, rotation: 0 }
    };

    onSelect(sticker);
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 50 }}
      className="fixed bottom-0 left-0 right-0 bg-[var(--card)] rounded-t-3xl p-6 z-50 max-h-[70vh] overflow-y-auto"
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-[var(--text-primary)]">Add Sticker</h3>
        <button onClick={onClose}>
          <X className="w-6 h-6 text-[var(--text-muted)]" />
        </button>
      </div>

      {!selectedType ? (
        <div className="grid grid-cols-4 gap-4">
          {STICKER_TYPES.map((type) => (
            <button
              key={type.id}
              onClick={() => handleStickerTypeSelect(type)}
              className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-[var(--muted)] transition-colors"
            >
              <div className={`w-12 h-12 rounded-full ${type.color} flex items-center justify-center`}>
                <type.icon className="w-6 h-6 text-white" />
              </div>
              <span className="text-xs text-[var(--text-primary)]">{type.name}</span>
            </button>
          ))}
        </div>
      ) : (
        <StickerEditor
          type={selectedType}
          data={stickerData}
          onChange={setStickerData}
          onBack={() => setSelectedType(null)}
          onCreate={handleCreateSticker}
        />
      )}
    </motion.div>
  );
}

function StickerEditor({ type, data, onChange, onBack, onCreate }) {
  switch (type.id) {
    case "poll":
      return (
        <PollEditor data={data} onChange={onChange} onBack={onBack} onCreate={onCreate} />
      );
    case "question":
      return (
        <QuestionEditor data={data} onChange={onChange} onBack={onBack} onCreate={onCreate} />
      );
    case "quiz":
      return (
        <QuizEditor data={data} onChange={onChange} onBack={onBack} onCreate={onCreate} />
      );
    case "emoji_slider":
      return (
        <EmojiSliderEditor data={data} onChange={onChange} onBack={onBack} onCreate={onCreate} />
      );
    case "countdown":
      return (
        <CountdownEditor data={data} onChange={onChange} onBack={onBack} onCreate={onCreate} />
      );
    default:
      return (
        <div className="text-center py-8">
          <p className="text-[var(--text-muted)]">Coming soon</p>
          <Button onClick={onBack} variant="outline" className="mt-4">Back</Button>
        </div>
      );
  }
}

function PollEditor({ data, onChange, onBack, onCreate }) {
  return (
    <div className="space-y-4">
      <button onClick={onBack} className="text-[var(--primary)] text-sm">← Back</button>
      
      <Input
        placeholder="Ask a question..."
        value={data.question || ""}
        onChange={(e) => onChange({ ...data, question: e.target.value })}
      />
      
      <Input
        placeholder="Option 1"
        value={data.option1 || ""}
        onChange={(e) => onChange({ ...data, option1: e.target.value })}
      />
      
      <Input
        placeholder="Option 2"
        value={data.option2 || ""}
        onChange={(e) => onChange({ ...data, option2: e.target.value })}
      />
      
      <Button 
        onClick={onCreate} 
        className="w-full"
        disabled={!data.question || !data.option1 || !data.option2}
      >
        Add Poll
      </Button>
    </div>
  );
}

function QuestionEditor({ data, onChange, onBack, onCreate }) {
  return (
    <div className="space-y-4">
      <button onClick={onBack} className="text-[var(--primary)] text-sm">← Back</button>
      
      <Input
        placeholder="Ask me anything..."
        value={data.question || ""}
        onChange={(e) => onChange({ ...data, question: e.target.value })}
      />
      
      <Button 
        onClick={onCreate} 
        className="w-full"
        disabled={!data.question}
      >
        Add Question
      </Button>
    </div>
  );
}

function QuizEditor({ data, onChange, onBack, onCreate }) {
  const [options, setOptions] = useState(data.options || ["", "", "", ""]);
  const [correctIndex, setCorrectIndex] = useState(data.correctIndex || 0);

  const updateOption = (index, value) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
    onChange({ ...data, options: newOptions, correctIndex });
  };

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="text-[var(--primary)] text-sm">← Back</button>
      
      <Input
        placeholder="Quiz question..."
        value={data.question || ""}
        onChange={(e) => onChange({ ...data, question: e.target.value, options, correctIndex })}
      />
      
      {options.map((opt, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            type="radio"
            name="correct"
            checked={correctIndex === i}
            onChange={() => {
              setCorrectIndex(i);
              onChange({ ...data, options, correctIndex: i });
            }}
            className="text-[var(--primary)]"
          />
          <Input
            placeholder={`Option ${i + 1}`}
            value={opt}
            onChange={(e) => updateOption(i, e.target.value)}
            className="flex-1"
          />
        </div>
      ))}
      <p className="text-xs text-[var(--text-muted)]">Select the correct answer</p>
      
      <Button 
        onClick={onCreate} 
        className="w-full"
        disabled={!data.question || options.filter(o => o).length < 2}
      >
        Add Quiz
      </Button>
    </div>
  );
}

function EmojiSliderEditor({ data, onChange, onBack, onCreate }) {
  return (
    <div className="space-y-4">
      <button onClick={onBack} className="text-[var(--primary)] text-sm">← Back</button>
      
      <Input
        placeholder="How much do you...?"
        value={data.question || ""}
        onChange={(e) => onChange({ ...data, question: e.target.value })}
      />
      
      <div className="flex items-center gap-4">
        <span className="text-sm text-[var(--text-muted)]">Emoji:</span>
        <div className="flex gap-2">
          {["😍", "🔥", "😂", "😢", "👏", "💯"].map((emoji) => (
            <button
              key={emoji}
              onClick={() => onChange({ ...data, emoji })}
              className={`text-2xl p-2 rounded-lg ${data.emoji === emoji ? "bg-[var(--primary)]/20" : ""}`}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
      
      <Button 
        onClick={onCreate} 
        className="w-full"
        disabled={!data.question || !data.emoji}
      >
        Add Emoji Slider
      </Button>
    </div>
  );
}

function CountdownEditor({ data, onChange, onBack, onCreate }) {
  return (
    <div className="space-y-4">
      <button onClick={onBack} className="text-[var(--primary)] text-sm">← Back</button>
      
      <Input
        placeholder="Countdown name..."
        value={data.name || ""}
        onChange={(e) => onChange({ ...data, name: e.target.value })}
      />
      
      <Input
        type="datetime-local"
        value={data.endTime || ""}
        onChange={(e) => onChange({ ...data, endTime: e.target.value })}
      />
      
      <Button 
        onClick={onCreate} 
        className="w-full"
        disabled={!data.name || !data.endTime}
      >
        Add Countdown
      </Button>
    </div>
  );
}

// Sticker display components
export function PollSticker({ data, onVote, results }) {
  const [voted, setVoted] = useState(null);
  const totalVotes = results ? Object.keys(results).length : 0;
  
  const getPercentage = (optionIndex) => {
    if (!results || totalVotes === 0) return 0;
    const votes = Object.values(results).filter(v => v === optionIndex).length;
    return Math.round((votes / totalVotes) * 100);
  };

  const handleVote = (index) => {
    if (voted !== null) return;
    setVoted(index);
    onVote?.(index);
  };

  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-4 w-full max-w-xs">
      <p className="font-semibold text-gray-900 mb-3">{data.question}</p>
      
      {[data.option1, data.option2].map((option, i) => (
        <button
          key={i}
          onClick={() => handleVote(i)}
          disabled={voted !== null}
          className={`w-full mb-2 p-3 rounded-xl text-left relative overflow-hidden ${
            voted === i ? "bg-pink-500 text-white" : "bg-gray-100 text-gray-900"
          }`}
        >
          {voted !== null && (
            <div 
              className="absolute inset-y-0 left-0 bg-pink-200/50 transition-all"
              style={{ width: `${getPercentage(i)}%` }}
            />
          )}
          <span className="relative z-10 flex justify-between">
            <span>{option}</span>
            {voted !== null && <span>{getPercentage(i)}%</span>}
          </span>
        </button>
      ))}
    </div>
  );
}

export function QuestionSticker({ data, onAnswer }) {
  const [answer, setAnswer] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (!answer.trim()) return;
    setSubmitted(true);
    onAnswer?.(answer);
  };

  return (
    <div className="bg-purple-500/90 backdrop-blur-sm rounded-2xl p-4 w-full max-w-xs">
      <p className="font-semibold text-white mb-3">{data.question}</p>
      
      {!submitted ? (
        <div className="flex gap-2">
          <input
            type="text"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Type your answer..."
            className="flex-1 px-3 py-2 rounded-lg bg-white/20 text-white placeholder-white/60 border-0"
          />
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-white text-purple-500 rounded-lg font-medium"
          >
            Send
          </button>
        </div>
      ) : (
        <p className="text-white/80 text-sm">Thanks for your response!</p>
      )}
    </div>
  );
}

export function EmojiSliderSticker({ data, onSlide }) {
  const [value, setValue] = useState(0.5);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    setSubmitted(true);
    onSlide?.(value);
  };

  return (
    <div className="bg-gradient-to-r from-yellow-400 to-orange-500 rounded-2xl p-4 w-full max-w-xs">
      <p className="font-semibold text-white mb-4">{data.question}</p>
      
      <div className="relative">
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={value}
          onChange={(e) => setValue(parseFloat(e.target.value))}
          onMouseUp={handleSubmit}
          onTouchEnd={handleSubmit}
          disabled={submitted}
          className="w-full h-2 bg-white/30 rounded-full appearance-none cursor-pointer"
        />
        <div 
          className="absolute top-1/2 -translate-y-1/2 text-2xl pointer-events-none transition-all"
          style={{ left: `${value * 100}%`, transform: `translateX(-50%) translateY(-50%) scale(${1 + value * 0.5})` }}
        >
          {data.emoji}
        </div>
      </div>
    </div>
  );
}

export default StoryStickerPicker;
