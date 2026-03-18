import { motion, AnimatePresence } from "framer-motion";
import { Crown, Lock, Sparkles, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { usePremium } from "@/context/PremiumContext";

// Premium badge component
export function PremiumBadge({ size = "sm" }) {
  const sizes = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6"
  };

  return (
    <div className="inline-flex items-center justify-center bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full p-0.5">
      <Crown className={`${sizes[size]} text-white`} />
    </div>
  );
}

// Verified badge for premium users
export function VerifiedBadge({ size = "sm" }) {
  const { hasVerifiedBadge } = usePremium();
  
  if (!hasVerifiedBadge()) return null;

  const sizes = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6"
  };

  return (
    <div className="inline-flex items-center justify-center bg-[var(--primary)] rounded-full p-0.5" title="Verified Premium">
      <svg className={`${sizes[size]} text-white`} viewBox="0 0 24 24" fill="currentColor">
        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
      </svg>
    </div>
  );
}

// Premium upgrade modal
export function PremiumUpgradeModal({ isOpen, onClose, feature }) {
  const navigate = useNavigate();

  const featureDescriptions = {
    posts: "Unlimited daily posts",
    stories: "Unlimited daily stories",
    hdVideo: "HD video uploads (1080p)",
    analytics: "Personal analytics & insights",
    themes: "Custom themes & appearance",
    adFree: "Ad-free experience",
    verified: "Verified badge on your profile",
    priority: "Priority in Explore & search"
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-[var(--card)] rounded-3xl p-6 w-full max-w-sm border border-[var(--border)] shadow-2xl"
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-[var(--muted)] transition-colors"
            >
              <X className="w-5 h-5 text-[var(--text-muted)]" />
            </button>

            {/* Header */}
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center">
                <Crown className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-[var(--text-primary)]">Upgrade to Premium</h3>
              <p className="text-[var(--text-muted)] text-sm mt-1">
                {feature ? featureDescriptions[feature] : "Unlock all premium features"}
              </p>
            </div>

            {/* Features list */}
            <div className="space-y-3 mb-6">
              {Object.entries(featureDescriptions).map(([key, desc]) => (
                <div key={key} className="flex items-center gap-3 text-sm">
                  <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center">
                    <Sparkles className="w-3 h-3 text-green-500" />
                  </div>
                  <span className={`${feature === key ? "text-[var(--primary)] font-medium" : "text-[var(--text-secondary)]"}`}>
                    {desc}
                  </span>
                </div>
              ))}
            </div>

            {/* CTA */}
            <Button
              onClick={() => {
                onClose();
                navigate("/premium");
              }}
              className="w-full h-12 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-semibold rounded-xl"
            >
              <Crown className="w-4 h-4 mr-2" />
              View Premium Plans
            </Button>

            <p className="text-center text-xs text-[var(--text-muted)] mt-4">
              Starting at $9.99/month
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Premium gate wrapper - shows lock for non-premium users
export function PremiumGate({ children, feature, fallback, showLock = true }) {
  const { isPremium, loading } = usePremium();

  if (loading) {
    return fallback || null;
  }

  if (!isPremium) {
    if (showLock) {
      return (
        <div className="relative">
          <div className="opacity-50 pointer-events-none blur-[2px]">
            {children}
          </div>
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[1px] rounded-xl">
            <div className="text-center p-4">
              <Lock className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
              <p className="text-sm font-medium text-white">Premium Feature</p>
            </div>
          </div>
        </div>
      );
    }
    return fallback || null;
  }

  return children;
}

// Premium feature button - opens upgrade modal if not premium
export function PremiumFeatureButton({ 
  children, 
  feature, 
  onClick, 
  disabled,
  className,
  ...props 
}) {
  const { isPremium } = usePremium();
  const [showModal, setShowModal] = useState(false);

  const handleClick = (e) => {
    if (!isPremium) {
      e.preventDefault();
      setShowModal(true);
    } else if (onClick) {
      onClick(e);
    }
  };

  return (
    <>
      <Button
        onClick={handleClick}
        disabled={disabled}
        className={className}
        {...props}
      >
        {!isPremium && <Lock className="w-3 h-3 mr-1" />}
        {children}
      </Button>
      <PremiumUpgradeModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        feature={feature}
      />
    </>
  );
}

// Add missing import
import { useState } from "react";

// Post limit warning component
export function PostLimitWarning() {
  const { isPremium, getRemainingPosts, postsToday, limits } = usePremium();
  const navigate = useNavigate();

  if (isPremium) return null;

  const remaining = getRemainingPosts();
  
  if (remaining > 3) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-3 rounded-xl mb-4 ${
        remaining === 0 
          ? "bg-red-500/10 border border-red-500/20" 
          : "bg-yellow-500/10 border border-yellow-500/20"
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {remaining === 0 ? (
            <Lock className="w-4 h-4 text-red-500" />
          ) : (
            <Crown className="w-4 h-4 text-yellow-500" />
          )}
          <span className={`text-sm font-medium ${remaining === 0 ? "text-red-500" : "text-yellow-500"}`}>
            {remaining === 0 
              ? "Daily post limit reached" 
              : `${remaining} posts remaining today`}
          </span>
        </div>
        <button
          onClick={() => navigate("/premium")}
          className="text-xs font-medium text-[var(--primary)] hover:underline"
        >
          Go Unlimited
        </button>
      </div>
    </motion.div>
  );
}

// Ad placeholder component (shown to free users)
export function AdPlaceholder({ size = "banner" }) {
  const { showsAds, isPremium } = usePremium();
  const navigate = useNavigate();

  if (!showsAds() || isPremium) return null;

  const sizes = {
    banner: "h-16",
    medium: "h-32",
    large: "h-48"
  };

  return (
    <div className={`${sizes[size]} bg-[var(--muted)] rounded-xl flex items-center justify-center border border-dashed border-[var(--border)] my-4`}>
      <div className="text-center">
        <p className="text-xs text-[var(--text-muted)]">Advertisement</p>
        <button
          onClick={() => navigate("/premium")}
          className="text-xs text-[var(--primary)] hover:underline mt-1"
        >
          Remove ads with Premium
        </button>
      </div>
    </div>
  );
}

export default PremiumGate;
