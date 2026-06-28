/**
 * CSV Export Utility for GitHub Integration Dashboard
 */

export function convertToCSV(data, headers) {
  if (!data || data.length === 0) return "";
  
  const headerRow = headers.map(h => h.label).join(",");
  const rows = data.map(row => {
    return headers.map(h => {
      let value = row[h.key];
      if (value === null || value === undefined) value = "";
      if (typeof value === "object") value = JSON.stringify(value);
      // Escape quotes and wrap in quotes if contains comma, newline, or quote
      value = String(value).replace(/"/g, '""');
      if (value.includes(",") || value.includes("\n") || value.includes('"')) {
        value = `"${value}"`;
      }
      return value;
    }).join(",");
  });
  
  return [headerRow, ...rows].join("\n");
}

export function downloadCSV(csvContent, filename) {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Repository CSV export
export function exportReposToCSV(repos) {
  const headers = [
    { key: "name", label: "Repository Name" },
    { key: "full_name", label: "Full Name" },
    { key: "description", label: "Description" },
    { key: "language", label: "Language" },
    { key: "stargazers_count", label: "Stars" },
    { key: "forks_count", label: "Forks" },
    { key: "open_issues_count", label: "Open Issues" },
    { key: "watchers_count", label: "Watchers" },
    { key: "size", label: "Size (KB)" },
    { key: "private", label: "Private" },
    { key: "fork", label: "Fork" },
    { key: "created_at", label: "Created At" },
    { key: "updated_at", label: "Updated At" },
    { key: "pushed_at", label: "Last Pushed" },
    { key: "html_url", label: "URL" },
  ];
  
  const data = repos.map(repo => ({
    ...repo,
    private: repo.private ? "Yes" : "No",
    fork: repo.fork ? "Yes" : "No",
  }));
  
  const csv = convertToCSV(data, headers);
  downloadCSV(csv, `repositories_${new Date().toISOString().split("T")[0]}`);
}

// Commits CSV export
export function exportCommitsToCSV(commits, repoName = "commits") {
  const headers = [
    { key: "sha", label: "SHA" },
    { key: "commit.message", label: "Message" },
    { key: "commit.author.name", label: "Author" },
    { key: "commit.author.email", label: "Author Email" },
    { key: "commit.author.date", label: "Author Date" },
    { key: "commit.committer.name", label: "Committer" },
    { key: "commit.committer.date", label: "Commit Date" },
    { key: "html_url", label: "URL" },
  ];
  
  const flattenCommit = (c) => ({
    sha: c.sha?.substring(0, 7),
    "commit.message": c.commit?.message?.split("\n")[0],
    "commit.author.name": c.commit?.author?.name,
    "commit.author.email": c.commit?.author?.email,
    "commit.author.date": c.commit?.author?.date,
    "commit.committer.name": c.commit?.committer?.name,
    "commit.committer.date": c.commit?.committer?.date,
    html_url: c.html_url,
  });
  
  const csv = convertToCSV(commits.map(flattenCommit), headers);
  downloadCSV(csv, `${repoName}_commits_${new Date().toISOString().split("T")[0]}`);
}

// Contributors CSV export
export function exportContributorsToCSV(contributors, repoName = "contributors") {
  const headers = [
    { key: "login", label: "Username" },
    { key: "id", label: "User ID" },
    { key: "avatar_url", label: "Avatar URL" },
    { key: "contributions", label: "Contributions" },
    { key: "html_url", label: "Profile URL" },
    { key: "type", label: "Type" },
  ];
  
  const csv = convertToCSV(contributors, headers);
  downloadCSV(csv, `${repoName}_contributors_${new Date().toISOString().split("T")[0]}`);
}

// Branches CSV export
export function exportBranchesToCSV(branches, repoName = "branches") {
  const headers = [
    { key: "name", label: "Branch Name" },
    { key: "protected", label: "Protected" },
    { key: "commit.sha", label: "Last Commit SHA" },
    { key: "commit.url", label: "Last Commit URL" },
    { key: "protection.enabled", label: "Protection Enabled" },
    { key: "protection.required_status_checks.strict", label: "Require Status Checks" },
  ];
  
  const flattenBranch = (b) => ({
    name: b.name,
    protected: b.protected ? "Yes" : "No",
    "commit.sha": b.commit?.sha?.substring(0, 7),
    "commit.url": b.commit?.url,
    "protection.enabled": b.protection?.enabled ? "Yes" : "No",
    "protection.required_status_checks.strict": b.protection?.required_status_checks?.strict ? "Yes" : "No",
  });
  
  const csv = convertToCSV(branches.map(flattenBranch), headers);
  downloadCSV(csv, `${repoName}_branches_${new Date().toISOString().split("T")[0]}`);
}

// Pull Requests CSV export
export function exportPRsToCSV(prs, repoName = "pulls") {
  const headers = [
    { key: "number", label: "PR Number" },
    { key: "title", label: "Title" },
    { key: "state", label: "State" },
    { key: "user.login", label: "Author" },
    { key: "created_at", label: "Created At" },
    { key: "updated_at", label: "Updated At" },
    { key: "merged_at", label: "Merged At" },
    { key: "closed_at", label: "Closed At" },
    { key: "additions", label: "Additions" },
    { key: "deletions", label: "Deletions" },
    { key: "changed_files", label: "Changed Files" },
    { key: "html_url", label: "URL" },
  ];
  
  const flattenPR = (pr) => ({
    number: pr.number,
    title: pr.title,
    state: pr.state,
    "user.login": pr.user?.login,
    created_at: pr.created_at,
    updated_at: pr.updated_at,
    merged_at: pr.merged_at,
    closed_at: pr.closed_at,
    additions: pr.additions,
    deletions: pr.deletions,
    changed_files: pr.changed_files,
    html_url: pr.html_url,
  });
  
  const csv = convertToCSV(prs.map(flattenPR), headers);
  downloadCSV(csv, `${repoName}_pulls_${new Date().toISOString().split("T")[0]}`);
}

// Analytics summary CSV export
export function exportAnalyticsToCSV(analytics, repoName = "analytics") {
  const headers = [
    { key: "metric", label: "Metric" },
    { key: "value", label: "Value" },
  ];
  
  const data = [
    { metric: "Total Commits", value: analytics.commits || 0 },
    { metric: "Total Issues", value: analytics.issues || 0 },
    { metric: "Total Pull Requests", value: analytics.pulls || 0 },
    { metric: "Contributors", value: analytics.contributors || 0 },
    { metric: "Branches", value: analytics.branches || 0 },
    { metric: "Languages", value: (analytics.languages || []).length },
  ];
  
  const csv = convertToCSV(data, headers);
  downloadCSV(csv, `${repoName}_summary_${new Date().toISOString().split("T")[0]}`);
}