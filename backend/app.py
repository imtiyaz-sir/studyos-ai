import os
from flask import Flask, jsonify, request
from flask_cors_lite import cors_after_request  # tiny local shim, see file for why

from database import init_db
from routes.admin import admin_bp
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


def create_app():
    app = Flask(__name__)
   
    app.config.update(
        SECRET_KEY=os.environ.get("SECRET_KEY", "dev-secret-change-me"),
        SESSION_COOKIE_SAMESITE="None",
        SESSION_COOKIE_SECURE=True,
        SESSION_COOKIE_HTTPONLY=True,
    )

    for bp in (
        auth_bp, subjects_bp, tasks_bp, revision_bp, practice_bp, habits_bp,
        skills_bp, goals_bp, notes_bp, calendar_bp, exams_bp, dashboard_bp, ai_bp, admin_bp,
    ):
        app.register_blueprint(bp)

    cors_after_request(
        app,
        origins=[
            "http://localhost:5173",
            os.environ.get("FRONTEND_ORIGIN", "https://studyos-ai-psi.vercel.app"),
        ],
    )

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


if __name__ == "__main__":
    app = create_app()
    app.run(debug=True, port=5000)
