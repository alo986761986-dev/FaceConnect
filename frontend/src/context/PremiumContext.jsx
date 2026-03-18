import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useAuth } from "./AuthContext";

const API = process.env.REACT_APP_BACKEND_URL;

// Premium feature limits for free users
export const FREE_LIMITS = {
  POSTS_PER_DAY: 10,
  VIDEO_QUALITY: "sd",  // 480p max
  MAX_VIDEO_SIZE_MB: 50,
  STORIES_PER_DAY: 5,
  MAX_CLOSE_FRIENDS: 10,
  CAN_VIEW_ANALYTICS: false,
  CAN_USE_THEMES: false,
  SHOWS_ADS: true,
  PRIORITY_IN_EXPLORE: false,
  VERIFIED_BADGE: false
};

// Premium users get unlimited access
export const PREMIUM_LIMITS = {
  POSTS_PER_DAY: Infinity,
  VIDEO_QUALITY: "hd",  // 1080p
  MAX_VIDEO_SIZE_MB: 500,
  STORIES_PER_DAY: Infinity,
  MAX_CLOSE_FRIENDS: Infinity,
  CAN_VIEW_ANALYTICS: true,
  CAN_USE_THEMES: true,
  SHOWS_ADS: false,
  PRIORITY_IN_EXPLORE: true,
  VERIFIED_BADGE: true
};

const PremiumContext = createContext(null);

export function PremiumProvider({ children }) {
  const { user, token } = useAuth();
  const [premiumStatus, setPremiumStatus] = useState({
    isPremium: false,
    plan: null,
    expiresAt: null,
    coins: 0,
    loading: true
  });
  const [postsToday, setPostsToday] = useState(0);
  const [storiesToday, setStoriesToday] = useState(0);

  // Fetch premium status
  const fetchPremiumStatus = useCallback(async () => {
    if (!user?.id) {
      setPremiumStatus(prev => ({ ...prev, loading: false }));
      return;
    }

    try {
      const response = await fetch(`${API}/api/payments/balance/${user.id}`);
      if (response.ok) {
        const data = await response.json();
        setPremiumStatus({
          isPremium: data.is_premium || false,
          plan: data.subscription_plan || null,
          expiresAt: data.subscription_end || null,
          coins: data.coins || 0,
          loading: false
        });
      }
    } catch (error) {
      console.error("Error fetching premium status:", error);
      setPremiumStatus(prev => ({ ...prev, loading: false }));
    }
  }, [user?.id]);

  // Fetch daily post/story counts
  const fetchDailyCounts = useCallback(async () => {
    if (!user?.id) return;

    try {
      const response = await fetch(`${API}/api/users/${user.id}/daily-counts`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setPostsToday(data.posts_today || 0);
        setStoriesToday(data.stories_today || 0);
      }
    } catch (error) {
      // Silently fail - counts will be 0
    }
  }, [user?.id, token]);

  useEffect(() => {
    fetchPremiumStatus();
    fetchDailyCounts();
  }, [fetchPremiumStatus, fetchDailyCounts]);

  // Get current limits based on premium status
  const getLimits = useCallback(() => {
    return premiumStatus.isPremium ? PREMIUM_LIMITS : FREE_LIMITS;
  }, [premiumStatus.isPremium]);

  // Check if user can perform action
  const canPost = useCallback(() => {
    const limits = getLimits();
    return limits.POSTS_PER_DAY === Infinity || postsToday < limits.POSTS_PER_DAY;
  }, [getLimits, postsToday]);

  const canPostStory = useCallback(() => {
    const limits = getLimits();
    return limits.STORIES_PER_DAY === Infinity || storiesToday < limits.STORIES_PER_DAY;
  }, [getLimits, storiesToday]);

  const canUploadHDVideo = useCallback(() => {
    return getLimits().VIDEO_QUALITY === "hd";
  }, [getLimits]);

  const canViewAnalytics = useCallback(() => {
    return getLimits().CAN_VIEW_ANALYTICS;
  }, [getLimits]);

  const canUseThemes = useCallback(() => {
    return getLimits().CAN_USE_THEMES;
  }, [getLimits]);

  const showsAds = useCallback(() => {
    return getLimits().SHOWS_ADS;
  }, [getLimits]);

  const hasVerifiedBadge = useCallback(() => {
    return premiumStatus.isPremium && getLimits().VERIFIED_BADGE;
  }, [premiumStatus.isPremium, getLimits]);

  const hasPriorityInExplore = useCallback(() => {
    return getLimits().PRIORITY_IN_EXPLORE;
  }, [getLimits]);

  // Get remaining posts/stories for today
  const getRemainingPosts = useCallback(() => {
    const limits = getLimits();
    if (limits.POSTS_PER_DAY === Infinity) return Infinity;
    return Math.max(0, limits.POSTS_PER_DAY - postsToday);
  }, [getLimits, postsToday]);

  const getRemainingStories = useCallback(() => {
    const limits = getLimits();
    if (limits.STORIES_PER_DAY === Infinity) return Infinity;
    return Math.max(0, limits.STORIES_PER_DAY - storiesToday);
  }, [getLimits, storiesToday]);

  // Increment counters (call after successful post/story)
  const incrementPostCount = useCallback(() => {
    setPostsToday(prev => prev + 1);
  }, []);

  const incrementStoryCount = useCallback(() => {
    setStoriesToday(prev => prev + 1);
  }, []);

  // Spend coins
  const spendCoins = useCallback(async (amount, description) => {
    if (premiumStatus.coins < amount) {
      return { success: false, error: "Insufficient coins" };
    }

    try {
      const response = await fetch(`${API}/api/users/${user.id}/spend-coins`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ amount, description })
      });

      if (response.ok) {
        setPremiumStatus(prev => ({
          ...prev,
          coins: prev.coins - amount
        }));
        return { success: true };
      } else {
        return { success: false, error: "Failed to spend coins" };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }, [premiumStatus.coins, user?.id, token]);

  // Refresh premium status
  const refreshStatus = useCallback(() => {
    fetchPremiumStatus();
    fetchDailyCounts();
  }, [fetchPremiumStatus, fetchDailyCounts]);

  const value = {
    ...premiumStatus,
    limits: getLimits(),
    postsToday,
    storiesToday,
    canPost,
    canPostStory,
    canUploadHDVideo,
    canViewAnalytics,
    canUseThemes,
    showsAds,
    hasVerifiedBadge,
    hasPriorityInExplore,
    getRemainingPosts,
    getRemainingStories,
    incrementPostCount,
    incrementStoryCount,
    spendCoins,
    refreshStatus
  };

  return (
    <PremiumContext.Provider value={value}>
      {children}
    </PremiumContext.Provider>
  );
}

export function usePremium() {
  const context = useContext(PremiumContext);
  if (!context) {
    throw new Error("usePremium must be used within a PremiumProvider");
  }
  return context;
}

export default PremiumContext;
