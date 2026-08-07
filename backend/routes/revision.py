from datetime import date, timedelta
from flask import Blueprint, request, jsonify

from database import query, execute
from auth import login_required, current_user_id
from stats_utils import bump_daily_stat

revision_bp = Blueprint("revision", __name__, url_prefix="/api/revision")

# Classic spaced-repetition ladder (days after the previous revision).
INTERVALS = [1, 3, 7, 15, 30, 60]  # revision 1..6, in days after the previous revision


@revision_bp.get("/due")
@login_required
def due_today():
    """Revisions scheduled for today or earlier, across all of the user's topics."""
    uid = current_user_id()
    rows = query(
        """SELECT r.*, t.name AS topic_name, s.name AS subject_name, s.color AS subject_color
           FROM revisions r
           JOIN topics t ON t.id = r.topic_id
           JOIN units u ON u.id = t.unit_id
           JOIN subjects s ON s.id = u.subject_id
           WHERE s.user_id = ? AND r.status = 'pending' AND r.scheduled_date <= ?
           ORDER BY r.scheduled_date""",
        (uid, date.today().isoformat()),
    )
    return jsonify({"due": rows})


@revision_bp.get("/topic/<int:topic_id>")
@login_required
def list_for_topic(topic_id):
    rows = query("SELECT * FROM revisions WHERE topic_id = ? ORDER BY revision_number", (topic_id,))
    return jsonify({"revisions": rows})


@revision_bp.post("/topic/<int:topic_id>/schedule")
@login_required
def schedule_first_revision(topic_id):
    """Kick off (or return) the spaced-repetition plan for a topic. Idempotent —
    calling this on a topic that already has a plan just returns it, so the
    'Mark for Revision' button in the UI can be pressed safely more than once."""
    existing = query("SELECT * FROM revisions WHERE topic_id = ? ORDER BY revision_number", (topic_id,))
    if existing:
        return jsonify({"revisions": existing, "already_scheduled": True})

    today = date.today()
    created = []
    running_date = today
    for i, gap in enumerate(INTERVALS, start=1):
        running_date = running_date + timedelta(days=gap)
        rid = execute(
            "INSERT INTO revisions (topic_id, revision_number, scheduled_date, status) VALUES (?, ?, ?, 'pending')",
            (topic_id, i, running_date.isoformat()),
        )
        created.append(rid)
    revisions = query("SELECT * FROM revisions WHERE topic_id = ? ORDER BY revision_number", (topic_id,))
    return jsonify({"revisions": revisions, "already_scheduled": False}), 201


@revision_bp.post("/topic/<int:topic_id>/mark-revised")
@login_required
def mark_revised(topic_id):
    """Completes the earliest pending revision for a topic — or starts a plan
    and immediately completes its first stage if none exists yet."""
    data = request.get_json(silent=True) or {}
    memory_strength = data.get("memory_strength", 80)
    confidence_level = data.get("confidence_level", 80)

    next_rev = query(
        "SELECT * FROM revisions WHERE topic_id = ? AND status = 'pending' ORDER BY revision_number LIMIT 1",
        (topic_id,), one=True,
    )
    if not next_rev:
        today = date.today()
        running_date = today
        for i, gap in enumerate(INTERVALS, start=1):
            running_date = running_date + timedelta(days=gap)
            execute(
                "INSERT INTO revisions (topic_id, revision_number, scheduled_date, status) VALUES (?, ?, ?, 'pending')",
                (topic_id, i, running_date.isoformat()),
            )
        next_rev = query(
            "SELECT * FROM revisions WHERE topic_id = ? AND status = 'pending' ORDER BY revision_number LIMIT 1",
            (topic_id,), one=True,
        )

    execute(
        "UPDATE revisions SET status = 'done', completed_date = ?, memory_strength = ?, confidence_level = ? WHERE id = ?",
        (date.today().isoformat(), memory_strength, confidence_level, next_rev["id"]),
    )
    execute(
        "UPDATE topics SET revision_count = revision_count + 1, confidence_level = ? WHERE id = ?",
        (confidence_level, topic_id),
    )
    bump_daily_stat(current_user_id(), revisions_done=1)
    return jsonify({"ok": True, "revision_id": next_rev["id"]})


@revision_bp.put("/<int:revision_id>")
@login_required
def update_revision(revision_id):
    data = request.get_json(force=True) or {}
    fields, args = [], []
    for col in ("notes", "difficulty", "scheduled_date"):
        if col in data:
            fields.append(f"{col} = ?")
            args.append(data[col])
    if not fields:
        return jsonify({"error": "No fields to update."}), 400
    args.append(revision_id)
    execute(f"UPDATE revisions SET {', '.join(fields)} WHERE id = ?", args)
    return jsonify({"revision": query("SELECT * FROM revisions WHERE id = ?", (revision_id,), one=True)})


def _user_topic_filter():
    """Common JOIN chain to scope any topics/revisions query to the current user."""
    return """FROM revisions r
              JOIN topics t ON t.id = r.topic_id
              JOIN units u ON u.id = t.unit_id
              JOIN subjects s ON s.id = u.subject_id
              WHERE s.user_id = ?"""


