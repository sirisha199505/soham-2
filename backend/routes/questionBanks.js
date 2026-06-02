const express = require('express');
const pool    = require('../db');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /api/question-banks
router.get('/', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM question_banks ORDER BY created_at ASC');
    res.json(result.rows.map(r => ({ id: r.id, name: r.name, createdAt: r.created_at })));
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Failed to fetch question banks.' });
  }
});

// POST /api/question-banks
router.post('/', requireAdmin, async (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Name is required.' });
  try {
    const result = await pool.query(
      'INSERT INTO question_banks (name) VALUES ($1) RETURNING *',
      [name.trim()]
    );
    const r = result.rows[0];
    res.status(201).json({ id: r.id, name: r.name, createdAt: r.created_at });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Failed to create question bank.' });
  }
});

// PUT /api/question-banks/:id
router.put('/:id', requireAdmin, async (req, res) => {
  const { name } = req.body;
  try {
    await pool.query('UPDATE question_banks SET name=$1 WHERE id=$2', [name, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Failed to update question bank.' });
  }
});

// DELETE /api/question-banks/:id
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM question_banks WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Failed to delete question bank.' });
  }
});

module.exports = router;
