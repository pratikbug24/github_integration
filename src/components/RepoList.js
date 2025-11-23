// src/components/RepoList.js
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function RepoList({
  repos: propRepos,
  token: propToken,
  username: propUsername,
}) {
  const navigate = useNavigate();
  const [repos, setRepos] = useState(propRepos || []);
  const [loading, setLoading] = useState(!propRepos);
  const [error, setError] = useState("");

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

  const handleRepoAction = (repo, action) => {
    localStorage.setItem("selected_repo", JSON.stringify(repo));

    if (action === "analytics") {
      navigate(`/repo-analytics/${repo.name}`);
    } else if (action === "edit") {
      navigate(
        `/github/code-editor/${
          propUsername || localStorage.getItem("github_username")
        }/${repo.name}`
      );
    }
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
          onClick={() => navigate("/github/integration")}
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
    <div className="p-6">
      <h2 className="text-2xl font-bold text-blue-700 mb-6 text-center">
        📂 Your GitHub Repositories
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {repos.map((repo) => (
          <div
            key={repo.id}
            className="bg-white border rounded-lg p-4 shadow hover:shadow-lg transition-all"
          >
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              {repo.name}
            </h3>
            <p className="text-sm text-gray-600 mb-3">
              {repo.description || "No description available."}
            </p>

            <div className="flex justify-between text-sm text-gray-500 mb-3">
              <span>⭐ {repo.stargazers_count}</span>
              <span>🍴 {repo.forks_count}</span>
              <span>🕒 {new Date(repo.updated_at).toLocaleDateString()}</span>
            </div>

            <div className="flex justify-between gap-2">
              <button
                onClick={() => handleRepoAction(repo, "analytics")}
                className="w-1/2 bg-green-600 text-white py-2 rounded hover:bg-green-700"
              >
                📊 View Analytics
              </button>

              {/* ✅ Fixed VS Code Open Button */}
              <button
                onClick={() =>
                  (window.location.href = `vscode://vscode.git/clone?url=https://github.com/${repo.owner.login}/${repo.name}`)
                }
                className="bg-purple-600 text-white px-3 py-2 rounded hover:bg-purple-700"
              >
                🛠 Open in VS Code
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
