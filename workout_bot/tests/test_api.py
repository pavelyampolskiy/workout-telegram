import database as db


# ── Program ───────────────────────────────────────────────────────────────────

def test_get_program(client):
    resp = client.get("/api/program")
    assert resp.status_code == 200
    data = resp.json()
    assert "DAY_A" in data or len(data) > 0  # program has days


# ── Workouts ──────────────────────────────────────────────────────────────────

def test_create_workout(client):
    resp = client.post("/api/workouts", json={"user_id": 1, "type": "DAY_A"})
    assert resp.status_code == 200
    data = resp.json()
    assert "id" in data
    assert isinstance(data["id"], int)


def test_get_workout(client):
    wid = client.post("/api/workouts", json={"user_id": 1, "type": "DAY_A"}).json()["id"]
    resp = client.get(f"/api/workouts/{wid}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == wid
    assert data["type"] == "DAY_A"
    assert data["user_id"] == 1
    assert "exercises" in data


def test_get_workout_not_found(client):
    resp = client.get("/api/workouts/9999")
    assert resp.status_code == 404


def test_finish_workout(client):
    wid = client.post("/api/workouts", json={"user_id": 1, "type": "DAY_A"}).json()["id"]
    resp = client.patch(f"/api/workouts/{wid}/finish")
    assert resp.status_code == 200
    assert resp.json() == {"ok": True}
    row = db.get_workout(wid)
    assert row["finished_at"] is not None


def test_save_rating_valid(client):
    wid = client.post("/api/workouts", json={"user_id": 1, "type": "DAY_A"}).json()["id"]
    resp = client.patch(f"/api/workouts/{wid}/rating", json={"rating": 5})
    assert resp.status_code == 200
    assert resp.json() == {"ok": True}


def test_save_rating_out_of_range(client):
    wid = client.post("/api/workouts", json={"user_id": 1, "type": "DAY_A"}).json()["id"]
    resp = client.patch(f"/api/workouts/{wid}/rating", json={"rating": 6})
    assert resp.status_code == 422


def test_save_rating_zero(client):
    wid = client.post("/api/workouts", json={"user_id": 1, "type": "DAY_A"}).json()["id"]
    resp = client.patch(f"/api/workouts/{wid}/rating", json={"rating": 0})
    assert resp.status_code == 422


def test_delete_workout(client):
    wid = client.post("/api/workouts", json={"user_id": 1, "type": "DAY_A"}).json()["id"]
    resp = client.delete(f"/api/workouts/{wid}")
    assert resp.status_code == 200
    assert client.get(f"/api/workouts/{wid}").status_code == 404


# ── History ───────────────────────────────────────────────────────────────────

def test_get_history_empty(client):
    resp = client.get("/api/history", params={"user_id": 99})
    assert resp.status_code == 200
    data = resp.json()
    assert data["items"] == []
    assert data["has_more"] is False


def test_get_history_returns_workouts(client):
    client.post("/api/workouts", json={"user_id": 1, "type": "DAY_A"})
    client.post("/api/workouts", json={"user_id": 1, "type": "DAY_B"})
    resp = client.get("/api/history", params={"user_id": 1})
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["items"]) == 2


def test_get_history_pagination(client):
    for _ in range(5):
        client.post("/api/workouts", json={"user_id": 1, "type": "DAY_A"})
    resp = client.get("/api/history", params={"user_id": 1, "limit": 3})
    data = resp.json()
    assert len(data["items"]) == 3
    assert data["has_more"] is True


def test_get_history_filter_by_type(client):
    client.post("/api/workouts", json={"user_id": 1, "type": "DAY_A"})
    client.post("/api/workouts", json={"user_id": 1, "type": "CARDIO"})
    resp = client.get("/api/history", params={"user_id": 1, "type": "CARDIO"})
    data = resp.json()
    assert len(data["items"]) == 1
    assert data["items"][0]["type"] == "CARDIO"


