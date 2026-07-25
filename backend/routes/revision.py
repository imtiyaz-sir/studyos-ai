from datetime import date, timedelta
from flask import Blueprint, request, jsonify

from database import query, execute
from auth import login_required, current_user_id
from stats_utils import bump_daily_stat

revision_bp = Blueprint("revision", __name__, url_prefix="/api/revision")

# Classic spaced-repetition ladder (days after the previous revision).
INTERVALS = [1, 3, 7, 16, 35]  # revision 1..5


@revision_bp.get("/due")
@login_required
def due_today():
    """Revisions scheduled for today or earlier, across all of the user's topics."""
    uid = current_user_id()
    rows = query(
        """SELECT r.*, t.name AS topic_name, s.name AS subject_name, s.color AS subject_color
           FROM revisions r
           JOIN topics t ON t.id = r.topic_id
           JOIN units u ON u.id = t.unit_id
           JOIN subjects s ON s.id = u.subject_id
           WHERE s.user_id = ? AND r.status = 'pending' AND r.scheduled_date <= ?
           ORDER BY r.scheduled_date""",
        (uid, date.today().isoformat()),
    )
    return jsonify({"due": rows})


@revision_bp.get("/topic/<int:topic_id>")
@login_required
def list_for_topic(topic_id):
    rows = query("SELECT * FROM revisions WHERE topic_id = ? ORDER BY revision_number", (topic_id,))
    return jsonify({"revisions": rows})


@revision_bp.post("/topic/<int:topic_id>/schedule")
@login_required
def schedule_first_revision(topic_id):
    """Kick off the 5-revision spaced-repetition plan for a topic that was just completed."""
    existing = query("SELECT id FROM revisions WHERE topic_id = ?", (topic_id,))
    if existing:
        return jsonify({"error": "Revision plan already exists for this topic."}), 409

    today = date.today()
    created = []
    running_date = today
    for i, gap in enumerate(INTERVALS, start=1):
        running_date = running_date + timedelta(days=gap) if i > 1 else today + timedelta(days=gap)
        rid = execute(
            "INSERT INTO revisions (topic_id, revision_number, scheduled_date, status) VALUES (?, ?, ?, 'pending')",
            (topic_id, i, running_date.isoformat()),
        )
        created.append(rid)
    return jsonify({"created": created}), 201


@revision_bp.delete("/<int:revision_id>")
@login_required
def delete_revision(revision_id):
    execute("DELETE FROM revisions WHERE id = ?", (revision_id,))
    return jsonify({"ok": True})


@revision_bp.put("/<int:revision_id>/complete")
@login_required
def complete_revision(revision_id):
    data = request.get_json(force=True) or {}
    memory_strength = data.get("memory_strength", 70)
    confidence_level = data.get("confidence_level", 70)

    execute(
        """UPDATE revisions SET status = 'done', completed_date = ?, memory_strength = ?, confidence_level = ?
           WHERE id = ?""",
        (date.today().isoformat(), memory_strength, confidence_level, revision_id),
    )
    rev = query("SELECT * FROM revisions WHERE id = ?", (revision_id,), one=True)
    execute(
        "UPDATE topics SET revision_count = revision_count + 1, confidence_level = ? WHERE id = ?",
        (confidence_level, rev["topic_id"]),
    )
    bump_daily_stat(current_user_id(), revisions_done=1)

    # If memory strength was low, pull the *next* pending revision closer instead of
    # leaving it on the default ladder — that's the "adaptive" part of spaced repetition.
    if memory_strength < 50:
        next_rev = query(
            "SELECT * FROM revisions WHERE topic_id = ? AND revision_number = ? AND status = 'pending'",
            (rev["topic_id"], rev["revision_number"] + 1), one=True,
        )
        if next_rev:
            new_date = (date.today() + timedelta(days=2)).isoformat()
            execute("UPDATE revisions SET scheduled_date = ? WHERE id = ?", (new_date, next_rev["id"]))

    return jsonify({"ok": True})
