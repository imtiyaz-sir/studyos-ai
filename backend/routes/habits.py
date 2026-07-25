from datetime import date, timedelta
from flask import Blueprint, request, jsonify

from database import query, execute
from auth import login_required, current_user_id
from stats_utils import bump_daily_stat

habits_bp = Blueprint("habits", __name__, url_prefix="/api/habits")


def _recompute_streak(habit_id):
    logs = query("SELECT log_date FROM habit_logs WHERE habit_id = ? AND completed = 1 ORDER BY log_date DESC", (habit_id,))
    log_dates = {r["log_date"] for r in logs}
    streak = 0
    cursor = date.today()
    while cursor.isoformat() in log_dates:
        streak += 1
        cursor -= timedelta(days=1)
    habit = query("SELECT longest_streak FROM habits WHERE id = ?", (habit_id,), one=True)
    longest = max(habit["longest_streak"], streak) if habit else streak
    execute("UPDATE habits SET current_streak = ?, longest_streak = ? WHERE id = ?", (streak, longest, habit_id))
    return streak, longest


@habits_bp.get("")
@login_required
def list_habits():
    uid = current_user_id()
    habits = query("SELECT * FROM habits WHERE user_id = ? ORDER BY created_at", (uid,))
    week_start = (date.today() - timedelta(days=date.today().weekday())).isoformat()
    for h in habits:
        week_logs = query(
            "SELECT log_date FROM habit_logs WHERE habit_id = ? AND completed = 1 AND log_date >= ?",
            (h["id"], week_start),
        )
        h["completed_this_week"] = len(week_logs)
        today_log = query("SELECT * FROM habit_logs WHERE habit_id = ? AND log_date = ?", (h["id"], date.today().isoformat()), one=True)
        h["done_today"] = bool(today_log)
    return jsonify({"habits": habits})


@habits_bp.post("")
@login_required
def create_habit():
    data = request.get_json(force=True) or {}
    if not data.get("name"):
        return jsonify({"error": "Habit name is required."}), 400
    hid = execute(
        "INSERT INTO habits (user_id, name, icon, target_per_week) VALUES (?, ?, ?, ?)",
        (current_user_id(), data["name"], data.get("icon", "check-circle"), data.get("target_per_week", 7)),
    )
    return jsonify({"habit": query("SELECT * FROM habits WHERE id = ?", (hid,), one=True)}), 201


@habits_bp.post("/<int:habit_id>/toggle")
@login_required
def toggle_today(habit_id):
    today = date.today().isoformat()
    existing = query("SELECT * FROM habit_logs WHERE habit_id = ? AND log_date = ?", (habit_id, today), one=True)
    if existing:
        execute("DELETE FROM habit_logs WHERE id = ?", (existing["id"],))
    else:
        execute("INSERT INTO habit_logs (habit_id, log_date, completed) VALUES (?, ?, 1)", (habit_id, today))
        bump_daily_stat(current_user_id())
    streak, longest = _recompute_streak(habit_id)
    return jsonify({"done_today": not bool(existing), "current_streak": streak, "longest_streak": longest})


@habits_bp.put("/<int:habit_id>")
@login_required
def update_habit(habit_id):
    data = request.get_json(force=True) or {}
    fields, args = [], []
    for col in ("name", "icon", "target_per_week"):
        if col in data:
            fields.append(f"{col} = ?")
            args.append(data[col])
    if not fields:
        return jsonify({"error": "No fields to update."}), 400
    args += [habit_id, current_user_id()]
    execute(f"UPDATE habits SET {', '.join(fields)} WHERE id = ? AND user_id = ?", args)
    return jsonify({"habit": query("SELECT * FROM habits WHERE id = ?", (habit_id,), one=True)})


@habits_bp.delete("/<int:habit_id>")
@login_required
def delete_habit(habit_id):
    execute("DELETE FROM habits WHERE id = ? AND user_id = ?", (habit_id, current_user_id()))
    return jsonify({"ok": True})
