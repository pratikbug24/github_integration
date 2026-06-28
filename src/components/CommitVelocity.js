import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Activity, TrendingUp, GitCommit, RefreshCw } from "lucide-react";

export default function CommitVelocity({ username, repoName, token }) {
  const [commits, setCommits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [timeRange, setTimeRange] = useState("90"); // days

  const headers = useMemo(
    () => ({ Authorization: token ? `token ${token}` : undefined }),
    [token]
  );

  useEffect(() => {
    if (!username || !repoName || !token) return;

    const fetchCommits = async () => {
      setLoading(true);
      setError("");
      try {
        const since = new Date();
        since.setDate(since.getDate() - parseInt(timeRange));
        const res = await axios.get(
          `https://api.github.com/repos/${username}/${repoName}/commits?since=${since.toISOString()}&per_page=300`,
          { headers }
        );
        setCommits(res.data || []);
      } catch (err) {
        console.error("Commits API error:", err);
        setError("Failed to load commit data.");
      }
      setLoading(false);
    };

    fetchCommits();
  }, [username, repoName, token, timeRange, headers]);

  const velocityData = useMemo(() => {
    if (!commits.length) return { daily: [], weekly: [], monthly: [], stats: null };

    const now = new Date();
    const dailyData = {};
    const weeklyData = {};
    const monthlyData = {};

    commits.forEach((commit) => {
      const date = new Date(commit.commit?.author?.date || commit.commit?.committer?.date);
      if (!date || isNaN(date.getTime())) return;

      // Daily aggregation
      const dayKey = date.toISOString().slice(0, 10);
      dailyData[dayKey] = (dailyData[dayKey] || 0) + 1;

      // Weekly aggregation (ISO week)
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      const weekKey = weekStart.toISOString().slice(0, 10);
      weeklyData[weekKey] = (weeklyData[weekKey] || 0) + 1;

      // Monthly aggregation
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      monthlyData[monthKey] = (monthlyData[monthKey] || 0) + 1;
    });

    // Format daily data
    const daily = Object.entries(dailyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({
        date: new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        commits: count,
        fullDate: date,
      }));

    // Format weekly data
    const weekly = Object.entries(weeklyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({
        week: `Week ${new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
        commits: count,
      }));

    // Format monthly data
    const monthly = Object.entries(monthlyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, count]) => ({
        month: new Date(month + "-01").toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
        commits: count,
      }));

    // Calculate statistics
    const totalCommits = commits.length;
    const avgDaily = totalCommits / parseInt(timeRange);
    const maxDaily = Math.max(...Object.values(dailyData));
    const streak = calculateStreak(dailyData);

    // Find peak day and week
    const peakDay = Object.entries(dailyData).sort((a, b) => b[1] - a[1])[0];
    const peakWeek = Object.entries(weeklyData).sort((a, b) => b[1] - a[1])[0];

    // Author distribution
    const authorCounts = commits.reduce((acc, commit) => {
      const author = commit.commit?.author?.name || "Unknown";
      acc[author] = (acc[author] || 0) + 1;
      return acc;
    }, {});
    const topAuthors = Object.entries(authorCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    // Time of day distribution
    const hourDistribution = Array(24).fill(0);
    commits.forEach((commit) => {
      const date = new Date(commit.commit?.author?.date || commit.commit?.committer?.date);
      if (date) {
        hourDistribution[date.getHours()]++;
      }
    });

    return {
      daily,
      weekly,
      monthly,
      stats: {
        totalCommits,
        avgDaily: avgDaily.toFixed(1),
        maxDaily,
        streak,
        peakDay: peakDay ? { date: peakDay[0], count: peakDay[1] } : null,
        peakWeek: peakWeek ? { week: peakWeek[0], count: peakWeek[1] } : null,
        topAuthors,
        hourDistribution: hourDistribution.map((count, hour) => ({
          hour: `${String(hour).padStart(2, "0")}:00`,
          commits: count,
        })),
      },
    };
  }, [commits, timeRange]);

  const calculateStreak = (dailyData) => {
    const today = new Date().toISOString().slice(0, 10);
    let streak = 0;
    let currentDate = new Date();

    while (true) {
      const key = currentDate.toISOString().slice(0, 10);
      if (dailyData[key]) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
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

  if (!velocityData.stats) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        No commit data available.
      </div>
    );
  }

  const { stats } = velocityData;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <TrendingUp className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Commit Velocity
          </h3>
        </div>
        <div className="flex gap-2">
          {["30", "60", "90", "180"].map((days) => (
            <button
              key={days}
              onClick={() => setTimeRange(days)}
              className={`px-3 py-1 rounded-full text-sm transition ${
                timeRange === days
                  ? "bg-emerald-500 text-white"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200"
              }`}
            >
              {days}d
            </button>
          ))}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/30 dark:to-teal-900/30 rounded-xl border border-emerald-100 dark:border-emerald-800">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 mb-1">
            <GitCommit className="w-4 h-4" />
            <span className="text-sm">Total Commits</span>
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">{stats.totalCommits}</div>
        </div>
        <div className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/30 dark:to-cyan-900/30 rounded-xl border border-blue-100 dark:border-blue-800">
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-1">
            <Activity className="w-4 h-4" />
            <span className="text-sm">Daily Average</span>
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">{stats.avgDaily}</div>
        </div>
        <div className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/30 rounded-xl border border-amber-100 dark:border-amber-800">
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 mb-1">
            <TrendingUp className="w-4 h-4" />
            <span className="text-sm">Current Streak</span>
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">{stats.streak} days</div>
        </div>
        <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/30 rounded-xl border border-purple-100 dark:border-purple-800">
          <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 mb-1">
            <GitCommit className="w-4 h-4" />
            <span className="text-sm">Peak Day</span>
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">{stats.maxDaily}</div>
        </div>
      </div>

      {/* Daily Commits Chart */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Daily Commits</h4>
        <ResponsiveContainer width="100%" height={250}>
          <AreaChart data={velocityData.daily}>
            <defs>
              <linearGradient id="commitGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--tooltip-bg, #fff)",
                border: "1px solid var(--tooltip-border, #e5e7eb)",
                borderRadius: "8px",
              }}
            />
            <Area
              type="monotone"
              dataKey="commits"
              stroke="#10b981"
              strokeWidth={2}
              fill="url(#commitGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Weekly and Monthly Charts */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Weekly Commits</h4>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={velocityData.weekly}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="week" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--tooltip-bg, #fff)",
                  border: "1px solid var(--tooltip-border, #e5e7eb)",
                  borderRadius: "8px",
                }}
              />
              <Bar dataKey="commits" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Monthly Commits</h4>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={velocityData.monthly}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--tooltip-bg, #fff)",
                  border: "1px solid var(--tooltip-border, #e5e7eb)",
                  borderRadius: "8px",
                }}
              />
              <Line
                type="monotone"
                dataKey="commits"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={{ fill: "#f59e0b", strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Contributors & Hour Distribution */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Top Contributors</h4>
          <div className="space-y-2">
            {stats.topAuthors.map((author, i) => (
              <div key={author.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    {i + 1}
                  </span>
                  <span className="text-sm text-gray-700 dark:text-gray-300 truncate max-w-[150px]">{author.name}</span>
                </div>
                <span className="text-sm font-bold text-gray-900 dark:text-white">{author.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Commits by Hour</h4>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={stats.hourDistribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="hour" tick={{ fontSize: 9 }} interval={3} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--tooltip-bg, #fff)",
                  border: "1px solid var(--tooltip-border, #e5e7eb)",
                  borderRadius: "8px",
                }}
              />
              <Bar dataKey="commits" fill="#8b5cf6" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}