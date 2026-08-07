from flask import Blueprint, request, jsonify

from database import query, execute
from auth import login_required, current_user_id
from stats_utils import bump_daily_stat

tasks_bp = Blueprint("tasks", __name__, url_prefix="/api/tasks")


@tasks_bp.get("")
@login_required
def list_tasks():
    date = request.args.get("date")
    uid = current_user_id()
    if date:
        rows = query("SELECT * FROM tasks WHERE user_id = ? AND due_date = ? ORDER BY time_of_day", (uid, date))
    else:
        rows = query("SELECT * FROM tasks WHERE user_id = ? ORDER BY due_date DESC", (uid,))
    return jsonify({"tasks": rows})


@tasks_bp.post("")
@login_required
def create_task():
    data = request.get_json(force=True) or {}
    if not data.get("title"):
        return jsonify({"error": "Task title is required."}), 400
    tid = execute(
        """INSERT INTO tasks (user_id, subject_id, title, description, time_of_day, priority,
                               estimated_minutes, due_date, reminder_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            current_user_id(), data.get("subject_id"), data["title"], data.get("description"),
            data.get("time_of_day", "morning"), data.get("priority", "medium"),
            data.get("estimated_minutes", 30), data.get("due_date"), data.get("reminder_at"),
        ),
    )
    return jsonify({"task": query("SELECT * FROM tasks WHERE id = ?", (tid,), one=True)}), 201


@tasks_bp.put("/<int:task_id>")
@login_required
def update_task(task_id):
    data = request.get_json(force=True) or {}
    fields, args = [], []
    for col in ("title", "description", "time_of_day", "priority", "estimated_minutes", "status", "due_date", "reminder_at"):
        if col in data:
            fields.append(f"{col} = ?")
            args.append(data[col])
    if not fields:
        return jsonify({"error": "No fields to update."}), 400
    args += [task_id, current_user_id()]
    execute(f"UPDATE tasks SET {', '.join(fields)} WHERE id = ? AND user_id = ?", args)

    if data.get("status") == "done":
        task = query("SELECT * FROM tasks WHERE id = ?", (task_id,), one=True)
        bump_daily_stat(current_user_id(), study_minutes=task["estimated_minutes"] or 0, tasks_completed=1)

    return jsonify({"task": query("SELECT * FROM tasks WHERE id = ?", (task_id,), one=True)})


@tasks_bp.delete("/<int:task_id>")
@login_required
def delete_task(task_id):
    execute("DELETE FROM tasks WHERE id = ? AND user_id = ?", (task_id, current_user_id()))
    return jsonify({"ok": True})
