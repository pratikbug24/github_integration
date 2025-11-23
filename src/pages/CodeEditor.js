// import React, { useEffect, useState } from "react";
// import axios from "axios";

// function GithubCodeEditor({ owner, repo, token }) {
//   const [files, setFiles] = useState([]);
//   const [selectedFile, setSelectedFile] = useState(null);
//   const [fileContent, setFileContent] = useState("");
//   const [fileSha, setFileSha] = useState("");
//   const [saving, setSaving] = useState(false);
//   const [loadingFiles, setLoadingFiles] = useState(false);

//   // ✅ Fetch all files recursively from the main branch
//   const fetchRepoTree = async () => {
//     if (!owner || !repo || !token) {
//       alert("Missing GitHub credentials");
//       return;
//     }

//     setLoadingFiles(true);
//     try {
//       const res = await axios.get(
//         `https://api.github.com/repos/${owner}/${repo}/git/trees/main?recursive=1`,
//         {
//           headers: { Authorization: `token ${token}` },
//         }
//       );
//       const allFiles = res.data.tree.filter((item) => item.type === "blob");
//       setFiles(allFiles);
//     } catch (error) {
//       console.error("Error fetching repo tree:", error);
//       alert("Failed to load repository structure. Please check branch name or token.");
//     } finally {
//       setLoadingFiles(false);
//     }
//   };

//   // ✅ Load specific file content
//   const loadFileContent = async (path) => {
//     try {
//       const res = await axios.get(
//         `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
//         {
//           headers: { Authorization: `token ${token}` },
//         }
//       );
//       const decoded = atob(res.data.content);
//       setSelectedFile(path);
//       setFileSha(res.data.sha);
//       setFileContent(decoded);
//     } catch (error) {
//       console.error("Error loading file:", error);
//       alert("Failed to load file content");
//     }
//   };

//   // ✅ Save (commit) edited file to GitHub
//   const saveFileToGitHub = async () => {
//     if (!selectedFile) return alert("No file selected");

//     setSaving(true);
//     try {
//       const encoded = btoa(unescape(encodeURIComponent(fileContent)));

//       const res = await axios.put(
//         `https://api.github.com/repos/${owner}/${repo}/contents/${selectedFile}`,
//         {
//           message: `Update ${selectedFile} via Project Mitra`,
//           content: encoded,
//           sha: fileSha,
//           branch: "main",
//         },
//         {
//           headers: { Authorization: `token ${token}` },
//         }
//       );

//       alert(`✅ Changes committed: ${res.data.commit.message}`);
//       setFileSha(res.data.content.sha); // update new SHA after commit
//     } catch (error) {
//       console.error("Error saving file:", error.response || error);
//       alert("❌ Failed to commit changes. Check your token permissions.");
//     } finally {
//       setSaving(false);
//     }
//   };

//   useEffect(() => {
//     fetchRepoTree();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, []);

//   return (
//     <div className="flex">
//       {/* Sidebar - File List */}
//       <div className="w-1/4 bg-gray-100 p-3 overflow-y-auto h-screen">
//         <h2 className="text-lg font-semibold mb-3 text-blue-700">
//           {typeof repo === "string" ? repo : repo?.name || "Repository"}
//         </h2>

//         {loadingFiles ? (
//           <p className="text-gray-500">Loading files...</p>
//         ) : files.length > 0 ? (
//           <ul className="space-y-1">
//             {files.map((file) => (
//               <li
//                 key={file.sha}
//                 onClick={() => loadFileContent(file.path)}
//                 className={`cursor-pointer hover:bg-blue-100 px-2 py-1 rounded ${
//                   file.path === selectedFile ? "bg-blue-200 font-semibold" : ""
//                 }`}
//               >
//                 {file.path}
//               </li>
//             ))}
//           </ul>
//         ) : (
//           <p className="text-gray-500">No files found in this repo.</p>
//         )}
//       </div>

//       {/* Editor - File Content */}
//       <div className="w-3/4 p-6">
//         {selectedFile ? (
//           <>
//             <div className="flex justify-between items-center mb-3">
//               <h3 className="text-lg font-bold text-gray-800">{selectedFile}</h3>
//               <button
//                 onClick={saveFileToGitHub}
//                 disabled={saving}
//                 className={`${
//                   saving ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"
//                 } text-white px-4 py-2 rounded`}
//               >
//                 {saving ? "Saving..." : "💾 Save Changes"}
//               </button>
//             </div>

//             <textarea
//               value={fileContent}
//               onChange={(e) => setFileContent(e.target.value)}
//               className="w-full h-[75vh] border p-3 font-mono text-sm rounded-lg"
//             />
//           </>
//         ) : (
//           <p className="text-gray-500 text-center mt-10">
//             Select a file from the left panel to view or edit it.
//           </p>
//         )}
//       </div>
//     </div>
//   );
// }

// export default GithubCodeEditor;
