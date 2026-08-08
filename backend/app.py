import os
from datetime import timedelta
from flask import Flask, jsonify, request, session
from flask_cors_lite import cors_after_request  # tiny local shim, see file for why

from database import init_db, query
from auth import auth_bp
from routes.subjects import subjects_bp
from routes.tasks import tasks_bp
from routes.revision import revision_bp
from routes.practice import practice_bp
from routes.habits import habits_bp
from routes.skills import skills_bp
from routes.goals import goals_bp
from routes.notes import notes_bp
from routes.calendar import calendar_bp
from routes.exams import exams_bp
from routes.dashboard import dashboard_bp
from routes.ai import ai_bp
from routes.import_syllabus import import_syllabus_bp
from routes.preview_syllabus import preview_bp
from routes.admin import admin_bp

# Endpoints unverified users may still hit even though they can't create/edit/delete
# data elsewhere — auth itself, plus read-only GETs, must always stay reachable.
VERIFICATION_EXEMPT_PREFIXES = ("/api/auth/",)


def create_app():
    app = Flask(__name__)
    app.secret_key = os.environ.get("SECRET_KEY", "dev-secret-change-me")
    app.config.update(
        SESSION_COOKIE_SAMESITE="None",
        SESSION_COOKIE_HTTPONLY=True,
        SESSION_COOKIE_SECURE=True,
        PERMANENT_SESSION_LIFETIME=timedelta(days=30),  # only applies when session.permanent=True ("remember me")
    )

    for bp in (
        auth_bp,
        subjects_bp,
        tasks_bp,
        revision_bp,
        practice_bp,
        habits_bp,
        skills_bp,
        goals_bp,
        notes_bp,
        calendar_bp,
        exams_bp,
        dashboard_bp,
        ai_bp,
        admin_bp,
    ):
        app.register_blueprint(bp)

    app.register_blueprint(import_syllabus_bp)
    
    app.register_blueprint(preview_bp)
    cors_after_request(
        app,
        origins=os.environ.get("FRONTEND_ORIGIN", "http://localhost:5173"),
    )

    @app.before_request
    def block_unverified_mutations():
        """Unverified accounts can browse (GET) but not create/edit/delete anything,
        per the 'prevent unverified users from accessing protected features' requirement."""
        if request.method in ("GET", "HEAD", "OPTIONS"):
            return None
        if any(request.path.startswith(p) for p in VERIFICATION_EXEMPT_PREFIXES):
            return None
        user_id = session.get("user_id")
        if not user_id:
            return None  # let the route's own @login_required handle the 401
        user = query("SELECT is_verified FROM users WHERE id = ?", (user_id,), one=True)
        if user and not user["is_verified"]:
            return jsonify({
                "error": "Please verify your email to unlock this feature.",
                "code": "email_unverified",
            }), 403
        return None

    @app.get("/")
    def index():
        return jsonify({
            "service": "StudyOS AI API",
            "status": "running",
            "health_check": "/api/health",
            "docs": "See backend/README.md for the full endpoint list.",
            "note": "This is the API only — run the frontend (see /frontend) to get the actual app UI.",
        })

    @app.get("/api/health")
    def health():
        return jsonify({"status": "ok"})

    @app.errorhandler(404)
    def not_found(e):
        return jsonify({
            "error": "Not found",
            "detail": f"No route matches {request.method} {request.path}.",
            "hint": "API routes are under /api/... — see backend/README.md for the full list.",
        }), 404

    @app.errorhandler(500)
    def server_error(e):
        return jsonify({"error": "Internal server error"}), 500

    with app.app_context():
        init_db()

    return app


app = create_app()

if __name__ == "__main__":
    app.run(debug=True, port=5000)
