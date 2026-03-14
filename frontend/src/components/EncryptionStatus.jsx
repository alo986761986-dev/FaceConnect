import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Lock, Unlock, Shield, ShieldCheck, 
  AlertTriangle, Database, Key, RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  getEncryptionInfo, 
  secureUserStorage,
  secureNotesStorage,
  migrateToEncryptedStorage
} from "@/utils/encryption";
import { toast } from "sonner";
import { haptic } from "@/utils/mobile";

export const EncryptionStatus = () => {
  const [encryptionInfo, setEncryptionInfo] = useState(null);
  const [migrating, setMigrating] = useState(false);
  const [storageStats, setStorageStats] = useState({ encrypted: 0, total: 0 });

  useEffect(() => {
    const loadInfo = async () => {
      const info = getEncryptionInfo();
      setEncryptionInfo(info);

      // Count encrypted vs unencrypted items
      let encrypted = 0;
      let total = 0;
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && !key.startsWith('faceconnect_encryption')) {
          total++;
          const value = localStorage.getItem(key);
          if (value && value.startsWith('enc:')) {
            encrypted++;
          }
        }
      }
      
      setStorageStats({ encrypted, total });
    };

    loadInfo();
  }, []);

  const handleMigrateData = async () => {
    haptic.medium();
    setMigrating(true);
    
    try {
      // Get all localStorage keys that might contain sensitive data
      const keysToMigrate = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && 
            !key.startsWith('faceconnect_encryption') &&
            !key.startsWith('enc:') &&
            !key.startsWith('secure:') &&
            !key.startsWith('vault:')) {
          keysToMigrate.push(key);
        }
      }

      await migrateToEncryptedStorage(keysToMigrate, secureUserStorage);
      
      haptic.success();
      toast.success('Data migration complete!');
      
      // Refresh stats
      let encrypted = 0;
      let total = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && !key.startsWith('faceconnect_encryption')) {
          total++;
          const value = localStorage.getItem(key);
          if (value && value.startsWith('enc:')) {
            encrypted++;
          }
        }
      }
      setStorageStats({ encrypted, total });
    } catch (err) {
      haptic.error();
      toast.error('Migration failed: ' + err.message);
    } finally {
      setMigrating(false);
    }
  };

  if (!encryptionInfo) return null;

  const encryptionPercentage = storageStats.total > 0 
    ? Math.round((storageStats.encrypted / storageStats.total) * 100)
    : 0;

  return (
    <div className="space-y-4">
      {/* Encryption Status Card */}
      <div className={`p-4 rounded-xl border ${
        encryptionInfo.supported 
          ? 'bg-green-500/10 border-green-500/30' 
          : 'bg-yellow-500/10 border-yellow-500/30'
      }`}>
        <div className="flex items-start gap-3">
          {encryptionInfo.supported ? (
            <ShieldCheck className="w-6 h-6 text-green-400 flex-shrink-0" />
          ) : (
            <AlertTriangle className="w-6 h-6 text-yellow-400 flex-shrink-0" />
          )}
          <div className="flex-1">
            <h4 className={`font-medium ${
              encryptionInfo.supported ? 'text-green-400' : 'text-yellow-400'
            }`}>
              {encryptionInfo.supported ? 'Encryption Active' : 'Encryption Unavailable'}
            </h4>
            <p className={`text-sm mt-1 ${
              encryptionInfo.supported ? 'text-green-400/80' : 'text-yellow-400/80'
            }`}>
              {encryptionInfo.supported 
                ? `Using ${encryptionInfo.algorithm} with ${encryptionInfo.keyLength}-bit key`
                : 'Your browser does not support Web Crypto API'}
            </p>
          </div>
        </div>
      </div>

      {/* Storage Encryption Progress */}
      {encryptionInfo.supported && (
        <div className="p-4 rounded-xl bg-[#1A1A1A] border border-white/5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-gray-400" />
              <span className="text-gray-400 text-sm">Local Storage Encryption</span>
            </div>
            <span className="text-[#00F0FF] font-mono text-sm">
              {encryptionPercentage}%
            </span>
          </div>
          
          <Progress value={encryptionPercentage} className="h-2 mb-3" />
          
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>{storageStats.encrypted} encrypted items</span>
            <span>{storageStats.total} total items</span>
          </div>

          {storageStats.total > storageStats.encrypted && (
            <Button
              data-testid="migrate-data-btn"
              onClick={handleMigrateData}
              disabled={migrating}
              size="sm"
              className="w-full mt-4 bg-gradient-to-r from-[#00F0FF] to-[#7000FF] hover:opacity-90 text-white"
            >
              {migrating ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Migrating...
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 mr-2" />
                  Encrypt Remaining Data
                </>
              )}
            </Button>
          )}
        </div>
      )}

      {/* Encryption Details */}
      <div className="space-y-2">
        <div className="flex items-center justify-between p-3 rounded-lg bg-[#0F0F0F]">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-gray-500" />
            <span className="text-gray-400 text-sm">Encryption Key</span>
          </div>
          <span className={`text-xs px-2 py-1 rounded-full ${
            encryptionInfo.hasKey 
              ? 'bg-green-500/20 text-green-400' 
              : 'bg-gray-500/20 text-gray-400'
          }`}>
            {encryptionInfo.hasKey ? 'Generated' : 'Not Set'}
          </span>
        </div>

        <div className="flex items-center justify-between p-3 rounded-lg bg-[#0F0F0F]">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-gray-500" />
            <span className="text-gray-400 text-sm">Algorithm</span>
          </div>
          <span className="text-gray-300 text-sm font-mono">
            {encryptionInfo.algorithm}
          </span>
        </div>

        <div className="flex items-center justify-between p-3 rounded-lg bg-[#0F0F0F]">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-gray-500" />
            <span className="text-gray-400 text-sm">Key Length</span>
          </div>
          <span className="text-gray-300 text-sm font-mono">
            {encryptionInfo.keyLength} bits
          </span>
        </div>
      </div>
    </div>
  );
};

export default EncryptionStatus;
