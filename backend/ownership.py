"""ownership.py — object-level authorization helpers.

Units, topics and revisions don't carry a user_id themselves; ownership is
derived by walking up to subjects.user_id. Every route that accepts one of
these ids from the client must call the matching helper first, otherwise any
logged-in user can read/modify/delete another user's data by guessing ids.
"""
from database import query


def owns_subject(subject_id, user_id):
    return query("SELECT 1 AS ok FROM subjects WHERE id = ? AND user_id = ?",
                 (subject_id, user_id), one=True) is not None


def owns_unit(unit_id, user_id):
    return query(
        """SELECT 1 AS ok FROM units u JOIN subjects s ON s.id = u.subject_id
           WHERE u.id = ? AND s.user_id = ?""",
        (unit_id, user_id), one=True) is not None


def owns_topic(topic_id, user_id):
    return query(
        """SELECT 1 AS ok FROM topics t JOIN units u ON u.id = t.unit_id
           JOIN subjects s ON s.id = u.subject_id
           WHERE t.id = ? AND s.user_id = ?""",
        (topic_id, user_id), one=True) is not None


def owns_revision(revision_id, user_id):
    return query(
        """SELECT 1 AS ok FROM revisions r JOIN topics t ON t.id = r.topic_id
           JOIN units u ON u.id = t.unit_id JOIN subjects s ON s.id = u.subject_id
           WHERE r.id = ? AND s.user_id = ?""",
        (revision_id, user_id), one=True) is not None
