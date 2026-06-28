import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { GitPullRequest, Clock, CheckCircle, Users, RefreshCw, AlertCircle } from "lucide-react";

const COLORS = ["#10b981", "#f59e0b", "#ef4444", "#6b7280", "#8b5cf6"];

export default function PRReviewAnalytics({ username, repoName, token }) {
  const [prs, setPRs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const headers = useMemo(
    () => ({ Authorization: token ? `token ${token}` : undefined }),
    [token]
  );

  useEffect(() => {
    if (!username || !repoName || !token) return;

    const fetchPRs = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await axios.get(
          `https://api.github.com/repos/${username}/${repoName}/pulls?per_page=100&state=all`,
          { headers }
        );
        setPRs(res.data || []);
      } catch (err) {
        console.error("PR API error:", err);
        setError("Failed to load PR data.");
      }
      setLoading(false);
    };

    fetchPRs();
  }, [username, repoName, token, headers]);

  const analytics = useMemo(() => {
    if (!prs.length) return null;

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // State distribution
    const stateCounts = prs.reduce((acc, pr) => {
      acc[pr.state] = (acc[pr.state] || 0) + 1;
      return acc;
    }, {});

    // Review statistics
    const reviewedPRs = prs.filter((pr) => pr.merged_at || pr.head?.repo);
    const avgTimeToMerge = prs
      .filter((pr) => pr.merged_at && pr.created_at)
      .reduce((acc, pr) => {
        const created = new Date(pr.created_at);
        const merged = new Date(pr.merged_at);
        return acc + (merged - created);
      }, 0) / (prs.filter((pr) => pr.merged_at).length || 1);

    // PRs per week (last 8 weeks)
    const weeklyPRs = [];
    for (let i = 7; i >= 0; i--) {
      const weekStart = new Date(now.getTime() - (i + 1) * 7 * 24 * 60 * 60 * 1000);
      const weekEnd = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
      const count = prs.filter((pr) => {
        const created = new Date(pr.created_at);
        return created >= weekStart && created < weekEnd;
      }).length;
      weeklyPRs.push({
        week: `W${8 - i}`,
        prs: count,
      });
    }

    // Author distribution
    const authorCounts = prs.reduce((acc, pr) => {
      const author = pr.user?.login || "Unknown";
      acc[author] = (acc[author] || 0) + 1;
      return acc;
    }, {});
    const topAuthors = Object.entries(authorCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, value]) => ({ name, value }));

    // Recent activity
    const recentPRs = prs.filter((pr) => new Date(pr.created_at) >= weekAgo).length;
    const monthlyPRs = prs.filter((pr) => new Date(pr.created_at) >= monthAgo).length;

    // Merge rate
    const mergedPRs = prs.filter((pr) => pr.merged_at).length;
    const mergeRate = prs.length > 0 ? ((mergedPRs / prs.length) * 100).toFixed(1) : 0;

    // Time-based stats
    const openPRs = prs.filter((pr) => pr.state === "open");
    const stalePRs = openPRs.filter((pr) => {
      const updated = new Date(pr.updated_at);
      return now - updated > 14 * 24 * 60 * 60 * 1000; // older than 14 days
    });

    return {
      total: prs.length,
      open: stateCounts.open || 0,
      closed: stateCounts.closed || 0,
      merged: mergedPRs,
      mergeRate,
      recentPRs,
      monthlyPRs,
      avgTimeToMerge: Math.round(avgTimeToMerge / (1000 * 60 * 60)), // hours
      topAuthors,
      weeklyPRs,
      stalePRs: stalePRs.length,
      stateDistribution: Object.entries(stateCounts).map(([name, value]) => ({
        name,
        value,
      })),
    };
  }, [prs]);

  const formatDuration = (hours) => {
    if (hours < 24) return `${hours}h`;
    return `${Math.round(hours / 24)}d`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
        <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        No PR data available.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <GitPullRequest className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          PR Review Analytics
        </h3>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-xl border border-blue-100 dark:border-blue-800">
          <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{analytics.total}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Total PRs</div>
        </div>
        <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 rounded-xl border border-green-100 dark:border-green-800">
          <div className="text-3xl font-bold text-green-600 dark:text-green-400">{analytics.merged}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Merged ({analytics.mergeRate}%)</div>
        </div>
        <div className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/30 rounded-xl border border-amber-100 dark:border-amber-800">
          <div className="text-3xl font-bold text-amber-600 dark:text-amber-400">{analytics.open}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Open</div>
        </div>
        <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/30 rounded-xl border border-purple-100 dark:border-purple-800">
          <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">{analytics.avgTimeToMerge}h</div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Avg Time to Merge</div>
        </div>
      </div>

      {/* Additional Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
          <div className="flex items-center justify-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Clock className="w-4 h-4" />
            <span>Last 7 days</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{analytics.recentPRs}</div>
        </div>
        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
          <div className="flex items-center justify-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Users className="w-4 h-4" />
            <span>Last 30 days</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{analytics.monthlyPRs}</div>
        </div>
        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
          <div className="flex items-center justify-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <CheckCircle className="w-4 h-4" />
            <span>Top Contributor</span>
          </div>
          <div className="text-lg font-bold text-gray-900 dark:text-white mt-1 truncate">
            {analytics.topAuthors[0]?.name || "-"}
          </div>
        </div>
        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
          <div className="flex items-center justify-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <AlertCircle className="w-4 h-4" />
            <span>Stale PRs (14d+)</span>
          </div>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">{analytics.stalePRs}</div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Weekly PRs Chart */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">PRs per Week</h4>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={analytics.weeklyPRs}>
              <XAxis dataKey="week" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--tooltip-bg, #fff)",
                  border: "1px solid var(--tooltip-border, #e5e7eb)",
                  borderRadius: "8px",
                }}
              />
              <Bar dataKey="prs" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* State Distribution */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">PR State Distribution</h4>
          <div className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={analytics.stateDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {analytics.stateDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4 mt-2">
            {analytics.stateDistribution.map((entry, index) => (
              <div key={entry.name} className="flex items-center gap-1 text-xs">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <span className="text-gray-600 dark:text-gray-400 capitalize">{entry.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Contributors */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Top Contributors</h4>
        <div className="space-y-2">
          {analytics.topAuthors.map((author, index) => (
            <div key={author.name} className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg">
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-xs font-bold text-indigo-600 dark:text-indigo-400">
                  {index + 1}
                </span>
                <span className="font-medium text-gray-900 dark:text-gray-200">{author.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{author.value}</span>
                <span className="text-sm text-gray-500">PRs</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}