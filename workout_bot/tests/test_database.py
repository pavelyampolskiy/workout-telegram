from datetime import date, timedelta
import database as db


# ── Workouts ──────────────────────────────────────────────────────────────────

def test_create_and_get_workout(db_path):
    wid = db.create_workout(user_id=1, workout_type="DAY_A")
    row = db.get_workout(wid)
    assert row is not None
    assert row["user_id"] == 1
    assert row["type"] == "DAY_A"
    assert row["date"] == date.today().isoformat()


def test_get_workout_missing_returns_none(db_path):
    assert db.get_workout(9999) is None


def test_finish_workout(db_path):
    wid = db.create_workout(user_id=1, workout_type="DAY_B")
    db.finish_workout(wid)
    row = db.get_workout(wid)
    assert row["finished_at"] is not None


def test_save_rating(db_path):
    wid = db.create_workout(user_id=1, workout_type="DAY_C")
    db.save_rating(wid, rating=4)
    row = db.get_workout(wid)
    assert row["rating"] == 4


def test_delete_workout(db_path):
    wid = db.create_workout(user_id=1, workout_type="DAY_A")
    db.delete_workout(wid)
    assert db.get_workout(wid) is None


def test_delete_all_workouts(db_path):
    db.create_workout(user_id=42, workout_type="DAY_A")
    db.create_workout(user_id=42, workout_type="DAY_B")
    db.create_workout(user_id=99, workout_type="DAY_C")
    db.delete_all_workouts(user_id=42)
    rows, _ = db.get_history(user_id=42)
    assert rows == []
    rows_other, _ = db.get_history(user_id=99)
    assert len(rows_other) == 1


# ── History ───────────────────────────────────────────────────────────────────

def test_get_history_basic(db_path):
    for t in ("DAY_A", "DAY_B", "DAY_C"):
        db.create_workout(user_id=1, workout_type=t)
    rows, has_more = db.get_history(user_id=1, limit=10)
    assert len(rows) == 3
    assert has_more is False


def test_get_history_pagination(db_path):
    for _ in range(5):
        db.create_workout(user_id=1, workout_type="DAY_A")
    rows, has_more = db.get_history(user_id=1, limit=3, offset=0)
    assert len(rows) == 3
    assert has_more is True
    rows2, has_more2 = db.get_history(user_id=1, limit=3, offset=3)
    assert len(rows2) == 2
    assert has_more2 is False


def test_get_history_filter_by_type(db_path):
    db.create_workout(user_id=1, workout_type="DAY_A")
    db.create_workout(user_id=1, workout_type="CARDIO")
    rows, _ = db.get_history(user_id=1, workout_type="CARDIO")
    assert len(rows) == 1
    assert rows[0]["type"] == "CARDIO"


def test_get_history_isolated_by_user(db_path):
    db.create_workout(user_id=1, workout_type="DAY_A")
    rows, _ = db.get_history(user_id=2)
    assert rows == []


# ── Exercises ─────────────────────────────────────────────────────────────────

def test_create_and_get_exercise(db_path):
    wid = db.create_workout(user_id=1, workout_type="DAY_A")
    eid = db.create_exercise(wid, grp="LEGS", name="Squat", target_sets=4)
    ex = db.get_exercise(eid)
    assert ex is not None
    assert ex["name"] == "Squat"
    assert ex["grp"] == "LEGS"
    assert ex["target_sets"] == 4


def test_get_exercises_for_workout(db_path):
    wid = db.create_workout(user_id=1, workout_type="DAY_A")
    db.create_exercise(wid, grp="LEGS", name="Squat", target_sets=4)
    db.create_exercise(wid, grp="BACK", name="Deadlift", target_sets=3)
    exs = db.get_exercises_for_workout(wid)
    assert len(exs) == 2
    names = {e["name"] for e in exs}
    assert names == {"Squat", "Deadlift"}


def test_get_exercise_missing_returns_none(db_path):
    assert db.get_exercise(9999) is None


# ── Sets ──────────────────────────────────────────────────────────────────────

def test_add_and_get_sets(db_path):
    wid = db.create_workout(user_id=1, workout_type="DAY_A")
    eid = db.create_exercise(wid, grp="LEGS", name="Squat", target_sets=4)
    db.add_set(eid, set_number=1, weight=100.0, reps=10)
    db.add_set(eid, set_number=2, weight=110.0, reps=8)
    sets = db.get_sets_for_exercise(eid)
    assert len(sets) == 2
    assert sets[0]["weight"] == 100.0
    assert sets[1]["reps"] == 8


def test_sets_ordered_by_set_number(db_path):
    wid = db.create_workout(user_id=1, workout_type="DAY_A")
    eid = db.create_exercise(wid, grp="LEGS", name="Squat", target_sets=3)
    db.add_set(eid, set_number=3, weight=120.0, reps=6)
    db.add_set(eid, set_number=1, weight=100.0, reps=10)
    db.add_set(eid, set_number=2, weight=110.0, reps=8)
    sets = db.get_sets_for_exercise(eid)
    assert [s["set_number"] for s in sets] == [1, 2, 3]


def test_update_set(db_path):
    wid = db.create_workout(user_id=1, workout_type="DAY_A")
    eid = db.create_exercise(wid, grp="LEGS", name="Squat", target_sets=4)
    sid = db.add_set(eid, set_number=1, weight=100.0, reps=10)
    db.update_set(sid, weight=105.0, reps=9)
    s = db.get_set(sid)
    assert s["weight"] == 105.0
    assert s["reps"] == 9


