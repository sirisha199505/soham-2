const express = require('express');
const pool    = require('../db');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /api/monitoring/sessions — real sessions derived from recent quiz_attempts
router.get('/sessions', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         qa.id,
         u.unique_id,
         qa.level_id,
         qa.attempted_at,
         COALESCE(jsonb_array_length(qa.answers),   0) AS answered,
         COALESCE(jsonb_array_length(qa.questions),  10) AS total,
         qa.score
       FROM quiz_attempts qa
       JOIN users u ON u.id = qa.user_id
       WHERE qa.attempted_at > NOW() - INTERVAL '2 hours'
       ORDER BY qa.attempted_at DESC`
    );

    const sessions = result.rows.map(r => {
      const elapsed   = Math.floor((Date.now() - new Date(r.attempted_at).getTime()) / 1000);
      const hasScore  = r.score && Object.keys(r.score).length > 0;
      const status    = hasScore ? 'completed'
                      : elapsed > 900 ? 'abandoned'
                      : 'active';
      return {
        id:        r.id,
        studentId: r.unique_id,
        level:     r.level_id,
        startTime: r.attempted_at,
        answered:  Number(r.answered),
        total:     Number(r.total),
        elapsed,
        status,
      };
    });

    res.json(sessions);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Failed to fetch sessions.' });
  }
});

module.exports = router;
