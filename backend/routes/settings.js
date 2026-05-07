const express = require('express');
const pool    = require('../db');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

const DEFAULT_LEVEL_CFG = {
  timerMinutes: 10, passingMark: 50, retryLimit: 1,
  randomize: false, locked: false, showHints: false, questionsCount: 10,
};

// GET /api/settings (admin)
router.get('/', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM system_settings WHERE id=1');
    if (result.rowCount === 0) return res.json({});
    const r = result.rows[0];
    const storedLevels = r.level_configs || {};
    res.json({
      quizTimerMinutes:       r.quiz_timer_minutes,
      passingMark:            r.passing_mark,
      retryLimit:             r.retry_limit,
      randomizeQuestions:     r.randomize_questions,
      showResultsImmediately: r.show_results_immediately,
      registrationOpen:       r.registration_open,
      showLeaderboard:        r.show_leaderboard,
      allowSelfReset:         r.allow_self_reset,
      maintenanceMode:        r.maintenance_mode,
      maxStudentsPerClass:    r.max_students_per_class,
      levels: {
        1: { ...DEFAULT_LEVEL_CFG, timerMinutes: 10, passingMark: 50, locked: false, ...(storedLevels[1] || {}) },
        2: { ...DEFAULT_LEVEL_CFG, timerMinutes: 15, passingMark: 60, locked: true,  ...(storedLevels[2] || {}) },
        3: { ...DEFAULT_LEVEL_CFG, timerMinutes: 20, passingMark: 70, locked: true,  ...(storedLevels[3] || {}) },
      },
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Failed to fetch settings.' });
  }
});

// PUT /api/settings (admin)
router.put('/', requireAdmin, async (req, res) => {
  const s = req.body;
  try {
    await pool.query(
      `INSERT INTO system_settings
         (id, quiz_timer_minutes, passing_mark, retry_limit, randomize_questions,
          show_results_immediately, registration_open, show_leaderboard,
          allow_self_reset, maintenance_mode, max_students_per_class, level_configs)
       VALUES (1,$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT (id) DO UPDATE SET
         quiz_timer_minutes=$1, passing_mark=$2, retry_limit=$3,
         randomize_questions=$4, show_results_immediately=$5,
         registration_open=$6, show_leaderboard=$7, allow_self_reset=$8,
         maintenance_mode=$9, max_students_per_class=$10, level_configs=$11`,
      [
        s.quizTimerMinutes ?? 10, s.passingMark ?? 50, s.retryLimit ?? 1,
        s.randomizeQuestions ?? false, s.showResultsImmediately ?? true,
        s.registrationOpen ?? true, s.showLeaderboard ?? false,
        s.allowSelfReset ?? false, s.maintenanceMode ?? false,
        s.maxStudentsPerClass ?? 60, JSON.stringify(s.levels || {}),
      ]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Failed to save settings.' });
  }
});

module.exports = router;
