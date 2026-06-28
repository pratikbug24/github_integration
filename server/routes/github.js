import express from 'express';
import axios from 'axios';

const router = express.Router();

const GITHUB_API = 'https://api.github.com';

// Helper function to create axios instance with auth
const createGitHubClient = (req) => {
  const token = req.headers.authorization?.replace('Bearer ', '') || process.env.GITHUB_TOKEN;
  return axios.create({
    baseURL: GITHUB_API,
    headers: {
      'Accept': 'application/vnd.github.v3+json',
      ...(token && { 'Authorization': `token ${token}` })
    }
  });
};

// Get user info
router.get('/user', async (req, res) => {
  try {
    const client = createGitHubClient(req);
    const response = await client.get('/user');
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.message || 'Failed to fetch user'
    });
  }
});

// Get user repositories
router.get('/users/:username/repos', async (req, res) => {
  try {
    const client = createGitHubClient(req);
    const { username } = req.params;
    const { per_page = 100, page = 1, sort = 'updated' } = req.query;
    
    const response = await client.get(`/users/${username}/repos`, {
      params: { per_page, page, sort }
    });
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.message || 'Failed to fetch repositories'
    });
  }
});

// Get repository info
router.get('/repos/:owner/:repo', async (req, res) => {
  try {
    const client = createGitHubClient(req);
    const { owner, repo } = req.params;
    
    const response = await client.get(`/repos/${owner}/${repo}`);
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.message || 'Failed to fetch repository'
    });
  }
});

// Get repository commits
router.get('/repos/:owner/:repo/commits', async (req, res) => {
  try {
    const client = createGitHubClient(req);
    const { owner, repo } = req.params;
    const { per_page = 100, page = 1, sha, since, until } = req.query;
    
    const response = await client.get(`/repos/${owner}/${repo}/commits`, {
      params: { per_page, page, sha, since, until }
    });
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.message || 'Failed to fetch commits'
    });
  }
});

// Get commit details
router.get('/repos/:owner/:repo/commits/:sha', async (req, res) => {
  try {
    const client = createGitHubClient(req);
    const { owner, repo, sha } = req.params;
    
    const response = await client.get(`/repos/${owner}/${repo}/commits/${sha}`);
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.message || 'Failed to fetch commit details'
    });
  }
});

// Get branches
router.get('/repos/:owner/:repo/branches', async (req, res) => {
  try {
    const client = createGitHubClient(req);
    const { owner, repo } = req.params;
    const { per_page = 100, page = 1 } = req.query;
    
    const response = await client.get(`/repos/${owner}/${repo}/branches`, {
      params: { per_page, page }
    });
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.message || 'Failed to fetch branches'
    });
  }
});

// Compare branches
router.get('/repos/:owner/:repo/compare/:base...:head', async (req, res) => {
  try {
    const client = createGitHubClient(req);
    const { owner, repo, base, head } = req.params;
    
    const response = await client.get(`/repos/${owner}/${repo}/compare/${base}...${head}`);
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.message || 'Failed to compare branches'
    });
  }
});

// Get pull requests
router.get('/repos/:owner/:repo/pulls', async (req, res) => {
  try {
    const client = createGitHubClient(req);
    const { owner, repo } = req.params;
    const { per_page = 100, page = 1, state = 'all', sort = 'updated' } = req.query;
    
    const response = await client.get(`/repos/${owner}/${repo}/pulls`, {
      params: { per_page, page, state, sort }
    });
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.message || 'Failed to fetch pull requests'
    });
  }
});

// Get issues
router.get('/repos/:owner/:repo/issues', async (req, res) => {
  try {
    const client = createGitHubClient(req);
    const { owner, repo } = req.params;
    const { per_page = 100, page = 1, state = 'all', since } = req.query;
    
    const response = await client.get(`/repos/${owner}/${repo}/issues`, {
      params: { per_page, page, state, since }
    });
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.message || 'Failed to fetch issues'
    });
  }
});

// Get contributors
router.get('/repos/:owner/:repo/contributors', async (req, res) => {
  try {
    const client = createGitHubClient(req);
    const { owner, repo } = req.params;
    const { per_page = 100, page = 1, anon } = req.query;
    
    const response = await client.get(`/repos/${owner}/${repo}/contributors`, {
      params: { per_page, page, anon }
    });
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.message || 'Failed to fetch contributors'
    });
  }
});

// Get languages
router.get('/repos/:owner/:repo/languages', async (req, res) => {
  try {
    const client = createGitHubClient(req);
    const { owner, repo } = req.params;
    
    const response = await client.get(`/repos/${owner}/${repo}/languages`);
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.message || 'Failed to fetch languages'
    });
  }
});

// Get license
router.get('/repos/:owner/:repo/license', async (req, res) => {
  try {
    const client = createGitHubClient(req);
    const { owner, repo } = req.params;
    
    const response = await client.get(`/repos/${owner}/${repo}/license`);
    res.json(response.data);
  } catch (error) {
    if (error.response?.status === 404) {
      res.json({ license: null, message: 'No license found' });
    } else {
      res.status(error.response?.status || 500).json({
        error: error.response?.data?.message || 'Failed to fetch license'
      });
    }
  }
});

// Get repository contents
router.get('/repos/:owner/:repo/contents/:path(*)', async (req, res) => {
  try {
    const client = createGitHubClient(req);
    const { owner, repo, path } = req.params;
    const { ref } = req.query;
    
    const response = await client.get(`/repos/${owner}/${repo}/contents/${path}`, {
      params: { ref }
    });
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.message || 'Failed to fetch contents'
    });
  }
});

export default router;
