import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  GitBranch,
  Lock,
  Unlock,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
} from "lucide-react";

export default function BranchProtection({ username, repoName, token }) {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedBranch, setExpandedBranch] = useState(null);
  const [branchProtection, setBranchProtection] = useState({});

  const headers = useMemo(
    () => ({ Authorization: token ? `token ${token}` : undefined }),
    [token]
  );

  useEffect(() => {
    if (!username || !repoName || !token) return;

    const fetchBranches = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await axios.get(
          `https://api.github.com/repos/${username}/${repoName}/branches?per_page=200`,
          { headers }
        );
        setBranches(res.data || []);
        
        // Fetch protection status for protected branches
        const protectedBranches = res.data.filter((b) => b.protected);
        const protectionPromises = protectedBranches.map((branch) =>
          axios
            .get(
              `https://api.github.com/repos/${username}/${repoName}/branches/${branch.name}/protection`,
              { headers }
            )
            .then((res) => ({ [branch.name]: res.data }))
            .catch(() => ({ [branch.name]: null }))
        );
        
        const protections = await Promise.all(protectionPromises);
        const protectionMap = protections.reduce((acc, p) => ({ ...acc, ...p }), {});
        setBranchProtection(protectionMap);
      } catch (err) {
        console.error("Branches API error:", err);
        setError("Failed to load branch data.");
      }
      setLoading(false);
    };

    fetchBranches();
  }, [username, repoName, token, headers]);

  const branchStats = useMemo(() => {
    const total = branches.length;
    const protectedCount = branches.filter((b) => b.protected).length;
    const defaultBranch = branches.find((b) => b.name === "main" || b.name === "master");
    
    // Analyze protection features
    const protectionFeatures = {
      requireReviews: 0,
      requireStatusChecks: 0,
      requireBranchesUpToDate: 0,
      dismissStaleReviews: 0,
      require线性继承: 0,
      allowForcePushes: 0,
      allowDeletions: 0,
      requireCommitSigning: 0,
    };

    Object.values(branchProtection).forEach((protection) => {
      if (!protection) return;
      if (protection.required_pull_request_reviews) protectionFeatures.requireReviews++;
      if (protection.required_status_checks) protectionFeatures.requireStatusChecks++;
      if (protection.required_status_checks?.strict) protectionFeatures.requireBranchesUpToDate++;
      if (protection.required_pull_request_reviews?.dismiss_stale_reviews) protectionFeatures.dismissStaleReviews++;
      if (protection.required_linear_history) protectionFeatures.require线性继承++;
      if (protection.allow_force_pushes?.enabled === false) protectionFeatures.allowForcePushes++;
      if (protection.allow_deletions === false) protectionFeatures.allowDeletions++;
      if (protection.required_signatures) protectionFeatures.requireCommitSigning++;
    });

    // Find branches missing protection
    const unprotectedBranches = branches.filter((b) => !b.protected);

    return {
      total,
      protectedCount,
      unprotectedCount: total - protectedCount,
      defaultBranchName: defaultBranch?.name,
      protectionFeatures,
      unprotectedBranches,
      protectionScore: protectedCount > 0 
        ? Math.round((Object.values(branchProtection).filter(p => p).length / protectedCount) * 100)
        : 0,
    };
  }, [branches, branchProtection]);

  const getProtectionLevel = (branch) => {
    const protection = branchProtection[branch.name];
    if (!protection) return "none";
    
    const features = [
      protection.required_pull_request_reviews,
      protection.required_status_checks,
      !protection.allow_force_pushes?.enabled,
      !protection.allow_deletions,
      protection.required_linear_history,
      protection.required_signatures,
    ].filter(Boolean).length;

    if (features >= 5) return "strong";
    if (features >= 3) return "moderate";
    return "basic";
  };

  const getProtectionBadge = (level) => {
    const badges = {
      none: { color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400", icon: Unlock },
      basic: { color: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400", icon: Shield },
      moderate: { color: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400", icon: ShieldAlert },
      strong: { color: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400", icon: ShieldCheck },
    };
    return badges[level] || badges.none;
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Branch Protection
          </h3>
        </div>
        {branchStats.defaultBranchName && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500 dark:text-gray-400">Default:</span>
            <span className="font-medium text-gray-900 dark:text-white">{branchStats.defaultBranchName}</span>
          </div>
        )}
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-gradient-to-br from-slate-50 to-gray-50 dark:from-slate-900/30 dark:to-gray-900/30 rounded-xl border border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 mb-1">
            <GitBranch className="w-4 h-4" />
            <span className="text-sm">Total Branches</span>
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">{branchStats.total}</div>
        </div>
        <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 rounded-xl border border-green-100 dark:border-green-800">
          <div className="flex items-center gap-2 text-green-600 dark:text-green-400 mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span className="text-sm">Protected</span>
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">{branchStats.protectedCount}</div>
        </div>
        <div className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/30 rounded-xl border border-amber-100 dark:border-amber-800">
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 mb-1">
            <Unlock className="w-4 h-4" />
            <span className="text-sm">Unprotected</span>
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">{branchStats.unprotectedCount}</div>
        </div>
        <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/30 rounded-xl border border-purple-100 dark:border-purple-800">
          <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 mb-1">
            <Shield className="w-4 h-4" />
            <span className="text-sm">Protection Score</span>
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">{branchStats.protectionScore}%</div>
        </div>
      </div>

      {/* Protection Features Grid */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Protection Features Usage</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Require Reviews", key: "requireReviews", icon: ShieldCheck },
            { label: "Status Checks", key: "requireStatusChecks", icon: Shield },
            { label: "Linear History", key: "require线性继承", icon: GitBranch },
            { label: "No Force Push", key: "allowForcePushes", icon: Lock },
            { label: "No Deletions", key: "allowDeletions", icon: Lock },
            { label: "Signed Commits", key: "requireCommitSigning", icon: Shield },
            { label: "Dismiss Stale", key: "dismissStaleReviews", icon: AlertTriangle },
            { label: "Branch Up-to-date", key: "requireBranchesUpToDate", icon: ShieldAlert },
          ].map((feature) => {
            const count = branchStats.protectionFeatures[feature.key] || 0;
            const percentage = branchStats.protectedCount > 0 
              ? Math.round((count / branchStats.protectedCount) * 100) 
              : 0;
            const Icon = feature.icon;
            return (
              <div key={feature.key} className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  <span className="text-xs text-gray-600 dark:text-gray-400">{feature.label}</span>
                </div>
                <div className="flex items-end justify-between">
                  <span className="text-xl font-bold text-gray-900 dark:text-white">{count}</span>
                  <span className="text-xs text-gray-500">{percentage}%</span>
                </div>
                <div className="mt-2 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Branch List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">All Branches</h4>
        </div>
        <div className="divide-y divide-gray-200 dark:divide-gray-700 max-h-[400px] overflow-y-auto">
          {branches.slice(0, 50).map((branch) => {
            const level = getProtectionLevel(branch);
            const badge = getProtectionBadge(level);
            const BadgeIcon = badge.icon;
            const isExpanded = expandedBranch === branch.name;
            const protection = branchProtection[branch.name];

            return (
              <div key={branch.name}>
                <div
                  className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50 transition cursor-pointer"
                  onClick={() => setExpandedBranch(isExpanded ? null : branch.name)}
                >
                  <div className="flex items-center gap-3">
                    <GitBranch className="w-4 h-4 text-gray-400" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 dark:text-white">{branch.name}</span>
                        {branch.name === branchStats.defaultBranchName && (
                          <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400 text-xs rounded-full">
                            default
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Last commit: {branch.commit?.sha?.substring(0, 7)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
                      <BadgeIcon className="w-3 h-3" />
                      {level}
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                </div>

                {/* Expanded Protection Details */}
                {isExpanded && (
                  <div className="px-4 pb-4 bg-gray-50 dark:bg-gray-800/30">
                    {protection ? (
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="p-3 bg-white dark:bg-gray-900 rounded-lg">
                          <div className="text-gray-500 dark:text-gray-400 text-xs">Required Reviews</div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {protection.required_pull_request_reviews?.required_approving_review_count || 0}
                          </div>
                        </div>
                        <div className="p-3 bg-white dark:bg-gray-900 rounded-lg">
                          <div className="text-gray-500 dark:text-gray-400 text-xs">Dismiss Stale</div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {protection.required_pull_request_reviews?.dismiss_stale_reviews ? "Yes" : "No"}
                          </div>
                        </div>
                        <div className="p-3 bg-white dark:bg-gray-900 rounded-lg">
                          <div className="text-gray-500 dark:text-gray-400 text-xs">Status Checks</div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {protection.required_status_checks ? "Required" : "Not required"}
                          </div>
                        </div>
                        <div className="p-3 bg-white dark:bg-gray-900 rounded-lg">
                          <div className="text-gray-500 dark:text-gray-400 text-xs">Force Push</div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {protection.allow_force_pushes?.enabled === false ? "Blocked" : "Allowed"}
                          </div>
                        </div>
                        <div className="p-3 bg-white dark:bg-gray-900 rounded-lg">
                          <div className="text-gray-500 dark:text-gray-400 text-xs">Branch Deletion</div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {protection.allow_deletions === false ? "Blocked" : "Allowed"}
                          </div>
                        </div>
                        <div className="p-3 bg-white dark:bg-gray-900 rounded-lg">
                          <div className="text-gray-500 dark:text-gray-400 text-xs">Linear History</div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {protection.required_linear_history ? "Required" : "Not required"}
                          </div>
                        </div>
                      </div>
                    ) : branch.protected ? (
                      <p className="text-sm text-gray-500 dark:text-gray-400 py-2">
                        Protected branch. Detailed settings unavailable (may require admin permissions).
                      </p>
                    ) : (
                      <p className="text-sm text-amber-600 dark:text-amber-400 py-2 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        This branch is not protected. Consider adding protection rules.
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {branches.length > 50 && (
          <div className="p-3 text-center text-sm text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700">
            Showing 50 of {branches.length} branches
          </div>
        )}
      </div>
    </div>
  );
}