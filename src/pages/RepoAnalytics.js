// RepoAnalytics.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";

/**
 * RepoAnalytics (enhanced)
 * - Shows repo overview (keeps your design)
 * - Below "Recent Commits" we add:
 *   - Branch list
 *   - Commit files viewer & side-by-side diff
 *   - Lines added/removed
 *   - Branch compare analytics
 *   - Pull request analytics
 *   - Contribution heatmap (90 days)
 *   - AI commit summary (calls backend)
 *
 * Requirements:
 * - token stored in localStorage under "github_token"
 * - username stored in localStorage under "github_username"
 * - Optional backend endpoint for AI summaries: POST /api/ai/commit-summary
 */

export default function RepoAnalytics() {
  const { username: routeUsername, repoName } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();

  const token = state?.token || localStorage.getItem("github_token");
  const username = routeUsername || localStorage.getItem("github_username");

  const [repoInfo, setRepoInfo] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [contributors, setContributors] = useState([]);
  const [commitsData, setCommitsData] = useState([]);
  const [recentCommits, setRecentCommits] = useState([]);
  const [languages, setLanguages] = useState([]);
  const [error, setError] = useState("");

  // New states for advanced features
  const [branches, setBranches] = useState([]);
  const [selectedCommit, setSelectedCommit] = useState(null); // commit object
  const [selectedCommitFiles, setSelectedCommitFiles] = useState([]); // files[]
  const [loadingCommitDetails, setLoadingCommitDetails] = useState(false);
  const [commitDiffParsed, setCommitDiffParsed] = useState({}); // {filename: parsedHunks}
  const [prs, setPRs] = useState([]);
  const [compareBase, setCompareBase] = useState("");
  const [compareHead, setCompareHead] = useState("");
  const [compareResult, setCompareResult] = useState(null);
  const [heatmapData, setHeatmapData] = useState({}); // dateStr -> count
  const [aiSummary, setAiSummary] = useState("");
  const [loadingAi, setLoadingAi] = useState(false);
  const [loadingCompare, setLoadingCompare] = useState(false);

  const headers = useMemo(
    () => ({ Authorization: token ? `token ${token}` : undefined }),
    [token]
  );

  useEffect(() => {
    const fetchData = async () => {
      if (!token || !username) {
        setError("GitHub token or username missing. Please reconnect integration.");
        return;
      }

      try {
        // Basic repo info & supporting endpoints
        const repoRes = await axios.get(
          `https://api.github.com/repos/${username}/${repoName}`,
          { headers }
        );
        setRepoInfo(repoRes.data);

        // Parallel requests (note: pagination omitted for brevity)
        const [commitsRes, issuesRes, pullsRes, contributorsRes, langRes, branchesRes, prsRes] =
          await Promise.all([
            axios.get(`https://api.github.com/repos/${username}/${repoName}/commits?per_page=100`, { headers }),
            axios.get(`https://api.github.com/repos/${username}/${repoName}/issues?per_page=100`, { headers }),
            axios.get(`https://api.github.com/repos/${username}/${repoName}/pulls?per_page=100&state=all`, { headers }),
            axios.get(`https://api.github.com/repos/${username}/${repoName}/contributors?per_page=100`, { headers }),
            axios.get(`https://api.github.com/repos/${username}/${repoName}/languages`, { headers }),
            axios.get(`https://api.github.com/repos/${username}/${repoName}/branches?per_page=100`, { headers }),
            axios.get(`https://api.github.com/repos/${username}/${repoName}/pulls?per_page=100&state=all`, { headers }),
          ]);

        setAnalytics({
          commits: commitsRes.data.length,
          issues: issuesRes.data.length,
          pulls: pullsRes.data.length,
        });

        setContributors(contributorsRes.data || []);
        setLanguages(Object.entries(langRes.data || {}).map(([name, value]) => ({ name, value })));

        // Commits trend (small summary)
        const commitsTrend = (commitsRes.data || []).slice(0, 30).map((c, i) => ({
          name: `#${i + 1}`,
          message: c.commit.message.substring(0, 30),
          date: new Date(c.commit.author?.date || c.commit.committer?.date).toLocaleDateString(),
        }));
        setCommitsData(commitsTrend);
        setRecentCommits((commitsRes.data || []).slice(0, 20));
        setBranches(branchesRes.data || []);
        setPRs(prsRes.data || []);

        // Precompute 90-day heatmap: fetch commits since 90 days ago (paginated minimal approach)
        computeHeatmap(username, repoName, headers);

      } catch (err) {
        console.error("Error fetching analytics:", err);
        setError("Failed to fetch repository analytics. Please try again.");
      }
    };

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username, repoName, token]);

  // --------------------------
  // Contribution heatmap (90 days)
  // --------------------------
  const computeHeatmap = async (owner, repo, hdrs) => {
    try {
      const now = new Date();
      const since = new Date(now);
      since.setDate(since.getDate() - 90);
      const sinceISO = since.toISOString();

      // Basic fetching of commits since date (note: may need pagination for big repos)
      const commitsRes = await axios.get(
        `https://api.github.com/repos/${owner}/${repo}/commits?since=${sinceISO}&per_page=100`,
        { headers: hdrs }
      );

      const counts = {};
      (commitsRes.data || []).forEach((c) => {
        const d = new Date(c.commit.author?.date || c.commit.committer?.date);
        const key = d.toISOString().slice(0, 10); // YYYY-MM-DD
        counts[key] = (counts[key] || 0) + 1;
      });

      setHeatmapData(counts);
    } catch (err) {
      console.warn("Heatmap compute warning:", err?.message || err);
      setHeatmapData({});
    }
  };

  // --------------------------
  // Fetch commit details (files + patches)
  // --------------------------
  const fetchCommitDetails = async (sha) => {
    if (!sha) return;
    setLoadingCommitDetails(true);
    setSelectedCommit(null);
    setSelectedCommitFiles([]);
    setCommitDiffParsed({});
    setAiSummary("");
    try {
      const res = await axios.get(
        `https://api.github.com/repos/${username}/${repoName}/commits/${sha}`,
        {
          headers: { ...headers, Accept: "application/vnd.github.v3+json" },
        }
      );

      const commitObj = res.data;
      setSelectedCommit(commitObj);
      const files = commitObj.files || [];
      setSelectedCommitFiles(files);

      // Parse patches into hunks per file for side-by-side rendering
      const parsed = {};
      files.forEach((f) => {
        if (f.patch) {
          parsed[f.filename] = parsePatchToHunks(f.patch);
        } else {
          parsed[f.filename] = [];
        }
      });
      setCommitDiffParsed(parsed);
    } catch (err) {
      console.error("Error fetching commit details:", err);
      alert("Failed to load commit details/diff.");
    } finally {
      setLoadingCommitDetails(false);
    }
  };

  // --------------------------
  // Parse patch (unified diff) into hunks for side-by-side
  // A simple parser: splits by lines and groups into hunks; each hunk is an array of {type, content}
  // type: 'context' | 'add' | 'del' | 'hunk'
  // --------------------------
  function parsePatchToHunks(patchText) {
    const lines = patchText.split("\n");
    const hunks = [];
    let current = [];
    let inHunk = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith("@@")) {
        // start new hunk
        if (current.length) {
          hunks.push(current);
        }
        current = [{ type: "hunk", content: line }];
        inHunk = true;
      } else if (!inHunk && (line.startsWith("---") || line.startsWith("+++"))) {
        // file header lines, skip or include as hunk header
        // include as metadata row
        if (!current.length) current.push([{ type: "hunk", content: line }]);
      } else if (inHunk) {
        if (line.startsWith("+")) current.push({ type: "add", content: line.slice(1) });
        else if (line.startsWith("-")) current.push({ type: "del", content: line.slice(1) });
        else current.push({ type: "context", content: line.startsWith(" ") ? line.slice(1) : line });
      } else {
        // outside hunk: ignore
      }
    }
    if (current.length) hunks.push(current);
    return hunks;
  }

  // --------------------------
  // Render side-by-side rows for a single hunk
  // We'll produce rows where left cell shows del/context and right shows add/context
  // --------------------------
  function renderHunkRows(hunk, fileKey) {
    // hunk is array of {type, content}
    const rows = [];
    let leftBuf = [];
    let rightBuf = [];

    // simpler approach: iterate lines and push a row for each source/target mapping
    hunk.forEach((ln, idx) => {
      if (ln.type === "hunk") {
        rows.push({ left: ln.content, right: ln.content, meta: true });
      } else if (ln.type === "context") {
        rows.push({ left: ln.content, right: ln.content, type: "context" });
      } else if (ln.type === "del") {
        rows.push({ left: ln.content, right: "", type: "del" });
      } else if (ln.type === "add") {
        rows.push({ left: "", right: ln.content, type: "add" });
      }
    });

    return rows.map((r, i) => (
      <tr key={`${fileKey}-row-${i}`} className={r.meta ? "bg-gray-200" : ""}>
        <td className={`align-top text-xs px-2 py-1 whitespace-pre-wrap ${r.type === "del" ? "bg-red-50" : ""}`}>
          {r.left}
        </td>
        <td className={`align-top text-xs px-2 py-1 whitespace-pre-wrap ${r.type === "add" ? "bg-green-50" : ""}`}>
          {r.right}
        </td>
      </tr>
    ));
  }

  // --------------------------
  // Branch compare using GitHub compare API
  // --------------------------
  const compareBranches = async () => {
    if (!compareBase || !compareHead) return alert("Select base and head branches to compare.");
    setLoadingCompare(true);
    setCompareResult(null);
    try {
      const res = await axios.get(
        `https://api.github.com/repos/${username}/${repoName}/compare/${compareBase}...${compareHead}`,
        { headers }
      );
      setCompareResult(res.data);
    } catch (err) {
      console.error("Compare error:", err);
      alert("Compare failed. Make sure branches exist and are not identical.");
    } finally {
      setLoadingCompare(false);
    }
  };

  // --------------------------
  // Fetch PR analytics (summaries)
  // --------------------------
  const fetchPRAggregates = () => {
    // prs is already loaded earlier
    // derive snapshots
    // We'll compute counts: open, closed, merged, avg time to merge (approx)
    const open = prs.filter((p) => p.state === "open").length;
    const closed = prs.filter((p) => p.state === "closed").length;
    const merged = prs.filter((p) => p.merged_at).length;

    return { open, closed, merged, total: prs.length };
  };

  // --------------------------
  // Request AI summary (calls backend) - backend must implement /api/ai/commit-summary
  // --------------------------
  const requestAiSummary = async () => {
    if (!selectedCommit) return alert("Select a commit first.");
    setLoadingAi(true);
    setAiSummary("");
    try {
      // backend should accept repo, owner, sha, and diff (or commit message) and return summary
      const resp = await axios.post("/api/ai/commit-summary", {
        owner: username,
        repo: repoName,
        sha: selectedCommit.sha,
        diff: (selectedCommitFiles || []).map((f) => ({ filename: f.filename, patch: f.patch || "" })),
      });
      setAiSummary(resp.data.summary || "No summary returned.");
    } catch (err) {
      console.error("AI summary error:", err);
      setAiSummary("AI summary unavailable. Make sure backend endpoint /api/ai/commit-summary exists.");
    } finally {
      setLoadingAi(false);
    }
  };

  // --------------------------
  // Utility: format additions/deletions
  // --------------------------
  const formatAddDel = (file) => {
    return `${file.additions} added • ${file.deletions} removed`;
  };

  // --------------------------
  // Small helper to render heatmap (90 days)
  // --------------------------
  const renderHeatmap = () => {
    // generate last 90 days rows grouped by weeks (7 columns)
    const days = [];
    const now = new Date();
    for (let i = 89; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      days.push({ date: key, count: heatmapData[key] || 0 });
    }

    // render as simple grid 7 columns
    const rows = [];
    for (let r = 0; r < Math.ceil(days.length / 7); r++) {
      rows.push(days.slice(r * 7, r * 7 + 7));
    }

    const max = Math.max(1, ...days.map((d) => d.count));
    return (
      <div className="grid gap-1">
        {rows.map((row, i) => (
          <div key={`heat-row-${i}`} className="flex gap-1">
            {row.map((cell) => (
              <div
                key={cell.date}
                title={`${cell.date} — ${cell.count} commits`}
                className="w-6 h-6 rounded-sm flex items-center justify-center text-xs"
                style={{
                  backgroundColor: `rgba(34,197,94, ${cell.count / max})`,
                }}
              />
            ))}
          </div>
        ))}
        <p className="text-xs text-gray-600 mt-2">Last 90 days commit activity</p>
      </div>
    );
  };

  // --------------------------
  // UI renders below your existing "Recent Commits" section
  // --------------------------
  if (error) {
    return (
      <div className="p-8 text-center text-red-600 bg-red-50 mt-6 rounded-xl">
        ⚠️ {error}
        <br />
        <button
          onClick={() => navigate("/github/repolist")}
          className="mt-4 px-5 py-2 bg-blue-500 text-white rounded-lg"
        >
          Back to Repo List
        </button>
      </div>
    );
  }

  if (!repoInfo || !analytics) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-gray-600 text-lg">Loading repository analytics...</p>
      </div>
    );
  }

  const data = [
    { name: "Commits", value: analytics.commits },
    { name: "Issues", value: analytics.issues },
    { name: "Pull Requests", value: analytics.pulls },
  ];

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#845EC2", "#FF6F91", "#2C73D2"];

  const prAgg = fetchPRAggregates();

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Back Button */}
      <button onClick={() => navigate(-1)} className="bg-gray-300 px-4 py-2 rounded mb-6 hover:bg-gray-400 transition">
        ← Back
      </button>

      {/* Title */}
      <h2 className="text-3xl font-bold text-blue-700 mb-4">📊 Analytics for {repoName}</h2>

      {/* Repo Overview */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h3 className="text-2xl font-semibold text-gray-800">{repoInfo.name}</h3>
        <p className="text-gray-600 mt-1">{repoInfo.description || "No description provided"}</p>

        <div className="flex flex-wrap gap-6 mt-4 text-gray-700">
          <span>⭐ Stars: <b>{repoInfo.stargazers_count}</b></span>
          <span>🍴 Forks: <b>{repoInfo.forks_count}</b></span>
          <span>🐛 Issues: <b>{repoInfo.open_issues_count}</b></span>
          <span>👀 Watchers: <b>{repoInfo.watchers_count}</b></span>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid md:grid-cols-2 gap-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h4 className="text-xl font-semibold text-gray-700 mb-4">Overview</h4>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#3b82f6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h4 className="text-xl font-semibold text-gray-700 mb-4">Commit Frequency</h4>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={commitsData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="date" stroke="#10b981" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Language Pie */}
      <div className="bg-white rounded-lg shadow-md p-6 mt-8">
        <h4 className="text-xl font-semibold text-gray-700 mb-4">🧠 Languages Used</h4>
        {languages.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={languages} cx="50%" cy="50%" outerRadius={100} fill="#8884d8" dataKey="value" label={({ name }) => name}>
                {languages.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-gray-500 text-center">No language data available.</p>
        )}
      </div>

      {/* Contributors */}
      <div className="bg-white rounded-lg shadow-md p-6 mt-8">
        <h4 className="text-xl font-semibold text-gray-700 mb-4">👥 Top Contributors</h4>
        <div className="flex flex-wrap gap-4">
          {contributors.slice(0, 6).map((c) => (
            <div key={c.id} className="flex flex-col items-center bg-gray-50 p-4 rounded-lg shadow-sm w-32">
              <img src={c.avatar_url} alt={c.login} className="w-12 h-12 rounded-full mb-2" />
              <p className="text-sm font-medium text-gray-800">{c.login}</p>
              <p className="text-xs text-gray-500">{c.contributions} commits</p>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Commits */}
      <div className="bg-white rounded-lg shadow-md p-6 mt-8">
        <h4 className="text-xl font-semibold text-gray-700 mb-4">🕓 Recent Commits</h4>
        <ul className="divide-y">
          {recentCommits.map((commit, index) => (
            <li key={commit.sha} className="py-3">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-gray-800 font-medium">{commit.commit.message}</p>
                  <p className="text-sm text-gray-500">
                    By <b>{commit.commit.author?.name || commit.commit.committer?.name}</b> on{" "}
                    {new Date(commit.commit.author?.date || commit.commit.committer?.date).toLocaleString()}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="text-xs text-gray-600">{commit.sha.substring(0, 7)}</div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => fetchCommitDetails(commit.sha)}
                      className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                    >
                      View Diff
                    </button>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* ------------------ NEW: Branches, Compare, PR analytics, Diff viewer, Heatmap ------------------ */}
      <div className="grid md:grid-cols-3 gap-6 mt-8">
        {/* Branches */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h4 className="text-lg font-semibold mb-3">Branches</h4>
          <div className="space-y-2 max-h-64 overflow-auto">
            {branches.map((b) => (
              <div key={b.name} className="flex justify-between items-center border-b py-2">
                <div>
                  <div className="font-medium">{b.name}</div>
                  <div className="text-xs text-gray-500">Commit: {b.commit?.sha?.substring(0, 7)}</div>
                </div>
                <div className="text-xs text-gray-500"> </div>
              </div>
            ))}
            {branches.length === 0 && <p className="text-gray-500">No branches found.</p>}
          </div>

          {/* Branch compare selectors */}
          <div className="mt-4">
            <div className="text-sm font-medium mb-2">Compare branches</div>
            <select value={compareBase} onChange={(e) => setCompareBase(e.target.value)} className="border p-2 rounded w-full mb-2">
              <option value="">Select base</option>
              {branches.map((b) => <option key={`b-${b.name}`} value={b.name}>{b.name}</option>)}
            </select>
            <select value={compareHead} onChange={(e) => setCompareHead(e.target.value)} className="border p-2 rounded w-full mb-2">
              <option value="">Select head</option>
              {branches.map((b) => <option key={`h-${b.name}`} value={b.name}>{b.name}</option>)}
            </select>
            <button onClick={compareBranches} disabled={loadingCompare} className="w-full bg-indigo-600 text-white py-2 rounded">
              {loadingCompare ? "Comparing..." : "Compare"}
            </button>

            {compareResult && (
              <div className="mt-3 text-sm text-gray-700">
                <div>Commits ahead: {compareResult.status === "identical" ? 0 : compareResult.commits?.length || 0}</div>
                <div>Files changed: {compareResult.files?.length || 0}</div>
                <div>Total additions: {compareResult.total_commits || "-"}</div>
              </div>
            )}
          </div>
        </div>

        {/* PR Analytics */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h4 className="text-lg font-semibold mb-3">Pull Request Analytics</h4>
          <div className="text-sm text-gray-700 space-y-2">
            <div>Total PRs: <b>{prAgg.total}</b></div>
            <div>Open: <b>{prAgg.open}</b></div>
            <div>Closed: <b>{prAgg.closed}</b></div>
            <div>Merged: <b>{prAgg.merged}</b></div>
          </div>

          <h5 className="mt-4 font-medium">Top PR creators</h5>
          <div className="mt-2 space-y-2">
            {/* pick top PR authors */}
            {(() => {
              const byAuthor = {};
              prs.forEach((p) => {
                const name = p.user?.login || "unknown";
                byAuthor[name] = (byAuthor[name] || 0) + 1;
              });
              const authors = Object.entries(byAuthor).sort((a, b) => b[1] - a[1]).slice(0, 6);
              return authors.length ? (
                authors.map(([author, count]) => (
                  <div key={author} className="flex items-center justify-between">
                    <div className="text-sm">{author}</div>
                    <div className="text-xs text-gray-500">{count} PRs</div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-gray-500">No PR data</div>
              );
            })()}
          </div>
        </div>

        {/* Contribution heatmap */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h4 className="text-lg font-semibold mb-3">Contribution Graph</h4>
          {renderHeatmap()}
        </div>
      </div>

      {/* Diff & Commit Files Viewer (below everything) */}
      {selectedCommit && (
        <div className="bg-white rounded-lg shadow-md p-6 mt-8">
          <div className="flex justify-between items-start">
            <div>
              <h4 className="text-xl font-semibold">Commit: {selectedCommit.sha?.substring(0, 7)}</h4>
              <p className="text-sm text-gray-600">{selectedCommit.commit?.message}</p>
              <p className="text-xs text-gray-500">
                By {selectedCommit.commit?.author?.name} on {new Date(selectedCommit.commit?.author?.date).toLocaleString()}
              </p>
            </div>

            <div className="text-right">
              <div className="text-sm text-gray-600">Files changed: <b>{selectedCommit.files?.length || 0}</b></div>
              <div className="text-sm text-gray-600">Additions: <b>{selectedCommit.stats?.additions}</b></div>
              <div className="text-sm text-gray-600">Deletions: <b>{selectedCommit.stats?.deletions}</b></div>
              <div className="flex gap-2 mt-3">
                <button onClick={requestAiSummary} disabled={loadingAi} className="px-3 py-1 bg-amber-500 text-white rounded">
                  {loadingAi ? "Summarizing..." : "AI Summary"}
                </button>
                <button onClick={() => window.open(`${repoInfo.html_url}/commit/${selectedCommit.sha}`, "_blank")} className="px-3 py-1 bg-gray-200 rounded">
                  View on GitHub
                </button>
              </div>
            </div>
          </div>

          <div className="mt-6 border-t pt-4">
            <h5 className="font-medium mb-3">Files</h5>
            <div className="space-y-4">
              {selectedCommitFiles.map((file) => (
                <div key={file.filename} className="border rounded p-3">
                  <div className="flex justify-between items-center mb-2">
                    <div>
                      <div className="font-medium">{file.filename}</div>
                      <div className="text-xs text-gray-500">{formatAddDel(file)}</div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => { /* expand/collapse per-file if you want */ }} className="text-sm px-2 py-1 border rounded">Open</button>
                    </div>
                  </div>

                  {/* Side-by-side diff */}
                  <div className="overflow-auto border rounded">
                    {commitDiffParsed[file.filename] && commitDiffParsed[file.filename].length > 0 ? (
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="bg-gray-100">
                            <th className="text-left px-2 py-1 w-1/2">Original</th>
                            <th className="text-left px-2 py-1 w-1/2">Changed</th>
                          </tr>
                        </thead>
                        <tbody>
                          {commitDiffParsed[file.filename].map((hunk, hi) => (
                            <React.Fragment key={`hunk-${file.filename}-${hi}`}>
                              {renderHunkRows(hunk, `${file.filename}-${hi}`)}
                            </React.Fragment>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="p-4 text-sm text-gray-500">No patch available for this file (binary or large file).</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Summary result */}
          {aiSummary && (
            <div className="mt-6 bg-gray-50 border p-4 rounded">
              <h5 className="font-medium">AI Commit Summary</h5>
              <p className="text-sm text-gray-800 mt-2 whitespace-pre-wrap">{aiSummary}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
