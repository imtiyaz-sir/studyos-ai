from datetime import date, timedelta
from flask import Blueprint, jsonify

from database import query
from auth import login_required, current_user_id

dashboard_bp = Blueprint("dashboard", __name__, url_prefix="/api/dashboard")

QUOTES = [
    "Small daily improvements lead to staggering long-term results.",
    "Discipline is choosing between what you want now and what you want most.",
    "The expert in anything was once a beginner.",
    "Revise today what you'll thank yourself for tomorrow.",
    "Consistency beats intensity.",
]


def _overall_completion(uid):
    rows = query(
        """SELECT t.status FROM topics t
           JOIN units u ON u.id = t.unit_id
           JOIN subjects s ON s.id = u.subject_id
           WHERE s.user_id = ?""",
        (uid,),
    )
    if not rows:
        return 0
    done = sum(1 for r in rows if r["status"] == "completed")
    return round(done / len(rows) * 100)


@dashboard_bp.get("/summary")
@login_required
def summary():
    uid = current_user_id()
    today = date.today()
    week_ago = (today - timedelta(days=7)).isoformat()
    month_ago = (today - timedelta(days=30)).isoformat()

    user = query("SELECT * FROM users WHERE id = ?", (uid,), one=True)

    pending_tasks = query("SELECT COUNT(*) c FROM tasks WHERE user_id = ? AND status != 'done'", (uid,), one=True)["c"]
    today_tasks = query("SELECT * FROM tasks WHERE user_id = ? AND due_date = ?", (uid, today.isoformat()))

    revisions_due = query(
        """SELECT COUNT(*) c FROM revisions r
           JOIN topics t ON t.id = r.topic_id JOIN units u ON u.id = t.unit_id JOIN subjects s ON s.id = u.subject_id
           WHERE s.user_id = ? AND r.status = 'pending' AND r.scheduled_date <= ?""",
        (uid, today.isoformat()), one=True,
    )["c"]

    practice_week = query(
        "SELECT COUNT(*) c, COALESCE(SUM(duration_minutes),0) m FROM practice_sessions WHERE user_id = ? AND session_date >= ?",
        (uid, week_ago), one=True,
    )

    stats_week = query("SELECT * FROM daily_stats WHERE user_id = ? AND stat_date >= ? ORDER BY stat_date", (uid, week_ago))
    stats_month = query("SELECT * FROM daily_stats WHERE user_id = ? AND stat_date >= ? ORDER BY stat_date", (uid, month_ago))

    total_study_minutes = query("SELECT COALESCE(SUM(study_minutes),0) m FROM daily_stats WHERE user_id = ?", (uid,), one=True)["m"]

    upcoming_exams = query(
        "SELECT * FROM exams WHERE user_id = ? AND status = 'upcoming' ORDER BY exam_date LIMIT 5", (uid,)
    )

    skills = query("SELECT name, current_level, target_level FROM skills WHERE user_id = ?", (uid,))

    week_pct = round(sum(s["productivity_score"] for s in stats_week) / len(stats_week)) if stats_week else 0
    month_pct = round(sum(s["productivity_score"] for s in stats_month) / len(stats_month)) if stats_month else 0

    return jsonify({
        "overall_progress_pct": _overall_completion(uid),
        "current_streak": user["current_streak"],
        "longest_streak": user["longest_streak"],
        "total_study_hours": round(total_study_minutes / 60, 1),
        "revisions_due_today": revisions_due,
        "practice_sessions_week": practice_week["c"],
        "practice_minutes_week": practice_week["m"],
        "weekly_progress_pct": week_pct,
        "monthly_progress_pct": month_pct,
        "pending_tasks": pending_tasks,
        "today_tasks": today_tasks,
        "upcoming_exams": upcoming_exams,
        "skills": skills,
        "productivity_score": stats_week[-1]["productivity_score"] if stats_week else 0,
        "xp": user["xp"],
        "coins": user["coins"],
        "level": user["level"],
        "quote": QUOTES[today.toordinal() % len(QUOTES)],
        "daily_trend": stats_week,
    })


@dashboard_bp.get("/analytics")
@login_required
def analytics():
    uid = current_user_id()
    stats = query("SELECT * FROM daily_stats WHERE user_id = ? ORDER BY stat_date DESC LIMIT 90", (uid,))
    stats.reverse()

    subjects = query("SELECT id, name, color FROM subjects WHERE user_id = ?", (uid,))
    subject_progress = []
    for s in subjects:
        topics = query(
            """SELECT t.status FROM topics t JOIN units u ON u.id = t.unit_id WHERE u.subject_id = ?""",
            (s["id"],),
        )
        pct = round(sum(1 for t in topics if t["status"] == "completed") / len(topics) * 100) if topics else 0
        subject_progress.append({"name": s["name"], "color": s["color"], "completion_pct": pct})

    habits = query("SELECT name, current_streak, longest_streak FROM habits WHERE user_id = ?", (uid,))
    goals = query("SELECT period, status FROM goals WHERE user_id = ?", (uid,))
    goal_completion = {}
    for g in goals:
        goal_completion.setdefault(g["period"], {"total": 0, "completed": 0})
        goal_completion[g["period"]]["total"] += 1
        if g["status"] == "completed":
            goal_completion[g["period"]]["completed"] += 1

    return jsonify({
        "daily_stats": stats,
        "subject_progress": subject_progress,
        "habits": habits,
        "goal_completion": goal_completion,
    })
