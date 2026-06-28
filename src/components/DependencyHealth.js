import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import {
  Package,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  ExternalLink,
  AlertCircle,
  Shield,
  Clock,
  TrendingDown,
  GitHub,
} from "lucide-react";

export default function DependencyHealth({ username, repoName, token }) {
  const [dependencies, setDependencies] = useState([]);
  const [vulnerabilities, setVulnerabilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("overview");

  const headers = useMemo(
    () => ({ Authorization: token ? `token ${token}` : undefined }),
    [token]
  );

  useEffect(() => {
    if (!username || !repoName || !token) return;

    const fetchDependencyData = async () => {
      setLoading(true);
      setError("");
      try {
        const [depsRes, vulnRes] = await Promise.all([
          axios.get(
            `https://api.github.com/repos/${username}/${repoName}/dependency-graph/summary`,
            { headers }
          ).catch(() => ({ data: null })),
          axios.get(
            `https://api.github.com/repos/${username}/${repoName}/vulnerability-alerts`,
            { headers }
          ).catch(() => ({ data: [] })),
        ]);

        // Parse dependencies from manifest files
        const deps = [];
        if (depsRes.data?.dependency_graph_packages) {
          depsRes.data.dependency_graph_packages.forEach((pkg) => {
            deps.push({
              name: pkg.package_name,
              ecosystem: pkg.package_ecosystem,
              version: pkg.version,
              requirements: pkg.requirements,
              hasVulnerabilities: false,
            });
          });
        }

        setDependencies(deps);
        setVulnerabilities(vulnRes.data || []);
      } catch (err) {
        console.error("Dependency API error:", err);
        setError("Failed to load dependency data. GitHub API may require additional permissions.");
      }
      setLoading(false);
    };

    fetchDependencyData();
  }, [username, repoName, token, headers]);

  const stats = useMemo(() => {
    const total = dependencies.length;
    const byEcosystem = dependencies.reduce((acc, dep) => {
      acc[dep.ecosystem] = (acc[dep.ecosystem] || 0) + 1;
      return acc;
    }, {});

    return {
      total,
      vulnerable: vulnerabilities.length,
      healthy: total - vulnerabilities.length,
      byEcosystem,
    };
  }, [dependencies, vulnerabilities]);

  const getEcosystemIcon = (ecosystem) => {
    const icons = {
      npm: "📦",
      pip: "🐍",
      maven: "🫙",
      gradle: "🐘",
      go: "🔷",
      rubygems: "💎",
      nuget: "📐",
      cargo: "⚙️",
      pub: "🎯",
    };
    return icons[ecosystem] || "📦";
  };

  const getEcosystemColor = (ecosystem) => {
    const colors = {
      npm: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400",
      pip: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400",
      maven: "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-400",
      gradle: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400",
      go: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/50 dark:text-cyan-400",
      rubygems: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400",
      nuget: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400",
      cargo: "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-400",
      pub: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400",
    };
    return colors[ecosystem] || "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400";
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
          <Package className="w-6 h-6 text-violet-600 dark:text-violet-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Dependency Health
          </h3>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-900/30 dark:to-purple-900/30 rounded-xl border border-violet-100 dark:border-violet-800">
          <div className="flex items-center gap-2 text-violet-600 dark:text-violet-400 mb-1">
            <Package className="w-4 h-4" />
            <span className="text-sm">Total Dependencies</span>
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">{stats.total}</div>
        </div>
        <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 rounded-xl border border-green-100 dark:border-green-800">
          <div className="flex items-center gap-2 text-green-600 dark:text-green-400 mb-1">
            <CheckCircle className="w-4 h-4" />
            <span className="text-sm">Healthy</span>
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">{stats.healthy}</div>
        </div>
        <div className="p-4 bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-900/30 dark:to-rose-900/30 rounded-xl border border-red-100 dark:border-red-800">
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400 mb-1">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm">Vulnerabilities</span>
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">{stats.vulnerable}</div>
        </div>
        <div className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/30 rounded-xl border border-amber-100 dark:border-amber-800">
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 mb-1">
            <Shield className="w-4 h-4" />
            <span className="text-sm">Ecosystems</span>
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">{Object.keys(stats.byEcosystem).length}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        {[
          { id: "overview", label: "Overview" },
          { id: "dependencies", label: "All Dependencies" },
          { id: "vulnerabilities", label: "Vulnerabilities" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
              activeTab === tab.id
                ? "border-violet-500 text-violet-600 dark:text-violet-400"
                : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            {tab.label}
            {tab.id === "vulnerabilities" && stats.vulnerable > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 text-xs rounded-full">
                {stats.vulnerable}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Ecosystem Distribution */}
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Dependencies by Ecosystem</h4>
            <div className="space-y-3">
              {Object.entries(stats.byEcosystem).map(([ecosystem, count]) => (
                <div key={ecosystem} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{getEcosystemIcon(ecosystem)}</span>
                    <span className="font-medium text-gray-900 dark:text-white capitalize">{ecosystem}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-32 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-violet-500 rounded-full"
                        style={{ width: `${(count / stats.total) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-bold text-gray-900 dark:text-white w-8">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Security Summary */}
          {stats.vulnerable > 0 ? (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-red-700 dark:text-red-400">
                    Security Vulnerabilities Detected
                  </h4>
                  <p className="text-sm text-red-600 dark:text-red-300 mt-1">
                    This repository has {stats.vulnerable} known vulnerabilities in its dependencies.
                    Review and update the affected packages to improve security.
                  </p>
                  <button
                    onClick={() => setActiveTab("vulnerabilities")}
                    className="mt-3 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition"
                  >
                    View Vulnerabilities
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-green-700 dark:text-green-400">
                    No Known Vulnerabilities
                  </h4>
                  <p className="text-sm text-green-600 dark:text-green-300 mt-1">
                    Great news! No known security vulnerabilities have been detected in your dependencies.
                    Keep your packages updated to maintain this status.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Recommendations */}
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Recommendations</h4>
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <Clock className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h5 className="font-medium text-gray-900 dark:text-white">Keep Dependencies Updated</h5>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Regularly update dependencies to get security patches and new features.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <TrendingDown className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h5 className="font-medium text-gray-900 dark:text-white">Minimize Dependency Count</h5>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Fewer dependencies mean a smaller attack surface. Audit and remove unused packages.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <Shield className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h5 className="font-medium text-gray-900 dark:text-white">Enable Dependabot</h5>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Use GitHub's Dependabot to automatically receive pull requests for outdated dependencies.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "dependencies" && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Package
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Ecosystem
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Version
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {dependencies.slice(0, 100).map((dep, i) => (
                  <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
                    <td className="px-4 py-3">
                      <span className="font-medium text-gray-900 dark:text-white">{dep.name}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getEcosystemColor(dep.ecosystem)}`}>
                        {getEcosystemIcon(dep.ecosystem)} {dep.ecosystem}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-gray-600 dark:text-gray-400 font-mono text-sm">{dep.version}</span>
                    </td>
                    <td className="px-4 py-3">
                      {dep.hasVulnerabilities ? (
                        <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
                          <AlertTriangle className="w-4 h-4" />
                          Vulnerable
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                          <CheckCircle className="w-4 h-4" />
                          Safe
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {dependencies.length > 100 && (
            <div className="p-3 text-center text-sm text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700">
              Showing 100 of {dependencies.length} dependencies
            </div>
          )}
        </div>
      )}

      {activeTab === "vulnerabilities" && (
        <div>
          {vulnerabilities.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="w-16 h-16 mx-auto text-green-400 mb-4" />
              <p className="text-gray-600 dark:text-gray-400">
                No vulnerabilities detected in this repository.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {vulnerabilities.map((vuln, i) => (
                <div
                  key={i}
                  className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-white">
                          {vuln.security_vulnerability?.vulnerability?.summary || "Security Vulnerability"}
                        </h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          {vuln.security_vulnerability?.vulnerability?.description || "No description available"}
                        </p>
                        <div className="flex items-center gap-4 mt-2">
                          <span className="text-xs text-gray-400">
                            Package: {vuln.security_vulnerability?.package?.name}
                          </span>
                          <span className="text-xs text-gray-400">
                            Severity: <span className="font-medium text-red-500 uppercase">{vuln.security_vulnerability?.severity}</span>
                          </span>
                        </div>
                      </div>
                    </div>
                    <a
                      href={vuln.html_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:text-blue-600"
                    >
                      <ExternalLink className="w-5 h-5" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* GitHub Link */}
      <div className="flex justify-center">
        <a
          href={`https://github.com/${username}/${repoName}/network/dependencies`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition"
        >
          <GitHub className="w-4 h-4" />
          View on GitHub
        </a>
      </div>
    </div>
  );
}