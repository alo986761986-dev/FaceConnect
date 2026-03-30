import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, RefreshCw, ArrowRight, Calendar as CalendarIcon } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

export default function MessageSearchModal({ 
  isOpen, 
  onClose, 
  isDark, 
  chats = [],
  token,
  onGoToMessage
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchDate, setSearchDate] = useState(null);
  const [selectedChat, setSelectedChat] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim() && !searchDate) return;
    
    setIsSearching(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.append('query', searchQuery.trim());
      if (searchDate) params.append('date', searchDate.toISOString().split('T')[0]);
      if (selectedChat) params.append('chat_id', selectedChat.id);
      params.append('token', token);
      
      const res = await fetch(`${API_URL}/api/messages/search?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.results || []);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleGoToMessage = (result) => {
    onGoToMessage?.(result);
    onClose();
  };

  const handleClose = () => {
    setSearchQuery('');
    setSearchDate(null);
    setSelectedChat(null);
    setSearchResults([]);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", duration: 0.4 }}
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-2xl max-h-[85vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col ${
              isDark ? 'bg-[#1f2c34]' : 'bg-white'
            }`}
          >
            {/* Header */}
            <div className={`p-6 border-b ${isDark ? 'border-[#2a3942]' : 'border-gray-200'}`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500">
                    <Search className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      Message Search
                    </h3>
                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      Search all messages by text or date
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  className={`p-2 rounded-full ${isDark ? 'hover:bg-[#2a3942]' : 'hover:bg-gray-100'}`}
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              {/* Search Filters */}
              <div className="space-y-4">
                {/* Chat Filter */}
                <div>
                  <label className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    Search in:
                  </label>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    <button
                      onClick={() => setSelectedChat(null)}
                      className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                        selectedChat === null
                          ? 'bg-[#00E676] text-white'
                          : isDark ? 'bg-[#2a3942] text-gray-300' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      All Chats
                    </button>
                    {chats.slice(0, 5).map(chat => (
                      <button
                        key={chat.id}
                        onClick={() => setSelectedChat(chat)}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2 ${
                          selectedChat?.id === chat.id
                            ? 'bg-[#00E676] text-white'
                            : isDark ? 'bg-[#2a3942] text-gray-300' : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        <Avatar className="w-5 h-5">
                          <AvatarImage src={chat.avatar} />
                          <AvatarFallback className="text-[8px]">{chat.name?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        {chat.name?.split(' ')[0]}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Text Search */}
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      Search text:
                    </label>
                    <div className={`flex items-center mt-2 px-4 py-3 rounded-xl ${
                      isDark ? 'bg-[#2a3942]' : 'bg-gray-100'
                    }`}>
                      <Search className="w-5 h-5 text-gray-400 mr-3" />
                      <input
                        type="text"
                        placeholder="Enter keywords..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        className={`flex-1 bg-transparent border-0 focus:outline-none ${
                          isDark ? 'text-white placeholder:text-gray-500' : 'text-gray-900 placeholder:text-gray-400'
                        }`}
                      />
                      {searchQuery && (
                        <button onClick={() => setSearchQuery('')}>
                          <X className="w-4 h-4 text-gray-400" />
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {/* Date Picker */}
                  <div>
                    <label className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      Date:
                    </label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          className={`mt-2 flex items-center gap-2 px-4 py-3 rounded-xl transition-colors ${
                            isDark ? 'bg-[#2a3942] hover:bg-[#3a4a5a] text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
                          }`}
                        >
                          <CalendarIcon className="w-5 h-5 text-gray-400" />
                          {searchDate ? format(searchDate, 'PPP') : 'Select date'}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className={`w-auto p-0 ${isDark ? 'bg-[#1f2c34] border-[#2a3942]' : ''}`}>
                        <Calendar
                          mode="single"
                          selected={searchDate}
                          onSelect={setSearchDate}
                          initialFocus
                          className={isDark ? 'bg-[#1f2c34] text-white' : ''}
                        />
                        {searchDate && (
                          <div className="p-2 border-t border-gray-200 dark:border-gray-700">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSearchDate(null)}
                              className="w-full"
                            >
                              Clear date
                            </Button>
                          </div>
                        )}
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                
                {/* Quick Date Filters */}
                <div className="flex gap-2 flex-wrap">
                  <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Quick:</span>
                  {[
                    { label: 'Today', date: new Date() },
                    { label: 'Yesterday', date: new Date(Date.now() - 86400000) },
                    { label: 'Last Week', date: new Date(Date.now() - 7 * 86400000) },
                    { label: 'Last Month', date: new Date(Date.now() - 30 * 86400000) },
                  ].map(quick => (
                    <button
                      key={quick.label}
                      onClick={() => setSearchDate(quick.date)}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                        isDark ? 'bg-[#2a3942] text-gray-300 hover:bg-[#3a4a5a]' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {quick.label}
                    </button>
                  ))}
                </div>
                
                {/* Search Button */}
                <Button
                  onClick={handleSearch}
                  disabled={isSearching || (!searchQuery.trim() && !searchDate)}
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white py-6 rounded-xl"
                >
                  {isSearching ? (
                    <>
                      <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                      Searching...
                    </>
                  ) : (
                    <>
                      <Search className="w-5 h-5 mr-2" />
                      Search Messages
                    </>
                  )}
                </Button>
              </div>
            </div>
            
            {/* Results */}
            {searchResults.length > 0 && (
              <div className="flex-1 overflow-hidden">
                <div className={`px-6 py-3 border-b ${isDark ? 'border-[#2a3942]' : 'border-gray-200'}`}>
                  <span className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    Found {searchResults.length} messages
                  </span>
                </div>
                <ScrollArea className="flex-1 max-h-[300px]">
                  <div className="p-4 space-y-3">
                    {searchResults.map((result, index) => (
                      <motion.button
                        key={result.id || index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        onClick={() => handleGoToMessage(result)}
                        className={`w-full text-left p-4 rounded-xl transition-colors ${
                          isDark ? 'bg-[#2a3942] hover:bg-[#3a4a5a]' : 'bg-gray-50 hover:bg-gray-100'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={result.chat_avatar || result.sender_avatar} />
                            <AvatarFallback className="bg-[#00E676] text-white text-sm">
                              {(result.chat_name || result.sender_name || 'U')?.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                {result.chat_name || result.sender_name || 'Unknown'}
                              </span>
                              <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                {result.time || result.created_at?.split('T')[0]}
                              </span>
                            </div>
                            <p className={`text-sm mt-1 truncate ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                              {result.text || result.content}
                            </p>
                            {result.isMe && (
                              <span className="inline-block mt-1 px-2 py-0.5 rounded text-xs bg-[#00E676]/20 text-[#00E676]">
                                You
                              </span>
                            )}
                          </div>
                          <ArrowRight className="w-5 h-5 text-gray-400" />
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
            
            {/* Empty State */}
            {searchResults.length === 0 && !isSearching && (
              <div className="p-8 text-center">
                <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${
                  isDark ? 'bg-[#2a3942]' : 'bg-gray-100'
                }`}>
                  <Search className="w-8 h-8 text-gray-400" />
                </div>
                <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>
                  Search for messages by text or date
                </p>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
