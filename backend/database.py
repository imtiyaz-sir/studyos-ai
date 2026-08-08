import os
import re
from pathlib import Path
import psycopg
from psycopg.rows import dict_row

DATABASE_URL = os.environ.get("DATABASE_URL")
SCHEMA_PATH = Path(__file__).resolve().parent / "schema.sql"

# Columns added after the initial schema shipped. Postgres supports
# `ADD COLUMN IF NOT EXISTS` directly, so — unlike the old SQLite version —
# this doesn't need a PRAGMA table_info check first.
_MIGRATIONS = [
    ("revisions", "notes", "TEXT"),
    ("revisions", "difficulty", "TEXT DEFAULT 'medium'"),
    ("users", "daily_revision_goal", "INTEGER DEFAULT 5"),
    ("users", "is_verified", "INTEGER DEFAULT 0"),
    ("users", "failed_login_attempts", "INTEGER DEFAULT 0"),
    ("users", "locked_until", "TEXT"),
    ("users", "is_admin", "BOOLEAN NOT NULL DEFAULT FALSE"),
]


def get_db():
    return psycopg.connect(
        DATABASE_URL,
        row_factory=dict_row
    )


def init_db():
    """Create all tables if they don't exist yet, then apply any pending column
    migrations. This used to be a no-op — meaning schema.sql never actually ran
    against Postgres, which is the most likely root cause of "columns don't
    exist" style failures (e.g. revision completion silently failing to save
    notes/difficulty). Safe to call on every boot: every statement below is
    idempotent (`IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS`)."""
    if not DATABASE_URL:
        print("[database] DATABASE_URL is not set — skipping schema init. Set it in your environment (Render/local .env).")
        return

    conn = get_db()
    try:
        with conn.cursor() as cur:
            sql = SCHEMA_PATH.read_text()
            # Strip full-line comments first — a naive "does this statement start
            # with --" check drops real CREATE TABLE statements whenever they're
            # preceded by a section-header comment, since the comment ends up
            # glued to the front of the next statement chunk.
            sql_no_comments = re.sub(r"^\s*--.*$", "", sql, flags=re.MULTILINE)
            statements = [s.strip() for s in sql_no_comments.split(";") if s.strip()]
            for stmt in statements:
                cur.execute(stmt)
        conn.commit()

        with conn.cursor() as cur:
            for table, column, coltype in _MIGRATIONS:
                cur.execute(f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS {column} {coltype}")
        conn.commit()
        print("[database] Schema + migrations applied successfully.")
    except Exception as e:
        conn.rollback()
        print(f"[database] Schema init failed: {e}")
        raise
    finally:
        conn.close()


def query(sql, args=(), one=False):
    conn = get_db()

    with conn.cursor() as cur:
        sql = sql.replace("?", "%s")
        cur.execute(sql, args)
        rows = cur.fetchall()

    conn.close()

    if one:
        return rows[0] if rows else None

    return rows


def execute(sql, args=()):
    conn = get_db()

    with conn.cursor() as cur:
        sql = sql.replace("?", "%s")

        if sql.strip().upper().startswith("INSERT"):
            sql += " RETURNING id"

        cur.execute(sql, args)

        last_id = None

        if sql.strip().upper().startswith("INSERT"):
            row = cur.fetchone()
            last_id = row["id"] if row else None

        conn.commit()

    conn.close()

    return last_id


def executemany(sql, seq_of_args):
    conn = get_db()

    with conn.cursor() as cur:
        sql = sql.replace("?", "%s")
        cur.executemany(sql, seq_of_args)
        conn.commit()

    conn.close()
