# StudyOS AI — Backend

A Flask REST API for the StudyOS AI student learning platform. Deliberately
dependency-light: the only required package is **Flask** itself — persistence
uses Python's built-in `sqlite3`, and auth uses signed session cookies + one
`werkzeug` password hash, so there's nothing else to install or compile.

## Quick start

```bash
cd backend
python3 -m venv venv && source venv/bin/activate   # optional but recommended
pip install -r requirements.txt

cp .env.example .env      # then edit values if you want
python seed.py            # creates studyos.db with a demo account + sample data
python run.py              # starts the API on http://localhost:5000
```

Demo login: **demo@studyos.ai / password123**

Health check: `curl http://localhost:5000/api/health`

## Project layout

```
backend/
  app.py              Flask application factory, blueprint registration
  run.py              Entrypoint (python run.py)
  database.py         sqlite3 connection + query/execute helpers
  schema.sql          Full normalized schema (18 tables)
  seed.py             Demo data generator
  auth.py             Register / login / logout / session helpers
  stats_utils.py       Rolls activity up into daily_stats + streaks + XP
  flask_cors_lite.py  ~15-line CORS shim (no flask-cors dependency needed)
  routes/
    subjects.py       Subjects → Units → Topics (syllabus tree, completion %)
    tasks.py          Daily planner
    revision.py       Spaced-repetition scheduler (5-revision ladder)
    practice.py       MCQ / theory / coding / project session tracking
    habits.py         Habit streaks
    skills.py         Skill levels + milestones
    goals.py          Daily/weekly/monthly/yearly/long-term goals
    notes.py          Markdown notes with folders, tags, search
    calendar.py       Calendar events
    exams.py          Previous-year papers & upcoming exams
    dashboard.py       Aggregated dashboard + analytics endpoints
    ai.py             AI Assistant (Claude-powered if ANTHROPIC_API_KEY is set,
                       otherwise deterministic offline fallbacks)
```

## Database

SQLite by default (`studyos.db`, created automatically on first run). The
schema in `schema.sql` is written in portable, standard SQL — to move to
PostgreSQL for production, add `psycopg2` + `SQLAlchemy` to
`requirements.txt`, point `DATABASE_URL` at your Postgres instance, and
`schema.sql` will need only minor syntax tweaks (SQLite's `AUTOINCREMENT` →
Postgres `SERIAL`/`IDENTITY`, `datetime('now')` → `now()`).

## Authentication

Plain Flask session cookies (`HttpOnly`, `SameSite=Lax`) — no `Flask-Login`
dependency. `POST /api/auth/register`, `POST /api/auth/login`,
`POST /api/auth/logout`, `GET /api/auth/me`. Every other endpoint requires an
active session and returns `401` otherwise.

## AI Assistant

Set `ANTHROPIC_API_KEY` in `.env` to enable real AI generation for study
plans, concept explanations, and flashcards (calls the Anthropic API
directly over HTTPS, no SDK needed). Without a key, the same endpoints
return useful rule-based results computed from the student's own weak
topics, so the feature never breaks — it just gets smarter with a key.

## CORS

`flask_cors_lite.py` allows one configured frontend origin
(`FRONTEND_ORIGIN` in `.env`, defaults to `http://localhost:5173`, i.e. Vite's
default dev port) with credentials enabled, so session cookies work across
the frontend/backend split during local development.

## Notes on production hardening

This is a complete, working reference implementation, not a hardened
production deploy. Before shipping publicly you'd want to add: rate limiting,
CSRF protection on state-changing routes, input validation beyond basic
required-field checks, a production WSGI server (gunicorn/uwsgi) instead of
the Flask dev server, and migration to PostgreSQL.
