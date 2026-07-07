import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import RepoList from "../components/RepoList";
import { Settings, FolderPlus, LogOut } from "lucide-react";

// Backend API URL
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export default function GithubIntegration() {
  const [token, setToken] = useState("");
  const [user, setUser] = useState(null);
  const [repos, setRepos] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // 🔄 Load token from URL or localStorage
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get("token");
    const urlUsername = params.get("username");
    const urlAvatar = params.get("avatar");
    const urlName = params.get("name");
    const urlError = params.get("error");
    const storedToken = localStorage.getItem("github_token");

    if (urlToken) {
      // OAuth callback with token - Save ALL user data to localStorage
      localStorage.setItem("github_token", urlToken);
      localStorage.setItem("github_username", urlUsername || '');
      localStorage.setItem("github_avatar", urlAvatar || '');
      localStorage.setItem("github_name", urlName || '');
      localStorage.setItem("github_login_time", new Date().toISOString());
      
      console.log("✅ Token saved to localStorage");
      console.log("Username:", urlUsername);
      
      setToken(urlToken);
      setUser({
        login: urlUsername,
        avatar_url: urlAvatar,
        name: urlName
      });
      
      window.history.replaceState({}, document.title, "/github-integration");
    } else if (urlError) {
      // OAuth error
      alert(`OAuth Error: ${urlError}`);
      window.history.replaceState({}, document.title, "/github-integration");
    } else if (storedToken) {
      // Load from localStorage
      const storedUsername = localStorage.getItem("github_username");
      const storedAvatar = localStorage.getItem("github_avatar");
      const storedName = localStorage.getItem("github_name");
      
      console.log("✅ Token loaded from localStorage");
      setToken(storedToken);
      setUser({
        login: storedUsername,
        avatar_url: storedAvatar,
        name: storedName
      });
    }
  }, []);

  // 👤 Fetch User Profile once token exists
  useEffect(() => {
    if (!token) return;

    const fetchUser = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/github/user`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        setUser(res.data);
        localStorage.setItem("github_user", JSON.stringify(res.data));

        fetchRepos(res.data.login);
      } catch (err) {
        console.error(err);
        alert("Authentication expired. Please log in again.");
        localStorage.removeItem("github_token");
      }
    };

    fetchUser();
  }, [token]);

  // 📦 Fetch Repositories
  const fetchRepos = async (username) => {
    setLoading(true);
    try {
      const res = await axios.get(
        `${API_URL}/api/github/users/${username}/repos?per_page=200`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setRepos(res.data);
    } catch (error) {
      console.error(error);
      alert("Failed to load repositories.");
    }
    setLoading(false);
  };

  // 🔐 Redirect to Node.js backend OAuth
  const handleGithubLogin = async () => {
    try {
      // Get OAuth URL from backend
      console.log("Fetching OAuth URL from:", `${API_URL}/api/oauth/github`);
      const res = await axios.get(`${API_URL}/api/oauth/github`);
      console.log("OAuth Response:", res.data);
      
      if (res.data.authUrl) {
        window.location.href = res.data.authUrl;
      } else {
        console.error("OAuth not configured:", res.data);
        alert("OAuth not configured on server. Check server .env file.");
      }
    } catch (error) {
      console.error("=== OAuth Error ===");
      console.error("Status:", error.response?.status);
      console.error("Status Text:", error.response?.statusText);
      console.error("Data:", error.response?.data);
      console.error("Message:", error.message);
      console.error("Full Error:", error);
      alert(`Failed to initiate OAuth. Check console for details.`);
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h2 className="text-3xl font-bold text-blue-700 mb-6 text-center">
        🔗 GitHub Integration (Project Mitra)
      </h2>

      {!token || !user ? (
        <div className="bg-white p-6 rounded-lg shadow-md w-full md:w-2/3 lg:w-1/2 mx-auto text-center">
          <p className="text-gray-700 mb-4">
            Connect your GitHub account to sync your repositories.
          </p>

          <button
            onClick={handleGithubLogin}
            className="flex items-center justify-center gap-2 bg-black text-white px-5 py-3 rounded-lg font-semibold
             hover:bg-gray-900 active:scale-95 transition-all shadow-md hover:shadow-lg"
          >
            <svg viewBox="0 0 24 24" fill="white" className="w-6 h-6">
              <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.1 3.29 9.42 7.86 10.95.58.1.79-.25.79-.55v-2.1c-3.2.7-3.87-1.4-3.87-1.4-.53-1.3-1.32-1.64-1.32-1.64-1.08-.74.08-.73.08-.73 1.2.09 1.84 1.24 1.84 1.24 1.07 1.84 2.8 1.31 3.49 1 .11-.78.42-1.31.76-1.61-2.55-.29-5.23-1.28-5.23-5.72 0-1.26.45-2.29 1.2-3.1-.12-.3-.52-1.52.11-3.16 0 0 .98-.31 3.2 1.18a11.1 11.1 0 0 1 5.82 0c2.22-1.5 3.2-1.18 3.2-1.18.63 1.64.23 2.86.11 3.16.75.82 1.2 1.84 1.2 3.1 0 4.46-2.69 5.42-5.25 5.7.43.37.82 1.1.82 2.24v3.31c0 .31.21.66.8.55A10.97 10.97 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5z" />
            </svg>
            Continue with GitHub
          </button>
        </div>
      ) : (
        <>
          <div className="bg-white p-4 rounded-lg shadow-md mb-6 w-full md:w-2/3 mx-auto">
            <div className="flex items-center gap-4">
              <img
                src={user.avatar_url}
                alt="avatar"
                className="h-12 w-12 rounded-full"
              />
              <div className="flex-1">
                <h3 className="font-bold">{user.name || user.login}</h3>
                <p className="text-gray-600">@{user.login}</p>
                <p className="text-xs text-gray-400">Logged in: {localStorage.getItem("github_login_time")}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => navigate('/github/repo-manager')}
                  className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                >
                  <FolderPlus className="w-4 h-4" />
                  Manage Repos
                </button>
                <button
                  onClick={() => {
                    if (confirm("Are you sure you want to logout?")) {
                      localStorage.removeItem("github_token");
                      localStorage.removeItem("github_username");
                      localStorage.removeItem("github_avatar");
                      localStorage.removeItem("github_name");
                      localStorage.removeItem("github_login_time");
                      localStorage.removeItem("github_user");
                      window.location.reload();
                    }
                  }}
                  className="flex items-center gap-2 bg-red-100 dark:bg-red-900 text-red-600 px-4 py-2 rounded-lg hover:bg-red-200 dark:hover:bg-red-800 transition"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            </div>
          </div>

          {repos.length > 0 && (
            <RepoList repos={repos} token={token} username={user.login} />
          )}

          {loading && <p className="text-center text-blue-600">Loading...</p>}
        </>
      )}
    </div>
  );
}
