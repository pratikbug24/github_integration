// RepoAnalytics.jsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
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
  AreaChart,
  Area,
} from "recharts";


// Theme Context for dark mode support
import { useTheme } from "../context/ThemeContext";


// CSV Export utility
import {
  exportCommitsToCSV,
  exportPRsToCSV,
  exportBranchesToCSV,
  exportContributorsToCSV,
  exportAnalyticsToCSV,
} from "../utils/csvExport";


// Mobile Responsive wrapper
import MobileResponsive from "../components/MobileResponsive";


// Optional nice-to-have imports (if installed)
let SyntaxHighlighter;
try {
  // eslint-disable-next-line global-require
  SyntaxHighlighter = require("react-syntax-highlighter").Prism;
} catch (e) {
  SyntaxHighlighter = null;
}


// Skeleton loader component
const Skeleton = ({ className }) => (
  <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${className}`} />
);


// Empty state component
const EmptyState = ({ message, icon = "📭" }) => (
  <div className="text-center py-12 text-gray-500 dark:text-gray-400">
    <div className="text-4xl mb-2">{icon}</div>
    <div>{message}</div>
  </div>
);


// Loading skeleton for the main content
const LoadingSkeleton = () => (
  <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
    <div className="flex items-center justify-between mb-6">
      <div className="flex-1">
        <Skeleton className="h-8 w-64 mb-2" />
        <Skeleton className="h-4 w-96 mb-4" />
        <div className="flex gap-3">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-8 w-32" />
        </div>
      </div>
      <Skeleton className="w-12 h-12 rounded" />
    </div>
    <div className="grid md:grid-cols-3 gap-4 mb-6">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-white dark:bg-gray-800 p-4 rounded shadow">
          <Skeleton className="h-4 w-24 mb-2" />
          <Skeleton className="h-8 w-16 mb-2" />
          <Skeleton className="h-3 w-32" />
        </div>
      ))}
    </div>
    <div className="grid md:grid-cols-2 gap-6">
      {[1, 2].map((i) => (
        <div key={i} className="bg-white dark:bg-gray-800 p-4 rounded shadow h-64">
          <Skeleton className="h-5 w-32 mb-4" />
          <Skeleton className="h-40 w-full" />
        </div>
      ))}
    </div>
  </div>
);


const DEFAULT_LOGO =
  "sandbox:/mnt/data/09bdc030-fafc-49e3-aa81-a1333a2b4d77.png";


export default function RepoAnalytics() {
  const { username: routeUsername, repoName } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();


  // Theme context for dark mode support
  const { darkMode, toggleDarkMode } = useTheme();
  const theme = darkMode ? 'dark' : 'light';


  // token and user info (populated by your OAuth flow & stored in localStorage)
  const token = state?.token || localStorage.getItem("github_token");
  const githubUserRaw = localStorage.getItem("github_user");
  const github_user = githubUserRaw ? JSON.parse(githubUserRaw) : null;
  const username =
    routeUsername ||
    github_user?.login ||
    localStorage.getItem("github_username");


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


  // NEW: Search and filter states
  const [commitSearch, setCommitSearch] = useState("");
  const [prSearch, setPrSearch] = useState("");
  const [branchSearch, setBranchSearch] = useState("");


  // NEW: Pagination states
  const [commitsPage, setCommitsPage] = useState(1);
  const [prsPage, setPrsPage] = useState(1);
  const [contributorsPage, setContributorsPage] = useState(1);
  const [totalCommitsPages, setTotalCommitsPages] = useState(1);
  const [totalPrsPages, setTotalPrsPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);


  // NEW: Issue metrics
  const [issueMetrics, setIssueMetrics] = useState({
    open: 0,
    closed: 0,
    avgTimeToClose: 0,
    total: 0
  });


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


  const [selectedCommitSha, setSelectedCommitSha] = useState(null);


  // NEW: Loading state
  const [isLoading, setIsLoading] = useState(true);

  // Groq AI API state
  // Get API key from env or localStorage (env takes priority)
  const [groqApiKey, setGroqApiKey] = useState(
    process.env.REACT_APP_GROQ_API_KEY || localStorage.getItem("groq_api_key") || ""
  );
  const [groqModel, setGroqModel] = useState("llama-3.1-8b-instant");


  // headers memoized
  const headers = useMemo(
    () => ({ Authorization: token ? `token ${token}` : undefined }),
    [token]
  );


  // NEW: Filtered data with useMemo for performance
  const filteredCommits = useMemo(() => {
    if (!commitSearch) return recentCommits;
    return recentCommits.filter(c =>
      c.commit.message.toLowerCase().includes(commitSearch.toLowerCase()) ||
      c.sha.toLowerCase().includes(commitSearch.toLowerCase()) ||
      (c.commit.author?.name || "").toLowerCase().includes(commitSearch.toLowerCase())
    );
  }, [recentCommits, commitSearch]);


  const filteredPRs = useMemo(() => {
    if (!prSearch) return prs;
    return prs.filter(p =>
      p.title.toLowerCase().includes(prSearch.toLowerCase()) ||
      p.user.login.toLowerCase().includes(prSearch.toLowerCase()) ||
      p.number.toString().includes(prSearch)
    );
  }, [prs, prSearch]);


  const filteredBranches = useMemo(() => {
    if (!branchSearch) return branchActivity;
    return branchActivity.filter(b =>
      b.name.toLowerCase().includes(branchSearch.toLowerCase())
    );
  }, [branchActivity, branchSearch]);


  // NEW: Memoized PR aggregates
  const prAgg = useMemo(() => {
    const open = prs.filter((p) => p.state === "open").length;
    const closed = prs.filter((p) => p.state === "closed").length;
    const merged = prs.filter((p) => p.merged_at).length;
    return { open, closed, merged, total: prs.length };
  }, [prs]);


  // NEW: CSV Export handlers
  const handleExportCommits = useCallback(() => {
    const exportData = filteredCommits.map(c => ({
      sha: c.sha,
      message: c.commit.message.split('\n')[0],
      author: c.commit.author?.name || c.commit.committer?.name,
      date: new Date(c.commit.author?.date || c.commit.committer?.date).toLocaleString(),
      url: `${repoInfo.html_url}/commit/${c.sha}`
    }));
    exportCommitsToCSV(exportData, `${repoName}-commits.csv`);
  }, [filteredCommits, repoInfo, repoName]);


  const handleExportPRs = useCallback(() => {
    const exportData = filteredPRs.map(p => ({
      number: p.number,
      title: p.title,
      state: p.state,
      author: p.user.login,
      created_at: new Date(p.created_at).toLocaleString(),
      merged_at: p.merged_at ? new Date(p.merged_at).toLocaleString() : 'N/A',
      url: p.html_url
    }));
    exportPRsToCSV(exportData, `${repoName}-pull-requests.csv`);
  }, [filteredPRs, repoName]);


  const handleExportBranches = useCallback(() => {
    const exportData = filteredBranches.map(b => ({
      name: b.name,
      recent_commits: b.commits,
      health: branchHealth[b.name] ?? 'N/A',
      url: `${repoInfo.html_url}/tree/${b.name}`
    }));
    exportBranchesToCSV(exportData, `${repoName}-branches.csv`);
  }, [filteredBranches, branchHealth, repoInfo, repoName]);


  const handleExportContributors = useCallback(() => {
    const exportData = contributors.map(c => ({
      login: c.login,
      contributions: c.contributions,
      avatar_url: c.avatar_url
    }));
    exportContributorsToCSV(exportData, `${repoName}-contributors.csv`);
  }, [contributors, repoName]);


  // NEW: Pagination fetch functions
  const fetchMoreCommits = useCallback(async () => {
    if (loadingMore || commitsPage >= totalCommitsPages) return;
    setLoadingMore(true);
    try {
      const nextPage = commitsPage + 1;
      const res = await axios.get(
        `https://api.github.com/repos/${username}/${repoName}/commits?per_page=50&page=${nextPage}`,
        { headers }
      );
      const newCommits = res.data || [];
      setRecentCommits(prev => [...prev, ...newCommits]);
      setCommitsPage(nextPage);
      setTotalCommitsPages(Math.ceil(200 / 50)); // GitHub API max 200 for unauth
    } catch (err) {
      console.error("fetchMoreCommits error:", err);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, commitsPage, totalCommitsPages, username, repoName, headers]);


  const fetchMorePRs = useCallback(async () => {
    if (loadingMore || prsPage >= totalPrsPages) return;
    setLoadingMore(true);
    try {
      const nextPage = prsPage + 1;
      const res = await axios.get(
        `https://api.github.com/repos/${username}/${repoName}/pulls?per_page=50&page=${nextPage}&state=all`,
        { headers }
      );
      const newPRs = res.data || [];
      setPRs(prev => [...prev, ...newPRs]);
      setPrsPage(nextPage);
      setTotalPrsPages(Math.ceil(200 / 50));
    } catch (err) {
      console.error("fetchMorePRs error:", err);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, prsPage, totalPrsPages, username, repoName, headers]);


  // ----------------------------------------
  // 1) Lifecycle - load repository analytics
  // ----------------------------------------
  useEffect(() => {
    const fetchData = async () => {
      if (!token || !username || !repoName) {
        setError(
          "Authentication or repo info missing. Please sign in and select a repo."
        );
        setIsLoading(false);
        return;
      }


      setIsLoading(true);
      setError("");


      try {
        // repository core info
        const repoRes = await axios.get(
          `https://api.github.com/repos/${username}/${repoName}`,
          { headers }
        );
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
          axios.get(
            `https://api.github.com/repos/${username}/${repoName}/commits?per_page=200`,
            { headers }
          ),
          axios.get(
            `https://api.github.com/repos/${username}/${repoName}/issues?per_page=100&state=all`,
            { headers }
          ),
          axios.get(
            `https://api.github.com/repos/${username}/${repoName}/pulls?per_page=100&state=all`,
            { headers }
          ),
          axios.get(
            `https://api.github.com/repos/${username}/${repoName}/contributors?per_page=100`,
            { headers }
          ),
          axios.get(
            `https://api.github.com/repos/${username}/${repoName}/languages`,
            { headers }
          ),
          axios.get(
            `https://api.github.com/repos/${username}/${repoName}/branches?per_page=200`,
            { headers }
          ),
          axios.get(
            `https://api.github.com/repos/${username}/${repoName}/pulls?per_page=100&state=all`,
            { headers }
          ),
          // license may 404 if none
          axios
            .get(
              `https://api.github.com/repos/${username}/${repoName}/license`,
              { headers }
            )
            .catch(() => ({ data: null })),
        ]);


        const commits = commitsRes.data || [];
        const issues = issuesRes.data || [];
        const pulls = pullsRes.data || [];


        // NEW: Calculate issue metrics
        const openIssues = issues.filter(i => !i.pull_request && i.state === 'open');
        const closedIssues = issues.filter(i => !i.pull_request && i.state === 'closed');
        
        // Calculate average time to close (for closed issues)
        let totalTime = 0;
        let closedWithTime = 0;
        closedIssues.forEach(issue => {
          if (issue.closed_at && issue.created_at) {
            const created = new Date(issue.created_at);
            const closed = new Date(issue.closed_at);
            totalTime += (closed - created) / (1000 * 60 * 60 * 24); // days
            closedWithTime++;
          }
        });
        
        setIssueMetrics({
          open: openIssues.length,
          closed: closedIssues.length,
          avgTimeToClose: closedWithTime > 0 ? (totalTime / closedWithTime).toFixed(1) : 0,
          total: issues.filter(i => !i.pull_request).length
        });


        setAnalytics({
          commits: commits.length,
          issues: issues.filter(i => !i.pull_request).length,
          pulls: pulls.length,
        });


        setContributors(contributorsRes.data || []);
        setLanguages(
          Object.entries(langRes.data || {}).map(([name, value]) => ({
            name,
            value,
          }))
        );
        setCommitsData(
          (commits || []).slice(0, 60).map((c, i) => ({
            name: `#${i + 1}`,
            date: new Date(
              c.commit.author?.date || c.commit.committer?.date
            ).toLocaleDateString(),
          }))
        );
        setRecentCommits((commits || []).slice(0, 40));
        setBranches(branchesRes.data || []);
        setPRs(pulls);
        setLicenseInfo(licenseRes?.data || null);


        // compute heatmap & churn & top files
        computeHeatmap(username, repoName);
        computeCodeChurnFromCommits(commits);
        computeBranchActivity(username, repoName);
        detectDependencyWarnings(username, repoName);


        setIsLoading(false);
      } catch (err) {
        console.error("fetchData error:", err);
        setError(
          "Failed to fetch repository analytics. Check token scopes and network."
        );
        setIsLoading(false);
      }
    };


    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username, repoName, token]);


  // NEW: Retry function for error state
  const handleRetry = useCallback(() => {
    // Reset pagination states
    setCommitsPage(1);
    setPrsPage(1);
    setContributorsPage(1);
    setTotalCommitsPages(1);
    setTotalPrsPages(1);
    // Trigger refetch by clearing cache and re-running effect
    setIsLoading(true);
    setError("");
    // Re-trigger the effect
    const event = new Event('visibilitychange');
    document.dispatchEvent(event);
  }, []);


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
      const res = await axios.get(
        `https://api.github.com/repos/${owner}/${repo}/commits?since=${sinceISO}&per_page=200`,
        { headers }
      );
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
            const r = await axios.get(
              `https://api.github.com/repos/${username}/${repoName}/commits/${c.sha}`,
              { headers }
            );
            const files = r.data.files || [];
            files.forEach((f) => {
              if (!fileMap[f.filename])
                fileMap[f.filename] = {
                  added: 0,
                  deleted: 0,
                  changes: 0,
                  edits: 0,
                };
              fileMap[f.filename].added += f.additions || 0;
              fileMap[f.filename].deleted += f.deletions || 0;
              fileMap[f.filename].changes += f.changes || 0;
              fileMap[f.filename].edits += 1;
            });
          } catch (e) {
            // skip commit error
          }
          return true;
        })
      );


      const filesArr = Object.entries(fileMap).map(([filename, stats]) => ({
        filename,
        ...stats,
      }));
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
      const branchRes = await axios.get(
        `https://api.github.com/repos/${owner}/${repo}/branches?per_page=200`,
        { headers }
      );
      const branches = branchRes.data || [];
      // for each branch, fetch recent commits count (cheap heuristic)
      const activityPromises = branches.map(async (b) => {
        try {
          const commitsR = await axios.get(
            `https://api.github.com/repos/${owner}/${repo}/commits?sha=${b.name}&per_page=30`,
            { headers }
          );
          const commitsCount = commitsR.data?.length || 0;
          return {
            name: b.name,
            commits: commitsCount,
            lastCommitSha: b.commit?.sha,
          };
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


  const regenerateSummary = async () => {
    setAiSummary("⏳ Regenerating summary...");
    
    if (!groqApiKey) {
      setAiSummary("❌ Groq API key not configured. Please set REACT_APP_GROQ_API_KEY in .env file.");
      return;
    }

    try {
      const diffString = selectedCommitFiles
        .map(
          (f) => `--- a/${f.filename}\n+++ b/${f.filename}\n${f.patch || "(binary file or no changes)"}\n`
        )
        .join("\n\n");

      const commitInfo = `
Commit: ${selectedCommit.sha?.substring(0, 7)}
Author: ${selectedCommit.commit?.author?.name}
Date: ${new Date(selectedCommit.commit?.author?.date).toLocaleString()}
Message: ${selectedCommit.commit?.message}

Changes:
${diffString}
`;

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${groqApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: groqModel,
          messages: [
            {
              role: "system",
              content: `You are an expert code reviewer. Analyze commits and provide clear, concise summaries.
Format your response with:
- 🎯 **Summary**: Brief overview of what changed
- 📝 **Files Changed**: List of modified files
- ⚡ **Key Changes**: Main modifications
- 🐛 **Potential Issues**: Any bugs, security concerns, or code smells
- 💡 **Suggestions**: Optional improvement recommendations`
            },
            {
              role: "user",
              content: `Analyze this commit and provide a fresh summary:\n\n${commitInfo}`
            }
          ],
          temperature: 0.4,
          max_tokens: 500
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Groq API error');
      }

      const data = await response.json();
      setAiSummary(data.choices?.[0]?.message?.content || "No summary generated.");
    } catch (err) {
      console.error("regenerateSummary:", err);
      setAiSummary(`❌ Failed to regenerate: ${err.message}`);
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
            const r = await axios.get(
              `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(
                path
              )}`,
              { headers }
            );
            if (r.data && r.data.content) {
              findings.push({
                path,
                hint: "Found manifest. Consider running dependency scan.",
              });
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
      const r = await axios.get(
        `https://api.github.com/repos/${username}/${repoName}/commits/${sha}`,
        { headers }
      );
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
      } else if (
        !inHunk &&
        (line.startsWith("---") || line.startsWith("+++"))
      ) {
        // header; include as meta
        if (!current.length) current.push({ type: "hunk", content: line });
      } else if (inHunk) {
        if (line.startsWith("+"))
          current.push({ type: "add", content: line.slice(1) });
        else if (line.startsWith("-"))
          current.push({ type: "del", content: line.slice(1) });
        else
          current.push({
            type: "context",
            content: line.startsWith(" ") ? line.slice(1) : line,
          });
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
      if (ln.type === "hunk")
        rows.push({ left: ln.content, right: ln.content, meta: true });
      else if (ln.type === "context")
        rows.push({ left: ln.content, right: ln.content, type: "context" });
      else if (ln.type === "del")
        rows.push({ left: ln.content, right: "", type: "del" });
      else if (ln.type === "add")
        rows.push({ left: "", right: ln.content, type: "add" });
    });


    return rows.map((r, i) => (
      <tr key={`${fileKey}-r-${i}`} className={r.meta ? "bg-gray-100" : ""}>
        <td
          className={`text-xs px-2 py-1 align-top ${
            r.type === "del" ? "bg-red-50" : ""
          }`}
        >
          {r.left}
        </td>
        <td
          className={`text-xs px-2 py-1 align-top ${
            r.type === "add" ? "bg-green-50" : ""
          }`}
        >
          {r.right}
        </td>
      </tr>
    ));
  }


  // ----------------------------------------
  // compareBranches using GitHub compare API
  // ----------------------------------------
  const compareBranches = async () => {
    if (!compareBase || !compareHead)
      return alert("Select base and head branches to compare.");
    setLoadingCompare(true);
    setCompareResult(null);
    try {
      const res = await axios.get(
        `https://api.github.com/repos/${username}/${repoName}/compare/${compareBase}...${compareHead}`,
        { headers }
      );
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
      const res = await axios.get(
        `https://api.github.com/repos/${username}/${repoName}/commits?author=${contributorLogin}&since=${sinceISO}&per_page=200`,
        { headers }
      );
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
  // requestAiSummary - calls Groq API for commit summary
  // ----------------------------------------
  const requestAiSummary = async () => {
    if (!selectedCommit) return alert("Select a commit first.");
    
    if (!groqApiKey) {
      setAiSummary("❌ Groq API key not configured. Please set REACT_APP_GROQ_API_KEY in .env file.");
      return;
    }
    
    setLoadingAi(true);
    setAiSummary("");
    try {
      const diffString = selectedCommitFiles
        .map(
          (f) => `--- a/${f.filename}\n+++ b/${f.filename}\n${f.patch || "(binary file or no changes)"}\n`
        )
        .join("\n\n");

      const commitInfo = `
Commit: ${selectedCommit.sha?.substring(0, 7)}
Author: ${selectedCommit.commit?.author?.name}
Date: ${new Date(selectedCommit.commit?.author?.date).toLocaleString()}
Message: ${selectedCommit.commit?.message}

Changes:
${diffString}
`;

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${groqApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: groqModel,
          messages: [
            {
              role: "system",
              content: `You are an expert code reviewer. Analyze commits and provide clear, concise summaries.
Format your response with:
- 🎯 **Summary**: Brief overview of what changed
- 📝 **Files Changed**: List of modified files
- ⚡ **Key Changes**: Main modifications
- 🐛 **Potential Issues**: Any bugs, security concerns, or code smells
- 💡 **Suggestions**: Optional improvement recommendations`
            },
            {
              role: "user",
              content: `Analyze this commit and provide a summary:\n\n${commitInfo}`
            }
          ],
          temperature: 0.3,
          max_tokens: 500
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Groq API error');
      }

      const data = await response.json();
      setAiSummary(data.choices?.[0]?.message?.content || "No summary generated.");
    } catch (err) {
      console.error("requestAiSummary:", err);
      if (err.message.includes('Invalid API Key') || err.message.includes('authentication')) {
        setAiSummary("❌ Invalid API Key. Please update your Groq API key in settings.");
        localStorage.removeItem("groq_api_key");
        setGroqApiKey("");
      } else {
        setAiSummary(`❌ AI summary failed: ${err.message}`);
      }
    } finally {
      setLoadingAi(false);
    }
  };

  // Save Groq API key
  const saveGroqApiKey = (key) => {
    setGroqApiKey(key);
    localStorage.setItem("groq_api_key", key);
  };


  // ----------------------------------------
  // Secret leakage scan (simple heuristic over parsed patches)
  // ----------------------------------------
  const scanForSecrets = (files = []) => {
    const findings = [];
    const secretRegex =
      /(api_key|apiKey|SECRET|secret|password|passwd|token|ghp_[A-Za-z0-9]|github_pat_[A-Za-z0-9_\-]+)/i;
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
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "pt",
        format: "a4",
      });
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
  const formatAddDel = (file) =>
    `${file.additions || 0} added • ${file.deletions || 0} removed`;


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
    for (let r = 0; r < Math.ceil(days.length / 7); r++)
      rows.push(days.slice(r * 7, r * 7 + 7));
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
                style={{
                  backgroundColor: `rgba(34,197,94, ${cell.count / max})`,
                }}
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


  // NEW: Show loading skeleton
  if (isLoading || (!repoInfo && !error)) {
    return <LoadingSkeleton />;
  }


  // NEW: Improved error state with retry
  if (error) {
    return (
      <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen flex items-center justify-center">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl max-w-md w-full">
          <div className="text-center">
            <div className="text-5xl mb-4">⚠️</div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Oops! Something went wrong
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
            <div className="flex flex-col gap-3">
              <button
                onClick={handleRetry}
                className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition flex items-center justify-center gap-2"
              >
                🔄 Try Again
              </button>
              <button
                onClick={() => navigate("/github/repolist")}
                className="w-full px-4 py-3 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition"
              >
                ← Back to Repo List
              </button>
            </div>
          </div>
        </div>
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
  const COLORS = [
    "#3b82f6",
    "#10b981",
    "#f59e0b",
    "#ef4444",
    "#8b5cf6",
    "#ff6b6b",
  ];


  // NEW: Dark mode card class
  const cardClass = "bg-white dark:bg-gray-800 p-4 rounded-xl shadow-md hover:shadow-lg transition-shadow";
  const titleClass = "font-semibold text-gray-800 dark:text-white";
  const textClass = "text-gray-600 dark:text-gray-300";


  return (
    <div ref={reportRef} className="p-4 md:p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
              {repoInfo.full_name}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">{repoInfo.description}</p>
            <div className="flex flex-wrap gap-2 mt-3">
              <a
                href={repoInfo.html_url}
                target="_blank"
                rel="noreferrer"
                className="text-sm px-3 py-1.5 bg-slate-800 dark:bg-slate-700 text-white rounded-lg hover:bg-slate-700 transition"
              >
                🔗 Open on GitHub
              </a>
              <button
                onClick={() => downloadMonthlyPDF(true)}
                className="text-sm px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition"
              >
                📄 Export PDF
              </button>
              <button
                onClick={handleExportCommits}
                className="text-sm px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg transition"
              >
                📊 Export CSV
              </button>
            </div>
          </div>


          <div className="flex items-center gap-4">
            <img src={DEFAULT_LOGO} alt="logo" className="w-12 h-12 rounded-lg hidden md:block" />
            <div className="text-right">
              <div className="text-xs text-gray-500 dark:text-gray-400">Connected as</div>
              <div className="text-sm font-medium text-gray-800 dark:text-white">
                {github_user?.login || username}
              </div>
            </div>
          </div>
        </div>


        {/* Top overview - Dark mode cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 mb-6">
          <div className={`${cardClass} border-l-4 border-blue-500`}>
            <div className={`text-sm ${textClass}`}>📝 Commits</div>
            <div className="text-2xl md:text-3xl font-bold text-blue-600 dark:text-blue-400">
              {analytics.commits.toLocaleString()}
            </div>
            <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Last 200 commits
            </div>
          </div>


          <div className={`${cardClass} border-l-4 border-yellow-500`}>
            <div className={`text-sm ${textClass}`}>📋 Open Issues</div>
            <div className="text-2xl md:text-3xl font-bold text-yellow-600 dark:text-yellow-400">
              {issueMetrics.open}
            </div>
            <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              {issueMetrics.avgTimeToClose > 0 ? `Avg close: ${issueMetrics.avgTimeToClose}d` : 'No closed issues'}
            </div>
          </div>


          <div className={`${cardClass} border-l-4 border-purple-500 col-span-2 md:col-span-1`}>
            <div className={`text-sm ${textClass}`}>🔀 Pull Requests</div>
            <div className="text-2xl md:text-3xl font-bold text-purple-600 dark:text-purple-400">
              {prAgg.total}
            </div>
            <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              {prAgg.merged} merged • {prAgg.open} open
            </div>
          </div>
        </div>


        {/* PR Status Cards - NEW */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className={`${cardClass} text-center`}>
            <div className="text-green-600 dark:text-green-400 text-2xl">✓</div>
            <div className="text-xl font-bold text-green-600 dark:text-green-400">{prAgg.merged}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Merged</div>
          </div>
          <div className={`${cardClass} text-center`}>
            <div className="text-blue-600 dark:text-blue-400 text-2xl">○</div>
            <div className="text-xl font-bold text-blue-600 dark:text-blue-400">{prAgg.open}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Open</div>
          </div>
          <div className={`${cardClass} text-center`}>
            <div className="text-red-600 dark:text-red-400 text-2xl">✕</div>
            <div className="text-xl font-bold text-red-600 dark:text-red-400">{prAgg.closed}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Closed</div>
          </div>
        </div>


        {/* charts */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <div className={`${cardClass}`}>
            <h3 className={`${titleClass} mb-2`}>📊 Overview</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={overviewData}>
                <XAxis dataKey="name" tick={{ fill: theme === 'dark' ? '#9ca3af' : '#6b7280' }} />
                <YAxis tick={{ fill: theme === 'dark' ? '#9ca3af' : '#6b7280' }} />
                <Tooltip contentStyle={{ backgroundColor: theme === 'dark' ? '#1f2937' : '#fff', border: 'none' }} />
                <Bar dataKey="value" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>


          <div className={`${cardClass}`}>
            <h3 className={`${titleClass} mb-2`}>📈 Commit Frequency (Area Chart)</h3>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={commitsData}>
                <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#374151' : '#e5e7eb'} />
                <XAxis dataKey="name" tick={{ fill: theme === 'dark' ? '#9ca3af' : '#6b7280', fontSize: 10 }} />
                <YAxis tick={{ fill: theme === 'dark' ? '#9ca3af' : '#6b7280' }} />
                <Tooltip contentStyle={{ backgroundColor: theme === 'dark' ? '#1f2937' : '#fff', border: 'none' }} />
                <Area type="monotone" dataKey="date" stroke="#10b981" fill="#10b981" fillOpacity={0.3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>


        {/* languages & contributors */}
        <div className="grid md:grid-cols-3 gap-6 mb-6">
          <div className={`${cardClass}`}>
            <h4 className={`${titleClass} mb-2`}>💻 Languages</h4>
            {languages.length ? (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie
                      data={languages}
                      dataKey="value"
                      nameKey="name"
                      outerRadius={60}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {languages.map((entry, idx) => (
                        <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: theme === 'dark' ? '#1f2937' : '#fff', border: 'none' }} />
                  </PieChart>
                </ResponsiveContainer>
              </>
            ) : (
              <EmptyState message="No language data" icon="💻" />
            )}
          </div>


          <div className={`${cardClass}`}>
            <div className="flex justify-between items-center mb-3">
              <h4 className={`${titleClass}`}>👥 Top Contributors</h4>
              <button
                onClick={handleExportContributors}
                className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded hover:bg-green-200 dark:hover:bg-green-800 transition"
                title="Export to CSV"
              >
                📥 CSV
              </button>
            </div>
            {contributors.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {contributors.slice(0, 6).map((c) => (
                  <button
                    key={c.id}
                    onClick={() => buildContributorHeatmap(c.login)}
                    className="flex flex-col items-center bg-gray-50 dark:bg-gray-700 p-2 rounded-lg hover:shadow-md transition w-24"
                  >
                    <img
                      src={c.avatar_url}
                      alt={c.login}
                      className="w-10 h-10 rounded-full mb-1"
                    />
                    <div className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate w-full text-center">{c.login}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{c.contributions} commits</div>
                  </button>
                ))}
              </div>
            ) : (
              <EmptyState message="No contributors found" icon="👥" />
            )}
          </div>


          <div className={`${cardClass}`}>
            <h4 className={`${titleClass} mb-2`}>🏥 Repo Health</h4>
            <div className={`text-sm mb-2 ${textClass}`}>
              License: <b className="text-blue-600 dark:text-blue-400">{licenseInfo?.license?.name || "Unknown"}</b>
            </div>
            {dependencyWarnings.length ? (
              <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 p-2 rounded">
                ⚠️ Dependency issues detected
              </div>
            ) : (
              <div className="text-xs text-gray-500 dark:text-gray-400">
                ✅ No dependency issues
              </div>
            )}
            <div className="mt-3">
              <a
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                href={`${repoInfo.html_url}/security`}
                target="_blank"
                rel="noreferrer"
              >
                🔒 Security / Dependabot →
              </a>
            </div>
          </div>
        </div>


        {/* NEW: Recent Commits with Search */}
        <div className="grid md:grid-cols-3 gap-6 mb-6">
          <div className={`${cardClass} md:col-span-2`}>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-3 gap-2">
              <h4 className={`${titleClass}`}>📝 Recent Commits</h4>
              <div className="flex flex-wrap gap-2">
                {/* Search Input */}
                <input
                  type="text"
                  placeholder="🔍 Search commits..."
                  value={commitSearch}
                  onChange={(e) => setCommitSearch(e.target.value)}
                  className="px-3 py-1 text-sm border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white w-40"
                />
                <button
                  onClick={handleExportCommits}
                  className="px-2 py-1 text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded hover:bg-green-200 dark:hover:bg-green-800 transition"
                >
                  📥 CSV
                </button>
                <button
                  onClick={() => setRecentCommits((r) => r.slice())}
                  className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                >
                  🔄
                </button>
              </div>
            </div>


            <div className="space-y-2 max-h-80 overflow-auto">
              {filteredCommits.length > 0 ? (
                filteredCommits.map((c) => (
                  <div
                    key={c.sha}
                    className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-800 dark:text-gray-200 truncate">
                        {c.commit.message.split("\n")[0]}
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs text-gray-500 dark:text-gray-400 mt-1">
                        <span>💻 {c.sha.slice(0, 7)}</span>
                        <span>👤 {c.commit.author?.name || 'Unknown'}</span>
                        <span>📅 {new Date(c.commit.author?.date || c.commit.committer?.date).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => fetchCommitDetails(c.sha)}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition"
                      >
                        View
                      </button>
                      <a
                        href={`${repoInfo.html_url}/commit/${c.sha}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                      >
                        GitHub
                      </a>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState message={commitSearch ? "No commits match your search" : "No commits found"} icon="📝" />
              )}
            </div>


            {/* Pagination */}
            {commitsPage < totalCommitsPages && (
              <div className="mt-4 text-center">
                <button
                  onClick={fetchMoreCommits}
                  disabled={loadingMore}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition"
                >
                  {loadingMore ? 'Loading...' : 'Load More Commits'}
                </button>
              </div>
            )}
          </div>


          {/* Branches Section - Now alongside commits */}
          <div className={`${cardClass}`}>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-3 gap-2">
              <h4 className={`${titleClass}`}>🌿 Branches ({filteredBranches.length})</h4>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="🔍 Search..."
                  value={branchSearch}
                  onChange={(e) => setBranchSearch(e.target.value)}
                  className="px-2 py-1 text-xs border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white w-28"
                />
                <button
                  onClick={handleExportBranches}
                  className="px-2 py-1 text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded hover:bg-green-200 dark:hover:bg-green-800 transition"
                >
                  📥 CSV
                </button>
              </div>
            </div>
            <div className="space-y-2 max-h-80 overflow-auto">
              {filteredBranches.length > 0 ? (
                filteredBranches.map((b) => (
                  <div
                    key={b.name}
                    className="flex justify-between items-center p-2 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
                  >
                    <div>
                      <div className="font-medium text-gray-800 dark:text-gray-200">{b.name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {b.commits} recent commits
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-xs ${textClass}`}>Health</div>
                      <div className={`text-sm font-semibold ${
                        (branchHealth[b.name] ?? 0) >= 70 ? 'text-green-600' :
                        (branchHealth[b.name] ?? 0) >= 40 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {branchHealth[b.name] ?? "—"}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState message={branchSearch ? "No branches match" : "No branches found"} icon="🌿" />
              )}
            </div>
          </div>
        </div>


        {/* NEW: Pull Requests Section with Search */}
        <div className={`${cardClass} mb-6`}>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-2">
            <h4 className={`${titleClass}`}>🔀 Pull Requests ({filteredPRs.length})</h4>
            <div className="flex flex-wrap gap-2">
              <input
                type="text"
                placeholder="🔍 Search PRs..."
                value={prSearch}
                onChange={(e) => setPrSearch(e.target.value)}
                className="px-3 py-1 text-sm border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white w-40"
              />
              <button
                onClick={handleExportPRs}
                className="px-2 py-1 text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded hover:bg-green-200 dark:hover:bg-green-800 transition"
              >
                📥 CSV
              </button>
            </div>
          </div>


          {/* PR Status Badges */}
          <div className="flex flex-wrap gap-3 mb-4">
            <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full text-sm">
              Open: {prAgg.open}
            </span>
            <span className="px-3 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-full text-sm">
              Merged: {prAgg.merged}
            </span>
            <span className="px-3 py-1 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded-full text-sm">
              Closed: {prAgg.closed}
            </span>
          </div>


          <div className="space-y-2 max-h-80 overflow-auto">
            {filteredPRs.length > 0 ? (
              filteredPRs.slice(0, 20).map((p) => (
                <div
                  key={p.id}
                  className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 text-xs rounded ${
                          p.state === 'open' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' :
                          p.merged_at ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300' :
                          'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                        }`}>
                          {p.merged_at ? 'Merged' : p.state}
                        </span>
                        <a
                          href={p.html_url}
                          target="_blank"
                          rel="noreferrer"
                          className="font-medium text-blue-600 dark:text-blue-400 hover:underline truncate"
                        >
                          #{p.number} {p.title}
                        </a>
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs text-gray-500 dark:text-gray-400 mt-1">
                        <span>👤 {p.user?.login}</span>
                        <span>📅 {new Date(p.created_at).toLocaleDateString()}</span>
                        {p.merged_at && <span>✅ {new Date(p.merged_at).toLocaleDateString()}</span>}
                      </div>
                    </div>
                    <a
                      href={p.html_url}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition shrink-0"
                    >
                      View
                    </a>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState message={prSearch ? "No PRs match your search" : "No pull requests found"} icon="🔀" />
            )}
          </div>
        </div>


        {/* Branch compare & PR analytics + top files */}
        <div className="grid md:grid-cols-3 gap-6 mb-6">
          <div className={`${cardClass}`}>
            <h4 className={`${titleClass} mb-3`}>⚖️ Compare Branches</h4>
            <select
              value={compareBase}
              onChange={(e) => setCompareBase(e.target.value)}
              className="border border-gray-300 dark:border-gray-600 p-2 rounded w-full mb-2 dark:bg-gray-700 dark:text-white"
            >
              <option value="">Select base</option>
              {branches.map((b) => (
                <option key={b.name} value={b.name}>
                  {b.name}
                </option>
              ))}
            </select>
            <select
              value={compareHead}
              onChange={(e) => setCompareHead(e.target.value)}
              className="border border-gray-300 dark:border-gray-600 p-2 rounded w-full mb-2 dark:bg-gray-700 dark:text-white"
            >
              <option value="">Select head</option>
              {branches.map((b) => (
                <option key={b.name} value={b.name}>
                  {b.name}
                </option>
              ))}
            </select>
            <button
              onClick={compareBranches}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg transition"
            >
              {loadingCompare ? "⏳ Comparing..." : "⚖️ Compare"}
            </button>


            {compareResult && (
              <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm">
                <div className={`flex justify-between ${textClass}`}>
                  <span>Commits ahead:</span>
                  <b className="text-blue-600 dark:text-blue-400">
                    {compareResult.status === "identical" ? 0 : compareResult?.commits?.length || 0}
                  </b>
                </div>
                <div className={`flex justify-between ${textClass}`}>
                  <span>Files changed:</span>
                  <b className="text-green-600 dark:text-green-400">{compareResult?.files?.length || 0}</b>
                </div>
                <div className={`flex justify-between ${textClass}`}>
                  <span>Total additions:</span>
                  <b className="text-purple-600 dark:text-purple-400">{compareResult?.total_commits || "-"}</b>
                </div>
              </div>
            )}
          </div>


          {/* Enhanced PR Analytics */}
          <div className={`${cardClass}`}>
            <h4 className={`${titleClass} mb-3`}>📈 PR Analytics</h4>
            <div className="space-y-2 mb-4">
              <div className={`flex justify-between ${textClass}`}>
                <span>Total PRs</span>
                <b className="text-gray-800 dark:text-white">{prAgg.total}</b>
              </div>
              <div className="flex justify-between">
                <span className="text-green-600">Open</span>
                <b className="text-green-600 dark:text-green-400">{prAgg.open}</b>
              </div>
              <div className="flex justify-between">
                <span className="text-purple-600">Merged</span>
                <b className="text-purple-600 dark:text-purple-400">{prAgg.merged}</b>
              </div>
              <div className="flex justify-between">
                <span className="text-red-600">Closed</span>
                <b className="text-red-600 dark:text-red-400">{prAgg.closed}</b>
              </div>
            </div>


            {/* Merge Rate */}
            <div className="mt-4">
              <div className={`text-xs ${textClass} mb-1`}>Merge Rate</div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full transition-all"
                  style={{ width: `${prAgg.total > 0 ? (prAgg.merged / prAgg.total) * 100 : 0}%` }}
                />
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {prAgg.total > 0 ? Math.round((prAgg.merged / prAgg.total) * 100) : 0}% merged
              </div>
            </div>


            <h5 className={`${titleClass} mt-4 mb-2`}>🏆 Top PR Creators</h5>
            <div className="space-y-1">
              {(() => {
                const byAuthor = {};
                prs.forEach((p) => {
                  const name = p.user?.login || "unknown";
                  byAuthor[name] = (byAuthor[name] || 0) + 1;
                });
                const authors = Object.entries(byAuthor)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 5);
                return authors.length ? (
                  authors.map(([a, c], i) => (
                    <div key={a} className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="text-xs">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : ''}</span>
                        <span className={`text-sm ${textClass}`}>{a}</span>
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400">{c} PRs</span>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-gray-500">No PR data</div>
                );
              })()}
            </div>
          </div>


          {/* Top Edited Files */}
          <div className={`${cardClass}`}>
            <h4 className={`${titleClass} mb-3`}>📁 Top Edited Files</h4>
            <div className="space-y-2 max-h-48 overflow-auto">
              {topFiles.length ? (
                topFiles.map((f, i) => (
                  <div
                    key={f.filename}
                    className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700/50 rounded"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-xs text-gray-500">{i + 1}</span>
                      <div className="text-sm truncate text-gray-800 dark:text-gray-200">{f.filename}</div>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                      {f.changes} changes
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState message="No file data" icon="📁" />
              )}
            </div>


            <h5 className={`${titleClass} mt-4 mb-2`}>⚠️ Top Risky Files</h5>
            <div className="space-y-2">
              {riskyFiles.length ? (
                riskyFiles.slice(0, 5).map((f, i) => (
                  <div
                    key={f.filename}
                    className="flex justify-between items-center p-2 bg-red-50 dark:bg-red-900/20 rounded"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-xs text-red-500">{i + 1}</span>
                      <div className="text-sm truncate text-red-700 dark:text-red-400">{f.filename}</div>
                    </div>
                    <span className="text-xs font-medium text-red-600 dark:text-red-400">
                      {Math.round(f.score)}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  ✅ No risky files detected
                </div>
              )}
            </div>
          </div>
        </div>


        {/* Contribution heatmap (and per-contributor) */}
        <div className="grid md:grid-cols-3 gap-6 mb-6">
          <div className={`${cardClass} md:col-span-2`}>
            <h4 className={`${titleClass} mb-3`}>🔥 Contribution Heatmap (90 days)</h4>
            <div className="dark:bg-gray-900 p-4 rounded-lg">
              {renderHeatmap(heatmapData)}
            </div>
          </div>


          <div className={`${cardClass}`}>
            <h4 className={`${titleClass} mb-3`}>👤 Contributor Heatmap</h4>
            <div className={`text-sm mb-2 ${textClass}`}>Select contributor:</div>
            <select
              value={selectedContributor || ""}
              onChange={(e) => buildContributorHeatmap(e.target.value)}
              className="border border-gray-300 dark:border-gray-600 p-2 rounded w-full dark:bg-gray-700 dark:text-white"
            >
              <option value="">Choose...</option>
              {contributors.map((c) => (
                <option key={c.login} value={c.login}>
                  {c.login} ({c.contributions} commits)
                </option>
              ))}
            </select>
            <div className="mt-4">
              {selectedContributor ? (
                <div className="dark:bg-gray-900 p-4 rounded-lg">
                  {renderHeatmap(contribHeatmap)}
                </div>
              ) : (
                <div className="text-sm text-gray-500 dark:text-gray-400 p-4 text-center">
                  Pick a contributor above to view their activity heatmap.
                </div>
              )}
            </div>
          </div>
        </div>


        {/* Diff & commit details */}
        {selectedCommit && (
          <div className={`${cardClass} mb-6`}>
            <div className="flex flex-col md:flex-row justify-between items-start gap-2 mb-4">
              <div>
                <h4 className={`${titleClass}`}>
                  📋 Commit Details: {selectedCommit.sha?.substring(0, 7)}
                </h4>
                <div className={`text-sm ${textClass}`}>
                  {selectedCommit.commit?.message}
                </div>
                <div className="text-xs text-gray-500">
                  By {selectedCommit.commit?.author?.name} on{" "}
                  {new Date(selectedCommit.commit?.author?.date).toLocaleString()}
                </div>
              </div>
              <div className="flex gap-2 items-center">
                <button
                  onClick={requestAiSummary}
                  className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded flex items-center gap-1"
                  disabled={loadingAi}
                >
                  {loadingAi ? (
                    <>
                      <span className="animate-spin">⚙️</span> Generating...
                    </>
                  ) : (
                    <>
                      🤖 AI Summary
                      {groqApiKey && <span className="text-xs bg-green-600 px-1 rounded">Groq</span>}
                      {!groqApiKey && <span className="text-xs bg-gray-600 px-1 rounded">Setup</span>}
                    </>
                  )}
                </button>
                <button
                  onClick={() => downloadMonthlyPDF(false)}
                  className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded"
                >
                  Export Commit PDF
                </button>
              </div>
            </div>


            <div className="mt-4 space-y-4">
              {selectedCommitFiles.map((file) => (
                <div key={file.filename} className="border rounded">
                  <div className="p-3 flex justify-between items-center bg-gray-50">
                    <div>
                      <div className="font-medium">{file.filename}</div>
                      <div className="text-xs text-gray-500">
                        {formatAddDel(file)}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          // show raw file in new tab if raw_url present
                          if (file.raw_url) window.open(file.raw_url, "_blank");
                        }}
                        className="px-2 py-1 border rounded text-sm"
                      >
                        Raw
                      </button>
                      {SyntaxHighlighter && (
                        <button
                          onClick={() => {
                            // toggle view could be implemented; here simply fetch and show in modal in future
                            alert(
                              "Inline viewer available if SyntaxHighlighter installed."
                            );
                          }}
                          className="px-2 py-1 border rounded text-sm"
                        >
                          View
                        </button>
                      )}
                    </div>
                  </div>


                  <div className="p-3 overflow-auto">
                    {commitDiffParsed[file.filename] &&
                    commitDiffParsed[file.filename].length > 0 ? (
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="bg-gray-100">
                            <th className="px-2 py-1 text-left w-1/2">
                              Original
                            </th>
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
                      <div className="text-sm text-gray-500">
                        No patch available (binary/large file)
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {aiSummary && (
              <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-md flex items-center justify-center z-[100] animate-fadeIn">
                <div className="bg-white dark:bg-gray-900 w-[92%] max-w-3xl rounded-2xl shadow-2xl p-6 animate-slideUp relative border border-white/20 dark:border-gray-700/40">
                  {/* Close Button */}
                  <button
                    onClick={() => setAiSummary(null)}
                    className="absolute top-4 right-4 text-gray-600 dark:text-gray-400 hover:text-red-500 transition text-xl"
                  >
                    ✕
                  </button>


                  {/* Header */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-2 h-10 rounded-full bg-blue-600"></div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                      🤖 AI-Powered Commit Analysis
                    </h2>
                  </div>


                  {/* Subtext */}
                  <p className="text-gray-600 dark:text-gray-300 mb-4 text-sm">
                    Here's a smart breakdown generated from the commit —
                    summarizing changes, intentions & impact.
                  </p>


                  {/* Summary Content */}
                  <div className="rounded-xl bg-gray-50 dark:bg-gray-800/60 p-4 prose dark:prose-invert max-h-[55vh] overflow-y-auto shadow-inner border border-gray-200 dark:border-gray-700">
                    <pre className="whitespace-pre-wrap text-[15px] leading-relaxed font-medium text-gray-800 dark:text-gray-200">
                      {aiSummary}
                    </pre>
                  </div>


                  {/* Actions */}
                  <div className="mt-6 flex flex-wrap justify-between items-center gap-3">
                    <div className="flex gap-3">
                      {/* Copy Button */}
                      <button
                        onClick={() => navigator.clipboard.writeText(aiSummary)}
                        className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition flex items-center gap-2"
                      >
                        📋 Copy
                      </button>


                      {/* Download as Markdown */}
                      <button
                        onClick={() => {
                          const blob = new Blob([aiSummary], {
                            type: "text/markdown",
                          });
                          const link = document.createElement("a");
                          link.href = URL.createObjectURL(blob);
                          link.download = "ai-summary.md";
                          link.click();
                        }}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition flex items-center gap-2"
                      >
                        ⬇️ Download MD
                      </button>
                    </div>


                    {/* Regenerate Button */}
                    <button
                      onClick={regenerateSummary}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition flex items-center gap-2"
                    >
                      🔄 Regenerate
                    </button>
                  </div>
                </div>
              </div>
            )}


            {/* Secret scan */}
            <div className="mt-4">
              <h5 className="font-medium mb-2">Secret Scan Results</h5>
              {(() => {
                const findings = scanForSecrets(selectedCommitFiles);
                return findings.length ? (
                  findings.map((f, i) => (
                    <div key={i} className="text-sm text-red-600">
                      {f.file} — {f.match}
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-gray-500">
                    No secrets detected by quick heuristic.
                  </div>
                );
              })()}
            </div>
          </div>
        )}


        {/* footer small report */}
        <div className="mt-6 text-xs text-gray-500 dark:text-gray-400 text-center">
          Generated by Project Mitra • {new Date().toLocaleString()}
        </div>
    </div>
  );
}
