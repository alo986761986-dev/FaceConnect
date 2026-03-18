import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Crown, Check, Coins, Sparkles, ArrowLeft, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

const API = process.env.REACT_APP_BACKEND_URL;

export default function Premium() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [packages, setPackages] = useState({ subscriptions: {}, coins: {} });
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(null);
  const [activeTab, setActiveTab] = useState("subscriptions");

  useEffect(() => {
    fetchPackages();
    checkPaymentStatus();
  }, []);

  const fetchPackages = async () => {
    try {
      const response = await fetch(`${API}/api/payments/packages`);
      const data = await response.json();
      setPackages(data);
    } catch (error) {
      console.error("Error fetching packages:", error);
      toast.error("Failed to load packages");
    } finally {
      setLoading(false);
    }
  };

  const checkPaymentStatus = async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get("session_id");
    
    if (sessionId) {
      try {
        const response = await fetch(`${API}/api/payments/status/${sessionId}`);
        const data = await response.json();
        
        if (data.payment_status === "paid") {
          toast.success("Payment successful! Thank you for your purchase.");
          if (data.coins_awarded) {
            toast.success(`${data.coins_awarded} coins added to your account!`);
          }
        } else if (data.status === "expired") {
          toast.error("Payment session expired. Please try again.");
        }
        
        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname);
      } catch (error) {
        console.error("Error checking payment status:", error);
      }
    }
  };

  const handlePurchase = async (packageId) => {
    setPurchasing(packageId);
    
    try {
      const response = await fetch(`${API}/api/payments/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          package_id: packageId,
          origin_url: window.location.origin,
          user_id: user?.id
        })
      });
      
      const data = await response.json();
      
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL received");
      }
    } catch (error) {
      console.error("Error creating checkout:", error);
      toast.error("Failed to start checkout. Please try again.");
    } finally {
      setPurchasing(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[var(--background)]/80 backdrop-blur-xl border-b border-[var(--border)]">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="rounded-full"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center">
              <Crown className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-[var(--text-primary)]">Premium & Coins</h1>
              <p className="text-xs text-[var(--text-muted)]">Upgrade your experience</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Tab Switcher */}
        <div className="flex gap-2 mb-6 p-1 bg-[var(--muted)] rounded-xl">
          <button
            onClick={() => setActiveTab("subscriptions")}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
              activeTab === "subscriptions"
                ? "bg-[var(--card)] text-[var(--text-primary)] shadow-sm"
                : "text-[var(--text-muted)]"
            }`}
          >
            <Crown className="w-4 h-4 inline mr-2" />
            Premium Plans
          </button>
          <button
            onClick={() => setActiveTab("coins")}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
              activeTab === "coins"
                ? "bg-[var(--card)] text-[var(--text-primary)] shadow-sm"
                : "text-[var(--text-muted)]"
            }`}
          >
            <Coins className="w-4 h-4 inline mr-2" />
            Buy Coins
          </button>
        </div>

        {/* Subscriptions Tab */}
        {activeTab === "subscriptions" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {Object.entries(packages.subscriptions).map(([id, plan]) => (
              <div
                key={id}
                className={`bg-[var(--card)] rounded-2xl p-6 border ${
                  id === "premium_yearly" 
                    ? "border-yellow-500/50 ring-2 ring-yellow-500/20" 
                    : "border-[var(--border)]"
                }`}
              >
                {id === "premium_yearly" && (
                  <div className="inline-block px-3 py-1 bg-yellow-500/20 text-yellow-500 text-xs font-semibold rounded-full mb-3">
                    BEST VALUE
                  </div>
                )}
                
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-[var(--text-primary)]">{plan.name}</h3>
                    <p className="text-[var(--text-muted)] text-sm">
                      {id === "premium_yearly" ? "Save 2 months!" : "Billed monthly"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-[var(--text-primary)]">
                      ${plan.amount}
                    </p>
                    <p className="text-[var(--text-muted)] text-sm">
                      {id === "premium_yearly" ? "/year" : "/month"}
                    </p>
                  </div>
                </div>
                
                <ul className="space-y-2 mb-6">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-[var(--text-secondary)]">
                      <Check className="w-4 h-4 text-green-500" />
                      {feature}
                    </li>
                  ))}
                </ul>
                
                <Button
                  onClick={() => handlePurchase(id)}
                  disabled={purchasing === id}
                  className={`w-full h-12 font-semibold rounded-xl ${
                    id === "premium_yearly"
                      ? "bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600"
                      : "bg-[var(--primary)] hover:bg-[var(--primary-dark)]"
                  } text-white`}
                >
                  {purchasing === id ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Subscribe Now
                    </>
                  )}
                </Button>
              </div>
            ))}
          </motion.div>
        )}

        {/* Coins Tab */}
        {activeTab === "coins" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-2 gap-4"
          >
            {Object.entries(packages.coins).map(([id, pack]) => (
              <div
                key={id}
                className="bg-[var(--card)] rounded-2xl p-5 border border-[var(--border)] hover:border-[var(--primary)]/50 transition-colors"
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-yellow-500/20 flex items-center justify-center">
                    <Coins className="w-5 h-5 text-yellow-500" />
                  </div>
                  <div>
                    <p className="font-bold text-[var(--text-primary)]">{pack.coins}</p>
                    <p className="text-xs text-[var(--text-muted)]">coins</p>
                  </div>
                </div>
                
                {pack.bonus > 0 && (
                  <div className="inline-block px-2 py-1 bg-green-500/20 text-green-500 text-xs font-semibold rounded-full mb-3">
                    +{pack.bonus} BONUS
                  </div>
                )}
                
                <p className="text-2xl font-bold text-[var(--text-primary)] mb-3">
                  ${pack.amount}
                </p>
                
                <Button
                  onClick={() => handlePurchase(id)}
                  disabled={purchasing === id}
                  variant="outline"
                  className="w-full h-10 font-medium rounded-xl border-[var(--border)] hover:bg-[var(--muted)]"
                >
                  {purchasing === id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Buy"
                  )}
                </Button>
              </div>
            ))}
          </motion.div>
        )}

        {/* Info Section */}
        <div className="mt-8 p-4 bg-[var(--muted)] rounded-xl">
          <p className="text-sm text-[var(--text-muted)] text-center">
            Payments are processed securely by Stripe. 
            You can cancel your subscription anytime from Settings.
          </p>
        </div>
      </main>
    </div>
  );
}
