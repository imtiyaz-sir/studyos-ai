from flask import Blueprint, request, jsonify

from database import query, execute
from auth import admin_required

admin_bp = Blueprint("admin", __name__, url_prefix="/api/admin")


@admin_bp.get("/stats")
@admin_required
def stats():
    """High-level, aggregate-only admin metrics."""
    row = query(
        """
        SELECT
          (SELECT COUNT(*) FROM users) AS total_users,
          (SELECT COUNT(*) FROM users WHERE is_verified = 1) AS verified_users,
          (SELECT COUNT(*) FROM users WHERE is_verified = 0) AS unverified_users,
          (SELECT COUNT(*) FROM subjects) AS total_subjects,
          (SELECT COUNT(*) FROM topics) AS total_topics,
          (SELECT COUNT(*) FROM tasks) AS total_tasks,
          (SELECT COUNT(*) FROM revisions) AS total_revisions,
          (SELECT MAX(stat_date) FROM daily_stats) AS latest_activity_date
        """,
        one=True,
    )
    return jsonify({"stats": row})


@admin_bp.get("/users")
@admin_required
def list_users():
    try:
        page = max(1, int(request.args.get("page", 1)))
        per_page = min(50, max(1, int(request.args.get("per_page", 20))))
    except (TypeError, ValueError):
        return jsonify({"error": "Invalid pagination."}), 400

    search = (request.args.get("search") or "").strip()
    offset = (page - 1) * per_page
    pattern = f"%{search}%"

    total_row = query(
        "SELECT COUNT(*) AS count FROM users WHERE (? = '' OR name ILIKE ? OR email ILIKE ?)",
        (search, pattern, pattern),
        one=True,
    )

    users = query(
        """
        SELECT id, name, email, is_verified, is_admin, created_at
        FROM users
        WHERE (? = '' OR name ILIKE ? OR email ILIKE ?)
        ORDER BY created_at DESC, id DESC
        LIMIT ? OFFSET ?
        """,
        (search, pattern, pattern, per_page, offset),
    )

    return jsonify({
        "users": users,
        "pagination": {
            "page": page,
            "per_page": per_page,
            "total": total_row["count"],
            "pages": (total_row["count"] + per_page - 1) // per_page,
        },
    })


@admin_bp.get("/users/<int:user_id>")
@admin_required
def user_detail(user_id):
    user = query(
        """
        SELECT id, name, email, is_verified, is_admin, created_at
        FROM users
        WHERE id = ?
        """,
        (user_id,),
        one=True,
    )
    if not user:
        return jsonify({"error": "User not found."}), 404

    stats = query(
        """
        SELECT
          (SELECT COUNT(*) FROM subjects WHERE user_id = u.id) AS subjects_count,
          (SELECT COUNT(*) FROM topics t
             JOIN units un ON un.id = t.unit_id
             JOIN subjects s ON s.id = un.subject_id
             WHERE s.user_id = u.id) AS topics_count,
          (SELECT COUNT(*) FROM tasks WHERE user_id = u.id) AS tasks_count,
          (SELECT COUNT(*) FROM revisions r
             JOIN topics t ON t.id = r.topic_id
             JOIN units un ON un.id = t.unit_id
             JOIN subjects s ON s.id = un.subject_id
             WHERE s.user_id = u.id) AS revisions_count,
          (SELECT COUNT(*) FROM habits WHERE user_id = u.id) AS habits_count,
          (SELECT MAX(stat_date) FROM daily_stats WHERE user_id = u.id) AS last_activity_date
        FROM users u
        WHERE u.id = ?
        """,
        (user_id,),
        one=True,
    )

    return jsonify({"user": user, "stats": stats})


