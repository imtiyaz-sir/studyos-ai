-- StudyOS AI — Database Schema (PostgreSQL / Supabase)
-- Naming: snake_case, singular table names avoided in favor of plural, all tables keyed by integer PK `id`.

-- ─────────────────────────────────────────────────────────
-- USERS
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id              SERIAL PRIMARY KEY,
    name            TEXT NOT NULL,
    email           TEXT NOT NULL UNIQUE,
    password_hash   TEXT NOT NULL,
    theme           TEXT DEFAULT 'light',           -- light | dark
    accent_color    TEXT DEFAULT 'indigo',           -- blue | indigo | purple | emerald
    xp              INTEGER DEFAULT 0,
    coins           INTEGER DEFAULT 0,
    level           INTEGER DEFAULT 1,
    current_streak  INTEGER DEFAULT 0,
    longest_streak  INTEGER DEFAULT 0,
    last_active_date TEXT,
    daily_revision_goal INTEGER DEFAULT 3,
    is_verified     INTEGER DEFAULT 0,
    is_admin        BOOLEAN NOT NULL DEFAULT FALSE,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until    TEXT,
    created_at      TEXT DEFAULT to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS')
);

CREATE TABLE IF NOT EXISTS password_resets (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token           TEXT NOT NULL UNIQUE,
    expires_at      TEXT NOT NULL,
    used            INTEGER DEFAULT 0,
    created_at      TEXT DEFAULT to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS')
);

CREATE TABLE IF NOT EXISTS email_verifications (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token           TEXT NOT NULL UNIQUE,
    expires_at      TEXT NOT NULL,
    used            INTEGER DEFAULT 0,
    created_at      TEXT DEFAULT to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS')
);

-- ─────────────────────────────────────────────────────────
-- SYLLABUS HIERARCHY: subjects → units → topics
-- (chapters/subtopics collapse into `topics` via parent_topic_id
--  so the tree can go arbitrarily deep without extra tables)
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subjects (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    color           TEXT DEFAULT '#6366f1',
    icon            TEXT DEFAULT 'book',
    semester        TEXT,
    created_at      TEXT DEFAULT to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS')
);

