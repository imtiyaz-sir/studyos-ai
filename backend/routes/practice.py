from flask import Blueprint, request, jsonify

from database import query, execute
from auth import login_required, current_user_id
from stats_utils import bump_daily_stat

practice_bp = Blueprint("practice", __name__, url_prefix="/api/practice")


@practice_bp.get("")
@login_required
def list_sessions():
    rows = query(
        """SELECT p.*, t.name AS topic_name FROM practice_sessions p
           LEFT JOIN topics t ON t.id = p.topic_id
           WHERE p.user_id = ? ORDER BY p.session_date DESC LIMIT 200""",
        (current_user_id(),),
    )
    return jsonify({"sessions": rows})


@practice_bp.post("")
@login_required
def create_session():
    data = request.get_json(force=True) or {}
    if not data.get("type"):
        return jsonify({"error": "Practice type is required."}), 400
    sid = execute(
        """INSERT INTO practice_sessions
           (user_id, topic_id, type, total_questions, correct_answers, duration_minutes, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        (
            current_user_id(), data.get("topic_id"), data["type"],
            data.get("total_questions", 0), data.get("correct_answers", 0),
            data.get("duration_minutes", 0), data.get("notes"),
        ),
    )
    if data.get("topic_id"):
        execute("UPDATE topics SET practice_count = practice_count + 1 WHERE id = ?", (data["topic_id"],))
    bump_daily_stat(current_user_id(), study_minutes=data.get("duration_minutes", 0), practice_sessions=1)
    return jsonify({"session": query("SELECT * FROM practice_sessions WHERE id = ?", (sid,), one=True)}), 201


@practice_bp.put("/<int:session_id>")
@login_required
def update_session(session_id):
    data = request.get_json(force=True) or {}
    fields, args = [], []
    for col in ("type", "total_questions", "correct_answers", "duration_minutes", "notes", "topic_id"):
        if col in data:
            fields.append(f"{col} = ?")
            args.append(data[col])
    if not fields:
        return jsonify({"error": "No fields to update."}), 400
    args += [session_id, current_user_id()]
    execute(f"UPDATE practice_sessions SET {', '.join(fields)} WHERE id = ? AND user_id = ?", args)
    return jsonify({"session": query("SELECT * FROM practice_sessions WHERE id = ?", (session_id,), one=True)})


@practice_bp.delete("/<int:session_id>")
@login_required
def delete_session(session_id):
    execute("DELETE FROM practice_sessions WHERE id = ? AND user_id = ?", (session_id, current_user_id()))
    return jsonify({"ok": True})


@practice_bp.get("/stats")
@login_required
def stats():
    uid = current_user_id()
    rows = query("SELECT * FROM practice_sessions WHERE user_id = ?", (uid,))
    total_q = sum(r["total_questions"] for r in rows)
    total_correct = sum(r["correct_answers"] for r in rows)
    accuracy = round((total_correct / total_q) * 100, 1) if total_q else 0
    by_type = {}
    for r in rows:
        by_type.setdefault(r["type"], {"sessions": 0, "questions": 0, "correct": 0})
        by_type[r["type"]]["sessions"] += 1
        by_type[r["type"]]["questions"] += r["total_questions"]
        by_type[r["type"]]["correct"] += r["correct_answers"]
    return jsonify({
        "total_sessions": len(rows),
        "total_questions": total_q,
        "accuracy_pct": accuracy,
        "total_practice_minutes": sum(r["duration_minutes"] for r in rows),
        "by_type": by_type,
    })