@revision_bp.get("/dashboard")
@login_required
def dashboard():
    uid = current_user_id()
    today = date.today()
    today_iso = today.isoformat()
    week_ago = (today - timedelta(days=6)).isoformat()
    month_start = (today - timedelta(days=29)).isoformat()
    year_start = (today - timedelta(days=364)).isoformat()

    base = _user_topic_filter()

    overdue = query(
        f"""SELECT r.*, t.name AS topic_name, s.id AS subject_id, s.name AS subject_name, s.color AS subject_color
            {base} AND r.status = 'pending' AND r.scheduled_date < ?
            ORDER BY r.scheduled_date""",
        (uid, today_iso),
    )
    due_today = query(
        f"""SELECT r.*, t.name AS topic_name, s.id AS subject_id, s.name AS subject_name, s.color AS subject_color
            {base} AND r.status = 'pending' AND r.scheduled_date = ?
            ORDER BY r.revision_number""",
        (uid, today_iso),
    )
    upcoming = query(
        f"""SELECT r.*, t.name AS topic_name, s.id AS subject_id, s.name AS subject_name, s.color AS subject_color
            {base} AND r.status = 'pending' AND r.scheduled_date > ? AND r.scheduled_date <= ?
            ORDER BY r.scheduled_date""",
        (uid, today_iso, (today + timedelta(days=7)).isoformat()),
    )

    total_completed = query(f"SELECT COUNT(*) c {base} AND r.status = 'done'", (uid,), one=True)["c"]
    today_completed = query(
        f"SELECT COUNT(*) c {base} AND r.status = 'done' AND r.completed_date = ?", (uid, today_iso), one=True
    )["c"]
    weekly_completed = query(
        f"SELECT COUNT(*) c {base} AND r.status = 'done' AND r.completed_date >= ?", (uid, week_ago), one=True
    )["c"]

    # Revision-specific streak: consecutive days (ending today or yesterday) with >=1 completed revision.
    completed_dates = query(
        f"SELECT DISTINCT r.completed_date {base} AND r.status = 'done' AND r.completed_date IS NOT NULL ORDER BY r.completed_date DESC",
        (uid,),
    )
    date_set = {row["completed_date"] for row in completed_dates}
    streak = 0
    cursor = today if today_iso in date_set else today - timedelta(days=1)
    while cursor.isoformat() in date_set:
        streak += 1
        cursor -= timedelta(days=1)

    # Daily series for the last 30 days (monthly chart) and 365 days (heatmap).
    daily_rows = query(
        f"SELECT r.completed_date AS d, COUNT(*) c {base} AND r.status = 'done' AND r.completed_date >= ? GROUP BY r.completed_date",
        (uid, year_start),
    )
    counts_by_date = {row["d"]: row["c"] for row in daily_rows}
    monthly_series = [
        {"date": (today - timedelta(days=i)).isoformat(), "count": counts_by_date.get((today - timedelta(days=i)).isoformat(), 0)}
        for i in range(29, -1, -1)
    ]
    heatmap = [
        {"date": (today - timedelta(days=i)).isoformat(), "count": counts_by_date.get((today - timedelta(days=i)).isoformat(), 0)}
        for i in range(364, -1, -1)
    ]

    # Subject-wise completion.
    subjects = query("SELECT id, name, color FROM subjects WHERE user_id = ?", (uid,))
    topic_agg = query(
        """SELECT u.subject_id, COUNT(t.id) AS total_topics,
                  COALESCE(SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END), 0) AS completed_topics,
                  COALESCE(AVG(t.confidence_level), 0) AS mastery_pct
           FROM units u LEFT JOIN topics t ON t.unit_id = u.id
           WHERE u.subject_id IN (SELECT id FROM subjects WHERE user_id = ?)
           GROUP BY u.subject_id""",
        (uid,),
    )
    topic_agg_by_subject = {row["subject_id"]: row for row in topic_agg}

    rev_agg = query(
        """SELECT u.subject_id, COUNT(*) AS total_revisions
           FROM revisions r JOIN topics t ON t.id = r.topic_id JOIN units u ON u.id = t.unit_id
           WHERE r.status = 'done' AND u.subject_id IN (SELECT id FROM subjects WHERE user_id = ?)
           GROUP BY u.subject_id""",
        (uid,),
    )
    rev_agg_by_subject = {row["subject_id"]: row["total_revisions"] for row in rev_agg}

    subject_completion = []
    for s in subjects:
        agg = topic_agg_by_subject.get(s["id"])
        subject_completion.append({
            "subject_id": s["id"], "name": s["name"], "color": s["color"],
            "total_topics": agg["total_topics"] if agg else 0,
            "completed_topics": agg["completed_topics"] if agg else 0,
            "mastery_pct": round(agg["mastery_pct"]) if agg else 0,
            "total_revisions": rev_agg_by_subject.get(s["id"], 0),
        })

    user = query("SELECT xp, level, daily_revision_goal FROM users WHERE id = ?", (uid,), one=True)
    daily_goal = user["daily_revision_goal"] or 5

    badges = [
        {"key": "first_revision", "label": "First Steps", "description": "Complete your first revision", "earned": total_completed >= 1},
        {"key": "streak_3", "label": "Warming Up", "description": "3-day revision streak", "earned": streak >= 3},
        {"key": "streak_7", "label": "Week Strong", "description": "7-day revision streak", "earned": streak >= 7},
        {"key": "streak_30", "label": "Unstoppable", "description": "30-day revision streak", "earned": streak >= 30},
        {"key": "century", "label": "Century Club", "description": "100 total revisions completed", "earned": total_completed >= 100},
        {"key": "daily_goal", "label": "Goal Crusher", "description": "Hit today's revision goal", "earned": today_completed >= daily_goal},
    ]

    return jsonify({
        "due_today": due_today,
        "overdue": overdue,
        "upcoming": upcoming,
        "counts": {"due_today": len(due_today), "overdue": len(overdue), "upcoming": len(upcoming)},
        "total_completed": total_completed,
        "today_completed": today_completed,
        "weekly_completed": weekly_completed,
        "daily_goal": daily_goal,
        "revision_streak": streak,
        "monthly_series": monthly_series,
        "heatmap": heatmap,
        "subject_completion": subject_completion,
        "badges": badges,
        "xp": user["xp"],
        "level": user["level"],
    })


