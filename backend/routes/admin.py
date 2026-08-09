"""
routes/admin.py — private admin API.

Every route here is wrapped in @admin_required (see auth.py), which re-checks
is_admin against the database on every single request — it never trusts a
client-supplied flag, a cached session value, or the mere fact that the
frontend didn't show the Admin nav item. That backend check is the actual
security boundary; everything on the frontend is just UX.

Deliberately NOT duplicated here: syllabus (subjects/units/topics) CRUD.
The admin account owns its own subjects/units/topics exactly like any other
user, so the existing /api/subjects/* endpoints already work for the admin
with zero changes — no reason to build a parallel API for the same tables.
"""
from datetime import date, timedelta
from flask import Blueprint, request, jsonify

from database import query, execute
from auth import admin_required, current_user_id

admin_bp = Blueprint("admin", __name__, url_prefix="/api/admin")


@admin_bp.get("/stats")
@admin_required
def stats():
    """High-level counts only — no full-table loads, per the perf requirement."""
    total_users = query("SELECT COUNT(*) c FROM users", one=True)["c"]
    verified_users = query("SELECT COUNT(*) c FROM users WHERE is_verified = 1", one=True)["c"]
    blocked_users = query("SELECT COUNT(*) c FROM users WHERE is_blocked = TRUE", one=True)["c"]

    week_ago = (date.today() - timedelta(days=7)).isoformat()
    active_users_7d = query(
        "SELECT COUNT(DISTINCT user_id) c FROM daily_stats WHERE stat_date >= ?", (week_ago,), one=True
    )["c"]

    month_ago = (date.today() - timedelta(days=30)).isoformat()
    new_registrations_30d = query(
        "SELECT COUNT(*) c FROM users WHERE created_at >= ?", (month_ago,), one=True
    )["c"]

    total_subjects = query("SELECT COUNT(*) c FROM subjects", one=True)["c"]
    total_topics = query("SELECT COUNT(*) c FROM topics", one=True)["c"]
    total_tasks = query("SELECT COUNT(*) c FROM tasks", one=True)["c"]
    total_revisions_completed = query("SELECT COUNT(*) c FROM revisions WHERE status = 'done'", one=True)["c"]

    # Daily signups for the last 14 days — a real, DB-backed growth chart.
    signup_rows = query(
        "SELECT created_at::date AS d, COUNT(*) c FROM users WHERE created_at >= ? GROUP BY created_at::date",
        ((date.today() - timedelta(days=13)).isoformat(),),
    )
    signup_by_date = {str(row["d"]): row["c"] for row in signup_rows}
    signups_series = [
        {"date": (date.today() - timedelta(days=i)).isoformat(), "count": signup_by_date.get((date.today() - timedelta(days=i)).isoformat(), 0)}
        for i in range(13, -1, -1)
    ]

    return jsonify({
        "total_users": total_users,
        "verified_users": verified_users,
        "unverified_users": total_users - verified_users,
        "blocked_users": blocked_users,
        "active_users_7d": active_users_7d,
        "new_registrations_30d": new_registrations_30d,
        "total_subjects": total_subjects,
        "total_topics": total_topics,
        "total_tasks": total_tasks,
        "total_revisions_completed": total_revisions_completed,
        "signups_series": signups_series,
    })


@admin_bp.get("/users")
@admin_required
def list_users():
    """Paginated + searchable user list. Never selects password_hash or any token."""
    q = (request.args.get("q") or "").strip()
    page = max(1, int(request.args.get("page", 1)))
    per_page = min(50, max(1, int(request.args.get("per_page", 20))))
    offset = (page - 1) * per_page

    base_sql = "FROM users WHERE 1=1"
    args = []
    if q:
        base_sql += " AND (name ILIKE ? OR email ILIKE ?)"
        args += [f"%{q}%", f"%{q}%"]

    total = query(f"SELECT COUNT(*) c {base_sql}", args, one=True)["c"]
    users = query(
        f"""SELECT id, name, email, is_verified, is_admin, is_blocked, created_at, current_streak, level
            {base_sql} ORDER BY created_at DESC LIMIT ? OFFSET ?""",
        args + [per_page, offset],
    )

    return jsonify({"users": users, "total": total, "page": page, "per_page": per_page, "pages": max(1, -(-total // per_page))})


@admin_bp.get("/users/<int:user_id>")
@admin_required
def user_detail(user_id):
    user = query(
        "SELECT id, name, email, is_verified, is_admin, is_blocked, created_at, current_streak, longest_streak, level, xp FROM users WHERE id = ?",
        (user_id,), one=True,
    )
    if not user:
        return jsonify({"error": "Not found"}), 404

    counts = {
        "subjects": query("SELECT COUNT(*) c FROM subjects WHERE user_id = ?", (user_id,), one=True)["c"],
        "tasks": query("SELECT COUNT(*) c FROM tasks WHERE user_id = ?", (user_id,), one=True)["c"],
        "revisions_completed": query(
            """SELECT COUNT(*) c FROM revisions r JOIN topics t ON t.id = r.topic_id
               JOIN units u ON u.id = t.unit_id JOIN subjects s ON s.id = u.subject_id
               WHERE s.user_id = ? AND r.status = 'done'""",
            (user_id,), one=True,
        )["c"],
        "habits": query("SELECT COUNT(*) c FROM habits WHERE user_id = ?", (user_id,), one=True)["c"],
    }

    return jsonify({"user": user, "counts": counts})


@admin_bp.put("/users/<int:user_id>/block")
@admin_required
def block_user(user_id):
    if user_id == current_user_id():
        return jsonify({"error": "You can't block your own account."}), 400
    target = query("SELECT is_admin FROM users WHERE id = ?", (user_id,), one=True)
    if not target:
        return jsonify({"error": "Not found"}), 404
    execute("UPDATE users SET is_blocked = TRUE WHERE id = ?", (user_id,))
    return jsonify({"ok": True})


@admin_bp.put("/users/<int:user_id>/unblock")
@admin_required
def unblock_user(user_id):
    execute("UPDATE users SET is_blocked = FALSE WHERE id = ?", (user_id,))
    return jsonify({"ok": True})
