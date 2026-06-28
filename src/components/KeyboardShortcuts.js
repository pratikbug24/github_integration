import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { Keyboard, X } from "lucide-react";

const shortcuts = [
  { key: "?", description: "Show keyboard shortcuts", category: "General" },
  { key: "d", description: "Toggle dark mode", category: "General" },
  { key: "g i", description: "Go to integration page", category: "Navigation" },
  { key: "g r", description: "Go to repositories", category: "Navigation" },
  { key: "g a", description: "Go to analytics", category: "Navigation" },
  { key: "Escape", description: "Close modal/panel", category: "General" },
  { key: "/", description: "Focus search", category: "Search" },
  { key: "Ctrl + k", description: "Quick search", category: "Search" },
  { key: "n", description: "New branch (in repo)", category: "Repository" },
  { key: "p", description: "Pull latest (in repo)", category: "Repository" },
];

export default function KeyboardShortcuts() {
  const [showHelp, setShowHelp] = useState(false);
  const navigate = useNavigate();
  const { toggleDarkMode } = useTheme();

  const handleKeyDown = useCallback(
    (e) => {
      // Don't trigger shortcuts when typing in inputs
      if (
        e.target.tagName === "INPUT" ||
        e.target.tagName === "TEXTAREA" ||
        e.target.isContentEditable
      ) {
        return;
      }

      // Toggle shortcuts help
      if (e.key === "?" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setShowHelp((prev) => !prev);
        return;
      }

      // Close modal
      if (e.key === "Escape") {
        if (showHelp) {
          setShowHelp(false);
        }
        return;
      }

      // Toggle dark mode
      if (e.key === "d" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        toggleDarkMode();
        return;
      }

      // Navigation shortcuts (with 'g' prefix)
      if (e.key === "g" && !e.ctrlKey && !e.metaKey) {
        window._gPressed = true;
        setTimeout(() => {
          window._gPressed = false;
        }, 1000);
        return;
      }

      if (window._gPressed) {
        window._gPressed = false;
        if (e.key === "i") {
          e.preventDefault();
          navigate("/github-integration");
        } else if (e.key === "r") {
          e.preventDefault();
          navigate("/github/repolist");
        }
        return;
      }

      // Focus search
      if (e.key === "/" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        const searchInput = document.querySelector('input[type="search"], input[placeholder*="search" i], input[placeholder*="Search"]');
        if (searchInput) searchInput.focus();
        return;
      }

      // Quick search (Ctrl/Cmd + K)
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        const searchInput = document.querySelector('input[type="search"], input[placeholder*="search" i], input[placeholder*="Search"]');
        if (searchInput) searchInput.focus();
        return;
      }
    },
    [navigate, toggleDarkMode, showHelp]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const categories = [...new Set(shortcuts.map((s) => s.category))];

  return (
    <>
      {/* Keyboard shortcuts hint button */}
      <button
        onClick={() => setShowHelp(true)}
        className="fixed bottom-4 right-4 z-40 p-2 rounded-full bg-white dark:bg-gray-800 shadow-lg hover:shadow-xl transition-all border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300"
        title="Keyboard shortcuts (?)"
      >
        <Keyboard className="w-5 h-5" />
      </button>

      {/* Shortcuts modal */}
      {showHelp && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center animate-fadeIn"
          onClick={() => setShowHelp(false)}
        >
          <div
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-[90%] max-w-2xl max-h-[80vh] overflow-hidden animate-slideUp"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <Keyboard className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Keyboard Shortcuts
                </h2>
              </div>
              <button
                onClick={() => setShowHelp(false)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Shortcuts list */}
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {categories.map((category) => (
                <div key={category} className="mb-6 last:mb-0">
                  <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                    {category}
                  </h3>
                  <div className="space-y-2">
                    {shortcuts
                      .filter((s) => s.category === category)
                      .map((shortcut, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                        >
                          <span className="text-gray-700 dark:text-gray-300">
                            {shortcut.description}
                          </span>
                          <kbd className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm font-mono text-gray-600 dark:text-gray-300">
                            {shortcut.key}
                          </kbd>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                Press <kbd className="px-2 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">?</kbd> anytime to toggle this panel
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}