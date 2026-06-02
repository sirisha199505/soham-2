const express    = require('express');
const bcrypt     = require('bcrypt');
const jwt        = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const pool       = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// ── In-memory OTP store: email → { otp, expiresAt } ──────────────────────────
const otpStore = new Map();
const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes

function createTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
}

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required.' });

  try {
    const result = await pool.query(
      'SELECT id, name FROM users WHERE LOWER(email)=$1',
      [email.trim().toLowerCase()]
    );
    if (result.rowCount === 0) {
      // Return success anyway to avoid email enumeration
      return res.json({ success: true });
    }

    const user = result.rows[0];
    const otp  = String(Math.floor(100000 + Math.random() * 900000));
    otpStore.set(email.trim().toLowerCase(), { otp, expiresAt: Date.now() + OTP_TTL_MS });

    const transporter = createTransporter();
    await transporter.sendMail({
      from:    `"RoboQuiz" <${process.env.EMAIL_USER}>`,
      to:      email.trim(),
      subject: 'Your RoboQuiz Password Reset OTP',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
          <h2 style="color:#1e3a8a">Password Reset OTP</h2>
          <p>Hi ${user.name || 'there'},</p>
          <p>Use the code below to reset your RoboQuiz password. It expires in <strong>5 minutes</strong>.</p>
          <div style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#3BC0EF;
                      background:#f0f9ff;border:2px solid #3BC0EF;border-radius:12px;
                      text-align:center;padding:16px 24px;margin:20px 0">
            ${otp}
          </div>
          <p style="color:#64748b;font-size:13px">If you did not request this, ignore this email.</p>
        </div>
      `,
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Forgot password error:', err.message);
    res.status(500).json({ error: 'Failed to send OTP email. Please check your inbox settings or try again in a moment.' });
  }
});

// POST /api/auth/verify-reset-otp
router.post('/verify-reset-otp', async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json({ error: 'Email and OTP are required.' });

  const key    = email.trim().toLowerCase();
  const stored = otpStore.get(key);

  if (!stored)                        return res.status(400).json({ error: 'No OTP was requested for this email. Please request a new one.' });
  if (Date.now() > stored.expiresAt)  { otpStore.delete(key); return res.status(400).json({ error: 'OTP has expired. Please request a new one.' }); }
  if (stored.otp !== String(otp).trim()) return res.status(400).json({ error: 'Incorrect OTP. Please try again.' });

  otpStore.delete(key);

  // Issue a short-lived reset token (10 min)
  const userRes = await pool.query('SELECT id FROM users WHERE LOWER(email)=$1', [key]);
  if (userRes.rowCount === 0) return res.status(404).json({ error: 'User not found.' });

  const resetToken = jwt.sign(
    { userId: userRes.rows[0].id, purpose: 'password_reset' },
    process.env.JWT_SECRET,
    { expiresIn: '10m' }
  );

  res.json({ resetToken });
});

// POST /api/auth/reset-password-token
router.post('/reset-password-token', async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) return res.status(400).json({ error: 'Token and new password are required.' });
  if (newPassword.length < 6)  return res.status(400).json({ error: 'Password must be at least 6 characters.' });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.purpose !== 'password_reset') return res.status(400).json({ error: 'Invalid reset token.' });

    const hash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password_hash=$1 WHERE id=$2', [hash, payload.userId]);
    res.json({ success: true });
  } catch (err) {
    if (err.name === 'TokenExpiredError') return res.status(400).json({ error: 'Reset link has expired. Please start again.' });
    res.status(400).json({ error: 'Invalid or expired reset token.' });
  }
});

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
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
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
        const errMsg = key.includes('@')
          ? 'Invalid admin email or password.'
          : 'Invalid Student ID or password.';
        return res.status(401).json({ error: errMsg });
      }
      user = idRes.rows[0];
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      const isStudent = user.role === 'student' || user.role === 0;
      return res.status(401).json({
        error: isStudent ? 'Invalid Student ID or password.' : 'Invalid admin email or password.',
      });
    }

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

// POST /api/auth/reset-password — student password reset via unique ID + school/class verification
router.post('/reset-password', async (req, res) => {
  const { uniqueId, schoolName, className, newPassword } = req.body;

  if (!uniqueId || !newPassword || newPassword.length < 4) {
    return res.status(400).json({ error: 'Student ID and a password of at least 6 characters are required.' });
  }

  try {
    const result = await pool.query(
      "SELECT * FROM users WHERE unique_id=$1 AND role='student'",
      [uniqueId.trim()]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Student ID not found.' });
    }

    const user = result.rows[0];

    // Verify school name and class name match (case-insensitive, trimmed)
    const normalize = s => (s || '').toLowerCase().trim();
    if (
      normalize(user.school_name) !== normalize(schoolName) ||
      normalize(user.class_name)  !== normalize(className)
    ) {
      return res.status(401).json({ error: 'School name or class name does not match our records.' });
    }

    const hash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password_hash=$1 WHERE unique_id=$2', [hash, uniqueId.trim()]);

    res.json({ success: true });
  } catch (err) {
    console.error('Reset password error:', err.message);
    res.status(500).json({ error: 'Password reset failed.' });
  }
});

module.exports = router;
