const express = require('express');
const pool    = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

const CATEGORIES    = ['robotics', 'chemistry', 'physics', 'mathematics'];
const VALID_AF      = ['student', 'trainer', 'both'];

function sanitizeAF(val) {
  return VALID_AF.includes(val) ? val : 'both';
}

// GET /api/questions/bank — all questions grouped by category
router.get('/bank', requireAuth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM questions ORDER BY bank_name, category, created_at');
    const bank = {};
    CATEGORIES.forEach(c => { bank[c] = []; });
    result.rows.forEach(r => {
      if (!bank[r.category]) bank[r.category] = [];
      bank[r.category].push(rowToQuestion(r));
    });
    res.json(bank);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Failed to fetch question bank.' });
  }
});

// GET /api/questions — all questions flat, optional ?categoryId=X filter (admin)
router.get('/', requireAdmin, async (req, res) => {
  try {
    const { categoryId } = req.query;
    const result = categoryId
      ? await pool.query('SELECT * FROM questions WHERE qb_category_id=$1 ORDER BY created_at', [categoryId])
      : await pool.query('SELECT * FROM questions ORDER BY category, created_at');
    res.json(result.rows.map(rowToQuestion));
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Failed to fetch questions.' });
  }
});

// POST /api/questions — add question (admin)
router.post('/', requireAdmin, async (req, res) => {
  const q = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO questions
         (id, category, bank_name, type, text, image_url, options, correct_answer,
          pairs, explanation, difficulty, status, applicable_for, qb_category_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       ON CONFLICT (id) DO UPDATE
       SET category=$2, bank_name=$3, type=$4, text=$5, image_url=$6, options=$7,
           correct_answer=$8, pairs=$9, explanation=$10, difficulty=$11, status=$12,
           applicable_for=$13, qb_category_id=$14
       RETURNING *`,
      [
        q.id, q.category, q.bankName || 'Question Bank', q.type,
        q.text || null, q.imageUrl || null,
        q.options ? JSON.stringify(q.options) : null,
        q.correct ?? null,
        q.pairs ? JSON.stringify(q.pairs) : null,
        q.explanation || null,
        q.difficulty || 'medium',
        q.status || 'active',
        sanitizeAF(q.applicableFor),
        q.qbCategoryId || null,
      ]
    );
    res.status(201).json(rowToQuestion(result.rows[0]));
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Failed to add question.' });
  }
});

// PUT /api/questions/:id — update question (admin)
router.put('/:id', requireAdmin, async (req, res) => {
  const q = req.body;
  try {
    await pool.query(
      `UPDATE questions
       SET category=$2, bank_name=$3, type=$4, text=$5, image_url=$6, options=$7,
           correct_answer=$8, pairs=$9, explanation=$10, difficulty=$11, status=$12,
           applicable_for=$13
       WHERE id=$1`,
      [
        req.params.id, q.category, q.bankName || 'Question Bank', q.type,
        q.text || null, q.imageUrl || null,
        q.options ? JSON.stringify(q.options) : null,
        q.correct ?? null,
        q.pairs ? JSON.stringify(q.pairs) : null,
        q.explanation || null,
        q.difficulty || 'medium',
        q.status || 'active',
        sanitizeAF(q.applicableFor),
      ]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Failed to update question.' });
  }
});

// DELETE /api/questions/:id (admin)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM questions WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Failed to delete question.' });
  }
});

// POST /api/questions/seed — bulk seed defaults (only inserts if table is empty)
router.post('/seed', requireAuth, async (req, res) => {
  try {
    const count = await pool.query('SELECT COUNT(*) FROM questions');
    if (parseInt(count.rows[0].count) > 0) {
      return res.json({ seeded: false, message: 'Questions already exist.' });
    }

    const questions = req.body;
    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ error: 'No questions provided.' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const q of questions) {
        await client.query(
          `INSERT INTO questions
             (id, category, bank_name, type, text, image_url, options, correct_answer,
              pairs, explanation, difficulty, status, applicable_for)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
           ON CONFLICT (id) DO NOTHING`,
          [
            q.id, q.category, q.bankName || 'Question Bank', q.type,
            q.text || null, q.imageUrl || null,
            q.options ? JSON.stringify(q.options) : null,
            q.correct ?? null,
            q.pairs ? JSON.stringify(q.pairs) : null,
            q.explanation || null,
            q.difficulty || 'medium',
            q.status || 'active',
            sanitizeAF(q.applicableFor),
          ]
        );
      }
      await client.query('COMMIT');
      res.json({ seeded: true, count: questions.length });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Seed error:', err.message);
    res.status(500).json({ error: 'Failed to seed questions.' });
  }
});

function rowToQuestion(r) {
  return {
    id:            r.id,
    category:      r.category,
    bankName:      r.bank_name || 'Question Bank',
    type:          r.type,
    text:          r.text,
    imageUrl:      r.image_url,
    options:       r.options,
    correct:       r.correct_answer,
    pairs:         r.pairs,
    explanation:   r.explanation,
    difficulty:    r.difficulty,
    status:        r.status,
    applicableFor: r.applicable_for || 'both',
  };
}

module.exports = router;
