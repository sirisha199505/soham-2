const express = require('express');
const pool    = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// ── Level Settings ─────────────────────────────────────────────────────────

// GET /api/levels/settings
router.get('/settings', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM level_settings ORDER BY level_id');
    const settings = {};
    result.rows.forEach(r => {
      settings[r.level_id] = {
        title:       r.title,
        subtitle:    r.subtitle,
        description: r.description,
        timeLimit:   r.time_limit,
        active:      r.active,
      };
    });
    res.json(settings);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Failed to fetch level settings.' });
  }
});

// PUT /api/levels/settings/:levelId (admin)
router.put('/settings/:levelId', requireAdmin, async (req, res) => {
  const { levelId } = req.params;
  const { title, subtitle, description, timeLimit, active } = req.body;
  try {
    await pool.query(
      `INSERT INTO level_settings (level_id, title, subtitle, description, time_limit, active)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (level_id) DO UPDATE
       SET title=$2, subtitle=$3, description=$4, time_limit=$5, active=$6`,
      [levelId, title, subtitle, description, timeLimit, active]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Failed to save level settings.' });
  }
});

// ── Level Progress ─────────────────────────────────────────────────────────

// GET /api/levels/progress/:userId
router.get('/progress/:userId', requireAuth, async (req, res) => {
  try {
    const userRes = await pool.query(
      'SELECT id FROM users WHERE unique_id=$1', [req.params.userId]
    );
    if (userRes.rowCount === 0) return res.json({});

    const dbUserId = userRes.rows[0].id;
    const [progressResult, approvalsResult] = await Promise.all([
      pool.query(
        `SELECT lp.*,
                (SELECT qa.score
                 FROM quiz_attempts qa
                 WHERE qa.user_id = lp.user_id
                   AND qa.level_id = lp.level_id
                   AND qa.score IS NOT NULL
                 ORDER BY (qa.score->>'pct')::int DESC NULLS LAST
                 LIMIT 1) AS best_attempt_score
         FROM level_progress lp
         WHERE lp.user_id = $1`,
        [dbUserId]
      ),
      pool.query('SELECT level_id, status FROM level_approvals WHERE user_id=$1', [dbUserId]),
    ]);

    const progress = {};
    progressResult.rows.forEach(r => {
      progress[r.level_id] = {
        status:          r.status,
        score:           r.best_attempt_score || r.score,
        lastScore:       r.last_score,
        completedAt:     r.completed_at,
        lastCompletedAt: r.last_completed_at,
        contentRead:     r.content_read,
      };
    });

    // Merge approval status so students can see pending/approved/rejected
    approvalsResult.rows.forEach(r => {
      if (!progress[r.level_id]) progress[r.level_id] = {};
      progress[r.level_id].approvalStatus = r.status;
    });

    res.json(progress);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Failed to fetch progress.' });
  }
});

// POST /api/levels/progress/:userId/:levelId/complete
router.post('/progress/:userId/:levelId/complete', requireAuth, async (req, res) => {
  const { userId, levelId } = req.params;
  const { score } = req.body;
  try {
    const userRes = await pool.query('SELECT id FROM users WHERE unique_id=$1', [userId]);
    if (userRes.rowCount === 0) return res.status(404).json({ error: 'User not found.' });
    const dbUserId = userRes.rows[0].id;
    const now = new Date().toISOString();

    // Get existing progress to compare scores
    const existing = await pool.query(
      'SELECT score, completed_at FROM level_progress WHERE user_id=$1 AND level_id=$2',
      [dbUserId, levelId]
    );

    let bestScore = score;
    let firstCompletedAt = now;
    if (existing.rowCount > 0 && existing.rows[0].score) {
      const prev = existing.rows[0].score;
      firstCompletedAt = existing.rows[0].completed_at || now;
      bestScore = (score.pct >= (prev.pct ?? -1)) ? score : prev;
    }

    await pool.query(
      `INSERT INTO level_progress (user_id, level_id, status, score, last_score, completed_at, last_completed_at)
       VALUES ($1,$2,'completed',$3,$4,$5,$6)
       ON CONFLICT (user_id, level_id) DO UPDATE
       SET status='completed', score=$3, last_score=$4, completed_at=$5, last_completed_at=$6`,
      [dbUserId, levelId, JSON.stringify(bestScore), JSON.stringify(score), firstCompletedAt, now]
    );

    // Auto-create pending approval for next level
    const nextLevel = parseInt(levelId) + 1;
    if (nextLevel <= 3) {
      await pool.query(
        `INSERT INTO level_approvals (user_id, level_id, status)
         VALUES ($1,$2,'pending')
         ON CONFLICT (user_id, level_id) DO NOTHING`,
        [dbUserId, nextLevel]
      );
    }

    res.json({ success: true });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Failed to record completion.' });
  }
});

// DELETE /api/levels/progress/:userId (admin) — reset all progress for a student
router.delete('/progress/:userId', requireAdmin, async (req, res) => {
  try {
    const userRes = await pool.query('SELECT id FROM users WHERE unique_id=$1', [req.params.userId]);
    if (userRes.rowCount === 0) return res.status(404).json({ error: 'User not found.' });
    const dbUserId = userRes.rows[0].id;
    await pool.query('DELETE FROM level_progress WHERE user_id=$1', [dbUserId]);
    await pool.query('DELETE FROM level_approvals WHERE user_id=$1', [dbUserId]);
    res.json({ success: true });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Failed to reset progress.' });
  }
});

// POST /api/levels/progress/:userId/:levelId/content-read
router.post('/progress/:userId/:levelId/content-read', requireAuth, async (req, res) => {
  const { userId, levelId } = req.params;
  try {
    const userRes = await pool.query('SELECT id FROM users WHERE unique_id=$1', [userId]);
    if (userRes.rowCount === 0) return res.status(404).json({ error: 'User not found.' });
    const dbUserId = userRes.rows[0].id;
    await pool.query(
      `INSERT INTO level_progress (user_id, level_id, content_read)
       VALUES ($1,$2,TRUE)
       ON CONFLICT (user_id, level_id) DO UPDATE SET content_read=TRUE`,
      [dbUserId, levelId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Failed to mark content read.' });
  }
});

// ── Approvals ──────────────────────────────────────────────────────────────

// GET /api/levels/approvals (admin)
router.get('/approvals', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.unique_id, a.level_id, a.status
       FROM level_approvals a
       JOIN users u ON u.id = a.user_id`
    );
    const approvals = {};
    result.rows.forEach(r => {
      if (!approvals[r.unique_id]) approvals[r.unique_id] = {};
      approvals[r.unique_id][r.level_id] = r.status;
    });
    res.json(approvals);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Failed to fetch approvals.' });
  }
});

// PUT /api/levels/approvals/:userId/:levelId (admin)
router.put('/approvals/:userId/:levelId', requireAdmin, async (req, res) => {
  const { userId, levelId } = req.params;
  const { status } = req.body; // 'pending' | 'approved' | 'rejected'
  try {
    const userRes = await pool.query('SELECT id FROM users WHERE unique_id=$1', [userId]);
    if (userRes.rowCount === 0) return res.status(404).json({ error: 'User not found.' });
    const dbUserId = userRes.rows[0].id;
    await pool.query(
      `INSERT INTO level_approvals (user_id, level_id, status)
       VALUES ($1,$2,$3)
       ON CONFLICT (user_id, level_id) DO UPDATE SET status=$3`,
      [dbUserId, levelId, status]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Failed to update approval.' });
  }
});

// ── Overrides ──────────────────────────────────────────────────────────────

// GET /api/levels/overrides (admin)
router.get('/overrides', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.unique_id, o.level_id
       FROM level_overrides o JOIN users u ON u.id=o.user_id`
    );
    const overrides = {};
    result.rows.forEach(r => {
      if (!overrides[r.unique_id]) overrides[r.unique_id] = [];
      overrides[r.unique_id].push(r.level_id);
    });
    res.json(overrides);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Failed to fetch overrides.' });
  }
});

