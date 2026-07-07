// API Configuration
// Set API URL based on environment

const getApiUrl = () => {
    // Production - use deployed backend
    if (process.env.REACT_APP_API_URL) {
      return process.env.REACT_APP_API_URL;
    }
    // Development - use local backend
    return process.env.REACT_APP_API_URL || 'http://localhost:5000';
  };
  
  const API_BASE_URL = getApiUrl();
  
  // Backend API endpoints
  export const API_ENDPOINTS = {
    // Health check
    health: `${API_BASE_URL}/api/health`,
    
    // OAuth routes
    oauth: {
      github: () => `${API_BASE_URL}/api/oauth/github`,
      githubCallback: () => `${API_BASE_URL}/api/oauth/github/callback`,
      validate: () => `${API_BASE_URL}/api/oauth/validate`,
      status: () => `${API_BASE_URL}/api/oauth/status`,
    },
    
    // GitHub API (proxied through backend)
    github: {
      user: () => `${API_BASE_URL}/api/github/user`,
      userRepos: (username) => `${API_BASE_URL}/api/github/users/${username}/repos`,
      repo: (owner, repo) => `${API_BASE_URL}/api/github/repos/${owner}/${repo}`,
      commits: (owner, repo) => `${API_BASE_URL}/api/github/repos/${owner}/${repo}/commits`,
      commit: (owner, repo, sha) => `${API_BASE_URL}/api/github/repos/${owner}/${repo}/commits/${sha}`,
      branches: (owner, repo) => `${API_BASE_URL}/api/github/repos/${owner}/${repo}/branches`,
      pulls: (owner, repo) => `${API_BASE_URL}/api/github/repos/${owner}/${repo}/pulls`,
      issues: (owner, repo) => `${API_BASE_URL}/api/github/repos/${owner}/${repo}/issues`,
      contributors: (owner, repo) => `${API_BASE_URL}/api/github/repos/${owner}/${repo}/contributors`,
      languages: (owner, repo) => `${API_BASE_URL}/api/github/repos/${owner}/${repo}/languages`,
      license: (owner, repo) => `${API_BASE_URL}/api/github/repos/${owner}/${repo}/license`,
      contents: (owner, repo, path) => `${API_BASE_URL}/api/github/repos/${owner}/${repo}/contents/${path}`,
      compare: (owner, repo, base, head) => `${API_BASE_URL}/api/github/repos/${owner}/${repo}/compare/${base}...${head}`,
    },
    
    // AI API
    ai: {
      summarize: () => `${API_BASE_URL}/api/ai/summarize`,
      models: () => `${API_BASE_URL}/api/ai/models`,
    },
  };
  
  export default API_BASE_URL;