const express = require('express');
const bcrypt  = require('bcrypt');
const jwt     = require('jsonwebtoken');
const pool    = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Generate 8-digit numeric unique ID
function generateUniqueId() {
  const ts   = Date.now() % 10000;
  const rand = Math.floor(Math.random() * 10000);
  return String(ts * 10000 + rand).padStart(8, '0');
}

function makeToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, uniqueId: user.unique_id, email: user.email, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// POST /api/auth/register — student registration
router.post('/register', async (req, res) => {
  const { schoolName, className, password } = req.body;
  if (!password || password.length < 4) {
    return res.status(400).json({ error: 'Password must be at least 4 characters.' });
  }

  try {
    const hash = await bcrypt.hash(password, 10);

    // Generate unique ID, retry on collision
    let uniqueId, tries = 0;
    while (tries < 10) {
      uniqueId = generateUniqueId();
      const check = await pool.query('SELECT 1 FROM users WHERE unique_id=$1', [uniqueId]);
      if (check.rowCount === 0) break;
      tries++;
    }

    const result = await pool.query(
      `INSERT INTO users (unique_id, role, school_name, class_name, password_hash)
       VALUES ($1, 'student', $2, $3, $4) RETURNING id, unique_id, role`,
      [uniqueId, schoolName || '', className || '', hash]
    );
    const user = result.rows[0];
    res.status(201).json({ uniqueId: user.unique_id, token: makeToken(user) });
  } catch (err) {
    console.error('Register error:', err.message);
    res.status(500).json({ error: 'Registration failed.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { identifier, password } = req.body;
  if (!identifier || !password) {
    return res.status(400).json({ error: 'Identifier and password are required.' });
  }

  try {
    const key = identifier.trim().toLowerCase();
    let user;

    // Try email (staff)
    const emailRes = await pool.query('SELECT * FROM users WHERE LOWER(email)=$1', [key]);
    if (emailRes.rowCount > 0) {
      user = emailRes.rows[0];
    } else {
      // Try student unique_id
      const idRes = await pool.query('SELECT * FROM users WHERE unique_id=$1', [identifier.trim()]);
      if (idRes.rowCount === 0) {
        return res.status(401).json({ error: 'Invalid ID or password.' });
      }
      user = idRes.rows[0];
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ error: 'Incorrect password.' });

    const token = makeToken(user);
    res.json({
      token,
      user: {
        id:       user.id,
        uniqueId: user.unique_id,
        email:    user.email,
        name:     user.name,
        role:     user.role,
      },
    });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ error: 'Login failed.' });
  }
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, unique_id, email, name, role, school_name, class_name FROM users WHERE id=$1',
      [req.user.id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'User not found.' });
    const u = result.rows[0];
    res.json({
      id:         u.id,
      uniqueId:   u.unique_id,
      email:      u.email,
      name:       u.name,
      role:       u.role,
      schoolName: u.school_name,
      className:  u.class_name,
    });
  } catch (err) {
    console.error('Me error:', err.message);
    res.status(500).json({ error: 'Failed to fetch user.' });
  }
});

module.exports = router;
