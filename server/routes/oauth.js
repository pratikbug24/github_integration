import express from 'express';

const router = express.Router();

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID || 'Ov23li2riPJ3NUzq3sol';
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || 'd70c958f98e4ba2524560c538bb95657c4784445';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// GitHub OAuth Configuration
const GITHUB_OAUTH_URL = 'https://github.com/login/oauth/authorize';
const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';
const GITHUB_API_URL = 'https://api.github.com';

// Initiate GitHub OAuth flow
router.get('/github', (req, res) => {
  if (!GITHUB_CLIENT_ID) {
    return res.status(500).json({ 
      error: 'GitHub OAuth not configured. Please set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET.' 
    });
  }

  const redirectUri = `${req.protocol}://${req.get('host')}/api/oauth/github/callback`;
  
  const params = new URLSearchParams({
    client_id: GITHUB_CLIENT_ID,
    redirect_uri: redirectUri,
    scope: 'repo read:user user:email',
  });

  const authUrl = `${GITHUB_OAUTH_URL}?${params.toString()}`;
  res.json({ authUrl, redirectUri });
});

// GitHub OAuth callback
router.get('/github/callback', async (req, res) => {
  const { code, error } = req.query;

  if (error) {
    return res.redirect(`${FRONTEND_URL}?error=${encodeURIComponent(error)}`);
  }

  if (!code) {
    return res.redirect(`${FRONTEND_URL}?error=no_code`);
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch(GITHUB_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      return res.redirect(`${FRONTEND_URL}?error=${encodeURIComponent(tokenData.error_description || tokenData.error)}`);
    }

    const accessToken = tokenData.access_token;

    // Fetch user info
    const userResponse = await fetch(`${GITHUB_API_URL}/user`, {
      headers: {
        Authorization: `token ${accessToken}`,
        Accept: 'application/json',
      },
    });

    const userData = await userResponse.json();

    // Return token and user data to frontend
    res.redirect(`${FRONTEND_URL}?token=${accessToken}&username=${userData.login}&avatar=${encodeURIComponent(userData.avatar_url)}&name=${encodeURIComponent(userData.name || userData.login)}`);

  } catch (error) {
    console.error('OAuth callback error:', error);
    res.redirect(`${FRONTEND_URL}?error=server_error`);
  }
});

// Validate token
router.get('/validate', async (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({ valid: false, error: 'No authorization header' });
  }

  const token = authHeader.replace('Bearer ', '');

  try {
    const response = await fetch(`${GITHUB_API_URL}/user`, {
      headers: {
        Authorization: `token ${token}`,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      return res.status(401).json({ valid: false, error: 'Invalid token' });
    }

    const userData = await response.json();
    res.json({ valid: true, user: userData });
  } catch (error) {
    res.status(500).json({ valid: false, error: 'Failed to validate token' });
  }
});

// Get OAuth config status
router.get('/status', (req, res) => {
  res.json({
    configured: !!(GITHUB_CLIENT_ID && GITHUB_CLIENT_SECRET),
    hasClientId: !!GITHUB_CLIENT_ID,
    hasClientSecret: !!GITHUB_CLIENT_SECRET,
  });
});

export default router;
