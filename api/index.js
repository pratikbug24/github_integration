import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import githubRoutes from './routes/github.js';
import aiRoutes from './routes/ai.js';
import healthRoutes from './routes/health.js';

dotenv.config();

const app = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));

// Routes - Vercel serverless functions
app.use('/api/github', githubRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/health', healthRoutes);

// Root endpoint
app.get('/api', (req, res) => {
  res.json({
    message: 'GitHub Integration API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      github: '/api/github/*',
      ai: '/api/ai/*'
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  });
});

// Export for Vercel
export default app;
