from flask import Blueprint, request, jsonify

from database import query, execute
from auth import login_required, current_user_id

calendar_bp = Blueprint("calendar", __name__, url_prefix="/api/calendar")


@calendar_bp.get("")
@login_required
def list_events():
    uid = current_user_id()
    start = request.args.get("start")
    end = request.args.get("end")
    sql = "SELECT * FROM calendar_events WHERE user_id = ?"
    args = [uid]
    if start and end:
        sql += " AND start_datetime BETWEEN ? AND ?"
        args += [start, end]
    sql += " ORDER BY start_datetime"
    return jsonify({"events": query(sql, args)})


@calendar_bp.post("")
@login_required
def create_event():
    data = request.get_json(force=True) or {}
    if not data.get("title") or not data.get("start_datetime"):
        return jsonify({"error": "Title and start_datetime are required."}), 400
    eid = execute(
        """INSERT INTO calendar_events (user_id, title, event_type, start_datetime, end_datetime, subject_id, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        (
            current_user_id(), data["title"], data.get("event_type", "study"), data["start_datetime"],
            data.get("end_datetime"), data.get("subject_id"), data.get("notes"),
        ),
    )
    return jsonify({"event": query("SELECT * FROM calendar_events WHERE id = ?", (eid,), one=True)}), 201


@calendar_bp.put("/<int:event_id>")
@login_required
def update_event(event_id):
    data = request.get_json(force=True) or {}
    fields, args = [], []
    for col in ("title", "event_type", "start_datetime", "end_datetime", "subject_id", "notes"):
        if col in data:
            fields.append(f"{col} = ?")
            args.append(data[col])
    if not fields:
        return jsonify({"error": "No fields to update."}), 400
    args += [event_id, current_user_id()]
    execute(f"UPDATE calendar_events SET {', '.join(fields)} WHERE id = ? AND user_id = ?", args)
    return jsonify({"event": query("SELECT * FROM calendar_events WHERE id = ?", (event_id,), one=True)})


@calendar_bp.delete("/<int:event_id>")
@login_required
def delete_event(event_id):
    execute("DELETE FROM calendar_events WHERE id = ? AND user_id = ?", (event_id, current_user_id()))
    return jsonify({"ok": True})
