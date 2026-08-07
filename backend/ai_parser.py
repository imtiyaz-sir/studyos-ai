import re

def clean(text):
    text = text.replace("\r", "").replace("\n", " ")
    text = re.sub(r"\s+", " ", text)
    return text.strip(" \t;:,-")

def ai_parse_syllabus(text):
    lines = [clean(x) for x in text.splitlines() if clean(x)]
    
    subject = "Imported Subject"
    units = []
    current_unit = None
    unit_counter = 1

    for line in lines:
        # Detect Unit headers (e.g., "UNIT 1", "Unit I", "Module 2", "Chapter 1")
        unit_match = re.search(r"\b(unit|module|chapter|part)\s*[-:]?\s*([ivxlcdm]+|\d+)(?:\s*[:.-]\s*(.*))?", line, re.I)
        
        if unit_match or (re.match(r"^\d+[\.\-\)]\s+[A-Z]", line) and len(line) < 50):
            unit_title = unit_match.group(3) if unit_match and unit_match.group(3) else line
            current_unit = {
                "name": f"UNIT {unit_counter}",
                "title": clean(unit_title),
                "topics": []
            }
            units.append(current_unit)
            unit_counter += 1
            continue

        # If no unit has started yet, check if it's the subject name
        if not units:
            if len(line) > 3 and not re.search(r"\bsemester\b|\bcredits?\b|\bmarks?\b|\bhours?\b", line, re.I):
                subject = line
            continue

        if current_unit is None:
            current_unit = {
                "name": f"UNIT {unit_counter}",
                "title": "General Topics",
                "topics": []
            }
            units.append(current_unit)
            unit_counter += 1

        # Skip metadata lines
        if re.search(r"\bcredits?\b|\bmarks?\b|\bsemester\b|\bhours?\b|\bpage\b|\btotal\b", line, re.I):
            continue

        # Split multiple topics separated by bullets, semicolons, or commas if long
        parts = re.split(r'[;•●]', line)
        for part in parts:
            part = clean(part)
            if not part or len(part) < 2:
                continue
            
            subtopics = []
            title = part

            # Check for colon or dash separating main topic and subtopics
            if ":" in part:
                t_part, s_part = part.split(":", 1)
                title = clean(t_part)
                subtopics = [clean(s) for s in re.split(r'[,/]', s_part) if clean(s)]
            elif "—" in part or " - " in part:
                splitter = "—" if "—" in part else " - "
                t_part, s_part = part.split(splitter, 1)
                title = clean(t_part)
                subtopics = [clean(s) for s in re.split(r'[,/]', s_part) if clean(s)]

            current_unit["topics"].append({
                "title": title,
                "subtopics": subtopics
            })

    # Fallback if nothing structured was found
    if not units:
        units.append({
            "name": "UNIT 1",
            "title": "Full Syllabus",
            "topics": [{"title": l, "subtopics": []} for l in lines if len(l) > 2]
        })

    return {
        "subject": subject,
        "units": units
    }