@admin_bp.get("/syllabus")
@admin_required
def syllabus_index():
    """Lightweight subject index. Full topic trees are fetched per subject."""
    try:
        page = max(1, int(request.args.get("page", 1)))
        per_page = min(50, max(1, int(request.args.get("per_page", 25))))
    except (TypeError, ValueError):
        return jsonify({"error": "Invalid pagination."}), 400

    search = (request.args.get("search") or "").strip()
    user_id = request.args.get("user_id")
    try:
        user_id = int(user_id) if user_id else None
    except ValueError:
        return jsonify({"error": "Invalid user_id."}), 400

    pattern = f"%{search}%"
    offset = (page - 1) * per_page
    where = """
        WHERE (? = '' OR s.name ILIKE ?)
          AND (? IS NULL OR s.user_id = ?)
    """
    args = (search, pattern, user_id, user_id)

    total = query(
        f"SELECT COUNT(*) AS count FROM subjects s {where}",
        args,
        one=True,
    )["count"]

    subjects = query(
        f"""
        SELECT
          s.id, s.name, s.semester, s.color, s.created_at,
          u.id AS owner_id, u.name AS owner_name, u.email AS owner_email,
          COUNT(DISTINCT un.id) AS unit_count,
          COUNT(t.id) AS topic_count
        FROM subjects s
        JOIN users u ON u.id = s.user_id
        LEFT JOIN units un ON un.subject_id = s.id
        LEFT JOIN topics t ON t.unit_id = un.id
        {where}
        GROUP BY s.id, u.id
        ORDER BY s.name, s.id
        LIMIT ? OFFSET ?
        """,
        args + (per_page, offset),
    )
    return jsonify({
        "subjects": subjects,
        "pagination": {
            "page": page,
            "per_page": per_page,
            "total": total,
            "pages": (total + per_page - 1) // per_page,
        },
    })


@admin_bp.get("/syllabus/<int:subject_id>")
@admin_required
def syllabus_subject(subject_id):
    subject = query(
        """
        SELECT s.id, s.user_id, s.name, s.semester, s.color, s.icon,
               u.name AS owner_name, u.email AS owner_email
        FROM subjects s
        JOIN users u ON u.id = s.user_id
        WHERE s.id = ?
        """,
        (subject_id,),
        one=True,
    )
    if not subject:
        return jsonify({"error": "Subject not found."}), 404

    units = query(
        "SELECT id, subject_id, name, order_index FROM units WHERE subject_id = ? ORDER BY order_index, id",
        (subject_id,),
    )
    topics = query(
        """
        SELECT t.*
        FROM topics t
        JOIN units u ON u.id = t.unit_id
        WHERE u.subject_id = ?
        ORDER BY t.unit_id, t.order_index, t.id
        """,
        (subject_id,),
    )
    by_unit = {u["id"]: [] for u in units}
    for topic in topics:
        by_unit.setdefault(topic["unit_id"], []).append(topic)

    def build_tree(items, parent_id=None):
        result = []
        for item in items:
            if item["parent_topic_id"] == parent_id:
                node = dict(item)
                node["subtopics"] = build_tree(items, item["id"])
                result.append(node)
        return result

    for unit in units:
        unit["topics"] = build_tree(by_unit.get(unit["id"], []))

    subject["units"] = units
    return jsonify({"subject": subject})


def _subject_exists(subject_id):
    return query("SELECT id FROM subjects WHERE id = ?", (subject_id,), one=True) is not None


@admin_bp.post("/syllabus/<int:subject_id>/units")
@admin_required
def create_unit(subject_id):
    if not _subject_exists(subject_id):
        return jsonify({"error": "Subject not found."}), 404
    data = request.get_json(force=True) or {}
    name = (data.get("name") or "").strip()
    if not name:
        return jsonify({"error": "Unit name is required."}), 400
    unit_id = execute(
        "INSERT INTO units (subject_id, name, order_index) VALUES (?, ?, ?)",
        (subject_id, name, data.get("order_index", 0)),
    )
    return jsonify({"unit": query("SELECT * FROM units WHERE id = ?", (unit_id,), one=True)}), 201


