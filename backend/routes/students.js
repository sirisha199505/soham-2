const express = require('express');
const pool    = require('../db');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /api/students — list all students + trainers with per-level progress (admin)
router.get('/', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         u.id,
         u.unique_id,
         u.name,
         u.email,
         u.role,
         u.school_name,
         u.class_name,
         u.created_at,
         (SELECT COUNT(*) FROM quiz_attempts WHERE user_id = u.id) AS attempts_count,
         (
           SELECT json_agg(
             json_build_object(
               'levelId',     lp.level_id,
               'status',      lp.status,
               'score',       COALESCE(
                                (SELECT qa.score
                                 FROM quiz_attempts qa
                                 WHERE qa.user_id = u.id
                                   AND qa.level_id = lp.level_id
                                   AND qa.score IS NOT NULL
                                 ORDER BY (qa.score->>'pct')::int DESC NULLS LAST
                                 LIMIT 1),
                                lp.score
                              ),
               'completedAt', lp.completed_at
             )
           )
           FROM level_progress lp
           WHERE lp.user_id = u.id
         ) AS level_progress
       FROM users u
       WHERE u.role IN ('student', 'coach')
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
        name:            r.name,
        email:           r.email,
        role:            r.role || 'student',
        schoolName:      r.school_name,
        className:       r.class_name,
        createdAt:       r.created_at,
        attemptsCount:   parseInt(r.attempts_count) || 0,
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
