import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, Check, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const API = process.env.REACT_APP_BACKEND_URL;

export function StoryHighlights({ userId, isOwnProfile = false }) {
  const [highlights, setHighlights] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedHighlight, setSelectedHighlight] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHighlights();
  }, [userId]);

  const fetchHighlights = async () => {
    try {
      const response = await fetch(`${API}/api/instagram/highlights/${userId}`);
      if (response.ok) {
        const data = await response.json();
        setHighlights(data);
      }
    } catch (error) {
      console.error("Error fetching highlights:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex gap-4 overflow-x-auto py-4 px-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex-shrink-0 animate-pulse">
            <div className="w-16 h-16 rounded-full bg-[var(--muted)]" />
            <div className="w-12 h-3 mt-2 mx-auto rounded bg-[var(--muted)]" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="py-4">
      <div className="flex gap-4 overflow-x-auto px-2 scrollbar-hide">
        {/* Create New Highlight Button (only for own profile) */}
        {isOwnProfile && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex-shrink-0 flex flex-col items-center"
          >
            <div className="w-16 h-16 rounded-full border-2 border-dashed border-[var(--border)] flex items-center justify-center hover:border-[var(--primary)] transition-colors">
              <Plus className="w-6 h-6 text-[var(--text-muted)]" />
            </div>
            <span className="text-xs text-[var(--text-muted)] mt-2">New</span>
          </button>
        )}

        {/* Highlights */}
        {highlights.map((highlight) => (
          <button
            key={highlight.id}
            onClick={() => setSelectedHighlight(highlight)}
            className="flex-shrink-0 flex flex-col items-center"
          >
            <div className="w-16 h-16 rounded-full p-0.5 bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500">
              <div className="w-full h-full rounded-full bg-[var(--background)] p-0.5">
                {highlight.cover_url ? (
                  <img
                    src={highlight.cover_url}
                    alt={highlight.name}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full rounded-full bg-[var(--muted)] flex items-center justify-center">
                    <Image className="w-6 h-6 text-[var(--text-muted)]" />
                  </div>
                )}
              </div>
            </div>
            <span className="text-xs text-[var(--text-primary)] mt-2 max-w-[64px] truncate">
              {highlight.name}
            </span>
          </button>
        ))}
      </div>

      {/* Create Highlight Modal */}
      <CreateHighlightModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        userId={userId}
        onCreated={fetchHighlights}
      />

      {/* View Highlight Modal */}
      <ViewHighlightModal
        highlight={selectedHighlight}
        onClose={() => setSelectedHighlight(null)}
      />
    </div>
  );
}

function CreateHighlightModal({ isOpen, onClose, userId, onCreated }) {
  const [name, setName] = useState("");
  const [selectedStories, setSelectedStories] = useState([]);
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchStories();
    }
  }, [isOpen]);

  const fetchStories = async () => {
    try {
      const response = await fetch(`${API}/api/stories?user_id=${userId}`);
      if (response.ok) {
        const data = await response.json();
        setStories(data);
      }
    } catch (error) {
      console.error("Error fetching stories:", error);
    }
  };

  const handleCreate = async () => {
    if (!name.trim() || selectedStories.length === 0) {
      toast.error("Please enter a name and select at least one story");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API}/api/instagram/highlights`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          name: name.trim(),
          story_ids: selectedStories
        })
      });

      if (response.ok) {
        toast.success("Highlight created!");
        onCreated();
        onClose();
        setName("");
        setSelectedStories([]);
      }
    } catch (error) {
      toast.error("Failed to create highlight");
    } finally {
      setLoading(false);
    }
  };

  const toggleStory = (storyId) => {
    setSelectedStories((prev) =>
      prev.includes(storyId)
        ? prev.filter((id) => id !== storyId)
        : [...prev, storyId]
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-[var(--card)] rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden"
          >
            <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
              <h3 className="font-bold text-[var(--text-primary)]">New Highlight</h3>
              <button onClick={onClose}>
                <X className="w-5 h-5 text-[var(--text-muted)]" />
              </button>
            </div>

            <div className="p-4">
              <Input
                placeholder="Highlight name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mb-4"
              />

              <p className="text-sm text-[var(--text-muted)] mb-3">Select stories</p>
              
              <div className="grid grid-cols-3 gap-2 max-h-60 overflow-y-auto">
                {stories.map((story) => (
                  <button
                    key={story.id}
                    onClick={() => toggleStory(story.id)}
                    className={`relative aspect-[9/16] rounded-lg overflow-hidden ${
                      selectedStories.includes(story.id) ? "ring-2 ring-[var(--primary)]" : ""
                    }`}
                  >
                    <img
                      src={story.media_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                    {selectedStories.includes(story.id) && (
                      <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-[var(--primary)] flex items-center justify-center">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 border-t border-[var(--border)]">
              <Button
                onClick={handleCreate}
                disabled={loading || !name.trim() || selectedStories.length === 0}
                className="w-full"
              >
                {loading ? "Creating..." : "Create Highlight"}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ViewHighlightModal({ highlight, onClose }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [stories, setStories] = useState([]);

  useEffect(() => {
    if (highlight) {
      fetchStories();
    }
  }, [highlight]);

  const fetchStories = async () => {
    // Fetch stories by IDs
    // For now, we'll show placeholder
    setStories(highlight.story_ids.map(id => ({ id, media_url: null })));
  };

  if (!highlight) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black z-50 flex items-center justify-center"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2"
        >
          <X className="w-6 h-6 text-white" />
        </button>

        <div className="text-center text-white">
          <h3 className="text-xl font-bold mb-2">{highlight.name}</h3>
          <p className="text-white/60">{highlight.story_ids.length} stories</p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export default StoryHighlights;
