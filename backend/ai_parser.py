import os
import json
from google import genai

client = genai.Client(
    api_key=os.environ.get("GEMINI_API_KEY")
)


def ai_parse_syllabus(text):

    prompt = f"""
You are a university syllabus parser.

Convert this syllabus into JSON only.

Format:

{{
  "subject": "Subject name",
  "units": [
    {{
      "name": "Unit name",
      "topics": [
        "Topic 1",
        "Topic 2"
      ]
    }}
  ]
}}

Rules:
- Extract only syllabus content.
- Remove books, references, marks and instructions.
- Keep units and topics.
- Do not add explanations.

Syllabus:

{text}
"""

    response = client.models.generate_content(
        model="gemini-2.0-flash",
        contents=prompt
    )

    return json.loads(response.text)
