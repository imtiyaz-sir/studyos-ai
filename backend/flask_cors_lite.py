"""
flask_cors_lite.py — a tiny stand-in for the `flask-cors` package.

The target environment for this project ships only Flask itself, so rather
than depend on a package that may not be installable, this file implements
the ~15 lines of CORS handling StudyOS AI actually needs: allow one
configured frontend origin, allow credentials (session cookies), and answer
CORS preflight (OPTIONS) requests. If you later `pip install flask-cors`,
you can delete this file and swap in `CORS(app, supports_credentials=True)`.
"""
from flask import request


def cors_after_request(app, origins="http://localhost:5173"):
    allowed = origins if isinstance(origins, (list, tuple)) else [origins]

    @app.after_request
    def _add_cors_headers(response):
        origin = request.headers.get("Origin")
        if origin in allowed:
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
            response.headers["Access-Control-Allow-Headers"] = "Content-Type"
            response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
        return response

    @app.before_request
    def _handle_preflight():
        if request.method == "OPTIONS":
            from flask import make_response
            return make_response("", 204)
