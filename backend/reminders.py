"""reminders.py — scheduled, de-duplicated study reminders.

Three jobs, each safe to run repeatedly (every notification has a dedupe_key,
so a re-run or an overlapping cron can never send the same reminder twice):

  plan    evening  -> "Tomorrow's plan": pending tasks + revisions due
  exam    morning  -> exam countdown at 30/14/7/3/2/1 days and on exam day
  streak  evening  -> "your N-day streak ends today unless you study"

Run from cron / a scheduler:  python run_reminders.py plan|exam|streak|all
"""
from datetime import date, timedelta

from database import query
from routes.notifications import create_notification
from timeutil import today_local

EXAM_MILESTONES = (30, 14, 7, 3, 2, 1, 0)
MAX_TASK_TITLES = 3


def _fmt_day(d):
    return d.strftime("%a, %d %b")


def _minutes(m):
    h, r = divmod(int(m or 0), 60)
    return f"{h}h {r}m" if h and r else f"{h}h" if h else f"{r}m"


# ── 1. Tomorrow's plan ─────────────────────────────────────
def run_plan(today=None):
    today = today or today_local()
    tomorrow = today + timedelta(days=1)
    sent = 0
    users = query("SELECT id FROM users")
    for u in users:
        uid = u["id"]
        tasks = query(
            """SELECT title, time_of_day, estimated_minutes FROM tasks
               WHERE user_id = ? AND due_date = ? AND status != 'done'
               ORDER BY CASE time_of_day WHEN 'morning' THEN 0 WHEN 'afternoon' THEN 1
                        WHEN 'evening' THEN 2 ELSE 3 END, id""",
            (uid, tomorrow.isoformat()),
        )
        revs = query(
            """SELECT COUNT(*) AS c FROM revisions r JOIN topics t ON t.id = r.topic_id
               JOIN units un ON un.id = t.unit_id JOIN subjects s ON s.id = un.subject_id
               WHERE s.user_id = ? AND r.status = 'pending' AND r.scheduled_date <= ?""",
            (uid, tomorrow.isoformat()), one=True,
        )["c"]
        if not tasks and not revs:
            continue  # nothing planned -> no noise
        parts = []
        if tasks:
            shown = ", ".join(t["title"] for t in tasks[:MAX_TASK_TITLES])
            more = f" +{len(tasks) - MAX_TASK_TITLES} more" if len(tasks) > MAX_TASK_TITLES else ""
            total = _minutes(sum(t["estimated_minutes"] or 0 for t in tasks))
            parts.append(f"{len(tasks)} task{'s' if len(tasks) != 1 else ''} ({total}): {shown}{more}")
        if revs:
            parts.append(f"{revs} revision{'s' if revs != 1 else ''} due")
        link = "/tasks" if tasks else "/revision"
        if create_notification(uid, "assignment", f"Tomorrow ({_fmt_day(tomorrow)}): " + " · ".join(parts),
                               title="Tomorrow's plan", link=link, dedupe_key=f"plan:{tomorrow.isoformat()}"):
            sent += 1
    return sent


# ── 2. Exam countdown ──────────────────────────────────────
def _parse_day(value):
    try:
        return date.fromisoformat(str(value)[:10])
    except (TypeError, ValueError):
        return None


def run_exam_countdown(today=None):
    today = today or today_local()
    sent = 0
    exams = query("SELECT id, user_id, title, exam_date FROM exams WHERE status = 'upcoming' AND exam_date IS NOT NULL")
    for e in exams:
        d = _parse_day(e["exam_date"])
        if not d:
            continue
        left = (d - today).days
        if left not in EXAM_MILESTONES:
            continue
        when = "is TODAY" if left == 0 else "is tomorrow" if left == 1 else f"is in {left} days"
        msg = f"{e['title']} exam {when} ({_fmt_day(d)})."
        if create_notification(e["user_id"], "exam", msg, title="Exam countdown", link="/exams",
                               dedupe_key=f"exam:{e['id']}:{left}"):
            sent += 1
    return sent


# ── 3. Streak at risk ──────────────────────────────────────
def _streak_ending(active, end):
    n, cur = 0, end
    while cur.isoformat() in active:
        n, cur = n + 1, cur - timedelta(days=1)
    return n


def run_streak_check(today=None):
    """Streak is computed from daily_stats (like stats_utils does) rather than
    users.current_streak, which only updates on activity and so goes stale."""
    today = today or today_local()
    yesterday = today - timedelta(days=1)
    since = (today - timedelta(days=400)).isoformat()
    sent = 0
    rows = query("SELECT user_id, stat_date FROM daily_stats WHERE stat_date >= ?", (since,))
    by_user = {}
    for r in rows:
        by_user.setdefault(r["user_id"], set()).add(r["stat_date"])
    for uid, active in by_user.items():
        if today.isoformat() in active:
            continue  # already studied today -> streak is safe
        streak = _streak_ending(active, yesterday)
        if streak < 1:
            continue
        msg = (f"Your {streak}-day streak ends today. Do one task or revision to keep it alive."
               if streak > 1 else "Study today to turn yesterday into a 2-day streak.")
        if create_notification(uid, "habit", msg, title="Streak at risk", link="/revision",
                               dedupe_key=f"streak:{today.isoformat()}"):
            sent += 1
    return sent


JOBS = {"plan": run_plan, "exam": run_exam_countdown, "streak": run_streak_check}