// POST /api/levels/overrides/:userId/:levelId (admin)
router.post('/overrides/:userId/:levelId', requireAdmin, async (req, res) => {
  const { userId, levelId } = req.params;
  try {
    const userRes = await pool.query('SELECT id FROM users WHERE unique_id=$1', [userId]);
    if (userRes.rowCount === 0) return res.status(404).json({ error: 'User not found.' });
    const dbUserId = userRes.rows[0].id;
    await pool.query(
      'INSERT INTO level_overrides (user_id, level_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
      [dbUserId, levelId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Failed to set override.' });
  }
});

// ── Global Access ──────────────────────────────────────────────────────────

// GET /api/levels/global-access
router.get('/global-access', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM global_level_access');
    const access = {};
    result.rows.forEach(r => { access[r.level_id] = r.open; });
    res.json(access);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Failed to fetch global access.' });
  }
});

// PUT /api/levels/global-access/:levelId (admin)
router.put('/global-access/:levelId', requireAdmin, async (req, res) => {
  const { levelId } = req.params;
  const { open } = req.body;
  try {
    await pool.query(
      `INSERT INTO global_level_access (level_id, open) VALUES ($1,$2)
       ON CONFLICT (level_id) DO UPDATE SET open=$2`,
      [levelId, open]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Failed to update global access.' });
  }
});

module.exports = router;
