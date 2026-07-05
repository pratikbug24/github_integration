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

// Create a new repository
router.post('/create', async (req, res) => {
  try {
    const { name, description, private: isPrivate, auto_init, gitignore_template } = req.body;
    const client = createGitHubClient(req);
    
    if (!name) {
      return res.status(400).json({ error: 'Repository name is required' });
    }

    const response = await client.post('/user/repos', {
      name,
      description: description || '',
      private: isPrivate || false,
      auto_init: auto_init || false,
      gitignore_template: gitignore_template || null,
    });

    res.status(201).json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.message || 'Failed to create repository'
    });
  }
});

// Update repository settings
router.patch('/:owner/:repo', async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const { name, description, private: isPrivate, default_branch, has_issues, has_projects, has_wiki } = req.body;
    const client = createGitHubClient(req);

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (isPrivate !== undefined) updateData.private = isPrivate;
    if (default_branch !== undefined) updateData.default_branch = default_branch;
    if (has_issues !== undefined) updateData.has_issues = has_issues;
    if (has_projects !== undefined) updateData.has_projects = has_projects;
    if (has_wiki !== undefined) updateData.has_wiki = has_wiki;

    const response = await client.patch(`/repos/${owner}/${repo}`, updateData);
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.message || 'Failed to update repository'
    });
  }
});

// Delete a repository
router.delete('/:owner/:repo', async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const client = createGitHubClient(req);

    await client.delete(`/repos/${owner}/${repo}`);
    res.status(204).json({ message: 'Repository deleted successfully' });
  } catch (error) {
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.message || 'Failed to delete repository'
    });
  }
});

// Archive a repository
router.post('/:owner/:repo/archive', async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const client = createGitHubClient(req);

    const response = await client.post(`/repos/${owner}/${repo}/archive`, {
      archived: true
    });
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.message || 'Failed to archive repository'
    });
  }
});

// Unarchive a repository
router.post('/:owner/:repo/unarchive', async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const client = createGitHubClient(req);

    const response = await client.post(`/repos/${owner}/${repo}/archive`, {
      archived: false
    });
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.message || 'Failed to unarchive repository'
    });
  }
});

// Fork a repository
router.post('/:owner/:repo/forks', async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const { organization } = req.body;
    const client = createGitHubClient(req);

    const response = await client.post(`/repos/${owner}/${repo}/forks`, {
      organization: organization || null
    });
    res.status(202).json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.message || 'Failed to fork repository'
    });
  }
});

// List user's forks
router.get('/forks', async (req, res) => {
  try {
    const client = createGitHubClient(req);
    const username = req.query.username;
    
    const response = await client.get(`/users/${username}/repos`, {
      params: { type: 'forks', per_page: 100 }
    });
    
    const forks = response.data.filter(repo => repo.fork);
    res.json(forks);
  } catch (error) {
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.message || 'Failed to fetch forks'
    });
  }
});

// Transfer repository
router.post('/:owner/:repo/transfer', async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const { new_owner, new_name } = req.body;
    const client = createGitHubClient(req);

    const response = await client.post(`/repos/${owner}/${repo}/transfer`, {
      new_owner,
      new_name: new_name || undefined
    });
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.message || 'Failed to transfer repository'
    });
  }
});

// List repository templates
router.get('/templates', async (req, res) => {
  try {
    const client = createGitHubClient(req);
    const response = await client.get('/repos/myorg/templates', {
      params: { type: 'all' }
    }).catch(() => ({ data: [] }));
    
    // Return available gitignore templates as a simpler alternative
    const templatesResponse = await client.get('/gitignore/templates');
    res.json(templatesResponse.data);
  } catch (error) {
    // Fallback to common templates
    res.json([
      { name: 'Node', value: 'Node' },
      { name: 'Python', value: 'Python' },
      { name: 'Ruby', value: 'Ruby' },
      { name: 'Go', value: 'Go' },
      { name: 'Rust', value: 'Rust' },
      { name: 'Java', value: 'Java' },
      { name: 'Maven', value: 'Maven' },
      { name: 'Gradle', value: 'Gradle' },
      { name: 'Dotnet', value: 'Dotnet' },
      { name: 'Rails', value: 'Rails' },
    ]);
  }
});

export default router;
