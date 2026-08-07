import re

UNIT_RE = re.compile(
    r"^(UNIT|MODULE|CHAPTER)\s*([IVXLCDM]+|\d+)?\s*[:.-]?\s*(.*)$",
    re.IGNORECASE,
)


def clean(text):
    text = text.replace("\r", "")
    text = re.sub(r"\s+", " ", text)
    return text.strip(" \t;:,-")


def normalize(text):
    """
    Convert PDF text into logical lines by joining wrapped lines.

    Only merges a line into the previous one when there's a real signal that
    it's a continuation (the previous line trails off with a comma/semicolon/
    dash, or this line starts lowercase — i.e. mid-sentence). Short lines are
    NOT merged just for being short: syllabi very commonly list one topic per
    line ("Meaning of X", "Components of X", ...), and merging those together
    was the exact bug that turned 7 separate topics into 1.
    """

    text = (
        text.replace("•", "\n")
            .replace("●", "\n")
            .replace("▪", "\n")
    )

    raw = [
        clean(x)
        for x in text.splitlines()
        if clean(x)
    ]

    lines = []
    buffer = ""

    for line in raw:

        if UNIT_RE.match(line):

            if buffer:
                lines.append(buffer)

            buffer = ""
            lines.append(line)
            continue

        if not buffer:
            buffer = line
            continue

        trailing_continuation = buffer.endswith((",", ";", "—", "-", "and", "or"))
        starts_lowercase = line[:1].islower()

        if trailing_continuation or starts_lowercase:
            buffer += " " + line
        else:
            lines.append(buffer)
            buffer = line

    if buffer:
        lines.append(buffer)

    return lines


def split_blocks(line):
    return [
        clean(x)
        for x in line.split(";")
        if clean(x)
    ]


def parse_block(block):

    # Parent — children
    if "—" in block:

        parent, rest = block.split("—", 1)

        return {
            "title": clean(parent),
            "subtopics": [
                clean(x)
                for x in rest.split(",")
                if clean(x)
            ],
        }

    # Parent : children
    if block.count(":") == 1:

        parent, rest = block.split(":", 1)

        children = [
            clean(x)
            for x in rest.split(",")
            if clean(x)
        ]

        if len(children) >= 2:
            return {
                "title": clean(parent),
                "subtopics": children,
            }

    # Parent (child1, child2)
    m = re.match(r"^(.*?)\((.*?)\)$", block)

    if m:

        return {
            "title": clean(m.group(1)),
            "subtopics": [
                clean(x)
                for x in m.group(2).split(",")
                if clean(x)
            ],
        }

    return {
        "title": clean(block),
        "subtopics": [],
    }


def parse_syllabus(text):

    lines = normalize(text)

    subject = "Imported Subject"

    units = []
    current = None

    seen_unit = False

    for line in lines:

        m = UNIT_RE.match(line)

        if m:

            seen_unit = True

            current = {
                "name": f"UNIT {m.group(2) or ''}".strip(),
                "title": clean(m.group(3)),
                "topics": [],
                "selected": True,
            }

            units.append(current)
            continue

        if not seen_unit:

            if (
                len(line) > 5
                and not re.search(
                    r"\bsemester\b|\bcredits?\b|\bmarks?\b|\bhours?\b|\bpage\b",
                    line,
                    re.I,
                )
            ):
                subject = line

            continue

        if current is None:
            continue

        if re.search(
            r"\bcredits?\b|\bmarks?\b|\bsemester\b|\bhours?\b|\bpage\b|\btotal\b",
            line,
            re.I,
        ):
            continue

        for block in split_blocks(line):

            topic = parse_block(block)

            if topic["title"]:
                current["topics"].append(topic)

    return {
        "subject": subject,
        "units": units,
    }
