-- RoboQuiz Database Schema

CREATE TABLE IF NOT EXISTS users (
  id           SERIAL PRIMARY KEY,
  unique_id    VARCHAR(20)  UNIQUE,
  email        VARCHAR(255) UNIQUE,
  name         VARCHAR(255),
  role         VARCHAR(50)  NOT NULL DEFAULT 'student',
  school_name  VARCHAR(255),
  class_name   VARCHAR(100),
  password_hash TEXT        NOT NULL,
  created_at   TIMESTAMPTZ  DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS level_settings (
  level_id    INTEGER PRIMARY KEY,
  title       VARCHAR(255),
  subtitle    VARCHAR(255),
  description TEXT,
  time_limit  INTEGER DEFAULT 10,
  active      BOOLEAN DEFAULT TRUE
);

-- Seed default level settings
INSERT INTO level_settings (level_id, title, subtitle, description, time_limit, active)
VALUES
  (1, 'Level 1', 'Foundation', 'Core robotics and science fundamentals', 10, TRUE),
  (2, 'Level 2', 'Intermediate', 'Applied concepts and problem solving', 10, TRUE),
  (3, 'Level 3', 'Advanced',    'Expert-level robotics challenges',       10, TRUE)
ON CONFLICT (level_id) DO NOTHING;

CREATE TABLE IF NOT EXISTS level_progress (
  id                SERIAL PRIMARY KEY,
  user_id           INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  level_id          INTEGER NOT NULL,
  status            VARCHAR(50) DEFAULT 'unlocked',
  score             JSONB,
  last_score        JSONB,
  completed_at      TIMESTAMPTZ,
  last_completed_at TIMESTAMPTZ,
  content_read      BOOLEAN DEFAULT FALSE,
  UNIQUE(user_id, level_id)
);

CREATE TABLE IF NOT EXISTS level_approvals (
  user_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  level_id INTEGER NOT NULL,
  status   VARCHAR(50) DEFAULT 'pending',
  PRIMARY KEY(user_id, level_id)
);

CREATE TABLE IF NOT EXISTS level_overrides (
  user_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  level_id INTEGER NOT NULL,
  PRIMARY KEY(user_id, level_id)
);

CREATE TABLE IF NOT EXISTS global_level_access (
  level_id INTEGER PRIMARY KEY,
  open     BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS questions (
  id             VARCHAR(100) PRIMARY KEY,
  category       VARCHAR(100) NOT NULL,
  type           VARCHAR(50)  NOT NULL,
  text           TEXT,
  image_url      TEXT,
  options        JSONB,
  correct_answer INTEGER,
  pairs          JSONB,
  explanation    TEXT,
  difficulty     VARCHAR(50) DEFAULT 'medium',
  status         VARCHAR(50) DEFAULT 'active',
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS used_questions (
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question_id VARCHAR(100) NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  PRIMARY KEY(user_id, question_id)
);

CREATE TABLE IF NOT EXISTS quiz_attempts (
  id           VARCHAR(100) PRIMARY KEY,
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  level_id     INTEGER NOT NULL,
  level_title  VARCHAR(255),
  questions    JSONB,
  answers      JSONB,
  score        JSONB,
  attempted_at TIMESTAMPTZ DEFAULT NOW()
);
