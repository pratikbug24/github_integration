// RepoAnalytics.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
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

// Optional nice-to-have imports (if installed)
let SyntaxHighlighter;
try {
  // eslint-disable-next-line global-require
  SyntaxHighlighter = require("react-syntax-highlighter").Prism;
} catch (e) {
  SyntaxHighlighter = null;
}

const DEFAULT_LOGO = "sandbox:/mnt/data/09bdc030-fafc-49e3-aa81-a1333a2b4d77.png";

export default function RepoAnalytics() {
  const { username: routeUsername, repoName } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();

  // token and user info (populated by your OAuth flow & stored in localStorage)
  const token = state?.token || localStorage.getItem("github_token");
  const githubUserRaw = localStorage.getItem("github_user");
  const github_user = githubUserRaw ? JSON.parse(githubUserRaw) : null;
  const username = routeUsername || github_user?.login || localStorage.getItem("github_username");

  // refs
  const reportRef = useRef();

  // core states
  const [repoInfo, setRepoInfo] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [contributors, setContributors] = useState([]);
  const [commitsData, setCommitsData] = useState([]);
  const [recentCommits, setRecentCommits] = useState([]);
  const [languages, setLanguages] = useState([]);
  const [branches, setBranches] = useState([]);
  const [prs, setPRs] = useState([]);
  const [heatmapData, setHeatmapData] = useState({});
  const [error, setError] = useState("");

  // diff & commit details
  const [selectedCommit, setSelectedCommit] = useState(null);
  const [selectedCommitFiles, setSelectedCommitFiles] = useState([]);
  const [commitDiffParsed, setCommitDiffParsed] = useState({});
  const [loadingCommitDetails, setLoadingCommitDetails] = useState(false);

  // UI controls
  const [compareBase, setCompareBase] = useState("");
  const [compareHead, setCompareHead] = useState("");
  const [compareResult, setCompareResult] = useState(null);
  const [loadingCompare, setLoadingCompare] = useState(false);
  const [loadingAi, setLoadingAi] = useState(false);
  const [aiSummary, setAiSummary] = useState("");

  // advanced analytics
  const [selectedContributor, setSelectedContributor] = useState(null);
  const [contribHeatmap, setContribHeatmap] = useState({});
  const [codeChurn, setCodeChurn] = useState({}); // file -> {added, deleted, changes}
  const [topFiles, setTopFiles] = useState([]);
  const [riskyFiles, setRiskyFiles] = useState([]);
  const [branchActivity, setBranchActivity] = useState([]); // array for chart
  const [branchHealth, setBranchHealth] = useState({}); // branch -> score
  const [licenseInfo, setLicenseInfo] = useState(null);
  const [dependencyWarnings, setDependencyWarnings] = useState([]); // placeholder

  // headers memoized
  const headers = useMemo(() => ({ Authorization: token ? `token ${token}` : undefined }), [token]);

  // ----------------------------------------
  // 1) Lifecycle - load repository analytics
  // ----------------------------------------
  useEffect(() => {
    const fetchData = async () => {
      if (!token || !username || !repoName) {
        setError("Authentication or repo info missing. Please sign in and select a repo.");
        return;
      }

      try {
        // repository core info
        const repoRes = await axios.get(`https://api.github.com/repos/${username}/${repoName}`, { headers });
        setRepoInfo(repoRes.data);

        // parallel fetches (small pagination per_page for speed)
        const [
          commitsRes,
          issuesRes,
          pullsRes,
          contributorsRes,
          langRes,
          branchesRes,
          prsRes,
          licenseRes,
        ] = await Promise.all([
          axios.get(`https://api.github.com/repos/${username}/${repoName}/commits?per_page=200`, { headers }),
          axios.get(`https://api.github.com/repos/${username}/${repoName}/issues?per_page=100`, { headers }),
          axios.get(`https://api.github.com/repos/${username}/${repoName}/pulls?per_page=100&state=all`, { headers }),
          axios.get(`https://api.github.com/repos/${username}/${repoName}/contributors?per_page=100`, { headers }),
          axios.get(`https://api.github.com/repos/${username}/${repoName}/languages`, { headers }),
          axios.get(`https://api.github.com/repos/${username}/${repoName}/branches?per_page=200`, { headers }),
          axios.get(`https://api.github.com/repos/${username}/${repoName}/pulls?per_page=100&state=all`, { headers }),
          // license may 404 if none
          axios.get(`https://api.github.com/repos/${username}/${repoName}/license`, { headers }).catch(() => ({ data: null })),
        ]);

        const commits = commitsRes.data || [];
        setAnalytics({
          commits: commits.length,
          issues: (issuesRes.data || []).length,
          pulls: (pullsRes.data || []).length,
        });

        setContributors(contributorsRes.data || []);
        setLanguages(Object.entries(langRes.data || {}).map(([name, value]) => ({ name, value })));
        setCommitsData((commits || []).slice(0, 60).map((c, i) => ({ name: `#${i + 1}`, date: new Date(c.commit.author?.date || c.commit.committer?.date).toLocaleDateString() })));
        setRecentCommits((commits || []).slice(0, 40));
        setBranches(branchesRes.data || []);
        setPRs(prsRes.data || []);
        setLicenseInfo(licenseRes?.data || null);

        // compute heatmap & churn & top files
        computeHeatmap(username, repoName);
        computeCodeChurnFromCommits(commits);
        computeBranchActivity(username, repoName);
        detectDependencyWarnings(username, repoName);
      } catch (err) {
        console.error("fetchData error:", err);
        setError("Failed to fetch repository analytics. Check token scopes and network.");
      }
    };

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username, repoName, token]);

  // ----------------------------------------
  // computeHeatmap: standardized 90-day contribution map
  // ----------------------------------------
  const computeHeatmap = async (owner, repo) => {
    try {
      const now = new Date();
      const since = new Date(now);
      since.setDate(since.getDate() - 90);
      const sinceISO = since.toISOString();

      // fetch commits since date (single page — for large repos you may want to paginate)
      const res = await axios.get(`https://api.github.com/repos/${owner}/${repo}/commits?since=${sinceISO}&per_page=200`, { headers });
      const counts = {};
      (res.data || []).forEach((c) => {
        const d = new Date(c.commit.author?.date || c.commit.committer?.date);
        const key = d.toISOString().slice(0, 10);
        counts[key] = (counts[key] || 0) + 1;
      });
      setHeatmapData(counts);
    } catch (err) {
      console.warn("computeHeatmap error:", err);
      setHeatmapData({});
    }
  };

  // ----------------------------------------
  // computeCodeChurnFromCommits: small heuristic to compute churn & top files
  // ----------------------------------------
  const computeCodeChurnFromCommits = async (commitsList) => {
    try {
      const fileMap = {}; // filename -> {added, deleted, count}
      // limit to first 80 commits for speed
      const toFetch = (commitsList || []).slice(0, 80);
      await Promise.all(
        toFetch.map(async (c) => {
          try {
            const r = await axios.get(`https://api.github.com/repos/${username}/${repoName}/commits/${c.sha}`, { headers });
            const files = r.data.files || [];
            files.forEach((f) => {
              if (!fileMap[f.filename]) fileMap[f.filename] = { added: 0, deleted: 0, changes: 0, edits: 0 };
              fileMap[f.filename].added += f.additions || 0;
              fileMap[f.filename].deleted += f.deletions || 0;
              fileMap[f.filename].changes += (f.changes || 0);
              fileMap[f.filename].edits += 1;
            });
          } catch (e) {
            // skip commit error
          }
          return true;
        })
      );

      const filesArr = Object.entries(fileMap).map(([filename, stats]) => ({ filename, ...stats }));
      const top = filesArr.sort((a, b) => b.changes - a.changes).slice(0, 15);
      setTopFiles(top);

      // compute risky files (heuristic: high churn + many edits)
      const risk = filesArr
        .map((f) => ({ ...f, score: f.changes * (1 + Math.log(1 + f.edits)) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);
      setRiskyFiles(risk);

      setCodeChurn(fileMap);
    } catch (err) {
      console.warn("computeCodeChurnFromCommits:", err);
    }
  };

  // ----------------------------------------
  // computeBranchActivity: simple derived metric per branch
  // ----------------------------------------
  const computeBranchActivity = async (owner, repo) => {
    try {
      const branchRes = await axios.get(`https://api.github.com/repos/${owner}/${repo}/branches?per_page=200`, { headers });
      const branches = branchRes.data || [];
      // for each branch, fetch recent commits count (cheap heuristic)
      const activityPromises = branches.map(async (b) => {
        try {
          const commitsR = await axios.get(`https://api.github.com/repos/${owner}/${repo}/commits?sha=${b.name}&per_page=30`, { headers });
          const commitsCount = commitsR.data?.length || 0;
          return { name: b.name, commits: commitsCount, lastCommitSha: b.commit?.sha };
        } catch (e) {
          return { name: b.name, commits: 0, lastCommitSha: b.commit?.sha };
        }
      });
      const acts = await Promise.all(activityPromises);
      setBranchActivity(acts.sort((a, b) => b.commits - a.commits));
      // simple branch health: more recent commits -> healthier; less PRs open -> healthy
      const health = {};
      acts.forEach((a) => {
        // normalize commits count to score 0-100 (heuristic)
        const score = Math.min(100, Math.floor((a.commits / 30) * 100));
        health[a.name] = score;
      });
      setBranchHealth(health);
    } catch (err) {
      console.warn("computeBranchActivity:", err);
    }
  };

  // ----------------------------------------
  // detectDependencyWarnings (placeholder)
  // ----------------------------------------
  const detectDependencyWarnings = async (owner, repo) => {
    try {
      // best approach: check package manifests and query advisories/backends
      // We'll implement a lightweight approach: fetch package.json at repo root (if exists)
      const candidates = ["package.json", "pom.xml", "requirements.txt"];
      const findings = [];
      await Promise.all(
        candidates.map(async (path) => {
          try {
            const r = await axios.get(`https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`, { headers });
            if (r.data && r.data.content) {
              findings.push({ path, hint: "Found manifest. Consider running dependency scan." });
            }
          } catch (e) {
            /* ignore not found */
          }
        })
      );
      setDependencyWarnings(findings);
    } catch (err) {
      console.warn("detectDependencyWarnings:", err);
    }
  };

  // ----------------------------------------
  // fetchCommitDetails & parse patches (unified diff -> hunks)
  // ----------------------------------------
  const fetchCommitDetails = async (sha) => {
    if (!sha) return;
    setLoadingCommitDetails(true);
    setSelectedCommit(null);
    setSelectedCommitFiles([]);
    setCommitDiffParsed({});
    setAiSummary("");
    try {
      const r = await axios.get(`https://api.github.com/repos/${username}/${repoName}/commits/${sha}`, { headers });
      const commitObj = r.data;
      setSelectedCommit(commitObj);
      const files = commitObj.files || [];
      setSelectedCommitFiles(files);

      // parse file patches for side-by-side
      const parsed = {};
      files.forEach((f) => {
        if (f.patch) parsed[f.filename] = parsePatchToHunks(f.patch);
        else parsed[f.filename] = [];
      });
      setCommitDiffParsed(parsed);

      // build contributor heatmap for the author (optional)
      const author = commitObj.author?.login || commitObj.commit?.author?.name;
      buildContributorHeatmap(author);
    } catch (err) {
      console.error("fetchCommitDetails error:", err);
      alert("Failed to load commit details. Check token scopes.");
    } finally {
      setLoadingCommitDetails(false);
    }
  };

  // ----------------------------------------
  // parsePatchToHunks - simple unified diff parser
  // ----------------------------------------
  function parsePatchToHunks(patchText = "") {
    const lines = patchText.split("\n");
    const hunks = [];
    let current = [];
    let inHunk = false;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith("@@")) {
        if (current.length) hunks.push(current);
        current = [{ type: "hunk", content: line }];
        inHunk = true;
      } else if (!inHunk && (line.startsWith("---") || line.startsWith("+++"))) {
        // header; include as meta
        if (!current.length) current.push({ type: "hunk", content: line });
      } else if (inHunk) {
        if (line.startsWith("+")) current.push({ type: "add", content: line.slice(1) });
        else if (line.startsWith("-")) current.push({ type: "del", content: line.slice(1) });
        else current.push({ type: "context", content: line.startsWith(" ") ? line.slice(1) : line });
      }
    }
    if (current.length) hunks.push(current);
    return hunks;
  }

  // ----------------------------------------
  // renderHunkRows - render side-by-side table rows
  // ----------------------------------------
  function renderHunkRows(hunk, fileKey) {
    const rows = [];
    hunk.forEach((ln) => {
      if (ln.type === "hunk") rows.push({ left: ln.content, right: ln.content, meta: true });
      else if (ln.type === "context") rows.push({ left: ln.content, right: ln.content, type: "context" });
      else if (ln.type === "del") rows.push({ left: ln.content, right: "", type: "del" });
      else if (ln.type === "add") rows.push({ left: "", right: ln.content, type: "add" });
    });

    return rows.map((r, i) => (
      <tr key={`${fileKey}-r-${i}`} className={r.meta ? "bg-gray-100" : ""}>
        <td className={`text-xs px-2 py-1 align-top ${r.type === "del" ? "bg-red-50" : ""}`}>{r.left}</td>
        <td className={`text-xs px-2 py-1 align-top ${r.type === "add" ? "bg-green-50" : ""}`}>{r.right}</td>
      </tr>
    ));
  }

  // ----------------------------------------
  // compareBranches using GitHub compare API
  // ----------------------------------------
  const compareBranches = async () => {
    if (!compareBase || !compareHead) return alert("Select base and head branches to compare.");
    setLoadingCompare(true);
    setCompareResult(null);
    try {
      const res = await axios.get(`https://api.github.com/repos/${username}/${repoName}/compare/${compareBase}...${compareHead}`, { headers });
      setCompareResult(res.data);
    } catch (err) {
      console.error("compareBranches:", err);
      alert("Compare failed. The branches may be identical or not present.");
    } finally {
      setLoadingCompare(false);
    }
  };

  // ----------------------------------------
  // buildContributorHeatmap: small per-user heatmap
  // ----------------------------------------
  const buildContributorHeatmap = async (contributorLogin) => {
    if (!contributorLogin) return;
    setSelectedContributor(contributorLogin);
    try {
      const now = new Date();
      const since = new Date(now);
      since.setMonth(since.getMonth() - 3); // 3-month
      const sinceISO = since.toISOString();
      const res = await axios.get(`https://api.github.com/repos/${username}/${repoName}/commits?author=${contributorLogin}&since=${sinceISO}&per_page=200`, { headers });
      const counts = {};
      (res.data || []).forEach((c) => {
        const d = new Date(c.commit.author?.date || c.commit.committer?.date);
        const key = d.toISOString().slice(0, 10);
        counts[key] = (counts[key] || 0) + 1;
      });
      setContribHeatmap(counts);
    } catch (err) {
      console.warn("buildContributorHeatmap:", err);
      setContribHeatmap({});
    }
  };

  // ----------------------------------------
  // requestAiSummary - calls backend /api/ai/commit-summary
  // ----------------------------------------
  const requestAiSummary = async () => {
    if (!selectedCommit) return alert("Select a commit first.");
    setLoadingAi(true);
    setAiSummary("");
    try {

      const diffString = selectedCommitFiles
    .map(f =>
      `--- a/${f.filename}\n+++ b/${f.filename}\n${f.patch || ""}\n`
    )
    .join("\n\n");

      const resp = await axios.post("http://localhost/Taskhub/backend/api/commit-summary.php", {
        owner: username,
        repo: repoName,
        sha: selectedCommit.sha,
        diff: diffString
      });
      setAiSummary(resp.data?.summary || "No summary returned.");
    } catch (err) {
      console.error("requestAiSummary:", err);
      setAiSummary("AI summary not available. Check backend /api/ai/commit-summary.");
    } finally {
      setLoadingAi(false);
    }
  };

  // ----------------------------------------
  // Secret leakage scan (simple heuristic over parsed patches)
  // ----------------------------------------
  const scanForSecrets = (files = []) => {
    const findings = [];
    const secretRegex = /(api_key|apiKey|SECRET|secret|password|passwd|token|ghp_[A-Za-z0-9]|github_pat_[A-Za-z0-9_\-]+)/i;
    files.forEach((f) => {
      const patch = f.patch || "";
      const matches = patch.match(secretRegex);
      if (matches) {
        findings.push({ file: f.filename, match: matches[0] });
      }
    });
    return findings;
  };

  // ----------------------------------------
  // PDF export - capture reportRef as A4 PDF
  // ----------------------------------------
  const downloadMonthlyPDF = async (detailed = false) => {
    if (!reportRef.current) return alert("Nothing to export.");
    try {
      const canvas = await html2canvas(reportRef.current, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const ratio = canvas.width / canvas.height;
      const imgWidth = pageWidth - 40;
      const imgHeight = imgWidth / ratio;
      pdf.addImage(imgData, "PNG", 20, 20, imgWidth, imgHeight);
      pdf.save(`${repoName}-monthly-report.pdf`);
    } catch (err) {
      console.error("downloadMonthlyPDF:", err);
      alert("Failed to generate PDF. Check html2canvas/jsPDF setup.");
    }
  };

  // ----------------------------------------
  // utility: format additions/deletions
  // ----------------------------------------
  const formatAddDel = (file) => `${file.additions || 0} added • ${file.deletions || 0} removed`;

  // ----------------------------------------
  // pr aggregates
  // ----------------------------------------
  const prAgg = useMemo(() => {
    const open = prs.filter((p) => p.state === "open").length;
    const closed = prs.filter((p) => p.state === "closed").length;
    const merged = prs.filter((p) => p.merged_at).length;
    return { open, closed, merged, total: prs.length };
  }, [prs]);

  // ----------------------------------------
  // UI pieces: heatmap render
  // ----------------------------------------
  const renderHeatmap = (dataObj = heatmapData) => {
    const days = [];
    const now = new Date();
    for (let i = 89; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      days.push({ date: key, count: dataObj[key] || 0 });
    }
    const rows = [];
    for (let r = 0; r < Math.ceil(days.length / 7); r++) rows.push(days.slice(r * 7, r * 7 + 7));
    const max = Math.max(1, ...days.map((d) => d.count));
    return (
      <div>
        {rows.map((row, ridx) => (
          <div key={`heat-${ridx}`} className="flex gap-1 mb-1">
            {row.map((cell) => (
              <div
                key={cell.date}
                title={`${cell.date} — ${cell.count} commits`}
                className="w-6 h-6 rounded-sm"
                style={{ backgroundColor: `rgba(34,197,94, ${cell.count / max})` }}
              />
            ))}
          </div>
        ))}
        <div className="text-xs text-gray-500 mt-2">Last 90 days</div>
      </div>
    );
  };

  // ----------------------------------------
  // Render main
  // ----------------------------------------
  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 text-red-700 p-6 rounded">{error}</div>
        <div className="mt-4">
          <button onClick={() => navigate("/github/repolist")} className="px-4 py-2 bg-blue-600 text-white rounded">
            Back to Repo List
          </button>
        </div>
      </div>
    );
  }

  if (!repoInfo || !analytics) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-600">Loading repository analytics...</div>
      </div>
    );
  }

  // small chart data
  const overviewData = [
    { name: "Commits", value: analytics.commits },
    { name: "Issues", value: analytics.issues },
    { name: "Pulls", value: analytics.pulls },
  ];

  // Colors
  const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ff6b6b"];

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{repoInfo.full_name}</h1>
          <p className="text-sm text-gray-500">{repoInfo.description}</p>
          <div className="flex gap-3 mt-2">
            <a href={repoInfo.html_url} target="_blank" rel="noreferrer" className="text-sm px-3 py-1 bg-slate-800 text-white rounded">Open on GitHub</a>
            <button onClick={() => downloadMonthlyPDF(true)} className="text-sm px-3 py-1 bg-indigo-600 text-white rounded">Export Monthly PDF</button>
            <button onClick={() => alert("Generate weekly digest (backend required)")} className="text-sm px-3 py-1 bg-amber-500 text-white rounded">Send Weekly Digest</button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <img src={DEFAULT_LOGO} alt="logo" className="w-12 h-12 rounded" />
          <div className="text-right">
            <div className="text-xs text-gray-500">Connected as</div>
            <div className="text-sm font-medium">{github_user?.login || username}</div>
          </div>
        </div>
      </div>

      {/* Top overview */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded shadow">
          <div className="text-sm text-gray-500">Commits</div>
          <div className="text-2xl font-bold">{analytics.commits}</div>
          <div className="text-xs text-gray-400 mt-1">Recent 60 commits analysed</div>
        </div>

        <div className="bg-white p-4 rounded shadow">
          <div className="text-sm text-gray-500">Open Issues</div>
          <div className="text-2xl font-bold">{analytics.issues}</div>
          <div className="text-xs text-gray-400 mt-1">Open issues (fetched)</div>
        </div>

        <div className="bg-white p-4 rounded shadow">
          <div className="text-sm text-gray-500">Pull Requests</div>
          <div className="text-2xl font-bold">{analytics.pulls}</div>
          <div className="text-xs text-gray-400 mt-1">PRs (open+closed)</div>
        </div>
      </div>

      {/* charts */}
      <div className="grid md:grid-cols-2 gap-6 mt-6">
        <div className="bg-white p-4 rounded shadow">
          <h3 className="font-semibold mb-2">Overview</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={overviewData}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-4 rounded shadow">
          <h3 className="font-semibold mb-2">Commit Frequency (recent)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={commitsData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="date" stroke="#10b981" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* languages & contributors */}
      <div className="grid md:grid-cols-3 gap-6 mt-6">
        <div className="bg-white p-4 rounded shadow">
          <h4 className="font-semibold mb-2">Languages</h4>
          {languages.length ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={languages} dataKey="value" nameKey="name" outerRadius={70} label>
                  {languages.map((entry, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-sm text-gray-500">No language data</div>
          )}
        </div>

        <div className="bg-white p-4 rounded shadow">
          <h4 className="font-semibold mb-2">Top Contributors</h4>
          <div className="flex gap-3 flex-wrap">
            {contributors.slice(0, 6).map((c) => (
              <button
                key={c.id}
                onClick={() => buildContributorHeatmap(c.login)}
                className="flex flex-col items-center bg-gray-50 p-3 rounded w-28 hover:shadow"
              >
                <img src={c.avatar_url} alt={c.login} className="w-10 h-10 rounded-full mb-1" />
                <div className="text-sm font-medium">{c.login}</div>
                <div className="text-xs text-gray-500">{c.contributions} commits</div>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white p-4 rounded shadow">
          <h4 className="font-semibold mb-2">Repo Health</h4>
          <div className="text-sm mb-2">License: <b>{licenseInfo?.license?.name || "Unknown"}</b></div>
          {dependencyWarnings.length ? (
            <div className="text-xs text-red-600">Dependency manifest found — run vulnerability scan</div>
          ) : (
            <div className="text-xs text-gray-500">No dependency manifest detected in root (quick check)</div>
          )}
          <div className="mt-3">
            <a className="text-sm text-blue-600 underline" href={`${repoInfo.html_url}/security`} target="_blank" rel="noreferrer">Open Security / Dependabot</a>
          </div>
        </div>
      </div>

      {/* recent commits + branch list */}
      <div className="grid md:grid-cols-3 gap-6 mt-6">
        <div className="bg-white p-4 rounded shadow col-span-2">
          <div className="flex justify-between items-center mb-3">
            <h4 className="font-semibold">Recent Commits</h4>
            <div className="flex gap-2">
              <button onClick={() => setRecentCommits((r) => r.slice())} className="px-3 py-1 bg-gray-200 rounded">Refresh</button>
              <button onClick={() => alert("Open in VS Code (vscode:// not implemented)")} className="px-3 py-1 bg-slate-800 text-white rounded">Open in VS Code</button>
            </div>
          </div>

          <div className="space-y-2 max-h-64 overflow-auto">
            {recentCommits.map((c) => (
              <div key={c.sha} className="p-2 border rounded flex justify-between items-center">
                <div>
                  <div className="font-medium">{c.commit.message.split("\n")[0]}</div>
                  <div className="text-xs text-gray-500">{new Date(c.commit.author?.date || c.commit.committer?.date).toLocaleString()}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => fetchCommitDetails(c.sha)} className="px-3 py-1 bg-blue-600 text-white rounded text-sm">View</button>
                  <a href={`${repoInfo.html_url}/commit/${c.sha}`} target="_blank" rel="noreferrer" className="px-3 py-1 border rounded text-sm">GitHub</a>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* branches */}
        <div className="bg-white p-4 rounded shadow">
          <h4 className="font-semibold mb-2">Branches</h4>
          <div className="space-y-2 max-h-64 overflow-auto">
            {branchActivity.slice(0, 12).map((b) => (
              <div key={b.name} className="flex justify-between items-center border-b py-2">
                <div>
                  <div className="font-medium">{b.name}</div>
                  <div className="text-xs text-gray-500">Recent commits: {b.commits}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs">Health</div>
                  <div className="text-sm font-semibold">{branchHealth[b.name] ?? "—"}</div>
                </div>
              </div>
            ))}
            {branchActivity.length === 0 && <div className="text-sm text-gray-500">No branches found.</div>}
          </div>
        </div>
      </div>

      {/* Branch compare & PR analytics + top files */}
      <div className="grid md:grid-cols-3 gap-6 mt-6">
        <div className="bg-white p-4 rounded shadow">
          <h4 className="font-semibold mb-3">Compare Branches</h4>
          <select value={compareBase} onChange={(e) => setCompareBase(e.target.value)} className="border p-2 rounded w-full mb-2">
            <option value="">Select base</option>
            {branches.map((b) => <option key={b.name} value={b.name}>{b.name}</option>)}
          </select>
          <select value={compareHead} onChange={(e) => setCompareHead(e.target.value)} className="border p-2 rounded w-full mb-2">
            <option value="">Select head</option>
            {branches.map((b) => <option key={b.name} value={b.name}>{b.name}</option>)}
          </select>
          <button onClick={compareBranches} className="w-full bg-indigo-600 text-white py-2 rounded">{loadingCompare ? "Comparing..." : "Compare"}</button>

          {compareResult && (
            <div className="mt-3 text-sm">
              <div>Commits ahead: {compareResult.status === "identical" ? 0 : (compareResult?.commits?.length || 0)}</div>
              <div>Files changed: {compareResult?.files?.length || 0}</div>
              <div>Total additions: {compareResult?.total_commits || "-"}</div>
            </div>
          )}
        </div>

        <div className="bg-white p-4 rounded shadow">
          <h4 className="font-semibold mb-3">Pull Request Analytics</h4>
          <div className="text-sm mb-2">
            <div>Total: <b>{prAgg.total}</b></div>
            <div>Open: <b>{prAgg.open}</b></div>
            <div>Closed: <b>{prAgg.closed}</b></div>
            <div>Merged: <b>{prAgg.merged}</b></div>
          </div>
          <h5 className="font-medium">Top PR Creators</h5>
          <div className="mt-2">
            {(() => {
              const byAuthor = {};
              prs.forEach((p) => { const name = p.user?.login || "unknown"; byAuthor[name] = (byAuthor[name] || 0) + 1; });
              const authors = Object.entries(byAuthor).sort((a, b) => b[1] - a[1]).slice(0, 6);
              return authors.length ? authors.map(([a, c]) => (<div key={a} className="flex justify-between"><div>{a}</div><div className="text-xs text-gray-500">{c} PRs</div></div>)) : <div className="text-sm text-gray-500">No PR data</div>;
            })()}
          </div>
        </div>

        <div className="bg-white p-4 rounded shadow">
          <h4 className="font-semibold mb-3">Top Edited Files</h4>
          <div className="space-y-2 max-h-56 overflow-auto">
            {topFiles.length ? topFiles.map((f) => (
              <div key={f.filename} className="flex justify-between items-center">
                <div className="text-sm">{f.filename}</div>
                <div className="text-xs text-gray-500">{f.changes} changes</div>
              </div>
            )) : <div className="text-sm text-gray-500">No file data</div>}
          </div>

          <h5 className="mt-3 font-medium">Top Risky Files</h5>
          <div className="mt-2 space-y-2">
            {riskyFiles.length ? riskyFiles.map((f) => (
              <div key={f.filename} className="flex justify-between items-center">
                <div className="text-sm">{f.filename}</div>
                <div className="text-xs text-red-600">score {Math.round(f.score)}</div>
              </div>
            )) : <div className="text-sm text-gray-500">No risky files detected</div>}
          </div>
        </div>
      </div>

      {/* Contribution heatmap (and per-contributor) */}
      <div className="grid md:grid-cols-3 gap-6 mt-6">
        <div className="bg-white p-4 rounded shadow col-span-2">
          <h4 className="font-semibold mb-3">Contribution Heatmap (90 days)</h4>
          {renderHeatmap(heatmapData)}
        </div>

        <div className="bg-white p-4 rounded shadow">
          <h4 className="font-semibold mb-3">Contributor Heatmap</h4>
          <div className="text-sm mb-2">Select contributor:</div>
          <select value={selectedContributor || ""} onChange={(e) => buildContributorHeatmap(e.target.value)} className="border p-2 rounded w-full">
            <option value="">Select</option>
            {contributors.map((c) => <option key={c.login} value={c.login}>{c.login}</option>)}
          </select>
          <div className="mt-4">
            {selectedContributor ? renderHeatmap(contribHeatmap) : <div className="text-sm text-gray-500">Pick a contributor to view their activity heatmap.</div>}
          </div>
        </div>
      </div>

      {/* Diff & commit details */}
      {selectedCommit && (
        <div className="bg-white p-4 rounded shadow mt-6">
          <div className="flex justify-between items-start">
            <div>
              <h4 className="font-semibold">Commit {selectedCommit.sha?.substring(0, 7)}</h4>
              <div className="text-sm text-gray-600">{selectedCommit.commit?.message}</div>
              <div className="text-xs text-gray-500">By {selectedCommit.commit?.author?.name} on {new Date(selectedCommit.commit?.author?.date).toLocaleString()}</div>
            </div>
            <div className="flex gap-2">
              <button onClick={requestAiSummary} className="px-3 py-1 bg-amber-500 text-white rounded">{loadingAi ? "Summarizing..." : "AI Summary"}</button>
              <button onClick={() => downloadMonthlyPDF(false)} className="px-3 py-1 bg-indigo-600 text-white rounded">Export Commit PDF</button>
            </div>
          </div>

          <div className="mt-4 space-y-4">
            {selectedCommitFiles.map((file) => (
              <div key={file.filename} className="border rounded">
                <div className="p-3 flex justify-between items-center bg-gray-50">
                  <div>
                    <div className="font-medium">{file.filename}</div>
                    <div className="text-xs text-gray-500">{formatAddDel(file)}</div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => {
                      // show raw file in new tab if raw_url present
                      if (file.raw_url) window.open(file.raw_url, "_blank");
                    }} className="px-2 py-1 border rounded text-sm">Raw</button>
                    {SyntaxHighlighter && <button onClick={() => {
                      // toggle view could be implemented; here simply fetch and show in modal in future
                      alert("Inline viewer available if SyntaxHighlighter installed.");
                    }} className="px-2 py-1 border rounded text-sm">View</button>}
                  </div>
                </div>

                <div className="p-3 overflow-auto">
                  {commitDiffParsed[file.filename] && commitDiffParsed[file.filename].length > 0 ? (
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="px-2 py-1 text-left w-1/2">Original</th>
                          <th className="px-2 py-1 text-left w-1/2">Changed</th>
                        </tr>
                      </thead>
                      <tbody>
                        {commitDiffParsed[file.filename].map((hunk, hi) => (
                          <React.Fragment key={`h-${file.filename}-${hi}`}>
                            {renderHunkRows(hunk, `${file.filename}-${hi}`)}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="text-sm text-gray-500">No patch available (binary/large file)</div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {aiSummary && (
            <div className="mt-4 bg-gray-50 p-3 rounded">
              <h5 className="font-medium">AI Summary</h5>
              <pre className="whitespace-pre-wrap text-sm text-gray-800 mt-2">{aiSummary}</pre>
            </div>
          )}

          {/* Secret scan */}
          <div className="mt-4">
            <h5 className="font-medium mb-2">Secret Scan Results</h5>
            {(() => {
              const findings = scanForSecrets(selectedCommitFiles);
              return findings.length ? findings.map((f, i) => <div key={i} className="text-sm text-red-600">{f.file} — {f.match}</div>) : <div className="text-sm text-gray-500">No secrets detected by quick heuristic.</div>;
            })()}
          </div>
        </div>
      )}

      {/* footer small report */}
      <div className="mt-6 text-xs text-gray-500">
        Generated by Project Mitra • {new Date().toLocaleString()}
      </div>

    </div>
  );
}
