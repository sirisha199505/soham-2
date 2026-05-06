const express = require('express');
const pool    = require('../db');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /api/students — list all students with per-level progress (admin)
router.get('/', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.unique_id, u.school_name, u.class_name, u.created_at,
              COUNT(DISTINCT qa.id) AS attempts_count,
              json_agg(
                json_build_object(
                  'levelId', lp.level_id,
                  'status',  lp.status,
                  'score',   lp.score,
                  'completedAt', lp.completed_at
                )
              ) FILTER (WHERE lp.level_id IS NOT NULL) AS level_progress
       FROM users u
       LEFT JOIN quiz_attempts qa ON qa.user_id = u.id
       LEFT JOIN level_progress lp ON lp.user_id = u.id
       WHERE u.role = 'student'
       GROUP BY u.id
       ORDER BY u.created_at DESC`
    );
    res.json(result.rows.map(r => {
      const levelProgress = r.level_progress || [];
      const levels = {};
      levelProgress.forEach(lp => {
        levels[lp.levelId] = {
          status:      lp.status,
          score:       lp.score,
          completedAt: lp.completedAt,
        };
      });
      const levelsCompleted = Object.values(levels).filter(l => l.status === 'completed').length;
      return {
        uniqueId:        r.unique_id,
        schoolName:      r.school_name,
        className:       r.class_name,
        createdAt:       r.created_at,
        attemptsCount:   parseInt(r.attempts_count),
        levelsCompleted,
        levels,
      };
    }));
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Failed to fetch students.' });
  }
});

module.exports = router;
