require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const fs      = require('fs');
const path    = require('path');
const pool    = require('./db');

const app  = express();
const PORT = process.env.PORT || 3001;

// ─── CORS ─────────────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
  .split(',').map(s => s.trim()).filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin)                                    return cb(null, true);
    if (/^http:\/\/localhost(:\d+)?$/.test(origin)) return cb(null, true);
    if (/\.vercel\.app$/.test(origin))              return cb(null, true);
    if (ALLOWED_ORIGINS.includes(origin))           return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

// ─── DB READY FLAG ────────────────────────────────────────────────────────
let dbReady = false;

// ─── 1. HEALTH — always responds immediately (no DB needed) ───────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', db: dbReady, time: new Date() });
});

// ─── 2. GATE — all other /api routes wait for DB ready ───────────────────
app.use('/api', (req, res, next) => {
  if (!dbReady) {
    return res.status(503).json({
      error: 'Server is starting up — please retry in a few seconds.',
    });
  }
  next();
});

// ─── 3. ROUTES (only reached after DB is ready) ───────────────────────────
app.use('/api/auth',       require('./routes/auth'));
app.use('/api/levels',     require('./routes/levels'));
app.use('/api/questions',  require('./routes/questions'));
app.use('/api/quiz',       require('./routes/quiz'));
app.use('/api/students',   require('./routes/students'));
app.use('/api/content',    require('./routes/content'));
app.use('/api/settings',   require('./routes/settings'));
app.use('/api/monitoring', require('./routes/monitoring'));

// ─── 4. START LISTENING immediately so Render marks the service live ──────
const server = app.listen(PORT, () => {
  console.log(`✓ RoboQuiz listening on port ${PORT} — DB init in progress…`);
});
server.on('error', err => {
  console.error('Server error:', err.message);
  process.exit(1);
});

// ─── 5. DB INIT runs in background after server is already listening ───────
async function initDB() {
  try {
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await pool.query(schema);
    console.log('✓ Schema ready');

    const bcrypt = require('bcrypt');
    const staff = [
      { email: 'admin@roboquiz.in',   name: 'System Administrator', role: 'admin',   password: 'admin123'   },
      { email: 'teacher@roboquiz.in', name: 'Ms. Kavya Nair',       role: 'teacher', password: 'teacher123' },
    ];
    for (const s of staff) {
      const exists = await pool.query('SELECT 1 FROM users WHERE email=$1', [s.email]);
      if (exists.rowCount === 0) {
        const hash = await bcrypt.hash(s.password, 10);
        await pool.query(
          'INSERT INTO users (email, name, role, password_hash) VALUES ($1,$2,$3,$4)',
          [s.email, s.name, s.role, hash]
        );
        console.log(`✓ Seeded: ${s.email}`);
      }
    }

    dbReady = true;
    console.log('✓ DB ready — all routes active');
  } catch (err) {
    console.error('DB init failed:', err.message);
    process.exit(1);
  }
}

initDB();