@revision_bp.get("/subject/<int:subject_id>/stats")
@login_required
def subject_stats(subject_id):
    topics = query(
        "SELECT t.* FROM topics t JOIN units u ON u.id = t.unit_id WHERE u.subject_id = ?",
        (subject_id,),
    )
    total_topics = len(topics)
    completed_topics = sum(1 for t in topics if t["status"] == "completed")
    topic_ids = [t["id"] for t in topics] or [-1]
    placeholders = ",".join("?" * len(topic_ids))

    pending = query(
        f"SELECT DISTINCT topic_id FROM revisions WHERE topic_id IN ({placeholders}) AND status = 'pending'",
        topic_ids,
    )
    last_rev = query(
        f"SELECT MAX(completed_date) d FROM revisions WHERE topic_id IN ({placeholders}) AND status = 'done'",
        topic_ids, one=True,
    )
    next_rev = query(
        f"SELECT MIN(scheduled_date) d FROM revisions WHERE topic_id IN ({placeholders}) AND status = 'pending'",
        topic_ids, one=True,
    )
    total_revisions = query(
        f"SELECT COUNT(*) c FROM revisions WHERE topic_id IN ({placeholders}) AND status = 'done'",
        topic_ids, one=True,
    )["c"]
    mastery_pct = round(sum(t["confidence_level"] for t in topics) / total_topics) if total_topics else 0

    return jsonify({
        "total_topics": total_topics,
        "completed_topics": completed_topics,
        "pending_revision_topics": len(pending),
        "last_revision_date": last_rev["d"],
        "next_revision_date": next_rev["d"],
        "total_revision_count": total_revisions,
        "mastery_pct": mastery_pct,
    })


@revision_bp.delete("/<int:revision_id>")
@login_required
def delete_revision(revision_id):
    execute("DELETE FROM revisions WHERE id = ?", (revision_id,))
    return jsonify({"ok": True})


@revision_bp.put("/<int:revision_id>/complete")
@login_required
def complete_revision(revision_id):
    data = request.get_json(force=True) or {}
    memory_strength = data.get("memory_strength", 70)
    confidence_level = data.get("confidence_level", 70)
    notes = data.get("notes")
    difficulty = data.get("difficulty")

    execute(
        """UPDATE revisions SET status = 'done', completed_date = ?, memory_strength = ?, confidence_level = ?,
               notes = COALESCE(?, notes), difficulty = COALESCE(?, difficulty)
           WHERE id = ?""",
        (date.today().isoformat(), memory_strength, confidence_level, notes, difficulty, revision_id),
    )
    rev = query("SELECT * FROM revisions WHERE id = ?", (revision_id,), one=True)
    execute(
        "UPDATE topics SET revision_count = revision_count + 1, confidence_level = ? WHERE id = ?",
        (confidence_level, rev["topic_id"]),
    )
    bump_daily_stat(current_user_id(), revisions_done=1)

    # If memory strength was low, pull the *next* pending revision closer instead of
    # leaving it on the default ladder — that's the "adaptive" part of spaced repetition.
    if memory_strength < 50:
        next_rev = query(
            "SELECT * FROM revisions WHERE topic_id = ? AND revision_number = ? AND status = 'pending'",
            (rev["topic_id"], rev["revision_number"] + 1), one=True,
        )
        if next_rev:
            new_date = (date.today() + timedelta(days=2)).isoformat()
            execute("UPDATE revisions SET scheduled_date = ? WHERE id = ?", (new_date, next_rev["id"]))

    return jsonify({"ok": True})
