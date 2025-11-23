import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import RepoAnalytics from "./pages/RepoAnalytics";
import GithubIntegration from "./pages/GithubIntegration";
import GithubCodeEditor from "./pages/GithubCodeEditor";
import RepoList from "./components/RepoList";

function App() {
  return (
    <Router>
      <Routes>
        {/* Default route redirect */}
        <Route path="/" element={<Navigate to="/github-integration" replace />} />

        <Route path="/github-integration" element={<GithubIntegration />} />
        <Route path="/github/repolist" element={<RepoList />} />
        <Route
          path="/github/analytics/:username/:repoName"
          element={<RepoAnalytics />}
        />
        <Route
          path="/github/code-editor/:owner/:repo"
          element={<GithubCodeEditor />}
        />
        <Route path="/repo-analytics/:repoName" element={<RepoAnalytics />} />
      </Routes>
    </Router>
  );
}

export default App;
