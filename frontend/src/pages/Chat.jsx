import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle } from "lucide-react";
import ConversationList from "@/components/chat/ConversationList";
import ChatView from "@/components/chat/ChatView";
import BottomNav from "@/components/BottomNav";
import NetworkStatus from "@/components/NetworkStatus";
import { useAuth } from "@/context/AuthContext";

export default function Chat() {
  const { user } = useAuth();
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [showChatView, setShowChatView] = useState(false);

  const handleSelectConversation = (conversation) => {
    setSelectedConversation(conversation);
    setShowChatView(true);
  };

  const handleBack = () => {
    setShowChatView(false);
    setSelectedConversation(null);
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--background)' }}>
      <NetworkStatus />
      
      {/* Desktop Layout */}
      <div className="hidden sm:flex flex-1">
        {/* Sidebar - Conversation List */}
        <div className="w-80 flex-shrink-0" style={{ borderRight: '1px solid var(--border)' }}>
          <ConversationList
            onSelectConversation={handleSelectConversation}
            selectedId={selectedConversation?.id}
          />
        </div>

        {/* Main Chat Area */}
        <div className="flex-1">
          {selectedConversation ? (
            <ChatView
              conversation={selectedConversation}
              onBack={handleBack}
            />
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-4">
              <div className="w-20 h-20 rounded-full flex items-center justify-center mb-4" style={{ background: 'var(--muted)' }}>
                <MessageCircle className="w-10 h-10" style={{ color: 'var(--text-muted)' }} />
              </div>
              <h3 className="text-xl font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Welcome to Messages</h3>
              <p className="max-w-sm" style={{ color: 'var(--text-secondary)' }}>
                Select a conversation from the sidebar to start chatting, or create a new one.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="sm:hidden flex-1 pb-20">
        <AnimatePresence mode="wait">
          {showChatView ? (
            <motion.div
              key="chat-view"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "tween", duration: 0.2 }}
              className="fixed inset-0 z-30"
              style={{ background: 'var(--background)' }}
            >
              <ChatView
                conversation={selectedConversation}
                onBack={handleBack}
              />
            </motion.div>
          ) : (
            <motion.div
              key="conversation-list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full"
            >
              <ConversationList
                onSelectConversation={handleSelectConversation}
                selectedId={selectedConversation?.id}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Navigation - Mobile Only */}
      {!showChatView && <BottomNav />}
    </div>
  );
}
