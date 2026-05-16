import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { pool } from '../config.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM website_sections ORDER BY order_index ASC');
    const sections = await Promise.all(result.rows.map(async (section) => {
      const [texts, cards, items] = await Promise.all([
        pool.query('SELECT * FROM website_text_contents WHERE section_id = $1 ORDER BY id', [section.id]),
        pool.query('SELECT * FROM website_cards WHERE section_id = $1 ORDER BY order_index ASC', [section.id]),
        pool.query('SELECT * FROM website_simple_items WHERE section_id = $1 ORDER BY order_index ASC', [section.id]),
      ]);
      return { ...section, texts: texts.rows, cards: cards.rows, items: items.rows };
    }));
    res.json(sections);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', requireAuth, requireRole('admin', 'superadmin', 'staff'), async (req, res) => {
  try {
    const { display_name, order_index } = req.body;
    const result = await pool.query(
      'UPDATE website_sections SET display_name = COALESCE($1, display_name), order_index = COALESCE($2, order_index) WHERE id = $3 RETURNING *',
      [display_name, order_index, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Section not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id/texts/:textId', requireAuth, requireRole('admin', 'superadmin', 'staff'), async (req, res) => {
  try {
    const { value } = req.body;
    const result = await pool.query(
      'UPDATE website_text_contents SET value = $1 WHERE id = $2 AND section_id = $3 RETURNING *',
      [value, req.params.textId, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Text not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/texts', requireAuth, requireRole('admin', 'superadmin', 'staff'), async (req, res) => {
  try {
    const { component_slug, value } = req.body;
    const result = await pool.query(
      'INSERT INTO website_text_contents (section_id, component_slug, value) VALUES ($1, $2, $3) RETURNING *',
      [req.params.id, component_slug, value]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id/cards/:cardId', requireAuth, requireRole('admin', 'superadmin', 'staff'), async (req, res) => {
  try {
    const { title, description, image_url, order_index } = req.body;
    const result = await pool.query(
      `UPDATE website_cards SET title = COALESCE($1, title), description = COALESCE($2, description),
       image_url = COALESCE($3, image_url),
       order_index = COALESCE($4, order_index) WHERE id = $5 AND section_id = $6 RETURNING *`,
      [title, description, image_url, order_index, req.params.cardId, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Card not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/cards', requireAuth, requireRole('admin', 'superadmin', 'staff'), async (req, res) => {
  try {
    const { title, description, image_url, order_index } = req.body;
    const result = await pool.query(
      'INSERT INTO website_cards (section_id, title, description, image_url, order_index) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [req.params.id, title, description, image_url, order_index || 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id/cards/:cardId', requireAuth, requireRole('admin', 'superadmin', 'staff'), async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM website_cards WHERE id = $1 AND section_id = $2 RETURNING *',
      [req.params.cardId, req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Card not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id/items/:itemId', requireAuth, requireRole('admin', 'superadmin', 'staff'), async (req, res) => {
  try {
    const { value, order_index } = req.body;
    const result = await pool.query(
      `UPDATE website_simple_items SET value = COALESCE($1, value),
       order_index = COALESCE($2, order_index) WHERE id = $3 AND section_id = $4 RETURNING *`,
      [value, order_index, req.params.itemId, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Item not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/items', requireAuth, requireRole('admin', 'superadmin', 'staff'), async (req, res) => {
  try {
    const { value, order_index } = req.body;
    const result = await pool.query(
      'INSERT INTO website_simple_items (section_id, value, order_index) VALUES ($1, $2, $3) RETURNING *',
      [req.params.id, value, order_index || 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
