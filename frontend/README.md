# StudyOS AI — Frontend

React 18 + Vite + Tailwind CSS. Talks to the Flask backend over `fetch` with
session cookies (`credentials: "include"`).

## Quick start

```bash
cd frontend
npm install
cp .env.example .env     # defaults to http://localhost:5000, edit if needed
npm run dev               # http://localhost:5173
```

Make sure the backend (`../backend`) is running first — see its README for
setup. Log in with the seeded demo account: **demo@studyos.ai / password123**.

## Stack

- **React Router v6** for the 14-page navigation (sidebar on desktop, bottom
  nav + "More" sheet on mobile)
- **Tailwind CSS** with a CSS-variable-driven accent/theme system — light and
  dark mode, four selectable accent colors (indigo/blue/purple/emerald),
  switchable live from Settings and persisted to the backend
- **Recharts** for the Dashboard trend chart and Analytics bar/line charts
- **lucide-react** for icons

## Structure

```
src/
  main.jsx              Entry point, wraps App in AuthProvider + Router
  App.jsx                Route table + auth guard
  index.css              Design tokens (CSS vars for accent/theme), utility classes
  lib/
    api.js               fetch wrapper (credentials, JSON, error handling)
    utils.js             date formatting, status/priority color maps
  context/
    AuthContext.jsx       Session state, theme/accent persistence
  components/
    Sidebar.jsx / BottomNav.jsx / AppShell.jsx    Navigation shell
    Topbar.jsx            Per-page header with streak/XP pill + theme toggle
    StatCard.jsx / ProgressRing.jsx                Dashboard/analytics primitives
    Modal.jsx / EmptyState.jsx / Loader.jsx        Shared UI primitives
  pages/
    Login.jsx             Sign in / register
    Dashboard.jsx          Stat cards, trend chart, today's plan, exams, skills
    Subjects.jsx / SubjectDetail.jsx                Subject grid + unit/topic tree
    Syllabus.jsx           Global filterable topic table across all subjects
    Tasks.jsx               Daily planner grouped by time of day
    Revision.jsx            Spaced-repetition due queue
    Practice.jsx            Session logging + accuracy stats
    Exams.jsx                Upcoming exams + previous year papers
    CalendarPage.jsx         Monthly grid with event dots
    Notes.jsx                 Markdown notes, folders, tags, search
    Goals.jsx                  Periodic goals + embedded daily habit tracker
    Skills.jsx                  Level tracking with milestones
    Analytics.jsx                Charts: study minutes, productivity, subjects, habits, goals
    AIAssistant.jsx               Chat, study plans, explanations, flashcards, weak areas
    Settings.jsx                   Theme, accent color, profile, XP/level
```

## Design system

Defined in `tailwind.config.js` + `src/index.css`:
- `--accent` / `--surface` / `--ink` CSS variables swap per theme (`.dark`
  class on `<html>`) and per accent (`data-accent` attribute), so no
  JS-side re-render is needed to restyle the whole app
- `Plus Jakarta Sans` for headings, `Inter` for body text, `JetBrains Mono`
  for numbers/stats — a small but deliberate typographic signature
- Reusable classes: `.card`, `.glass`, `.btn-primary`, `.btn-secondary`,
  `.input`, `.badge` in the `@layer components` block

## Building for production

```bash
npm run build      # outputs to dist/
npm run preview    # serve the production build locally to sanity-check it
```

Deploy `dist/` to any static host (Vercel, Netlify, S3+CloudFront, nginx).
Set `VITE_API_URL` to your deployed backend's URL at build time.

## Notes on verification

Every file in this project was syntax-checked with the TypeScript compiler's
JSX parser (`tsc --noEmit` in loose/allowJs mode) and every relative import
path was verified to resolve to a real file before this was packaged. What
was **not** possible in the sandbox that generated this project: an actual
`npm install` + `npm run dev` (no network access), so give the dev server a
try immediately after installing — if anything doesn't compile, it's most
likely a dependency version mismatch, not a logic error, and pinning the
exact versions in `package.json` should resolve it.
