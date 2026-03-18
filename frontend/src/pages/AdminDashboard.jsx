import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  BarChart3, Users, FileText, DollarSign, TrendingUp, 
  ArrowLeft, Loader2, Crown, MessageSquare, Heart, Eye
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const API = process.env.REACT_APP_BACKEND_URL;

function StatCard({ title, value, subtitle, icon: Icon, trend, color = "primary" }) {
  const colors = {
    primary: "bg-[var(--primary)]/10 text-[var(--primary)]",
    green: "bg-green-500/10 text-green-500",
    yellow: "bg-yellow-500/10 text-yellow-500",
    purple: "bg-purple-500/10 text-purple-500"
  };

  return (
    <div className="bg-[var(--card)] rounded-2xl p-5 border border-[var(--border)]">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl ${colors[color]} flex items-center justify-center`}>
          <Icon className="w-5 h-5" />
        </div>
        {trend && (
          <span className={`text-xs font-medium px-2 py-1 rounded-full ${
            trend > 0 ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
          }`}>
            {trend > 0 ? "+" : ""}{trend}%
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-[var(--text-primary)]">{value}</p>
      <p className="text-sm text-[var(--text-muted)]">{title}</p>
      {subtitle && <p className="text-xs text-[var(--text-muted)] mt-1">{subtitle}</p>}
    </div>
  );
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState(null);
  const [activeSection, setActiveSection] = useState("overview");

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const response = await fetch(`${API}/api/analytics/admin/dashboard`);
      const data = await response.json();
      setDashboard(data);
    } catch (error) {
      console.error("Error fetching dashboard:", error);
      toast.error("Failed to load analytics");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <p className="text-[var(--text-muted)]">Failed to load dashboard</p>
      </div>
    );
  }

  const { user_analytics, content_analytics, revenue_analytics, top_posts, recent_signups } = dashboard;

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[var(--background)]/80 backdrop-blur-xl border-b border-[var(--border)]">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="rounded-full"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-[var(--primary)]" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-[var(--text-primary)]">Admin Dashboard</h1>
              <p className="text-xs text-[var(--text-muted)]">Analytics & Insights</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* Section Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {["overview", "users", "content", "revenue"].map((section) => (
            <button
              key={section}
              onClick={() => setActiveSection(section)}
              className={`px-4 py-2 rounded-xl font-medium whitespace-nowrap transition-all ${
                activeSection === section
                  ? "bg-[var(--primary)] text-white"
                  : "bg-[var(--muted)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              {section.charAt(0).toUpperCase() + section.slice(1)}
            </button>
          ))}
        </div>

        {/* Overview Section */}
        {activeSection === "overview" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard
                title="Total Users"
                value={user_analytics.total_users.toLocaleString()}
                subtitle={`${user_analytics.new_users_week} new this week`}
                icon={Users}
                color="primary"
              />
              <StatCard
                title="Total Posts"
                value={content_analytics.total_posts.toLocaleString()}
                subtitle={`${content_analytics.posts_week} this week`}
                icon={FileText}
                color="purple"
              />
              <StatCard
                title="Total Revenue"
                value={`$${revenue_analytics.total_revenue.toLocaleString()}`}
                subtitle={`$${revenue_analytics.revenue_month} this month`}
                icon={DollarSign}
                color="green"
              />
              <StatCard
                title="Premium Users"
                value={user_analytics.premium_users.toLocaleString()}
                subtitle={`${revenue_analytics.active_subscriptions} active`}
                icon={Crown}
                color="yellow"
              />
            </div>

            {/* Secondary Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard
                title="Total Likes"
                value={content_analytics.total_likes.toLocaleString()}
                icon={Heart}
                color="primary"
              />
              <StatCard
                title="Total Comments"
                value={content_analytics.total_comments.toLocaleString()}
                icon={MessageSquare}
                color="purple"
              />
              <StatCard
                title="Stories"
                value={content_analytics.total_stories.toLocaleString()}
                icon={Eye}
                color="green"
              />
              <StatCard
                title="Retention Rate"
                value={`${user_analytics.retention_rate}%`}
                icon={TrendingUp}
                color="yellow"
              />
            </div>

            {/* Top Posts & Recent Signups */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Top Posts */}
              <div className="bg-[var(--card)] rounded-2xl p-5 border border-[var(--border)]">
                <h3 className="font-bold text-[var(--text-primary)] mb-4">Top Posts</h3>
                <div className="space-y-3">
                  {top_posts.slice(0, 5).map((post, idx) => (
                    <div key={post.id || idx} className="flex items-center gap-3 p-3 bg-[var(--muted)] rounded-xl">
                      <span className="text-lg font-bold text-[var(--text-muted)]">#{idx + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-[var(--text-primary)] truncate">
                          {post.content || "No content"}
                        </p>
                        <div className="flex gap-3 text-xs text-[var(--text-muted)]">
                          <span>{post.likes_count || 0} likes</span>
                          <span>{post.comments_count || 0} comments</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Signups */}
              <div className="bg-[var(--card)] rounded-2xl p-5 border border-[var(--border)]">
                <h3 className="font-bold text-[var(--text-primary)] mb-4">Recent Signups</h3>
                <div className="space-y-3">
                  {recent_signups.slice(0, 5).map((user, idx) => (
                    <div key={user.id || idx} className="flex items-center gap-3 p-3 bg-[var(--muted)] rounded-xl">
                      <div className="w-10 h-10 rounded-full bg-[var(--primary)]/20 flex items-center justify-center">
                        <span className="text-[var(--primary)] font-bold">
                          {(user.display_name || user.username || "U")[0].toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                          {user.display_name || user.username}
                        </p>
                        <p className="text-xs text-[var(--text-muted)] truncate">
                          @{user.username}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Users Section */}
        {activeSection === "users" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard
                title="Total Users"
                value={user_analytics.total_users.toLocaleString()}
                icon={Users}
                color="primary"
              />
              <StatCard
                title="New Today"
                value={user_analytics.new_users_today.toLocaleString()}
                icon={TrendingUp}
                color="green"
              />
              <StatCard
                title="New This Week"
                value={user_analytics.new_users_week.toLocaleString()}
                icon={TrendingUp}
                color="purple"
              />
              <StatCard
                title="New This Month"
                value={user_analytics.new_users_month.toLocaleString()}
                icon={TrendingUp}
                color="yellow"
              />
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <StatCard
                title="Active Today"
                value={user_analytics.active_users_today.toLocaleString()}
                icon={Users}
                color="green"
              />
              <StatCard
                title="Active This Week"
                value={user_analytics.active_users_week.toLocaleString()}
                icon={Users}
                color="purple"
              />
              <StatCard
                title="Premium Users"
                value={user_analytics.premium_users.toLocaleString()}
                icon={Crown}
                color="yellow"
              />
            </div>
          </motion.div>
        )}

        {/* Content Section */}
        {activeSection === "content" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard
                title="Total Posts"
                value={content_analytics.total_posts.toLocaleString()}
                icon={FileText}
                color="primary"
              />
              <StatCard
                title="Posts Today"
                value={content_analytics.posts_today.toLocaleString()}
                icon={FileText}
                color="green"
              />
              <StatCard
                title="Stories"
                value={content_analytics.total_stories.toLocaleString()}
                icon={Eye}
                color="purple"
              />
              <StatCard
                title="Reels"
                value={content_analytics.total_reels.toLocaleString()}
                icon={FileText}
                color="yellow"
              />
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard
                title="Total Likes"
                value={content_analytics.total_likes.toLocaleString()}
                icon={Heart}
                color="primary"
              />
              <StatCard
                title="Total Comments"
                value={content_analytics.total_comments.toLocaleString()}
                icon={MessageSquare}
                color="green"
              />
              <StatCard
                title="Avg Likes/Post"
                value={content_analytics.avg_likes_per_post.toFixed(1)}
                icon={TrendingUp}
                color="purple"
              />
              <StatCard
                title="Avg Comments/Post"
                value={content_analytics.avg_comments_per_post.toFixed(1)}
                icon={TrendingUp}
                color="yellow"
              />
            </div>
          </motion.div>
        )}

        {/* Revenue Section */}
        {activeSection === "revenue" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard
                title="Total Revenue"
                value={`$${revenue_analytics.total_revenue.toLocaleString()}`}
                icon={DollarSign}
                color="green"
              />
              <StatCard
                title="Today"
                value={`$${revenue_analytics.revenue_today.toLocaleString()}`}
                icon={DollarSign}
                color="primary"
              />
              <StatCard
                title="This Week"
                value={`$${revenue_analytics.revenue_week.toLocaleString()}`}
                icon={DollarSign}
                color="purple"
              />
              <StatCard
                title="This Month"
                value={`$${revenue_analytics.revenue_month.toLocaleString()}`}
                icon={DollarSign}
                color="yellow"
              />
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard
                title="Total Subscriptions"
                value={revenue_analytics.total_subscriptions.toLocaleString()}
                icon={Crown}
                color="yellow"
              />
              <StatCard
                title="Active Subscriptions"
                value={revenue_analytics.active_subscriptions.toLocaleString()}
                icon={Crown}
                color="green"
              />
              <StatCard
                title="Coin Purchases"
                value={revenue_analytics.total_coin_purchases.toLocaleString()}
                icon={DollarSign}
                color="purple"
              />
              <StatCard
                title="Coins Sold"
                value={revenue_analytics.coins_sold.toLocaleString()}
                icon={TrendingUp}
                color="primary"
              />
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
}
