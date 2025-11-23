import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";

function GithubCodeEditor() {
  const { owner, repo } = useParams();
  const navigate = useNavigate();

  const [token, setToken] = useState(localStorage.getItem("github_token") || "");
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileContent, setFileContent] = useState("");
  const [fileSha, setFileSha] = useState("");
  const [saving, setSaving] = useState(false);
  const [showCommitBox, setShowCommitBox] = useState(false);
  const [commitMessage, setCommitMessage] = useState("");
  const [creatingFile, setCreatingFile] = useState(false);
  const [newFileName, setNewFileName] = useState("");

  // ✅ Fetch repo files
  const fetchRepoTree = async () => {
    try {
      // Step 1: Get default branch
      const repoInfo = await axios.get(`https://api.github.com/repos/${owner}/${repo}`, {
        headers: { Authorization: `token ${token}` },
      });
      const defaultBranch = repoInfo.data.default_branch || "main";
  
      // Step 2: Get repo tree
      const res = await axios.get(
        `https://api.github.com/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`,
        { headers: { Authorization: `token ${token}` } }
      );
  
      const allFiles = res.data.tree.filter((item) => item.type === "blob");
      setFiles(allFiles);
    } catch (error) {
      console.error("Error fetching repo tree:", error.response?.data || error.message);
      if (error.response?.status === 404) {
        alert("❌ Repo not found or wrong branch name.");
      } else if (error.response?.status === 403) {
        alert("❌ Token missing or invalid. Please recheck your token permissions.");
      } else {
        alert("Failed to load repository structure.");
      }
    }
  };
  

  // ✅ Load file content
  const loadFileContent = async (path) => {
    try {
      const res = await axios.get(
        `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
        { headers: { Authorization: `token ${token}` } }
      );
      const decoded = atob(res.data.content);
      setSelectedFile(path);
      setFileSha(res.data.sha);
      setFileContent(decoded);
      setShowCommitBox(false);
    } catch (error) {
      console.error("Error loading file:", error);
      alert("Failed to load file content.");
    }
  };

  // ✅ Save changes
  const saveFileToGitHub = async () => {
    if (!selectedFile) return alert("No file selected");
    if (!commitMessage.trim()) return alert("Enter a commit message");

    setSaving(true);
    try {
      const encoded = btoa(unescape(encodeURIComponent(fileContent)));
      const res = await axios.put(
        `https://api.github.com/repos/${owner}/${repo}/contents/${selectedFile}`,
        {
          message: commitMessage,
          content: encoded,
          sha: fileSha,
          branch: "main",
        },
        { headers: { Authorization: `token ${token}` } }
      );

      alert(`✅ Changes committed: ${res.data.commit.message}`);
      setFileSha(res.data.content.sha);
      setShowCommitBox(false);
    } catch (error) {
      console.error("Error saving file:", error);
      alert("❌ Failed to commit changes. Check token permissions.");
    } finally {
      setSaving(false);
    }
  };

  // ✅ Create a new file
  const createNewFile = async () => {
    if (!newFileName.trim()) return alert("Enter a file name");

    setSaving(true);
    try {
      const encoded = btoa("");
      const res = await axios.put(
        `https://api.github.com/repos/${owner}/${repo}/contents/${newFileName}`,
        {
          message: `Create ${newFileName}`,
          content: encoded,
          branch: "main",
        },
        { headers: { Authorization: `token ${token}` } }
      );

      alert(`✅ File created: ${newFileName}`);
      setCreatingFile(false);
      setNewFileName("");
      fetchRepoTree();
    } catch (error) {
      console.error("Error creating file:", error);
      alert("❌ Failed to create file. Check permissions.");
    } finally {
      setSaving(false);
    }
  };

  // ✅ Fetch files on load
  useEffect(() => {
    if (owner && repo) fetchRepoTree();
  }, [owner, repo]);

  if (!owner || !repo) return <p>Invalid repository path.</p>;

  return (
    <div className="flex">
      {/* Sidebar */}
      <div className="w-1/4 bg-gray-100 p-3 overflow-y-auto h-screen border-r border-gray-200">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-lg font-semibold text-blue-700">{repo}</h2>
          <button
            onClick={() => navigate("/github/repolist")}
            className="text-sm text-gray-600 hover:text-blue-600"
          >
            ← Back
          </button>
        </div>

        <button
          onClick={() => setCreatingFile(!creatingFile)}
          className="bg-green-500 text-white w-full py-2 rounded mb-3 hover:bg-green-600"
        >
          ➕ Create New File
        </button>

        {creatingFile && (
          <div className="p-2 border rounded mb-3 bg-white">
            <input
              type="text"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              placeholder="example.js"
              className="border p-2 rounded w-full mb-2"
            />
            <button
              onClick={createNewFile}
              disabled={saving}
              className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
            >
              {saving ? "Creating..." : "Create"}
            </button>
          </div>
        )}

        <ul className="space-y-1">
          {files.map((file) => (
            <li
              key={file.sha}
              onClick={() => loadFileContent(file.path)}
              className={`cursor-pointer hover:bg-blue-100 px-2 py-1 rounded ${
                file.path === selectedFile ? "bg-blue-200 font-semibold" : ""
              }`}
            >
              {file.path}
            </li>
          ))}
        </ul>
      </div>

      {/* Editor */}
      <div className="w-3/4 p-6">
        {selectedFile ? (
          <>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-bold text-gray-800">{selectedFile}</h3>
              <button
                onClick={() => setShowCommitBox(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                💾 Save Changes
              </button>
            </div>

            <textarea
              value={fileContent}
              onChange={(e) => setFileContent(e.target.value)}
              className="w-full h-[70vh] border p-3 font-mono text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            />

            {/* Commit Popup */}
            {showCommitBox && (
              <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg shadow-lg p-6 w-1/3">
                  <h2 className="text-lg font-bold mb-4 text-gray-700">
                    Commit Changes
                  </h2>
                  <input
                    type="text"
                    value={commitMessage}
                    onChange={(e) => setCommitMessage(e.target.value)}
                    placeholder="Enter commit message"
                    className="border p-2 rounded w-full mb-4 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => setShowCommitBox(false)}
                      className="px-4 py-2 border rounded hover:bg-gray-100"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={saveFileToGitHub}
                      disabled={saving}
                      className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                    >
                      {saving ? "Committing..." : "Commit"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="text-gray-500 text-center mt-10">
            Select a file from the left panel to view or edit it.
          </p>
        )}
      </div>
    </div>
  );
}

export default GithubCodeEditor;
