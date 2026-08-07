# StudyOS AI

An all-in-one student learning & productivity platform: syllabus tracking,
spaced-repetition revision, practice logging, habits, goals, notes, calendar,
skills, analytics, and an AI study assistant.

```
studyos-ai/
  backend/    Flask REST API + SQLite (see backend/README.md)
  frontend/   React + Vite + Tailwind UI (see frontend/README.md)
```

## Run it locally (two terminals)

**Terminal 1 — backend:**
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
python seed.py
python run.py
# → http://localhost:5000
```

**Terminal 2 — frontend:**
```bash
cd frontend
npm install
cp .env.example .env
npm run dev
# → http://localhost:5173
```

Open `http://localhost:5173` and sign in with **demo@studyos.ai / password123**.

## What's real vs. stubbed

- **Real and working**: auth, the full syllabus tree (subjects → units →
  topics), spaced-repetition scheduling, task/habit/goal/skill/note/exam/
  calendar CRUD, dashboard + analytics aggregation, XP/streak/productivity
  scoring — all backed by actual SQL queries against actual tables.
- **AI Assistant**: works out of the box with deterministic, rule-based
  responses (built from your real weak topics/data). Add `ANTHROPIC_API_KEY`
  to `backend/.env` to switch it to live Claude-generated study plans,
  explanations, and flashcards.
- **Not included**: file uploads (the `files` table exists in the schema,
  but there's no upload endpoint yet), push notifications (the
  `notifications` table exists but nothing populates it yet), gamification
  beyond XP/levels/streaks (no badges/leaderboards), and offline/PWA support.
  These were deliberately left as documented gaps rather than shipped half-working.

## Production notes

See each subproject's README for hardening notes (WSGI server, PostgreSQL
migration, CSRF, rate limiting, etc.) before deploying either half publicly.
