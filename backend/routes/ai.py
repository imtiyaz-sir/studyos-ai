"""
ai.py — AI Assistant endpoints.

If ANTHROPIC_API_KEY is set in the environment, requests are answered by
Claude via a plain stdlib HTTPS call (no SDK dependency required). If no
key is configured, each endpoint falls back to a deterministic, rule-based
response generated from the student's own data, so the feature still works
out of the box with zero setup and zero cost.
"""
import os
import json
import urllib.request
import urllib.error
from datetime import date, timedelta
from flask import Blueprint, request, jsonify

from database import query, execute
from auth import login_required, current_user_id

ai_bp = Blueprint("ai", __name__, url_prefix="/api/ai")

ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY")
ANTHROPIC_MODEL = os.environ.get("ANTHROPIC_MODEL", "claude-sonnet-4-6")


def call_claude(system, prompt, max_tokens=800):
    """Minimal /v1/messages caller using urllib so no extra pip package is required."""
    if not ANTHROPIC_API_KEY:
        return None
    body = json.dumps({
        "model": ANTHROPIC_MODEL,
        "max_tokens": max_tokens,
        "system": system,
        "messages": [{"role": "user", "content": prompt}],
    }).encode()
    req = urllib.request.Request(
        "https://api.anthropic.com/v1/messages",
        data=body,
        headers={
            "content-type": "application/json",
            "x-api-key": ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read())
            return "".join(b.get("text", "") for b in data.get("content", []))
    except urllib.error.URLError:
        return None


def _weak_topics(uid, limit=5):
    return query(
        """SELECT t.id, t.name, t.confidence_level, s.name AS subject_name FROM topics t
           JOIN units u ON u.id = t.unit_id JOIN subjects s ON s.id = u.subject_id
           WHERE s.user_id = ? AND t.status != 'completed'
           ORDER BY t.confidence_level ASC, t.priority DESC LIMIT ?""",
        (uid, limit),
    )


@ai_bp.post("/study-plan")
@login_required
def study_plan():
    uid = current_user_id()
    data = request.get_json(force=True) or {}
    days = int(data.get("days", 7))
    weak = _weak_topics(uid, limit=days * 2)

    ai_text = call_claude(
        "You are a concise, encouraging study planner for a student.",
        f"Build a {days}-day study plan (one short paragraph per day) prioritizing these weak topics: "
        f"{', '.join(t['name'] + ' (' + t['subject_name'] + ')' for t in weak) or 'general revision'}. "
        "Keep each day to 2-3 sentences.",
    )

    if ai_text is None:
        # Deterministic fallback: round-robin the weakest topics across the requested days.
        plan = []
        for i in range(days):
            day_topics = weak[i::days] if weak else []
            plan.append({
                "day": (date.today() + timedelta(days=i)).isoformat(),
                "focus": [t["name"] for t in day_topics] or ["General revision & light practice"],
            })
        ai_text = None
    else:
        plan = None

    execute(
        "INSERT INTO ai_history (user_id, request_type, prompt, response) VALUES (?, ?, ?, ?)",
        (uid, "study_plan", f"{days}-day plan", ai_text or json.dumps(plan)),
    )
    return jsonify({"ai_generated": ai_text is not None, "plan_text": ai_text, "plan": plan})


@ai_bp.post("/explain")
@login_required
def explain_concept():
    data = request.get_json(force=True) or {}
    topic = (data.get("topic") or "").strip()
    if not topic:
        return jsonify({"error": "A topic/concept is required."}), 400

    ai_text = call_claude(
        "You are a patient tutor. Explain concepts simply, with a short example.",
        f"Explain this concept to a student in under 150 words: {topic}",
    )
    if ai_text is None:
        ai_text = (
            f"'{topic}' — add your ANTHROPIC_API_KEY environment variable to get real AI explanations here. "
            "Until then, use this space to paste your own notes or textbook definition."
        )

    execute(
        "INSERT INTO ai_history (user_id, request_type, prompt, response) VALUES (?, ?, ?, ?)",
        (current_user_id(), "explain", topic, ai_text),
    )
    return jsonify({"ai_generated": ANTHROPIC_API_KEY is not None, "explanation": ai_text})


@ai_bp.post("/flashcards")
@login_required
def flashcards():
    data = request.get_json(force=True) or {}
    topic = (data.get("topic") or "").strip()
    count = int(data.get("count", 5))
    if not topic:
        return jsonify({"error": "A topic is required."}), 400

    ai_text = call_claude(
        "You generate flashcards. Respond ONLY with a JSON array of {\"front\":...,\"back\":...} objects, nothing else.",
        f"Generate {count} flashcards for the topic: {topic}",
    )
    cards = None
    if ai_text:
        try:
            cards = json.loads(ai_text)
        except json.JSONDecodeError:
            cards = None
    if not cards:
        cards = [{"front": f"{topic} — key point #{i+1}", "back": "Fill in from your notes (connect ANTHROPIC_API_KEY for AI generation)."} for i in range(count)]

    execute(
        "INSERT INTO ai_history (user_id, request_type, prompt, response) VALUES (?, ?, ?, ?)",
        (current_user_id(), "flashcards", topic, json.dumps(cards)),
    )
    return jsonify({"ai_generated": ai_text is not None, "flashcards": cards})


@ai_bp.get("/weak-areas")
@login_required
def weak_areas():
    uid = current_user_id()
    weak = _weak_topics(uid, limit=8)
    return jsonify({"weak_topics": weak})


@ai_bp.post("/chat")
@login_required
def chat():
    data = request.get_json(force=True) or {}
    message = (data.get("message") or "").strip()
    if not message:
        return jsonify({"error": "Message is required."}), 400

    ai_text = call_claude(
        "You are StudyOS AI's in-app study assistant: warm, practical, and brief.",
        message,
    )
    if ai_text is None:
        ai_text = (
            "AI chat isn't connected yet — set ANTHROPIC_API_KEY in backend/.env to enable real answers. "
            "In the meantime, check the Weak Areas panel for topics that need attention."
        )

    execute(
        "INSERT INTO ai_history (user_id, request_type, prompt, response) VALUES (?, ?, ?, ?)",
        (uid, "chat", message, ai_text),
    )
    return jsonify({"ai_generated": ANTHROPIC_API_KEY is not None, "reply": ai_text})


@ai_bp.get("/history")
@login_required
def history():
    rows = query("SELECT * FROM ai_history WHERE user_id = ? ORDER BY created_at DESC LIMIT 50", (current_user_id(),))
    return jsonify({"history": rows})
