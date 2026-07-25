"""
database.py — lightweight sqlite3 connection layer.

No ORM is used on purpose: the only pre-installed dependency in the target
environment is Flask itself, so this keeps `requirements.txt` to one line
and the whole backend runnable with zero native compilation. Swap this file
out for SQLAlchemy + psycopg2 if/when you move to PostgreSQL in production
(the schema.sql is already written in portable, standard SQL).
"""
import sqlite3
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = os.environ.get("STUDYOS_DB_PATH", str(BASE_DIR / "studyos.db"))
SCHEMA_PATH = BASE_DIR / "schema.sql"


def get_db():
    """Return a new connection with row access by column name and FKs on."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db():
    """Create all tables if they don't exist yet. Safe to call every boot."""
    conn = get_db()
    with open(SCHEMA_PATH, "r") as f:
        conn.executescript(f.read())
    conn.commit()
    conn.close()


def query(sql, args=(), one=False):
    """Run a SELECT and return list[dict] (or a single dict if one=True)."""
    conn = get_db()
    cur = conn.execute(sql, args)
    rows = [dict(r) for r in cur.fetchall()]
    conn.close()
    if one:
        return rows[0] if rows else None
    return rows


def execute(sql, args=()):
    """Run an INSERT/UPDATE/DELETE. Returns the new row id for INSERTs."""
    conn = get_db()
    cur = conn.execute(sql, args)
    conn.commit()
    new_id = cur.lastrowid
    conn.close()
    return new_id


def executemany(sql, seq_of_args):
    conn = get_db()
    conn.executemany(sql, seq_of_args)
    conn.commit()
    conn.close()
