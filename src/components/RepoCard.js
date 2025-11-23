import React from "react";

export default function RepoCard({ repo, onClick }) {
  return (
    <div
      onClick={() => onClick(repo)}
      className="p-5 bg-white rounded-xl shadow-md hover:shadow-lg cursor-pointer border border-gray-200 transition"
    >
      <h3 className="text-lg font-semibold text-blue-700">{repo.name}</h3>
      <p className="text-sm text-gray-600 mt-2">{repo.description || "No description"}</p>
      <p className="mt-2 text-sm text-gray-500">
        ⭐ {repo.stargazers_count} • 🍴 {repo.forks_count}
      </p>
    </div>
  );
}
