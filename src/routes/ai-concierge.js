import { Router } from 'express';
import { config, pool } from '../config.js';

const router = Router();

router.post('/', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const directoryResult = await pool.query('SELECT name, location, description FROM directory');
    const directory = directoryResult.rows;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.openrouter.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'qwen/qwen3-next-80b-a3b-instruct:free',
        messages: [
          {
            role: 'system',
            content: `You are the Octobere Concierge. Use this directory to help the user: ${JSON.stringify(directory)}. Be brief and elite.`,
          },
          { role: 'user', content: message },
        ],
      }),
    });

    const result = await response.json();

    if (result.error) {
      console.error('OpenRouter Error:', result.error);
      throw new Error(result.error.message || 'AI Error');
    }

    const reply = result.choices[0].message.content;
    res.json({ reply });
  } catch (err) {
    console.error('AI Concierge error:', err.message);
    res.status(400).json({ error: err.message });
  }
});

export default router;
