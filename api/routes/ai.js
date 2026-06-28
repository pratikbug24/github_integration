import express from 'express';
import axios from 'axios';

const router = express.Router();

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// Default model - can be overridden via env or request
const DEFAULT_MODEL = 'llama-3.1-8b-instant';

// System prompt for code review
const CODE_REVIEW_PROMPT = `You are an expert code reviewer. Analyze commits and provide clear, concise summaries.
Format your response with:
- 🎯 **Summary**: Brief overview of what changed
- 📝 **Files Changed**: List of modified files
- ⚡ **Key Changes**: Main modifications
- 🐛 **Potential Issues**: Any bugs, security concerns, or code smells
- 💡 **Suggestions**: Optional improvement recommendations`;

// Generate AI summary for commit
router.post('/summarize', async (req, res) => {
  try {
    const { diff, commitInfo, model } = req.body;

    if (!diff && !commitInfo) {
      return res.status(400).json({ 
        error: 'Please provide diff or commitInfo for analysis' 
      });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ 
        error: 'Groq API key not configured on server' 
      });
    }

    const selectedModel = model || DEFAULT_MODEL;
    
    // Build the analysis prompt
    const analysisContent = `
Analyze this commit and provide a summary:

Commit Info:
${commitInfo || 'N/A'}

Code Changes:
${diff || 'No diff available'}
`;

    const response = await axios.post(GROQ_API_URL, {
      model: selectedModel,
      messages: [
        {
          role: 'system',
          content: CODE_REVIEW_PROMPT
        },
        {
          role: 'user',
          content: analysisContent
        }
      ],
      temperature: 0.3,
      max_tokens: 500
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    const summary = response.data.choices?.[0]?.message?.content || 'No summary generated';

    res.json({
      summary,
      model: selectedModel,
      usage: response.data.usage ? {
        prompt_tokens: response.data.usage.prompt_tokens,
        completion_tokens: response.data.usage.completion_tokens,
        total_tokens: response.data.usage.total_tokens
      } : null
    });

  } catch (error) {
    console.error('Groq API Error:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      return res.status(401).json({ 
        error: 'Invalid Groq API key' 
      });
    }
    
    if (error.response?.status === 429) {
      return res.status(429).json({ 
        error: 'Rate limit exceeded. Please try again later.' 
      });
    }

    res.status(500).json({
      error: error.response?.data?.error?.message || 'Failed to generate summary'
    });
  }
});

// Get available models
router.get('/models', (req, res) => {
  res.json({
    models: [
      { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B (Fast)', description: 'Fastest model, great for quick summaries' },
      { id: 'llama-3.2-1b-instant', name: 'Llama 3.2 1B (Lightweight)', description: 'Lightweight, low latency' },
      { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B (Powerful)', description: 'More powerful, longer context' }
    ],
    default: DEFAULT_MODEL
  });
});

export default router;
