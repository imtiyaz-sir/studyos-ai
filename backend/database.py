import os
import queue
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
    ("users", "is_blocked", "BOOLEAN NOT NULL DEFAULT FALSE"),
    ("notifications", "title", "TEXT"),
    ("notifications", "link", "TEXT"),
    ("notifications", "dedupe_key", "TEXT"),
]

# Indexes that depend on migrated columns, so they must run after _MIGRATIONS.
_INDEX_MIGRATIONS = [
    "CREATE UNIQUE INDEX IF NOT EXISTS uq_notifications_dedupe ON notifications(user_id, dedupe_key) WHERE dedupe_key IS NOT NULL",
]


# ── Connection pool ─────────────────────────────────────────────
# Opening a Postgres connection (TCP + TLS + auth) costs 50-300 ms against a
# hosted database, and every query() used to open a new one — a dashboard load
# paid that ~11 times. Now finished connections are parked here and reused.
# This is an *idle cache*, not a limiter: if it is empty we just open a new
# connection, and extras beyond DB_POOL_SIZE are closed. Size is per process
# (gunicorn workers x DB_POOL_SIZE must stay under your Postgres connection limit).
_POOL_SIZE = int(os.environ.get("DB_POOL_SIZE", "5"))
_idle = queue.LifoQueue(maxsize=_POOL_SIZE)


class _PooledConn:
    """Thin proxy over a psycopg connection. close() returns it to the pool
    instead of closing it, so existing `conn.close()` call sites keep working."""

    def __init__(self, raw):
        self._raw = raw
        self.reused = False

    def __getattr__(self, name):
        return getattr(self._raw, name)

    def usable(self):
        return not getattr(self._raw, "closed", False) and not getattr(self._raw, "broken", False)

    def discard(self):
        try:
            self._raw.close()
        except Exception:
            pass

    def close(self):
        if not self.usable():
            return self.discard()
        try:
            self._raw.rollback()  # never park a connection with an open transaction
            _idle.put_nowait(self)
        except Exception:  # pool full, or rollback failed on a dead connection
            self.discard()


def _new_conn():
    return _PooledConn(psycopg.connect(DATABASE_URL, row_factory=dict_row, connect_timeout=10))


def get_db():
    """Borrow a connection (reused if one is idle). Always finish with conn.close()."""
    while True:
        try:
            conn = _idle.get_nowait()
        except queue.Empty:
            return _new_conn()
        if conn.usable():
            conn.reused = True
            return conn
        conn.discard()


def _run(work):
    """Run work(conn) on a pooled connection. A parked connection can have been
    dropped by the server while idle; if that is why it fails, retry once on a
    fresh connection. The connection is always returned/closed — even on error."""
    for attempt in (0, 1):
        conn = get_db()
        try:
            return work(conn)
        except psycopg.OperationalError:
            was_reused = conn.reused
            conn.discard()
            conn = None
            if not was_reused or attempt == 1:
                raise
        except Exception:
            try:
                conn.rollback()
            except Exception:
                pass
            raise
        finally:
            if conn is not None:
                conn.close()


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
            for stmt in _INDEX_MIGRATIONS:
                cur.execute(stmt)
        conn.commit()
        print("[database] Schema + migrations applied successfully.")
    except Exception as e:
        conn.rollback()
        print(f"[database] Schema init failed: {e}")
        raise
    finally:
        conn.close()


def query(sql, args=(), one=False):
    sql = sql.replace("?", "%s")

    def work(conn):
        with conn.cursor() as cur:
            cur.execute(sql, args)
            return cur.fetchall()

    rows = _run(work)
    if one:
        return rows[0] if rows else None
    return rows


def execute(sql, args=()):
    sql = sql.replace("?", "%s")
    is_insert = sql.strip().upper().startswith("INSERT")
    if is_insert:
        sql += " RETURNING id"

    def work(conn):
        with conn.cursor() as cur:
            cur.execute(sql, args)
            row = cur.fetchone() if is_insert else None
            conn.commit()
            return row["id"] if row else None

    return _run(work)


def executemany(sql, seq_of_args):
    sql = sql.replace("?", "%s")

    def work(conn):
        with conn.cursor() as cur:
            cur.executemany(sql, seq_of_args)
            conn.commit()

    _run(work)
