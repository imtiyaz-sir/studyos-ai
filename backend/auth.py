"""
auth.py — session-based auth with the "full authentication" essentials:
email verification, forgot/reset password, change password, delete account,
login lockout after repeated failures, and remember-me sessions.
"""
import os
import re
import secrets
from datetime import datetime, timedelta
from functools import wraps
from flask import Blueprint, request, jsonify, session
from werkzeug.security import generate_password_hash, check_password_hash

from database import query, execute
from email_utils import send_email

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")

FRONTEND_URL = os.environ.get("FRONTEND_ORIGIN", "http://localhost:5173")
MAX_FAILED_ATTEMPTS = 5
LOCKOUT_MINUTES = 15
RESET_TOKEN_HOURS = 1
VERIFY_TOKEN_HOURS = 24

USER_FIELDS = (
    "id, name, email, theme, accent_color, xp, coins, level, current_streak, "
    "longest_streak, daily_revision_goal, is_verified"
)


def login_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        if "user_id" not in session:
            return jsonify({"error": "Not authenticated"}), 401
        return fn(*args, **kwargs)
    return wrapper


def current_user_id():
    return session.get("user_id")


def _get_user(user_id):
    return query(f"SELECT {USER_FIELDS} FROM users WHERE id = ?", (user_id,), one=True)


def _validate_password(password):
    if len(password) < 8:
        return "Password must be at least 8 characters."
    if not re.search(r"[A-Za-z]", password) or not re.search(r"[0-9]", password):
        return "Password must include both letters and numbers."
    return None


def _now_iso():
    return datetime.utcnow().isoformat()


def _issue_verification_email(user_id, email, name):
    token = secrets.token_urlsafe(32)
    expires = (datetime.utcnow() + timedelta(hours=VERIFY_TOKEN_HOURS)).isoformat()
    execute("INSERT INTO email_verifications (user_id, token, expires_at) VALUES (?, ?, ?)", (user_id, token, expires))
    link = f"{FRONTEND_URL}/verify-email?token={token}"
    sent = send_email(
        email, "Verify your StudyOS AI account",
        f"Hi {name},\n\nVerify your email to unlock all features:\n{link}\n\nThis link expires in {VERIFY_TOKEN_HOURS} hours.",
    )
    return link, sent


# ── Register / Login / Logout ──────────────────────────────────────

@auth_bp.post("/register")
def register():
    data = request.get_json(force=True) or {}
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not name or not email:
        return jsonify({"error": "Name and email are required."}), 400
    pw_error = _validate_password(password)
    if pw_error:
        return jsonify({"error": pw_error}), 400

    existing = query("SELECT id FROM users WHERE email = ?", (email,), one=True)
    if existing:
        return jsonify({"error": "An account with that email already exists."}), 409

    user_id = execute(
        "INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)",
        (name, email, generate_password_hash(password)),
    )
    session.clear()
    session["user_id"] = user_id

    link, sent = _issue_verification_email(user_id, email, name)
    user = _get_user(user_id)
    resp = {"user": user}
    if not sent:
        resp["dev_verification_url"] = link  # only surfaced when SMTP isn't configured
    return jsonify(resp), 201


