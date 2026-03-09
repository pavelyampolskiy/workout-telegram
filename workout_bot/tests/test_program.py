import pytest
import program as p


EXPECTED_DAYS = {"DAY_A", "DAY_B", "DAY_C"}
REQUIRED_EXERCISE_KEYS = {"group", "name", "target_sets"}


# ── Structure ─────────────────────────────────────────────────────────────────

def test_program_has_exactly_three_days():
    assert set(p.PROGRAM.keys()) == EXPECTED_DAYS


def test_each_day_has_six_exercises():
    for day, exercises in p.PROGRAM.items():
        assert len(exercises) == 6, f"{day} has {len(exercises)} exercises, expected 6"


def test_each_exercise_has_required_keys():
    for day, exercises in p.PROGRAM.items():
        for ex in exercises:
            missing = REQUIRED_EXERCISE_KEYS - set(ex.keys())
            assert not missing, f"{day}: exercise '{ex}' missing keys {missing}"


def test_exercise_names_are_non_empty_strings():
    for day, exercises in p.PROGRAM.items():
        for ex in exercises:
            assert isinstance(ex["name"], str) and ex["name"].strip(), (
                f"{day}: exercise name must be a non-empty string"
            )


def test_exercise_groups_are_non_empty_strings():
    for day, exercises in p.PROGRAM.items():
        for ex in exercises:
            assert isinstance(ex["group"], str) and ex["group"].strip(), (
                f"{day}: exercise group must be a non-empty string"
            )


def test_target_sets_are_positive_integers():
    for day, exercises in p.PROGRAM.items():
        for ex in exercises:
            ts = ex["target_sets"]
            assert isinstance(ts, int) and ts > 0, (
                f"{day}/{ex['name']}: target_sets must be a positive int, got {ts!r}"
            )


def test_target_sets_within_reasonable_range():
    """Sanity-check: no exercise should have more than 10 sets."""
    for day, exercises in p.PROGRAM.items():
        for ex in exercises:
            assert ex["target_sets"] <= 10, (
                f"{day}/{ex['name']}: target_sets={ex['target_sets']} seems unreasonably high"
            )


# ── Uniqueness ────────────────────────────────────────────────────────────────

def test_no_duplicate_exercise_names_within_day():
    for day, exercises in p.PROGRAM.items():
        names = [ex["name"] for ex in exercises]
        assert len(names) == len(set(names)), (
            f"{day}: duplicate exercise names found: {names}"
        )


def test_muscle_groups_covered_per_day():
    """Each day must cover LEGS, BACK, CHEST, BICEPS, TRICEPS, SHOULDERS."""
    required_groups = {"LEGS", "BACK", "CHEST", "BICEPS", "TRICEPS", "SHOULDERS"}
    for day, exercises in p.PROGRAM.items():
        groups = {ex["group"] for ex in exercises}
        missing = required_groups - groups
        assert not missing, f"{day} is missing muscle groups: {missing}"


def test_each_group_appears_exactly_once_per_day():
    for day, exercises in p.PROGRAM.items():
        groups = [ex["group"] for ex in exercises]
        assert len(groups) == len(set(groups)), (
            f"{day}: duplicate muscle group found: {groups}"
        )


# ── Content ───────────────────────────────────────────────────────────────────

def test_day_a_has_leg_press():
    names = [ex["name"] for ex in p.PROGRAM["DAY_A"]]
    assert any("Leg Press" in name for name in names)


def test_day_b_has_lat_pulldown():
    names = [ex["name"] for ex in p.PROGRAM["DAY_B"]]
    assert any("Lat Pulldown" in name or "Pulldown" in name for name in names)


def test_day_c_has_leg_curl():
    names = [ex["name"] for ex in p.PROGRAM["DAY_C"]]
    assert any("Leg Curl" in name for name in names)


def test_program_is_dict():
    assert isinstance(p.PROGRAM, dict)


def test_program_days_are_lists():
    for day, exercises in p.PROGRAM.items():
        assert isinstance(exercises, list), f"{day} should be a list"


def test_exercises_are_dicts():
    for day, exercises in p.PROGRAM.items():
        for ex in exercises:
            assert isinstance(ex, dict), f"{day}: exercise entry should be a dict"
