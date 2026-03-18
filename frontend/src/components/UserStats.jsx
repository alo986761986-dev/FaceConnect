import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  BarChart3, Heart, MessageSquare, Users, Eye, 
  Coins, Crown, TrendingUp, Loader2 
} from "lucide-react";
import { toast } from "sonner";

const API = process.env.REACT_APP_BACKEND_URL;

function MiniStatCard({ title, value, icon: Icon, color = "primary" }) {
  const colors = {
    primary: "text-[var(--primary)]",
    green: "text-green-500",
    yellow: "text-yellow-500",
    purple: "text-purple-500",
    pink: "text-pink-500"
  };

  return (
    <div className="bg-[var(--muted)] rounded-xl p-4 text-center">
      <Icon className={`w-5 h-5 mx-auto mb-2 ${colors[color]}`} />
      <p className="text-xl font-bold text-[var(--text-primary)]">{value}</p>
      <p className="text-xs text-[var(--text-muted)]">{title}</p>
    </div>
  );
}

export default function UserStats({ userId }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      fetchStats();
    }
  }, [userId]);

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API}/api/analytics/user/${userId}/stats`);
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Error fetching user stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--primary)]" />
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[var(--card)] rounded-2xl p-5 border border-[var(--border)]"
    >
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="w-5 h-5 text-[var(--primary)]" />
        <h3 className="font-bold text-[var(--text-primary)]">Your Stats</h3>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <MiniStatCard
          title="Posts"
          value={stats.posts_count}
          icon={BarChart3}
          color="primary"
        />
        <MiniStatCard
          title="Followers"
          value={stats.followers_count}
          icon={Users}
          color="purple"
        />
        <MiniStatCard
          title="Following"
          value={stats.following_count}
          icon={Users}
          color="green"
        />
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <MiniStatCard
          title="Likes"
          value={stats.likes_received}
          icon={Heart}
          color="pink"
        />
        <MiniStatCard
          title="Comments"
          value={stats.comments_received}
          icon={MessageSquare}
          color="primary"
        />
        <MiniStatCard
          title="Views"
          value={stats.profile_views}
          icon={Eye}
          color="purple"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[var(--muted)] rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-yellow-500/20 flex items-center justify-center">
            <Coins className="w-5 h-5 text-yellow-500" />
          </div>
          <div>
            <p className="text-lg font-bold text-[var(--text-primary)]">{stats.coins_balance}</p>
            <p className="text-xs text-[var(--text-muted)]">Coins</p>
          </div>
        </div>
        
        <div className="bg-[var(--muted)] rounded-xl p-4 flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            stats.is_premium ? "bg-yellow-500/20" : "bg-[var(--border)]"
          }`}>
            <Crown className={`w-5 h-5 ${stats.is_premium ? "text-yellow-500" : "text-[var(--text-muted)]"}`} />
          </div>
          <div>
            <p className="text-lg font-bold text-[var(--text-primary)]">
              {stats.is_premium ? "Premium" : "Free"}
            </p>
            <p className="text-xs text-[var(--text-muted)]">Account</p>
          </div>
        </div>
      </div>

      {stats.engagement_rate > 0 && (
        <div className="mt-4 p-3 bg-green-500/10 rounded-xl flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-green-500" />
          <span className="text-sm text-green-500">
            {stats.engagement_rate}% engagement rate
          </span>
        </div>
      )}
    </motion.div>
  );
}
