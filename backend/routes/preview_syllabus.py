import os

from flask import Blueprint, request, jsonify
from pypdf import PdfReader

from auth import login_required
from syllabus_parser import parse_syllabus

preview_bp = Blueprint(
    "preview_syllabus",
    __name__,
    url_prefix="/api/preview"
)

UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)


@preview_bp.post("/syllabus")
@login_required
def preview_syllabus():

    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files["file"]

    if file.filename == "":
        return jsonify({"error": "No file selected"}), 400

    filepath = os.path.join(UPLOAD_FOLDER, file.filename)
    file.save(filepath)

    reader = PdfReader(filepath)

    text = ""

    for page in reader.pages:
        page_text = page.extract_text()
        if page_text:
            text += page_text + "\n"

    os.remove(filepath)

    result = parse_syllabus(text)

    return jsonify(result)
@preview_bp.post("/text")
@login_required
def preview_text():

    data = request.get_json(force=True) or {}

    text = (data.get("text") or "").strip()

    if not text:
        return jsonify({
            "error": "No text provided"
        }), 400

    result = parse_syllabus(text)

    return jsonify(result)
