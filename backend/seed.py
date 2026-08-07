"""
seed.py — populates the database with one demo account so the frontend has
something real to render immediately after setup.

Run with:  python seed.py
Login with:  demo@studyos.ai / password123
"""
import random
from datetime import date, timedelta
from werkzeug.security import generate_password_hash

from database import init_db, execute, query
from routes.habits import _recompute_streak

random.seed(42)


def run():
    init_db()

    existing = query("SELECT id FROM users WHERE email = 'demo@studyos.ai'", one=True)
    if existing:
        print("Demo user already exists — skipping seed. Delete studyos.db to reseed.")
        return

    uid = execute(
        "INSERT INTO users (name, email, password_hash, xp, coins, level, current_streak, longest_streak, is_verified) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)",
        ("Demo Student", "demo@studyos.ai", generate_password_hash("password123"), 1240, 340, 3, 5, 12),
    )

    # ── Subjects → Units → Topics ────────────────────────────
    subjects_data = {
        "Data Structures & Algorithms": ("#6366f1", [
            ("Arrays & Strings", ["Two Pointers", "Sliding Window", "Prefix Sums"]),
            ("Trees & Graphs", ["Binary Trees", "BST", "Graph Traversal (BFS/DFS)"]),
            ("Dynamic Programming", ["1D DP", "2D DP", "Knapsack Variants"]),
        ]),
        "Operating Systems": ("#8b5cf6", [
            ("Process Management", ["Scheduling Algorithms", "Context Switching"]),
            ("Memory Management", ["Paging", "Segmentation", "Virtual Memory"]),
        ]),
        "Computer Networks": ("#10b981", [
            ("OSI & TCP/IP Model", ["Layers Overview", "Encapsulation"]),
            ("Routing", ["Distance Vector", "Link State"]),
        ]),
    }

    statuses = ["completed", "completed", "in_progress", "not_started"]
    subject_ids = {}
    for name, (color, units) in subjects_data.items():
        sid = execute("INSERT INTO subjects (user_id, name, color, semester) VALUES (?, ?, ?, ?)", (uid, name, color, "Semester 5"))
        subject_ids[name] = sid
        for u_idx, (unit_name, topics) in enumerate(units):
            unit_id = execute("INSERT INTO units (subject_id, name, order_index) VALUES (?, ?, ?)", (sid, unit_name, u_idx))
            for t_idx, topic_name in enumerate(topics):
                status = random.choice(statuses)
                topic_id = execute(
                    """INSERT INTO topics (unit_id, name, status, priority, difficulty, estimated_hours,
                                            actual_hours, confidence_level, order_index)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                    (
                        unit_id, topic_name, status, random.choice(["low", "medium", "high"]),
                        random.choice(["easy", "medium", "hard"]), round(random.uniform(2, 8), 1),
                        round(random.uniform(0, 6), 1), random.randint(30, 95), t_idx,
                    ),
                )
                if status == "completed":
                    running = date.today()
                    for i, gap in enumerate([1, 3, 7, 15, 30, 60], start=1):
                        running = running + timedelta(days=gap)
                        execute(
                            "INSERT INTO revisions (topic_id, revision_number, scheduled_date, status, difficulty) VALUES (?, ?, ?, ?, ?)",
                            (topic_id, i, running.isoformat(), "pending" if i > 1 else "done", random.choice(["easy", "medium", "hard"])),
                        )
                        if i == 1:
                            execute(
                                "UPDATE revisions SET completed_date = ?, memory_strength = 80, confidence_level = 80, notes = ? WHERE topic_id = ? AND revision_number = 1",
                                (date.today().isoformat(), "Solid recall, just watch the edge cases.", topic_id),
                            )
                    # Make a couple of revisions overdue so the dashboard has something to show in that tab.
                    if random.random() > 0.6:
                        execute(
                            "UPDATE revisions SET scheduled_date = ? WHERE topic_id = ? AND revision_number = 2",
                            ((date.today() - timedelta(days=random.randint(1, 5))).isoformat(), topic_id),
                        )

    # ── Extra historical revision completions (for a lived-in heatmap/chart) ──
    all_revision_ids = [r["id"] for r in query("SELECT id FROM revisions WHERE status = 'done'")]
    completed_topic_ids = list({r["topic_id"] for r in query("SELECT topic_id FROM revisions")})
    for _ in range(35):
        day = date.today() - timedelta(days=random.randint(1, 45))
        topic_id = random.choice(completed_topic_ids) if completed_topic_ids else None
        if not topic_id:
            continue
        execute(
            "INSERT INTO revisions (topic_id, revision_number, scheduled_date, completed_date, status, memory_strength, confidence_level, difficulty) VALUES (?, ?, ?, ?, 'done', ?, ?, ?)",
            (topic_id, 99, day.isoformat(), day.isoformat(), random.randint(50, 95), random.randint(50, 95), random.choice(["easy", "medium", "hard"])),
        )

    # ── Tasks (today's planner) ───────────────────────────────
    today = date.today().isoformat()
    for title, tod, status in [
        ("Revise Sliding Window problems", "morning", "done"),
        ("Watch OS scheduling lecture", "afternoon", "pending"),
        ("Solve 10 DP problems on LeetCode", "evening", "pending"),
        ("Read TCP/IP chapter notes", "night", "pending"),
    ]:
        execute(
            "INSERT INTO tasks (user_id, title, time_of_day, status, due_date, estimated_minutes) VALUES (?, ?, ?, ?, ?, ?)",
            (uid, title, tod, status, today, random.choice([30, 45, 60])),
        )

    # ── Habits ─────────────────────────────────────────────────
    for name, icon in [("Daily Study (2h+)", "book-open"), ("Morning Revision", "brain"),
                        ("Exercise", "dumbbell"), ("Sleep by 11PM", "moon"), ("Coding Practice", "code")]:
        hid = execute("INSERT INTO habits (user_id, name, icon) VALUES (?, ?, ?)", (uid, name, icon))
        # Always log today + yesterday so the seeded demo shows a live streak, then randomize the rest.
        execute("INSERT INTO habit_logs (habit_id, log_date, completed) VALUES (?, ?, 1) ON CONFLICT DO NOTHING", (hid, date.today().isoformat()))
        execute("INSERT INTO habit_logs (habit_id, log_date, completed) VALUES (?, ?, 1) ON CONFLICT DO NOTHING", (hid, (date.today() - timedelta(days=1)).isoformat()))
        for d in range(2, 7):
            if random.random() > 0.3:
                log_date = (date.today() - timedelta(days=d)).isoformat()
                execute("INSERT INTO habit_logs (habit_id, log_date, completed) VALUES (?, ?, 1) ON CONFLICT DO NOTHING", (hid, log_date))
        _recompute_streak(hid)

    # ── Skills ───────────────────────────────────────────────
    for name, cat, cur, tgt in [
        ("Python", "Programming", 7, 10), ("Competitive Programming", "Programming", 4, 8),
        ("Communication", "Soft Skills", 6, 9), ("System Design", "Programming", 3, 8),
    ]:
        skid = execute(
            "INSERT INTO skills (user_id, name, category, current_level, target_level, hours_logged, projects_count) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (uid, name, cat, cur, tgt, round(random.uniform(20, 150), 1), random.randint(1, 6)),
        )
        execute("INSERT INTO skill_milestones (skill_id, title, completed) VALUES (?, ?, ?)", (skid, f"Complete an intermediate {name} project", 1))
        execute("INSERT INTO skill_milestones (skill_id, title, completed) VALUES (?, ?, ?)", (skid, f"Reach level {tgt} in {name}", 0))

    # ── Goals ───────────────────────────────────────────────
    for title, period, target, current, unit in [
        ("Complete DSA revision cycle", "weekly", 5, 3, "topics"),
        ("Solve 100 practice problems", "monthly", 100, 42, "problems"),
        ("Finish OS syllabus", "monthly", 1, 0.6, "completion"),
        ("Crack placement interviews", "long_term", 1, 0.3, "completion"),
    ]:
        execute(
            "INSERT INTO goals (user_id, title, period, target_value, current_value, unit, due_date) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (uid, title, period, target, current, unit, (date.today() + timedelta(days=14)).isoformat()),
        )

    # ── Notes ───────────────────────────────────────────────
    execute(
        "INSERT INTO notes (user_id, title, content_markdown, folder, tags, pinned) VALUES (?, ?, ?, ?, ?, 1)",
        (uid, "Sliding Window Cheatsheet",
         "## Pattern\nExpand right, shrink left when constraint breaks.\n\n## Template\n```python\nleft = 0\nfor right in range(len(arr)):\n    # update window\n    while invalid:\n        left += 1\n```",
         "DSA", "algorithms,revision"),
    )
    execute(
        "INSERT INTO notes (user_id, title, content_markdown, folder, tags) VALUES (?, ?, ?, ?, ?)",
        (uid, "OS Scheduling Algorithms", "FCFS, SJF, Round Robin, Priority Scheduling — compare turnaround & waiting time.", "Operating Systems", "os"),
    )

    # ── Exams ───────────────────────────────────────────────
    execute(
        "INSERT INTO exams (user_id, subject_id, title, exam_date, status) VALUES (?, ?, ?, ?, 'upcoming')",
        (uid, subject_ids["Data Structures & Algorithms"], "DSA Mid-Semester Exam", (date.today() + timedelta(days=10)).isoformat()),
    )
    execute(
        "INSERT INTO exams (user_id, subject_id, title, year, marks_scored, marks_total, status) VALUES (?, ?, ?, ?, ?, ?, 'completed')",
        (uid, subject_ids["Operating Systems"], "OS Previous Year Paper 2024", 2024, 72, 100),
    )

    # ── Calendar events ─────────────────────────────────────
    execute(
        "INSERT INTO calendar_events (user_id, title, event_type, start_datetime) VALUES (?, ?, 'exam', ?)",
        (uid, "DSA Mid-Semester Exam", (date.today() + timedelta(days=10)).isoformat() + "T09:00"),
    )
    execute(
        "INSERT INTO calendar_events (user_id, title, event_type, start_datetime) VALUES (?, ?, 'study', ?)",
        (uid, "Deep work: Dynamic Programming", date.today().isoformat() + "T18:00"),
    )

    # ── Practice sessions + daily stats (last 14 days) ───────
    for d in range(14):
        day = date.today() - timedelta(days=d)
        study_minutes = random.randint(60, 240)
        tasks_done = random.randint(0, 4)
        revisions_done = random.randint(0, 2)
        practice_sessions = random.randint(0, 3)
        score = min(100, tasks_done * 10 + revisions_done * 8 + practice_sessions * 6 + min(study_minutes, 180) // 6)
        execute(
            """INSERT INTO daily_stats (user_id, stat_date, study_minutes, tasks_completed, revisions_done, practice_sessions, productivity_score)
               VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT DO NOTHING""",
            (uid, day.isoformat(), study_minutes, tasks_done, revisions_done, practice_sessions, score),
        )
        for _ in range(practice_sessions):
            total_q = random.randint(10, 30)
            correct = random.randint(int(total_q * 0.5), total_q)
            execute(
                "INSERT INTO practice_sessions (user_id, type, total_questions, correct_answers, duration_minutes, session_date) VALUES (?, ?, ?, ?, ?, ?)",
                (uid, random.choice(["mcq", "coding", "theory"]), total_q, correct, random.randint(15, 60), day.isoformat()),
            )

    print("Seed complete. Login with demo@studyos.ai / password123")


if __name__ == "__main__":
    run()
