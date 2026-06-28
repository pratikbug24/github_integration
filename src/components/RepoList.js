// src/components/RepoList.js
import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useBookmarks } from "../context/BookmarkContext";
import { exportReposToCSV } from "../utils/csvExport";
import { Search, Star, Download, Filter, X, ExternalLink, GitFork, Calendar } from "lucide-react";

export default function RepoList({
  repos: propRepos,
  token: propToken,
  username: propUsername,
}) {
  const navigate = useNavigate();
  const [repos, setRepos] = useState(propRepos || []);
  const [loading, setLoading] = useState(!propRepos);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("updated");
  const [filterLanguage, setFilterLanguage] = useState("all");
  const [showFilters, setShowFilters] = useState(false);

  const { bookmarks, toggleBookmark, isBookmarked } = useBookmarks();

  useEffect(() => {
    if (!propRepos) {
      const storedToken = localStorage.getItem("github_token");
      const storedUsername = localStorage.getItem("github_username");

      if (!storedToken || !storedUsername) {
        setError(
          "⚠️ Missing GitHub credentials. Please go back to integration page."
        );
        setLoading(false);
        return;
      }

      setLoading(true);
      fetch(`https://api.github.com/users/${storedUsername}/repos`, {
        headers: { Authorization: `token ${storedToken}` },
      })
        .then((res) => {
          if (!res.ok) throw new Error("Failed to load repositories");
          return res.json();
        })
        .then((data) => {
          setRepos(data);
        })
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    }
  }, [propRepos]);

  // Get unique languages for filter
  const languages = useMemo(() => {
    const langs = [...new Set(repos.map((r) => r.language).filter(Boolean))];
    return langs.sort();
  }, [repos]);

  // Filter and sort repos
  const filteredRepos = useMemo(() => {
    let result = [...repos];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (r) =>
          r.name.toLowerCase().includes(query) ||
          r.description?.toLowerCase().includes(query) ||
          r.language?.toLowerCase().includes(query)
      );
    }

    // Language filter
    if (filterLanguage !== "all") {
      result = result.filter((r) => r.language === filterLanguage);
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case "stars":
          return b.stargazers_count - a.stargazers_count;
        case "forks":
          return b.forks_count - a.forks_count;
        case "name":
          return a.name.localeCompare(b.name);
        case "updated":
        default:
          return new Date(b.updated_at) - new Date(a.updated_at);
      }
    });

    return result;
  }, [repos, searchQuery, filterLanguage, sortBy]);

  const handleRepoAction = (repo, action) => {
    localStorage.setItem("selected_repo", JSON.stringify(repo));

    if (action === "analytics") {
      navigate(`/github/analytics/${repo.owner.login}/${repo.name}`);
    } else if (action === "edit") {
      navigate(
        `/github/code-editor/${
          propUsername || localStorage.getItem("github_username")
        }/${repo.name}`
      );
    }
  };

  const handleExportCSV = () => {
    exportReposToCSV(filteredRepos);
  };

  if (loading) {
    return (
      <p className="text-center text-gray-500 mt-10">
        ⏳ Loading repositories...
      </p>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-600 mt-10">
        <p>{error}</p>
        <button
          onClick={() => navigate("/github-integration")}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          🔙 Go to Integration Page
        </button>
      </div>
    );
  }

  if (!repos || repos.length === 0) {
    return (
      <p className="text-center text-gray-600 mt-6">
        No repositories found. Try connecting with a valid token.
      </p>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <h2 className="text-2xl font-bold text-blue-700 mb-6 text-center">
        📂 Your GitHub Repositories
      </h2>

      {/* Search and Actions Bar */}
      <div className="mb-6 space-y-4">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search repositories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Filter and Actions Row */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Filter Button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition ${
              showFilters
                ? "bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-300"
                : "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters
            {(filterLanguage !== "all" || searchQuery) && (
              <span className="w-2 h-2 bg-blue-500 rounded-full" />
            )}
          </button>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {filteredRepos.length} repos
            </span>
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>
          </div>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 animate-fadeIn">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Sort By */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Sort by
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="updated">Recently Updated</option>
                  <option value="stars">Stars</option>
                  <option value="forks">Forks</option>
                  <option value="name">Name</option>
                </select>
              </div>

              {/* Language Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Language
                </label>
                <select
                  value={filterLanguage}
                  onChange={(e) => setFilterLanguage(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Languages</option>
                  {languages.map((lang) => (
                    <option key={lang} value={lang}>
                      {lang}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Clear Filters */}
            {(filterLanguage !== "all" || searchQuery) && (
              <button
                onClick={() => {
                  setFilterLanguage("all");
                  setSearchQuery("");
                }}
                className="mt-4 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
              >
                Clear all filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Repos Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {filteredRepos.map((repo) => {
          const bookmarked = isBookmarked(repo.id);
          return (
            <div
              key={repo.id}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-sm hover:shadow-lg transition-all group"
            >
              {/* Header with Bookmark */}
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate flex-1 mr-2">
                  {repo.name}
                </h3>
                <button
                  onClick={() => toggleBookmark(repo)}
                  className={`p-2 rounded-full transition-colors ${
                    bookmarked
                      ? "text-amber-500 bg-amber-50 dark:bg-amber-900/30 hover:bg-amber-100"
                      : "text-gray-400 hover:text-amber-500 hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                  title={bookmarked ? "Remove bookmark" : "Add bookmark"}
                >
                  <Star className="w-5 h-5" fill={bookmarked ? "currentColor" : "none"} />
                </button>
              </div>

              {/* Description */}
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                {repo.description || "No description available."}
              </p>

              {/* Meta Info */}
              <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 dark:text-gray-400 mb-4">
                {repo.language && (
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full bg-blue-500" />
                    {repo.language}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Star className="w-4 h-4" />
                  {repo.stargazers_count}
                </span>
                <span className="flex items-center gap-1">
                  <GitFork className="w-4 h-4" />
                  {repo.forks_count}
                </span>
                {repo.private && (
                  <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs rounded-full">
                    Private
                  </span>
                )}
              </div>

              {/* Updated Date */}
              <div className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 mb-4">
                <Calendar className="w-3 h-3" />
                Updated {new Date(repo.updated_at).toLocaleDateString()}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleRepoAction(repo, "analytics")}
                  className="flex-1 bg-green-600 text-white py-2 px-3 rounded-lg hover:bg-green-700 transition text-sm font-medium"
                >
                  📊 Analytics
                </button>
                <button
                  onClick={() => window.open(repo.html_url, "_blank")}
                  className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                  title="View on GitHub"
                >
                  <ExternalLink className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </button>
                <button
                  onClick={() =>
                    (window.location.href = `vscode://vscode.git/clone?url=https://github.com/${repo.owner.login}/${repo.name}`)
                  }
                  className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                  title="Open in VS Code"
                >
                  <span className="text-lg">🛠️</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredRepos.length === 0 && (
        <div className="text-center py-12">
          <Search className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <p className="text-gray-500 dark:text-gray-400">
            No repositories match your search.
          </p>
          <button
            onClick={() => {
              setSearchQuery("");
              setFilterLanguage("all");
            }}
            className="mt-4 text-blue-600 hover:text-blue-700 dark:text-blue-400"
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}
