import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useBookmarks } from "../context/BookmarkContext";
import { Star, Trash2, ExternalLink, X, Bookmark } from "lucide-react";

export default function BookmarksPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const { bookmarks, removeBookmark, clearAllBookmarks } = useBookmarks();
  const navigate = useNavigate();

  const handleRepoClick = (repo) => {
    const [username, repoName] = repo.full_name.split("/");
    navigate(`/github/analytics/${username}/${repoName}`);
    setIsOpen(false);
  };

  return (
    <>
      {/* Floating button to open bookmarks */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 left-4 z-40 p-3 rounded-full bg-amber-500 text-white shadow-lg hover:shadow-xl transition-all hover:bg-amber-600"
        title="Bookmarked Repositories"
      >
        <div className="relative">
          <Star className="w-5 h-5" fill="currentColor" />
          {bookmarks.length > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
              {bookmarks.length}
            </span>
          )}
        </div>
      </button>

      {/* Bookmarks panel */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex justify-start animate-fadeIn">
          <div
            className="w-full max-w-md h-full bg-white dark:bg-gray-900 shadow-2xl overflow-hidden animate-slideInLeft flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-gray-800 dark:to-gray-800">
              <div className="flex items-center gap-3">
                <Star className="w-6 h-6 text-amber-500" fill="currentColor" />
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Bookmarked Repos
                </h2>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {bookmarks.length === 0 ? (
                <div className="text-center py-12">
                  <Bookmark className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">
                    No bookmarked repositories yet.
                  </p>
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                    Click the star icon on any repository to bookmark it.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {bookmarks.map((repo) => (
                    <div
                      key={repo.id}
                      className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-750 transition group"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div
                          className="flex-1 cursor-pointer"
                          onClick={() => handleRepoClick(repo)}
                        >
                          <h3 className="font-semibold text-gray-900 dark:text-white hover:text-amber-600 dark:hover:text-amber-400 transition">
                            {repo.full_name}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                            {repo.description || "No description"}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-400 dark:text-gray-500">
                            {repo.language && (
                              <span className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                {repo.language}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Star className="w-3 h-3" />
                              {repo.stargazers_count}
                            </span>
                            <span className="flex items-center gap-1">
                              <ExternalLink className="w-3 h-3" />
                              {repo.forks_count} forks
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => window.open(repo.html_url, "_blank")}
                            className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition"
                            title="Open on GitHub"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => removeBookmark(repo.id)}
                            className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition"
                            title="Remove bookmark"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {bookmarks.length > 0 && (
              <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={clearAllBookmarks}
                  className="w-full py-2 px-4 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/50 transition font-medium"
                >
                  Clear All Bookmarks
                </button>
              </div>
            )}
          </div>

          {/* Click outside to close */}
          <div
            className="flex-1"
            onClick={() => setIsOpen(false)}
          />
        </div>
      )}
    </>
  );
}