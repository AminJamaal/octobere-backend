import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { pool } from '../config.js';

const router = Router();

router.get('/me', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM profiles WHERE id = $1',
      [req.user.id]
    );
    if (result.rows.length === 0) {
      return res.json({ user: null, profile: null });
    }
    res.json({
      user: { id: req.user.id, email: req.user.email },
      profile: result.rows[0],
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/sync-profile', requireAuth, async (req, res) => {
  try {
    const { full_name, phone_number, role, membership_tier } = req.body;
    const existing = await pool.query('SELECT id FROM profiles WHERE id = $1', [req.user.id]);
    if (existing.rows.length > 0) {
      const result = await pool.query(
        `UPDATE profiles SET email = COALESCE($1, email), full_name = COALESCE($2, full_name),
         phone_number = COALESCE($3, phone_number), role = COALESCE($4, role),
         membership_tier = COALESCE($5, membership_tier), updated_at = NOW()
         WHERE id = $6 RETURNING *`,
        [req.user.email, full_name, phone_number, role || 'client', membership_tier || 'Standard', req.user.id]
      );
      return res.json({ profile: result.rows[0] });
    }
    const result = await pool.query(
      `INSERT INTO profiles (id, email, full_name, phone_number, role, membership_tier)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [req.user.id, req.user.email, full_name || '', phone_number || '', role || 'client', membership_tier || 'Standard']
    );
    res.json({ profile: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
