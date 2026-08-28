"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Eye, Heart, TrendingUp, Users } from "lucide-react";

/**
 * Analytics dashboard — shows portfolio engagement metrics.
 *
 * ponytail: Uses localStorage for now. Upgrade to real analytics later.
 */

interface AnalyticsData {
  totalViews: number;
  totalSaves: number;
  topPortfolios: { id: string; title: string; views: number; saves: number }[];
  recentActivity: { type: string; portfolio: string; timestamp: number }[];
}

function getAnalytics(): AnalyticsData {
  if (typeof window === "undefined") {
    return { totalViews: 0, totalSaves: 0, topPortfolios: [], recentActivity: [] };
  }

  try {
    const data = localStorage.getItem("foliomuse-analytics");
    return data ? JSON.parse(data) : { totalViews: 0, totalSaves: 0, topPortfolios: [], recentActivity: [] };
  } catch {
    return { totalViews: 0, totalSaves: 0, topPortfolios: [], recentActivity: [] };
  }
}

export function AnalyticsDashboard() {
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalViews: 0,
    totalSaves: 0,
    topPortfolios: [],
    recentActivity: [],
  });

  useEffect(() => {
    setAnalytics(getAnalytics());
  }, []);

  const stats = [
    {
      label: "Total Views",
      value: analytics.totalViews.toLocaleString(),
      icon: Eye,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      label: "Total Saves",
      value: analytics.totalSaves.toLocaleString(),
      icon: Heart,
      color: "text-red-500",
      bgColor: "bg-red-500/10",
    },
    {
      label: "Top Portfolios",
      value: analytics.topPortfolios.length.toLocaleString(),
      icon: TrendingUp,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      label: "Active Users",
      value: "1",
      icon: Users,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
  ];

  return (
    <div className="flex flex-col gap-8">
      {/* Stats grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="rounded-xl border border-border bg-card p-6"
            >
              <div className="flex items-center gap-3">
                <div className={`rounded-lg ${stat.bgColor} p-2`}>
                  <Icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Top portfolios */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="mb-4 font-display text-lg font-semibold">Top Portfolios</h3>
        {analytics.topPortfolios.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No analytics data yet. Browse portfolios to start tracking.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {analytics.topPortfolios.slice(0, 10).map((portfolio, i) => (
              <div
                key={portfolio.id}
                className="flex items-center justify-between rounded-lg border border-border p-3"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-bold">
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-sm font-medium">{portfolio.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {portfolio.views} views · {portfolio.saves} saves
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent activity */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="mb-4 font-display text-lg font-semibold">Recent Activity</h3>
        {analytics.recentActivity.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No recent activity. Start browsing to see activity here.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {analytics.recentActivity.slice(0, 10).map((activity, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-lg border border-border p-3"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                  {activity.type === "view" ? (
                    <Eye className="h-4 w-4 text-blue-500" />
                  ) : (
                    <Heart className="h-4 w-4 text-red-500" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm">
                    {activity.type === "view" ? "Viewed" : "Saved"} {activity.portfolio}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(activity.timestamp).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
