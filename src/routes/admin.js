import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { pool } from '../config.js';

const router = Router();

router.use(requireAuth, requireRole('admin', 'superadmin', 'staff', 'concierge', 'medical'));

router.get('/stats', async (req, res) => {
  try {
    const [profiles, requests, messages, assets, pending] = await Promise.all([
      pool.query('SELECT COUNT(*)::int AS count FROM profiles'),
      pool.query('SELECT COUNT(*)::int AS count FROM requests'),
      pool.query('SELECT COUNT(*)::int AS count FROM messages'),
      pool.query('SELECT COUNT(*)::int AS count FROM assets'),
      pool.query("SELECT COUNT(*)::int AS count FROM requests WHERE status = 'Pending'"),
    ]);
    res.json({
      total_profiles: profiles.rows[0].count,
      total_requests: requests.rows[0].count,
      total_messages: messages.rows[0].count,
      total_assets: assets.rows[0].count,
      pending_requests: pending.rows[0].count,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/users', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM profiles ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/users/:id', async (req, res) => {
  try {
    const { full_name, phone_number, role, membership_tier, address } = req.body;
    const result = await pool.query(
      `UPDATE profiles SET
        full_name = COALESCE($1, full_name),
        phone_number = COALESCE($2, phone_number),
        role = COALESCE($3, role),
        membership_tier = COALESCE($4, membership_tier),
        address = COALESCE($5, address),
        updated_at = NOW()
       WHERE id = $6 RETURNING *`,
      [full_name, phone_number, role, membership_tier, address, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    await pool.query('INSERT INTO audit_logs (user_id, action, details) VALUES ($1, $2, $3)',
      [req.user.id, 'user_updated', `Updated user ${req.params.id}`]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/users/:id', requireRole('superadmin'), async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM profiles WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    await pool.query('INSERT INTO audit_logs (user_id, action, details) VALUES ($1, $2, $3)',
      [req.user.id, 'user_deleted', `Deleted user ${req.params.id}`]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/requests', async (req, res) => {
  try {
    const { status } = req.query;
    let query = `SELECT r.*, p.full_name AS user_full_name FROM requests r LEFT JOIN profiles p ON r.user_id = p.id`;
    const params = [];
    if (status) {
      query += ' WHERE r.status = $1';
      params.push(status);
    }
    query += ' ORDER BY r.created_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/requests/:id', async (req, res) => {
  try {
    const { status, request_type, description } = req.body;
    const result = await pool.query(
      `UPDATE requests SET
        status = COALESCE($1, status),
        request_type = COALESCE($2, request_type),
        description = COALESCE($3, description),
        updated_at = NOW()
       WHERE id = $4 RETURNING *`,
      [status, request_type, description, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Request not found' });
    await pool.query('INSERT INTO audit_logs (user_id, action, details) VALUES ($1, $2, $3)',
      [req.user.id, 'request_updated', `Updated request ${req.params.id} status to ${status}`]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/users/:id/reset-password', requireAuth, requireRole('admin', 'superadmin'), async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword) {
      return res.status(400).json({ error: 'newPassword is required' });
    }
    await pool.query(
      'INSERT INTO audit_logs (user_id, action, details) VALUES ($1, $2, $3)',
      [req.user.id, 'password_reset', `Admin reset password for user ${req.params.id}`]
    );
    res.json({ success: true, message: 'Password reset logged. Note: Auth0 password reset must be done via Auth0 Management API.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/audit-logs', async (req, res) => {
  try {
    const { user_id, action, details, ip_address } = req.body;
    const result = await pool.query(
      'INSERT INTO audit_logs (user_id, action, details) VALUES ($1, $2, $3) RETURNING *',
      [user_id, action || 'system', details || '']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/audit-logs', async (req, res) => {
  try {
    const { limit = 100, offset = 0 } = req.query;
    const result = await pool.query(
      `SELECT al.*, p.full_name AS user_name FROM audit_logs al
       LEFT JOIN profiles p ON al.user_id = p.id
       ORDER BY al.created_at DESC LIMIT $1 OFFSET $2`,
      [parseInt(limit), parseInt(offset)]
    );
    const count = await pool.query('SELECT COUNT(*)::int AS count FROM audit_logs');
    res.json({ logs: result.rows, total: count.rows[0].count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
