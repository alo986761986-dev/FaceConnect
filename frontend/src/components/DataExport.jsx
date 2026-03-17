import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Download, FileText, FileSpreadsheet, File, 
  MessageSquare, Image, User, Database,
  Loader2, Check, X, AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { haptic } from "@/utils/mobile";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const EXPORT_TYPES = [
  {
    id: "profile",
    label: "Profile",
    description: "Your account info and stats",
    icon: User,
    color: "from-blue-500 to-cyan-500"
  },
  {
    id: "conversations",
    label: "Conversations",
    description: "All your chat messages",
    icon: MessageSquare,
    color: "from-green-500 to-emerald-500"
  },
  {
    id: "posts",
    label: "Posts",
    description: "Your posts and media",
    icon: Image,
    color: "from-purple-500 to-pink-500"
  },
  {
    id: "all",
    label: "Complete Export",
    description: "All your data (GDPR)",
    icon: Database,
    color: "from-orange-500 to-red-500"
  }
];

const FORMAT_OPTIONS = [
  { id: "json", label: "JSON", icon: FileText, description: "Machine-readable" },
  { id: "csv", label: "CSV", icon: FileSpreadsheet, description: "Spreadsheet" },
  { id: "pdf", label: "PDF/HTML", icon: File, description: "Printable" }
];

export function DataExportDialog({ open, onOpenChange }) {
  const { token } = useAuth();
  const [selectedType, setSelectedType] = useState(null);
  const [selectedFormat, setSelectedFormat] = useState("json");
  const [exporting, setExporting] = useState(false);
  const [exportComplete, setExportComplete] = useState(false);

  const handleExport = async () => {
    if (!selectedType || !token) return;
    
    setExporting(true);
    haptic.light();
    
    try {
      const endpoint = `${API}/export/${selectedType}?token=${token}&format=${selectedFormat}`;
      const response = await fetch(endpoint);
      
      if (!response.ok) {
        throw new Error("Export failed");
      }
      
      // Get content type to determine how to handle
      const contentType = response.headers.get("content-type");
      
      if (contentType?.includes("application/json")) {
        // JSON response - download as file
        const data = await response.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        downloadBlob(blob, `faceconnect_${selectedType}_export.json`);
      } else {
        // CSV or HTML response - download directly
        const blob = await response.blob();
        const extension = contentType?.includes("csv") ? "csv" : "html";
        downloadBlob(blob, `faceconnect_${selectedType}_export.${extension}`);
      }
      
      setExportComplete(true);
      haptic.success();
      toast.success("Export downloaded successfully!");
      
      setTimeout(() => {
        setExportComplete(false);
        setSelectedType(null);
      }, 2000);
      
    } catch (error) {
      console.error("Export failed:", error);
      toast.error("Failed to export data. Please try again.");
      haptic.error();
    } finally {
      setExporting(false);
    }
  };

  const downloadBlob = (blob, filename) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const handleClose = () => {
    if (!exporting) {
      setSelectedType(null);
      setSelectedFormat("json");
      setExportComplete(false);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-[#1a1a1a] border-white/10 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-5 h-5 text-[#00F0FF]" />
            Export Your Data
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Download your FaceConnect data in your preferred format
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Export Type Selection */}
          <div>
            <label className="text-sm text-gray-400 mb-3 block">What to export</label>
            <div className="grid grid-cols-2 gap-2">
              {EXPORT_TYPES.map(type => {
                const Icon = type.icon;
                const isSelected = selectedType === type.id;
                
                return (
                  <motion.button
                    key={type.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setSelectedType(type.id);
                      haptic.light();
                    }}
                    className={`p-3 rounded-xl text-left transition-all ${
                      isSelected
                        ? `bg-gradient-to-br ${type.color} text-white`
                        : "bg-white/5 hover:bg-white/10"
                    }`}
                    data-testid={`export-type-${type.id}`}
                  >
                    <Icon className={`w-5 h-5 mb-2 ${isSelected ? "text-white" : "text-gray-400"}`} />
                    <div className="font-medium text-sm">{type.label}</div>
                    <div className={`text-xs ${isSelected ? "text-white/80" : "text-gray-500"}`}>
                      {type.description}
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Format Selection */}
          <AnimatePresence>
            {selectedType && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
              >
                <label className="text-sm text-gray-400 mb-3 block">Export format</label>
                <div className="flex gap-2">
                  {FORMAT_OPTIONS.filter(f => {
                    // CSV not available for "all" export
                    if (selectedType === "all" && f.id === "csv") return false;
                    return true;
                  }).map(format => {
                    const Icon = format.icon;
                    const isSelected = selectedFormat === format.id;
                    
                    return (
                      <button
                        key={format.id}
                        onClick={() => {
                          setSelectedFormat(format.id);
                          haptic.light();
                        }}
                        className={`flex-1 p-3 rounded-xl text-center transition-all ${
                          isSelected
                            ? "bg-[#7000FF] text-white"
                            : "bg-white/5 hover:bg-white/10"
                        }`}
                        data-testid={`export-format-${format.id}`}
                      >
                        <Icon className="w-5 h-5 mx-auto mb-1" />
                        <div className="text-sm font-medium">{format.label}</div>
                        <div className={`text-xs ${isSelected ? "text-white/70" : "text-gray-500"}`}>
                          {format.description}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Export Button */}
          <Button
            onClick={handleExport}
            disabled={!selectedType || exporting}
            className={`w-full py-3 rounded-xl font-semibold transition-all ${
              exportComplete
                ? "bg-green-500 hover:bg-green-500"
                : "bg-gradient-to-r from-[#00F0FF] to-[#7000FF] hover:opacity-90"
            }`}
            data-testid="export-download-btn"
          >
            {exporting ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Exporting...
              </>
            ) : exportComplete ? (
              <>
                <Check className="w-5 h-5 mr-2" />
                Downloaded!
              </>
            ) : (
              <>
                <Download className="w-5 h-5 mr-2" />
                Download Export
              </>
            )}
          </Button>

          {/* Privacy Notice */}
          <div className="flex items-start gap-2 p-3 bg-white/5 rounded-lg">
            <AlertCircle className="w-4 h-4 text-[#00F0FF] flex-shrink-0 mt-0.5" />
            <p className="text-xs text-gray-400">
              Your data is exported directly to your device. We don't store or share exported files.
              For GDPR requests, use "Complete Export".
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Export button component for Settings page
export function ExportDataButton({ isDark }) {
  const [showDialog, setShowDialog] = useState(false);

  return (
    <>
      <Button
        onClick={() => setShowDialog(true)}
        variant="outline"
        className={`w-full justify-start gap-3 ${
          isDark ? "border-white/10 hover:bg-white/5" : "border-gray-200"
        }`}
        data-testid="export-data-btn"
      >
        <Download className="w-5 h-5 text-[#00F0FF]" />
        <div className="text-left">
          <div className="font-medium">Export Your Data</div>
          <div className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>
            Download profile, posts, conversations
          </div>
        </div>
      </Button>

      <DataExportDialog open={showDialog} onOpenChange={setShowDialog} />
    </>
  );
}

export default DataExportDialog;
