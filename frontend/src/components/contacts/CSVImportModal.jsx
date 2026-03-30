/**
 * CSV Contact Import Component for FaceConnect
 * Allows importing contacts from CSV files and finding friends on FaceConnect
 * Also supports exporting contacts to Google Contacts
 */
import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload, FileSpreadsheet, Users, UserPlus, X, Check, ChevronDown,
  ChevronUp, Search, Mail, Phone, AlertCircle, Loader2, Download,
  Share2, Copy, CheckCircle, Send, Cloud, ExternalLink
} from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { haptic } from "@/utils/mobile";

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Google icon component
function GoogleIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

// Parse CSV content
function parseCSV(content) {
  const lines = content.split(/\r?\n/).filter(line => line.trim());
  if (lines.length === 0) return [];
  
  // Try to detect delimiter (comma, semicolon, tab)
  const firstLine = lines[0];
  const delimiter = firstLine.includes(';') ? ';' : 
                   firstLine.includes('\t') ? '\t' : ',';
  
  // Parse header
  const headers = lines[0].split(delimiter).map(h => h.trim().toLowerCase().replace(/['"]/g, ''));
  
  // Find column indices
  const nameIndex = headers.findIndex(h => 
    h.includes('name') || h.includes('nome') || h.includes('full') || h === 'contact'
  );
  const firstNameIndex = headers.findIndex(h => 
    h.includes('first') || h.includes('given') || h === 'firstname'
  );
  const lastNameIndex = headers.findIndex(h => 
    h.includes('last') || h.includes('family') || h.includes('surname') || h === 'lastname'
  );
  const emailIndex = headers.findIndex(h => 
    h.includes('email') || h.includes('e-mail') || h.includes('mail')
  );
  const phoneIndex = headers.findIndex(h => 
    h.includes('phone') || h.includes('mobile') || h.includes('cell') || 
    h.includes('tel') || h.includes('numero')
  );
  
  // Parse rows
  const contacts = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(delimiter).map(v => v.trim().replace(/['"]/g, ''));
    
    let name = '';
    if (nameIndex >= 0 && values[nameIndex]) {
      name = values[nameIndex];
    } else if (firstNameIndex >= 0 || lastNameIndex >= 0) {
      const firstName = firstNameIndex >= 0 ? values[firstNameIndex] || '' : '';
      const lastName = lastNameIndex >= 0 ? values[lastNameIndex] || '' : '';
      name = `${firstName} ${lastName}`.trim();
    }
    
    const email = emailIndex >= 0 ? values[emailIndex] || '' : '';
    const phone = phoneIndex >= 0 ? values[phoneIndex] || '' : '';
    
    if (name || email || phone) {
      contacts.push({
        id: `contact-${i}`,
        name: name || email || phone,
        email,
        phone,
        selected: false
      });
    }
  }
  
  return contacts;
}

// CSV Import Modal Component
export function CSVImportModal({ isOpen, onClose, isDark, onImportComplete }) {
  const { user, token } = useAuth();
  const fileInputRef = useRef(null);
  const [step, setStep] = useState('upload'); // upload, preview, matching, results, googleExportComplete, saveComplete
  const [importing, setImporting] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [matchedContacts, setMatchedContacts] = useState([]);
  const [unmatchedContacts, setUnmatchedContacts] = useState([]);
  const [selectedContacts, setSelectedContacts] = useState(new Set());
  const [showUnmatched, setShowUnmatched] = useState(false);
  const [error, setError] = useState(null);
  const [inviteSent, setInviteSent] = useState(new Set());
  const [googleExporting, setGoogleExporting] = useState(false);
  const [googleExportResult, setGoogleExportResult] = useState(null);
  const [savingContacts, setSavingContacts] = useState(false);
  const [saveResult, setSaveResult] = useState(null);

  const handleFileSelect = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate file type
    if (!file.name.endsWith('.csv') && !file.type.includes('csv')) {
      toast.error('Please select a CSV file');
      return;
    }
    
    setError(null);
    setImporting(true);
    
    try {
      const content = await file.text();
      const parsed = parseCSV(content);
      
      if (parsed.length === 0) {
        setError('No contacts found in CSV file. Make sure it has name, email, or phone columns.');
        setImporting(false);
        return;
      }
      
      setContacts(parsed);
      setStep('preview');
      toast.success(`Found ${parsed.length} contacts`);
    } catch (err) {
      setError('Failed to parse CSV file');
      console.error('CSV parse error:', err);
    } finally {
      setImporting(false);
    }
  }, []);

  const handleMatchContacts = async () => {
    setImporting(true);
    setStep('matching');
    
    try {
      // Extract emails and phones for matching
      const emails = contacts.filter(c => c.email).map(c => c.email.toLowerCase());
      const phones = contacts.filter(c => c.phone).map(c => c.phone.replace(/\D/g, ''));
      
      // Call API to find matches
      const response = await fetch(`${API_URL}/api/contacts/match`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ emails, phones, token })
      });
      
      if (response.ok) {
        const data = await response.json();
        const matchedEmails = new Set(data.matched?.map(m => m.email?.toLowerCase()) || []);
        const matchedPhones = new Set(data.matched?.map(m => m.phone?.replace(/\D/g, '')) || []);
        
        const matched = [];
        const unmatched = [];
        
        contacts.forEach(contact => {
          const emailMatch = contact.email && matchedEmails.has(contact.email.toLowerCase());
          const phoneMatch = contact.phone && matchedPhones.has(contact.phone.replace(/\D/g, ''));
          
          if (emailMatch || phoneMatch) {
            const matchData = data.matched?.find(m => 
              m.email?.toLowerCase() === contact.email?.toLowerCase() ||
              m.phone?.replace(/\D/g, '') === contact.phone?.replace(/\D/g, '')
            );
            matched.push({ ...contact, user: matchData });
          } else {
            unmatched.push(contact);
          }
        });
        
        setMatchedContacts(matched);
        setUnmatchedContacts(unmatched);
      } else {
        // If API fails, treat all as unmatched (demo mode)
        setMatchedContacts([]);
        setUnmatchedContacts(contacts);
      }
      
      setStep('results');
    } catch (err) {
      console.error('Match error:', err);
      // Fallback - treat all as unmatched
      setMatchedContacts([]);
      setUnmatchedContacts(contacts);
      setStep('results');
    } finally {
      setImporting(false);
    }
  };

  const handleAddFriend = async (contact) => {
    if (!contact.user?.id) return;
    
    haptic.medium();
    
    try {
      await fetch(`${API_URL}/api/friends/request?token=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: contact.user.id })
      });
      
      setSelectedContacts(prev => new Set([...prev, contact.id]));
      toast.success(`Friend request sent to ${contact.name}`);
    } catch (err) {
      toast.error('Failed to send friend request');
    }
  };

  const handleAddAllFriends = async () => {
    haptic.medium();
    
    for (const contact of matchedContacts) {
      if (contact.user?.id && !selectedContacts.has(contact.id)) {
        await handleAddFriend(contact);
      }
    }
  };

  const handleInvite = (contact) => {
    haptic.light();
    
    // Copy invite link or show share options
    const inviteLink = `${window.location.origin}/invite?ref=${user?.id}`;
    
    if (navigator.share) {
      navigator.share({
        title: 'Join FaceConnect',
        text: `Hey ${contact.name}, join me on FaceConnect!`,
        url: inviteLink
      }).then(() => {
        setInviteSent(prev => new Set([...prev, contact.id]));
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(inviteLink);
      toast.success('Invite link copied!');
      setInviteSent(prev => new Set([...prev, contact.id]));
    }
  };

  // Export contacts to Google
  const handleExportToGoogle = async () => {
    haptic.medium();
    setGoogleExporting(true);
    setGoogleExportResult(null);
    
    try {
      // First, initiate Google OAuth to get write access
      const statusRes = await fetch(`${API_URL}/api/google/status`);
      const statusData = await statusRes.json();
      
      if (!statusData.configured) {
        toast.error('Google integration not configured');
        setGoogleExporting(false);
        return;
      }
      
      // Get the authorization URL
      const authRes = await fetch(`${API_URL}/api/google/auth-url`);
      const authData = await authRes.json();
      
      if (authData.auth_url) {
        // Open Google OAuth in popup
        const popup = window.open(
          authData.auth_url,
          'Google Sign In',
          'width=500,height=600,left=200,top=100'
        );
        
        // Listen for the OAuth callback
        const checkPopup = setInterval(async () => {
          try {
            if (popup?.closed) {
              clearInterval(checkPopup);
              
              // Try to export with stored access token
              const exportContacts = contacts.map(c => ({
                name: c.name,
                email: c.email || '',
                phone: c.phone || ''
              }));
              
              // Get the user's Google access token from session
              const tokenRes = await fetch(`${API_URL}/api/google/user-token?token=${token}`);
              const tokenData = await tokenRes.json();
              
              if (tokenData.access_token) {
                const exportRes = await fetch(`${API_URL}/api/google/export-contacts`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    access_token: tokenData.access_token,
                    contacts: exportContacts
                  })
                });
                
                const result = await exportRes.json();
                setGoogleExportResult(result);
                
                if (result.exported > 0) {
                  toast.success(`Exported ${result.exported} contacts to Google!`);
                } else {
                  toast.error('Failed to export contacts');
                }
              } else {
                toast.error('Google authentication required');
              }
              
              setGoogleExporting(false);
            }
          } catch (e) {
            // Popup might be on different origin
          }
        }, 1000);
        
        // Timeout after 2 minutes
        setTimeout(() => {
          clearInterval(checkPopup);
          if (!popup?.closed) {
            popup?.close();
          }
          setGoogleExporting(false);
        }, 120000);
      }
    } catch (err) {
      console.error('Google export error:', err);
      toast.error('Failed to connect to Google');
      setGoogleExporting(false);
    }
  };

  // Direct export without popup (if user already authorized)
  const handleDirectGoogleExport = async () => {
    haptic.medium();
    setGoogleExporting(true);
    
    try {
      // Get the user's Google access token
      const tokenRes = await fetch(`${API_URL}/api/google/user-token?token=${token}`);
      const tokenData = await tokenRes.json();
      
      if (!tokenData.access_token) {
        // Need to authenticate first
        handleExportToGoogle();
        return;
      }
      
      const exportContacts = contacts.map(c => ({
        name: c.name,
        email: c.email || '',
        phone: c.phone || ''
      }));
      
      const exportRes = await fetch(`${API_URL}/api/google/batch-export-contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          access_token: tokenData.access_token,
          contacts: exportContacts
        })
      });
      
      const result = await exportRes.json();
      setGoogleExportResult(result);
      
      if (result.exported > 0) {
        toast.success(`Exported ${result.exported} contacts to Google!`);
        setStep('googleExportComplete');
      } else {
        // Token might be expired, try full flow
        handleExportToGoogle();
      }
    } catch (err) {
      console.error('Direct export error:', err);
      handleExportToGoogle();
    } finally {
      setGoogleExporting(false);
    }
  };

  // Save contacts to FaceConnect address book
  const handleSaveToContacts = async () => {
    haptic.medium();
    setSavingContacts(true);
    
    try {
      const contactsToSave = contacts.map(c => ({
        name: c.name,
        email: c.email || '',
        phone: c.phone || '',
        source: 'csv'
      }));
      
      const response = await fetch(`${API_URL}/api/contacts/save?token=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contacts: contactsToSave })
      });
      
      if (response.ok) {
        const result = await response.json();
        setSaveResult(result);
        setStep('saveComplete');
        toast.success(`Saved ${result.total} contacts to FaceConnect!`);
        
        // Notify parent about import
        onImportComplete?.({
          total: contacts.length,
          saved: result.saved_count,
          updated: result.updated_count
        });
      } else {
        const errorData = await response.json();
        toast.error(errorData.detail || 'Failed to save contacts');
      }
    } catch (err) {
      console.error('Save contacts error:', err);
      toast.error('Failed to save contacts');
    } finally {
      setSavingContacts(false);
    }
  };

  const handleClose = () => {
    setStep('upload');
    setContacts([]);
    setMatchedContacts([]);
    setUnmatchedContacts([]);
    setSelectedContacts(new Set());
    setError(null);
    setGoogleExportResult(null);
    setSaveResult(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={handleClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        className={`w-full max-w-lg max-h-[80vh] rounded-2xl overflow-hidden shadow-2xl ${
          isDark ? 'bg-[#242526]' : 'bg-white'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`flex items-center justify-between p-4 border-b ${
          isDark ? 'border-[#3a3b3c]' : 'border-gray-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center">
              {step === 'googleExportComplete' ? (
                <GoogleIcon className="w-5 h-5" />
              ) : step === 'saveComplete' ? (
                <CheckCircle className="w-5 h-5 text-white" />
              ) : (
                <Users className="w-5 h-5 text-white" />
              )}
            </div>
            <div>
              <h2 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {step === 'upload' && 'Import Contacts'}
                {step === 'preview' && 'Preview Contacts'}
                {step === 'matching' && 'Finding Friends...'}
                {step === 'results' && 'Preview Contacts'}
                {step === 'googleExportComplete' && 'Exported to Google'}
                {step === 'saveComplete' && 'Contacts Saved'}
              </h2>
              {step === 'results' && (
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  {contacts.length} imported · {matchedContacts.length} on FaceConnect
                </p>
              )}
              {step === 'googleExportComplete' && googleExportResult && (
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  {googleExportResult.exported} of {googleExportResult.total} exported
                </p>
              )}
              {step === 'saveComplete' && saveResult && (
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  {saveResult.total} contacts saved to FaceConnect
                </p>
              )}
            </div>
          </div>
          <button
            onClick={handleClose}
            className={`p-2 rounded-full ${isDark ? 'hover:bg-[#3a3b3c]' : 'hover:bg-gray-100'}`}
          >
            <X className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Upload Step */}
          {step === 'upload' && (
            <div className="space-y-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                  isDark 
                    ? 'border-[#3a3b3c] hover:border-purple-500/50 hover:bg-[#3a3b3c]/30' 
                    : 'border-gray-200 hover:border-purple-500/50 hover:bg-gray-50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                {importing ? (
                  <Loader2 className={`w-12 h-12 mx-auto mb-4 animate-spin ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                ) : (
                  <FileSpreadsheet className={`w-12 h-12 mx-auto mb-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                )}
                <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {importing ? 'Processing...' : 'Click to upload CSV file'}
                </p>
                <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Supports Google Contacts, Outlook, and other CSV exports
                </p>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 text-red-500">
                  <AlertCircle className="w-5 h-5" />
                  <p className="text-sm">{error}</p>
                </div>
              )}

              <div className={`p-4 rounded-xl ${isDark ? 'bg-[#3a3b3c]' : 'bg-gray-50'}`}>
                <h3 className={`font-medium mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  How to export contacts:
                </h3>
                <ul className={`text-sm space-y-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  <li>• <strong>Google:</strong> contacts.google.com → Export → CSV</li>
                  <li>• <strong>Outlook:</strong> File → Export → CSV</li>
                  <li>• <strong>iPhone:</strong> Use iCloud.com → Contacts → Export</li>
                </ul>
              </div>
            </div>
          )}

          {/* Preview Step */}
          {step === 'preview' && (
            <div className="space-y-4">
              <div className={`p-4 rounded-xl ${isDark ? 'bg-[#3a3b3c]' : 'bg-gray-50'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                    Contacts found
                  </span>
                  <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {contacts.length}
                  </span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                    With email
                  </span>
                  <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {contacts.filter(c => c.email).length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                    With phone
                  </span>
                  <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {contacts.filter(c => c.phone).length}
                  </span>
                </div>
              </div>

              <ScrollArea className="h-48">
                <div className="space-y-2">
                  {contacts.slice(0, 10).map((contact) => (
                    <div
                      key={contact.id}
                      className={`flex items-center gap-3 p-2 rounded-lg ${
                        isDark ? 'bg-[#3a3b3c]' : 'bg-gray-50'
                      }`}
                    >
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="bg-gradient-to-br from-purple-500 to-cyan-400 text-white text-xs">
                          {contact.name?.[0] || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {contact.name}
                        </p>
                        {contact.email && (
                          <p className={`text-xs truncate ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            {contact.email}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                  {contacts.length > 10 && (
                    <p className={`text-center text-sm py-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      And {contacts.length - 10} more...
                    </p>
                  )}
                </div>
              </ScrollArea>

              <Button
                onClick={handleMatchContacts}
                className="w-full bg-gradient-to-r from-purple-600 to-cyan-500 text-white"
              >
                Find Friends on FaceConnect
              </Button>
            </div>
          )}

          {/* Matching Step */}
          {step === 'matching' && (
            <div className="py-12 text-center">
              <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-purple-500" />
              <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Finding your friends...
              </p>
              <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Checking {contacts.length} contacts
              </p>
            </div>
          )}

          {/* Results Step */}
          {step === 'results' && (
            <div className="space-y-4">
              {/* Matched Section */}
              {matchedContacts.length > 0 ? (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {matchedContacts.length} contacts on FaceConnect
                    </h3>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleAddAllFriends}
                      disabled={matchedContacts.every(c => selectedContacts.has(c.id))}
                    >
                      Add All
                    </Button>
                  </div>
                  <ScrollArea className="h-40">
                    <div className="space-y-2">
                      {matchedContacts.map((contact) => (
                        <div
                          key={contact.id}
                          className={`flex items-center gap-3 p-3 rounded-xl ${
                            isDark ? 'bg-[#3a3b3c]' : 'bg-gray-50'
                          }`}
                        >
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={contact.user?.avatar ? `${API_URL}${contact.user.avatar}` : undefined} />
                            <AvatarFallback className="bg-gradient-to-br from-purple-500 to-cyan-400 text-white">
                              {contact.name?.[0] || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className={`font-medium truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                              {contact.name}
                            </p>
                            <p className={`text-xs truncate ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                              @{contact.user?.username || 'user'}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => handleAddFriend(contact)}
                            disabled={selectedContacts.has(contact.id)}
                            className={selectedContacts.has(contact.id) 
                              ? 'bg-green-500 text-white' 
                              : 'bg-gradient-to-r from-purple-600 to-cyan-500 text-white'
                            }
                          >
                            {selectedContacts.has(contact.id) ? (
                              <>
                                <Check className="w-4 h-4 mr-1" />
                                Added
                              </>
                            ) : (
                              <>
                                <UserPlus className="w-4 h-4 mr-1" />
                                Add
                              </>
                            )}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              ) : (
                <div className={`p-8 rounded-xl text-center ${isDark ? 'bg-[#3a3b3c]' : 'bg-gray-50'}`}>
                  <Users className={`w-12 h-12 mx-auto mb-3 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                  <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    No matches found
                  </p>
                  <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    None of your {contacts.length} imported contacts are on FaceConnect yet
                  </p>
                  <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    Invite your friends to join FaceConnect!
                  </p>
                </div>
              )}

              {/* Unmatched Section */}
              {unmatchedContacts.length > 0 && (
                <div>
                  <button
                    onClick={() => setShowUnmatched(!showUnmatched)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl ${
                      isDark ? 'bg-[#3a3b3c] hover:bg-[#4a4b4c]' : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                      {unmatchedContacts.length} contacts not on FaceConnect
                    </span>
                    {showUnmatched ? (
                      <ChevronUp className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                    ) : (
                      <ChevronDown className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                    )}
                  </button>
                  
                  <AnimatePresence>
                    {showUnmatched && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <ScrollArea className="h-40 mt-2">
                          <div className="space-y-2">
                            {unmatchedContacts.map((contact) => (
                              <div
                                key={contact.id}
                                className={`flex items-center gap-3 p-3 rounded-xl ${
                                  isDark ? 'bg-[#3a3b3c]' : 'bg-gray-50'
                                }`}
                              >
                                <Avatar className="w-10 h-10">
                                  <AvatarFallback className={isDark ? 'bg-gray-600 text-gray-300' : 'bg-gray-200 text-gray-600'}>
                                    {contact.name?.[0] || '?'}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <p className={`font-medium truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                    {contact.name}
                                  </p>
                                  {contact.email && (
                                    <p className={`text-xs truncate ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                      {contact.email}
                                    </p>
                                  )}
                                </div>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleInvite(contact)}
                                  disabled={inviteSent.has(contact.id)}
                                  className={inviteSent.has(contact.id) ? 'text-green-500 border-green-500' : ''}
                                >
                                  {inviteSent.has(contact.id) ? (
                                    <>
                                      <CheckCircle className="w-4 h-4 mr-1" />
                                      Invited
                                    </>
                                  ) : (
                                    <>
                                      <Send className="w-4 h-4 mr-1" />
                                      Invite
                                    </>
                                  )}
                                </Button>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
          )}

          {/* Google Export Complete Step */}
          {step === 'googleExportComplete' && (
            <GoogleExportSuccessView result={googleExportResult} isDark={isDark} />
          )}

          {/* Save Complete Step */}
          {step === 'saveComplete' && (
            <SaveCompleteView result={saveResult} isDark={isDark} />
          )}
        </div>

        {/* Footer */}
        <div className={`p-4 border-t ${isDark ? 'border-[#3a3b3c]' : 'border-gray-200'} flex gap-3 flex-wrap`}>
          <Button
            variant="outline"
            onClick={handleClose}
            className="flex-1 min-w-[100px]"
          >
            {step === 'saveComplete' || step === 'googleExportComplete' ? 'Done' : 'Cancel'}
          </Button>
          {step === 'results' && (
            <>
              {/* Save to FaceConnect Button */}
              <Button
                onClick={handleSaveToContacts}
                disabled={savingContacts}
                className="flex-1 min-w-[120px] bg-gradient-to-r from-purple-600 to-cyan-500 text-white"
              >
                {savingContacts ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Download className="w-4 h-4 mr-2" />
                )}
                Save to Contacts
              </Button>
              
              {/* Export to Google Button */}
              <Button
                onClick={handleDirectGoogleExport}
                disabled={googleExporting}
                variant="outline"
                className="flex-1 min-w-[120px] flex items-center justify-center gap-2"
              >
                {googleExporting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <GoogleIcon className="w-4 h-4" />
                )}
                Export to Google
              </Button>
            </>
          )}
          {step === 'preview' && (
            <Button
              onClick={handleMatchContacts}
              disabled={importing}
              className="flex-1 bg-gradient-to-r from-purple-600 to-cyan-500 text-white"
            >
              {importing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Search className="w-4 h-4 mr-2" />
              )}
              Find Friends & Continue
            </Button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// Save Complete Success View
function SaveCompleteView({ result, isDark }) {
  return (
    <div className="text-center py-8">
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
        <CheckCircle className="w-8 h-8 text-green-500" />
      </div>
      <h3 className={`text-lg font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
        Contacts Saved!
      </h3>
      <p className={`mb-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
        Your contacts have been saved to FaceConnect
      </p>
      <div className={`p-4 rounded-xl ${isDark ? 'bg-[#3a3b3c]' : 'bg-gray-50'}`}>
        <div className="flex items-center justify-between mb-2">
          <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>New contacts</span>
          <span className="font-medium text-green-500">{result?.saved_count || 0}</span>
        </div>
        <div className="flex items-center justify-between mb-2">
          <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>Updated</span>
          <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {result?.updated_count || 0}
          </span>
        </div>
        <div className={`flex items-center justify-between pt-2 border-t ${isDark ? 'border-[#4a4b4c]' : 'border-gray-200'}`}>
          <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Total</span>
          <span className="font-bold text-purple-500">{result?.total || 0}</span>
        </div>
      </div>
      <p className={`text-sm mt-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
        You can view your contacts in the Contacts section
      </p>
    </div>
  );
}

// Google Export Success Step
function GoogleExportSuccessView({ result, isDark }) {
  return (
    <div className="text-center py-8">
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
        <CheckCircle className="w-8 h-8 text-green-500" />
      </div>
      <h3 className={`text-lg font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
        Contacts Exported!
      </h3>
      <p className={`mb-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
        Successfully exported {result?.exported || 0} contacts to your Google account
      </p>
      <div className={`p-4 rounded-xl ${isDark ? 'bg-[#3a3b3c]' : 'bg-gray-50'}`}>
        <div className="flex items-center justify-between mb-2">
          <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>Total contacts</span>
          <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {result?.total || 0}
          </span>
        </div>
        <div className="flex items-center justify-between mb-2">
          <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>Exported</span>
          <span className="font-medium text-green-500">{result?.exported || 0}</span>
        </div>
        {result?.failed > 0 && (
          <div className="flex items-center justify-between">
            <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>Failed</span>
            <span className="font-medium text-red-500">{result?.failed || 0}</span>
          </div>
        )}
      </div>
      <a
        href="https://contacts.google.com"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 mt-4 text-purple-500 hover:text-purple-400"
      >
        <ExternalLink className="w-4 h-4" />
        View in Google Contacts
      </a>
    </div>
  );
}

// Export button component for use in Friends page
export function ImportContactsButton({ isDark, onClick }) {
  return (
    <Button
      onClick={onClick}
      variant="outline"
      className={`flex items-center gap-2 ${
        isDark 
          ? 'border-[#3a3b3c] hover:bg-[#3a3b3c] text-gray-200' 
          : 'border-gray-200 hover:bg-gray-50'
      }`}
    >
      <Upload className="w-4 h-4" />
      Import CSV
    </Button>
  );
}

export default CSVImportModal;
