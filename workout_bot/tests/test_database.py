from datetime import date, timedelta, datetime, timezone
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


# ── add_cardio upsert ──────────────────────────────────────────────────────────

def test_add_cardio_upsert_returns_same_id(db_path):
    """Calling add_cardio twice on the same workout must update, not insert."""
    wid = db.create_workout(user_id=1, workout_type="CARDIO")
    id1 = db.add_cardio(wid, text="first")
    id2 = db.add_cardio(wid, text="second")
    assert id1 == id2


def test_add_cardio_upsert_updates_text(db_path):
    wid = db.create_workout(user_id=1, workout_type="CARDIO")
    db.add_cardio(wid, text="initial text")
    db.add_cardio(wid, text="updated text")
    entry = db.get_cardio(wid)
    assert entry["text"] == "updated text"


def test_add_cardio_upsert_no_duplicate_rows(db_path):
    """Only one cardio row should exist after multiple add_cardio calls."""
    import sqlite3
    wid = db.create_workout(user_id=1, workout_type="CARDIO")
    for text in ["a", "b", "c"]:
        db.add_cardio(wid, text=text)
    conn = sqlite3.connect(db_path)
    count = conn.execute(
        "SELECT COUNT(*) FROM cardio_entries WHERE workout_id=?", (wid,)
    ).fetchone()[0]
    conn.close()
    assert count == 1


# ── get_unfinished_workout ────────────────────────────────────────────────────

def test_get_unfinished_workout_none_when_empty(db_path):
    assert db.get_unfinished_workout(user_id=1) is None


def test_get_unfinished_workout_returns_open_workout(db_path):
    wid = db.create_workout(user_id=1, workout_type="DAY_A")
    row = db.get_unfinished_workout(user_id=1)
    assert row is not None
    assert row["id"] == wid


def test_get_unfinished_workout_ignores_finished(db_path):
    wid = db.create_workout(user_id=1, workout_type="DAY_A")
    db.finish_workout(wid)
    assert db.get_unfinished_workout(user_id=1) is None


def test_get_unfinished_workout_returns_latest(db_path):
    db.create_workout(user_id=1, workout_type="DAY_A")
    wid2 = db.create_workout(user_id=1, workout_type="DAY_B")
    row = db.get_unfinished_workout(user_id=1)
    assert row["id"] == wid2


def test_get_unfinished_workout_isolated_by_user(db_path):
    db.create_workout(user_id=1, workout_type="DAY_A")
    assert db.get_unfinished_workout(user_id=2) is None


# ── Ownership queries ─────────────────────────────────────────────────────────

def test_get_workout_owner(db_path):
    wid = db.create_workout(user_id=5, workout_type="DAY_A")
    assert db.get_workout_owner(wid) == 5


def test_get_workout_owner_missing_returns_none(db_path):
    assert db.get_workout_owner(9999) is None


def test_get_exercise_owner(db_path):
    wid = db.create_workout(user_id=7, workout_type="DAY_A")
    eid = db.create_exercise(wid, grp="LEGS", name="Squat", target_sets=4)
    assert db.get_exercise_owner(eid) == 7


def test_get_exercise_owner_missing_returns_none(db_path):
    assert db.get_exercise_owner(9999) is None


def test_get_set_owner(db_path):
    wid = db.create_workout(user_id=8, workout_type="DAY_A")
    eid = db.create_exercise(wid, grp="LEGS", name="Squat", target_sets=4)
    sid = db.add_set(eid, set_number=1, weight=80.0, reps=10)
    assert db.get_set_owner(sid) == 8


def test_get_set_owner_missing_returns_none(db_path):
    assert db.get_set_owner(9999) is None


# ── Custom days ───────────────────────────────────────────────────────────────

def test_create_and_get_custom_days(db_path):
    db.create_custom_day(user_id=1, key="CUSTOM_1", label="My Day", sort_order=0)
    days = db.get_custom_days(user_id=1)
    assert len(days) == 1
    assert days[0]["key"] == "CUSTOM_1"
    assert days[0]["label"] == "My Day"


def test_get_custom_days_empty(db_path):
    assert db.get_custom_days(user_id=99) == []


