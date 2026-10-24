from routes.notifications import safe_link, create_notification

def _seed(world, n=3, user=1):
    ids = [create_notification(user, "system", f"msg {i}", link="/revision") for i in range(n)]
    return ids

def test_safe_link_blocks_open_redirects():
    for bad in ["https://evil.com", "//evil.com", "javascript:alert(1)", "/\\evil.com", "revision", "/a://b", "/x\ny", "", None, "/" + "a" * 400]:
        assert safe_link(bad) is None, bad
    assert safe_link("/revision?source=push") == "/revision?source=push"

def test_create_stores_only_safe_link_and_dedupes(world):
    nid = create_notification(1, "revision", "due", link="https://evil.com", dedupe_key="rev:2030-01-01")
    assert world.db.execute("SELECT link FROM notifications WHERE id=?", (nid,)).fetchone()[0] is None
    assert create_notification(1, "revision", "due again", dedupe_key="rev:2030-01-01") is None   # duplicate
    assert create_notification(2, "revision", "due", dedupe_key="rev:2030-01-01") is not None     # other user ok
    assert world.db.execute("SELECT COUNT(*) FROM notifications").fetchone()[0] == 2

def test_list_unread_count_and_pagination(world):
    _seed(world, 3)
    r = world.alice.get("/api/notifications?limit=2").get_json()
    assert len(r["notifications"]) == 2 and r["unread_count"] == 3
    assert len(world.alice.get("/api/notifications?limit=2&offset=2").get_json()["notifications"]) == 1
    assert world.alice.get("/api/notifications?limit=abc&offset=-5").status_code == 200  # bad params don't 500

def test_mark_read_and_read_all(world):
    ids = _seed(world, 3)
    r = world.alice.put(f"/api/notifications/{ids[0]}/read").get_json()
    assert r["unread_count"] == 2
    assert world.alice.get("/api/notifications?unread=1").get_json()["unread_count"] == 2
    assert world.alice.put("/api/notifications/read-all").get_json()["unread_count"] == 0
    assert world.alice.get("/api/notifications/unread-count").get_json()["unread_count"] == 0

def test_users_are_isolated(world):
    ids = _seed(world, 2, user=1)
    assert world.mallory.get("/api/notifications").get_json()["notifications"] == []
    assert world.mallory.put(f"/api/notifications/{ids[0]}/read").status_code == 404
    assert world.mallory.delete(f"/api/notifications/{ids[0]}").status_code == 404
    world.mallory.put("/api/notifications/read-all")  # must not touch Alice's rows
    assert world.alice.get("/api/notifications/unread-count").get_json()["unread_count"] == 2

def test_delete_and_auth_required(world):
    ids = _seed(world, 2)
    assert world.alice.delete(f"/api/notifications/{ids[0]}").get_json()["unread_count"] == 1
    anon = world.alice.application.test_client()
    assert anon.get("/api/notifications").status_code == 401
    assert anon.put("/api/notifications/read-all").status_code == 401
