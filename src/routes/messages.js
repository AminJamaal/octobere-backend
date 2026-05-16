import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { pool } from '../config.js';

const router = Router();

router.get('/requests/:id/messages', requireAuth, async (req, res) => {
  try {
    const reqResult = await pool.query('SELECT user_id FROM requests WHERE id = $1', [req.params.id]);
    if (reqResult.rows.length === 0) {
      return res.status(404).json({ error: 'Request not found' });
    }
    const isStaff = req.user.roles.some(r => ['admin', 'superadmin', 'staff', 'concierge', 'medical'].includes(r));
    if (reqResult.rows[0].user_id !== req.user.id && !isStaff) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const result = await pool.query(
      `SELECT m.*, p.full_name AS sender_name, p.avatar_url AS sender_avatar
       FROM messages m LEFT JOIN profiles p ON m.sender_id = p.id
       WHERE m.request_id = $1 ORDER BY m.created_at ASC`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/requests/:id/messages', requireAuth, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Message content is required' });
    }
    const reqResult = await pool.query('SELECT user_id FROM requests WHERE id = $1', [req.params.id]);
    if (reqResult.rows.length === 0) {
      return res.status(404).json({ error: 'Request not found' });
    }
    const isStaff = req.user.roles.some(r => ['admin', 'superadmin', 'staff', 'concierge', 'medical'].includes(r));
    if (reqResult.rows[0].user_id !== req.user.id && !isStaff) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const result = await pool.query(
      `INSERT INTO messages (request_id, sender_id, content) VALUES ($1, $2, $3) RETURNING *`,
      [req.params.id, req.user.id, content.trim()]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
