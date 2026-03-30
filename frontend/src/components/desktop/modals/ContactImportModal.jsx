import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, UserPlus, FileText, Smartphone, Globe, UserCheck, 
  RefreshCw, Check, Users, ChevronDown, BookUser 
} from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

export default function ContactImportModal({ 
  isOpen, 
  onClose, 
  isDark,
  onFileImport,
  onPhoneImport,
  onGoogleImport,
  onFacebookImport,
  isSyncing,
  importSource,
  // Preview props
  showPreview,
  setShowPreview,
  previewContacts,
  matchedUsers,
  selectedContactIds,
  setSelectedContactIds,
  pendingRequests,
  onSaveAllContacts,
  onAddFriends
}) {
  const toggleContactSelection = (userId) => {
    const newSet = new Set(selectedContactIds);
    if (newSet.has(userId)) {
      newSet.delete(userId);
    } else {
      newSet.add(userId);
    }
    setSelectedContactIds(newSet);
  };

  const selectAllContacts = () => {
    const selectableIds = matchedUsers
      .filter(u => !u.is_friend && !u.request_sent && !pendingRequests.has(u.id))
      .map(u => u.id);
    setSelectedContactIds(new Set(selectableIds));
  };

  const deselectAllContacts = () => {
    setSelectedContactIds(new Set());
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {/* Import Options Modal */}
      {!showPreview && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-md rounded-2xl shadow-2xl overflow-hidden ${
              isDark ? 'bg-[#1f2c34]' : 'bg-white'
            }`}
          >
            {/* Header */}
            <div className={`p-4 border-b ${isDark ? 'border-[#2a3942]' : 'border-gray-200'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-[#00E676]/20">
                    <UserPlus className="w-6 h-6 text-[#00E676]" />
                  </div>
                  <div>
                    <h3 className={`font-semibold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      Import Contacts
                    </h3>
                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      Find friends on FaceConnect
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className={`p-2 rounded-full ${isDark ? 'hover:bg-[#21262D]' : 'hover:bg-gray-100'}`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            {/* Import Options */}
            <div className="p-4 space-y-3">
              {/* CSV/vCard Import - RECOMMENDED */}
              <label
                className={`w-full flex items-center gap-4 p-4 rounded-xl transition-all cursor-pointer border-2 border-[#00E676] ${
                  isDark 
                    ? 'bg-[#00E676]/10 hover:bg-[#00E676]/20' 
                    : 'bg-[#00E676]/5 hover:bg-[#00E676]/10'
                }`}
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#00a884] to-[#0088cc] flex items-center justify-center">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2">
                    <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>CSV / vCard File</p>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#00E676] text-white">RECOMMENDED</span>
                  </div>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Import from .csv or .vcf file</p>
                </div>
                <input
                  type="file"
                  accept=".csv,.vcf,.vcard"
                  onChange={onFileImport}
                  className="hidden"
                />
                {isSyncing && (importSource === 'csv' || importSource === 'vcard') && (
                  <RefreshCw className="w-5 h-5 animate-spin text-[#00E676]" />
                )}
              </label>
              
              {/* Phone Contacts */}
              <button
                onClick={onPhoneImport}
                disabled={isSyncing}
                className={`w-full flex items-center gap-4 p-4 rounded-xl transition-all ${
                  isDark 
                    ? 'bg-[#161B22] hover:bg-[#21262D]' 
                    : 'bg-gray-50 hover:bg-gray-100'
                }`}
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <Smartphone className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 text-left">
                  <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Phone Contacts</p>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Access your device contacts</p>
                </div>
                {isSyncing && importSource === 'phone' && (
                  <RefreshCw className="w-5 h-5 animate-spin text-[#00E676]" />
                )}
              </button>
              
              {/* Google Contacts */}
              <button
                onClick={onGoogleImport}
                disabled={isSyncing}
                className={`w-full flex items-center gap-4 p-4 rounded-xl transition-all ${
                  isDark 
                    ? 'bg-[#161B22] hover:bg-[#21262D]' 
                    : 'bg-gray-50 hover:bg-gray-100'
                }`}
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-500 via-yellow-500 to-green-500 p-0.5">
                  <div className={`w-full h-full rounded-full flex items-center justify-center ${isDark ? 'bg-[#161B22]' : 'bg-white'}`}>
                    <Globe className="w-6 h-6 text-red-500" />
                  </div>
                </div>
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2">
                    <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Google Contacts</p>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500 text-white">NEW</span>
                  </div>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Import from your Google account</p>
                </div>
                {isSyncing && importSource === 'google' && (
                  <RefreshCw className="w-5 h-5 animate-spin text-[#00E676]" />
                )}
              </button>
              
              {/* Facebook Friends */}
              <button
                onClick={onFacebookImport}
                disabled={isSyncing}
                className={`w-full flex items-center gap-4 p-4 rounded-xl transition-all ${
                  isDark 
                    ? 'bg-[#161B22] hover:bg-[#21262D]' 
                    : 'bg-gray-50 hover:bg-gray-100'
                }`}
              >
                <div className="w-12 h-12 rounded-full bg-[#1877F2] flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </div>
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2">
                    <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Facebook Friends</p>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500 text-white">NEW</span>
                  </div>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Import friends from Facebook</p>
                </div>
                {isSyncing && importSource === 'facebook' && (
                  <RefreshCw className="w-5 h-5 animate-spin text-[#00E676]" />
                )}
              </button>
            </div>
            
            {/* Footer */}
            <div className={`p-4 border-t ${isDark ? 'border-[#2a3942] bg-[#0D1117]' : 'border-gray-200 bg-gray-50'}`}>
              <p className={`text-xs text-center ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                Your contacts are private and used only to find friends on FaceConnect
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
      
      {/* Contact Preview Modal */}
      {showPreview && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
          onClick={() => setShowPreview(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden ${
              isDark ? 'bg-[#1f2c34]' : 'bg-white'
            }`}
          >
            {/* Header */}
            <div className={`p-4 border-b ${isDark ? 'border-[#2a3942]' : 'border-gray-200'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-[#00E676]/20">
                    <UserCheck className="w-6 h-6 text-[#00E676]" />
                  </div>
                  <div>
                    <h3 className={`font-semibold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      Preview Contacts
                    </h3>
                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      {previewContacts.length} imported • {matchedUsers.length} on FaceConnect
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowPreview(false)}
                  className={`p-2 rounded-full ${isDark ? 'hover:bg-[#21262D]' : 'hover:bg-gray-100'}`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            {/* Select All / Deselect All */}
            {matchedUsers.length > 0 && (
              <div className={`px-4 py-2 flex items-center justify-between border-b ${isDark ? 'border-[#2a3942]' : 'border-gray-200'}`}>
                <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  {selectedContactIds.size} selected
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={selectAllContacts}
                    className="px-3 py-1 text-xs font-medium rounded-full bg-[#00E676] text-white hover:bg-[#00E676]/90 transition-colors"
                  >
                    Select All
                  </button>
                  <button
                    onClick={deselectAllContacts}
                    className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                      isDark ? 'bg-[#21262D] text-gray-300 hover:bg-[#374248]' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Deselect All
                  </button>
                </div>
              </div>
            )}
            
            {/* Contact List */}
            <div className="max-h-[400px] overflow-y-auto">
              {matchedUsers.length > 0 ? (
                <div className="divide-y divide-gray-200 dark:divide-[#2a3942]">
                  {matchedUsers.map((user) => (
                    <div
                      key={user.id}
                      onClick={() => toggleContactSelection(user.id)}
                      className={`flex items-center gap-3 p-4 cursor-pointer transition-colors ${
                        selectedContactIds.has(user.id)
                          ? isDark ? 'bg-[#00E676]/10' : 'bg-[#00E676]/5'
                          : isDark ? 'hover:bg-[#161B22]' : 'hover:bg-gray-50'
                      }`}
                    >
                      {/* Checkbox */}
                      <div className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-colors ${
                        selectedContactIds.has(user.id)
                          ? 'bg-[#00E676] border-[#00E676]'
                          : isDark ? 'border-gray-500' : 'border-gray-300'
                      }`}>
                        {selectedContactIds.has(user.id) && (
                          <Check className="w-3 h-3 text-white" />
                        )}
                      </div>
                      
                      {/* Avatar */}
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={user.avatar} />
                        <AvatarFallback className="bg-gradient-to-br from-[#00a884] to-[#0088cc] text-white">
                          {user.display_name?.charAt(0)?.toUpperCase() || user.name?.charAt(0)?.toUpperCase() || '?'}
                        </AvatarFallback>
                      </Avatar>
                      
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {user.display_name || user.name}
                        </p>
                        <p className={`text-sm truncate ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                          {user.email || user.phone || 'FaceConnect user'}
                        </p>
                      </div>
                      
                      {/* Status badge */}
                      {user.is_friend ? (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-500/20 text-green-500">
                          Already friends
                        </span>
                      ) : user.request_sent || pendingRequests.has(user.id) ? (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-500/20 text-yellow-500">
                          Request sent
                        </span>
                      ) : (
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          isDark ? 'bg-[#00E676]/20 text-[#00E676]' : 'bg-[#00E676]/10 text-[#00E676]'
                        }`}>
                          Add friend
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center">
                  <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${
                    isDark ? 'bg-[#21262D]' : 'bg-gray-100'
                  }`}>
                    <Users className={`w-8 h-8 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                  </div>
                  <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    No matches found
                  </p>
                  <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {previewContacts.length > 0 
                      ? `None of your ${previewContacts.length} imported contacts are on FaceConnect yet`
                      : 'No contacts were imported'
                    }
                  </p>
                </div>
              )}
            </div>
            
            {/* Imported Contacts Summary (collapsed) */}
            {previewContacts.length > 0 && matchedUsers.length < previewContacts.length && (
              <details className={`border-t ${isDark ? 'border-[#2a3942]' : 'border-gray-200'}`}>
                <summary className={`px-4 py-3 cursor-pointer text-sm font-medium flex items-center gap-2 ${
                  isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-600'
                }`}>
                  <ChevronDown className="w-4 h-4" />
                  {previewContacts.length - matchedUsers.length} contacts not on FaceConnect
                </summary>
                <div className={`max-h-[150px] overflow-y-auto px-4 pb-3 ${isDark ? 'bg-[#0D1117]' : 'bg-gray-50'}`}>
                  {previewContacts
                    .filter(c => !matchedUsers.some(u => u.email === c.email || u.phone === c.phone))
                    .slice(0, 20)
                    .map((contact, idx) => (
                      <div key={idx} className={`py-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        {contact.name} {contact.email && `• ${contact.email}`}
                      </div>
                    ))
                  }
                  {previewContacts.length - matchedUsers.length > 20 && (
                    <p className={`text-xs py-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                      ...and {previewContacts.length - matchedUsers.length - 20} more
                    </p>
                  )}
                </div>
              </details>
            )}
            
            {/* Footer Actions */}
            <div className={`p-4 border-t flex items-center justify-between gap-3 ${isDark ? 'border-[#2a3942] bg-[#0D1117]' : 'border-gray-200 bg-gray-50'}`}>
              <button
                onClick={() => setShowPreview(false)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  isDark 
                    ? 'text-gray-300 hover:bg-[#21262D]' 
                    : 'text-gray-600 hover:bg-gray-200'
                }`}
              >
                Cancel
              </button>
              
              <div className="flex items-center gap-2">
                {/* Save All to Contacts */}
                <button
                  onClick={onSaveAllContacts}
                  disabled={previewContacts.length === 0 || isSyncing}
                  className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                    previewContacts.length > 0
                      ? isDark 
                        ? 'bg-blue-600 text-white hover:bg-blue-500'
                        : 'bg-blue-500 text-white hover:bg-blue-600'
                      : isDark 
                        ? 'bg-[#21262D] text-gray-500 cursor-not-allowed'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  <BookUser className="w-4 h-4" />
                  Save All ({previewContacts.length})
                </button>
                
                {/* Add Friends */}
                <button
                  onClick={onAddFriends}
                  disabled={selectedContactIds.size === 0 || isSyncing}
                  className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                    selectedContactIds.size > 0
                      ? 'bg-[#00E676] text-white hover:bg-[#00E676]/90'
                      : isDark 
                        ? 'bg-[#21262D] text-gray-500 cursor-not-allowed'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {isSyncing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      Add Friends
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
