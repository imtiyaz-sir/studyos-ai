"""
stats_utils.py — keeps `daily_stats` (used by Dashboard + Analytics charts)
and the user's overall streak up to date whenever the student does something
study-related. Called from task/habit/practice/revision routes.
"""
from datetime import date, timedelta
from database import query, execute


def _ensure_today_row(user_id):
    today = date.today().isoformat()
    row = query("SELECT * FROM daily_stats WHERE user_id = ? AND stat_date = ?", (user_id, today), one=True)
    if not row:
        execute("INSERT INTO daily_stats (user_id, stat_date) VALUES (?, ?)", (user_id, today))
        row = query("SELECT * FROM daily_stats WHERE user_id = ? AND stat_date = ?", (user_id, today), one=True)
    return row


def _recompute_productivity(row):
    # Simple weighted score out of 100 — tune freely.
    score = min(100, row["tasks_completed"] * 10 + row["revisions_done"] * 8
                + row["practice_sessions"] * 6 + min(row["study_minutes"], 180) // 6)
    return score


def bump_daily_stat(user_id, study_minutes=0, tasks_completed=0, revisions_done=0, practice_sessions=0):
    _ensure_today_row(user_id)
    today = date.today().isoformat()
    execute(
        """UPDATE daily_stats
           SET study_minutes = study_minutes + ?, tasks_completed = tasks_completed + ?,
               revisions_done = revisions_done + ?, practice_sessions = practice_sessions + ?
           WHERE user_id = ? AND stat_date = ?""",
        (study_minutes, tasks_completed, revisions_done, practice_sessions, user_id, today),
    )
    row = query("SELECT * FROM daily_stats WHERE user_id = ? AND stat_date = ?", (user_id, today), one=True)
    execute("UPDATE daily_stats SET productivity_score = ? WHERE id = ?", (_recompute_productivity(row), row["id"]))
    _recompute_user_streak(user_id)
    _award_xp(user_id, tasks_completed * 10 + revisions_done * 15 + practice_sessions * 12)


def _recompute_user_streak(user_id):
    rows = query("SELECT stat_date FROM daily_stats WHERE user_id = ? ORDER BY stat_date DESC", (user_id,))
    active_dates = {r["stat_date"] for r in rows}
    streak = 0
    cursor = date.today()
    while cursor.isoformat() in active_dates:
        streak += 1
        cursor -= timedelta(days=1)
    user = query("SELECT longest_streak FROM users WHERE id = ?", (user_id,), one=True)
    longest = max(user["longest_streak"], streak) if user else streak
    execute(
        "UPDATE users SET current_streak = ?, longest_streak = ?, last_active_date = ? WHERE id = ?",
        (streak, longest, date.today().isoformat(), user_id),
    )


def _award_xp(user_id, amount):
    if amount <= 0:
        return
    user = query("SELECT xp, level FROM users WHERE id = ?", (user_id,), one=True)
    new_xp = user["xp"] + amount
    new_level = 1 + new_xp // 500  # 500 xp per level
    execute("UPDATE users SET xp = ?, coins = coins + ?, level = ? WHERE id = ?", (new_xp, amount // 2, new_level, user_id))