def test_custom_days_sorted_by_sort_order(db_path):
    db.create_custom_day(user_id=1, key="C2", label="Second", sort_order=2)
    db.create_custom_day(user_id=1, key="C0", label="First", sort_order=0)
    db.create_custom_day(user_id=1, key="C1", label="Middle", sort_order=1)
    days = db.get_custom_days(user_id=1)
    assert [d["key"] for d in days] == ["C0", "C1", "C2"]


def test_rename_custom_day(db_path):
    did = db.create_custom_day(user_id=1, key="CUSTOM_X", label="Old", sort_order=0)
    db.rename_custom_day(did, label="New")
    days = db.get_custom_days(user_id=1)
    assert days[0]["label"] == "New"


def test_delete_custom_day(db_path):
    did = db.create_custom_day(user_id=1, key="CUSTOM_Y", label="Gone", sort_order=0)
    db.delete_custom_day(did)
    assert db.get_custom_days(user_id=1) == []


def test_custom_days_isolated_by_user(db_path):
    db.create_custom_day(user_id=1, key="C1", label="User1 Day", sort_order=0)
    assert db.get_custom_days(user_id=2) == []


def test_count_finished_workouts_for_day(db_path):
    wid1 = db.create_workout(user_id=1, workout_type="CUSTOM_1")
    db.finish_workout(wid1)
    db.create_workout(user_id=1, workout_type="CUSTOM_1")  # unfinished
    count = db.count_finished_workouts_for_day(user_id=1, day_key="CUSTOM_1")
    assert count == 1


def test_count_finished_workouts_for_day_zero(db_path):
    assert db.count_finished_workouts_for_day(user_id=1, day_key="CUSTOM_NONE") == 0


# ── delete_empty_exercises ────────────────────────────────────────────────────

def test_delete_empty_exercises_removes_no_set_exercises(db_path):
    wid = db.create_workout(user_id=1, workout_type="DAY_A")
    db.create_exercise(wid, grp="LEGS", name="Empty", target_sets=3)
    eid2 = db.create_exercise(wid, grp="CHEST", name="Bench", target_sets=3)
    db.add_set(eid2, set_number=1, weight=60.0, reps=10)
    db.delete_empty_exercises(wid)
    exercises = db.get_exercises_for_workout(wid)
    assert len(exercises) == 1
    assert exercises[0]["name"] == "Bench"


def test_delete_empty_exercises_keeps_all_when_all_have_sets(db_path):
    wid = db.create_workout(user_id=1, workout_type="DAY_A")
    eid = db.create_exercise(wid, grp="LEGS", name="Squat", target_sets=3)
    db.add_set(eid, set_number=1, weight=100.0, reps=5)
    db.delete_empty_exercises(wid)
    assert len(db.get_exercises_for_workout(wid)) == 1


def test_delete_empty_exercises_removes_all_when_none_have_sets(db_path):
    wid = db.create_workout(user_id=1, workout_type="DAY_A")
    db.create_exercise(wid, grp="LEGS", name="Squat", target_sets=3)
    db.create_exercise(wid, grp="BACK", name="Row", target_sets=3)
    db.delete_empty_exercises(wid)
    assert db.get_exercises_for_workout(wid) == []


# ── get_exercise_names_for_user ───────────────────────────────────────────────

def test_get_exercise_names_returns_distinct(db_path):
    for _ in range(3):
        wid = db.create_workout(user_id=1, workout_type="DAY_A")
        db.create_exercise(wid, grp="LEGS", name="Squat", target_sets=4)
    names = db.get_exercise_names_for_user(user_id=1)
    assert len(names) == 1
    assert names[0]["name"] == "Squat"


def test_get_exercise_names_filter_by_query(db_path):
    wid = db.create_workout(user_id=1, workout_type="DAY_A")
    db.create_exercise(wid, grp="LEGS", name="Squat", target_sets=4)
    db.create_exercise(wid, grp="CHEST", name="Bench Press", target_sets=3)
    results = db.get_exercise_names_for_user(user_id=1, query="squat")
    assert len(results) == 1
    assert results[0]["name"] == "Squat"


def test_get_exercise_names_empty_for_new_user(db_path):
    assert db.get_exercise_names_for_user(user_id=99) == []


