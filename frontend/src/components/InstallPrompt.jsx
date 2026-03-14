import { motion, AnimatePresence } from "framer-motion";
import { Download, X, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";

export const InstallPrompt = ({ isVisible, onInstall, onDismiss }) => {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          className="fixed bottom-20 left-4 right-4 md:left-auto md:right-6 md:w-[360px] z-50"
        >
          <div className="glass rounded-2xl p-4 border border-[#00F0FF]/30 shadow-lg shadow-[#00F0FF]/10">
            <div className="flex items-start gap-4">
              {/* Icon */}
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#00F0FF] to-[#7000FF] flex items-center justify-center flex-shrink-0">
                <Smartphone className="w-6 h-6 text-white" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <h3 className="text-white font-semibold font-['Outfit'] text-lg">
                  Install FaceConnect
                </h3>
                <p className="text-gray-400 text-sm mt-1">
                  Add to your home screen for quick access and offline use
                </p>

                {/* Actions */}
                <div className="flex gap-2 mt-3">
                  <Button
                    data-testid="install-app-btn"
                    onClick={onInstall}
                    size="sm"
                    className="bg-gradient-to-r from-[#00F0FF] to-[#7000FF] hover:opacity-90 text-white"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Install
                  </Button>
                  <Button
                    data-testid="dismiss-install-btn"
                    onClick={onDismiss}
                    size="sm"
                    variant="ghost"
                    className="text-gray-400 hover:text-white hover:bg-white/5"
                  >
                    Not now
                  </Button>
                </div>
              </div>

              {/* Close */}
              <button
                onClick={onDismiss}
                className="w-6 h-6 rounded-full flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default InstallPrompt;
