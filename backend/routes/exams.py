from flask import Blueprint, request, jsonify

from database import query, execute
from auth import login_required, current_user_id

exams_bp = Blueprint("exams", __name__, url_prefix="/api/exams")

def clean_val(val):
    """Convert empty strings to None so integer/numeric DB columns don't fail."""
    if val === "" or val is None:
        return None
    return val

@exams_bp.get("")
@login_required
def list_exams():
    status = request.args.get("status")
    uid = current_user_id()
    if status:
        rows = query("SELECT * FROM exams WHERE user_id = ? AND status = ? ORDER BY exam_date", (uid, status))
    else:
        rows = query("SELECT * FROM exams WHERE user_id = ? ORDER BY exam_date", (uid,))
    return jsonify({"exams": rows})


@exams_bp.post("")
@login_required
def create_exam():
    data = request.get_json(force=True) or {}
    if not data.get("title"):
        return jsonify({"error": "Exam title is required."}), 400
    
    eid = execute(
        """INSERT INTO exams (user_id, subject_id, title, exam_date, year, university, marks_scored,
                               marks_total, completion_time_minutes, mistakes, weak_topics, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            current_user_id(),
            clean_val(data.get("subject_id")),
            data["title"],
            clean_val(data.get("exam_date")),
            clean_val(data.get("year")),
            clean_val(data.get("university")),
            clean_val(data.get("marks_scored")),
            clean_val(data.get("marks_total")),
            clean_val(data.get("completion_time_minutes")),
            clean_val(data.get("mistakes")),
            clean_val(data.get("weak_topics")),
            data.get("status", "upcoming"),
        ),
    )
    return jsonify({"exam": query("SELECT * FROM exams WHERE id = ?", (eid,), one=True)}), 201


@exams_bp.put("/<int:exam_id>")
@login_required
def update_exam(exam_id):
    data = request.get_json(force=True) or {}
    fields, args = [], []
    for col in ("title", "exam_date", "year", "university", "marks_scored", "marks_total",
                "completion_time_minutes", "mistakes", "weak_topics", "status"):
        if col in data:
            fields.append(f"{col} = ?")
            args.append(clean_val(data[col]))
    if not fields:
        return jsonify({"error": "No fields to update."}), 400
    args += [exam_id, current_user_id()]
    execute(f"UPDATE exams SET {', '.join(fields)} WHERE id = ? AND user_id = ?", args)
    return jsonify({"ok": True})


@exams_bp.delete("/<int:exam_id>")
@login_required
def delete_exam(exam_id):
    execute("DELETE FROM exams WHERE id = ? AND user_id = ?", (exam_id, current_user_id()))
    return jsonify({"ok": True})
