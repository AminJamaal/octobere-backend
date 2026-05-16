import { Router } from 'express';
import { requireAuth, requireRole, optionalAuth } from '../middleware/auth.js';
import { pool } from '../config.js';

const router = Router();

router.get('/:page', optionalAuth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM live_page_content WHERE page_name = $1',
      [req.params.page]
    );
    if (result.rows.length === 0) {
      return res.json({ page_name: req.params.page, content: {} });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:page', requireAuth, requireRole('admin', 'superadmin', 'staff'), async (req, res) => {
  try {
    const { content } = req.body;
    const result = await pool.query(
      `INSERT INTO live_page_content (page_name, content, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (page_name)
       DO UPDATE SET content = $2, updated_at = NOW()
       RETURNING *`,
      [req.params.page, JSON.stringify(content)]
    );
    await pool.query(
      `INSERT INTO live_page_versions (page_name, content, version)
       VALUES ($1, $2, (SELECT COALESCE(MAX(version), 0) + 1 FROM live_page_versions WHERE page_name = $1))`,
      [req.params.page, JSON.stringify(content)]
    );
    await pool.query('INSERT INTO audit_logs (user_id, action, details) VALUES ($1, $2, $3)',
      [req.user.id, 'content_updated', `Updated ${req.params.page} content`]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:page/versions', requireAuth, requireRole('admin', 'superadmin', 'staff'), async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM live_page_versions WHERE page_name = $1 ORDER BY version DESC',
      [req.params.page]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