def test_delete_all_history(client):
    client.post("/api/workouts", json={"user_id": 1, "type": "DAY_A"})
    client.post("/api/workouts", json={"user_id": 1, "type": "DAY_B"})
    resp = client.delete("/api/history", params={"user_id": 1})
    assert resp.status_code == 200
    data = client.get("/api/history", params={"user_id": 1}).json()
    assert data["items"] == []


# ── Exercises ─────────────────────────────────────────────────────────────────

def test_create_exercise(client):
    wid = client.post("/api/workouts", json={"user_id": 1, "type": "DAY_A"}).json()["id"]
    resp = client.post(
        f"/api/workouts/{wid}/exercises",
        json={"grp": "LEGS", "name": "Squat", "target_sets": 4},
    )
    assert resp.status_code == 200
    assert "id" in resp.json()


def test_workout_includes_exercises(client):
    wid = client.post("/api/workouts", json={"user_id": 1, "type": "DAY_A"}).json()["id"]
    client.post(f"/api/workouts/{wid}/exercises", json={"grp": "LEGS", "name": "Squat", "target_sets": 4})
    data = client.get(f"/api/workouts/{wid}").json()
    assert len(data["exercises"]) == 1
    assert data["exercises"][0]["name"] == "Squat"


def test_get_last_exercise_no_history(client):
    wid = client.post("/api/workouts", json={"user_id": 1, "type": "DAY_A"}).json()["id"]
    eid = client.post(
        f"/api/workouts/{wid}/exercises",
        json={"grp": "LEGS", "name": "Squat", "target_sets": 4},
    ).json()["id"]
    resp = client.get(f"/api/exercises/{eid}/last", params={"user_id": 1, "exclude_wid": wid})
    assert resp.status_code == 200
    data = resp.json()
    assert data["date"] is None
    assert data["sets"] == []


def test_get_last_exercise_not_found(client):
    resp = client.get("/api/exercises/9999/last", params={"user_id": 1, "exclude_wid": 0})
    assert resp.status_code == 404


# ── Sets ──────────────────────────────────────────────────────────────────────

def _make_exercise(client, user_id=1):
    wid = client.post("/api/workouts", json={"user_id": user_id, "type": "DAY_A"}).json()["id"]
    eid = client.post(
        f"/api/workouts/{wid}/exercises",
        json={"grp": "LEGS", "name": "Squat", "target_sets": 4},
    ).json()["id"]
    return wid, eid


def test_add_and_get_sets(client):
    _, eid = _make_exercise(client)
    client.post(f"/api/exercises/{eid}/sets", json={"weight": 100.0, "reps": 10})
    client.post(f"/api/exercises/{eid}/sets", json={"weight": 110.0, "reps": 8})
    resp = client.get(f"/api/exercises/{eid}/sets")
    assert resp.status_code == 200
    sets = resp.json()
    assert len(sets) == 2
    assert sets[0]["weight"] == 100.0
    assert sets[1]["reps"] == 8


def test_update_set(client):
    _, eid = _make_exercise(client)
    sid = client.post(f"/api/exercises/{eid}/sets", json={"weight": 100.0, "reps": 10}).json()["id"]
    resp = client.put(f"/api/sets/{sid}", json={"weight": 105.0, "reps": 9})
    assert resp.status_code == 200
    s = db.get_set(sid)
    assert s["weight"] == 105.0
    assert s["reps"] == 9


def test_delete_set(client):
    _, eid = _make_exercise(client)
    sid = client.post(f"/api/exercises/{eid}/sets", json={"weight": 100.0, "reps": 10}).json()["id"]
    resp = client.delete(f"/api/sets/{sid}")
    assert resp.status_code == 200
    resp2 = client.get(f"/api/exercises/{eid}/sets")
    assert resp2.json() == []


def test_sets_auto_number(client):
    _, eid = _make_exercise(client)
    client.post(f"/api/exercises/{eid}/sets", json={"weight": 80.0, "reps": 12})
    client.post(f"/api/exercises/{eid}/sets", json={"weight": 90.0, "reps": 10})
    sets = client.get(f"/api/exercises/{eid}/sets").json()
    assert sets[0]["set_number"] == 1
    assert sets[1]["set_number"] == 2


