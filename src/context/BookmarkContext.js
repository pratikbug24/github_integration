import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

const BookmarkContext = createContext();

const BOOKMARKS_KEY = "github_bookmarked_repos";

export function BookmarkProvider({ children }) {
  const [bookmarks, setBookmarks] = useState(() => {
    try {
      const stored = localStorage.getItem(BOOKMARKS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks));
  }, [bookmarks]);

  const addBookmark = useCallback((repo) => {
    setBookmarks((prev) => {
      if (prev.some((b) => b.id === repo.id)) return prev;
      return [...prev, {
        id: repo.id,
        name: repo.name,
        full_name: repo.full_name,
        description: repo.description,
        language: repo.language,
        stargazers_count: repo.stargazers_count,
        forks_count: repo.forks_count,
        html_url: repo.html_url,
        private: repo.private,
        avatar_url: repo.owner?.avatar_url,
        bookmarkedAt: new Date().toISOString(),
      }];
    });
  }, []);

  const removeBookmark = useCallback((repoId) => {
    setBookmarks((prev) => prev.filter((b) => b.id !== repoId));
  }, []);

  const toggleBookmark = useCallback((repo) => {
    if (bookmarks.some((b) => b.id === repo.id)) {
      removeBookmark(repo.id);
    } else {
      addBookmark(repo);
    }
  }, [bookmarks, addBookmark, removeBookmark]);

  const isBookmarked = useCallback((repoId) => {
    return bookmarks.some((b) => b.id === repoId);
  }, [bookmarks]);

  const clearAllBookmarks = useCallback(() => {
    setBookmarks([]);
  }, []);

  return (
    <BookmarkContext.Provider
      value={{
        bookmarks,
        addBookmark,
        removeBookmark,
        toggleBookmark,
        isBookmarked,
        clearAllBookmarks,
      }}
    >
      {children}
    </BookmarkContext.Provider>
  );
}

export function useBookmarks() {
  const context = useContext(BookmarkContext);
  if (!context) {
    throw new Error("useBookmarks must be used within a BookmarkProvider");
  }
  return context;
}