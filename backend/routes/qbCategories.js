const express = require('express');
const pool    = require('../db');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /api/qb-categories?levelId=X
router.get('/', requireAdmin, async (req, res) => {
  const { levelId } = req.query;
  try {
    const result = levelId
      ? await pool.query('SELECT * FROM qb_categories WHERE level_id=$1 ORDER BY created_at ASC', [levelId])
      : await pool.query('SELECT * FROM qb_categories ORDER BY created_at ASC');
    res.json(result.rows.map(r => ({ id: r.id, levelId: r.level_id, bankId: r.bank_id, name: r.name, createdAt: r.created_at })));
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Failed to fetch categories.' });
  }
});

// POST /api/qb-categories
router.post('/', requireAdmin, async (req, res) => {
  const { levelId, bankId, name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'name is required.' });
  try {
    const result = await pool.query(
      'INSERT INTO qb_categories (level_id, bank_id, name) VALUES ($1,$2,$3) RETURNING *',
      [levelId || null, bankId || null, name.trim()]
    );
    const r = result.rows[0];
    res.status(201).json({ id: r.id, levelId: r.level_id, bankId: r.bank_id, name: r.name, createdAt: r.created_at });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Failed to create category.' });
  }
});

// PUT /api/qb-categories/:id
router.put('/:id', requireAdmin, async (req, res) => {
  const { name } = req.body;
  try {
    await pool.query('UPDATE qb_categories SET name=$1 WHERE id=$2', [name, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Failed to update category.' });
  }
});

// DELETE /api/qb-categories/:id
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM qb_categories WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Failed to delete category.' });
  }
});

module.exports = router;
