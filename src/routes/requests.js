import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { pool } from '../config.js';

const router = Router();

router.get('/', requireAuth, async (req, res) => {
  try {
    const isStaff = req.user.roles.some(r => ['admin', 'superadmin', 'staff', 'concierge', 'medical'].includes(r));
    let result;
    if (isStaff) {
      result = await pool.query(
        'SELECT r.*, p.full_name AS user_full_name FROM requests r LEFT JOIN profiles p ON r.user_id = p.id ORDER BY r.created_at DESC'
      );
    } else {
      result = await pool.query(
        'SELECT * FROM requests WHERE user_id = $1 ORDER BY created_at DESC',
        [req.user.id]
      );
    }
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT r.*, p.full_name AS user_full_name FROM requests r
       LEFT JOIN profiles p ON r.user_id = p.id
       WHERE r.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Request not found' });
    }
    const request = result.rows[0];
    const isStaff = req.user.roles.some(r => ['admin', 'superadmin', 'staff', 'concierge', 'medical'].includes(r));
    if (request.user_id !== req.user.id && !isStaff) {
      return res.status(403).json({ error: 'Access denied' });
    }
    res.json(request);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', requireAuth, async (req, res) => {
  try {
    const { request_type, description, service_type, details } = req.body;
    const profile = await pool.query('SELECT full_name, email FROM profiles WHERE id = $1', [req.user.id]);
    const name = profile.rows[0]?.full_name || '';
    const email = profile.rows[0]?.email || req.user.email;
    const result = await pool.query(
      `INSERT INTO requests (user_id, request_type, description, service_type, details, status, client_name, client_email)
       VALUES ($1, $2, $3, $4, $5, 'Pending', $6, $7) RETURNING *`,
      [req.user.id, request_type || 'General', description || '', service_type || '', details || '', name, email]
    );
    await pool.query(
      'INSERT INTO audit_logs (user_id, action, details) VALUES ($1, $2, $3)',
      [req.user.id, 'request_created', `Created ${request_type || 'General'} request`]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
