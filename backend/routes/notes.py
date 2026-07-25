from flask import Blueprint, request, jsonify

from database import query, execute
from auth import login_required, current_user_id

notes_bp = Blueprint("notes", __name__, url_prefix="/api/notes")


@notes_bp.get("")
@login_required
def list_notes():
    uid = current_user_id()
    search = request.args.get("q")
    folder = request.args.get("folder")
    sql = "SELECT * FROM notes WHERE user_id = ?"
    args = [uid]
    if search:
        sql += " AND (title LIKE ? OR content_markdown LIKE ? OR tags LIKE ?)"
        like = f"%{search}%"
        args += [like, like, like]
    if folder:
        sql += " AND folder = ?"
        args.append(folder)
    sql += " ORDER BY pinned DESC, updated_at DESC"
    return jsonify({"notes": query(sql, args)})


@notes_bp.post("")
@login_required
def create_note():
    data = request.get_json(force=True) or {}
    if not data.get("title"):
        return jsonify({"error": "Note title is required."}), 400
    nid = execute(
        """INSERT INTO notes (user_id, subject_id, topic_id, title, content_markdown, folder, tags)
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        (
            current_user_id(), data.get("subject_id"), data.get("topic_id"), data["title"],
            data.get("content_markdown", ""), data.get("folder", "General"), data.get("tags", ""),
        ),
    )
    return jsonify({"note": query("SELECT * FROM notes WHERE id = ?", (nid,), one=True)}), 201


@notes_bp.put("/<int:note_id>")
@login_required
def update_note(note_id):
    data = request.get_json(force=True) or {}
    fields, args = [], []
    for col in ("title", "content_markdown", "folder", "tags", "pinned", "subject_id", "topic_id"):
        if col in data:
            fields.append(f"{col} = ?")
            args.append(data[col])
    fields.append("updated_at = datetime('now')")
    args += [note_id, current_user_id()]
    execute(f"UPDATE notes SET {', '.join(fields)} WHERE id = ? AND user_id = ?", args)
    return jsonify({"note": query("SELECT * FROM notes WHERE id = ?", (note_id,), one=True)})


@notes_bp.delete("/<int:note_id>")
@login_required
def delete_note(note_id):
    execute("DELETE FROM notes WHERE id = ? AND user_id = ?", (note_id, current_user_id()))
    return jsonify({"ok": True})
