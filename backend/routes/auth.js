const express    = require('express');
const bcrypt     = require('bcrypt');
const jwt        = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const pool       = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// ── In-memory OTP store keyed by "phone:<number>" or "email:<address>" ────────
const otpStore = new Map();
const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes

// ── Send email OTP ─────────────────────────────────────────────────────────────
async function sendEmailOtp(toEmail, name, otp) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });
  await transporter.sendMail({
    from:    `"RoboQuiz" <${process.env.EMAIL_USER}>`,
    to:      toEmail,
    subject: 'Your RoboQuiz Password Reset OTP',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h2 style="color:#1e3a8a">Password Reset OTP</h2>
        <p>Hi ${name || 'there'},</p>
        <p>Use the code below to reset your RoboQuiz password. It expires in <strong>5 minutes</strong>.</p>
        <div style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#3BC0EF;
                    background:#f0f9ff;border:2px solid #3BC0EF;border-radius:12px;
                    text-align:center;padding:16px 24px;margin:20px 0">${otp}</div>
        <p style="color:#64748b;font-size:13px">If you did not request this, ignore this email.</p>
      </div>`,
  });
}

// ── Send SMS OTP (MSG91 — set SMS_API_KEY + SMS_SENDER_ID in .env) ─────────────
async function sendSmsOtp(phone, otp) {
  const apiKey = process.env.SMS_API_KEY;
  if (!apiKey) {
    // Dev fallback — log to console when no SMS credentials are configured
    console.log(`[SMS-DEV] OTP for ${phone}: ${otp}`);
    return;
  }
  const sender  = process.env.SMS_SENDER_ID || 'ROBQIZ';
  const message = encodeURIComponent(`Your RoboQuiz OTP is ${otp}. Valid for 5 minutes. Do not share with anyone.`);
  const url = `https://api.msg91.com/api/sendotp.php?authkey=${apiKey}&mobile=91${phone}&message=${message}&sender=${sender}&otp=${otp}`;
  const https = require('https');
  await new Promise((resolve, reject) => {
    https.get(url, res => {
      res.on('data', () => {});
      res.on('end', resolve);
    }).on('error', reject);
  });
}

// ── POST /api/auth/forgot-password ─────────────────────────────────────────────
// Body: { contact }  — contact is a phone number (10 digits) OR an email address
router.post('/forgot-password', async (req, res) => {
  const { contact } = req.body;
  if (!contact) return res.status(400).json({ error: 'Phone number or email is required.' });

  const cleanPhone = contact.replace(/\D/g, '');
  const isPhone    = cleanPhone.length >= 10 && !contact.includes('@');

  try {
    let user;
    if (isPhone) {
      const r = await pool.query('SELECT id, name, phone_number FROM users WHERE phone_number=$1', [cleanPhone]);
      if (r.rowCount > 0) user = r.rows[0];
    } else {
      const r = await pool.query('SELECT id, name, email FROM users WHERE LOWER(email)=$1', [contact.trim().toLowerCase()]);
      if (r.rowCount > 0) user = r.rows[0];
    }

    // Always return success to avoid contact enumeration
    if (!user) return res.json({ success: true });

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const key = isPhone ? `phone:${cleanPhone}` : `email:${contact.trim().toLowerCase()}`;
    otpStore.set(key, { otp, expiresAt: Date.now() + OTP_TTL_MS, userId: user.id });

    if (isPhone) {
      await sendSmsOtp(cleanPhone, otp);
    } else {
      await sendEmailOtp(contact.trim(), user.name, otp);
    }

    res.json({ success: true, via: isPhone ? 'sms' : 'email' });
  } catch (err) {
    console.error('Forgot password error:', err.message);
    res.status(500).json({ error: isPhone
      ? 'Failed to send OTP SMS. Please try again.'
      : 'Failed to send OTP email. Please try again.' });
  }
});

// ── POST /api/auth/verify-reset-otp ────────────────────────────────────────────
router.post('/verify-reset-otp', async (req, res) => {
  const { contact, otp } = req.body;
  if (!contact || !otp) return res.status(400).json({ error: 'Contact and OTP are required.' });

  const cleanPhone = contact.replace(/\D/g, '');
  const isPhone    = cleanPhone.length >= 10 && !contact.includes('@');
  const key        = isPhone ? `phone:${cleanPhone}` : `email:${contact.trim().toLowerCase()}`;
  const stored     = otpStore.get(key);

  if (!stored)                           return res.status(400).json({ error: 'No OTP was requested. Please request a new one.' });
  if (Date.now() > stored.expiresAt)     { otpStore.delete(key); return res.status(400).json({ error: 'OTP has expired. Please request a new one.' }); }
  if (stored.otp !== String(otp).trim()) return res.status(400).json({ error: 'Incorrect OTP. Please try again.' });

  otpStore.delete(key);

  const resetToken = jwt.sign(
    { userId: stored.userId, purpose: 'password_reset' },
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
  const { studentName, schoolName, className, phoneNumber, email, password } = req.body;
  if (!password || password.length < 4)
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });

  const cleanPhone = (phoneNumber || '').replace(/\D/g, '') || null;

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
      `INSERT INTO users (unique_id, name, role, school_name, class_name, phone_number, email, password_hash)
       VALUES ($1,$2,'student',$3,$4,$5,$6,$7) RETURNING id, unique_id, role, name`,
      [uniqueId, studentName || '', schoolName || '', className || '',
       cleanPhone, email?.trim().toLowerCase() || null, hash]
    );
    const user = result.rows[0];
    res.status(201).json({
      uniqueId: user.unique_id,
      token:    makeToken(user),
      user: {
        id:       user.unique_id,
        uniqueId: user.unique_id,
        name:     user.name,
        role:     user.role,
      },
    });
  } catch (err) {
    console.error('Register error:', err.message);
    if (err.code === '23505') {
      if (err.constraint?.includes('phone'))
        return res.status(400).json({ error: 'This phone number is already registered.' });
      if (err.constraint?.includes('email'))
        return res.status(400).json({ error: 'This email is already registered.' });
    }
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
    const key        = identifier.trim().toLowerCase();
    const cleanPhone = identifier.replace(/\D/g, '');
    let user;

    // 1. Try email match (all roles)
    const emailRes = await pool.query('SELECT * FROM users WHERE LOWER(email)=$1', [key]);
    if (emailRes.rowCount > 0) {
      user = emailRes.rows[0];
    }

    // 2. Try phone number (students & trainers)
    if (!user && cleanPhone.length >= 10) {
      const phoneRes = await pool.query(
        "SELECT * FROM users WHERE phone_number=$1 AND role IN ('student','coach','teacher')",
        [cleanPhone]
      );
      if (phoneRes.rowCount > 0) user = phoneRes.rows[0];
    }

    // 3. Try unique_id (students)
    if (!user) {
      const idRes = await pool.query('SELECT * FROM users WHERE unique_id=$1', [identifier.trim()]);
      if (idRes.rowCount > 0) user = idRes.rows[0];
    }

    if (!user) {
      const errMsg = key.includes('@')
        ? 'No account found with this email.'
        : 'Invalid credentials. Please check your phone, email, or Student ID.';
      return res.status(401).json({ error: errMsg });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Incorrect password. Please try again.' });
    }

    const token = makeToken(user);
    res.json({
      token,
      user: {
        id:          user.unique_id || String(user.id), // unique_id so frontend userId matches WHERE unique_id=$1
        uniqueId:    user.unique_id,
        email:       user.email,
        name:        user.name,
        role:        user.role,
        phoneNumber: user.phone_number,
        schoolName:  user.school_name,
        className:   user.class_name,
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
      'SELECT id, unique_id, email, name, role, school_name, class_name, phone_number FROM users WHERE id=$1',
      [req.user.id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'User not found.' });
    const u = result.rows[0];
    res.json({
      id:          u.unique_id || String(u.id), // same as login — frontend userId must match unique_id
      uniqueId:    u.unique_id,
      email:       u.email,
      name:        u.name,
      role:        u.role,
      schoolName:  u.school_name,
      className:   u.class_name,
      phoneNumber: u.phone_number,
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
