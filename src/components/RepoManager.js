import React, { useState, useEffect } from "react";
import axios from "axios";
import { 
  Plus, 
  Settings, 
  Trash2, 
  Archive, 
  GitFork, 
  Eye, 
  EyeOff,
  X,
  Check,
  AlertTriangle,
  RefreshCw,
  Folder
} from "lucide-react";

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export default function RepoManager() {
  const token = localStorage.getItem("github_token");
  const username = localStorage.getItem("github_username");
  const [repos, setRepos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState(null);

  // New repo form state
  const [newRepo, setNewRepo] = useState({
    name: '',
    description: '',
    private: false,
    auto_init: true,
    gitignore_template: ''
  });

  // Gitignore templates
  const [templates, setTemplates] = useState([
    'Node', 'Python', 'Ruby', 'Go', 'Rust', 'Java', 'Maven', 'Dotnet', 'Rails'
  ]);

  useEffect(() => {
    fetchRepos();
  }, [username]);

  const fetchRepos = async () => {
    if (!token || !username) return;
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/github/users/${username}/repos?per_page=100`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRepos(res.data);
    } catch (error) {
      showMessage('Failed to fetch repositories', 'error');
    }
    setLoading(false);
  };

  const showMessage = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3000);
  };

  // Create Repository
  const handleCreateRepo = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await axios.post(`${API_URL}/api/repo/create`, {
        ...newRepo,
        gitignore_template: newRepo.gitignore_template || null
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showMessage(`Repository "${res.data.name}" created successfully!`);
      setShowCreateModal(false);
      setNewRepo({ name: '', description: '', private: false, auto_init: true, gitignore_template: '' });
      fetchRepos();
    } catch (error) {
      showMessage(error.response?.data?.error || 'Failed to create repository', 'error');
    }
    setActionLoading(false);
  };

  // Update Repository Settings
  const handleUpdateRepo = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await axios.patch(`${API_URL}/api/repo/${username}/${showSettingsModal.name}`, {
        name: showSettingsModal.name,
        description: showSettingsModal.description,
        private: showSettingsModal.private,
        default_branch: showSettingsModal.default_branch,
        has_issues: showSettingsModal.has_issues,
        has_projects: showSettingsModal.has_projects,
        has_wiki: showSettingsModal.has_wiki
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showMessage(`Repository "${showSettingsModal.name}" updated successfully!`);
      setShowSettingsModal(null);
      fetchRepos();
    } catch (error) {
      showMessage(error.response?.data?.error || 'Failed to update repository', 'error');
    }
    setActionLoading(false);
  };

  // Delete Repository
  const handleDeleteRepo = async (repo) => {
    setActionLoading(true);
    try {
      await axios.delete(`${API_URL}/api/repo/${username}/${repo}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showMessage(`Repository "${repo}" deleted successfully!`);
      setShowDeleteConfirm(null);
      fetchRepos();
    } catch (error) {
      showMessage(error.response?.data?.error || 'Failed to delete repository', 'error');
    }
    setActionLoading(false);
  };

  // Archive/Unarchive Repository
  const handleArchiveRepo = async (repo, archived) => {
    setActionLoading(true);
    try {
      const endpoint = archived ? 'unarchive' : 'archive';
      await axios.post(`${API_URL}/api/repo/${username}/${repo}/${endpoint}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showMessage(`Repository "${repo}" ${archived ? 'unarchived' : 'archived'} successfully!`);
      fetchRepos();
    } catch (error) {
      showMessage(error.response?.data?.error || 'Failed to update repository', 'error');
    }
    setActionLoading(false);
  };

  // Fork Repository
  const handleForkRepo = async (owner, repo) => {
    setActionLoading(true);
    try {
      const res = await axios.post(`${API_URL}/api/repo/${owner}/${repo}/forks`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showMessage(`Forked "${owner}/${repo}" to "${res.data.full_name}"!`);
      fetchRepos();
    } catch (error) {
      showMessage(error.response?.data?.error || 'Failed to fork repository', 'error');
    }
    setActionLoading(false);
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
          <Folder className="w-6 h-6" />
          Repository Management
        </h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          <Plus className="w-5 h-5" />
          Create Repository
        </button>
      </div>

      {/* Message Toast */}
      {message && (
        <div className={`mb-4 p-4 rounded-lg ${message.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
          {message.text}
        </div>
      )}

      {/* Repos List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {repos.map((repo) => (
            <div
              key={repo.id}
              className={`bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 border ${repo.archived ? 'border-yellow-400' : 'border-gray-200 dark:border-gray-700'}`}
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1 min-w-0">
                  <a
                    href={repo.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-lg font-semibold text-blue-600 hover:underline truncate block"
                  >
                    {repo.name}
                  </a>
                  {repo.archived && (
                    <span className="inline-flex items-center gap-1 text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded mt-1">
                      <Archive className="w-3 h-3" /> Archived
                    </span>
                  )}
                  {repo.fork && (
                    <span className="inline-flex items-center gap-1 text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded mt-1 ml-1">
                      <GitFork className="w-3 h-3" /> Forked
                    </span>
                  )}
                </div>
                <span className={`ml-2 px-2 py-1 text-xs rounded ${repo.private ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                  {repo.private ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                </span>
              </div>

              <p className="text-gray-600 dark:text-gray-400 text-sm mb-3 line-clamp-2">
                {repo.description || 'No description'}
              </p>

              <div className="flex flex-wrap gap-2 mb-3 text-xs text-gray-500">
                {repo.language && (
                  <span className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                    {repo.language}
                  </span>
                )}
                <span>⭐ {repo.stargazers_count}</span>
                <span>🍴 {repo.forks_count}</span>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-3 border-t dark:border-gray-700">
                <button
                  onClick={() => setShowSettingsModal(repo)}
                  className="flex-1 flex items-center justify-center gap-1 text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 px-3 py-2 rounded transition"
                >
                  <Settings className="w-4 h-4" />
                  Settings
                </button>
                <button
                  onClick={() => handleArchiveRepo(repo.name, repo.archived)}
                  disabled={actionLoading}
                  className="flex items-center justify-center gap-1 text-xs bg-yellow-100 dark:bg-yellow-900 hover:bg-yellow-200 dark:hover:bg-yellow-800 text-yellow-700 dark:text-yellow-300 px-3 py-2 rounded transition"
                >
                  <Archive className="w-4 h-4" />
                  {repo.archived ? 'Unarchive' : 'Archive'}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(repo.name)}
                  className="flex items-center justify-center text-xs bg-red-100 dark:bg-red-900 hover:bg-red-200 dark:hover:bg-red-800 text-red-600 px-3 py-2 rounded transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {!repo.fork && repo.owner.login !== username && (
                <button
                  onClick={() => handleForkRepo(repo.owner.login, repo.name)}
                  disabled={actionLoading}
                  className="w-full mt-2 flex items-center justify-center gap-1 text-xs bg-purple-100 dark:bg-purple-900 hover:bg-purple-200 dark:hover:bg-purple-800 text-purple-700 dark:text-purple-300 px-3 py-2 rounded transition"
                >
                  <GitFork className="w-4 h-4" />
                  Fork
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Repository Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="flex justify-between items-center p-4 border-b dark:border-gray-700">
              <h3 className="text-lg font-semibold">Create New Repository</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateRepo} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Repository Name *</label>
                <input
                  type="text"
                  required
                  value={newRepo.name}
                  onChange={(e) => setNewRepo({ ...newRepo, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                  placeholder="my-awesome-repo"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={newRepo.description}
                  onChange={(e) => setNewRepo({ ...newRepo, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                  placeholder="A short description of your project"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">.gitignore Template</label>
                <select
                  value={newRepo.gitignore_template}
                  onChange={(e) => setNewRepo({ ...newRepo, gitignore_template: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                >
                  <option value="">None</option>
                  {templates.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={newRepo.private}
                    onChange={(e) => setNewRepo({ ...newRepo, private: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm">Private</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={newRepo.auto_init}
                    onChange={(e) => setNewRepo({ ...newRepo, auto_init: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm">Initialize with README</span>
                </label>
              </div>
              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {actionLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="flex justify-between items-center p-4 border-b dark:border-gray-700">
              <h3 className="text-lg font-semibold">Repository Settings</h3>
              <button onClick={() => setShowSettingsModal(null)} className="text-gray-500 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUpdateRepo} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Repository Name</label>
                <input
                  type="text"
                  value={showSettingsModal.name}
                  disabled
                  className="w-full px-3 py-2 border rounded-lg bg-gray-100 dark:bg-gray-700"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={showSettingsModal.description || ''}
                  onChange={(e) => setShowSettingsModal({ ...showSettingsModal, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Default Branch</label>
                <input
                  type="text"
                  value={showSettingsModal.default_branch}
                  onChange={(e) => setShowSettingsModal({ ...showSettingsModal, default_branch: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                />
              </div>
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={showSettingsModal.private}
                    onChange={(e) => setShowSettingsModal({ ...showSettingsModal, private: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm">Private Repository</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={showSettingsModal.has_issues}
                    onChange={(e) => setShowSettingsModal({ ...showSettingsModal, has_issues: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm">Enable Issues</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={showSettingsModal.has_projects}
                    onChange={(e) => setShowSettingsModal({ ...showSettingsModal, has_projects: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm">Enable Projects</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={showSettingsModal.has_wiki}
                    onChange={(e) => setShowSettingsModal({ ...showSettingsModal, has_wiki: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm">Enable Wiki</span>
                </label>
              </div>
              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowSettingsModal(null)}
                  className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {actionLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-sm w-full p-6">
            <div className="flex items-center gap-3 mb-4 text-red-600">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-lg font-semibold">Delete Repository</h3>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to delete <strong>"{showDeleteConfirm}"</strong>? 
              This action cannot be undone and all data will be permanently lost.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteRepo(showDeleteConfirm)}
                disabled={actionLoading}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {actionLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
