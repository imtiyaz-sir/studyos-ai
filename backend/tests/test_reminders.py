from datetime import date
import reminders

TODAY = date(2026, 10, 24)  # Saturday

def _msgs(world, user=1):
    return [r[0] for r in world.db.execute("SELECT message FROM notifications WHERE user_id=? ORDER BY id", (user,))]

def test_plan_lists_tomorrows_tasks_morning_first_and_skips_done(world):
    world.db.executescript("""
      INSERT INTO tasks(user_id,title,time_of_day,estimated_minutes,due_date,status) VALUES
        (1,'Night revision','night',30,'2026-10-25','pending'),
        (1,'Micro Unit I MCQs','morning',60,'2026-10-25','pending'),
        (1,'Already done','morning',45,'2026-10-25','done'),
        (1,'Not tomorrow','morning',45,'2026-10-26','pending');
    """)
    assert reminders.run_plan(TODAY) == 1
    m = _msgs(world)[0]
    assert "2 tasks (1h 30m): Micro Unit I MCQs, Night revision" in m and "Sun, 25 Oct" in m
    assert "Already done" not in m and "Not tomorrow" not in m
    assert reminders.run_plan(TODAY) == 0 and len(_msgs(world)) == 1      # re-run = no duplicate
    assert _msgs(world, 2) == []                                         # user without plans gets nothing

def test_plan_counts_due_revisions(world):
    # fixture: Alice has one pending revision scheduled 2030 -> not due; make one due
    world.db.execute("UPDATE revisions SET scheduled_date='2026-10-25' WHERE id=1"); world.db.commit()
    assert reminders.run_plan(TODAY) == 1
    assert "1 revision due" in _msgs(world)[0]

def test_exam_countdown_only_on_milestones_and_once(world):
    world.db.executescript("""
      INSERT INTO exams(user_id,title,exam_date) VALUES
        (1,'Microeconomics','2026-10-27'), (1,'Finance','2026-10-30'),
        (1,'Past','2026-10-01'), (1,'No date',NULL);
      INSERT INTO exams(user_id,title,exam_date,status) VALUES (1,'Done exam','2026-10-27','completed');
    """)
    assert reminders.run_exam_countdown(TODAY) == 1                      # 3 days left only
    assert "Microeconomics exam is in 3 days" in _msgs(world)[0]
    assert reminders.run_exam_countdown(TODAY) == 0                      # no repeat same day
    assert reminders.run_exam_countdown(date(2026, 10, 26)) == 1         # next milestone: tomorrow
    assert "is tomorrow" in _msgs(world)[-1]
    # exam day: Microeconomics is TODAY, and Finance (30 Oct) hits its own 3-day milestone
    assert reminders.run_exam_countdown(date(2026, 10, 27)) == 2
    assert any("Microeconomics exam is TODAY" in m for m in _msgs(world))
    assert any("Finance exam is in 3 days" in m for m in _msgs(world))

def test_streak_warning_only_when_active_yesterday_and_not_today(world):
    world.db.executescript("""
      INSERT INTO daily_stats(user_id,stat_date) VALUES
        (1,'2026-10-23'),(1,'2026-10-22'),(1,'2026-10-21'),   -- Alice: 3-day streak, nothing today
        (2,'2026-10-24'),(2,'2026-10-23');                    -- Mallory: already studied today
    """)
    assert reminders.run_streak_check(TODAY) == 1
    assert "3-day streak ends today" in _msgs(world, 1)[0]
    assert _msgs(world, 2) == []
    assert reminders.run_streak_check(TODAY) == 0                        # no duplicate

def test_no_streak_warning_if_streak_already_broken(world):
    world.db.execute("INSERT INTO daily_stats(user_id,stat_date) VALUES (1,'2026-10-20')"); world.db.commit()
    assert reminders.run_streak_check(TODAY) == 0
