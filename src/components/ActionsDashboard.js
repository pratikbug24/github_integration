import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import {
  Play,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Workflow,
  Activity,
} from "lucide-react";

export default function ActionsDashboard({ username, repoName, token }) {
  const [workflows, setWorkflows] = useState([]);
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedRun, setExpandedRun] = useState(null);
  const [runDetails, setRunDetails] = useState({});
  const [selectedWorkflow, setSelectedWorkflow] = useState("all");

  const headers = useMemo(
    () => ({ Authorization: token ? `token ${token}` : undefined }),
    [token]
  );

  useEffect(() => {
    if (!username || !repoName || !token) return;

    const fetchActionsData = async () => {
      setLoading(true);
      setError("");
      try {
        const [workflowsRes, runsRes] = await Promise.all([
          axios.get(
            `https://api.github.com/repos/${username}/${repoName}/actions/workflows`,
            { headers }
          ),
          axios.get(
            `https://api.github.com/repos/${username}/${repoName}/actions/runs?per_page=30`,
            { headers }
          ),
        ]);
        setWorkflows(workflowsRes.data.workflows || []);
        setRuns(runsRes.data.workflow_runs || []);
      } catch (err) {
        console.error("Actions API error:", err);
        setError("Failed to load GitHub Actions data. Ensure the repo has Actions enabled.");
      }
      setLoading(false);
    };

    fetchActionsData();
  }, [username, repoName, token, headers]);

  const fetchRunDetails = async (runId) => {
    if (runDetails[runId]) {
      setExpandedRun(expandedRun === runId ? null : runId);
      return;
    }

    try {
      const res = await axios.get(
        `https://api.github.com/repos/${username}/${repoName}/actions/runs/${runId}/jobs`,
        { headers }
      );
      setRunDetails((prev) => ({ ...prev, [runId]: res.data.jobs || [] }));
      setExpandedRun(runId);
    } catch (err) {
      console.error("Failed to fetch run details:", err);
    }
  };

  const filteredRuns = useMemo(() => {
    if (selectedWorkflow === "all") return runs;
    return runs.filter((run) => run.workflow_id === parseInt(selectedWorkflow));
  }, [runs, selectedWorkflow]);

  const statusCounts = useMemo(() => ({
    all: runs.length,
    success: runs.filter((r) => r.conclusion === "success").length,
    failure: runs.filter((r) => r.conclusion === "failure").length,
    in_progress: runs.filter((r) => r.status === "in_progress" || r.status === "queued" || r.status === "waiting").length,
    cancelled: runs.filter((r) => r.conclusion === "cancelled").length,
  }), [runs]);

  const getStatusIcon = (status, conclusion) => {
    if (status === "in_progress" || status === "queued" || status === "waiting") {
      return <Clock className="w-4 h-4 text-blue-500 animate-pulse" />;
    }
    if (conclusion === "success") {
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    }
    if (conclusion === "failure") {
      return <XCircle className="w-4 h-4 text-red-500" />;
    }
    if (conclusion === "cancelled") {
      return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
    return <AlertCircle className="w-4 h-4 text-yellow-500" />;
  };

  const getStatusBadge = (status, conclusion) => {
    const baseClasses = "px-2 py-1 rounded-full text-xs font-medium";
    if (status === "in_progress" || status === "queued" || status === "waiting") {
      return `${baseClasses} bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300`;
    }
    if (conclusion === "success") {
      return `${baseClasses} bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300`;
    }
    if (conclusion === "failure") {
      return `${baseClasses} bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300`;
    }
    if (conclusion === "cancelled") {
      return `${baseClasses} bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300`;
    }
    return `${baseClasses} bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300`;
  };

  const formatDuration = (run) => {
    if (!run.run_started_at) return "-";
    const start = new Date(run.run_started_at);
    const end = run.updated_at ? new Date(run.updated_at) : new Date();
    const diff = Math.floor((end - start) / 1000);
    if (diff < 60) return `${diff}s`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ${diff % 60}s`;
    return `${Math.floor(diff / 3600)}h ${Math.floor((diff % 3600) / 60)}m`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
        <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Workflow className="w-6 h-6 text-purple-600 dark:text-purple-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            GitHub Actions
          </h3>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <Activity className="w-4 h-4" />
          <span>{statusCounts.in_progress} running</span>
        </div>
      </div>

      {/* Status Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <button
          onClick={() => setSelectedWorkflow("all")}
          className={`p-3 rounded-lg border transition ${
            selectedWorkflow === "all"
              ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30"
              : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
          }`}
        >
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{statusCounts.all}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Total Runs</div>
        </button>
        <button
          onClick={() => setSelectedWorkflow("success")}
          className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-green-300 transition"
        >
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <span className="text-2xl font-bold text-green-600 dark:text-green-400">{statusCounts.success}</span>
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Successful</div>
        </button>
        <button
          onClick={() => setSelectedWorkflow("failure")}
          className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-red-300 transition"
        >
          <div className="flex items-center gap-2">
            <XCircle className="w-5 h-5 text-red-500" />
            <span className="text-2xl font-bold text-red-600 dark:text-red-400">{statusCounts.failure}</span>
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Failed</div>
        </button>
        <button
          onClick={() => setSelectedWorkflow("in_progress")}
          className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-300 transition"
        >
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-500" />
            <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">{statusCounts.in_progress}</span>
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">In Progress</div>
        </button>
      </div>

      {/* Workflow Filter */}
      {workflows.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-gray-500 dark:text-gray-400">Workflow:</span>
          <button
            onClick={() => setSelectedWorkflow("all")}
            className={`px-3 py-1 rounded-full text-sm transition ${
              selectedWorkflow === "all"
                ? "bg-gray-800 text-white dark:bg-white dark:text-gray-800"
                : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200"
            }`}
          >
            All
          </button>
          {workflows.map((wf) => (
            <button
              key={wf.id}
              onClick={() => setSelectedWorkflow(wf.id)}
              className={`px-3 py-1 rounded-full text-sm transition ${
                selectedWorkflow === wf.id
                  ? "bg-gray-800 text-white dark:bg-white dark:text-gray-800"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200"
              }`}
            >
              {wf.name}
            </button>
          ))}
        </div>
      )}

      {/* Runs List */}
      {filteredRuns.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          No workflow runs found.
        </div>
      ) : (
        <div className="space-y-2">
          {filteredRuns.map((run) => (
            <div
              key={run.id}
              className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
            >
              <div
                className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50 transition cursor-pointer"
                onClick={() => fetchRunDetails(run.id)}
              >
                <div className="flex items-center gap-3">
                  {getStatusIcon(run.status, run.conclusion)}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {run.name}
                      </span>
                      <span className={getStatusBadge(run.status, run.conclusion)}>
                        {run.status === "completed" ? run.conclusion : run.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-sm text-gray-500 dark:text-gray-400">
                      <span>Branch: {run.head_branch}</span>
                      <span>•</span>
                      <span>{formatDate(run.run_started_at)}</span>
                      <span>•</span>
                      <span>{formatDuration(run)}</span>
                      <a
                        href={run.html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1 text-blue-500 hover:text-blue-600"
                      >
                        <ExternalLink className="w-3 h-3" />
                        View
                      </a>
                    </div>
                  </div>
                </div>
                <div>
                  {expandedRun === run.id ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </div>

              {/* Expanded Jobs */}
              {expandedRun === run.id && (
                <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/30 p-4">
                  {runDetails[run.id] ? (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Jobs ({runDetails[run.id].length})
                      </h4>
                      {runDetails[run.id].map((job) => (
                        <div
                          key={job.id}
                          className="flex items-center justify-between p-2 bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700"
                        >
                          <div className="flex items-center gap-2">
                            {getStatusIcon(job.status, job.conclusion)}
                            <span className="text-sm text-gray-900 dark:text-gray-200">
                              {job.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={getStatusBadge(job.status, job.conclusion)}>
                              {job.status === "completed" ? job.conclusion : job.status}
                            </span>
                            <a
                              href={job.html_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-500 hover:text-blue-600"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center py-4">
                      <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}