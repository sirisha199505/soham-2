const express = require('express');
const pool    = require('../db');
const { requireAuth } = require('../middleware/auth');

const router  = express.Router();
const CATEGORIES            = ['robotics', 'chemistry', 'physics', 'mathematics'];
const QUESTIONS_PER_CATEGORY = 5;

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function shuffleOptions(q) {
  if ((q.type !== 'mcq' && q.type !== 'image') || !Array.isArray(q.options)) return q;
  const indices = q.options.map((_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return {
    ...q,
    options: indices.map(i => q.options[i]),
    correct: indices.indexOf(q.correct),
  };
}

// Difficulty mapped per level: Level 1 = easy, Level 2 = medium, Level 3 = hard
const LEVEL_DIFFICULTY = { '1': 'easy', '2': 'medium', '3': 'hard' };

// GET /api/quiz/generate/:userId?level=1
router.get('/generate/:userId', requireAuth, async (req, res) => {
  const { userId } = req.params;
  const levelId    = req.query.level || '';
  const difficulty = LEVEL_DIFFICULTY[levelId] || null;

  try {
    const userRes = await pool.query('SELECT id FROM users WHERE unique_id=$1', [userId]);
    if (userRes.rowCount === 0) return res.status(404).json({ error: 'User not found.' });
    const dbUserId = userRes.rows[0].id;

    // Get already-used question IDs for this student
    const usedRes = await pool.query(
      'SELECT question_id FROM used_questions WHERE user_id=$1', [dbUserId]
    );
    const usedIds = new Set(usedRes.rows.map(r => r.question_id));

    const selected = [];
    for (const cat of CATEGORIES) {
      // Fetch questions filtered by difficulty for this level
      let activeRes;
      if (difficulty) {
        activeRes = await pool.query(
          "SELECT * FROM questions WHERE category=$1 AND status='active' AND difficulty=$2",
          [cat, difficulty]
        );
        // If not enough level-specific questions, fall back to any difficulty
        if (activeRes.rows.length < QUESTIONS_PER_CATEGORY) {
          activeRes = await pool.query(
            "SELECT * FROM questions WHERE category=$1 AND status='active'", [cat]
          );
        }
      } else {
        activeRes = await pool.query(
          "SELECT * FROM questions WHERE category=$1 AND status='active'", [cat]
        );
      }

      const active    = activeRes.rows;
      const available = active.filter(q => !usedIds.has(q.id));

      let source = available.length >= QUESTIONS_PER_CATEGORY ? available : active;
      source = shuffle(source).slice(0, QUESTIONS_PER_CATEGORY);

      source.forEach(r => {
        selected.push(shuffleOptions({
          id:          r.id,
          category:    r.category,
          type:        r.type,
          text:        r.text,
          imageUrl:    r.image_url,
          options:     r.options,
          correct:     r.correct_answer,
          pairs:       r.pairs,
          explanation: r.explanation,
        }));
      });
    }

    res.json(shuffle(selected));
  } catch (err) {
    console.error('Quiz generate error:', err.message);
    res.status(500).json({ error: 'Failed to generate quiz.' });
  }
});

// POST /api/quiz/used/:userId — record used question IDs
router.post('/used/:userId', requireAuth, async (req, res) => {
  const { userId } = req.params;
  const { questionIds } = req.body;
  if (!Array.isArray(questionIds)) return res.status(400).json({ error: 'questionIds must be an array.' });

  try {
    const userRes = await pool.query('SELECT id FROM users WHERE unique_id=$1', [userId]);
    if (userRes.rowCount === 0) return res.status(404).json({ error: 'User not found.' });
    const dbUserId = userRes.rows[0].id;

    // Batch insert, ignore conflicts
    for (const qId of questionIds) {
      await pool.query(
        'INSERT INTO used_questions (user_id, question_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
        [dbUserId, qId]
      );
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Used questions error:', err.message);
    res.status(500).json({ error: 'Failed to record used questions.' });
  }
});

// GET /api/quiz/attempts/:userId
router.get('/attempts/:userId', requireAuth, async (req, res) => {
  const { userId } = req.params;
  try {
    const userRes = await pool.query('SELECT id FROM users WHERE unique_id=$1', [userId]);
    if (userRes.rowCount === 0) return res.json([]);
    const dbUserId = userRes.rows[0].id;

    const result = await pool.query(
      'SELECT * FROM quiz_attempts WHERE user_id=$1 ORDER BY attempted_at DESC',
      [dbUserId]
    );
    res.json(result.rows.map(r => ({
      id:         r.id,
      levelId:    r.level_id,
      levelTitle: r.level_title,
      date:       r.attempted_at,
      questions:  r.questions,
      answers:    r.answers,
      score:      r.score,
    })));
  } catch (err) {
    console.error('Attempts fetch error:', err.message);
    res.status(500).json({ error: 'Failed to fetch attempts.' });
  }
});

// POST /api/quiz/attempts — save a quiz attempt
router.post('/attempts', requireAuth, async (req, res) => {
  const { userId, levelId, levelTitle, questions, answers, score } = req.body;
  try {
    const userRes = await pool.query('SELECT id FROM users WHERE unique_id=$1', [userId]);
    if (userRes.rowCount === 0) return res.status(404).json({ error: 'User not found.' });
    const dbUserId = userRes.rows[0].id;

    const id = `att_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    await pool.query(
      `INSERT INTO quiz_attempts (id, user_id, level_id, level_title, questions, answers, score)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [id, dbUserId, levelId, levelTitle, JSON.stringify(questions), JSON.stringify(answers), JSON.stringify(score)]
    );
    res.status(201).json({ id });
  } catch (err) {
    console.error('Save attempt error:', err.message);
    res.status(500).json({ error: 'Failed to save attempt.' });
  }
});

module.exports = router;
