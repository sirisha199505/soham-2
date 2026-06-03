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
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error('Email is not configured (EMAIL_USER / EMAIL_PASS missing in .env).');
  }
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });
  // Verify the SMTP login up front so a bad/expired App Password fails loudly
  // (Gmail rejects plain passwords with "535 Username and Password not accepted").
  await transporter.verify();
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

// ── Send SMS OTP (MSG91 v5 OTP API) ────────────────────────────────────────────
// Requires SMS_API_KEY (authkey) + SMS_TEMPLATE_ID (DLT-approved template) in .env.
// The template must contain an OTP variable (##OTP##). Sender ID is configured on
// the template in the MSG91 dashboard, so SMS_SENDER_ID is no longer used here.
async function sendSmsOtp(phone, otp) {
  const apiKey     = process.env.SMS_API_KEY;
  const templateId = process.env.SMS_TEMPLATE_ID;

  // Dev fallback — when SMS isn't configured, surface the OTP instead of failing silently.
  if (!apiKey || !templateId) {
    console.log(`[SMS-DEV] OTP for ${phone}: ${otp}  (set SMS_API_KEY + SMS_TEMPLATE_ID in .env to send real SMS)`);
    return;
  }

  const https = require('https');
  const path  = `/api/v5/otp?template_id=${encodeURIComponent(templateId)}`
              + `&mobile=91${phone}&otp=${otp}&authkey=${encodeURIComponent(apiKey)}`;

  const body = await new Promise((resolve, reject) => {
    const apiReq = https.request(
      { hostname: 'control.msg91.com', path, method: 'POST',
        headers: { 'Content-Type': 'application/json' } },
      apiRes => {
        let data = '';
        apiRes.on('data', c => { data += c; });
        apiRes.on('end', () => resolve(data));
      }
    );
    apiReq.on('error', reject);
    apiReq.write(JSON.stringify({ otp }));
    apiReq.end();
  });

  // MSG91 returns HTTP 200 even on errors — the real status is in the JSON `type`.
  let parsed;
  try { parsed = JSON.parse(body); } catch { parsed = { type: 'error', message: body }; }
  if (parsed.type !== 'success') {
    throw new Error(`SMS provider error: ${parsed.message || body || 'unknown error'}`);
  }
}

// ── POST /api/auth/forgot-password ─────────────────────────────────────────────
// Body: { contact }  — contact is a phone number (10 digits) OR an email address
router.post('/forgot-password', async (req, res) => {
  const contact = (req.body.contact || req.body.email || '').trim();
  const role    = req.body.role || 'trainer'; // 'student' | 'trainer'
  if (!contact) return res.status(400).json({ error: 'Phone number or email is required.' });

  const cleanPhone = contact.replace(/\D/g, '');
  const isPhone    = cleanPhone.length >= 10 && !contact.includes('@');

  // Students must use mobile; trainers/admins must use email
  if (role === 'student' && !isPhone)
    return res.status(400).json({ error: 'Students must use their registered mobile number.' });
  if (role === 'trainer' && isPhone)
    return res.status(400).json({ error: 'Trainers and admins must use their registered email address.' });

  try {
    let user;
    let deliveryEmail = null;
    let deliveryPhone = null;

    if (isPhone) {
      // Student lookup by phone
      const r = await pool.query(
        "SELECT id, name, email, phone_number FROM users WHERE phone_number=$1 AND role='student'",
        [cleanPhone]
      );
      if (r.rowCount > 0) {
        user          = r.rows[0];
        deliveryPhone = cleanPhone;
      }
    } else {
      // Trainer / admin lookup by email
      const r = await pool.query(
        "SELECT id, name, email FROM users WHERE LOWER(email)=$1 AND role IN ('coach','teacher','admin','trainer')",
        [contact.toLowerCase()]
      );
      if (r.rowCount > 0) {
        user          = r.rows[0];
        deliveryEmail = user.email;
      }
    }

    if (!user) {
      const msg = isPhone
        ? 'No student account found with this mobile number.'
        : 'No account found with this email address.';
      return res.status(404).json({ error: msg });
    }

    const otp      = String(Math.floor(100000 + Math.random() * 900000));
    const storeKey = deliveryPhone
      ? `phone:${deliveryPhone}`
      : `email:${deliveryEmail.toLowerCase()}`;
    otpStore.set(storeKey, { otp, expiresAt: Date.now() + OTP_TTL_MS, userId: user.id });

    if (deliveryPhone) {
      await sendSmsOtp(deliveryPhone, otp);
      res.json({ success: true, via: 'sms' });
    } else {
      await sendEmailOtp(deliveryEmail, user.name, otp);
      res.json({ success: true, via: 'email', maskedEmail: deliveryEmail.replace(/(.{2}).+(@.+)/, '$1***$2') });
    }
  } catch (err) {
    console.error('Forgot password error:', err.message);
    // In dev, return the real reason (bad App Password, SMS template, etc.) to speed up debugging.
    const detail = process.env.NODE_ENV === 'production' ? '' : ` (${err.message})`;
    res.status(500).json({ error: `Failed to send OTP. Please try again later.${detail}` });
  }
});

// ── POST /api/auth/verify-reset-otp ────────────────────────────────────────────
router.post('/verify-reset-otp', async (req, res) => {
  const contact = req.body.contact || req.body.email || '';
  const { otp } = req.body;
  if (!contact || !otp) return res.status(400).json({ error: 'Contact and OTP are required.' });

  const cleanPhone = contact.replace(/\D/g, '');
  const isPhone    = cleanPhone.length >= 10 && !contact.includes('@');
  // Try phone key first, then email key (handles SMS→email fallback)
  const phoneKey = `phone:${cleanPhone}`;
  const emailKey = `email:${contact.trim().toLowerCase()}`;
  const key      = otpStore.has(phoneKey) ? phoneKey : emailKey;
  const stored   = otpStore.get(key);

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
      loginId:  user.unique_id,
      message:  'Registration successful! You can now log in.',
      loginOptions: {
        phone: cleanPhone || null,
        email: email?.trim().toLowerCase() || null,
        uniqueId: user.unique_id,
      },
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

// POST /api/auth/register-coach — trainer registration
router.post('/register-coach', async (req, res) => {
  const { coachName, organizationName, phoneNumber, email, password } = req.body;
  if (!email || !email.includes('@'))
    return res.status(400).json({ error: 'A valid email address is required.' });
  if (!password || password.length < 6)
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });

  const cleanPhone = (phoneNumber || '').replace(/\D/g, '') || null;

  try {
    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (name, role, school_name, email, phone_number, password_hash)
       VALUES ($1,'coach',$2,$3,$4,$5) RETURNING id, role, name, email`,
      [coachName || '', organizationName || '', email.trim().toLowerCase(), cleanPhone, hash]
    );
    const user = result.rows[0];
    res.status(201).json({
      token:   makeToken(user),
      message: 'Trainer registration successful! You can now log in.',
      user: {
        id:    String(user.id),
        name:  user.name,
        role:  user.role,
        email: user.email,
      },
    });
  } catch (err) {
    console.error('Register coach error:', err.message);
    if (err.code === '23505')
      return res.status(400).json({ error: 'This email is already registered.' });
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
