"""
auth.py — minimal session-based auth (no Flask-Login dependency needed,
since only Flask itself is guaranteed available). Uses Flask's signed
session cookie to store `user_id`, and werkzeug for password hashing.
"""
import secrets
from datetime import datetime, timedelta
from functools import wraps
from flask import Blueprint, request, jsonify, session
from werkzeug.security import generate_password_hash, check_password_hash

from database import query, execute

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


def login_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        if "user_id" not in session:
            return jsonify({"error": "Not authenticated"}), 401
        return fn(*args, **kwargs)
    return wrapper


def current_user_id():
    return session.get("user_id")


@auth_bp.post("/register")
def register():
    data = request.get_json(force=True) or {}
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not name or not email or len(password) < 6:
        return jsonify({"error": "Name, email, and a password of 6+ characters are required."}), 400

    existing = query("SELECT id FROM users WHERE email = ?", (email,), one=True)
    if existing:
        return jsonify({"error": "An account with that email already exists."}), 409

    user_id = execute(
        "INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)",
        (name, email, generate_password_hash(password)),
    )
    session["user_id"] = user_id
    user = query("SELECT id, name, email, theme, accent_color, xp, coins, level, current_streak FROM users WHERE id = ?", (user_id,), one=True)
    return jsonify({"user": user}), 201


@auth_bp.post("/login")
def login():
    data = request.get_json(force=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    user = query("SELECT * FROM users WHERE email = ?", (email,), one=True)
    if not user or not check_password_hash(user["password_hash"], password):
        return jsonify({"error": "Invalid email or password."}), 401

    session["user_id"] = user["id"]
    user.pop("password_hash", None)
    return jsonify({"user": user})


@auth_bp.post("/logout")
def logout():
    session.clear()
    return jsonify({"ok": True})


@auth_bp.get("/me")
def me():
    if "user_id" not in session:
        return jsonify({"user": None})
    user = query(
        "SELECT id, name, email, theme, accent_color, xp, coins, level, current_streak, longest_streak FROM users WHERE id = ?",
        (session["user_id"],), one=True,
    )
    return jsonify({"user": user})


@auth_bp.put("/me")
def update_me():
    if "user_id" not in session:
        return jsonify({"error": "Not authenticated"}), 401
    data = request.get_json(force=True) or {}
    fields, args = [], []
    for col in ("name", "theme", "accent_color"):
        if col in data:
            fields.append(f"{col} = ?")
            args.append(data[col])
    if not fields:
        return jsonify({"error": "No fields to update."}), 400
    args.append(session["user_id"])
    execute(f"UPDATE users SET {', '.join(fields)} WHERE id = ?", args)
    user = query(
        "SELECT id, name, email, theme, accent_color, xp, coins, level, current_streak, longest_streak FROM users WHERE id = ?",
        (session["user_id"],), one=True,
    )
    return jsonify({"user": user})
@auth_bp.post("/forgot-password")
def forgot_password():
    data = request.get_json(force=True) or {}
    email = (data.get("email") or "").strip().lower()

    user = query("SELECT id FROM users WHERE email = ?", (email,), one=True)

    if not user:
        return jsonify({
            "error": "No account found with this email."
        }), 404

    token = secrets.token_urlsafe(32)
    expires = datetime.utcnow() + timedelta(minutes=30)

    execute(
        "INSERT INTO password_resets (user_id, token, expires_at) VALUES (?, ?, ?)",
        (user["id"], token, expires.isoformat())
    )

    return jsonify({
        "message": "Password reset token generated.",
        "token": token
    })


@auth_bp.post("/reset-password")
def reset_password():
    data = request.get_json(force=True) or {}

    token = data.get("token")
    password = data.get("password")

    if not token or not password or len(password) < 6:
        return jsonify({
            "error": "Valid token and password (6+ characters) required."
        }), 400

    reset = query(
        "SELECT * FROM password_resets WHERE token = ?",
        (token,),
        one=True
    )

    if not reset:
        return jsonify({
            "error": "Invalid reset token."
        }), 400

    execute(
        "UPDATE users SET password_hash = ? WHERE id = ?",
        (
            generate_password_hash(password),
            reset["user_id"]
        )
    )

    execute(
        "DELETE FROM password_resets WHERE token = ?",
        (token,)
    )

    return jsonify({
        "message": "Password changed successfully."
    })