@admin_bp.put("/syllabus/units/<int:unit_id>")
@admin_required
def update_unit(unit_id):
    unit = query("SELECT id FROM units WHERE id = ?", (unit_id,), one=True)
    if not unit:
        return jsonify({"error": "Unit not found."}), 404
    data = request.get_json(force=True) or {}
    fields, args = [], []
    if "name" in data:
        name = (data["name"] or "").strip()
        if not name:
            return jsonify({"error": "Unit name is required."}), 400
        fields.append("name = ?")
        args.append(name)
    if "order_index" in data:
        fields.append("order_index = ?")
        args.append(data["order_index"])
    if not fields:
        return jsonify({"error": "No fields to update."}), 400
    args.append(unit_id)
    execute(f"UPDATE units SET {', '.join(fields)} WHERE id = ?", args)
    return jsonify({"unit": query("SELECT * FROM units WHERE id = ?", (unit_id,), one=True)})


@admin_bp.delete("/syllabus/units/<int:unit_id>")
@admin_required
def delete_unit(unit_id):
    unit = query("SELECT id FROM units WHERE id = ?", (unit_id,), one=True)
    if not unit:
        return jsonify({"error": "Unit not found."}), 404
    execute("DELETE FROM units WHERE id = ?", (unit_id,))
    return jsonify({"ok": True})


@admin_bp.post("/syllabus/units/<int:unit_id>/topics")
@admin_required
def create_topic(unit_id):
    unit = query("SELECT id FROM units WHERE id = ?", (unit_id,), one=True)
    if not unit:
        return jsonify({"error": "Unit not found."}), 404
    data = request.get_json(force=True) or {}
    name = (data.get("name") or "").strip()
    if not name:
        return jsonify({"error": "Topic name is required."}), 400

    parent_id = data.get("parent_topic_id")
    if parent_id is not None:
        parent = query(
            "SELECT id, unit_id FROM topics WHERE id = ?",
            (parent_id,),
            one=True,
        )
        if not parent or parent["unit_id"] != unit_id:
            return jsonify({"error": "Parent topic must belong to the same unit."}), 400

    topic_id = execute(
        """
        INSERT INTO topics
          (unit_id, parent_topic_id, name, priority, difficulty, estimated_hours, order_index)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (
            unit_id,
            parent_id,
            name,
            data.get("priority", "medium"),
            data.get("difficulty", "medium"),
            data.get("estimated_hours", 0),
            data.get("order_index", 0),
        ),
    )
    return jsonify({"topic": query("SELECT * FROM topics WHERE id = ?", (topic_id,), one=True)}), 201


@admin_bp.put("/syllabus/topics/<int:topic_id>")
@admin_required
def update_topic(topic_id):
    topic = query("SELECT id FROM topics WHERE id = ?", (topic_id,), one=True)
    if not topic:
        return jsonify({"error": "Topic not found."}), 404
    data = request.get_json(force=True) or {}
    fields, args = [], []
    editable = (
        "name", "status", "priority", "difficulty",
        "estimated_hours", "actual_hours", "confidence_level", "notes", "order_index",
    )
    for col in editable:
        if col in data:
            value = data[col]
            if col == "name":
                value = (value or "").strip()
                if not value:
                    return jsonify({"error": "Topic name is required."}), 400
            fields.append(f"{col} = ?")
            args.append(value)
    if not fields:
        return jsonify({"error": "No fields to update."}), 400
    args.append(topic_id)
    execute(f"UPDATE topics SET {', '.join(fields)} WHERE id = ?", args)
    return jsonify({"topic": query("SELECT * FROM topics WHERE id = ?", (topic_id,), one=True)})


@admin_bp.delete("/syllabus/topics/<int:topic_id>")
@admin_required
def delete_topic(topic_id):
    topic = query("SELECT id FROM topics WHERE id = ?", (topic_id,), one=True)
    if not topic:
        return jsonify({"error": "Topic not found."}), 404
    execute("DELETE FROM topics WHERE id = ?", (topic_id,))
    return jsonify({"ok": True})
