import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Scan, Camera, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { haptic } from "@/utils/mobile";
import FaceScanner from "@/components/FaceScanner";

export default function FaceScanButton({ 
  variant = "default", // default, fab, icon, mini
  className = "",
  showLabel = true 
}) {
  const [isOpen, setIsOpen] = useState(false);

  const handleClick = () => {
    haptic.medium();
    setIsOpen(true);
  };

  const buttonVariants = {
    default: (
      <Button
        data-testid="facescan-btn"
        onClick={handleClick}
        className={`bg-gradient-to-r from-[#00F0FF] to-[#7000FF] hover:opacity-90 text-white ${className}`}
      >
        <Scan className="w-5 h-5 mr-2" />
        {showLabel && "FaceScan"}
      </Button>
    ),
    fab: (
      <motion.button
        data-testid="facescan-fab"
        onClick={handleClick}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={`fixed bottom-24 right-4 z-50 w-14 h-14 rounded-full bg-gradient-to-r from-[#00F0FF] to-[#7000FF] shadow-lg shadow-[#00F0FF]/30 flex items-center justify-center ${className}`}
      >
        <Scan className="w-6 h-6 text-white" />
        <motion.div
          className="absolute inset-0 rounded-full bg-white/20"
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      </motion.button>
    ),
    icon: (
      <button
        data-testid="facescan-icon-btn"
        onClick={handleClick}
        className={`p-2 rounded-full hover:bg-white/10 transition-colors ${className}`}
      >
        <Scan className="w-6 h-6 text-[#00F0FF]" />
      </button>
    ),
    mini: (
      <motion.button
        data-testid="facescan-mini"
        onClick={handleClick}
        whileTap={{ scale: 0.9 }}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-[#00F0FF]/20 to-[#7000FF]/20 border border-[#00F0FF]/30 ${className}`}
      >
        <Sparkles className="w-4 h-4 text-[#00F0FF]" />
        <span className="text-xs font-medium text-white">Scan</span>
      </motion.button>
    ),
  };

  return (
    <>
      {buttonVariants[variant]}
      <FaceScanner isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
