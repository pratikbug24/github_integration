import express from 'express';

const router = express.Router();

router.get('/', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    services: {
      api: 'running',
      groq: process.env.GROQ_API_KEY ? 'configured' : 'not configured',
      github: process.env.GITHUB_TOKEN ? 'configured' : 'optional'
    }
  });
});

router.get('/ready', (req, res) => {
  // Readiness check - can add more checks here
  res.json({ ready: true });
});

router.get('/live', (req, res) => {
  // Liveness check
  res.json({ alive: true });
});

export default router;
