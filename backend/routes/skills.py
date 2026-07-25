from flask import Blueprint, request, jsonify

from database import query, execute
from auth import login_required, current_user_id

skills_bp = Blueprint("skills", __name__, url_prefix="/api/skills")


@skills_bp.get("")
@login_required
def list_skills():
    skills = query("SELECT * FROM skills WHERE user_id = ? ORDER BY created_at", (current_user_id(),))
    for s in skills:
        s["milestones"] = query("SELECT * FROM skill_milestones WHERE skill_id = ?", (s["id"],))
    return jsonify({"skills": skills})


@skills_bp.post("")
@login_required
def create_skill():
    data = request.get_json(force=True) or {}
    if not data.get("name"):
        return jsonify({"error": "Skill name is required."}), 400
    sid = execute(
        """INSERT INTO skills (user_id, name, category, current_level, target_level)
           VALUES (?, ?, ?, ?, ?)""",
        (current_user_id(), data["name"], data.get("category", "General"),
         data.get("current_level", 1), data.get("target_level", 10)),
    )
    return jsonify({"skill": query("SELECT * FROM skills WHERE id = ?", (sid,), one=True)}), 201


@skills_bp.put("/<int:skill_id>")
@login_required
def update_skill(skill_id):
    data = request.get_json(force=True) or {}
    fields, args = [], []
    for col in ("name", "category", "current_level", "target_level", "hours_logged", "projects_count", "certificates"):
        if col in data:
            fields.append(f"{col} = ?")
            args.append(data[col])
    if not fields:
        return jsonify({"error": "No fields to update."}), 400
    args += [skill_id, current_user_id()]
    execute(f"UPDATE skills SET {', '.join(fields)} WHERE id = ? AND user_id = ?", args)
    return jsonify({"ok": True})


@skills_bp.post("/<int:skill_id>/milestones")
@login_required
def add_milestone(skill_id):
    data = request.get_json(force=True) or {}
    mid = execute(
        "INSERT INTO skill_milestones (skill_id, title, target_date) VALUES (?, ?, ?)",
        (skill_id, data.get("title", "New milestone"), data.get("target_date")),
    )
    return jsonify({"milestone": query("SELECT * FROM skill_milestones WHERE id = ?", (mid,), one=True)}), 201


@skills_bp.put("/milestones/<int:milestone_id>/toggle")
@login_required
def toggle_milestone(milestone_id):
    m = query("SELECT * FROM skill_milestones WHERE id = ?", (milestone_id,), one=True)
    if not m:
        return jsonify({"error": "Not found"}), 404
    execute("UPDATE skill_milestones SET completed = ? WHERE id = ?", (0 if m["completed"] else 1, milestone_id))
    return jsonify({"ok": True})


@skills_bp.delete("/milestones/<int:milestone_id>")
@login_required
def delete_milestone(milestone_id):
    execute("DELETE FROM skill_milestones WHERE id = ?", (milestone_id,))
    return jsonify({"ok": True})


@skills_bp.delete("/<int:skill_id>")
@login_required
def delete_skill(skill_id):
    execute("DELETE FROM skills WHERE id = ? AND user_id = ?", (skill_id, current_user_id()))
    return jsonify({"ok": True})
