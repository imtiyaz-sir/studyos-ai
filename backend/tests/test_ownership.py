"""Regression tests: a logged-in user must not touch another user's syllabus data."""

def _count(db, table): return db.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]

def test_mallory_cannot_edit_or_delete_alices_unit(world):
    assert world.mallory.put("/api/subjects/units/1", json={"name": "pwned"}).status_code == 404
    assert world.mallory.delete("/api/subjects/units/1").status_code == 404
    assert world.db.execute("SELECT name FROM units WHERE id=1").fetchone()[0] == "Alice Unit"

def test_mallory_cannot_edit_or_delete_alices_topic(world):
    assert world.mallory.put("/api/subjects/topics/1", json={"name": "pwned"}).status_code == 404
    assert world.mallory.delete("/api/subjects/topics/1").status_code == 404
    assert world.db.execute("SELECT name FROM topics WHERE id=1").fetchone()[0] == "Alice Topic"

def test_mallory_cannot_create_children_under_alices_objects(world):
    assert world.mallory.post("/api/subjects/1/units", json={"name": "x"}).status_code == 404
    assert world.mallory.post("/api/subjects/units/1/topics", json={"name": "x"}).status_code == 404
    assert world.mallory.post("/api/subjects/topics/1/subtopics", json={"name": "x"}).status_code == 404
    assert (_count(world.db, "units"), _count(world.db, "topics")) == (1, 1)

def test_mallory_cannot_touch_alices_revisions(world):
    assert world.mallory.put("/api/revision/1", json={"notes": "pwned"}).status_code == 404
    assert world.mallory.get("/api/revision/topic/1").status_code == 404
    assert world.mallory.post("/api/revision/topic/1/schedule").status_code == 404
    assert world.mallory.post("/api/revision/topic/1/mark-revised", json={}).status_code == 404
    assert world.db.execute("SELECT notes FROM revisions WHERE id=1").fetchone()[0] is None

def test_mallory_cannot_bump_alices_topic_via_practice(world):
    r = world.mallory.post("/api/practice", json={"type": "mcq", "topic_id": 1})
    assert r.status_code == 404
    assert world.db.execute("SELECT practice_count FROM topics WHERE id=1").fetchone()[0] == 0

def test_owner_still_works(world):
    assert world.alice.put("/api/subjects/units/1", json={"name": "renamed"}).status_code == 200
    assert world.alice.put("/api/subjects/topics/1", json={"name": "renamed"}).status_code == 200
    assert world.alice.put("/api/revision/1", json={"notes": "ok"}).status_code == 200
    assert world.alice.post("/api/subjects/units/1/topics", json={"name": "child"}).status_code == 201
