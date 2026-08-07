from flask import Blueprint, request, jsonify

from database import query, execute
from auth import login_required, current_user_id

subjects_bp = Blueprint("subjects", __name__, url_prefix="/api/subjects")


def _topic_completion(topics):
    """% of topics (by count) marked completed, for a flat list of topic dicts."""
    if not topics:
        return 0
    done = sum(1 for t in topics if t["status"] == "completed")
    return round(done / len(topics) * 100)


def _build_topic_tree(flat_topics, parent_id=None):
    """Turn a flat list of topic rows into a nested tree by parent_topic_id."""
    children = [t for t in flat_topics if t["parent_topic_id"] == parent_id]
    for c in children:
        c["subtopics"] = _build_topic_tree(flat_topics, c["id"])
    return children


@subjects_bp.get("/topics/all")
@login_required
def all_topics():
    """Flat list of every topic across every subject — powers the global Syllabus tracker."""
    uid = current_user_id()
    rows = query(
        """SELECT t.*, u.name AS unit_name, s.id AS subject_id, s.name AS subject_name, s.color AS subject_color
           FROM topics t
           JOIN units u ON u.id = t.unit_id
           JOIN subjects s ON s.id = u.subject_id
           WHERE s.user_id = ?
           ORDER BY s.name, u.order_index, t.order_index""",
        (uid,),
    )
    return jsonify({"topics": rows})


@subjects_bp.get("")
@login_required
def list_subjects():
    uid = current_user_id()
    subjects = query(
        """SELECT s.*,
                  COUNT(DISTINCT u.id) AS unit_count,
                  COUNT(t.id) AS topic_count,
                  COALESCE(SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END), 0) AS completed_count
           FROM subjects s
           LEFT JOIN units u ON u.subject_id = s.id
           LEFT JOIN topics t ON t.unit_id = u.id
           WHERE s.user_id = ?
           GROUP BY s.id
           ORDER BY s.created_at""",
        (uid,),
    )
    for s in subjects:
        s["completion_pct"] = round(s["completed_count"] / s["topic_count"] * 100) if s["topic_count"] else 0
        del s["completed_count"]
    return jsonify({"subjects": subjects})


@subjects_bp.post("")
@login_required
def create_subject():
    data = request.get_json(force=True) or {}
    if not data.get("name"):
        return jsonify({"error": "Subject name is required."}), 400
    sid = execute(
        "INSERT INTO subjects (user_id, name, color, icon, semester) VALUES (?, ?, ?, ?, ?)",
        (current_user_id(), data["name"], data.get("color", "#6366f1"), data.get("icon", "book"), data.get("semester")),
    )
    subject = query("SELECT * FROM subjects WHERE id = ?", (sid,), one=True)
    return jsonify({"subject": subject}), 201


@subjects_bp.get("/<int:subject_id>")
@login_required
def get_subject(subject_id):
    subject = query("SELECT * FROM subjects WHERE id = ? AND user_id = ?", (subject_id, current_user_id()), one=True)
    if not subject:
        return jsonify({"error": "Not found"}), 404

    units = query("SELECT * FROM units WHERE subject_id = ? ORDER BY order_index", (subject_id,))
    all_topics = query(
        """SELECT t.* FROM topics t JOIN units u ON u.id = t.unit_id
           WHERE u.subject_id = ? ORDER BY u.order_index, t.order_index""",
        (subject_id,),
    )
    topics_by_unit = {}
    for t in all_topics:
        topics_by_unit.setdefault(t["unit_id"], []).append(t)
    for u in units:
        flat_topics = topics_by_unit.get(u["id"], [])
        u["completion_pct"] = _topic_completion(flat_topics)
        u["topics"] = _build_topic_tree(flat_topics)

    subject["units"] = units
    return jsonify({"subject": subject})


@subjects_bp.put("/<int:subject_id>")
@login_required
def update_subject(subject_id):
    data = request.get_json(force=True) or {}
    fields, args = [], []
    for col in ("name", "color", "icon", "semester"):
        if col in data:
            fields.append(f"{col} = ?")
            args.append(data[col])
    if not fields:
        return jsonify({"error": "No fields to update."}), 400
    args += [subject_id, current_user_id()]
    execute(f"UPDATE subjects SET {', '.join(fields)} WHERE id = ? AND user_id = ?", args)
    return jsonify({"ok": True})


@subjects_bp.delete("/<int:subject_id>")
@login_required
def delete_subject(subject_id):
    execute("DELETE FROM subjects WHERE id = ? AND user_id = ?", (subject_id, current_user_id()))
    return jsonify({"ok": True})


# ── Units ──────────────────────────────────────────────────
@subjects_bp.post("/<int:subject_id>/units")
@login_required
def create_unit(subject_id):
    data = request.get_json(force=True) or {}
    uid = execute(
        "INSERT INTO units (subject_id, name, order_index) VALUES (?, ?, ?)",
        (subject_id, data.get("name", "Untitled Unit"), data.get("order_index", 0)),
    )
    return jsonify({"unit": query("SELECT * FROM units WHERE id = ?", (uid,), one=True)}), 201


@subjects_bp.put("/units/<int:unit_id>")
@login_required
def update_unit(unit_id):
    data = request.get_json(force=True) or {}
    fields, args = [], []
    for col in ("name", "order_index"):
        if col in data:
            fields.append(f"{col} = ?")
            args.append(data[col])
    if not fields:
        return jsonify({"error": "No fields to update."}), 400
    args.append(unit_id)
    execute(f"UPDATE units SET {', '.join(fields)} WHERE id = ?", args)
    return jsonify({"unit": query("SELECT * FROM units WHERE id = ?", (unit_id,), one=True)})


@subjects_bp.delete("/units/<int:unit_id>")
@login_required
def delete_unit(unit_id):
    execute("DELETE FROM units WHERE id = ?", (unit_id,))
    return jsonify({"ok": True})


# ── Topics ─────────────────────────────────────────────────
@subjects_bp.post("/units/<int:unit_id>/topics")
@login_required
def create_topic(unit_id):
    data = request.get_json(force=True) or {}
    tid = execute(
        """INSERT INTO topics (unit_id, parent_topic_id, name, priority, difficulty, estimated_hours)
           VALUES (?, ?, ?, ?, ?, ?)""",
        (
            unit_id,
            data.get("parent_topic_id"),
            data.get("name", "Untitled Topic"),
            data.get("priority", "medium"),
            data.get("difficulty", "medium"),
            data.get("estimated_hours", 0),
        ),
    )
    return jsonify({"topic": query("SELECT * FROM topics WHERE id = ?", (tid,), one=True)}), 201


@subjects_bp.put("/topics/<int:topic_id>")
@login_required
def update_topic(topic_id):
    data = request.get_json(force=True) or {}
    fields, args = [], []
    editable = (
        "name", "status", "priority", "difficulty", "estimated_hours",
        "actual_hours", "confidence_level", "notes",
    )
    for col in editable:
        if col in data:
            fields.append(f"{col} = ?")
            args.append(data[col])
    if not fields:
        return jsonify({"error": "No fields to update."}), 400
    args.append(topic_id)
    execute(f"UPDATE topics SET {', '.join(fields)} WHERE id = ?", args)
    return jsonify({"topic": query("SELECT * FROM topics WHERE id = ?", (topic_id,), one=True)})


@subjects_bp.delete("/topics/<int:topic_id>")
@login_required
def delete_topic(topic_id):
    execute("DELETE FROM topics WHERE id = ?", (topic_id,))
    return jsonify({"ok": True})