CREATE TABLE IF NOT EXISTS units (
    id              SERIAL PRIMARY KEY,
    subject_id      INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    order_index     INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS topics (
    id                  SERIAL PRIMARY KEY,
    unit_id             INTEGER NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    parent_topic_id     INTEGER REFERENCES topics(id) ON DELETE CASCADE,  -- NULL = top-level chapter, non-NULL = subtopic
    name                TEXT NOT NULL,
    status              TEXT DEFAULT 'not_started',   -- not_started | in_progress | completed
    priority            TEXT DEFAULT 'medium',         -- low | medium | high
    difficulty          TEXT DEFAULT 'medium',         -- easy | medium | hard
    estimated_hours     REAL DEFAULT 0,
    actual_hours        REAL DEFAULT 0,
    confidence_level    INTEGER DEFAULT 0,             -- 0-100
    revision_count      INTEGER DEFAULT 0,
    practice_count      INTEGER DEFAULT 0,
    notes               TEXT,
    order_index         INTEGER DEFAULT 0,
    created_at          TEXT DEFAULT to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS')
);

-- ─────────────────────────────────────────────────────────
-- TASKS (daily planner)
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tasks (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject_id      INTEGER REFERENCES subjects(id) ON DELETE SET NULL,
    title           TEXT NOT NULL,
    description     TEXT,
    time_of_day     TEXT DEFAULT 'morning',   -- morning | afternoon | evening | night
    priority        TEXT DEFAULT 'medium',
    estimated_minutes INTEGER DEFAULT 30,
    status          TEXT DEFAULT 'pending',   -- pending | in_progress | done
    due_date        TEXT,
    reminder_at     TEXT,
    created_at      TEXT DEFAULT to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS')
);

-- ─────────────────────────────────────────────────────────
-- SPACED-REPETITION REVISION SYSTEM
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS revisions (
    id                  SERIAL PRIMARY KEY,
    topic_id            INTEGER NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    revision_number     INTEGER NOT NULL,       -- 1,2,3,4,5,6...
    scheduled_date      TEXT,
    completed_date      TEXT,
    memory_strength     INTEGER DEFAULT 0,      -- 0-100, feeds next interval
    confidence_level    INTEGER DEFAULT 0,      -- 0-100 self-rated
    notes               TEXT,
    status              TEXT DEFAULT 'pending'  -- pending | done | skipped
);

-- ─────────────────────────────────────────────────────────
-- PRACTICE TRACKER
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS practice_sessions (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    topic_id        INTEGER REFERENCES topics(id) ON DELETE SET NULL,
    type            TEXT NOT NULL,     -- mcq | theory | coding | assignment | lab | project
    total_questions INTEGER DEFAULT 0,
    correct_answers INTEGER DEFAULT 0,
    duration_minutes INTEGER DEFAULT 0,
    session_date    TEXT DEFAULT to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS'),
    notes           TEXT
);

-- ─────────────────────────────────────────────────────────
-- PREVIOUS YEAR PAPERS / EXAMS
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS exams (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject_id      INTEGER REFERENCES subjects(id) ON DELETE SET NULL,
    title           TEXT NOT NULL,
    exam_date       TEXT,
    year            INTEGER,
    university      TEXT,
    marks_scored    REAL,
    marks_total     REAL,
    completion_time_minutes INTEGER,
    mistakes        TEXT,
    weak_topics     TEXT,
    status          TEXT DEFAULT 'upcoming'  -- upcoming | completed
);

-- ─────────────────────────────────────────────────────────
-- NOTES
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notes (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject_id      INTEGER REFERENCES subjects(id) ON DELETE SET NULL,
    topic_id        INTEGER REFERENCES topics(id) ON DELETE SET NULL,
    title           TEXT NOT NULL,
    content_markdown TEXT,
    folder          TEXT DEFAULT 'General',
    tags            TEXT,              -- comma-separated
    pinned          INTEGER DEFAULT 0,
    created_at      TEXT DEFAULT to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS'),
    updated_at      TEXT DEFAULT to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS')
);

-- ─────────────────────────────────────────────────────────
-- FILES
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS files (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject_id      INTEGER REFERENCES subjects(id) ON DELETE SET NULL,
    topic_id        INTEGER REFERENCES topics(id) ON DELETE SET NULL,
    filename        TEXT NOT NULL,
    filepath        TEXT NOT NULL,
    filetype        TEXT,
    size_bytes      INTEGER,
    uploaded_at     TEXT DEFAULT to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS')
);

-- ─────────────────────────────────────────────────────────
-- CALENDAR EVENTS
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS calendar_events (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title           TEXT NOT NULL,
    event_type      TEXT DEFAULT 'study',  -- exam | assignment | study | revision | deadline | event
    start_datetime  TEXT NOT NULL,
    end_datetime    TEXT,
    subject_id      INTEGER REFERENCES subjects(id) ON DELETE SET NULL,
    notes           TEXT
);

-- ─────────────────────────────────────────────────────────
-- HABITS
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS habits (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    icon            TEXT DEFAULT 'check-circle',
    target_per_week INTEGER DEFAULT 7,
    current_streak  INTEGER DEFAULT 0,
    longest_streak  INTEGER DEFAULT 0,
    created_at      TEXT DEFAULT to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS')
);

CREATE TABLE IF NOT EXISTS habit_logs (
    id              SERIAL PRIMARY KEY,
    habit_id        INTEGER NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
    log_date        TEXT NOT NULL,
    completed       INTEGER DEFAULT 1,
    UNIQUE(habit_id, log_date)
);

-- ─────────────────────────────────────────────────────────
-- SKILLS
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS skills (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    category        TEXT,
    current_level   INTEGER DEFAULT 1,   -- 1-10
    target_level    INTEGER DEFAULT 10,
    hours_logged    REAL DEFAULT 0,
    projects_count  INTEGER DEFAULT 0,
    certificates    TEXT,                -- comma-separated
    created_at      TEXT DEFAULT to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS')
);

CREATE TABLE IF NOT EXISTS skill_milestones (
    id              SERIAL PRIMARY KEY,
    skill_id        INTEGER NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    title           TEXT NOT NULL,
    completed       INTEGER DEFAULT 0,
    target_date     TEXT
);

-- ─────────────────────────────────────────────────────────
-- GOALS
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS goals (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title           TEXT NOT NULL,
    description     TEXT,
    period          TEXT DEFAULT 'weekly',   -- daily | weekly | monthly | yearly | long_term
    target_value    REAL DEFAULT 1,
    current_value   REAL DEFAULT 0,
    unit            TEXT DEFAULT 'tasks',
    due_date        TEXT,
    status          TEXT DEFAULT 'active',   -- active | completed | missed
    created_at      TEXT DEFAULT to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS')
);

-- ─────────────────────────────────────────────────────────
-- NOTIFICATIONS
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type            TEXT NOT NULL,   -- revision | assignment | exam | habit | goal | practice | system
    message         TEXT NOT NULL,
    is_read         INTEGER DEFAULT 0,
    scheduled_for   TEXT,
    created_at      TEXT DEFAULT to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS')
);

