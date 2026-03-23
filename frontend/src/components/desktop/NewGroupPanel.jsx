import { motion } from "framer-motion";
import { ArrowLeft, Camera, Search, X, Check, Users } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLanguage } from "@/context/LanguageContext";

/**
 * NewGroupPanel - Panel for creating new group chats
 * Extracted from WhatsAppDesktopLayout.jsx for maintainability
 */
export default function NewGroupPanel({ 
  isDark, 
  chats,
  groupName,
  setGroupName,
  selectedMembers,
  setSelectedMembers,
  onClose, 
  onCreateGroup 
}) {
  const { t } = useLanguage();
  const contacts = chats.filter(c => !c.isGroup);

  return (
    <motion.div
      initial={{ x: -400, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -400, opacity: 0 }}
      className={`absolute left-0 top-0 bottom-0 w-[400px] z-50 flex flex-col ${
        isDark ? 'bg-[#0D1117]' : 'bg-white'
      }`}
      data-testid="new-group-panel"
    >
      {/* Header */}
      <div className={`flex items-center gap-6 px-6 py-4 ${
        isDark ? 'bg-[#161B22]' : 'bg-[#00E676]'
      }`}>
        <Button 
          variant="ghost" 
          size="icon" 
          className="rounded-full text-white hover:bg-white/10"
          onClick={onClose}
          data-testid="new-group-back-btn"
        >
          <ArrowLeft className="w-6 h-6" />
        </Button>
        <h2 className="text-xl font-medium text-white">{t('newGroup')}</h2>
      </div>
      
      <div className="p-4 flex-1 flex flex-col">
        {/* Selected Members Preview */}
        {selectedMembers.length > 0 && (
          <div className={`flex flex-wrap gap-2 p-3 rounded-lg mb-4 ${
            isDark ? 'bg-[#161B22]' : 'bg-gray-100'
          }`}>
            {selectedMembers.map(memberId => {
              const member = chats.find(c => c.id === memberId);
              return member ? (
                <div 
                  key={memberId}
                  className="flex items-center gap-2 bg-[#00E676]/20 text-[#00E676] px-2 py-1 rounded-full text-sm"
                >
                  <span>{member.name}</span>
                  <button 
                    onClick={() => setSelectedMembers(prev => prev.filter(id => id !== memberId))}
                    className="hover:bg-[#00E676]/30 rounded-full p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : null;
            })}
          </div>
        )}

        {/* Group Name Input */}
        <div className={`flex items-center gap-4 p-4 rounded-lg mb-4 ${
          isDark ? 'bg-[#161B22]' : 'bg-gray-100'
        }`}>
          <div className={`w-12 h-12 rounded-full flex items-center justify-center cursor-pointer hover:opacity-80 ${
            isDark ? 'bg-[#21262D]' : 'bg-gray-200'
          }`}>
            <Camera className={`w-6 h-6 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
          </div>
          <Input
            placeholder={t('groupNameRequired')}
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            className={`border-0 bg-transparent focus-visible:ring-0 ${
              isDark ? 'text-white placeholder:text-gray-400' : ''
            }`}
            data-testid="group-name-input"
          />
        </div>
        
        {/* Search Members */}
        <div className={`flex items-center gap-3 px-4 py-2 rounded-lg mb-4 ${
          isDark ? 'bg-[#161B22]' : 'bg-gray-100'
        }`}>
          <Search className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
          <Input
            placeholder={t('searchContacts')}
            className={`border-0 bg-transparent focus-visible:ring-0 ${
              isDark ? 'text-white placeholder:text-gray-400' : ''
            }`}
          />
        </div>
        
        {/* Contact List */}
        <p className={`text-xs font-medium uppercase mb-2 ${
          isDark ? 'text-gray-400' : 'text-gray-500'
        }`}>
          {t('contacts')} ({contacts.length})
        </p>
        
        <ScrollArea className="flex-1 min-h-0">
          {contacts.map((contact) => (
            <div
              key={contact.id}
              onClick={() => {
                if (selectedMembers.includes(contact.id)) {
                  setSelectedMembers(prev => prev.filter(id => id !== contact.id));
                } else {
                  setSelectedMembers(prev => [...prev, contact.id]);
                }
              }}
              className={`flex items-center gap-3 px-3 py-2 cursor-pointer rounded-lg transition-colors ${
                selectedMembers.includes(contact.id) 
                  ? (isDark ? 'bg-[#00E676]/20' : 'bg-[#00E676]/10')
                  : (isDark ? 'hover:bg-[#161B22]' : 'hover:bg-gray-100')
              }`}
              data-testid={`contact-${contact.id}`}
            >
              <div className="relative">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={contact.avatar} />
                  <AvatarFallback className="bg-[#00E676] text-white">
                    {contact.name?.charAt(0)?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {selectedMembers.includes(contact.id) && (
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#00E676] rounded-full flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <span className={isDark ? 'text-white' : 'text-gray-900'}>{contact.name}</span>
                {contact.online && (
                  <span className="text-xs text-[#00E676] ml-2">online</span>
                )}
              </div>
            </div>
          ))}
          
          {contacts.length === 0 && (
            <div className={`text-center py-8 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>{t('noContactsYet')}</p>
            </div>
          )}
        </ScrollArea>
        
        {/* Create Button */}
        <Button 
          className="w-full mt-4 bg-[#00E676] hover:bg-[#00E676]/90"
          disabled={!groupName.trim() || selectedMembers.length === 0}
          onClick={onCreateGroup}
          data-testid="create-group-btn"
        >
          {t('createGroup')} ({selectedMembers.length} {selectedMembers.length === 1 ? t('member') : t('members')})
        </Button>
      </div>
    </motion.div>
  );
}
