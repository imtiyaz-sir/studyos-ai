"""
StudyOS AI — Production Demo Seeder

Creates one safe demo student account with realistic sample data.

Demo login:
    Email: demo@studyos.ai
    Password: password123

Safe to run repeatedly:
- If the demo user already exists, it does nothing.
- It never deletes real users.
- It only creates data for the demo account.
"""

import random
from datetime import date, timedelta

from werkzeug.security import generate_password_hash

from database import init_db, execute, query


random.seed(42)

DEMO_EMAIL = "demo@studyos.ai"
DEMO_PASSWORD = "password123"


def get_demo_user():
    return query(
        "SELECT id FROM users WHERE email = ?",
        (DEMO_EMAIL,),
        one=True,
    )


def seed_subjects(uid):
    subjects_data = [
        (
            "Data Structures & Algorithms",
            "#6366f1",
            [
                ("Arrays & Strings", [
                    "Two Pointers",
                    "Sliding Window",
                    "Prefix Sums",
                    "Hashing",
                ]),
                ("Trees & Graphs", [
                    "Binary Trees",
                    "Binary Search Tree",
                    "BFS",
                    "DFS",
                ]),
                ("Dynamic Programming", [
                    "1D DP",
                    "2D DP",
                    "Knapsack",
                    "Memoization",
                ]),
            ],
        ),
        (
            "Operating Systems",
            "#8b5cf6",
            [
                ("Process Management", [
                    "Process Concept",
                    "Process States",
                    "Scheduling Algorithms",
                    "Context Switching",
                ]),
                ("Memory Management", [
                    "Paging",
                    "Segmentation",
                    "Virtual Memory",
                    "Page Replacement",
                ]),
                ("File Systems", [
                    "File Concepts",
                    "Directory Structure",
                    "File Allocation",
                ]),
            ],
        ),
        (
            "Computer Networks",
            "#10b981",
            [
                ("Network Models", [
                    "OSI Model",
                    "TCP/IP Model",
                    "Encapsulation",
                ]),
                ("Data Link Layer", [
                    "Error Detection",
                    "Flow Control",
                    "MAC Addressing",
                ]),
                ("Routing", [
                    "Distance Vector",
                    "Link State",
                    "Routing Protocols",
                ]),
            ],
        ),
        (
            "Database Management Systems",
            "#f59e0b",
            [
                ("Database Fundamentals", [
                    "DBMS Architecture",
                    "ER Model",
                    "Relational Model",
                ]),
                ("Normalization", [
                    "1NF",
                    "2NF",
                    "3NF",
                    "BCNF",
                ]),
                ("Transactions", [
                    "ACID Properties",
                    "Concurrency Control",
                    "Two Phase Locking",
                ]),
            ],
        ),
    ]

    subject_ids = {}

    for subject_name, color, units in subjects_data:
        subject_id = execute(
            """
            INSERT INTO subjects
                (user_id, name, color, semester)
            VALUES (?, ?, ?, ?)
            """,
            (
                uid,
                subject_name,
                color,
                "Semester 5",
            ),
        )

        subject_ids[subject_name] = subject_id

        for unit_index, (unit_name, topics) in enumerate(units):
            unit_id = execute(
                """
                INSERT INTO units
                    (subject_id, name, order_index)
                VALUES (?, ?, ?)
                """,
                (
                    subject_id,
                    unit_name,
                    unit_index,
                ),
            )

            for topic_index, topic_name in enumerate(topics):
                status = random.choice([
                    "completed",
                    "completed",
                    "completed",
                    "in_progress",
                    "not_started",
                ])

                topic_id = execute(
                    """
                    INSERT INTO topics
                    (
                        unit_id,
                        name,
                        status,
                        priority,
                        difficulty,
                        estimated_hours,
                        actual_hours,
                        confidence_level,
                        order_index
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        unit_id,
                        topic_name,
                        status,
                        random.choice(["low", "medium", "high"]),
                        random.choice(["easy", "medium", "hard"]),
                        round(random.uniform(2, 8), 1),
                        round(random.uniform(1, 6), 1)
                        if status != "not_started"
                        else 0,
                        random.randint(65, 95)
                        if status == "completed"
                        else random.randint(30, 70),
                        topic_index,
                    ),
                )

                # Add a couple of subtopics to selected topics.
                if topic_index == 0:
                    for sub_index, subtopic_name in enumerate([
                        f"{topic_name} Basics",
                        f"{topic_name} Practice",
                    ]):
                        execute(
                            """
                            INSERT INTO topics
                            (
                                unit_id,
                                parent_topic_id,
                                name,
                                status,
                                priority,
                                difficulty,
                                estimated_hours,
                                actual_hours,
                                confidence_level,
                                order_index
                            )
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                            """,
                            (
                                unit_id,
                                topic_id,
                                subtopic_name,
                                random.choice([
                                    "completed",
                                    "in_progress",
                                    "not_started",
                                ]),
                                "medium",
                                "medium",
                                1.5,
                                1.0,
                                random.randint(40, 90),
                                sub_index,
                            ),
                        )

                # Revision ladder for completed topics.
                if status == "completed":
                    today = date.today()

                    intervals = [0, 1, 3, 7, 15, 30]

                    for revision_number, days_after in enumerate(
                        intervals,
                        start=1,
                    ):
                        scheduled = today + timedelta(days=days_after)

                        if revision_number == 1:
                            revision_status = "done"
                            completed_date = today.isoformat()
                        else:
                            revision_status = "pending"
                            completed_date = None

                        execute(
                            """
                            INSERT INTO revisions
                            (
                                topic_id,
                                revision_number,
                                scheduled_date,
                                completed_date,
                                memory_strength,
                                confidence_level,
                                notes,
                                status
                            )
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                            """,
                            (
                                topic_id,
                                revision_number,
                                scheduled.isoformat(),
                                completed_date,
                                random.randint(70, 95),
                                random.randint(70, 95),
                                "Demo revision record",
                                revision_status,
                            ),
                        )

                    # One overdue revision for some topics.
                    if random.random() > 0.55:
                        execute(
                            """
                            UPDATE revisions
                            SET scheduled_date = ?
                            WHERE topic_id = ?
                              AND revision_number = 2
                            """,
                            (
                                (
                                    today
                                    - timedelta(days=random.randint(1, 5))
                                ).isoformat(),
                                topic_id,
                            ),
                        )

    return subject_ids


def seed_tasks(uid, subject_ids):
    today = date.today().isoformat()

    tasks = [
        (
            "Revise Sliding Window",
            "morning",
            "done",
            subject_ids["Data Structures & Algorithms"],
        ),
        (
            "Study OS Scheduling Algorithms",
            "afternoon",
            "pending",
            subject_ids["Operating Systems"],
        ),
        (
            "Practice TCP/IP questions",
            "evening",
            "pending",
            subject_ids["Computer Networks"],
        ),
        (
            "Revise Normalization",
            "night",
            "in_progress",
            subject_ids["Database Management Systems"],
        ),
        (
            "Solve 10 DSA problems",
            "evening",
            "pending",
            subject_ids["Data Structures & Algorithms"],
        ),
    ]

    for title, time_of_day, status, subject_id in tasks:
        execute(
            """
            INSERT INTO tasks
            (
                user_id,
                subject_id,
                title,
                time_of_day,
                priority,
                estimated_minutes,
                status,
                due_date
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                uid,
                subject_id,
                title,
                time_of_day,
                random.choice(["low", "medium", "high"]),
                random.choice([30, 45, 60, 90]),
                status,
                today,
            ),
        )


