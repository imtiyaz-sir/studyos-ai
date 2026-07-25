from flask import Blueprint, jsonify
from auth import login_required, current_user_id
from database import query

admin_bp = Blueprint("admin", __name__, url_prefix="/api/admin")


def admin_required():
    user_id = current_user_id()

    if not user_id:
        return False

    user = query(
        "SELECT is_admin FROM users WHERE id = ?",
        (user_id,),
        one=True
    )

    return user and user["is_admin"] == 1


@admin_bp.get("/users")
@login_required
def get_users():
    if not admin_required():
        return jsonify({"error": "Admin access required"}), 403

    users = query(
        """
        SELECT id, name, email, level, xp, coins, current_streak, created_at
        FROM users
        ORDER BY created_at DESC
        """
    )

    return jsonify({"users": users})
