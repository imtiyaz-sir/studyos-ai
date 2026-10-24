"""routes/notifications.py — in-app notification inbox (history, unread count, read state).

Every query is scoped to the session user. `create_notification` is the single
entry point other modules (and future schedulers) must use: it validates the
deep-link and de-duplicates by `dedupe_key`.
"""
from flask import Blueprint, request, jsonify

from database import query, execute
from auth import login_required, current_user_id

notifications_bp = Blueprint("notifications", __name__, url_prefix="/api/notifications")

MAX_PAGE = 50
MAX_MESSAGE = 500


def safe_link(link):
    """Only same-site relative paths are allowed ("/revision"). Rejects absolute
    URLs, protocol-relative ("//evil.com"), backslash tricks and control chars,
    so a notification can never become an open redirect."""
    if not link or not isinstance(link, str):
        return None
    if len(link) > 300 or not link.startswith("/") or link.startswith("//"):
        return None
    if "\\" in link or any(ord(c) < 32 for c in link) or "://" in link:
        return None
    return link


def create_notification(user_id, type_, message, title=None, link=None, dedupe_key=None):
    """Insert a notification. Returns the new id, or None if it was a duplicate.
    A duplicate = same user + same dedupe_key already exists (e.g. "revision-due:2026-10-24")."""
    message = (message or "").strip()[:MAX_MESSAGE]
    if not message:
        raise ValueError("message is required")
    if dedupe_key and query(
        "SELECT 1 AS ok FROM notifications WHERE user_id = ? AND dedupe_key = ?",
        (user_id, dedupe_key), one=True,
    ):
        return None
    return execute(
        "INSERT INTO notifications (user_id, type, title, message, link, dedupe_key) VALUES (?, ?, ?, ?, ?, ?)",
        (user_id, type_ or "system", (title or "")[:120] or None, message, safe_link(link), dedupe_key),
    )


def _int_arg(name, default, lo, hi):
    try:
        return min(hi, max(lo, int(request.args.get(name, default))))
    except (TypeError, ValueError):
        return default


def _unread(uid):
    return query("SELECT COUNT(*) AS c FROM notifications WHERE user_id = ? AND is_read = 0", (uid,), one=True)["c"]


@notifications_bp.get("")
@login_required
def list_notifications():
    uid = current_user_id()
    limit = _int_arg("limit", 20, 1, MAX_PAGE)
    offset = _int_arg("offset", 0, 0, 100000)
    where, args = "user_id = ?", [uid]
    if request.args.get("unread") == "1":
        where += " AND is_read = 0"
    rows = query(
        f"""SELECT id, type, title, message, link, is_read, created_at FROM notifications
            WHERE {where} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?""",
        args + [limit, offset],
    )
    return jsonify({"notifications": rows, "unread_count": _unread(uid), "limit": limit, "offset": offset})


@notifications_bp.get("/unread-count")
@login_required
def unread_count():
    return jsonify({"unread_count": _unread(current_user_id())})


@notifications_bp.put("/read-all")
@login_required
def mark_all_read():
    execute("UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0", (current_user_id(),))
    return jsonify({"ok": True, "unread_count": 0})


@notifications_bp.put("/<int:notification_id>/read")
@login_required
def mark_read(notification_id):
    uid = current_user_id()
    if not query("SELECT 1 AS ok FROM notifications WHERE id = ? AND user_id = ?", (notification_id, uid), one=True):
        return jsonify({"error": "Not found"}), 404
    execute("UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?", (notification_id, uid))
    return jsonify({"ok": True, "unread_count": _unread(uid)})


@notifications_bp.delete("/<int:notification_id>")
@login_required
def delete_notification(notification_id):
    uid = current_user_id()
    if not query("SELECT 1 AS ok FROM notifications WHERE id = ? AND user_id = ?", (notification_id, uid), one=True):
        return jsonify({"error": "Not found"}), 404
    execute("DELETE FROM notifications WHERE id = ? AND user_id = ?", (notification_id, uid))
    return jsonify({"ok": True, "unread_count": _unread(uid)})
