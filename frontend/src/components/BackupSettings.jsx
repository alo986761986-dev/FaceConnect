import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield, Download, Upload, Cloud, Server, Key,
  ChevronRight, Check, Loader2, Trash2, Calendar,
  Lock, HardDrive, RefreshCw, AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { useSettings } from "@/context/SettingsContext";
import { haptic } from "@/utils/mobile";

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function BackupSettings({ isOpen, onClose }) {
  const { token } = useAuth();
  const { isDark } = useSettings();
  
  const [activeTab, setActiveTab] = useState("local");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [serverBackups, setServerBackups] = useState([]);
  const [loadingBackups, setLoadingBackups] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Export options
  const [includeOptions, setIncludeOptions] = useState({
    posts: true,
    messages: true,
    saved: true,
    settings: true
  });

  const fetchServerBackups = useCallback(async () => {
    setLoadingBackups(true);
    try {
      const response = await fetch(`${API_URL}/api/backup/server?token=${token}`);
      if (response.ok) {
        const data = await response.json();
        setServerBackups(data.backups || []);
      }
    } catch (error) {
      console.error("Failed to fetch backups:", error);
    } finally {
      setLoadingBackups(false);
    }
  }, [token]);

  // Fetch server backups
  useEffect(() => {
    if (isOpen && activeTab === "server") {
      fetchServerBackups();
    }
  }, [isOpen, activeTab, fetchServerBackups]);

  const validatePassword = () => {
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return false;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return false;
    }
    return true;
  };

  // Local Encrypted Export
  const handleLocalExport = async () => {
    if (!validatePassword()) return;
    
    setLoading(true);
    haptic.medium();
    
    try {
      const response = await fetch(`${API_URL}/api/backup/export?token=${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password,
          include_posts: includeOptions.posts,
          include_messages: includeOptions.messages,
          include_saved: includeOptions.saved,
          include_settings: includeOptions.settings
        })
      });
      
      if (!response.ok) throw new Error("Export failed");
      
      const data = await response.json();
      
      // Download the file
      const blob = new Blob([data.backup], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = data.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      haptic.success();
      toast.success("Backup downloaded successfully!");
      setPassword("");
      setConfirmPassword("");
    } catch (error) {
      toast.error("Failed to create backup");
    } finally {
      setLoading(false);
    }
  };

  // Server-Side Backup
  const handleServerBackup = async () => {
    if (!validatePassword()) return;
    
    setLoading(true);
    haptic.medium();
    
    try {
      const response = await fetch(`${API_URL}/api/backup/server?token=${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password,
          include_posts: includeOptions.posts,
          include_messages: includeOptions.messages,
          include_saved: includeOptions.saved,
          include_settings: includeOptions.settings
        })
      });
      
      if (!response.ok) throw new Error("Backup failed");
      
      const data = await response.json();
      
      haptic.success();
      toast.success("Backup saved to server!");
      setPassword("");
      setConfirmPassword("");
      fetchServerBackups();
    } catch (error) {
      toast.error("Failed to create server backup");
    } finally {
      setLoading(false);
    }
  };

  // Delete Server Backup
  const handleDeleteBackup = async (backupId) => {
    if (!confirm("Delete this backup?")) return;
    
    haptic.medium();
    
    try {
      const response = await fetch(`${API_URL}/api/backup/server/${backupId}?token=${token}`, {
        method: "DELETE"
      });
      
      if (!response.ok) throw new Error("Delete failed");
      
      toast.success("Backup deleted");
      fetchServerBackups();
    } catch (error) {
      toast.error("Failed to delete backup");
    }
  };

  // Restore from file
  const handleRestore = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const restorePassword = prompt("Enter backup password:");
    if (!restorePassword) return;
    
    setLoading(true);
    haptic.medium();
    
    try {
      const fileContent = await file.text();
      
      const response = await fetch(`${API_URL}/api/backup/restore?token=${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: restorePassword,
          backup_data: fileContent
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Restore failed");
      }
      
      const data = await response.json();
      
      haptic.success();
      toast.success(`Restored: ${data.restored.posts} posts, ${data.restored.stories} stories, ${data.restored.saved_posts} saved items`);
    } catch (error) {
      toast.error(error.message || "Failed to restore backup");
    } finally {
      setLoading(false);
      event.target.value = "";
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`max-w-md ${isDark ? 'bg-[#121212] border-white/10' : 'bg-white'}`}>
        <DialogHeader>
          <DialogTitle className={`flex items-center gap-2 ${isDark ? 'text-white' : ''}`}>
            <Shield className="w-5 h-5 text-[var(--primary)]" />
            Encrypted Backup
          </DialogTitle>
          <DialogDescription>
            Create encrypted backups of your data. Your password is used to encrypt/decrypt - don't forget it!
          </DialogDescription>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex gap-2 p-1 bg-[var(--muted)] rounded-lg">
          <button
            onClick={() => setActiveTab("local")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === "local" 
                ? 'bg-[var(--primary)] text-white' 
                : 'text-[var(--text-secondary)]'
            }`}
          >
            <Download className="w-4 h-4" />
            Local
          </button>
          <button
            onClick={() => setActiveTab("server")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === "server" 
                ? 'bg-[var(--primary)] text-white' 
                : 'text-[var(--text-secondary)]'
            }`}
          >
            <Server className="w-4 h-4" />
            Server
          </button>
          <button
            onClick={() => setActiveTab("restore")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === "restore" 
                ? 'bg-[var(--primary)] text-white' 
                : 'text-[var(--text-secondary)]'
            }`}
          >
            <Upload className="w-4 h-4" />
            Restore
          </button>
        </div>

        {/* Tab Content */}
        <div className="mt-4 space-y-4">
          {/* Local Export Tab */}
          {activeTab === "local" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 flex gap-3">
                <HardDrive className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-blue-400">
                  Download an encrypted backup file to your device. You can use this to restore your data anytime.
                </p>
              </div>

              {/* Include Options */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Include in backup:</Label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: "posts", label: "Posts & Stories" },
                    { key: "messages", label: "Messages" },
                    { key: "saved", label: "Saved Items" },
                    { key: "settings", label: "Settings" }
                  ].map(opt => (
                    <label key={opt.key} className="flex items-center gap-2 p-2 rounded-lg bg-[var(--muted)]">
                      <input
                        type="checkbox"
                        checked={includeOptions[opt.key]}
                        onChange={(e) => setIncludeOptions(prev => ({ ...prev, [opt.key]: e.target.checked }))}
                        className="rounded"
                      />
                      <span className="text-sm">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Password Fields */}
              <div className="space-y-3">
                <div>
                  <Label htmlFor="password" className="text-sm">Encryption Password</Label>
                  <div className="relative mt-1">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min 8 characters"
                      className="pl-10"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="confirm" className="text-sm">Confirm Password</Label>
                  <div className="relative mt-1">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                    <Input
                      id="confirm"
                      type={showPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm password"
                      className="pl-10"
                    />
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={showPassword}
                    onChange={(e) => setShowPassword(e.target.checked)}
                  />
                  Show passwords
                </label>
              </div>

              <Button
                onClick={handleLocalExport}
                disabled={loading || !password || !confirmPassword}
                className="w-full bg-[var(--primary)]"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Download className="w-4 h-4 mr-2" />
                )}
                Download Encrypted Backup
              </Button>
            </motion.div>
          )}

          {/* Server Backup Tab */}
          {activeTab === "server" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 flex gap-3">
                <Server className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-green-400">
                  Store encrypted backups on our server. Max 3 backups per account.
                </p>
              </div>

              {/* Existing Backups */}
              {loadingBackups ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-[var(--primary)]" />
                </div>
              ) : serverBackups.length > 0 ? (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Your Server Backups:</Label>
                  {serverBackups.map((backup) => (
                    <div
                      key={backup.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-[var(--muted)]"
                    >
                      <div className="flex items-center gap-3">
                        <Calendar className="w-5 h-5 text-[var(--text-muted)]" />
                        <div>
                          <p className="text-sm font-medium">{formatDate(backup.created_at)}</p>
                          <p className="text-xs text-[var(--text-muted)]">{formatSize(backup.size_bytes)}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteBackup(backup.id)}
                        className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-[var(--text-muted)] py-4">No server backups yet</p>
              )}

              {/* Create New Backup */}
              <div className="space-y-3 pt-2 border-t border-[var(--border)]">
                <Label className="text-sm font-medium">Create New Backup:</Label>
                <div>
                  <Label htmlFor="server-password" className="text-sm">Encryption Password</Label>
                  <div className="relative mt-1">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                    <Input
                      id="server-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min 8 characters"
                      className="pl-10"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="server-confirm" className="text-sm">Confirm Password</Label>
                  <div className="relative mt-1">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                    <Input
                      id="server-confirm"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm password"
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>

              <Button
                onClick={handleServerBackup}
                disabled={loading || !password || !confirmPassword || serverBackups.length >= 3}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Server className="w-4 h-4 mr-2" />
                )}
                Save to Server
              </Button>
              
              {serverBackups.length >= 3 && (
                <p className="text-xs text-amber-500 text-center">
                  Maximum 3 backups reached. Delete one to create a new backup.
                </p>
              )}
            </motion.div>
          )}

          {/* Restore Tab */}
          {activeTab === "restore" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 flex gap-3">
                <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-400">
                  Restore will merge backup data with your existing data. Duplicates will be skipped.
                </p>
              </div>

              <div className="text-center py-8">
                <Upload className="w-12 h-12 mx-auto mb-4 text-[var(--text-muted)]" />
                <p className="text-sm text-[var(--text-secondary)] mb-4">
                  Select a backup file to restore your data
                </p>
                
                <label className="inline-block">
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleRestore}
                    disabled={loading}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    disabled={loading}
                    className="cursor-pointer"
                    asChild
                  >
                    <span>
                      {loading ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <Upload className="w-4 h-4 mr-2" />
                      )}
                      Select Backup File
                    </span>
                  </Button>
                </label>
              </div>

              <p className="text-xs text-[var(--text-muted)] text-center">
                You'll be prompted to enter the backup password after selecting a file.
              </p>
            </motion.div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
