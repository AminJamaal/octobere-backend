import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { pool } from '../config.js';

const router = Router();

router.get('/', requireAuth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM profiles WHERE id = $1', [req.user.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/', requireAuth, async (req, res) => {
  try {
    const { full_name, phone_number, address, avatar_url, membership_tier, favorites } = req.body;
    const result = await pool.query(
      `UPDATE profiles SET
        full_name = COALESCE($1, full_name),
        phone_number = COALESCE($2, phone_number),
        address = COALESCE($3, address),
        avatar_url = COALESCE($4, avatar_url),
        membership_tier = COALESCE($5, membership_tier),
        favorites = COALESCE($6, favorites),
        updated_at = NOW()
       WHERE id = $7 RETURNING *`,
      [full_name, phone_number, address, avatar_url, membership_tier, favorites ? JSON.stringify(favorites) : null, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    await pool.query(
      'INSERT INTO audit_logs (user_id, action, details) VALUES ($1, $2, $3)',
      [req.user.id, 'profile_update', 'Updated profile']
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
