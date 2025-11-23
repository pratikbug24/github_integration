import React, { useState, useEffect } from "react";
import axios from "axios";
import RepoList from "../components/RepoList";

export default function GithubIntegration() {
  const [username, setUsername] = useState("");
  const [token, setToken] = useState("");
  const [repos, setRepos] = useState([]);
  const [loading, setLoading] = useState(false);

  // 🧠 Load saved token & username (if exists)
  useEffect(() => {
    const savedToken = localStorage.getItem("github_token");
    const savedUsername = localStorage.getItem("github_username");
    if (savedToken) setToken(savedToken);
    if (savedUsername) setUsername(savedUsername);
  }, []);

  const handleConnect = async () => {
    if (!username || !token) {
      alert("Please enter GitHub username and token");
      return;
    }

    // 💾 Save token & username to localStorage for future use
    localStorage.setItem("github_token", token);
    localStorage.setItem("github_username", username);

    setLoading(true);
    try {
      const response = await axios.get(
        `https://api.github.com/users/${username}/repos`,
        { headers: { Authorization: `token ${token}` } }
      );
      setRepos(response.data);
    } catch (error) {
      console.error(error);
      alert("❌ Failed to fetch repositories. Check credentials or token permissions.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h2 className="text-3xl font-bold text-blue-700 mb-6 text-center">
        🔗 GitHub Integration (Project Mitra)
      </h2>

      <div className="bg-white p-6 rounded-lg shadow-md w-full md:w-2/3 lg:w-1/2 mx-auto">
        <p className="text-gray-700 mb-5 leading-relaxed">
          Connect your GitHub account to view, edit, and analyze your repositories.
          <br />
          Please enter your <strong>GitHub Username</strong> and
          <strong> Personal Access Token (PAT)</strong>.
        </p>

        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-6">
          <h3 className="font-semibold text-blue-700 mb-2">
            🔐 How to Generate a GitHub Personal Access Token (PAT)
          </h3>
          <ol className="list-decimal list-inside text-sm text-gray-700 space-y-1">
            <li>
              Go to{" "}
              <a
                href="https://github.com/settings/tokens"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline"
              >
                GitHub Token Settings
              </a>
            </li>
            <li>Click <strong>"Generate new token"</strong> → <em>"Fine-grained personal access token"</em></li>
            <li>Under “Repository access”, choose your repo or all repositories.</li>
            <li>Enable permissions:
              <ul className="list-disc ml-6">
                <li>✅ <strong>Contents</strong> → Read and write</li>
                <li>✅ <strong>Metadata</strong> → Read-only</li>
              </ul>
            </li>
            <li>Click <strong>Generate token</strong>.</li>
            <li>Copy your token (starts with <code>ghp_</code> or <code>github_pat_</code>) and paste below.</li>
          </ol>
        </div>

        <input
          type="text"
          placeholder="GitHub Username"
          className="border p-2 rounded w-full mb-3 focus:ring-2 focus:ring-blue-400"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />

        <input
          type="password"
          placeholder="GitHub Personal Access Token"
          className="border p-2 rounded w-full mb-3 focus:ring-2 focus:ring-blue-400"
          value={token}
          onChange={(e) => setToken(e.target.value)}
        />

        <button
          onClick={handleConnect}
          className="bg-blue-600 text-white px-4 py-2 rounded w-full hover:bg-blue-700 transition-all"
        >
          {loading ? "Loading Repositories..." : "🔗 Connect & Fetch Repos"}
        </button>
      </div>

      {repos.length > 0 && (
        <div className="mt-10">
          <RepoList repos={repos} token={token} username={username} />
        </div>
      )}
    </div>
  );
}
