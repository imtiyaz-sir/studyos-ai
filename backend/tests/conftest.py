"""Test harness. Production uses PostgreSQL via psycopg; CI/sandboxes often have
neither. This installs a minimal fake `psycopg` backed by in-memory SQLite so
route-level authorization logic can be tested. It does NOT validate
Postgres-specific SQL (::date, ILIKE, schema.sql) — that needs a real Postgres.
"""
import re, sqlite3, sys, types
import pytest

_SHARED = sqlite3.connect(":memory:", check_same_thread=False)
_SHARED.row_factory = sqlite3.Row

class _Cur:
    def __init__(self): self._c = _SHARED.cursor()
    def __enter__(self): return self
    def __exit__(self, *a): pass
    def execute(self, sql, args=()):
        self._c.execute(sql.replace("%s", "?"), tuple(args)); return self
    def executemany(self, sql, seq): self._c.executemany(sql.replace("%s", "?"), seq)
    def fetchall(self): return [dict(r) for r in self._c.fetchall()]
    def fetchone(self):
        r = self._c.fetchone(); return dict(r) if r else None

class _Conn:
    def cursor(self): return _Cur()
    def commit(self): _SHARED.commit()
    def rollback(self): _SHARED.rollback()
    def close(self): pass

fake = types.ModuleType("psycopg"); fake.connect = lambda *a, **k: _Conn()
rows = types.ModuleType("psycopg.rows"); rows.dict_row = object()
fake.rows = rows
sys.modules.setdefault("psycopg", fake); sys.modules.setdefault("psycopg.rows", rows)

SCHEMA = """
CREATE TABLE users(id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, email TEXT, password_hash TEXT,
  is_verified INTEGER DEFAULT 1, is_admin INTEGER DEFAULT 0, is_blocked INTEGER DEFAULT 0);
CREATE TABLE subjects(id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, name TEXT);
CREATE TABLE units(id INTEGER PRIMARY KEY AUTOINCREMENT, subject_id INTEGER, name TEXT, order_index INTEGER DEFAULT 0);
CREATE TABLE topics(id INTEGER PRIMARY KEY AUTOINCREMENT, unit_id INTEGER, parent_topic_id INTEGER, name TEXT,
  priority TEXT, difficulty TEXT, estimated_hours REAL, status TEXT, actual_hours REAL, confidence_level INTEGER,
  notes TEXT, revision_count INTEGER DEFAULT 0, practice_count INTEGER DEFAULT 0);
CREATE TABLE revisions(id INTEGER PRIMARY KEY AUTOINCREMENT, topic_id INTEGER, revision_number INTEGER,
  scheduled_date TEXT, status TEXT, notes TEXT, difficulty TEXT);
CREATE TABLE notifications(id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, type TEXT, title TEXT,
  message TEXT NOT NULL, link TEXT, dedupe_key TEXT, is_read INTEGER DEFAULT 0, scheduled_for TEXT,
  created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%f','now')));
CREATE TABLE tasks(id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, title TEXT, time_of_day TEXT DEFAULT 'morning',
  estimated_minutes INTEGER DEFAULT 30, status TEXT DEFAULT 'pending', due_date TEXT);
CREATE TABLE exams(id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, title TEXT, exam_date TEXT, status TEXT DEFAULT 'upcoming');
CREATE TABLE daily_stats(id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, stat_date TEXT);
"""

@pytest.fixture()
def world(monkeypatch):
    _SHARED.executescript("DROP TABLE IF EXISTS users;DROP TABLE IF EXISTS subjects;DROP TABLE IF EXISTS units;"
                          "DROP TABLE IF EXISTS topics;DROP TABLE IF EXISTS revisions;DROP TABLE IF EXISTS notifications;DROP TABLE IF EXISTS tasks;DROP TABLE IF EXISTS exams;DROP TABLE IF EXISTS daily_stats;" + SCHEMA)
    _SHARED.executescript("""
      INSERT INTO users(name,email) VALUES('alice','a@x'),('mallory','m@x');
      INSERT INTO subjects(user_id,name) VALUES(1,'Alice Subject');
      INSERT INTO units(subject_id,name) VALUES(1,'Alice Unit');
      INSERT INTO topics(unit_id,name) VALUES(1,'Alice Topic');
      INSERT INTO revisions(topic_id,revision_number,scheduled_date,status) VALUES(1,1,'2030-01-01','pending');
    """)
    _SHARED.commit()
    import app as app_module
    flask_app = app_module.create_app(); flask_app.config["TESTING"] = True
    def client_for(uid):
        c = flask_app.test_client()
        with c.session_transaction() as s: s["user_id"] = uid
        return c
    return types.SimpleNamespace(alice=client_for(1), mallory=client_for(2), db=_SHARED)
