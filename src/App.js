import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext";
import { BookmarkProvider } from "./context/BookmarkContext";
import ThemeToggle from "./components/ThemeToggle";
import KeyboardShortcuts from "./components/KeyboardShortcuts";
import BookmarksPanel from "./components/BookmarksPanel";

import RepoAnalytics from "./pages/RepoAnalytics";
import GithubIntegration from "./pages/GithubIntegration";
import GithubCodeEditor from "./pages/GithubCodeEditor";
import RepoList from "./components/RepoList";
import RepoManager from "./components/RepoManager";

function App() {
  return (
    <ThemeProvider>
      <BookmarkProvider>
        <Router>
          <ThemeToggle />
          <KeyboardShortcuts />
          <BookmarksPanel />
          <Routes>
            {/* Default route redirect */}
            <Route path="/" element={<Navigate to="/github-integration" replace />} />

            <Route path="/github-integration" element={<GithubIntegration />} />
            <Route path="/github/repolist" element={<RepoList />} />
            <Route path="/github/repo-manager" element={<RepoManager />} />
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
      </BookmarkProvider>
    </ThemeProvider>
  );
}

export default App;