# ── Cardio ────────────────────────────────────────────────────────────────────

def test_add_cardio(client):
    wid = client.post("/api/workouts", json={"user_id": 1, "type": "CARDIO"}).json()["id"]
    resp = client.post(f"/api/workouts/{wid}/cardio", json={"text": "30 min run"})
    assert resp.status_code == 200
    assert "id" in resp.json()


def test_update_cardio(client):
    wid = client.post("/api/workouts", json={"user_id": 1, "type": "CARDIO"}).json()["id"]
    client.post(f"/api/workouts/{wid}/cardio", json={"text": "20 min run"})
    resp = client.put(f"/api/workouts/{wid}/cardio", json={"text": "45 min cycling"})
    assert resp.status_code == 200
    row = db.get_cardio(wid)
    assert row["text"] == "45 min cycling"


def test_workout_includes_cardio(client):
    wid = client.post("/api/workouts", json={"user_id": 1, "type": "CARDIO"}).json()["id"]
    client.post(f"/api/workouts/{wid}/cardio", json={"text": "30 min run"})
    data = client.get(f"/api/workouts/{wid}").json()
    assert data["cardio"] == "30 min run"


# ── Notes ─────────────────────────────────────────────────────────────────────

def test_add_note(client):
    wid = client.post("/api/workouts", json={"user_id": 1, "type": "DAY_A"}).json()["id"]
    resp = client.post(f"/api/workouts/{wid}/note", json={"text": "Great session"})
    assert resp.status_code == 200
    assert "id" in resp.json()


def test_workout_includes_note(client):
    wid = client.post("/api/workouts", json={"user_id": 1, "type": "DAY_A"}).json()["id"]
    client.post(f"/api/workouts/{wid}/note", json={"text": "Felt strong"})
    data = client.get(f"/api/workouts/{wid}").json()
    assert data["note"] == "Felt strong"


# ── Stats ─────────────────────────────────────────────────────────────────────

def test_get_stats_empty(client):
    resp = client.get("/api/stats", params={"user_id": 1, "days": 7})
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 0
    assert data["by_type"] == {}


def test_get_stats_counts_workouts(client):
    client.post("/api/workouts", json={"user_id": 1, "type": "DAY_A"})
    client.post("/api/workouts", json={"user_id": 1, "type": "CARDIO"})
    resp = client.get("/api/stats", params={"user_id": 1, "days": 7})
    data = resp.json()
    assert data["total"] == 2
    assert data["by_type"]["DAY_A"] == 1
    assert data["by_type"]["CARDIO"] == 1


def test_get_frequency(client):
    client.post("/api/workouts", json={"user_id": 1, "type": "DAY_A"})
    client.post("/api/workouts", json={"user_id": 1, "type": "DAY_B"})
    resp = client.get("/api/stats/frequency", params={"user_id": 1, "weeks": 4})
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 2
    assert data["avg"] == 0.5
    assert data["weeks"] == 4


def test_get_progress_empty(client):
    resp = client.get("/api/progress", params={"user_id": 1, "exercise_name": "Bench Press"})
    assert resp.status_code == 200
    assert resp.json() == []


def test_get_progress_returns_data(client):
    for weight in [80.0, 85.0]:
        wid = client.post("/api/workouts", json={"user_id": 1, "type": "DAY_A"}).json()["id"]
        eid = client.post(
            f"/api/workouts/{wid}/exercises",
            json={"grp": "CHEST", "name": "Bench Press", "target_sets": 3},
        ).json()["id"]
        client.post(f"/api/exercises/{eid}/sets", json={"weight": weight, "reps": 8})
    resp = client.get("/api/progress", params={"user_id": 1, "exercise_name": "Bench Press"})
    data = resp.json()
    assert len(data) == 2
    assert data[-1]["max_weight"] == 85.0
