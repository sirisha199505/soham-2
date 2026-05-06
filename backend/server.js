require('dotenv').config();
const express  = require('express');
const cors     = require('cors');
const fs       = require('fs');
const path     = require('path');
const pool     = require('./db');

const authRouter      = require('./routes/auth');
const levelsRouter    = require('./routes/levels');
const questionsRouter = require('./routes/questions');
const quizRouter      = require('./routes/quiz');
const studentsRouter  = require('./routes/students');

const app  = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:4173'],
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

// Routes
app.use('/api/auth',      authRouter);
app.use('/api/levels',    levelsRouter);
app.use('/api/questions', questionsRouter);
app.use('/api/quiz',      quizRouter);
app.use('/api/students',  studentsRouter);

app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date() }));

// Run schema migrations on startup
async function initDB() {
  try {
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await pool.query(schema);
    console.log('✓ Database schema ready');

    // Seed default staff accounts if not present
    const bcrypt = require('bcrypt');
    const staff = [
      { email: 'admin@roboquiz.in',   name: 'System Administrator', role: 'admin',        password: 'admin123' },
      { email: 'teacher@roboquiz.in', name: 'Ms. Kavya Nair',       role: 'teacher',      password: 'teacher123' },
    ];
    for (const s of staff) {
      const exists = await pool.query('SELECT 1 FROM users WHERE email=$1', [s.email]);
      if (exists.rowCount === 0) {
        const hash = await bcrypt.hash(s.password, 10);
        await pool.query(
          'INSERT INTO users (email, name, role, password_hash) VALUES ($1,$2,$3,$4)',
          [s.email, s.name, s.role, hash]
        );
        console.log(`✓ Seeded staff: ${s.email}`);
      }
    }
  } catch (err) {
    console.error('DB init error:', err.message);
    process.exit(1);
  }
}

initDB().then(() => {
  const server = app.listen(PORT, () => {
    console.log(`✓ RoboQuiz API running on http://localhost:${PORT}`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`✗ Port ${PORT} is already in use. Is the server already running?`);
      process.exit(1);
    }
    throw err;
  });
});