@auth_bp.post("/login")
def login():
    data = request.get_json(force=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    remember_me = bool(data.get("remember_me"))

    user = query("SELECT * FROM users WHERE email = ?", (email,), one=True)
    if not user:
        return jsonify({"error": "Invalid email or password."}), 401

    if user["locked_until"] and user["locked_until"] > _now_iso():
        return jsonify({"error": f"Account temporarily locked due to repeated failed attempts. Try again in a few minutes."}), 423

    if not check_password_hash(user["password_hash"], password):
        attempts = (user["failed_login_attempts"] or 0) + 1
        if attempts >= MAX_FAILED_ATTEMPTS:
            locked_until = (datetime.utcnow() + timedelta(minutes=LOCKOUT_MINUTES)).isoformat()
            execute("UPDATE users SET failed_login_attempts = 0, locked_until = ? WHERE id = ?", (locked_until, user["id"]))
            return jsonify({"error": f"Too many failed attempts. Account locked for {LOCKOUT_MINUTES} minutes."}), 423
        execute("UPDATE users SET failed_login_attempts = ? WHERE id = ?", (attempts, user["id"]))
        remaining = MAX_FAILED_ATTEMPTS - attempts
        return jsonify({"error": f"Invalid email or password. {remaining} attempt{'s' if remaining != 1 else ''} left before lockout."}), 401

    execute("UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = ?", (user["id"],))
    session.clear()
    session["user_id"] = user["id"]
    session.permanent = remember_me  # permanent uses PERMANENT_SESSION_LIFETIME; otherwise expires when the browser closes

    return jsonify({"user": _get_user(user["id"])})


@auth_bp.post("/logout")
def logout():
    session.clear()
    return jsonify({"ok": True})


@auth_bp.get("/me")
def me():
    if "user_id" not in session:
        return jsonify({"user": None})
    return jsonify({"user": _get_user(session["user_id"])})


@auth_bp.put("/me")
def update_me():
    if "user_id" not in session:
        return jsonify({"error": "Not authenticated"}), 401
    data = request.get_json(force=True) or {}
    fields, args = [], []
    for col in ("name", "theme", "accent_color", "daily_revision_goal"):
        if col in data:
            fields.append(f"{col} = ?")
            args.append(data[col])
    if not fields:
        return jsonify({"error": "No fields to update."}), 400
    args.append(session["user_id"])
    execute(f"UPDATE users SET {', '.join(fields)} WHERE id = ?", args)
    return jsonify({"user": _get_user(session["user_id"])})


# ── Email verification ─────────────────────────────────────────────

@auth_bp.post("/resend-verification")
@login_required
def resend_verification():
    user = query("SELECT * FROM users WHERE id = ?", (current_user_id(),), one=True)
    if user["is_verified"]:
        return jsonify({"error": "This account is already verified."}), 400
    link, sent = _issue_verification_email(user["id"], user["email"], user["name"])
    resp = {"ok": True}
    if not sent:
        resp["dev_verification_url"] = link
    return jsonify(resp)


@auth_bp.post("/verify-email")
def verify_email():
    data = request.get_json(force=True) or {}
    token = data.get("token")
    if not token:
        return jsonify({"error": "Missing token."}), 400

    row = query("SELECT * FROM email_verifications WHERE token = ?", (token,), one=True)
    if not row or row["used"] or row["expires_at"] < _now_iso():
        return jsonify({"error": "This verification link is invalid or has expired."}), 400

    execute("UPDATE users SET is_verified = 1 WHERE id = ?", (row["user_id"],))
    execute("UPDATE email_verifications SET used = 1 WHERE id = ?", (row["id"],))
    return jsonify({"ok": True})


# ── Forgot / reset password ────────────────────────────────────────

@auth_bp.post("/forgot-password")
def forgot_password():
    data = request.get_json(force=True) or {}
    email = (data.get("email") or "").strip().lower()
    user = query("SELECT * FROM users WHERE email = ?", (email,), one=True)

    # Always return success, whether or not the account exists — this avoids
    # leaking which emails are registered (a standard auth hardening practice).
    if not user:
        return jsonify({"ok": True})

    token = secrets.token_urlsafe(32)
    expires = (datetime.utcnow() + timedelta(hours=RESET_TOKEN_HOURS)).isoformat()
    execute("INSERT INTO password_resets (user_id, token, expires_at) VALUES (?, ?, ?)", (user["id"], token, expires))
    link = f"{FRONTEND_URL}/reset-password?token={token}"
    sent = send_email(
        email, "Reset your StudyOS AI password",
        f"Hi {user['name']},\n\nReset your password here:\n{link}\n\nThis link expires in {RESET_TOKEN_HOURS} hour and can only be used once.\n\nIf you didn't request this, you can ignore this email.",
    )
    resp = {"ok": True}
    if not sent:
        resp["dev_reset_url"] = link
    return jsonify(resp)


@auth_bp.post("/reset-password")
def reset_password():
    data = request.get_json(force=True) or {}
    token = data.get("token")
    new_password = data.get("password") or ""

    if not token:
        return jsonify({"error": "Missing token."}), 400
    pw_error = _validate_password(new_password)
    if pw_error:
        return jsonify({"error": pw_error}), 400

    row = query("SELECT * FROM password_resets WHERE token = ?", (token,), one=True)
    if not row or row["used"] or row["expires_at"] < _now_iso():
        return jsonify({"error": "This reset link is invalid or has expired."}), 400

    execute(
        "UPDATE users SET password_hash = ?, failed_login_attempts = 0, locked_until = NULL WHERE id = ?",
        (generate_password_hash(new_password), row["user_id"]),
    )
    execute("UPDATE password_resets SET used = 1 WHERE id = ?", (row["id"],))
    return jsonify({"ok": True})


# ── Change password / delete account ───────────────────────────────

@auth_bp.post("/change-password")
@login_required
def change_password():
    data = request.get_json(force=True) or {}
    current_password = data.get("current_password") or ""
    new_password = data.get("new_password") or ""

    user = query("SELECT * FROM users WHERE id = ?", (current_user_id(),), one=True)
    if not check_password_hash(user["password_hash"], current_password):
        return jsonify({"error": "Current password is incorrect."}), 401

    pw_error = _validate_password(new_password)
    if pw_error:
        return jsonify({"error": pw_error}), 400

    execute("UPDATE users SET password_hash = ? WHERE id = ?", (generate_password_hash(new_password), user["id"]))
    return jsonify({"ok": True})


@auth_bp.post("/delete-account")
@login_required
def delete_account():
    data = request.get_json(force=True) or {}
    password = data.get("password") or ""

    user = query("SELECT * FROM users WHERE id = ?", (current_user_id(),), one=True)
    if not check_password_hash(user["password_hash"], password):
        return jsonify({"error": "Password is incorrect."}), 401

    execute("DELETE FROM users WHERE id = ?", (user["id"],))  # cascades to all owned data
    session.clear()
    return jsonify({"ok": True})
