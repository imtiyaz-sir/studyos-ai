"""Connection-pool behaviour: reuse, stale-connection recovery, no leaks."""
import database
import psycopg


class Raw:
    """Stands in for a psycopg connection and counts what happens to it."""
    created = []
    def __init__(self, fail_first_execute=False):
        self.closed = False; self.broken = False; self.rollbacks = 0; self.commits = 0
        self.fail = fail_first_execute; self.executed = []
        Raw.created.append(self)
    def cursor(self): return Cur(self)
    def commit(self): self.commits += 1
    def rollback(self): self.rollbacks += 1
    def close(self): self.closed = True

class Cur:
    def __init__(self, raw): self.raw = raw
    def __enter__(self): return self
    def __exit__(self, *a): pass
    def execute(self, sql, args=()):
        if self.raw.fail:
            self.raw.fail = False; self.raw.broken = True
            raise psycopg.OperationalError("server closed the connection unexpectedly")
        self.raw.executed.append(sql)
    def fetchall(self): return [{"c": 1}]
    def fetchone(self): return {"id": 7}


def _fresh_pool(monkeypatch, make=lambda: Raw()):
    Raw.created = []
    while not database._idle.empty(): database._idle.get_nowait()
    monkeypatch.setattr(database, "DATABASE_URL", "postgres://test")
    monkeypatch.setattr(psycopg, "connect", lambda *a, **k: make())


def test_many_queries_reuse_one_connection(monkeypatch):
    _fresh_pool(monkeypatch)
    for _ in range(11):                      # a dashboard load
        assert database.query("SELECT 1 AS c WHERE x = ?", (1,), one=True) == {"c": 1}
    assert len(Raw.created) == 1             # was 11 connections before the pool
    assert Raw.created[0].rollbacks == 11 and not Raw.created[0].closed

def test_execute_returns_id_and_commits(monkeypatch):
    _fresh_pool(monkeypatch)
    assert database.execute("INSERT INTO t (a) VALUES (?)", (1,)) == 7
    assert Raw.created[0].commits == 1 and "RETURNING id" in Raw.created[0].executed[0]

def test_stale_parked_connection_is_replaced_transparently(monkeypatch):
    _fresh_pool(monkeypatch)
    database.query("SELECT 1")                       # parks connection #1
    Raw.created[0].fail = True                       # server drops it while idle
    assert database.query("SELECT 2") == [{"c": 1}]  # caller never sees the error
    assert len(Raw.created) == 2 and Raw.created[0].closed

def test_fresh_connection_failure_is_not_retried_forever(monkeypatch):
    _fresh_pool(monkeypatch, make=lambda: Raw(fail_first_execute=True))
    try:
        database.query("SELECT 1"); raise AssertionError("expected OperationalError")
    except psycopg.OperationalError:
        pass
    assert len(Raw.created) == 1                     # a brand-new connection that fails is a real outage

def test_connection_returned_after_sql_error(monkeypatch):
    _fresh_pool(monkeypatch)
    database.query("SELECT 1")
    raw = Raw.created[0]
    def boom(self, sql, args=()): raise ValueError("bad sql")
    monkeypatch.setattr(Cur, "execute", boom)
    try: database.query("SELECT bad")
    except ValueError: pass
    assert database._idle.qsize() == 1 and not raw.closed   # not leaked, not lost

def test_pool_never_holds_more_than_its_size(monkeypatch):
    _fresh_pool(monkeypatch)
    conns = [database.get_db() for _ in range(database._POOL_SIZE + 3)]
    for c in conns: c.close()
    assert database._idle.qsize() == database._POOL_SIZE
    assert sum(r.closed for r in Raw.created) == 3