def test_get_exercise_names_isolated_by_user(db_path):
    wid = db.create_workout(user_id=1, workout_type="DAY_A")
    db.create_exercise(wid, grp="LEGS", name="Squat", target_sets=4)
    assert db.get_exercise_names_for_user(user_id=2) == []


# ── update_workout_note (upsert) ──────────────────────────────────────────────

def test_update_workout_note_inserts_when_missing(db_path):
    wid = db.create_workout(user_id=1, workout_type="DAY_A")
    db.update_workout_note(wid, text="new note")
    note = db.get_workout_note(wid)
    assert note is not None
    assert note["text"] == "new note"


def test_update_workout_note_updates_existing(db_path):
    wid = db.create_workout(user_id=1, workout_type="DAY_A")
    db.add_workout_note(wid, text="original")
    db.update_workout_note(wid, text="revised")
    note = db.get_workout_note(wid)
    assert note["text"] == "revised"


# ── get_previous_workout ──────────────────────────────────────────────────────

def test_get_previous_workout_none_for_first(db_path):
    wid = db.create_workout(user_id=1, workout_type="DAY_A")
    result = db.get_previous_workout(user_id=1, workout_type="DAY_A", exclude_workout_id=wid)
    assert result is None


def test_get_previous_workout_returns_earlier(db_path):
    wid1 = db.create_workout(user_id=1, workout_type="DAY_A")
    wid2 = db.create_workout(user_id=1, workout_type="DAY_A")
    result = db.get_previous_workout(user_id=1, workout_type="DAY_A", exclude_workout_id=wid2)
    assert result is not None
    assert result["id"] == wid1


def test_get_previous_workout_ignores_different_type(db_path):
    db.create_workout(user_id=1, workout_type="DAY_B")
    wid2 = db.create_workout(user_id=1, workout_type="DAY_A")
    result = db.get_previous_workout(user_id=1, workout_type="DAY_A", exclude_workout_id=wid2)
    assert result is None


# ── Streak and patterns ───────────────────────────────────────────────────────

def test_get_weekly_streak_empty(db_path):
    result = db.get_weekly_streak(user_id=1)
    assert result == {"current": 0, "max": 0}


def test_get_weekly_streak_single_finished_workout(db_path):
    wid = db.create_workout(user_id=1, workout_type="DAY_A")
    db.finish_workout(wid)
    result = db.get_weekly_streak(user_id=1)
    assert result["max"] >= 1


def test_get_workout_patterns_empty(db_path):
    result = db.get_workout_patterns(user_id=1)
    assert result["total"] == 0
    assert len(result["day_counts"]) == 7
    assert all(c == 0 for c in result["day_counts"])


def test_get_workout_patterns_counts_strength_only(db_path):
    wid1 = db.create_workout(user_id=1, workout_type="DAY_A")
    db.finish_workout(wid1)
    wid2 = db.create_workout(user_id=1, workout_type="CARDIO")  # excluded
    db.finish_workout(wid2)
    result = db.get_workout_patterns(user_id=1)
    assert result["total"] == 1


# ── Achievement stat helpers ──────────────────────────────────────────────────

def test_get_cardio_count_zero(db_path):
    assert db.get_cardio_count(user_id=1) == 0


def test_get_cardio_count_only_finished(db_path):
    wid1 = db.create_workout(user_id=1, workout_type="CARDIO")
    db.finish_workout(wid1)
    db.create_workout(user_id=1, workout_type="CARDIO")  # unfinished
    assert db.get_cardio_count(user_id=1) == 1


def test_get_total_volume_zero(db_path):
    assert db.get_total_volume(user_id=1) == 0.0


def test_get_total_volume_sums_correctly(db_path):
    wid = db.create_workout(user_id=1, workout_type="DAY_A")
    eid = db.create_exercise(wid, grp="LEGS", name="Squat", target_sets=2)
    db.add_set(eid, set_number=1, weight=100.0, reps=10)  # 1000
    db.add_set(eid, set_number=2, weight=80.0, reps=5)    # 400
    total = db.get_total_volume(user_id=1)
    assert total == 1400.0


def test_get_early_bird_count_zero(db_path):
    assert db.get_early_bird_count(user_id=1) == 0


def test_get_night_owl_count_zero(db_path):
    assert db.get_night_owl_count(user_id=1) == 0
