import re

UNIT_RE = re.compile(
    r"^(?:UNIT|MODULE|CHAPTER|PART|\d+[\.\-\)]?)\s*([IVXLCDM]+|\d+)?\s*[:.-]?\s*(.*)$",
    re.IGNORECASE,
)

def clean(text):
    text = text.replace("\r", "")
    text = re.sub(r"\s+", " ", text)
    return text.strip(" \t;:,-")

def ai_parse_syllabus(text):
    """
    Pure Python based free parser. Does not use any paid AI or API keys.
    Extracts Subject, Units, Topics, and Subtopics using text patterns.
    """
    lines = [clean(x) for x in text.splitlines() if clean(x)]
    
    subject = "Imported Subject"
    units = []
    current_unit = None
    seen_unit = False

    for line in lines:
        m = UNIT_RE.match(line)

        # Detect Unit Header
        if m and len(line) < 60:
            seen_unit = True
            unit_num = m.group(1) or f"U{len(units)+1}"
            unit_title = m.group(2) or line

            current_unit = {
                "name": f"UNIT {unit_num}".strip(),
                "title": clean(unit_title),
                "topics": []
            }
            units.append(current_unit)
            continue

        # Detect Subject Name from first few lines if unit not started yet
        if not seen_unit:
            if len(line) > 3 and not re.search(r"\bsemester\b|\bcredits?\b|\bmarks?\b|\bhours?\b", line, re.I):
                subject = line
            continue

        if current_unit is None:
            current_unit = {
                "name": "UNIT 1",
                "title": "General Topics",
                "topics": []
            }
            units.append(current_unit)

        # Ignore metadata lines
        if re.search(r"\bcredits?\b|\bmarks?\b|\bsemester\b|\bhours?\b|\bpage\b|\btotal\b", line, re.I):
            continue

        # Split topics and subtopics using separators like colon or dash
        parts = re.split(r'[;•]', line)
        for part in parts:
            part = clean(part)
            if not part:
                continue
            
            # Check for subtopics separated by colon or dash (e.g., "Process: States, Threads")
            subtopics = []
            title = part

            if ":" in part:
                t_part, s_part = part.split(":", 1)
                title = clean(t_part)
                subtopics = [clean(s) for s in s_part.split(",") if clean(s)]
            elif "—" in part or "-" in part:
                splitter = "—" if "—" in part else "-"
                t_part, s_part = part.split(splitter, 1)
                title = clean(t_part)
                subtopics = [clean(s) for s in s_part.split(",") if clean(s)]

            current_unit["topics"].append({
                "title": title,
                "subtopics": subtopics
            })

    # Fallback if nothing was caught
    if not units:
        units.append({
            "name": "UNIT 1",
            "title": "Full Syllabus",
            "topics": [{"title": l, "subtopics": []} for l in lines if len(l) > 3]
        })

    return {
        "subject": subject,
        "units": units
    }
