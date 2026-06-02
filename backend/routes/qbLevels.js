const express = require('express');
const pool    = require('../db');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /api/qb-levels?bankId=X
router.get('/', requireAdmin, async (req, res) => {
  const { bankId } = req.query;
  try {
    const result = bankId
      ? await pool.query('SELECT * FROM qb_levels WHERE bank_id=$1 ORDER BY created_at ASC', [bankId])
      : await pool.query('SELECT * FROM qb_levels ORDER BY created_at ASC');
    res.json(result.rows.map(r => ({ id: r.id, bankId: r.bank_id, name: r.name, createdAt: r.created_at })));
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Failed to fetch levels.' });
  }
});

// POST /api/qb-levels
router.post('/', requireAdmin, async (req, res) => {
  const { bankId, name } = req.body;
  if (!bankId || !name?.trim()) return res.status(400).json({ error: 'bankId and name are required.' });
  try {
    const result = await pool.query(
      'INSERT INTO qb_levels (bank_id, name) VALUES ($1,$2) RETURNING *',
      [bankId, name.trim()]
    );
    const r = result.rows[0];
    res.status(201).json({ id: r.id, bankId: r.bank_id, name: r.name, createdAt: r.created_at });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Failed to create level.' });
  }
});

// PUT /api/qb-levels/:id
router.put('/:id', requireAdmin, async (req, res) => {
  const { name } = req.body;
  try {
    await pool.query('UPDATE qb_levels SET name=$1 WHERE id=$2', [name, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Failed to update level.' });
  }
});

// DELETE /api/qb-levels/:id
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM qb_levels WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Failed to delete level.' });
  }
});

module.exports = router;