-- ─────────────────────────────────────────────────────────
-- AI ASSISTANT HISTORY
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_history (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    request_type    TEXT,    -- study_plan | explain | mcq | flashcards | quiz | weak_areas | chat
    prompt          TEXT,
    response        TEXT,
    created_at      TEXT DEFAULT to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS')
);

-- ─────────────────────────────────────────────────────────
-- DAILY STATS (materialized rollups powering Analytics)
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS daily_stats (
    id                  SERIAL PRIMARY KEY,
    user_id             INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    stat_date           TEXT NOT NULL,
    study_minutes       INTEGER DEFAULT 0,
    tasks_completed     INTEGER DEFAULT 0,
    revisions_done      INTEGER DEFAULT 0,
    practice_sessions   INTEGER DEFAULT 0,
    productivity_score  INTEGER DEFAULT 0,   -- 0-100
    UNIQUE(user_id, stat_date)
);

-- Indexes for common lookups
CREATE INDEX IF NOT EXISTS idx_units_subject ON units(subject_id);
CREATE INDEX IF NOT EXISTS idx_topics_unit ON topics(unit_id);
CREATE INDEX IF NOT EXISTS idx_topics_parent ON topics(parent_topic_id);
CREATE INDEX IF NOT EXISTS idx_revisions_topic ON revisions(topic_id);
CREATE INDEX IF NOT EXISTS idx_revisions_status_scheduled ON revisions(status, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_revisions_status_completed ON revisions(status, completed_date);
CREATE INDEX IF NOT EXISTS idx_tasks_user_date ON tasks(user_id, due_date);
CREATE INDEX IF NOT EXISTS idx_notes_user ON notes(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_user ON calendar_events(user_id, start_datetime);
CREATE INDEX IF NOT EXISTS idx_habit_logs_habit ON habit_logs(habit_id, log_date);
CREATE INDEX IF NOT EXISTS idx_subjects_user ON subjects(user_id);
CREATE INDEX IF NOT EXISTS idx_habits_user ON habits(user_id);
CREATE INDEX IF NOT EXISTS idx_skills_user ON skills(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_user ON goals(user_id);
CREATE INDEX IF NOT EXISTS idx_exams_user ON exams(user_id);
CREATE INDEX IF NOT EXISTS idx_practice_user_date ON practice_sessions(user_id, session_date);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_ai_history_user ON ai_history(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_files_user ON files(user_id);
CREATE INDEX IF NOT EXISTS idx_skill_milestones_skill ON skill_milestones(skill_id);
CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token);
CREATE INDEX IF NOT EXISTS idx_email_verifications_token ON email_verifications(token);
