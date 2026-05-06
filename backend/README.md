# RoboQuiz API — Backend

Node.js + Express API connected to Neon PostgreSQL.

## Setup

```bash
cd backend
npm install
```

## Run (development)

```bash
npm run dev       # uses nodemon (auto-restart)
# or
npm start         # plain node
```

On Windows, double-click **start.bat**.

The server runs on **http://localhost:3001**.

## What it does on first start
1. Runs `schema.sql` — creates all tables
2. Seeds two staff accounts:
   - `admin@roboquiz.in` / `admin123`
   - `teacher@roboquiz.in` / `teacher123`
3. Questions are seeded automatically when the frontend loads for the first time

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Student registration |
| POST | `/api/auth/login` | Login (staff or student) |
| GET  | `/api/auth/me` | Get current user |
| GET  | `/api/levels/settings` | Level config |
| PUT  | `/api/levels/settings/:id` | Update level settings |
| GET  | `/api/levels/progress/:userId` | Student's progress |
| POST | `/api/levels/progress/:userId/:levelId/complete` | Mark level complete |
| GET/PUT | `/api/levels/approvals` | Level approvals |
| POST | `/api/levels/overrides/:userId/:levelId` | Manual unlock |
| GET/PUT | `/api/levels/global-access` | Global access toggle |
| GET  | `/api/questions/bank` | Question bank by category |
| POST | `/api/questions/seed` | Seed default questions (once) |
| POST/PUT/DELETE | `/api/questions` | Question CRUD |
| GET  | `/api/quiz/generate/:userId` | Generate quiz |
| POST | `/api/quiz/used/:userId` | Record used questions |
| GET/POST | `/api/quiz/attempts` | Quiz attempt history |
| GET  | `/api/students` | All students (admin) |

## Environment (.env)
```
DATABASE_URL=postgresql://...neon.tech/neondb?sslmode=require
JWT_SECRET=your_secret
PORT=3001
```