def seed_habits(uid):
    habits = [
        ("Daily Study", "book-open"),
        ("Morning Revision", "brain"),
        ("Coding Practice", "code"),
        ("Exercise", "dumbbell"),
        ("Sleep on Time", "moon"),
    ]

    for name, icon in habits:
        habit_id = execute(
            """
            INSERT INTO habits
            (
                user_id,
                name,
                icon,
                target_per_week
            )
            VALUES (?, ?, ?, ?)
            """,
            (
                uid,
                name,
                icon,
                7,
            ),
        )

        # Recent activity for a realistic streak.
        for days_ago in range(7):
            if days_ago < 5 or random.random() > 0.35:
                log_date = (
                    date.today()
                    - timedelta(days=days_ago)
                ).isoformat()

                execute(
                    """
                    INSERT INTO habit_logs
                        (habit_id, log_date, completed)
                    VALUES (?, ?, 1)
                    ON CONFLICT (habit_id, log_date) DO NOTHING
                    """,
                    (habit_id, log_date),
                )

        # Current streak values for the demo UI.
        execute(
            """
            UPDATE habits
            SET current_streak = 5,
                longest_streak = 12
            WHERE id = ?
            """,
            (habit_id,),
        )


def seed_skills(uid):
    skills = [
        ("Python", "Programming", 7, 10, 84, 4),
        ("Data Structures", "Programming", 6, 10, 72, 3),
        ("Communication", "Soft Skills", 6, 9, 38, 2),
        ("SQL", "Database", 7, 10, 55, 3),
        ("Problem Solving", "Core", 7, 10, 91, 5),
    ]

    for name, category, current, target, hours, projects in skills:
        skill_id = execute(
            """
            INSERT INTO skills
            (
                user_id,
                name,
                category,
                current_level,
                target_level,
                hours_logged,
                projects_count
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                uid,
                name,
                category,
                current,
                target,
                hours,
                projects,
            ),
        )

        execute(
            """
            INSERT INTO skill_milestones
                (skill_id, title, completed)
            VALUES (?, ?, ?)
            """,
            (
                skill_id,
                f"Complete intermediate {name} project",
                1,
            ),
        )

        execute(
            """
            INSERT INTO skill_milestones
                (skill_id, title, completed)
            VALUES (?, ?, ?)
            """,
            (
                skill_id,
                f"Reach level {target} in {name}",
                0,
            ),
        )


def seed_goals(uid):
    goals = [
        (
            "Complete DSA revision cycle",
            "weekly",
            5,
            3,
            "topics",
        ),
        (
            "Solve 100 practice problems",
            "monthly",
            100,
            42,
            "problems",
        ),
        (
            "Finish OS syllabus",
            "monthly",
            1,
            0.65,
            "completion",
        ),
        (
            "Improve Python skills",
            "long_term",
            10,
            7,
            "level",
        ),
    ]

    for title, period, target, current, unit in goals:
        execute(
            """
            INSERT INTO goals
            (
                user_id,
                title,
                period,
                target_value,
                current_value,
                unit,
                due_date,
                status
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, 'active')
            """,
            (
                uid,
                title,
                period,
                target,
                current,
                unit,
                (
                    date.today()
                    + timedelta(days=14)
                ).isoformat(),
            ),
        )


def seed_notes(uid, subject_ids):
    execute(
        """
        INSERT INTO notes
        (
            user_id,
            subject_id,
            title,
            content_markdown,
            folder,
            tags,
            pinned
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (
            uid,
            subject_ids["Data Structures & Algorithms"],
            "Sliding Window Cheatsheet",
            """## Sliding Window

Expand the right pointer and shrink the left pointer when the
window violates the required condition.

### Basic pattern

```python
left = 0

for right in range(len(arr)):
    # add arr[right]

    while invalid:
        left += 1
```""",
            "DSA",
            "algorithms,revision",
            1,
        ),
    )

    execute(
        """
        INSERT INTO notes
        (
            user_id,
            subject_id,
            title,
            content_markdown,
            folder,
            tags
        )
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (
            uid,
            subject_ids["Operating Systems"],
            "OS Scheduling Algorithms",
            """# Scheduling Algorithms

- FCFS
- SJF
- Round Robin
- Priority Scheduling

Important metrics:

- Waiting Time
- Turnaround Time
- Response Time
""",
            "Operating Systems",
            "os,scheduling",
        ),
    )

    execute(
        """
        INSERT INTO notes
        (
            user_id,
            subject_id,
            title,
            content_markdown,
            folder,
            tags
        )
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (
            uid,
            subject_ids["Database Management Systems"],
            "Normalization Notes",
            """# Normalization

1NF → Atomic values

2NF → 1NF + no partial dependency

3NF → 2NF + no transitive dependency
""",
            "DBMS",
            "dbms,normalization",
        ),
    )


def seed_exams(uid, subject_ids):
    execute(
        """
        INSERT INTO exams
        (
            user_id,
            subject_id,
            title,
            exam_date,
            university,
            marks_scored,
            marks_total,
            status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, 'upcoming')
        """,
        (
            uid,
            subject_ids["Data Structures & Algorithms"],
            "DSA Mid-Semester Examination",
            (
                date.today()
                + timedelta(days=10)
            ).isoformat(),
            "Demo University",
            None,
            100,
        ),
    )

    execute(
        """
        INSERT INTO exams
        (
            user_id,
            subject_id,
            title,
            year,
            university,
            marks_scored,
            marks_total,
            completion_time_minutes,
            status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'completed')
        """,
        (
            uid,
            subject_ids["Operating Systems"],
            "Operating Systems Previous Year Paper",
            2024,
            "Demo University",
            72,
            100,
            95,
        ),
    )


def seed_calendar(uid, subject_ids):
    today = date.today()

    execute(
        """
        INSERT INTO calendar_events
        (
            user_id,
            title,
            event_type,
            start_datetime,
            subject_id,
            notes
        )
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (
            uid,
            "DSA Mid-Semester Exam",
            "exam",
            (
                today
                + timedelta(days=10)
            ).isoformat() + "T09:00",
            subject_ids["Data Structures & Algorithms"],
            "Demo examination event",
        ),
    )

    execute(
        """
        INSERT INTO calendar_events
        (
            user_id,
            title,
            event_type,
            start_datetime,
            subject_id,
            notes
        )
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (
            uid,
            "Deep Work — Dynamic Programming",
            "study",
            today.isoformat() + "T18:00",
            subject_ids["Data Structures & Algorithms"],
            "Focused study session",
        ),
    )


def seed_practice(uid):
    topic_rows = query(
        """
        SELECT t.id
        FROM topics t
        JOIN units u ON u.id = t.unit_id
        JOIN subjects s ON s.id = u.subject_id
        WHERE s.user_id = ?
        AND t.parent_topic_id IS NULL
        LIMIT 20
        """,
        (uid,),
    )

    topic_ids = [row["id"] for row in topic_rows]

    for days_ago in range(14):
        session_date = (
            date.today()
            - timedelta(days=days_ago)
        ).isoformat()

        sessions = random.randint(1, 3)

        for _ in range(sessions):
            total = random.randint(10, 30)
            correct = random.randint(
                max(1, int(total * 0.55)),
                total,
            )

            topic_id = (
                random.choice(topic_ids)
                if topic_ids
                else None
            )

            execute(
                """
                INSERT INTO practice_sessions
                (
                    user_id,
                    topic_id,
                    type,
                    total_questions,
                    correct_answers,
                    duration_minutes,
                    session_date,
                    notes
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    uid,
                    topic_id,
                    random.choice([
                        "mcq",
                        "coding",
                        "theory",
                    ]),
                    total,
                    correct,
                    random.randint(15, 60),
                    session_date,
                    "Demo practice session",
                ),
            )


def seed_daily_stats(uid):
    for days_ago in range(30):
        stat_date = (
            date.today()
            - timedelta(days=days_ago)
        ).isoformat()

        study_minutes = random.randint(60, 240)
        tasks_completed = random.randint(0, 5)
        revisions_done = random.randint(0, 4)
        practice_sessions = random.randint(0, 3)

        productivity = min(
            100,
            int(
                tasks_completed * 10
                + revisions_done * 8
                + practice_sessions * 8
                + min(study_minutes, 180) / 3
            ),
        )

        execute(
            """
            INSERT INTO daily_stats
            (
                user_id,
                stat_date,
                study_minutes,
                tasks_completed,
                revisions_done,
                practice_sessions,
                productivity_score
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT (user_id, stat_date) DO NOTHING
            """,
            (
                uid,
                stat_date,
                study_minutes,
                tasks_completed,
                revisions_done,
                practice_sessions,
                productivity,
            ),
        )


def seed_notifications(uid):
    notifications = [
        (
            "revision",
            "You have 3 revisions due today.",
        ),
        (
            "exam",
            "DSA Mid-Semester Examination is coming up.",
        ),
        (
            "goal",
            "You are 60% through your OS syllabus goal.",
        ),
        (
            "practice",
            "Your recent practice accuracy is improving.",
        ),
    ]

    for notification_type, message in notifications:
        execute(
            """
            INSERT INTO notifications
            (
                user_id,
                type,
                message,
                is_read
            )
            VALUES (?, ?, ?, 0)
            """,
            (
                uid,
                notification_type,
                message,
            ),
        )


def create_demo_user():
    existing = get_demo_user()

    if existing:
        print(
            "[demo] Demo account already exists. "
            "No changes made."
        )
        return existing["id"], False

    uid = execute(
        """
        INSERT INTO users
        (
            name,
            email,
            password_hash,
            theme,
            accent_color,
            xp,
            coins,
            level,
            current_streak,
            longest_streak,
            last_active_date,
            daily_revision_goal,
            is_verified,
            is_admin,
            is_blocked
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            "Demo Student",
            DEMO_EMAIL,
            generate_password_hash(DEMO_PASSWORD),
            "light",
            "indigo",
            1240,
            340,
            3,
            5,
            12,
            date.today().isoformat(),
            5,
            1,
            False,
            False,
        ),
    )

    return uid, True


def run():
    print("[demo] Initializing database...")
    init_db()

    print("[demo] Checking demo account...")

    uid, created = create_demo_user()

    if not created:
        print("[demo] Nothing to seed.")
        return

    print("[demo] Creating subjects, units and topics...")
    subject_ids = seed_subjects(uid)

    print("[demo] Creating tasks...")
    seed_tasks(uid, subject_ids)

    print("[demo] Creating habits...")
    seed_habits(uid)

    print("[demo] Creating skills...")
    seed_skills(uid)

    print("[demo] Creating goals...")
    seed_goals(uid)

    print("[demo] Creating notes...")
    seed_notes(uid, subject_ids)

    print("[demo] Creating exams...")
    seed_exams(uid, subject_ids)

    print("[demo] Creating calendar events...")
    seed_calendar(uid, subject_ids)

    print("[demo] Creating practice history...")
    seed_practice(uid)

    print("[demo] Creating analytics history...")
    seed_daily_stats(uid)

    print("[demo] Creating notifications...")
    seed_notifications(uid)

    print()
    print("=" * 55)
    print("DEMO ACCOUNT CREATED")
    print("=" * 55)
    print(f"Email:    {DEMO_EMAIL}")
    print(f"Password: {DEMO_PASSWORD}")
    print("=" * 55)


if __name__ == "__main__":
    run()
