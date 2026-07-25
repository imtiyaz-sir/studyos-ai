from flask import Blueprint, request, jsonify

from database import query, execute
from auth import login_required, current_user_id

goals_bp = Blueprint("goals", __name__, url_prefix="/api/goals")


@goals_bp.get("")
@login_required
def list_goals():
    period = request.args.get("period")
    uid = current_user_id()
    if period:
        rows = query("SELECT * FROM goals WHERE user_id = ? AND period = ? ORDER BY due_date", (uid, period))
    else:
        rows = query("SELECT * FROM goals WHERE user_id = ? ORDER BY due_date", (uid,))
    for g in rows:
        g["progress_pct"] = round(min(g["current_value"] / g["target_value"], 1) * 100) if g["target_value"] else 0
    return jsonify({"goals": rows})


@goals_bp.post("")
@login_required
def create_goal():
    data = request.get_json(force=True) or {}
    if not data.get("title"):
        return jsonify({"error": "Goal title is required."}), 400
    gid = execute(
        """INSERT INTO goals (user_id, title, description, period, target_value, unit, due_date)
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        (
            current_user_id(), data["title"], data.get("description"), data.get("period", "weekly"),
            data.get("target_value", 1), data.get("unit", "tasks"), data.get("due_date"),
        ),
    )
    return jsonify({"goal": query("SELECT * FROM goals WHERE id = ?", (gid,), one=True)}), 201


@goals_bp.put("/<int:goal_id>")
@login_required
def update_goal(goal_id):
    data = request.get_json(force=True) or {}
    fields, args = [], []
    for col in ("title", "description", "period", "target_value", "current_value", "unit", "due_date", "status"):
        if col in data:
            fields.append(f"{col} = ?")
            args.append(data[col])
    if not fields:
        return jsonify({"error": "No fields to update."}), 400
    args += [goal_id, current_user_id()]
    execute(f"UPDATE goals SET {', '.join(fields)} WHERE id = ? AND user_id = ?", args)
    return jsonify({"ok": True})


@goals_bp.delete("/<int:goal_id>")
@login_required
def delete_goal(goal_id):
    execute("DELETE FROM goals WHERE id = ? AND user_id = ?", (goal_id, current_user_id()))
    return jsonify({"ok": True})