def test_delete_set(db_path):
    wid = db.create_workout(user_id=1, workout_type="DAY_A")
    eid = db.create_exercise(wid, grp="LEGS", name="Squat", target_sets=4)
    sid = db.add_set(eid, set_number=1, weight=100.0, reps=10)
    db.delete_set(sid)
    assert db.get_set(sid) is None


def test_delete_workout_cascades_to_sets(db_path):
    wid = db.create_workout(user_id=1, workout_type="DAY_A")
    eid = db.create_exercise(wid, grp="LEGS", name="Squat", target_sets=4)
    sid = db.add_set(eid, set_number=1, weight=100.0, reps=10)
    db.delete_workout(wid)
    assert db.get_set(sid) is None


# ── Cardio ────────────────────────────────────────────────────────────────────

def test_add_and_get_cardio(db_path):
    wid = db.create_workout(user_id=1, workout_type="CARDIO")
    db.add_cardio(wid, text="30 min run")
    entry = db.get_cardio(wid)
    assert entry is not None
    assert entry["text"] == "30 min run"


def test_update_cardio(db_path):
    wid = db.create_workout(user_id=1, workout_type="CARDIO")
    db.add_cardio(wid, text="20 min run")
    db.update_cardio(wid, text="45 min cycling")
    entry = db.get_cardio(wid)
    assert entry["text"] == "45 min cycling"


def test_get_cardio_missing_returns_none(db_path):
    wid = db.create_workout(user_id=1, workout_type="DAY_A")
    assert db.get_cardio(wid) is None


# ── Notes ─────────────────────────────────────────────────────────────────────

def test_add_and_get_note(db_path):
    wid = db.create_workout(user_id=1, workout_type="DAY_A")
    db.add_workout_note(wid, text="Felt great today")
    note = db.get_workout_note(wid)
    assert note is not None
    assert note["text"] == "Felt great today"


def test_get_note_missing_returns_none(db_path):
    wid = db.create_workout(user_id=1, workout_type="DAY_A")
    assert db.get_workout_note(wid) is None


# ── Exercise history ──────────────────────────────────────────────────────────

def test_get_last_exercise_sets_no_history(db_path):
    wid = db.create_workout(user_id=1, workout_type="DAY_A")
    eid = db.create_exercise(wid, grp="LEGS", name="Squat", target_sets=4)
    last_date, sets = db.get_last_exercise_sets(user_id=1, exercise_name="Squat", exclude_workout_id=wid)
    assert last_date is None
    assert sets is None


def test_get_last_exercise_sets_returns_previous(db_path):
    # First workout
    wid1 = db.create_workout(user_id=1, workout_type="DAY_A")
    eid1 = db.create_exercise(wid1, grp="LEGS", name="Squat", target_sets=4)
    db.add_set(eid1, set_number=1, weight=100.0, reps=10)
    db.add_set(eid1, set_number=2, weight=110.0, reps=8)
    # Second workout (current)
    wid2 = db.create_workout(user_id=1, workout_type="DAY_A")
    db.create_exercise(wid2, grp="LEGS", name="Squat", target_sets=4)
    last_date, sets = db.get_last_exercise_sets(user_id=1, exercise_name="Squat", exclude_workout_id=wid2)
    assert last_date is not None
    assert len(sets) == 2
    assert sets[0]["weight"] == 100.0


# ── Progress ──────────────────────────────────────────────────────────────────

def test_get_exercise_progress_empty(db_path):
    rows = db.get_exercise_progress(user_id=1, exercise_name="Bench Press")
    assert rows == []


def test_get_exercise_progress_tracks_max_weight(db_path):
    for weight in [80.0, 90.0, 95.0]:
        wid = db.create_workout(user_id=1, workout_type="DAY_A")
        eid = db.create_exercise(wid, grp="CHEST", name="Bench Press", target_sets=4)
        db.add_set(eid, set_number=1, weight=weight - 5, reps=10)
        db.add_set(eid, set_number=2, weight=weight, reps=8)
    rows = db.get_exercise_progress(user_id=1, exercise_name="Bench Press")
    assert len(rows) == 3
    assert rows[-1]["max_weight"] == 95.0


# ── Stats ─────────────────────────────────────────────────────────────────────

def test_stats_period_empty(db_path):
    total, by_type = db.stats_period(user_id=1, since=date.today())
    assert total == 0
    assert by_type == {}


def test_stats_period_counts_workouts(db_path):
    db.create_workout(user_id=1, workout_type="DAY_A")
    db.create_workout(user_id=1, workout_type="DAY_A")
    db.create_workout(user_id=1, workout_type="CARDIO")
    total, by_type = db.stats_period(user_id=1, since=date.today())
    assert total == 3
    assert by_type["DAY_A"] == 2
    assert by_type["CARDIO"] == 1


def test_stats_frequency_empty(db_path):
    total, avg = db.stats_frequency(user_id=1, weeks=4)
    assert total == 0
    assert avg == 0.0


def test_stats_frequency_counts_recent(db_path):
    db.create_workout(user_id=1, workout_type="DAY_A")
    db.create_workout(user_id=1, workout_type="DAY_B")
    total, avg = db.stats_frequency(user_id=1, weeks=4)
    assert total == 2
    assert avg == 0.5
